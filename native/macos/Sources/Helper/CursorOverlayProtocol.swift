import CoreGraphics
import Foundation

/// A command from stdin that failed validation.
private struct OverlayCommandError: Error {
    let message: String
}

/// One decoded overlay command.
///
/// Every key read here and every bound checked here is wire protocol: the
/// TypeScript half writes these objects and shows the resulting error text to
/// the caller.
private struct OverlayCommand {
    let operation: String
    let point: CGPoint?
    let durationMs: Int?
    let speedPxPerSecond: Double?
    let accelerationPxPerSecondSquared: Double?
    let autoHideMs: Int
    let targetPid: pid_t?
    let targetWindowNumber: Int64?
    let targetWindowFrame: CGRect?
    let sustainedPress: Bool

    /// Ceilings that keep a malformed or hostile command from parking the panel
    /// somewhere absurd or animating for an unbounded time.
    private enum Limit {
        static let coordinate = 100_000.0
        static let durationMs = 2_000
        static let speed = 50_000.0
        static let acceleration = 500_000.0
        static let autoHideMs = 30_000
    }

    private static func number(_ object: Any?, key: String) throws -> NSNumber? {
        guard let object else { return nil }
        guard let value = object as? NSNumber,
              CFGetTypeID(value) != CFBooleanGetTypeID() else {
            throw OverlayCommandError(message: "cursor overlay \(key) must be numeric")
        }
        return value
    }

    private static func integer(_ object: Any?, key: String, fallback: Int) throws -> Int {
        guard let value = try number(object, key: key) else { return fallback }
        let doubleValue = value.doubleValue
        guard doubleValue.isFinite, doubleValue.rounded(.towardZero) == doubleValue,
              doubleValue >= Double(Int.min), doubleValue <= Double(Int.max) else {
            throw OverlayCommandError(message: "cursor overlay \(key) must be an integer")
        }
        return Int(doubleValue)
    }

    /// Absent means "not supplied"; present-but-unusable is an error rather than
    /// a silent fallback.
    private static func optionalInteger(_ object: [String: Any], key: String, fallback: Int) throws -> Int? {
        guard object[key] != nil else { return nil }
        return try integer(object[key], key: key, fallback: fallback)
    }

    private static func point(in object: [String: Any]) throws -> CGPoint? {
        let x = try number(object["x"], key: "x")
        let y = try number(object["y"], key: "y")
        guard let x, let y else { return nil }
        let xValue = x.doubleValue
        let yValue = y.doubleValue
        guard xValue.isFinite, yValue.isFinite,
              abs(xValue) <= Limit.coordinate,
              abs(yValue) <= Limit.coordinate else {
            throw OverlayCommandError(message: "cursor overlay coordinates are outside the supported range")
        }
        return CGPoint(x: xValue, y: yValue)
    }

    /// Speed and acceleration travel as a pair: one without the other cannot
    /// describe a trapezoidal glide, so a half-specified pair is rejected instead
    /// of being guessed at.
    private static func motion(in object: [String: Any]) throws -> (speed: Double?, acceleration: Double?) {
        let speed = try number(object["speedPxPerSecond"], key: "speedPxPerSecond")?.doubleValue
        let acceleration = try number(
            object["accelerationPxPerSecondSquared"],
            key: "accelerationPxPerSecondSquared"
        )?.doubleValue
        guard (speed == nil) == (acceleration == nil) else {
            throw OverlayCommandError(message: "cursor overlay speed and acceleration must be provided together")
        }
        guard speed == nil || (speed!.isFinite && speed! >= 100 && speed! <= Limit.speed),
              acceleration == nil || (acceleration!.isFinite && acceleration! >= 100
                && acceleration! <= Limit.acceleration) else {
            throw OverlayCommandError(message: "cursor overlay physical motion is outside the supported range")
        }
        return (speed, acceleration)
    }

