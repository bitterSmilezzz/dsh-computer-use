import AppKit
import ApplicationServices
import CoreGraphics
import Foundation

/// Best-effort reads of Accessibility attributes. An attribute that is absent
/// or unreadable yields `nil` instead of a failure: the observation layer
/// cannot act on the difference between "not advertised" and "not readable".
enum AXProbe {
    static func copy(_ element: AXUIElement, _ attribute: CFString) -> Any? {
        var value: CFTypeRef?
        let result = AXUIElementCopyAttributeValue(element, attribute, &value)
        return result == .success ? value : nil
    }

    static func text(_ element: AXUIElement, _ attribute: CFString) -> String? {
        if let value = copy(element, attribute) as? String, !value.isEmpty { return value }
        if let value = copy(element, attribute) as? NSAttributedString, !value.string.isEmpty { return value.string }
        return nil
    }

    static func flag(_ element: AXUIElement, _ attribute: CFString) -> Bool? {
        (copy(element, attribute) as? NSNumber)?.boolValue
    }

    static func point(_ element: AXUIElement, _ attribute: CFString) -> CGPoint? {
        guard let value = copy(element, attribute), CFGetTypeID(value as CFTypeRef) == AXValueGetTypeID() else { return nil }
        let axValue = value as! AXValue
        guard AXValueGetType(axValue) == .cgPoint else { return nil }
        var point = CGPoint.zero
        return AXValueGetValue(axValue, .cgPoint, &point) ? point : nil
    }

    static func size(_ element: AXUIElement, _ attribute: CFString) -> CGSize? {
        guard let value = copy(element, attribute), CFGetTypeID(value as CFTypeRef) == AXValueGetTypeID() else { return nil }
        let axValue = value as! AXValue
        guard AXValueGetType(axValue) == .cgSize else { return nil }
        var size = CGSize.zero
        return AXValueGetValue(axValue, .cgSize, &size) ? size : nil
    }

    /// Position plus size, or `nil` when either half is missing or degenerate.
    static func frame(_ element: AXUIElement) -> CGRect? {
        guard let position = point(element, kAXPositionAttribute as CFString),
              let size = size(element, kAXSizeAttribute as CFString),
              size.width >= 0, size.height >= 0 else { return nil }
        return CGRect(origin: position, size: size)
    }

    /// Rectangle in the wire shape every action and observation uses.
    static func rectJSON(_ rect: CGRect) -> [String: Any] {
        ["x": rect.origin.x, "y": rect.origin.y, "width": rect.size.width, "height": rect.size.height]
    }

    static func children(_ element: AXUIElement) -> [AXUIElement] {
        guard let values = copy(element, kAXChildrenAttribute as CFString) as? [AnyObject] else { return [] }
        return values.compactMap { value in
            guard CFGetTypeID(value) == AXUIElementGetTypeID() else { return nil }
            return (value as! AXUIElement)
        }
    }
}

/// The sorted action names an element advertises. Kept as a module-level
/// function under its historical name: the AXPress fallback and the native
/// source-shape assertions both call it exactly this way.
func axActions(_ element: AXUIElement) -> [String] {
    var names: CFArray?
    guard AXUIElementCopyActionNames(element, &names) == .success, let names else { return [] }
    return (names as NSArray).compactMap { $0 as? String }.sorted()
}

/// Resolution of an application selector to exactly one running process.
enum AppCatalog {
    static func running() -> [NSRunningApplication] {
        NSWorkspace.shared.runningApplications
            .filter { !$0.isTerminated && $0.activationPolicy == .regular && $0.bundleIdentifier != nil }
            .sorted {
                let lhs = $0.localizedName ?? $0.bundleIdentifier ?? ""
                let rhs = $1.localizedName ?? $1.bundleIdentifier ?? ""
                return lhs.localizedCaseInsensitiveCompare(rhs) == .orderedAscending
            }
    }

    /// Identity of one application in the list-apps payload.
    static func summary(of app: NSRunningApplication) throws -> [String: Any] {
        guard let bundleId = app.bundleIdentifier else {
            throw HelperFault.of("COMPUTER_APP_NOT_FOUND", "running application has no bundle identifier")
        }
        return [
            "bundleId": bundleId,
            "pid": Int(app.processIdentifier),
            "name": app.localizedName ?? bundleId,
        ]
    }

    static func resolve(_ selector: [String: Any]) throws -> NSRunningApplication {
        let bundleId = selector["bundleId"] as? String
        let pid = (selector["pid"] as? NSNumber)?.int32Value
        let name = selector["name"] as? String
        if bundleId == nil && pid == nil && name == nil {
            throw HelperFault.of("COMPUTER_APP_NOT_FOUND", "app selector needs bundleId, pid, or unique name")
        }
        let matches = running().filter { app in
            if let bundleId, app.bundleIdentifier != bundleId { return false }
            if let pid, app.processIdentifier != pid { return false }
            if let name {
                let display = app.localizedName ?? ""
                if display.compare(name, options: [.caseInsensitive, .diacriticInsensitive]) != .orderedSame { return false }
            }
            return true
        }
        guard matches.count == 1, let app = matches.first else {
            if matches.isEmpty { throw HelperFault.of("COMPUTER_APP_NOT_FOUND", "no running application uniquely matches the selector") }
            if bundleId != nil {
                throw HelperFault.of("COMPUTER_APP_NOT_FOUND", "multiple running processes match the bundleId; add the exact pid from computer_list_apps")
            }
            throw HelperFault.of("COMPUTER_APP_NOT_FOUND", "application name is ambiguous; use bundleId and, if necessary, pid")
        }
        return app
    }
}

/// TCC state as the protocol spells it: `granted` / `denied`.
enum Permissions {
    static func accessibility() -> String {
        AXIsProcessTrusted() ? "granted" : "denied"
    }

    static func screenRecording() -> String {
        CGPreflightScreenCaptureAccess() ? "granted" : "denied"
    }
}
