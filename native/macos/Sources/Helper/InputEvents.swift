import AppKit
import ApplicationServices
import CoreGraphics
import Darwin
import Foundation

/// Brings the target application to the front and waits until macOS reports it
/// active. The caller must have re-observed and revalidated the target after
/// this returns, because activation can move focus and raise windows.
func activate(_ app: NSRunningApplication, timeoutMs: Int) throws {
    _ = app.activate(options: [.activateAllWindows])
    let deadline = DispatchTime.now().uptimeNanoseconds + UInt64(timeoutMs) * 1_000_000
    while !app.isActive {
        if DispatchTime.now().uptimeNanoseconds >= deadline {
            throw HelperFault.of("COMPUTER_ACTION_BLOCKED", "the selected application did not become frontmost before the action timeout")
        }
        usleep(10_000)
    }
}

/// The documented key vocabulary mapped onto virtual key codes. Missing names
/// are rejected rather than guessed, so the wire vocabulary stays closed.
enum KeyVocabulary {
    static let codes: [String: CGKeyCode] = [
        "a": 0, "s": 1, "d": 2, "f": 3, "h": 4, "g": 5, "z": 6, "x": 7, "c": 8, "v": 9,
        "b": 11, "q": 12, "w": 13, "e": 14, "r": 15, "y": 16, "t": 17, "1": 18, "2": 19,
        "3": 20, "4": 21, "6": 22, "5": 23, "=": 24, "9": 25, "7": 26, "-": 27, "8": 28,
        "0": 29, "]": 30, "o": 31, "u": 32, "[": 33, "i": 34, "p": 35, "return": 36,
        "l": 37, "j": 38, "'": 39, "k": 40, ";": 41, "\\": 42, ",": 43, "/": 44, "n": 45,
        "m": 46, ".": 47, "tab": 48, "space": 49, "delete": 51, "escape": 53,
        "home": 115, "pageup": 116, "forwarddelete": 117, "end": 119, "pagedown": 121,
        "left": 123, "right": 124, "down": 125, "up": 126,
    ]
}

/// Modifier names → CoreGraphics event flags. Flags travel with the individual
/// event, never as a held system-wide key state.
enum ModifierFlags {
    static func combine(_ modifiers: [String]) throws -> CGEventFlags {
        var result: CGEventFlags = []
        for modifier in modifiers {
            switch modifier {
            case "command": result.insert(.maskCommand)
            case "control": result.insert(.maskControl)
            case "option": result.insert(.maskAlternate)
            case "shift": result.insert(.maskShift)
            default: throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "unsupported key modifier")
            }
        }
        return result
    }
}

/// Gate for the interaction policy: actions that need real pointer input must
/// have been granted targeted pointer routing by the host half.
func requireTargetedPointerInput(_ policy: String) throws {
    guard policy == "targeted" else {
        throw HelperFault.of("COMPUTER_ACTION_BLOCKED", "this action needs target-process pointer input, but interaction.pointerInputPolicy is deny")
    }
}

/// Every keyboard and text event the helper can post, all of them addressed to
/// the target process rather than to the system HID tap. Coordinates never
/// reach this layer: pointer gestures go through the targeted pointer module.
enum InputRouter {
    static func eventSource() throws -> CGEventSource {
        guard let source = CGEventSource(stateID: .privateState) else {
            throw HelperFault.of("COMPUTER_ACTION_BLOCKED", "CoreGraphics input event source is unavailable")
        }
        return source
    }

    static func button(_ value: String?) throws -> CGMouseButton {
        switch value ?? "left" {
        case "left": return .left
        case "right": return .right
        case "middle": return .center
        default: throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "unsupported mouse button")
        }
    }

    static func pressKey(_ key: String, modifiers: [String], app: NSRunningApplication) throws {
        let normalized = key.lowercased()
        guard let code = KeyVocabulary.codes[normalized] else {
            throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "unsupported key; use the documented key vocabulary")
        }
        let source = try eventSource()
        guard let down = CGEvent(keyboardEventSource: source, virtualKey: code, keyDown: true),
              let up = CGEvent(keyboardEventSource: source, virtualKey: code, keyDown: false) else {
            throw HelperFault.of("COMPUTER_ACTION_BLOCKED", "CoreGraphics could not create keyboard events")
        }
        let eventFlags = try ModifierFlags.combine(modifiers)
        down.flags = eventFlags
        up.flags = eventFlags
        down.postToPid(app.processIdentifier)
        usleep(5_000)
        up.postToPid(app.processIdentifier)
    }

    static func focusedElement(_ app: NSRunningApplication) -> AXUIElement? {
        let appElement = AXUIElementCreateApplication(app.processIdentifier)
        guard let focused = AXProbe.copy(appElement, kAXFocusedUIElementAttribute as CFString) as AnyObject?,
              CFGetTypeID(focused) == AXUIElementGetTypeID() else { return nil }
        return (focused as! AXUIElement)
    }

    /// Cheapest text route first: writing into the focused element's selected
    /// text costs no synthetic key events at all.
    static func setSelectedText(_ text: String, app: NSRunningApplication) -> Bool {
        guard let focused = focusedElement(app) else { return false }
        return AXUIElementSetAttributeValue(focused, kAXSelectedTextAttribute as CFString, text as CFTypeRef) == .success
    }

    static func typeText(_ text: String, app: NSRunningApplication) throws {
        let source = try eventSource()
        guard let down = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: true),
              let up = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: false) else {
            throw HelperFault.of("COMPUTER_ACTION_BLOCKED", "CoreGraphics could not create Unicode keyboard events")
        }
        let units = Array(text.utf16)
        units.withUnsafeBufferPointer { buffer in
            down.keyboardSetUnicodeString(stringLength: units.count, unicodeString: buffer.baseAddress!)
            up.keyboardSetUnicodeString(stringLength: units.count, unicodeString: buffer.baseAddress!)
        }
        down.postToPid(app.processIdentifier)
        usleep(5_000)
        up.postToPid(app.processIdentifier)
    }
}
