import AppKit
import ApplicationServices
import CoreGraphics
import Foundation

private let helperVersion = "0.4.0"

/// Process entry. Three modes share one binary: the cursor overlay runtime, the
/// drag helper (which holds a line protocol open across the gesture), and the
/// one-shot request/response mode every other command uses.
@main
private struct HelperMain {
    @MainActor
    static func main() async {
        do {
            _ = NSApplication.shared
            NSApplication.shared.setActivationPolicy(.prohibited)
            try HostTransport.requireManagedParent()
            if ProcessInfo.processInfo.arguments.contains("--cursor-overlay") {
                CursorOverlayRuntime.run()
                return
            }
            if ProcessInfo.processInfo.arguments.contains("--drag-action") {
                guard let line = readLine(),
                      let data = line.data(using: .utf8),
                      let request = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                      (request["command"] as? String) == "act",
                      let actionRequest = request["request"] as? [String: Any],
                      let action = actionRequest["action"] as? [String: Any],
                      (action["kind"] as? String) == "drag" else {
                    throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "drag helper stdin must contain one drag action request")
                }
                let value = try await CommandRouter.respond(to: request, dragStartBarrier: {
                    ResponseWriter.frame(["ok": true, "event": "drag-ready"])
                    guard readLine() == "START" else {
                        throw HelperFault.of("COMPUTER_CANCELLED", "drag action was cancelled before native mouse-down")
                    }
                })
                ResponseWriter.emit(["ok": true, "value": value], exitCode: 0)
            }
            guard let data = try FileHandle.standardInput.readToEnd(), !data.isEmpty,
                  let request = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "stdin must contain one JSON request")
            }
            let value = try await CommandRouter.respond(to: request)
            ResponseWriter.emit(["ok": true, "value": value], exitCode: 0)
        } catch let error as HelperFault {
            ResponseWriter.emit(["ok": false, "error": ["code": error.code, "message": error.message]], exitCode: 2)
        } catch {
            ResponseWriter.emit(["ok": false, "error": ["code": "COMPUTER_PROVIDER_FAILURE", "message": String(describing: error).prefix(1000).description]], exitCode: 2)
        }
    }
}

