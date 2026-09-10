/**
 * Client issues — the text-shaped and cross-field rules a draft must satisfy
 * before the browser half is willing to build a save payload.
 *
 * Every rule here is a mirror of a host-side rule from `tuning/tuning.normalize.ts`;
 * the wording is localized, the acceptance is not. Keeping the mirrors exact is
 * what makes an inline hint mean the same thing as a rejected save.
 */
import type { Translate } from './copy.en.ts';
import type { Draft } from './state.draft.ts';
/** Host rule: the settlement interval may not sit above the settlement ceiling. */
export declare function crossIssueOf(draft: Draft, t: Translate): string | undefined;
/** Host rule: the artifact directory is a non-empty workspace-relative path. */
export declare function artifactIssueOf(draft: Draft, t: Translate): string | undefined;
/**
 * Turn the grants textarea back into host-shaped rules, reporting the first
 * offending line in the active locale.
 *
 * A line reads `<app identifier> <scope list>`; the identifier is every
 * whitespace-separated token except the last, and the scope list is the last
 * one. Splitting this way — rather than treating the first token as the
 * identifier — keeps the parser exactly as permissive about identifiers as the
 * host (`tuning/tuning.normalize.ts` rejects only an empty, wildcard, or
 * repeated identifier, so an identifier containing a space is legal there),
 * while staying stricter about the overall line shape. A stricter split would
 * produce drafts the host accepts but this form could never parse back.
 */
export declare function parseGrants(text: string, t: Translate): {
    value?: Array<{
        bundleId: string;
        read: boolean;
        control: boolean;
    }>;
    issue?: string;
};
//# sourceMappingURL=guard.issues.d.ts.map