    private static func targetPid(in object: [String: Any]) throws -> pid_t? {
        guard let rawPid = try number(object["targetPid"], key: "targetPid") else { return nil }
        let pidValue = rawPid.doubleValue
        guard pidValue.isFinite, pidValue.rounded(.towardZero) == pidValue,
              pidValue > 0, pidValue <= Double(Int32.max) else {
            throw OverlayCommandError(message: "cursor overlay targetPid is invalid")
        }
        return pid_t(pidValue)
    }

    private static func targetWindowNumber(in object: [String: Any]) throws -> Int64? {
        guard let rawWindowNumber = try number(object["targetWindowNumber"], key: "targetWindowNumber") else { return nil }
        let windowValue = rawWindowNumber.doubleValue
        guard windowValue.isFinite, windowValue.rounded(.towardZero) == windowValue,
              windowValue > 0, windowValue <= Double(Int64.max) else {
            throw OverlayCommandError(message: "cursor overlay targetWindowNumber is invalid")
        }
        return Int64(windowValue)
    }

    private static func targetWindowFrame(in object: [String: Any]) throws -> CGRect? {
        // A frame that is not an object at all is treated as absent; an object
        // that is missing edges, or describes an empty rectangle, is rejected.
        guard let frame = object["targetWindowFrame"] as? [String: Any] else { return nil }
        guard let x = try number(frame["x"], key: "targetWindowFrame.x"),
              let y = try number(frame["y"], key: "targetWindowFrame.y"),
              let width = try number(frame["width"], key: "targetWindowFrame.width"),
              let height = try number(frame["height"], key: "targetWindowFrame.height") else {
            throw OverlayCommandError(message: "cursor overlay targetWindowFrame is incomplete")
        }
        let values = [x.doubleValue, y.doubleValue, width.doubleValue, height.doubleValue]
        guard values.allSatisfy(\.isFinite), width.doubleValue > 0, height.doubleValue > 0,
              values.allSatisfy({ abs($0) <= Limit.coordinate }) else {
            throw OverlayCommandError(message: "cursor overlay targetWindowFrame is invalid")
        }
        return CGRect(
            x: x.doubleValue,
            y: y.doubleValue,
            width: width.doubleValue,
            height: height.doubleValue
        )
    }

    private static func sustainedPress(in object: [String: Any]) throws -> Bool {
        guard let raw = object["sustainedPress"] else { return false }
        guard let value = raw as? Bool else {
            throw OverlayCommandError(message: "cursor overlay sustainedPress must be boolean")
        }
        return value
    }

    init(_ object: [String: Any]) throws {
        guard let operation = object["op"] as? String else {
            throw OverlayCommandError(message: "cursor overlay command is missing op")
        }
        self.operation = operation
        self.point = try Self.point(in: object)
        let durationMs = try Self.optionalInteger(object, key: "durationMs", fallback: 180)
        let autoHideMs = try Self.integer(object["autoHideMs"], key: "autoHideMs", fallback: 0)
        guard durationMs == nil || (durationMs! >= 0 && durationMs! <= Limit.durationMs),
              autoHideMs >= 0, autoHideMs <= Limit.autoHideMs else {
            throw OverlayCommandError(message: "cursor overlay timing is outside the supported range")
        }
        self.durationMs = durationMs
        self.autoHideMs = autoHideMs
        let motion = try Self.motion(in: object)
        self.speedPxPerSecond = motion.speed
        self.accelerationPxPerSecondSquared = motion.acceleration
        self.targetPid = try Self.targetPid(in: object)
        self.targetWindowNumber = try Self.targetWindowNumber(in: object)
        self.targetWindowFrame = try Self.targetWindowFrame(in: object)
        self.sustainedPress = try Self.sustainedPress(in: object)
    }
}

/// Runs overlay commands one at a time, in arrival order.
///
/// Ordering matters because every command mutates the same panel: a move that
/// ran concurrently with a press could land after the press and drag the click
/// feedback to the wrong place. The runtime only stops once the command that
/// asked for `stop` has finished its work.
@MainActor
final class OverlayCommandQueue {
    private let controller: CursorOverlayController
    private var pending: [[String: Any]] = []
    private var isDraining = false
    private var inputClosed = false
    private var stopped = false