/// The helper's command surface. Every command name and every key produced here
/// is wire protocol; the TypeScript half dispatches on them verbatim.
enum CommandRouter {
    static func respond(
        to request: [String: Any],
        dragStartBarrier: (() throws -> Void)? = nil
    ) async throws -> Any {
        guard (request["protocolVersion"] as? NSNumber)?.intValue == 1 else {
            throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "unsupported helper protocol version")
        }
        let command = try RequestField.text(request["command"], "command")
        switch command {
        case "health":
            return [
                "helperVersion": helperVersion,
                "accessibility": Permissions.accessibility(),
                "screenRecording": Permissions.screenRecording(),
            ]
        case "list-apps":
            return try AppCatalog.running().map { app -> [String: Any] in
                var json = try AppCatalog.summary(of: app)
                json["frontmost"] = app.isActive
                json["accessibility"] = Permissions.accessibility()
                json["screenRecording"] = Permissions.screenRecording()
                return json
            }
        case "resolve-app":
            return try AppCatalog.summary(of: AppCatalog.resolve(try RequestField.object(request["selector"], "selector")))
        case "open-settings":
            let kind = try RequestField.text(request["kind"], "kind")
            let target: String
            switch kind {
            case "accessibility":
                target = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
            case "screen-recording":
                target = "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
            default:
                throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "unknown permission Settings pane")
            }
            guard let url = URL(string: target), NSWorkspace.shared.open(url) else {
                throw HelperFault.of("COMPUTER_ACTION_BLOCKED", "macOS Settings could not be opened")
            }
            return NSNull()
        case "observe":
            let appIdentity = try RequestField.object(request["app"], "app")
            let app = try AppCatalog.resolve([
                "bundleId": try RequestField.text(appIdentity["bundleId"], "app.bundleId"),
                "pid": try RequestField.integer(appIdentity["pid"], "app.pid"),
            ])
            let options = try RequestField.object(request["options"], "options")
            let snapshot = try observeSnapshot(app: app, limits: options)
            let mode = options["screenshot"] as? String ?? "optional"
            var screenshot: [String: Any]?
            if mode != "none" {
                let path = try RequestField.text(options["screenshotPath"], "options.screenshotPath")
                screenshot = try await ScreenCapture.capture(snapshot, path: path, required: mode == "required")
            }
            return SceneProjection.render(snapshot, screenshot: screenshot)
        case "activate-for-cursor":
            let appIdentity = try RequestField.object(request["app"], "app")
            let app = try AppCatalog.resolve([
                "bundleId": try RequestField.text(appIdentity["bundleId"], "app.bundleId"),
                "pid": try RequestField.integer(appIdentity["pid"], "app.pid"),
            ])
            let options = try RequestField.object(request["options"], "options")
            let snapshot = try observeSnapshot(app: app, limits: options)
            let expected = try RequestField.text(request["expectedStateHash"], "expectedStateHash")
            guard snapshot.stateHash == expected else {
                throw HelperFault.of("COMPUTER_STALE_OBSERVATION", "the application UI changed before foreground activation")
            }
            if app.isActive {
                return ["observation": SceneProjection.render(snapshot, screenshot: nil), "activation": "already-frontmost"]
            }
            let actionTimeoutMs = try RequestField.integer(request["actionTimeoutMs"], "actionTimeoutMs")
            guard actionTimeoutMs >= 1_000 && actionTimeoutMs <= 120_000 else {
                throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "actionTimeoutMs must be between 1000 and 120000")
            }
            try activate(app, timeoutMs: actionTimeoutMs)
            let refreshed = try observeSnapshot(app: app, limits: options)
            guard activationStateMatches(snapshot, current: refreshed) else {
                throw HelperFault.of("COMPUTER_STALE_OBSERVATION", "the application UI changed while the target application was activated")
            }
            return ["observation": SceneProjection.render(refreshed, screenshot: nil), "activation": "activated"]
        case "act":
            return try runAct(
                try RequestField.object(request["request"], "request"),
                dragStartBarrier: dragStartBarrier
            )
        default:
            throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "unknown helper command")
        }
    }
}

