/// One window-server record that might be the window an observation pointed at.
struct WindowNumberCandidate {
    let number: Int?
    let title: String?
}

/// Characters that make a title prefix a real word boundary.
///
/// Accessibility titles are routinely the window-server title plus a suffix
/// ("备忘录" observed as "备忘录 – 5个备忘录"), and that suffix always opens with
/// one of these. A suffix that opens with a letter starts a different word, so
/// the two titles no longer describe one window.
private let windowTitleBoundaries: Set<Character> = [
    "-", "–", "—", ":", "|", "(", "[", "{", "·",
]

/// Do two titles name the same window?
///
/// Identical titles always do. Otherwise the shorter one has to be a prefix of
/// the longer one *and* stop on a boundary -- without that second half, "Doc"
/// would happily claim "Document".
private func titlesNameSameWindow(_ first: String, _ second: String) -> Bool {
    if first == second { return true }
    let (prefix, longer) = first.count < second.count
        ? (first, second)
        : (second, first)
    guard longer.hasPrefix(prefix),
          let trailing = longer.dropFirst(prefix.count).first else { return false }
    return trailing.isWhitespace || windowTitleBoundaries.contains(trailing)
}

/// Picks the window number an observation belongs to, or `nil` when the evidence
/// does not single one out.
///
/// A single candidate is trusted outright: owner pid plus frame already narrowed
/// the list to one window, and the window-server title frequently disagrees with
/// the accessibility title of that same window. Several candidates have to be
/// separated by their titles instead, and exactly one of them has to match --
/// anything else fails closed rather than guessing at a window the caller never
/// named.
func matchedWindowNumber(
    candidates: [WindowNumberCandidate],
    observedTitle: String?
) -> Int? {
    if candidates.count == 1 {
        return candidates[0].number
    }
    guard let observedTitle, !observedTitle.isEmpty else { return nil }
    let named = candidates.filter { candidate in
        guard let title = candidate.title, !title.isEmpty else { return false }
        return titlesNameSameWindow(observedTitle, title)
    }
    guard named.count == 1 else { return nil }
    return named[0].number
}
