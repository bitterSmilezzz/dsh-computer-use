import CryptoKit
import Darwin
import Foundation

/// The single failure surface every command shares: a stable machine code that
/// the TypeScript half maps onto a tool error, plus one sentence meant for a
/// human reader. Codes and messages travel over JSON verbatim.
struct HelperFault: Error {
    let code: String
    let message: String

    /// Reads better than repeating the memberwise initializer at ~100 throw sites.
    static func of(_ code: String, _ message: String) -> HelperFault {
        HelperFault(code: code, message: message)
    }
}

/// Readers for the request document the host half writes to stdin. Every field
/// name that reaches an error sentence is the protocol's own spelling, and the
/// message text is user-visible, so neither may drift.
enum RequestField {
    static func text(_ object: Any?, _ field: String) throws -> String {
        guard let value = object as? String, !value.isEmpty else {
            throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "missing or invalid \(field)")
        }
        return value
    }

    static func textAllowingEmpty(_ object: Any?, _ field: String) throws -> String {
        guard let value = object as? String else {
            throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "missing or invalid \(field)")
        }
        return value
    }

    static func integer(_ object: Any?, _ field: String) throws -> Int {
        guard let number = object as? NSNumber else {
            throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "missing or invalid \(field)")
        }
        return number.intValue
    }

    static func decimal(_ object: Any?, _ field: String) throws -> Double {
        guard let number = object as? NSNumber else {
            throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "missing or invalid \(field)")
        }
        return number.doubleValue
    }

    static func flag(_ object: Any?, default fallback: Bool = false) -> Bool {
        (object as? NSNumber)?.boolValue ?? fallback
    }

    static func object(_ object: Any?, _ field: String) throws -> [String: Any] {
        guard let value = object as? [String: Any] else {
            throw HelperFault.of("COMPUTER_PROVIDER_FAILURE", "missing or invalid \(field)")
        }
        return value
    }

    static func objects(_ object: Any?) -> [[String: Any]] {
        object as? [[String: Any]] ?? []
    }

    /// Reads one enumerated interaction knob, rejecting anything outside the
    /// advertised vocabulary with the full list in the message.
    static func choice(of source: [String: Any], _ key: String, _ allowed: [String]) throws -> String {
        let value = try text(source[key], "request.interaction.\(key)")
        guard allowed.contains(value) else {
            throw HelperFault.of(
                "COMPUTER_PROVIDER_FAILURE",
                "request.interaction.\(key) must be one of \(allowed.joined(separator: ", "))"
            )
        }
        return value
    }
}

/// Text projections shared by the JSON payload and the rendered accessibility
/// tree, plus the digest that backs `stateHash`.
enum TextCodec {
    /// Collapses whitespace and caps the length so no single attribute can
    /// flood the observation payload.
    static func clip(_ value: String, limit: Int = 240) -> String {
        let collapsed = value.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
        guard collapsed.count > limit else { return collapsed }
        return String(collapsed.prefix(limit)) + "..."
    }

    /// JSON-quotes a fragment without paying for a second encoder pass over the
    /// whole document.
    static func quoted(_ value: String) -> String {
        let data = try? JSONSerialization.data(withJSONObject: [value])
        let encoded = data.flatMap { String(data: $0, encoding: .utf8) } ?? "[\"\"]"
        return String(encoded.dropFirst().dropLast())
    }
}

/// Digest used for observation identity: the host half compares it byte for
/// byte, so the algorithm and the hex casing are part of the protocol.
enum Digest {
    static func hex(_ value: String) -> String {
        SHA256.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

/// Line-delimited JSON responses on stdout. `frame` exists for the drag
/// handshake, where the helper announces readiness and stays alive until the
/// host answers, so it must not exit the process.
enum ResponseWriter {
    private static let serializationFailure = Data(
        "{\"ok\":false,\"error\":{\"code\":\"COMPUTER_PROVIDER_FAILURE\",\"message\":\"response serialization failed\"}}".utf8
    )

    static func emit(_ payload: [String: Any], exitCode: Int32) -> Never {
        let data = (try? JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys])) ?? serializationFailure
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data("\n".utf8))
        Darwin.exit(exitCode)
    }

    static func frame(_ payload: [String: Any]) {
        let data = (try? JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys])) ?? serializationFailure
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data("\n".utf8))
    }
}