/// Executes one action against the selected application. The order is fixed:
/// resolve the app, observe, resolve the target element, validate staleness,
/// then dispatch on the action kind — some kinds re-observe once more after an
/// explicit activation.
private func runAct(
    _ request: [String: Any],
    dragStartBarrier: (() throws -> Void)? = nil
) throws -> [String: Any] {
    let appIdentity = try RequestField.object(request["app"], "request.app")
    let selector: [String: Any] = [
        "bundleId": try RequestField.text(appIdentity["bundleId"], "app.bundleId"),
        "pid": try RequestField.integer(appIdentity["pid"], "app.pid"),
    ]
    let app = try AppCatalog.resolve(selector)
    let limits = try RequestField.object(request["limits"], "request.limits")
    let snapshot = try observeSnapshot(app: app, limits: limits)
    let action = try RequestField.object(request["action"], "request.action")
    let kind = try RequestField.text(action["kind"], "action.kind")
    let actionTimeoutMs = try RequestField.integer(request["actionTimeoutMs"], "request.actionTimeoutMs")
    guard actionTimeoutMs >= 1_000 && actionTimeoutMs <= 120_000 else {
        throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "request.actionTimeoutMs must be between 1000 and 120000")
    }
    let interaction = try RequestField.object(request["interaction"], "request.interaction")
    let focusPolicy = try RequestField.choice(of: interaction, "focusPolicy", ["preserve", "activate"])
    let keyboardPolicy = try RequestField.choice(of: interaction, "keyboardPolicy", ["preserve", "activate"])
    let pointerInputPolicy = try RequestField.choice(of: interaction, "pointerInputPolicy", ["deny", "targeted"])
    let record = try validateTarget(request, snapshot: snapshot)

    switch kind {
    case "click":
        // Modifiers cannot be expressed through an Accessibility press, so a
        // modified click always resolves to real target-process pointer input.
        let clickModifiers = action["modifiers"] as? [String] ?? []
        let clickFlags = try ModifierFlags.combine(clickModifiers)
        if clickFlags.isEmpty, let record, pressWithDescendantFallback(record.element) {
            return actionResult(channel: "accessibility", activation: "not-requested", pointerInput: false)
        }
        let elementFallback = record != nil && RequestField.flag(action["allowCoordinateFallback"])
        let coordinateFallback = action["x"] != nil && action["y"] != nil
        guard elementFallback || coordinateFallback else {
            throw HelperFault.of(
                "COMPUTER_ELEMENT_UNAVAILABLE",
                clickFlags.isEmpty
                    ? "element does not support an actionable AXPress and coordinate fallback was not requested"
                    : "modifiers need real pointer input, but this click has no coordinate fallback; pass allowCoordinateFallback=true or an explicit x/y"
            )
        }
        try requireTargetedPointerInput(pointerInputPolicy)
        let current = try inputContext(ActionContextRequest(
            app: app, request: request, limits: limits, snapshot: snapshot, record: record,
            focusPolicy: focusPolicy, keyboardPolicy: keyboardPolicy, actionKind: kind, timeoutMs: actionTimeoutMs,
        ))
        if let record = current.record, elementFallback, let frame = AXProbe.frame(record.element) {
            let point = CGPoint(x: frame.midX, y: frame.midY)
            let target = try pointerTarget(app: app, window: current.snapshot.windowJSON, at: point)
            try pointerAction {
                try targetedClick(
                    at: point,
                    button: try InputRouter.button(action["button"] as? String),
                    count: min(max((action["clickCount"] as? NSNumber)?.intValue ?? 1, 1), 3),
                    target: target,
                    eventFlags: clickFlags
                )
            }
            return actionResult(channel: "coordinates", activation: current.activation, pointerInput: true, pointerRouting: "target-process")
        }
        if action["x"] != nil, action["y"] != nil {
            let coordinateSpace = action["coordinateSpace"] as? String ?? "window"
            let point = try WindowProbe.screenPoint(action, window: current.snapshot.windowJSON, xKey: "x", yKey: "y", coordinateSpace: coordinateSpace)
            let target = try pointerTarget(app: app, window: current.snapshot.windowJSON, at: point)
            try pointerAction {
                try targetedClick(
                    at: point,
                    button: try InputRouter.button(action["button"] as? String),
                    count: min(max((action["clickCount"] as? NSNumber)?.intValue ?? 1, 1), 3),
                    target: target,
                    eventFlags: clickFlags
                )
            }
            return actionResult(channel: "coordinates", activation: current.activation, pointerInput: true, pointerRouting: "target-process")
        }
        throw HelperFault.of("COMPUTER_ELEMENT_UNAVAILABLE", "coordinate fallback was requested but no current target coordinates were available")
    case "set-value":
        guard let record else { throw HelperFault.of("COMPUTER_ELEMENT_UNAVAILABLE", "set-value requires an observed element") }
        let value = try RequestField.textAllowingEmpty(action["value"], "action.value")
        let result = AXUIElementSetAttributeValue(record.element, kAXValueAttribute as CFString, value as CFTypeRef)
        guard result == .success else {
            throw HelperFault.of(
                "COMPUTER_ACTION_BLOCKED",
                "Accessibility value assignment was rejected: this element does not accept an AXValue; focus the control and use computer_type_text, or use computer_press_key for a key-driven change"
            )
        }
        return actionResult(channel: "accessibility", activation: "not-requested", pointerInput: false)
    case "type-text":
        let text = try RequestField.text(action["text"], "action.text")
        if InputRouter.setSelectedText(text, app: app) {
            return actionResult(channel: "accessibility", activation: "not-requested", pointerInput: false)
        }
        let current = try inputContext(ActionContextRequest(
            app: app, request: request, limits: limits, snapshot: snapshot, record: record,
            focusPolicy: focusPolicy, keyboardPolicy: keyboardPolicy, actionKind: kind, timeoutMs: actionTimeoutMs,
        ))
        if current.activation == "activated", InputRouter.setSelectedText(text, app: app) {
            return actionResult(channel: "accessibility", activation: current.activation, pointerInput: false)
        }
        try InputRouter.typeText(text, app: app)
        return actionResult(channel: "keyboard", activation: current.activation, pointerInput: false)
    case "press-key":
        let current = try inputContext(ActionContextRequest(
            app: app, request: request, limits: limits, snapshot: snapshot, record: record,
            focusPolicy: focusPolicy, keyboardPolicy: keyboardPolicy, actionKind: kind, timeoutMs: actionTimeoutMs,
        ))
        let modifiers = action["modifiers"] as? [String] ?? []
        try InputRouter.pressKey(try RequestField.text(action["key"], "action.key"), modifiers: modifiers, app: app)
        return actionResult(channel: "keyboard", activation: current.activation, pointerInput: false)
    case "scroll":
        try requireTargetedPointerInput(pointerInputPolicy)
        let current = try inputContext(ActionContextRequest(
            app: app, request: request, limits: limits, snapshot: snapshot, record: record,
            focusPolicy: focusPolicy, keyboardPolicy: keyboardPolicy, actionKind: kind, timeoutMs: actionTimeoutMs,
        ))
        let point: CGPoint
        if let record = current.record, let frame = AXProbe.frame(record.element) { point = CGPoint(x: frame.midX, y: frame.midY) }
        else {
            let coordinateSpace = action["coordinateSpace"] as? String ?? "window"
            point = try WindowProbe.screenPoint(action, window: current.snapshot.windowJSON, xKey: "x", yKey: "y", coordinateSpace: coordinateSpace)
        }
        let direction = try RequestField.text(action["direction"], "action.direction")
        let pages = min(max((action["pages"] as? NSNumber)?.intValue ?? 1, 1), 10)
        let vertical = direction == "up" ? 10 * pages : direction == "down" ? -10 * pages : 0
        let horizontal = direction == "left" ? 10 * pages : direction == "right" ? -10 * pages : 0
        guard vertical != 0 || horizontal != 0 else { throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "unsupported scroll direction") }
        let target = try pointerTarget(app: app, window: current.snapshot.windowJSON, at: point)
        try pointerAction {
            try targetedScroll(
                at: point,
                vertical: Int32(vertical),
                horizontal: Int32(horizontal),
                target: target
            )
        }
        return actionResult(channel: "coordinates", activation: current.activation, pointerInput: true, pointerRouting: "target-process")
    case "drag":
        try requireTargetedPointerInput(pointerInputPolicy)
        let current = try inputContext(ActionContextRequest(
            app: app, request: request, limits: limits, snapshot: snapshot, record: record,
            focusPolicy: focusPolicy, keyboardPolicy: keyboardPolicy, actionKind: kind, timeoutMs: actionTimeoutMs,
        ))
        let coordinateSpace = action["coordinateSpace"] as? String ?? "window"
        let from = try WindowProbe.screenPoint(action, window: current.snapshot.windowJSON, xKey: "fromX", yKey: "fromY", coordinateSpace: coordinateSpace)
        let to = try WindowProbe.screenPoint(action, window: current.snapshot.windowJSON, xKey: "toX", yKey: "toY", coordinateSpace: coordinateSpace)
        let cursorSpeed = try RequestField.decimal(interaction["cursorSpeedPxPerSecond"], "request.interaction.cursorSpeedPxPerSecond")
        let cursorAcceleration = try RequestField.decimal(
            interaction["cursorAccelerationPxPerSecondSquared"],
            "request.interaction.cursorAccelerationPxPerSecondSquared"
        )
        guard cursorSpeed.isFinite, cursorSpeed >= 100, cursorSpeed <= 50_000,
              cursorAcceleration.isFinite, cursorAcceleration >= 100, cursorAcceleration <= 500_000 else {
            throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "request.interaction cursor motion is outside the supported range")
        }
        let target = try pointerTarget(app: app, window: current.snapshot.windowJSON, at: from)
        let dragFlags = try ModifierFlags.combine(action["modifiers"] as? [String] ?? [])
        try dragStartBarrier?()
        try pointerAction {
            try targetedDrag(
                from: from, to: to, target: target,
                speedPxPerSecond: cursorSpeed, accelerationPxPerSecondSquared: cursorAcceleration,
                eventFlags: dragFlags
            )
        }
        return actionResult(channel: "coordinates", activation: current.activation, pointerInput: true, pointerRouting: "target-process")
    case "perform-action":
        guard let record else { throw HelperFault.of("COMPUTER_ELEMENT_UNAVAILABLE", "perform-action requires an observed element") }
        let actionName = try RequestField.text(action["action"], "action.action")
        let available = record.json["actions"] as? [String] ?? []
        guard available.contains(actionName) else { throw HelperFault.of("COMPUTER_ELEMENT_UNAVAILABLE", "the element did not advertise the requested Accessibility action") }
        if requiresForegroundPermission(actionName), focusPolicy != "activate" {
            throw HelperFault.of("COMPUTER_ACTION_BLOCKED", "the requested Accessibility action may raise the target window, but interaction.focusPolicy is preserve")
        }
        let current = requiresForegroundPermission(actionName)
            ? try inputContext(ActionContextRequest(
                app: app, request: request, limits: limits, snapshot: snapshot, record: record,
                focusPolicy: focusPolicy, keyboardPolicy: keyboardPolicy, actionKind: kind, timeoutMs: actionTimeoutMs
            ))
            : (snapshot, record, "not-requested")
        guard let currentRecord = current.record else {
            throw HelperFault.of("COMPUTER_ELEMENT_UNAVAILABLE", "perform-action target is unavailable after foreground validation")
        }
        let result = AXUIElementPerformAction(currentRecord.element, actionName as CFString)
        guard result == .success else { throw HelperFault.of("COMPUTER_ACTION_BLOCKED", "Accessibility action was rejected") }
        return actionResult(channel: "accessibility", activation: current.activation, pointerInput: false)
    default:
        throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "unsupported action kind")
    }
}

