import AppKit
import CoreGraphics
import Darwin
import Foundation
import QuartzCore

/// Panel that must never become key or main: the overlay is a drawing surface
/// the agent moves around, not something the user can focus or tab into.
private final class OverlayPanel: NSPanel {
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

/// Paints the cursor artwork, shrinking it slightly and fading it a little while
/// a press is held so the click reads as a visible event.
private final class OverlayCursorView: NSView {
    override var isFlipped: Bool { true }
    override var isOpaque: Bool { false }

    private let artwork: NSImage? = CursorArtwork.image

    var isPressed = false {
        didSet { needsDisplay = true }
    }

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)
        guard let artwork else { return }
        artwork.draw(
            in: isPressed ? bounds.insetBy(dx: 2, dy: 2) : bounds,
            from: .zero,
            operation: .sourceOver,
            fraction: isPressed ? 0.85 : 1,
            respectFlipped: true,
            hints: nil
        )
    }
}

/// Owns the cursor panel for the lifetime of the helper process.
///
/// Everything runs on the main actor: the panel is an AppKit window, and both
/// the glide ticker and the binding watchdog have to be scheduled on the main
/// run loop.
@MainActor
final class CursorOverlayController: NSObject {
    /// Where a placement request actually ended up.
    ///
    /// The caller has to be able to tell a panel that moved from one that was
    /// hidden because its binding stopped holding: reporting the second as a
    /// successful move is how a live session ends up with a frozen cursor and no
    /// error anywhere.
    enum BindingOutcome {
        case ok
        case notFrontmost
        case windowMismatch
    }

    private static let panelSize = NSSize(width: 28, height: 28)

    private let window: OverlayPanel
    private let cursorView: OverlayCursorView
    private var autoHideTask: DispatchWorkItem?
    private var pressReleaseTask: DispatchWorkItem?
    private var bindingWatchdog: Timer?
    private var glideTicker: Timer?
    private var onGlideFinished: ((Bool) -> Void)?
    private var panelPositioned = false
    private var lastQuartzPoint: CGPoint?
    private var boundPid: pid_t?
    private var boundWindowNumber: Int64?
    private var boundWindowFrame: CGRect?

