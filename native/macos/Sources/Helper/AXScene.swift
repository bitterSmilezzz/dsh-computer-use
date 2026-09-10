import AppKit
import ApplicationServices
import CoreGraphics
import Foundation
import ScreenCaptureKit

/// One accessibility node captured during an observation: the live element, the
/// child-index path that reaches it inside the traversed tree, the JSON the host
/// half receives, and the identity line folded into `stateHash`.
struct SceneElement {
    let index: Int
    let locator: [Int]
    let element: AXUIElement
    let json: [String: Any]
    let hashLine: String
}

/// Everything a single observation knows about the target application. The
/// window pair keeps the live AX element next to the JSON the host half saw, so
/// later actions can re-derive coordinates without another observation.
struct ObservedScene {
    let app: NSRunningApplication
    let appJSON: [String: Any]
    let frontmost: Bool
    let window: AXUIElement?
    let windowJSON: [String: Any]?
    let stateHash: String
    let treeText: String
    let truncated: Bool
    let elements: [SceneElement]
}

/// Every normalized attribute one recorded element contributes. Reading them in
/// one place keeps the JSON, the hash line, and the rendered tree line derived
/// from exactly the same snapshot of the element.
private struct SceneFields {
    let role: String
    let subrole: String?
    let nativeIdentifier: String?
    let title: String?
    let label: String?
    let value: String?
    let enabled: Bool?
    let focused: Bool?
    let selected: Bool?
    let frame: CGRect?
    let actions: [String]
}

/// The Accessibility value as the model may see it. A secure field is masked
/// without ever reading its contents; a non-string value falls back to the
/// number rendering, and anything else stays absent.
private func sceneValue(of element: AXUIElement, secure: Bool) -> String? {
    if secure { return "[secure]" }
    guard let raw = AXProbe.copy(element, kAXValueAttribute as CFString) else { return nil }
    if let text = raw as? String { return TextCodec.clip(text) }
    if let number = raw as? NSNumber { return number.stringValue }
    return nil
}

/// Reads the attribute set of one element in a single pass.
private func sceneFields(of element: AXUIElement) -> SceneFields {
    let role = AXProbe.text(element, kAXRoleAttribute as CFString) ?? "AXUnknown"
    let subrole = AXProbe.text(element, kAXSubroleAttribute as CFString)
    let title = AXProbe.text(element, kAXTitleAttribute as CFString)
    let secure = role == "AXSecureTextField" || subrole == "AXSecureTextField"
    return SceneFields(
        role: role,
        subrole: subrole,
        nativeIdentifier: AXProbe.text(element, kAXIdentifierAttribute as CFString),
        title: title,
        label: title ?? AXProbe.text(element, kAXDescriptionAttribute as CFString),
        value: sceneValue(of: element, secure: secure),
        enabled: AXProbe.flag(element, kAXEnabledAttribute as CFString),
        focused: AXProbe.flag(element, kAXFocusedAttribute as CFString),
        selected: AXProbe.flag(element, kAXSelectedAttribute as CFString),
        frame: AXProbe.frame(element),
        actions: axActions(element)
    )
}

/// The rounded frame tuple both the hash line and the window hash embed.
private func frameKey(_ frame: CGRect?) -> String {
    guard let frame else { return "" }
    return "\(Int(frame.origin.x)),\(Int(frame.origin.y)),\(Int(frame.width)),\(Int(frame.height))"
}

/// Identity line of one element inside `stateHash`. Field order and separators
/// are protocol: changing either silently invalidates stored observations.
private func sceneHashLine(locator: [Int], fields: SceneFields) -> String {
    [
        locator.map(String.init).joined(separator: "."),
        fields.nativeIdentifier ?? "",
        fields.role,
        fields.subrole ?? "",
        fields.title ?? "",
        fields.label ?? "",
        fields.value ?? "",
        String(fields.enabled ?? true),
        String(fields.focused ?? false),
        String(fields.selected ?? false),
        frameKey(fields.frame),
        fields.actions.joined(separator: ","),
    ].joined(separator: "|")
}