    init(controller: CursorOverlayController) {
        self.controller = controller
    }

    func accept(_ object: [String: Any]) {
        guard !inputClosed, !stopped else { return }
        pending.append(object)
        if object["op"] as? String == "stop", isDraining {
            controller.hide()
        }
        drain()
    }

    /// stdin closed. A `stop` still in flight keeps the process alive so its
    /// response can be written; anything else means the parent is gone and the
    /// overlay has no reason to linger.
    func finishInput() {
        guard !inputClosed, !stopped else { return }
        inputClosed = true
        if pending.contains(where: { $0["op"] as? String == "stop" }) {
            if isDraining { controller.hide() }
            drain()
        } else {
            stopped = true
            pending.removeAll()
            controller.stop()
        }
    }

    /// The command stream itself was unusable (oversized line, invalid JSON).
    /// Report it and shut down rather than pretending the stream is healthy.
    func reject(_ message: String) {
        guard !stopped else { return }
        inputClosed = true
        stopped = true
        pending.removeAll()
        controller.hide()
        writeCursorResponse(["ok": false, "error": message])
        controller.stop()
    }

    private func drain() {
        guard !stopped, !isDraining, !pending.isEmpty else { return }
        isDraining = true
        let command = pending.removeFirst()
        let finishesRun = command["op"] as? String == "stop"
        dispatchOverlayCommand(command, controller: controller) { [weak self] in
            guard let self else { return }
            self.isDraining = false
            if finishesRun {
                self.stopped = true
                self.pending.removeAll()
                return
            }
            DispatchQueue.main.async { [weak self] in self?.drain() }
        }
    }
}

/// Turns the stdin byte stream into newline-delimited JSON objects.
///
/// The readability handler fires on an arbitrary queue, so the buffer is only
/// ever touched from the private serial queue below; the callbacks hop back to
/// the main actor through `DispatchQueue.main` in the runtime.
final class OverlayLineReader: @unchecked Sendable {
    /// One command may not exceed this; the limit exists so a parent that never
    /// writes a newline cannot grow the buffer without bound.
    private static let maximumLineBytes = 16 * 1024
    private let queue = DispatchQueue(label: "dsh-computer-use.cursor-protocol")
    private let onObject: @Sendable ([String: Any]) -> Void
    private let onEnd: @Sendable () -> Void
    private let onInvalid: @Sendable (String) -> Void
    private var buffer = Data()
    private var ended = false

    init(
        onObject: @escaping @Sendable ([String: Any]) -> Void,
        onEnd: @escaping @Sendable () -> Void,
        onInvalid: @escaping @Sendable (String) -> Void
    ) {
        self.onObject = onObject
        self.onEnd = onEnd
        self.onInvalid = onInvalid
    }

    func consume(_ data: Data) {
        queue.async { [self] in
            guard !ended, !data.isEmpty else {
                guard !ended else { return }
                ended = true
                onEnd()
                return
            }
            buffer.append(data)
            if buffer.count > Self.maximumLineBytes, buffer.firstIndex(of: 0x0a) == nil {
                ended = true
                buffer.removeAll()
                onInvalid("cursor overlay command exceeded the protocol limit")
                return
            }
            while let newline = buffer.firstIndex(of: 0x0a) {
                let line = buffer[..<newline]
                buffer.removeSubrange(...newline)
                if line.count > Self.maximumLineBytes {
                    ended = true
                    onInvalid("cursor overlay command exceeded the protocol limit")
                    return
                }
                guard !line.isEmpty else { continue }
                guard let object = try? JSONSerialization.jsonObject(with: Data(line)) as? [String: Any] else {
                    ended = true
                    onInvalid("cursor overlay command is not valid JSON")
                    return
                }
                onObject(object)
            }
        }
    }
}

