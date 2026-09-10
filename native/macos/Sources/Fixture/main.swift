import AppKit
import Foundation

/// A pointer event the probe view saw, tagged with the transcript name the e2e
/// lane reads back.
private enum ProbeEvent: String {
    case down = "pointer down"
    case drag = "pointer drag"
    case up = "pointer up"
    case upWithoutDown = "pointer up without down"
    case scroll = "pointer scroll"
}

/// The large drop target in the middle of the fixture.
///
/// Pointer input is routed here by the helper, so the view only has to report
/// what arrived; all bookkeeping lives in the delegate.
private final class PointerProbeView: NSView {
    var onEvent: ((ProbeEvent) -> Void)?
    private var dragging = false

    override var isFlipped: Bool { true }

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.backgroundColor = NSColor.controlBackgroundColor.cgColor
        layer?.borderColor = NSColor.separatorColor.cgColor
        layer?.borderWidth = 1
        layer?.cornerRadius = 8
        setAccessibilityElement(true)
        setAccessibilityRole(.group)
        setAccessibilityLabel("Targeted pointer probe")
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

    override func mouseDown(with event: NSEvent) {
        dragging = true
        onEvent?(.down)
    }

    override func mouseDragged(with event: NSEvent) {
        guard dragging else { return }
        onEvent?(.drag)
    }

    override func mouseUp(with event: NSEvent) {
        let wasDragging = dragging
        dragging = false
        onEvent?(wasDragging ? .up : .upWithoutDown)
    }

    override func scrollWheel(with event: NSEvent) {
        onEvent?(.scroll)
    }

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)
        let caption = "Targeted pointer probe"
        let attributes: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 13, weight: .medium),
            .foregroundColor: NSColor.secondaryLabelColor,
        ]
        let captionSize = caption.size(withAttributes: attributes)
        caption.draw(
            at: NSPoint(x: (bounds.width - captionSize.width) / 2, y: (bounds.height - captionSize.height) / 2),
            withAttributes: attributes
        )
    }
}

/// Command-line switches the e2e lane launches the fixture with.
private struct FixtureLaunchOptions {
    let transcriptPath: String?
    let reorderTriggerPath: String?
    let activationTriggerPath: String?
    let activationReleaseTriggerPath: String?
    let activationOnly: Bool
    let launchInBackground: Bool

    init(_ arguments: [String]) {
        func value(after flag: String) -> String? {
            guard let index = arguments.firstIndex(of: flag), arguments.indices.contains(index + 1) else { return nil }
            return arguments[index + 1]
        }
        transcriptPath = value(after: "--transcript")
        reorderTriggerPath = value(after: "--reorder-trigger")
        activationTriggerPath = value(after: "--activation-trigger")
        activationReleaseTriggerPath = value(after: "--activation-release-trigger")
        activationOnly = arguments.contains("--activation-only")
        launchInBackground = arguments.contains("--background")
    }
}

/// Rewrites the whole transcript file on every event.
///
/// The keys are wire format: the e2e lane parses this JSON to decide what the
/// fixture actually did with the input it received.
private struct FixtureTranscript {
    let path: String?

    func record(event: String, fields: [String: Any]) {
        guard let path else { return }
        var payload = fields
        payload["event"] = event
        guard let data = try? JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys]) else { return }
        try? data.write(to: URL(fileURLWithPath: path), options: .atomic)
    }
}

/// Pointer and activation bookkeeping the transcript reports.
private struct FixtureActivity {
    var click = 0
    var scroll = 0
    var drag = 0
    var mouseDown = 0
    var mouseUp = 0
    var dragGestures = 0
    var activation = 0
    /// True between the pointer going down and coming up inside the probe.
    var dragging = false
}

/// The checkbox the fixture has to be able to rebuild: inserting the harmless
/// sibling control replaces it in the stack.
private func makeOptionCheckbox(state: NSControl.StateValue, owner: FixtureDelegate) -> NSButton {
    let checkbox = NSButton(
        checkboxWithTitle: "Enable deterministic option",
        target: owner,
        action: #selector(FixtureDelegate.toggleCheckbox)
    )
    checkbox.state = state
    checkbox.setAccessibilityLabel("Enable deterministic option")
    checkbox.identifier = NSUserInterfaceItemIdentifier("fixture.checkbox")
    return checkbox
}

