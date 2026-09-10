import CoreGraphics
import Darwin
import Foundation

/// Raised when a gesture cannot be handed to the target process. The message is
/// forwarded verbatim to the caller's fault channel.
struct TargetedPointerError: Error {
    let message: String
}

/// Everything a gesture needs to be addressed: the receiving process, the
/// window inside it, and that window's frame so a screen coordinate can be
/// rewritten into the window's own space.
struct TargetedPointerTarget {
    let pid: pid_t
    let windowNumber: Int64
    let windowFrame: CGRect

    func localPoint(for screenPoint: CGPoint) -> CGPoint {
        let origin = windowFrame.origin
        return CGPoint(
            x: screenPoint.x - origin.x,
            y: screenPoint.y - origin.y
        )
    }
}

private typealias PostToPidFunction = @convention(c) (pid_t, UnsafeMutableRawPointer?) -> Void
private typealias SetIntegerFieldFunction = @convention(c) (UnsafeMutableRawPointer?, UInt32, Int64) -> Void
private typealias SetWindowLocationFunction = @convention(c) (UnsafeMutableRawPointer?, Double, Double) -> Void

/// The per-event fields the bridge stamps before an event leaves for the target
/// process. Grouping them turns the call sites from eight arguments into one.
private struct PointerEventStamp {
    let clickState: Int64
    let buttonNumber: Int64
    let subtype: Int64
    let gesturePhase: Int64
    let clickGroup: Int64

    /// The SPI's integer field vocabulary in stamping order: the gesture fields
    /// first, then the process and window routing fields.
    func integerFields(pid: pid_t, windowNumber: Int64) -> [(UInt32, Int64)] {
        [
            (0, gesturePhase),
            (1, clickState),
            (3, buttonNumber),
            (7, subtype),
            (40, Int64(pid)),
            (51, windowNumber),
            (58, clickGroup),
            (91, windowNumber),
            (92, windowNumber),
        ]
    }
}

/// Micro-pauses between the events of one gesture. They are what makes the
/// injected input read as a hand rather than a single instantaneous burst.
private enum PointerPacing {
    static let approach: UInt32 = 12_000
    static let press: UInt32 = 28_000
    static let repeatClick: UInt32 = 80_000
    static let dragSettle: UInt32 = 2_000
    static let dragFrame: UInt32 = 8_333
}

/// Lazy bridge to the private framework entry points that deliver a synthetic
/// event to one process instead of the system-wide HID stream. Resolution is
/// best effort: where a symbol is missing `isAvailable` stays false and every
/// gesture fails closed.
private final class SkyLightPointerBridge {
    static let shared = SkyLightPointerBridge()

    private static let framework = "/System/Library/PrivateFrameworks/SkyLight.framework/SkyLight"

    private let handle: UnsafeMutableRawPointer?
    private let postToPid: PostToPidFunction?
    private let setIntegerField: SetIntegerFieldFunction?
    private let setWindowLocation: SetWindowLocationFunction?

    private init() {
        handle = dlopen(Self.framework, RTLD_LAZY | RTLD_GLOBAL)
        postToPid = Self.resolve(handle, "SLEventPostToPid", as: PostToPidFunction.self)
        setIntegerField = Self.resolve(handle, "SLEventSetIntegerValueField", as: SetIntegerFieldFunction.self)
        setWindowLocation = Self.resolve(handle, "CGEventSetWindowLocation", as: SetWindowLocationFunction.self)
    }

    deinit {
        guard let handle else { return }
        dlclose(handle)
    }

    private static func resolve<T>(_ library: UnsafeMutableRawPointer?, _ symbolName: String, as type: T.Type) -> T? {
        guard let library else { return nil }
        guard let symbol = dlsym(library, symbolName) else { return nil }
        return unsafeBitCast(symbol, to: type)
    }

    /// Every gesture is refused unless all three entry points resolved.
    var isAvailable: Bool {
        let unresolved = postToPid == nil || setIntegerField == nil || setWindowLocation == nil
        return !unresolved
    }