/// Only an action that raises a window needs the target application in front,
/// so the act path asks this before accepting a foreground-free policy.
private func requiresForegroundPermission(_ action: String) -> Bool {
    action == (kAXRaiseAction as String)
}

/// Re-observes the target after an explicit activation and revalidates the
/// element the caller named. Keyboard actions deliberately relax the element
/// check: activation may move focus to the app's default control, so full
/// pre-activation state equality would only make reliable keyboard input fail.
private struct ActionContextRequest {
    let app: NSRunningApplication
    let request: [String: Any]
    let limits: [String: Any]
    let snapshot: ObservedScene
    let record: SceneElement?
    let focusPolicy: String
    let keyboardPolicy: String
    let actionKind: String
    let timeoutMs: Int
}

private func inputContext(_ input: ActionContextRequest) throws -> (snapshot: ObservedScene, record: SceneElement?, activation: String) {
    let app = input.app
    let request = input.request
    let limits = input.limits
    let snapshot = input.snapshot
    let record = input.record
    let focusPolicy = input.focusPolicy
    let keyboardPolicy = input.keyboardPolicy
    let actionKind = input.actionKind
    let timeoutMs = input.timeoutMs
    let keyboardAction = actionKind == "type-text" || actionKind == "press-key"
    let effectiveFocusPolicy = keyboardAction && keyboardPolicy == "activate" ? "activate" : focusPolicy
    guard effectiveFocusPolicy == "activate" else {
        return (snapshot, record, "not-requested")
    }
    if app.isActive {
        return (snapshot, record, "already-frontmost")
    }
    try activate(app, timeoutMs: timeoutMs)
    let refreshed = try observeSnapshot(app: app, limits: limits)
    let refreshedRecord: SceneElement?
    if request["element"] != nil {
        refreshedRecord = try validateTarget(request, snapshot: refreshed)
    } else if keyboardAction {
        // Activation may move focus to the app's default control; typing targets
        // the refreshed focused element. The app identity is already revalidated
        // by the fresh observation, so full pre-activation state equality would
        // only make reliable keyboard input fail.
        refreshedRecord = nil
    } else {
        guard activationStateMatches(snapshot, current: refreshed) else {
            throw HelperFault.of("COMPUTER_STALE_OBSERVATION", "the application UI changed while the target application was activated")
        }
        refreshedRecord = nil
    }
    return (refreshed, refreshedRecord, "activated")
}