/// One indented line of the bounded tree text the model reads.
private func sceneLine(index: Int, depth: Int, fields: SceneFields) -> String {
    var line = String(repeating: "  ", count: min(depth, 20)) + "[\(index)] \(fields.role)"
    if let title = fields.title { line += " \(TextCodec.quoted(TextCodec.clip(title)))" }
    else if let label = fields.label { line += " \(TextCodec.quoted(TextCodec.clip(label)))" }
    if let value = fields.value { line += " value=\(TextCodec.quoted(value))" }
    if fields.enabled == false { line += " disabled" }
    if fields.focused == true { line += " focused" }
    if fields.selected == true { line += " selected" }
    return line
}

/// Walks the accessibility tree breadth-first from the chosen window, applying
/// the node, depth and text budgets the caller asked for. Traversal order,
/// locator construction, `hashLine` composition and the state hash are all part
/// of the protocol: a change here silently invalidates every stored observation.
func observeSnapshot(app: NSRunningApplication, limits: [String: Any]) throws -> ObservedScene {
    guard AXIsProcessTrusted() else {
        throw HelperFault.of("COMPUTER_PERMISSION_REQUIRED", "macOS Accessibility permission is required for the DSH helper")
    }
    let maxNodes = try RequestField.integer(limits["maxNodes"], "limits.maxNodes")
    let maxDepth = try RequestField.integer(limits["maxDepth"], "limits.maxDepth")
    let maxTextBytes = try RequestField.integer(limits["maxTextBytes"], "limits.maxTextBytes")
    guard maxNodes > 0, maxDepth > 0, maxTextBytes > 0 else {
        throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "observation limits must be positive")
    }
    let appElement = AXUIElementCreateApplication(app.processIdentifier)
    let rootWindow = WindowProbe.chosenWindow(appElement)
    let root = rootWindow ?? appElement
    let frame = rootWindow.flatMap(AXProbe.frame)
    let title = rootWindow.flatMap { AXProbe.text($0, kAXTitleAttribute as CFString) }
    let windowId = rootWindow.flatMap { WindowProbe.number(of: $0) }
        ?? WindowProbe.number(app: app, frame: frame, title: title)
    var windowJSON: [String: Any]?
    if let frame {
        var json: [String: Any] = ["frame": AXProbe.rectJSON(frame)]
        if let title { json["title"] = title }
        if let windowId { json["id"] = windowId }
        windowJSON = json
    }

    var pending: [(AXUIElement, [Int], Int)] = [(root, [], 0)]
    var head = 0
    var seen = Set<CFHashCode>()
    var captured: [SceneElement] = []
    var rendered: [String] = []
    var renderedBytes = 0
    var truncated = false

    while head < pending.count {
        if captured.count >= maxNodes { truncated = true; break }
        let (element, locator, depth) = pending[head]
        head += 1
        let identity = CFHash(element)
        if seen.contains(identity) { continue }
        seen.insert(identity)
        let fields = sceneFields(of: element)
        let index = captured.count
        var json: [String: Any] = [
            "index": index,
            "role": fields.role,
            "actions": fields.actions,
            "locator": locator,
        ]
        if let subrole = fields.subrole { json["subrole"] = subrole }
        if let nativeIdentifier = fields.nativeIdentifier { json["nativeIdentifier"] = TextCodec.clip(nativeIdentifier) }
        if let title = fields.title { json["title"] = TextCodec.clip(title) }
        if let label = fields.label { json["label"] = TextCodec.clip(label) }
        if let value = fields.value { json["value"] = value }
        if let enabled = fields.enabled { json["enabled"] = enabled }
        if let focused = fields.focused { json["focused"] = focused }
        if let selected = fields.selected { json["selected"] = selected }
        if let frame = fields.frame { json["frame"] = AXProbe.rectJSON(frame) }
        let line = sceneLine(index: index, depth: depth, fields: fields)
        let lineBytes = line.lengthOfBytes(using: .utf8) + (rendered.isEmpty ? 0 : 1)
        if renderedBytes + lineBytes <= maxTextBytes {
            rendered.append(line)
            renderedBytes += lineBytes
        } else {
            truncated = true
        }
        captured.append(SceneElement(
            index: index,
            locator: locator,
            element: element,
            json: json,
            hashLine: sceneHashLine(locator: locator, fields: fields)
        ))
        if depth >= maxDepth {
            if !AXProbe.children(element).isEmpty { truncated = true }
            continue
        }
        for (childIndex, child) in AXProbe.children(element).enumerated() {
            pending.append((child, locator + [childIndex], depth + 1))
        }
    }
    let appData = try AppCatalog.summary(of: app)
    let windowHash = [
        title ?? "",
        windowId.map(String.init) ?? "",
        frameKey(frame),
    ].joined(separator: "|")
    let state = [appData["bundleId"] as? String ?? "", String(app.processIdentifier), windowHash, captured.map(\.hashLine).joined(separator: "\n")].joined(separator: "\n")
    return ObservedScene(
        app: app,
        appJSON: appData,
        frontmost: app.isActive,
        window: rootWindow,
        windowJSON: windowJSON,
        stateHash: Digest.hex(state),
        treeText: rendered.joined(separator: "\n"),
        truncated: truncated,
        elements: captured
    )
}