    /// Stamps the event and hands it to the target process. The order is fixed:
    /// window-local location first, then the routing and gesture fields, and
    /// only then does the event leave.
    func post(
        _ event: CGEvent,
        target: TargetedPointerTarget,
        localPoint: CGPoint,
        stamp: PointerEventStamp
    ) throws {
        guard let postToPid, let setIntegerField, let setWindowLocation else {
            throw TargetedPointerError(message: "SkyLight target-process pointer routing is unavailable")
        }
        let pointer = Unmanaged.passUnretained(event).toOpaque()
        setWindowLocation(pointer, localPoint.x, localPoint.y)
        for (field, value) in stamp.integerFields(pid: target.pid, windowNumber: target.windowNumber) {
            setIntegerField(pointer, field, value)
        }
        postToPid(target.pid, pointer)
    }
}

/// Creates the CoreGraphics events of a gesture from one private event source.
private struct PointerEventFactory {
    let source: CGEventSource

    /// A mouse event parked at the cursor's current location; the SPI rewrites
    /// the position to the window-local point when the event is posted.
    func mouse(type: CGEventType, button: CGMouseButton) throws -> CGEvent {
        let cursor = CGEvent(source: nil)?.location ?? .zero
        guard let event = CGEvent(
            mouseEventSource: source,
            mouseType: type,
            mouseCursorPosition: cursor,
            mouseButton: button
        ) else {
            throw TargetedPointerError(message: "CoreGraphics could not create a pointer event")
        }
        return event
    }

    /// A line-based scroll event carrying both axes at once.
    func wheel(vertical: Int32, horizontal: Int32) throws -> CGEvent {
        let units: CGScrollEventUnit = .line
        guard let event = CGEvent(
            scrollWheelEvent2Source: source,
            units: units,
            wheelCount: 2,
            wheel1: vertical,
            wheel2: horizontal,
            wheel3: 0
        ) else {
            throw TargetedPointerError(message: "CoreGraphics could not create a scroll event")
        }
        event.location = CGEvent(source: nil)?.location ?? .zero
        return event
    }
}

/// One gesture aimed at one target: its own event source, the modifier flags
/// every contact event carries, and a click-group id shared by the whole
/// gesture so the receiving app can tell it apart from the next one.
private struct PointerGesture {
    let target: TargetedPointerTarget
    let factory: PointerEventFactory
    let flags: CGEventFlags
    let group: Int64

    init(target: TargetedPointerTarget, flags: CGEventFlags) throws {
        guard SkyLightPointerBridge.shared.isAvailable else {
            throw TargetedPointerError(message: "SkyLight target-process pointer routing is unavailable")
        }
        guard let source = CGEventSource(stateID: .privateState) else {
            throw TargetedPointerError(message: "CoreGraphics pointer event source is unavailable")
        }
        self.target = target
        self.factory = PointerEventFactory(source: source)
        self.flags = flags
        self.group = Int64(DispatchTime.now().uptimeNanoseconds & 0x7fff_ffff)
    }

    private func deliver(
        _ event: CGEvent,
        at point: CGPoint,
        clickState: Int64,
        buttonNumber: Int64,
        subtype: Int64,
        gesturePhase: Int64
    ) throws {
        try SkyLightPointerBridge.shared.post(
            event,
            target: target,
            localPoint: target.localPoint(for: point),
            stamp: PointerEventStamp(
                clickState: clickState,
                buttonNumber: buttonNumber,
                subtype: subtype,
                gesturePhase: gesturePhase,
                clickGroup: group
            )
        )
    }

    /// The cursor parks on the point before anything happens there.
    func approach(at point: CGPoint, subtype: Int64) throws {
        try deliver(
            try factory.mouse(type: .mouseMoved, button: .left),
            at: point,
            clickState: 0,
            buttonNumber: 0,
            subtype: subtype,
            gesturePhase: 2
        )
    }

    /// One member of a click's down/up pair.
    func clickContact(
        type: CGEventType,
        button: CGMouseButton,
        at point: CGPoint,
        pressed: Bool,
        clickState: Int64,
        buttonNumber: Int64
    ) throws {
        // Modifiers travel with the press, never as a held system key state.
        try deliver(
            contact(type: type, button: button, pressed: pressed),
            at: point,
            clickState: clickState,
            buttonNumber: buttonNumber,
            subtype: 3,
            gesturePhase: 3
        )
    }

    /// One event of the left-button drag gesture: the initial press, every
    /// intermediate move, and the closing release.
    func dragContact(type: CGEventType, at point: CGPoint, pressed: Bool) throws {
        try deliver(
            contact(type: type, button: .left, pressed: pressed),
            at: point,
            clickState: 1,
            buttonNumber: 0,
            subtype: 0,
            gesturePhase: 3
        )
    }