    override init() {
        cursorView = OverlayCursorView(frame: NSRect(origin: .zero, size: Self.panelSize))
        window = OverlayPanel(
            contentRect: NSRect(origin: .zero, size: Self.panelSize),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        super.init()
        window.title = "DSH Computer Use Cursor"
        window.contentView = cursorView
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = false
        window.ignoresMouseEvents = true
        window.hidesOnDeactivate = false
        window.becomesKeyOnlyIfNeeded = true
        window.level = .floating
        window.collectionBehavior = [.fullScreenAuxiliary, .stationary, .ignoresCycle]
        window.isReleasedWhenClosed = false
        window.sharingType = .readOnly
        NSWorkspace.shared.notificationCenter.addObserver(
            self,
            selector: #selector(applicationActivationChanged(_:)),
            name: NSWorkspace.didActivateApplicationNotification,
            object: nil
        )
    }

    deinit {
        NSWorkspace.shared.notificationCenter.removeObserver(self)
    }

    /// Move the panel to `quartzPoint` (or leave it bound but hidden when the
    /// target no longer holds) and report what happened.
    ///
    /// The binding is checked twice around the move -- once before the panel is
    /// ordered in, and once when the glide arrives -- because either half can be
    /// invalidated by the user switching applications mid-animation.
    func show(
        at quartzPoint: CGPoint,
        durationMs: Int?,
        speedPxPerSecond: Double?,
        accelerationPxPerSecondSquared: Double?,
        autoHideMs: Int,
        targetPid: pid_t?,
        targetWindowNumber: Int64?,
        targetWindowFrame: CGRect?,
        completion: @escaping (BindingOutcome) -> Void
    ) {
        autoHideTask?.cancel()
        let opening = targetPlacement(pid: targetPid, windowNumber: targetWindowNumber, expectedFrame: targetWindowFrame)
        guard opening == .ok else {
            hide()
            completion(opening)
            return
        }
        boundPid = targetPid
        boundWindowNumber = targetWindowNumber
        boundWindowFrame = targetWindowFrame
        startBindingWatchdog()
        if !panelPositioned {
            let mouse = NSEvent.mouseLocation
            window.setFrameOrigin(NSPoint(x: mouse.x, y: mouse.y - Self.panelSize.height))
            lastQuartzPoint = self.quartzPoint(forAppKit: mouse)
            panelPositioned = true
        }
        window.orderFrontRegardless()
        let afterOrderingFront = targetPlacement(
            pid: targetPid,
            windowNumber: targetWindowNumber,
            expectedFrame: targetWindowFrame
        )
        guard afterOrderingFront == .ok else {
            hide()
            completion(afterOrderingFront)
            return
        }
        glide(
            from: lastQuartzPoint ?? quartzPoint,
            to: quartzPoint,
            durationMs: durationMs,
            speedPxPerSecond: speedPxPerSecond,
            accelerationPxPerSecondSquared: accelerationPxPerSecondSquared
        ) { [weak self] arrived in
            guard let self else {
                completion(.windowMismatch)
                return
            }
            let settled = self.targetPlacement(
                pid: targetPid,
                windowNumber: targetWindowNumber,
                expectedFrame: targetWindowFrame
            )
            guard arrived, settled == .ok else {
                self.hide()
                completion(settled == .ok ? .windowMismatch : settled)
                return
            }
            self.scheduleAutoHide(after: autoHideMs)
            completion(.ok)
        }
    }

    /// Slide the panel to `target` on the main run loop.
    ///
    /// `window.animator().setFrameOrigin` is not an option here: the helper runs
    /// with a `.prohibited` activation policy, where the implicit animator
    /// silently does nothing. It only ever worked for the first placement,
    /// because that call happened while the panel was still off screen and went
    /// through a different path -- every later move was a no-op, so the cursor
    /// appeared once and then never followed the agent again.
    ///
    /// Stepping the origin directly is the same call the first placement already
    /// proved works, so the motion is both visible and correct.
    private func glide(
        from origin: CGPoint,
        to target: CGPoint,
        durationMs: Int?,
        speedPxPerSecond: Double?,
        accelerationPxPerSecondSquared: Double?,
        completion: @escaping (Bool) -> Void
    ) {
        endGlide(arrived: false)
        guard origin != target else {
            lastQuartzPoint = target
            window.setFrameOrigin(panelOrigin(forQuartz: target))
            window.orderFrontRegardless()
            completion(true)
            return
        }
        let distance = hypot(target.x - origin.x, target.y - origin.y)
        let duration = glideDuration(
            distance: distance,
            explicitDurationMs: durationMs,
            speedPxPerSecond: speedPxPerSecond,
            accelerationPxPerSecondSquared: accelerationPxPerSecondSquared
        )
        guard duration > 0 else {
            lastQuartzPoint = target
            window.setFrameOrigin(panelOrigin(forQuartz: target))
            window.orderFrontRegardless()
            completion(true)
            return
        }
        let started = CACurrentMediaTime()
        onGlideFinished = completion
        let ticker = Timer(timeInterval: 1.0 / 120.0, repeats: true) { [weak self] ticker in
            MainActor.assumeIsolated {
                guard let self else { ticker.invalidate(); return }
                if let boundPid = self.boundPid,
                   NSWorkspace.shared.frontmostApplication?.processIdentifier != boundPid {
                    self.hide()
                    return
                }
                let elapsed = CACurrentMediaTime() - started
                if elapsed >= duration {
                    self.lastQuartzPoint = target
                    self.window.setFrameOrigin(self.panelOrigin(forQuartz: target))
                    self.panelPositioned = true
                    self.endGlide(arrived: true)
                    return
                }
                let linear = elapsed / duration
                let fraction: Double
                if let speedPxPerSecond, let accelerationPxPerSecondSquared {
                    fraction = cursorMotionFraction(
                        progress: linear,
                        distance: distance,
                        speed: speedPxPerSecond,
                        acceleration: accelerationPxPerSecondSquared
                    )
                } else {
                    fraction = linear * linear * (3 - 2 * linear)
                }
                let point = cursorMotionPoint(from: origin, to: target, fraction: fraction)
                self.lastQuartzPoint = point
                self.window.setFrameOrigin(self.panelOrigin(forQuartz: point))
            }
        }
        glideTicker = ticker
        RunLoop.main.add(ticker, forMode: .common)
    }

    /// How long this particular move should take: whatever the caller asked for
    /// in milliseconds, else the physical profile, else the fixed default that
    /// keeps an unspecified glide perceptible.
    private func glideDuration(
        distance: Double,
        explicitDurationMs: Int?,
        speedPxPerSecond: Double?,
        accelerationPxPerSecondSquared: Double?
    ) -> Double {
        if let explicitDurationMs { return Double(explicitDurationMs) / 1000 }
        guard let speedPxPerSecond, let accelerationPxPerSecondSquared else { return 0.18 }
        return cursorMotionDuration(
            distance: distance,
            speed: speedPxPerSecond,
            acceleration: accelerationPxPerSecondSquared
        )
    }

    private func endGlide(arrived: Bool) {
        glideTicker?.invalidate()
        glideTicker = nil
        let completion = onGlideFinished
        onGlideFinished = nil
        completion?(arrived)
    }

    func press(autoHideMs: Int, sustained: Bool) {
        guard window.isVisible else { return }
        pressReleaseTask?.cancel()
        pressReleaseTask = nil
        cursorView.isPressed = true
        if !sustained {
            let work = DispatchWorkItem { [weak self] in
                self?.cursorView.isPressed = false
            }
            pressReleaseTask = work
            DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(150), execute: work)
        }
        scheduleAutoHide(after: autoHideMs)
    }

