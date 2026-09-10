import AppKit
import CoreGraphics
import Darwin
import Foundation

/// Command-line surface of the monitor.
///
/// The fixture e2e lane launches this binary with these flags and parses the
/// JSON report it writes when the sampling window closes, so the flag names and
/// the report keys below are wire format.
private struct MonitorArguments {
    let durationMs: Int
    let intervalMicros: useconds_t
    let windowOwnerPid: Int32?
    let windowTitle: String?
    let monitoredSourcePid: Int32?

    init(_ values: [String]) {
        durationMs = MonitorFlag.positiveInteger("--duration-ms", in: values, fallback: 1200)
        intervalMicros = useconds_t(MonitorFlag.positiveInteger("--interval-micros", in: values, fallback: 1000))
        windowOwnerPid = MonitorFlag.text("--window-owner-pid", in: values).flatMap { Int32($0) }
        windowTitle = MonitorFlag.text("--window-title", in: values)
        monitoredSourcePid = MonitorFlag.positiveInt32("--source-pid", in: values)
    }
}

/// Readers for the `--flag value` style this binary uses.
private enum MonitorFlag {
    /// The argument that follows `name`, or `nil` when the flag is absent or the
    /// argument list stops right after it.
    static func text(_ name: String, in values: [String]) -> String? {
        guard let index = values.firstIndex(of: name), values.indices.contains(index + 1) else { return nil }
        return values[index + 1]
    }

    /// A strictly positive integer flag. A malformed value degrades to
    /// `fallback` instead of aborting the run.
    static func positiveInteger(_ name: String, in values: [String], fallback: Int) -> Int {
        guard let raw = text(name, in: values), let value = Int(raw), value > 0 else { return fallback }
        return value
    }

    /// A strictly positive 32-bit flag, for values that have to fit the pid range
    /// the event stream reports.
    static func positiveInt32(_ name: String, in values: [String]) -> Int32? {
        guard let raw = text(name, in: values), let value = Int32(raw), value > 0 else { return nil }
        return value
    }
}

private func currentCursorLocation() -> CGPoint {
    CGEvent(source: nil)?.location ?? .zero
}

private func frontmostPid() -> pid_t? {
    NSWorkspace.shared.frontmostApplication?.processIdentifier
}

/// On-screen windows belonging to one owner, optionally narrowed to one title.
private func onScreenWindows(ownerPid: pid_t?, title: String?) -> [[String: Any]] {
    guard let windows = CGWindowListCopyWindowInfo(
        [.optionOnScreenOnly, .excludeDesktopElements],
        kCGNullWindowID
    ) as? [[String: Any]] else { return [] }
    return windows.filter { window in
        if let ownerPid,
           (window[kCGWindowOwnerPID as String] as? NSNumber)?.int32Value != ownerPid { return false }
        if let title,
           (window[kCGWindowName as String] as? String) != title { return false }
        return true
    }
}

/// Identity of a window rectangle, used to record each distinct frame once.
private func frameKey(_ bounds: [String: Any]) -> String {
    ["X", "Y", "Width", "Height"]
        .map { String(describing: bounds[$0] ?? "") }
        .joined(separator: ",")
}

/// How many pointer events arrived from each source process.
///
/// The tap callback is a C function pointer and cannot capture context, so it
/// writes into this file-scope object, which it reaches through the tap's
/// `userInfo`. The tap is attached to this process's main run loop -- the same
/// thread that samples -- so the counter needs no locking.
private final class PointerSourceTally {
    private(set) var counts: [String: Int] = [:]

    func record(sourcePid: Int64) {
        counts[String(sourcePid), default: 0] += 1
    }
}

private let pointerTally = PointerSourceTally()

/// The listen-only tap over every pointer event type the non-interference
/// checks care about, plus the run-loop source that feeds it.
private struct PointerTapInstrumentation {
    let tap: CFMachPort?
    let source: CFRunLoopSource?

    private static let eventMask = [
        CGEventType.mouseMoved,
        .leftMouseDown,
        .leftMouseUp,
        .leftMouseDragged,
        .rightMouseDown,
        .rightMouseUp,
        .rightMouseDragged,
        .otherMouseDown,
        .otherMouseUp,
        .otherMouseDragged,
        .scrollWheel,
    ].reduce(CGEventMask(0)) { mask, type in
        mask | (CGEventMask(1) << type.rawValue)
    }

