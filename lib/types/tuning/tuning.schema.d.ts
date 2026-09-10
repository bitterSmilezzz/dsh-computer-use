/**
 * Tuning schema: the persisted Settings document, the in-memory shape callers
 * hand in, and the fully-defaulted shape the host half runs on.
 *
 * The field definitions come first, the Cordis/Settings schema assembled from
 * them comes second. Declarative defaults live here; the numeric envelopes that
 * bound them live in `tuning.bounds.ts` for the browser half and are enforced
 * here by `tuning.normalize.ts` for the host half.
 */
import type Schema from '@deepseek-ai/schemastery';
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings';
/**
 * Settings-document namespace owned by this package.
 *
 * The literal is branded at the type level only. DSH 0.1.2-alpha.2 ("move shared
 * values behind service APIs") stopped exporting a `settingsNamespace()` helper
 * and kept the runtime brand private; `ctx.settings.register` validates the
 * plain string at runtime, and the brand asserted here is what narrows that
 * string back to a `SettingsNamespace` for the generic.
 */
export declare const COMPUTER_USE_SETTINGS_NAMESPACE: SettingsNamespace;
/** Foreground policy: whether showing the Agent cursor may activate the target app. */
export type ComputerUseFocusPolicy = 'preserve' | 'activate';
/** Keyboard policy: whether typing may activate the target app first. */
export type ComputerUseKeyboardPolicy = 'preserve' | 'activate';
/** Pointer policy: whether mouse, drag, and wheel input reaches the target process at all. */
export type ComputerUsePointerInputPolicy = 'deny' | 'targeted';
/** Agent cursor policy: whether a separate click-through overlay is drawn. */
export type ComputerUseCursorVisualization = 'hidden' | 'visible';
/** One persisted application grant. Exact bundle ids only; wildcards are not a feature. */
export interface ComputerUseAppGrant {
    bundleId: string;
    read?: boolean;
    control?: boolean;
}
/** Host-owned policy for foreground activation, keyboard routing, process-targeted input, and the Agent cursor. */
export interface ComputerUseInteractionConfig {
    focusPolicy?: ComputerUseFocusPolicy;
    keyboardPolicy?: ComputerUseKeyboardPolicy;
    pointerInputPolicy?: ComputerUsePointerInputPolicy;
    cursorVisualization?: ComputerUseCursorVisualization;
    /**
     * @deprecated Legacy fixed-duration motion, kept so 0.2.x settings documents
     * still load. Cursor travel is driven by speed and acceleration now; the value
     * is bounds-checked and then ignored.
     */
    cursorMotionMs?: number;
    cursorSpeedPxPerSecond?: number;
    cursorAccelerationPxPerSecondSquared?: number;
    cursorClickDelayMs?: number;
    cursorAutoHideMs?: number;
}
/** Where the helper binary comes from. An absent `path` means the packaged helper. */
export interface ComputerUseHelperConfig {
    path?: string;
    allowSourceBuild?: boolean;
}
/**
 * One Settings document as a user writes it.
 *
 * Every key is optional because a document may configure any subset; the
 * defaults declared on {@link Config} and the envelopes applied by
 * `resolveConfig` produce the complete {@link ResolvedComputerUseConfig}. The
 * single field with a second legal meaning is `observationTtlMs`, where `0`
 * turns expiry off instead of asking for a shorter TTL.
 */
export interface ComputerUseConfig {
    observationTtlMs?: number;
    confirmationTtlMs?: number;
    actionTimeoutMs?: number;
    settleMs?: number;
    maxSettleMs?: number;
    /** Ceiling for one `computer_wait` `timeoutMs`; independent of the post-action settle budget. */
    maxWaitMs?: number;
    maxNodes?: number;
    maxDepth?: number;
    maxTextBytes?: number;
    maxScreenshotBytes?: number;
    artifactRoot?: string;
    helper?: ComputerUseHelperConfig;
    interaction?: ComputerUseInteractionConfig;
    allowAllApps?: boolean;
    grants?: ComputerUseAppGrant[];
}
/**
 * Configuration schema used by Cordis and the Settings provider.
 *
 * Key order is the settings-document order users and the plugin panel see, so
 * the groups below are spread back in that order.
 */
export declare const Config: Schema<ComputerUseConfig>;
/** Envelope-checked TTLs, action deadline, and settle/wait budgets. */
export interface ResolvedComputerUseBudget {
    observationTtlMs: number;
    confirmationTtlMs: number;
    actionTimeoutMs: number;
    settleMs: number;
    maxSettleMs: number;
    maxWaitMs: number;
}
/** Envelope-checked observation and screenshot limits. */
export interface ResolvedComputerUseLimits {
    maxNodes: number;
    maxDepth: number;
    maxTextBytes: number;
    maxScreenshotBytes: number;
}
/** Envelope-checked interaction policy with every default already applied. */
export interface ResolvedComputerUseInteraction {
    focusPolicy: ComputerUseFocusPolicy;
    keyboardPolicy: ComputerUseKeyboardPolicy;
    pointerInputPolicy: ComputerUsePointerInputPolicy;
    cursorVisualization: ComputerUseCursorVisualization;
    cursorSpeedPxPerSecond: number;
    cursorAccelerationPxPerSecondSquared: number;
    cursorClickDelayMs: number;
    cursorAutoHideMs: number;
}
/** One application grant after normalization: `control` implies `read`. */
export interface ResolvedComputerUseGrant {
    bundleId: string;
    read: boolean;
    control: boolean;
}
/**
 * Fully defaulted configuration consumed at runtime: the four groups below are
 * the four clusters `resolveConfig` validates, each already bounded.
 */
export type ResolvedComputerUseConfig = ResolvedComputerUseBudget & ResolvedComputerUseLimits & {
    artifactRoot: string;
    helper: {
        path?: string;
        allowSourceBuild: boolean;
    };
    interaction: ResolvedComputerUseInteraction;
    allowAllApps: boolean;
    grants: ResolvedComputerUseGrant[];
};
//# sourceMappingURL=tuning.schema.d.ts.map