    func release(autoHideMs: Int) {
        pressReleaseTask?.cancel()
        pressReleaseTask = nil
        cursorView.isPressed = false
        scheduleAutoHide(after: autoHideMs)
    }

    var isVisible: Bool { window.isVisible }

    /// Re-check the binding without moving the panel; hides it when the binding
    /// no longer holds, so a press or release never lands on a stale window.
    @discardableResult
    func validateBinding(pid: pid_t?, windowNumber: Int64?, expectedFrame: CGRect?) -> BindingOutcome {
        guard window.isVisible else { return .windowMismatch }
        let outcome = targetPlacement(pid: pid, windowNumber: windowNumber, expectedFrame: expectedFrame)
        if outcome != .ok {
            hide()
            return outcome
        }
        return .ok
    }

    func hide() {
        endGlide(arrived: false)
        autoHideTask?.cancel()
        autoHideTask = nil
        pressReleaseTask?.cancel()
        pressReleaseTask = nil
        bindingWatchdog?.invalidate()
        bindingWatchdog = nil
        boundPid = nil
        boundWindowNumber = nil
        boundWindowFrame = nil
        cursorView.isPressed = false
        window.orderOut(nil)
    }

    /// Hide, then stop the run loop. The application-defined event is posted so
    /// `NSApp.stop` is not left waiting for input that will never arrive.
    func stop() {
        hide()
        NSApp.stop(nil)
        if let wakeEvent = NSEvent.otherEvent(
            with: .applicationDefined,
            location: .zero,
            modifierFlags: [],
            timestamp: ProcessInfo.processInfo.systemUptime,
            windowNumber: 0,
            context: nil,
            subtype: 0,
            data1: 0,
            data2: 0
        ) {
            NSApp.postEvent(wakeEvent, atStart: true)
        }
    }

