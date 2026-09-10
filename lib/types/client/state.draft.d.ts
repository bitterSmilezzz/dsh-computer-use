/**
 * Client draft state — the editable text form of one Settings document, and the
 * normalization that turns it back into the host-shaped document on save.
 *
 * Two shapes live here on purpose: {@link Draft} keeps every editable value as
 * the raw string the form holds (so a half-typed number is representable), and
 * {@link ConfigValue} is the typed document the host accepts. `draftOf` moves
 * one way, `configOf` the other, and `serializeDraft` is the comparison used by
 * the dirty flag.
 */
import type { Translate } from './copy.en.ts';
/**
 * Settings document shape the client rewrites; the host validates it again on
 * save. Members are alphabetical so an added field has an obvious home, and all
 * of them are optional: the client sends only what the form actually carries.
 */
export interface ConfigValue {
    actionTimeoutMs?: number;
    allowAllApps?: boolean;
    artifactRoot?: string;
    confirmationTtlMs?: number;
    grants?: Array<{
        bundleId: string;
        read?: boolean;
        control?: boolean;
    }>;
    helper?: {
        path?: string;
        allowSourceBuild?: boolean;
    };
    interaction?: {
        cursorAccelerationPxPerSecondSquared?: number;
        cursorAutoHideMs?: number;
        cursorClickDelayMs?: number;
        /** Retired host field, kept in the shape so an older document still round-trips. */
        cursorMotionMs?: number;
        cursorSpeedPxPerSecond?: number;
        cursorVisualization?: 'hidden' | 'visible';
        focusPolicy?: 'preserve' | 'activate';
        keyboardPolicy?: 'preserve' | 'activate';
        pointerInputPolicy?: 'deny' | 'targeted';
    };
    maxDepth?: number;
    maxNodes?: number;
    maxScreenshotBytes?: number;
    maxSettleMs?: number;
    maxTextBytes?: number;
    maxWaitMs?: number;
    observationTtlMs?: number;
    settleMs?: number;
}
/**
 * One editable value per settings field: form text for every number and text
 * input, the real union for enums, the real flag for toggles. Also alphabetical,
 * for the same reason as the document above.
 */
export interface Draft {
    actionTimeoutMs: string;
    allowAllApps: boolean;
    allowSourceBuild: boolean;
    artifactRoot: string;
    confirmationTtlMs: string;
    cursorAccelerationPxPerSecondSquared: string;
    cursorAutoHideMs: string;
    cursorClickDelayMs: string;
    cursorSpeedPxPerSecond: string;
    cursorVisualization: 'hidden' | 'visible';
    focusPolicy: 'preserve' | 'activate';
    grants: string;
    helperPath: string;
    keyboardPolicy: 'preserve' | 'activate';
    maxDepth: string;
    maxNodes: string;
    maxScreenshotBytes: string;
    maxSettleMs: string;
    maxTextBytes: string;
    maxWaitMs: string;
    observationTtlMs: string;
    pointerInputPolicy: 'deny' | 'targeted';
    settleMs: string;
}
/** Project a saved document into the editable draft the form renders. */
export declare function draftOf(value: ConfigValue): Draft;
/**
 * Canonical form of one draft: the exact JSON the save path would send. Returns
 * undefined when the draft cannot be saved at all, which callers must read as
 * "not comparable with the server" rather than as "unchanged".
 */
export declare function serializeDraft(draft: Draft, t: Translate): string | undefined;
/**
 * Build the host-shaped document for one draft.
 *
 * Every numeric field goes through the same guard the inline hints use, so a
 * value the user can see flagged can never reach the wire; the first failing
 * field throws with the same localized message the form shows beside it.
 */
export declare function configOf(draft: Draft, t: Translate): ConfigValue;
//# sourceMappingURL=state.draft.d.ts.map