/// How the action actually reached the target: which input channel carried it,
/// whether the app had to be activated first, and whether real pointer events
/// were posted to the target process.
private func actionResult(
    channel: String,
    activation: String,
    pointerInput: Bool,
    pointerRouting: String = "none"
) -> [String: Any] {
    [
        "channel": channel,
        "activation": activation,
        "pointerInput": pointerInput,
        "pointerRouting": pointerRouting,
    ]
}

/// Resolves the on-screen window that owns a screen coordinate. The CoreGraphics
/// list is ordered front to back, so the first match is the topmost window of the
/// selected application at that point.
private func windowAtPoint(app: NSRunningApplication, point: CGPoint) throws -> (windowNumber: Int64, frame: CGRect) {
    guard let windows = CGWindowListCopyWindowInfo(
        [.optionOnScreenOnly, .excludeDesktopElements],
        kCGNullWindowID
    ) as? [[String: Any]] else {
        throw HelperFault.of("COMPUTER_TARGET_UNAVAILABLE", "CoreGraphics window list is unavailable")
    }
    // The CoreGraphics window list runs front to back, so the first candidate
    // that matches is the topmost window of the selected app under the point.
    guard let window = windows.first(where: { candidate in
        guard (candidate[kCGWindowOwnerPID as String] as? NSNumber)?.int32Value == app.processIdentifier,
              (candidate[kCGWindowLayer as String] as? NSNumber)?.intValue == 0,
              let bounds = candidate[kCGWindowBounds as String] as? [String: Any],
              let frame = CGRect(dictionaryRepresentation: bounds as CFDictionary),
              frame.contains(point) else { return false }
        return true
    }),
    let windowNumber = (window[kCGWindowNumber as String] as? NSNumber)?.int64Value,
    let bounds = window[kCGWindowBounds as String] as? [String: Any],
    let frame = CGRect(dictionaryRepresentation: bounds as CFDictionary) else {
        throw HelperFault.of("COMPUTER_TARGET_UNAVAILABLE", "no on-screen window of the selected app contains the requested coordinate")
    }
    return (windowNumber, frame)
}