    /// `milliseconds <= 0` cancels a pending auto-hide without scheduling a new
    /// one, which is how a sustained gesture keeps the panel on screen.
    private func scheduleAutoHide(after milliseconds: Int) {
        autoHideTask?.cancel()
        guard milliseconds > 0 else { return }
        let work = DispatchWorkItem { [weak self] in self?.hide() }
        autoHideTask = work
        DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(milliseconds), execute: work)
    }

    /// The fallback that catches binding changes AppKit does not hand us as a
    /// notification: a window that moved, resized or closed under a stationary
    /// mouse. Only one watchdog ever exists.
    private func startBindingWatchdog() {
        guard bindingWatchdog == nil else { return }
        bindingWatchdog = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, self.window.isVisible else { return }
                if self.targetPlacement(
                    pid: self.boundPid,
                    windowNumber: self.boundWindowNumber,
                    expectedFrame: self.boundWindowFrame
                ) != .ok {
                    self.hide()
                }
            }
        }
    }

    /// Fast path: the user activated something else, so a bound panel is stale
    /// immediately and does not have to wait for the next watchdog tick.
    @objc private func applicationActivationChanged(_ notification: Notification) {
        guard window.isVisible, let boundPid else { return }
        if NSWorkspace.shared.frontmostApplication?.processIdentifier != boundPid {
            hide()
        }
    }

    /// Quartz screen coordinates are top-left based and span every display at
    /// once; AppKit coordinates are bottom-left based per screen. Each direction
    /// walks the live screens and falls back to the main display when the point
    /// lands outside all of them.
    private func appKitPoint(forQuartz point: CGPoint) -> NSPoint {
        for screen in NSScreen.screens {
            guard let screenNumber = (screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value else {
                continue
            }
            let quartzFrame = CGDisplayBounds(CGDirectDisplayID(screenNumber))
            if quartzFrame.contains(point) {
                return NSPoint(
                    x: screen.frame.origin.x + (point.x - quartzFrame.origin.x),
                    y: screen.frame.maxY - (point.y - quartzFrame.origin.y)
                )
            }
        }
        let mainDisplay = CGMainDisplayID()
        let quartzFrame = CGDisplayBounds(mainDisplay)
        let screen = NSScreen.screens.first { candidate in
            (candidate.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value == mainDisplay
        } ?? NSScreen.main
        let appKitFrame = screen?.frame ?? .zero
        return NSPoint(
            x: appKitFrame.origin.x + (point.x - quartzFrame.origin.x),
            y: appKitFrame.maxY - (point.y - quartzFrame.origin.y)
        )
    }

    private func quartzPoint(forAppKit point: NSPoint) -> CGPoint {
        for screen in NSScreen.screens {
            guard screen.frame.contains(point),
                  let screenNumber = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber else {
                continue
            }
            let quartzFrame = CGDisplayBounds(CGDirectDisplayID(screenNumber.uint32Value))
            return CGPoint(
                x: quartzFrame.origin.x + (point.x - screen.frame.origin.x),
                y: quartzFrame.origin.y + (screen.frame.maxY - point.y)
            )
        }
        let mainDisplay = CGMainDisplayID()
        let quartzFrame = CGDisplayBounds(mainDisplay)
        let appKitFrame = NSScreen.main?.frame ?? NSRect(
            x: quartzFrame.origin.x,
            y: quartzFrame.origin.y,
            width: quartzFrame.width,
            height: quartzFrame.height
        )
        return CGPoint(
            x: quartzFrame.origin.x + (point.x - appKitFrame.origin.x),
            y: quartzFrame.origin.y + (appKitFrame.maxY - point.y)
        )
    }

    /// The panel hangs down-right of the hotspot, which is what puts the painted
    /// arrow tip exactly on the requested coordinate.
    private func panelOrigin(forQuartz point: CGPoint) -> NSPoint {
        let appKit = appKitPoint(forQuartz: point)
        return NSPoint(x: appKit.x, y: appKit.y - Self.panelSize.height)
    }

    /// Does the panel's binding still hold right now?
    ///
    /// `.notFrontmost` and `.windowMismatch` tell the caller different stories:
    /// the first says the bound application is in the background, the second
    /// says its window moved, resized or disappeared since it was observed. Both
    /// hide the panel and neither may be reported as a successful move.
    private func targetPlacement(pid: pid_t?, windowNumber: Int64?, expectedFrame: CGRect?) -> BindingOutcome {
        guard let pid, let windowNumber, let expectedFrame else { return .windowMismatch }
        guard NSWorkspace.shared.frontmostApplication?.processIdentifier == pid else { return .notFrontmost }
        guard let rawWindows = CGWindowListCopyWindowInfo(
            [.optionOnScreenOnly, .excludeDesktopElements],
            kCGNullWindowID
        ) as? [[String: Any]] else {
            return .windowMismatch
        }
        let tolerance: CGFloat = 2
        let found = rawWindows.contains { window in
            guard (window[kCGWindowOwnerPID as String] as? NSNumber)?.int32Value == pid,
                  (window[kCGWindowNumber as String] as? NSNumber)?.int64Value == windowNumber,
                  let bounds = window[kCGWindowBounds as String] as? [String: Any],
                  let currentFrame = CGRect(dictionaryRepresentation: bounds as CFDictionary) else { return false }
            return abs(currentFrame.minX - expectedFrame.minX) <= tolerance
                && abs(currentFrame.minY - expectedFrame.minY) <= tolerance
                && abs(currentFrame.width - expectedFrame.width) <= tolerance
                && abs(currentFrame.height - expectedFrame.height) <= tolerance
        }
        return found ? .ok : .windowMismatch
    }
}

/// Entry point for the `--cursor-overlay` mode: a long-lived process that owns
/// nothing but the panel and a stdin command stream.
@MainActor
enum CursorOverlayRuntime {
    static func run() {
        let app = NSApplication.shared
        app.setActivationPolicy(.prohibited)
        let controller = CursorOverlayController()
        let queue = OverlayCommandQueue(controller: controller)
        let reader = OverlayLineReader { object in
            DispatchQueue.main.async {
                queue.accept(object)
            }
        } onEnd: {
            DispatchQueue.main.async { queue.finishInput() }
        } onInvalid: { message in
            DispatchQueue.main.async {
                queue.reject(message)
            }
        }
        let input = FileHandle.standardInput
        input.readabilityHandler = { handle in reader.consume(handle.availableData) }
        writeCursorResponse(["ok": true, "ready": true, "pid": ProcessInfo.processInfo.processIdentifier])
        app.run()
        input.readabilityHandler = nil
    }
}
