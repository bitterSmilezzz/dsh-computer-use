import AppKit
import ApplicationServices
import CoreGraphics
import Foundation

/// The subset of a JSON document that carries identity. Comparing only these
/// keys keeps re-observations cheap while still failing closed when anything
/// the protocol publishes has moved.
enum IdentityFields {
    static let element = ["nativeIdentifier", "role", "subrole", "title", "label", "value", "enabled", "selected", "frame", "actions"]
    static let window = ["id", "title", "frame"]

    static func select(from source: [String: Any], keys: [String]) -> [AnyHashable: Any] {
        var identity: [AnyHashable: Any] = [:]
        for key in keys {
            if let value = source[key] { identity[key] = value }
        }
        return identity
    }
}

extension SceneElement {
    /// Does this captured element still carry the identity the caller saw?
    func matches(_ expected: [String: Any]) -> Bool {
        NSDictionary(dictionary: IdentityFields.select(from: expected, keys: IdentityFields.element))
            .isEqual(to: IdentityFields.select(from: json, keys: IdentityFields.element))
    }
}

/// Window selection, coordinate spaces and target identity for one observed
/// application. Nothing here talks to the Accessibility server; it only reads
/// what the observation layer already captured.
enum WindowProbe {
    /// The window an observation should describe: focused, else main, else the
    /// first child the application exposes.
    static func chosenWindow(_ appElement: AXUIElement) -> AXUIElement? {
        if let focused = AXProbe.copy(appElement, kAXFocusedWindowAttribute as CFString) as AnyObject?,
           CFGetTypeID(focused) == AXUIElementGetTypeID() {
            return (focused as! AXUIElement)
        }
        if let main = AXProbe.copy(appElement, kAXMainWindowAttribute as CFString) as AnyObject?,
           CFGetTypeID(main) == AXUIElementGetTypeID() {
            return (main as! AXUIElement)
        }
        return AXProbe.children(appElement).first
    }

    static func number(of element: AXUIElement) -> Int? {
        (AXProbe.copy(element, "AXWindowNumber" as CFString) as? NSNumber)?.intValue
    }

    static func number(app: NSRunningApplication, frame: CGRect?, title: String?) -> Int? {
        guard let windows = CGWindowListCopyWindowInfo(
            [.optionOnScreenOnly, .excludeDesktopElements],
            kCGNullWindowID
        ) as? [[String: Any]] else { return nil }
        let candidates = windows.filter { window in
            guard (window[kCGWindowOwnerPID as String] as? NSNumber)?.int32Value == app.processIdentifier,
                  (window[kCGWindowLayer as String] as? NSNumber)?.intValue == 0 else { return false }
            if let frame {
                guard let bounds = window[kCGWindowBounds as String] as? [String: Any],
                      let candidate = CGRect(dictionaryRepresentation: bounds as CFDictionary) else { return false }
                let tolerance: CGFloat = 2
                guard abs(candidate.minX - frame.minX) <= tolerance,
                      abs(candidate.minY - frame.minY) <= tolerance,
                      abs(candidate.width - frame.width) <= tolerance,
                      abs(candidate.height - frame.height) <= tolerance else { return false }
            }
            return true
        }
        // Frame plus owner already identifies one window in the common case, and
        // requiring the titles to be equal on top of that loses more than it
        // gains: Notes reports "备忘录 – 5个备忘录" through accessibility while the
        // window server calls the same window "备忘录". The mismatch silently cost
        // the window id, and without an id the agent cursor is skipped entirely
        // with nothing reported — the caller cannot even tell it lost the cursor.
        //
        // So the title only has to disambiguate, and only when the frame did not.
        // Empty WindowServer titles carry no identity and must not participate in
        // prefix matching: every string has an empty prefix.
        return matchedWindowNumber(
            candidates: candidates.map { window in
                WindowNumberCandidate(
                    number: (window[kCGWindowNumber as String] as? NSNumber)?.intValue,
                    title: window[kCGWindowName as String] as? String
                )
            },
            observedTitle: title
        )
    }