/// Screenshot capture for one observed window. `required` distinguishes "the
/// caller asked for a picture" (failures are faults) from "attach one if the
/// platform allows it" (failures are simply absent).
enum ScreenCapture {
    static func capture(_ scene: ObservedScene, path: String, required: Bool) async throws -> [String: Any]? {
        guard CGPreflightScreenCaptureAccess() else {
            if required { throw HelperFault.of("COMPUTER_PERMISSION_REQUIRED", "macOS Screen Recording permission is required for screenshots") }
            return nil
        }
        let content: SCShareableContent
        do {
            content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
        } catch {
            if required { throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "ScreenCaptureKit could not enumerate windows") }
            return nil
        }
        let expectedId = (scene.windowJSON?["id"] as? NSNumber)?.uint32Value
        let expectedTitle = scene.windowJSON?["title"] as? String
        let windows = content.windows.filter { $0.owningApplication?.processID == scene.app.processIdentifier }
        let selected = windows.first { window in
            if let expectedId, window.windowID == expectedId { return true }
            if let expectedTitle, !expectedTitle.isEmpty, window.title == expectedTitle { return true }
            return false
        } ?? windows.max { $0.frame.width * $0.frame.height < $1.frame.width * $1.frame.height }
        guard let selected else {
            if required { throw HelperFault.of("COMPUTER_TARGET_UNAVAILABLE", "no capturable window belongs to the selected application") }
            return nil
        }
        let configuration = SCStreamConfiguration()
        configuration.width = max(1, Int(selected.frame.width.rounded()))
        configuration.height = max(1, Int(selected.frame.height.rounded()))
        configuration.showsCursor = false
        let filter = SCContentFilter(desktopIndependentWindow: selected)
        let image: CGImage
        do {
            image = try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: configuration)
        } catch {
            if required { throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "ScreenCaptureKit could not capture the selected window") }
            return nil
        }
        let representation = NSBitmapImageRep(cgImage: image)
        guard let data = representation.representation(using: .png, properties: [:]) else {
            throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "captured window could not be encoded as PNG")
        }
        do {
            try data.write(to: URL(fileURLWithPath: path), options: .atomic)
        } catch {
            throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "captured PNG could not be written")
        }
        return ["path": path, "width": image.width, "height": image.height]
    }
}

/// Shapes one observation into the JSON document the host half parses.
enum SceneProjection {
    static func render(_ scene: ObservedScene, screenshot: [String: Any]?) -> [String: Any] {
        var result: [String: Any] = [
            "app": scene.appJSON,
            "stateHash": scene.stateHash,
            "frontmost": scene.frontmost,
            "treeText": scene.treeText,
            "truncated": scene.truncated,
            "elements": scene.elements.map(\.json),
            "permissions": [
                "accessibility": Permissions.accessibility(),
                "screenRecording": Permissions.screenRecording(),
            ],
        ]
        if let window = scene.windowJSON { result["window"] = window }
        if let screenshot { result["screenshot"] = screenshot }
        return result
    }
}