    static func make() -> PointerTapInstrumentation {
        let tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .listenOnly,
            eventsOfInterest: eventMask,
            callback: { _, _, event, userInfo in
                if let userInfo {
                    Unmanaged<PointerSourceTally>.fromOpaque(userInfo).takeUnretainedValue()
                        .record(sourcePid: event.getIntegerValueField(.eventSourceUnixProcessID))
                }
                return Unmanaged.passUnretained(event)
            },
            userInfo: Unmanaged.passUnretained(pointerTally).toOpaque()
        )
        return PointerTapInstrumentation(
            tap: tap,
            source: tap.map { CFMachPortCreateRunLoopSource(kCFAllocatorDefault, $0, 0) }
        )
    }

    /// A run-loop source is what makes sampling event-driven; without one the
    /// loop has to fall back to sleeping between samples.
    var isEventDriven: Bool { source != nil }

    func install() {
        guard let tap, let source else { return }
        CFRunLoopAddSource(CFRunLoopGetCurrent(), source, .defaultMode)
        CGEvent.tapEnable(tap: tap, enable: true)
    }
}

/// One observation window: baseline, sampling loop, report.
private enum InteractionMonitor {
    static func run(_ options: MonitorArguments) {
        let baselineCursor = currentCursorLocation()
        let baselineFrontmostPid = frontmostPid()
        let instrumentation = PointerTapInstrumentation.make()
        instrumentation.install()

        var observedFrontmostPids: Set<Int32> = []
        if let baselineFrontmostPid { observedFrontmostPids.insert(baselineFrontmostPid) }
        var maximumCursorDistance = 0.0
        var maximumMatchingWindowCount = 0
        var matchingWindowFrames: [[String: Any]] = []
        var matchingWindowNumbers: [Int] = []
        var seenWindowFrames = Set<String>()
        var samples = 0

        FileHandle.standardOutput.write(Data("READY\n".utf8))

        let deadline = DispatchTime.now().uptimeNanoseconds + UInt64(options.durationMs) * 1_000_000
        while DispatchTime.now().uptimeNanoseconds < deadline {
            let location = currentCursorLocation()
            maximumCursorDistance = max(
                maximumCursorDistance,
                hypot(location.x - baselineCursor.x, location.y - baselineCursor.y)
            )
            if let pid = frontmostPid() { observedFrontmostPids.insert(pid) }

            let windows = onScreenWindows(ownerPid: options.windowOwnerPid, title: options.windowTitle)
            maximumMatchingWindowCount = max(maximumMatchingWindowCount, windows.count)
            if let first = windows.first,
               let bounds = first[kCGWindowBounds as String] as? [String: Any] {
                if seenWindowFrames.insert(frameKey(bounds)).inserted {
                    matchingWindowFrames.append(bounds)
                }
                if let number = (first[kCGWindowNumber as String] as? NSNumber)?.intValue,
                   !matchingWindowNumbers.contains(number) {
                    matchingWindowNumbers.append(number)
                }
            }

            samples += 1
            if instrumentation.isEventDriven {
                CFRunLoopRunInMode(.defaultMode, Double(options.intervalMicros) / 1_000_000, true)
            } else {
                usleep(options.intervalMicros)
            }
        }

        let finalCursor = currentCursorLocation()
        let finalFrontmostPid = frontmostPid()
        // Every event increments the tally, so the monitored source's traffic is
        // simply its own bucket in that map.
        let monitoredSourcePointerEvents = options.monitoredSourcePid
            .flatMap { pointerTally.counts[String($0)] } ?? 0
        let report: [String: Any] = [
            "baselineCursor": ["x": baselineCursor.x, "y": baselineCursor.y],
            "finalCursor": ["x": finalCursor.x, "y": finalCursor.y],
            "maximumCursorDistance": maximumCursorDistance,
            "baselineFrontmostPid": baselineFrontmostPid.map(Int.init) as Any,
            "observedFrontmostPids": observedFrontmostPids.sorted().map(Int.init),
            "finalFrontmostPid": finalFrontmostPid.map(Int.init) as Any,
            "samples": samples,
            "maximumMatchingWindowCount": maximumMatchingWindowCount,
            "matchingWindowFrames": matchingWindowFrames,
            "matchingWindowNumbers": matchingWindowNumbers,
            "eventTapAvailable": instrumentation.tap != nil,
            "monitoredSourcePointerEvents": monitoredSourcePointerEvents,
            "pointerEventSourceCounts": pointerTally.counts,
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: report, options: [.sortedKeys]) else { return }
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data("\n".utf8))
    }
}

InteractionMonitor.run(MonitorArguments(ProcessInfo.processInfo.arguments))