    /// The window rectangle the protocol carries, in screen coordinates.
    static func cgRect(_ frame: [String: Any]) throws -> CGRect {
        CGRect(
            x: try RequestField.decimal(frame["x"], "window.x"),
            y: try RequestField.decimal(frame["y"], "window.y"),
            width: try RequestField.decimal(frame["width"], "window.width"),
            height: try RequestField.decimal(frame["height"], "window.height")
        )
    }

    /// Turns an action's window-relative coordinate into a screen point. Screen
    /// coordinates pass through untouched; window coordinates are validated
    /// against the observed window before the origin is added.
    static func screenPoint(_ action: [String: Any], window: [String: Any]?, xKey: String, yKey: String, coordinateSpace: String = "window") throws -> CGPoint {
        let x = try RequestField.decimal(action[xKey], "action.\(xKey)")
        let y = try RequestField.decimal(action[yKey], "action.\(yKey)")
        if coordinateSpace == "screen" {
            return CGPoint(x: x, y: y)
        }
        guard coordinateSpace == "window" else {
            throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "action coordinateSpace must be one of window, screen")
        }
        guard let frame = window?["frame"] as? [String: Any] else {
            throw HelperFault.of("COMPUTER_TARGET_UNAVAILABLE", "the observation has no current window coordinate space")
        }
        let width = try RequestField.decimal(frame["width"], "window.width")
        let height = try RequestField.decimal(frame["height"], "window.height")
        guard x >= 0, y >= 0, x <= width, y <= height else {
            throw HelperFault.of("COMPUTER_TARGET_UNAVAILABLE", "coordinate is outside the observed window")
        }
        let origin = try cgRect(frame)
        return CGPoint(x: origin.origin.x + x, y: origin.origin.y + y)
    }

    /// Resolves the request's element locator against the observation it names.
    static func targetRecord(_ request: [String: Any], scene: ObservedScene) throws -> SceneElement? {
        guard let element = request["element"] as? [String: Any] else { return nil }
        let locator = (element["locator"] as? [NSNumber])?.map(\.intValue) ?? []
        guard let record = scene.elements.first(where: { $0.locator == locator }) else {
            throw HelperFault.of("COMPUTER_STALE_OBSERVATION", "the target element locator is no longer present")
        }
        return record
    }

    static func windowMatches(_ expected: [String: Any]?, current: [String: Any]?) -> Bool {
        guard let expected else { return current == nil }
        guard let current else { return false }
        return NSDictionary(dictionary: IdentityFields.select(from: expected, keys: IdentityFields.window))
            .isEqual(to: IdentityFields.select(from: current, keys: IdentityFields.window))
    }
}

/// Staleness gate for every action: either the named element and window still
/// match the observation the caller saw, or the whole state hash does.
func validateTarget(_ request: [String: Any], snapshot: ObservedScene) throws -> SceneElement? {
    let record = try WindowProbe.targetRecord(request, scene: snapshot)
    if let record, let expectedElement = request["element"] as? [String: Any] {
        guard WindowProbe.windowMatches(request["window"] as? [String: Any], current: snapshot.windowJSON),
              record.matches(expectedElement) else {
            throw HelperFault.of("COMPUTER_STALE_OBSERVATION", "the target element or window changed after the referenced observation")
        }
    } else {
        let expected = try RequestField.text(request["expectedStateHash"], "request.expectedStateHash")
        guard snapshot.stateHash == expected else {
            throw HelperFault.of("COMPUTER_STALE_OBSERVATION", "the application UI changed after the referenced observation")
        }
    }
    return record
}

/// Proves that bringing an application to the front did not change its UI.
func activationStateMatches(_ before: ObservedScene, current: ObservedScene) -> Bool {
    guard WindowProbe.windowMatches(before.windowJSON, current: current.windowJSON),
          before.elements.count == current.elements.count else { return false }
    return zip(before.elements, current.elements).allSatisfy { expected, actual in
        expected.locator == actual.locator && actual.matches(expected.json)
    }
}