    func wheel(at point: CGPoint, vertical: Int32, horizontal: Int32) throws {
        try deliver(
            try factory.wheel(vertical: vertical, horizontal: horizontal),
            at: point,
            clickState: 0,
            buttonNumber: 0,
            subtype: 0,
            gesturePhase: 2
        )
    }

    /// A contact event with its pressure and modifier flags applied. The whole
    /// drag carries the modifiers, so the target app sees one continuous held
    /// gesture instead of a press that loses them on the first move.
    private func contact(type: CGEventType, button: CGMouseButton, pressed: Bool) throws -> CGEvent {
        let event = try factory.mouse(type: type, button: button)
        event.setDoubleValueField(.mouseEventPressure, value: pressed ? 1 : 0)
        event.flags = flags
        return event
    }
}

/// Normalized progress of a glide, saturated to `1`. Zero-length travel counts
/// as complete the moment it starts.
private func glideProgress(started: Double, duration: Double) -> Double {
    guard duration > 0 else { return 1 }
    return min(1, (ProcessInfo.processInfo.systemUptime - started) / duration)
}

/// The down/up event types a mouse button maps onto.
private func pressPair(for button: CGMouseButton) -> (down: CGEventType, up: CGEventType) {
    switch button {
    case .right: return (.rightMouseDown, .rightMouseUp)
    case .center: return (.otherMouseDown, .otherMouseUp)
    default: return (.leftMouseDown, .leftMouseUp)
    }
}

/// The SPI button number a CoreGraphics button maps onto.
private func buttonNumber(of button: CGMouseButton) -> Int64 {
    switch button {
    case .right: return 1
    case .center: return 2
    default: return 0
    }
}

func targetedClick(
    at point: CGPoint,
    button: CGMouseButton,
    count: Int,
    target: TargetedPointerTarget,
    eventFlags: CGEventFlags = []
) throws {
    let gesture = try PointerGesture(target: target, flags: eventFlags)
    let number = buttonNumber(of: button)
    try gesture.approach(at: point, subtype: 3)
    usleep(PointerPacing.approach)

    let pair = pressPair(for: button)
    let clicks = max(1, count)
    for click in 1...clicks {
        try gesture.clickContact(
            type: pair.down,
            button: button,
            at: point,
            pressed: true,
            clickState: Int64(click),
            buttonNumber: number
        )
        usleep(PointerPacing.press)

        try gesture.clickContact(
            type: pair.up,
            button: button,
            at: point,
            pressed: false,
            clickState: Int64(click),
            buttonNumber: number
        )
        if click < clicks { usleep(PointerPacing.repeatClick) }
    }
}

func targetedScroll(
    at point: CGPoint,
    vertical: Int32,
    horizontal: Int32,
    target: TargetedPointerTarget
) throws {
    let gesture = try PointerGesture(target: target, flags: [])
    try gesture.approach(at: point, subtype: 0)
    usleep(PointerPacing.approach)
    try gesture.wheel(at: point, vertical: vertical, horizontal: horizontal)
}

func targetedDrag(
    from: CGPoint,
    to: CGPoint,
    target: TargetedPointerTarget,
    speedPxPerSecond: Double,
    accelerationPxPerSecondSquared: Double,
    eventFlags: CGEventFlags = []
) throws {
    let gesture = try PointerGesture(target: target, flags: eventFlags)
    try gesture.approach(at: from, subtype: 0)
    usleep(PointerPacing.dragSettle)
    try gesture.dragContact(type: .leftMouseDown, at: from, pressed: true)
    usleep(PointerPacing.dragSettle)

    let distance = hypot(to.x - from.x, to.y - from.y)
    let duration = distance == 0
        ? 0
        : cursorMotionDuration(
            distance: distance,
            speed: speedPxPerSecond,
            acceleration: accelerationPxPerSecondSquared
        )
    let started = ProcessInfo.processInfo.systemUptime
    while true {
        let progress = glideProgress(started: started, duration: duration)
        let fraction = cursorMotionFraction(
            progress: progress,
            distance: distance,
            speed: speedPxPerSecond,
            acceleration: accelerationPxPerSecondSquared
        )
        let point = cursorMotionPoint(from: from, to: to, fraction: fraction)
        try gesture.dragContact(type: .leftMouseDragged, at: point, pressed: true)
        if progress >= 1 { break }
        usleep(PointerPacing.dragFrame)
    }

    try gesture.dragContact(type: .leftMouseUp, at: to, pressed: false)
}
