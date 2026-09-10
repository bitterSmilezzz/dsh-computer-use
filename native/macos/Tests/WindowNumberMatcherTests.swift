import Darwin
import Foundation

/// Standalone checks for the window-number matcher, compiled together with it by
/// `tests/window-number-matcher.spec.ts`. The exit status carries the verdict:
/// a mismatch reports the failing case on stderr and exits 1.
@main
private enum WindowNumberMatcherChecks {
    private struct Check {
        let name: String
        let candidates: [WindowNumberCandidate]
        let observedTitle: String?
        let expected: Int?
    }

    private static let checks: [Check] = [
        Check(
            name: "lone owner-frame candidate wins even when the titles disagree",
            candidates: [WindowNumberCandidate(number: 101, title: "WindowServer title")],
            observedTitle: "Different accessibility title",
            expected: 101
        ),
        Check(
            name: "one prefixed candidate among several is selected",
            candidates: [
                WindowNumberCandidate(number: 201, title: "备忘录"),
                WindowNumberCandidate(number: 202, title: "Preferences"),
            ],
            observedTitle: "备忘录 – 5个备忘录",
            expected: 201
        ),
        Check(
            name: "a candidate without a title is never a match",
            candidates: [
                WindowNumberCandidate(number: 301, title: ""),
                WindowNumberCandidate(number: 302, title: "备忘录"),
            ],
            observedTitle: "备忘录 – 5个备忘录",
            expected: 302
        ),
        Check(
            name: "two matching candidate titles leave the window undecided",
            candidates: [
                WindowNumberCandidate(number: 401, title: "备忘录"),
                WindowNumberCandidate(number: 402, title: "备忘录 – 5个备忘录"),
                WindowNumberCandidate(number: 403, title: ""),
            ],
            observedTitle: "备忘录 – 5个备忘录",
            expected: nil
        ),
        Check(
            name: "a plain lexical prefix does not identify a window",
            candidates: [
                WindowNumberCandidate(number: 501, title: "Document"),
                WindowNumberCandidate(number: 502, title: "Preferences"),
            ],
            observedTitle: "Doc",
            expected: nil
        ),
    ]

    private static func report(_ check: Check, observed: Int?) -> Never {
        let expected = String(describing: check.expected)
        let actual = String(describing: observed)
        FileHandle.standardError.write(Data("FAIL \(check.name): expected \(expected), got \(actual)\n".utf8))
        Darwin.exit(1)
    }

    static func main() {
        for check in checks {
            let observed = matchedWindowNumber(candidates: check.candidates, observedTitle: check.observedTitle)
            guard observed == check.expected else { report(check, observed: observed) }
        }
        print("PASS WindowNumberMatcherTests (\(checks.count) cases)")
    }
}