/// The fixture window and every control the e2e lane addresses.
///
/// Labels and identifiers are wire format: observations select elements by them,
/// so they stay exactly as the tests expect.
private final class FixtureScene {
    let window: NSWindow
    let textField: NSTextField
    let secureField: NSSecureTextField
    let popup: NSPopUpButton
    let slider: NSSlider
    let statusLabel: NSTextField
    let probe: PointerProbeView
    let stack: NSStackView
    var checkbox: NSButton

    private init(
        window: NSWindow,
        textField: NSTextField,
        secureField: NSSecureTextField,
        popup: NSPopUpButton,
        slider: NSSlider,
        statusLabel: NSTextField,
        probe: PointerProbeView,
        stack: NSStackView,
        checkbox: NSButton
    ) {
        self.window = window
        self.textField = textField
        self.secureField = secureField
        self.popup = popup
        self.slider = slider
        self.statusLabel = statusLabel
        self.probe = probe
        self.stack = stack
        self.checkbox = checkbox
    }

    func setStatus(_ text: String) {
        statusLabel.stringValue = text
    }

    static func build(owner: FixtureDelegate) -> FixtureScene {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 760, height: 560),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "DSH Computer Use Fixture"
        window.center()
        window.setFrameAutosaveName("dsh-computer-use-fixture")

        let content = NSView()
        content.translatesAutoresizingMaskIntoConstraints = false
        window.contentView = content

        let heading = NSTextField(labelWithString: "Computer Use deterministic fixture")
        heading.font = .systemFont(ofSize: 22, weight: .semibold)
        heading.setAccessibilityLabel("Fixture title")

        let textField = NSTextField(string: "initial text")
        textField.placeholderString = "Editable text"
        textField.setAccessibilityLabel("Editable text")
        textField.identifier = NSUserInterfaceItemIdentifier("fixture.text")
        textField.target = owner
        textField.action = #selector(FixtureDelegate.applyValues)

        let secureField = NSSecureTextField(string: "fixture-secret")
        secureField.placeholderString = "Secure text"
        secureField.setAccessibilityLabel("Secure text")
        secureField.identifier = NSUserInterfaceItemIdentifier("fixture.secure")

        let checkbox = makeOptionCheckbox(state: .off, owner: owner)

        let popup = NSPopUpButton(frame: .zero, pullsDown: false)
        popup.addItems(withTitles: ["Alpha", "Beta", "Gamma"])
        popup.selectItem(at: 0)
        popup.target = owner
        popup.action = #selector(FixtureDelegate.selectPopup)
        popup.setAccessibilityLabel("Fixture selection")

        let slider = NSSlider(value: 25, minValue: 0, maxValue: 100, target: owner, action: #selector(FixtureDelegate.changeSlider))
        slider.setAccessibilityLabel("Fixture slider")

        let apply = NSButton(title: "Apply", target: owner, action: #selector(FixtureDelegate.applyValues))
        apply.bezelStyle = .rounded
        apply.keyEquivalent = "\r"
        apply.setAccessibilityLabel("Apply fixture values")

        let delayed = NSButton(title: "Delayed update", target: owner, action: #selector(FixtureDelegate.delayedUpdate))
        delayed.bezelStyle = .rounded
        delayed.setAccessibilityLabel("Start delayed update")

        let modal = NSButton(title: "Show modal", target: owner, action: #selector(FixtureDelegate.showModal))
        modal.bezelStyle = .rounded
        modal.setAccessibilityLabel("Show fixture modal")

        let statusLabel = NSTextField(labelWithString: "Status: ready")
        statusLabel.font = .monospacedSystemFont(ofSize: 13, weight: .regular)
        statusLabel.setAccessibilityLabel("Fixture status")
        statusLabel.identifier = NSUserInterfaceItemIdentifier("fixture.status")

        let probe = PointerProbeView(frame: .zero)
        probe.translatesAutoresizingMaskIntoConstraints = false
        probe.heightAnchor.constraint(equalToConstant: 54).isActive = true

        let textView = NSTextView()
        textView.string = (1...80).map { "Scrollable row \($0)" }.joined(separator: "\n")
        textView.isEditable = false
        textView.isSelectable = true
        textView.setAccessibilityLabel("Scrollable fixture rows")
        let scroll = NSScrollView()
        scroll.hasVerticalScroller = true
        scroll.documentView = textView
        scroll.heightAnchor.constraint(equalToConstant: 180).isActive = true

        let fields = NSGridView(views: [
            [NSTextField(labelWithString: "Text"), textField],
            [NSTextField(labelWithString: "Secret"), secureField],
            [NSTextField(labelWithString: "Selection"), popup],
            [NSTextField(labelWithString: "Level"), slider],
        ])
        fields.rowSpacing = 10
        fields.columnSpacing = 14
        fields.column(at: 0).xPlacement = .trailing
        fields.column(at: 1).width = 460

        let buttons = NSStackView(views: [apply, delayed, modal])
        buttons.orientation = .horizontal
        buttons.spacing = 10

        let stack = NSStackView(views: [heading, fields, checkbox, buttons, statusLabel, probe, scroll])
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 16
        content.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 28),
            stack.trailingAnchor.constraint(equalTo: content.trailingAnchor, constant: -28),
            stack.topAnchor.constraint(equalTo: content.topAnchor, constant: 24),
            stack.bottomAnchor.constraint(lessThanOrEqualTo: content.bottomAnchor, constant: -24),
            scroll.widthAnchor.constraint(equalTo: stack.widthAnchor),
            probe.widthAnchor.constraint(equalTo: stack.widthAnchor),
        ])
        window.makeFirstResponder(textField)

        return FixtureScene(
            window: window,
            textField: textField,
            secureField: secureField,
            popup: popup,
            slider: slider,
            statusLabel: statusLabel,
            probe: probe,
            stack: stack,
            checkbox: checkbox
        )
    }
}