/// Picks the window a pointer event should be bound to: the observed window when
/// the point is still inside it, otherwise whatever window sits under the point.
private func pointerTarget(app: NSRunningApplication, window: [String: Any]?, at point: CGPoint) throws -> TargetedPointerTarget {
    if let windowNumber = (window?["id"] as? NSNumber)?.int64Value,
       let frame = window?["frame"] as? [String: Any],
       let windowFrame = try? WindowProbe.cgRect(frame),
       windowFrame.contains(point) {
        return TargetedPointerTarget(pid: app.processIdentifier, windowNumber: windowNumber, windowFrame: windowFrame)
    }
    let resolved = try windowAtPoint(app: app, point: point)
    return TargetedPointerTarget(pid: app.processIdentifier, windowNumber: resolved.windowNumber, windowFrame: resolved.frame)
}

/// Translates the pointer module's failures into the command-level fault the
/// protocol expects.
private func pointerAction(_ body: () throws -> Void) throws {
    do {
        try body()
    } catch let error as TargetedPointerError {
        throw HelperFault.of("COMPUTER_ACTION_BLOCKED", error.message)
    }
}

/// Accessibility press with a bounded descendant search. Only descend when the
/// selected element advertised AXPress; otherwise the element/coordinate
/// fallback below owns the click decision.
private func pressWithDescendantFallback(_ element: AXUIElement) -> Bool {
    guard axActions(element).contains(kAXPressAction as String) else { return false }
    var visited = Set<CFHashCode>()
    return pressRecursive(element, remainingDepth: 4, visited: &visited)
}

private func pressRecursive(_ element: AXUIElement, remainingDepth: Int, visited: inout Set<CFHashCode>) -> Bool {
    guard remainingDepth >= 0 else { return false }
    let identity = CFHash(element)
    guard visited.insert(identity).inserted else { return false }
    if axActions(element).contains(kAXPressAction as String),
       AXUIElementPerformAction(element, kAXPressAction as CFString) == .success {
        return true
    }
    for child in AXProbe.children(element) {
        if pressRecursive(child, remainingDepth: remainingDepth - 1, visited: &visited) { return true }
    }
    return false
}