/// Executes one command and always calls `completion`, so the queue advances
/// even when the command was rejected.
@MainActor
private func dispatchOverlayCommand(
    _ object: [String: Any],
    controller: CursorOverlayController,
    completion: @escaping () -> Void
) {
    do {
        let command = try OverlayCommand(object)
        // Whether the panel is actually on screen once the command is done. A
        // hidden overlay still leaves native input working, so invisibility is
        // not an error -- but the caller has to hear about it, or the user
        // silently loses sight of where the agent is acting.
        var visible = true
        var reasonCode: String?
        switch command.operation {
        case "show", "move":
            guard let point = command.point else {
                throw OverlayCommandError(message: "cursor overlay command needs x and y")
            }
            controller.show(
                at: point,
                durationMs: command.durationMs,
                speedPxPerSecond: command.speedPxPerSecond,
                accelerationPxPerSecondSquared: command.accelerationPxPerSecondSquared,
                autoHideMs: command.autoHideMs,
                targetPid: command.targetPid,
                targetWindowNumber: command.targetWindowNumber,
                targetWindowFrame: command.targetWindowFrame
            ) { outcome in
                let shown = outcome == .ok
                var response: [String: Any] = ["ok": true, "op": command.operation, "visible": shown]
                if !shown {
                    response["reasonCode"] = placementReasonCode(outcome)
                    response["reason"] = placementMessage(outcome)
                }
                writeCursorResponse(response)
                completion()
            }
            return
        case "press":
            let outcome = controller.validateBinding(
                pid: command.targetPid,
                windowNumber: command.targetWindowNumber,
                expectedFrame: command.targetWindowFrame
            )
            visible = outcome == .ok
            reasonCode = placementReasonCode(outcome)
            controller.press(autoHideMs: command.autoHideMs, sustained: command.sustainedPress)
        case "release":
            let outcome = controller.validateBinding(
                pid: command.targetPid,
                windowNumber: command.targetWindowNumber,
                expectedFrame: command.targetWindowFrame
            )
            visible = outcome == .ok
            reasonCode = placementReasonCode(outcome)
            controller.release(autoHideMs: command.autoHideMs)
        case "validate":
            let outcome = controller.validateBinding(
                pid: command.targetPid,
                windowNumber: command.targetWindowNumber,
                expectedFrame: command.targetWindowFrame
            )
            visible = outcome == .ok
            reasonCode = placementReasonCode(outcome)
        case "hide":
            controller.hide()
            visible = false
        case "stop":
            controller.stop()
            visible = false
        case "ping":
            visible = controller.isVisible
        default:
            throw OverlayCommandError(message: "unknown cursor overlay operation")
        }
        var response: [String: Any] = ["ok": true, "op": command.operation, "visible": visible]
        if !visible && (command.operation == "show" || command.operation == "move"
            || command.operation == "press" || command.operation == "release"
            || command.operation == "validate") {
            response["reasonCode"] = reasonCode
            response["reason"] = reasonCode == "target-not-frontmost"
                ? "the bound target application is not frontmost; the agent cursor is hidden"
                : "the bound target window no longer matches; the agent cursor is hidden"
        }
        writeCursorResponse(response)
        completion()
    } catch let error as OverlayCommandError {
        writeCursorResponse(["ok": false, "error": error.message])
        completion()
    } catch {
        writeCursorResponse(["ok": false, "error": String(describing: error)])
        completion()
    }
}

/// The machine-readable half of a placement report; the TypeScript client
/// forwards these codes verbatim.
private func placementReasonCode(_ outcome: CursorOverlayController.BindingOutcome) -> String? {
    switch outcome {
    case .ok: return nil
    case .notFrontmost: return "target-not-frontmost"
    case .windowMismatch: return "target-invalid"
    }
}

/// The human-readable half of a placement report.
private func placementMessage(_ outcome: CursorOverlayController.BindingOutcome) -> String? {
    switch outcome {
    case .ok: return nil
    case .notFrontmost: return "the bound target application is not frontmost; the agent cursor is hidden"
    case .windowMismatch: return "the bound target window no longer matches; the agent cursor is hidden"
    }
}

/// One JSON object per line on stdout, keys sorted so the stream is stable.
func writeCursorResponse(_ payload: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys]) else { return }
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
}