private final class FixtureDelegate: NSObject, NSApplicationDelegate {
    private let options: FixtureLaunchOptions
    private let transcript: FixtureTranscript
    private var scene: FixtureScene!
    private var activity = FixtureActivity()
    private var insertedHarmlessSibling = false
    private var keyMonitor: Any?
    private var reorderTimer: Timer?
    private var activationTimer: Timer?
    private var activationReleaseTimer: Timer?
    private var activationHoldUntil: Date?

    init(options: FixtureLaunchOptions) {
        self.options = options
        self.transcript = FixtureTranscript(path: options.transcriptPath)
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        let scene = FixtureScene.build(owner: self)
        scene.probe.onEvent = { [weak self] event in self?.handleProbe(event) }
        self.scene = scene

        keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            guard event.keyCode == 36 else { return event }
            self?.applyValues()
            return nil
        }

        if options.launchInBackground {
            scene.window.orderFrontRegardless()
            scene.window.orderBack(nil)
        } else {
            NSApplication.shared.activate(ignoringOtherApps: true)
            scene.window.makeKeyAndOrderFront(nil)
        }

        writeTranscript(event: "ready")
        if options.activationOnly {
            activationHoldUntil = Date().addingTimeInterval(5)
        }
        startTriggerTimers()
    }

    func applicationDidBecomeActive(_ notification: Notification) {
        activity.activation += 1
        writeTranscript(event: "activated")
    }

    func applicationWillTerminate(_ notification: Notification) {
        if let keyMonitor { NSEvent.removeMonitor(keyMonitor) }
        reorderTimer?.invalidate()
        activationTimer?.invalidate()
        activationReleaseTimer?.invalidate()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    /// Files the e2e lane drops to make the fixture do something on demand. Each
    /// trigger is consumed (deleted) the moment it is seen.
    private func startTriggerTimers() {
        if let reorderTriggerPath = options.reorderTriggerPath {
            reorderTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] timer in
                guard FileManager.default.fileExists(atPath: reorderTriggerPath) else { return }
                timer.invalidate()
                self?.insertHarmlessSibling()
            }
        }
        let activationTriggerPath = options.activationTriggerPath
        if activationTriggerPath != nil || options.activationOnly {
            activationTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
                guard let self else { return }
                if let activationTriggerPath,
                   FileManager.default.fileExists(atPath: activationTriggerPath) {
                    try? FileManager.default.removeItem(atPath: activationTriggerPath)
                    self.activationHoldUntil = Date().addingTimeInterval(5)
                }
                guard let holdUntil = self.activationHoldUntil else { return }
                guard Date() < holdUntil else {
                    self.activationHoldUntil = nil
                    return
                }
                NSApplication.shared.activate(ignoringOtherApps: true)
                self.scene.window.makeKeyAndOrderFront(nil)
            }
        }
        if let activationReleaseTriggerPath = options.activationReleaseTriggerPath {
            activationReleaseTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
                guard FileManager.default.fileExists(atPath: activationReleaseTriggerPath) else { return }
                try? FileManager.default.removeItem(atPath: activationReleaseTriggerPath)
                self?.activationHoldUntil = nil
            }
        }
    }

    /// The pointer half of the transcript. A press that has not been released
    /// yet is not an event of its own; everything the probe reports afterwards is.
    private func handleProbe(_ event: ProbeEvent) {
        switch event {
        case .down:
            activity.mouseDown += 1
            activity.dragging = false
            return
        case .drag:
            activity.drag += 1
            activity.dragging = true
            scene.setStatus("Status: pointer drag")
        case .up:
            activity.mouseUp += 1
            if activity.dragging {
                activity.dragGestures += 1
                scene.setStatus("Status: pointer drag")
            } else {
                activity.click += 1
                scene.setStatus("Status: pointer click")
            }
            activity.dragging = false
        case .scroll:
            activity.scroll += 1
            scene.setStatus("Status: pointer scroll")
        case .upWithoutDown:
            break
        }
        writeTranscript(event: event.rawValue)
    }

    @objc fileprivate func applyValues() {
        scene.setStatus("Status: applied \(scene.textField.stringValue)")
        writeTranscript(event: "apply")
    }

    @objc fileprivate func toggleCheckbox() {
        scene.setStatus(scene.checkbox.state == .on ? "Status: option enabled" : "Status: option disabled")
        writeTranscript(event: "checkbox")
    }

    @objc fileprivate func selectPopup() {
        scene.setStatus("Status: selected \(scene.popup.titleOfSelectedItem ?? "")")
        writeTranscript(event: "selection")
    }

    @objc fileprivate func changeSlider() {
        scene.setStatus("Status: slider \(Int(scene.slider.doubleValue))")
        writeTranscript(event: "slider")
    }

    @objc fileprivate func delayedUpdate() {
        scene.setStatus("Status: waiting")
        writeTranscript(event: "delay-start")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.scene.setStatus("Status: delayed complete")
            self?.writeTranscript(event: "delay-complete")
        }
    }

    /// Inserts one extra control in front of the checkbox and rebuilds the
    /// checkbox in place, so an observation taken before and after has to notice
    /// that the element it named has moved.
    private func insertHarmlessSibling() {
        guard !insertedHarmlessSibling else { return }
        insertedHarmlessSibling = true
        let checkboxState = scene.checkbox.state
        scene.stack.removeArrangedSubview(scene.checkbox)
        scene.checkbox.removeFromSuperview()
        let sibling = NSTextField(labelWithString: "Harmless dynamic sibling")
        sibling.setAccessibilityLabel("Harmless dynamic sibling")
        sibling.identifier = NSUserInterfaceItemIdentifier("fixture.harmless-sibling")
        scene.stack.insertArrangedSubview(sibling, at: 2)
        scene.checkbox = makeOptionCheckbox(state: checkboxState, owner: self)
        scene.stack.insertArrangedSubview(scene.checkbox, at: 3)
        scene.setStatus("Status: harmless sibling inserted")
        writeTranscript(event: "reorder")
    }

    @objc fileprivate func showModal() {
        let alert = NSAlert()
        alert.messageText = "Fixture modal"
        alert.informativeText = "This modal exists for deterministic Accessibility observation."
        alert.addButton(withTitle: "Confirm")
        alert.beginSheetModal(for: scene.window) { [weak self] _ in
            self?.scene.setStatus("Status: modal confirmed")
            self?.writeTranscript(event: "modal")
        }
    }

    private func writeTranscript(event: String) {
        transcript.record(event: event, fields: [
            "text": scene.textField.stringValue,
            "secureLength": scene.secureField.stringValue.count,
            "checked": scene.checkbox.state == .on,
            "selection": scene.popup.titleOfSelectedItem ?? "",
            "slider": Int(scene.slider.doubleValue),
            "status": scene.statusLabel.stringValue,
            "pointerClickCount": activity.click,
            "pointerScrollCount": activity.scroll,
            "pointerDragCount": activity.drag,
            "pointerMouseDownCount": activity.mouseDown,
            "pointerMouseUpCount": activity.mouseUp,
            "pointerDragGestureCount": activity.dragGestures,
            "activationCount": activity.activation,
        ])
    }
}

let app = NSApplication.shared
private let delegate = FixtureDelegate(options: FixtureLaunchOptions(ProcessInfo.processInfo.arguments))
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
