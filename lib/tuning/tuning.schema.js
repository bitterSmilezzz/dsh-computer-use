/**
 * Tuning schema: the persisted Settings document, the in-memory shape callers
 * hand in, and the fully-defaulted shape the host half runs on.
 *
 * The field definitions come first, the Cordis/Settings schema assembled from
 * them comes second. Declarative defaults live here; the numeric envelopes that
 * bound them live in `tuning.bounds.ts` for the browser half and are enforced
 * here by `tuning.normalize.ts` for the host half.
 */
import z from '@deepseek-ai/schemastery';
/**
 * Settings-document namespace owned by this package.
 *
 * The literal is branded at the type level only. DSH 0.1.2-alpha.2 ("move shared
 * values behind service APIs") stopped exporting a `settingsNamespace()` helper
 * and kept the runtime brand private; `ctx.settings.register` validates the
 * plain string at runtime, and the brand asserted here is what narrows that
 * string back to a `SettingsNamespace` for the generic.
 */
export const COMPUTER_USE_SETTINGS_NAMESPACE = 'computer-use';
/** How long one provider observation stays usable, how long a confirmation token lives, and how long one action may take. */
const TIMING_SCHEMA = {
    observationTtlMs: z.number().default(0),
    confirmationTtlMs: z.number().default(300_000),
    actionTimeoutMs: z.number().default(15_000),
};
/** The post-action settle budget: the interval between checks, the ceiling it may run to, and the wait ceiling above both. */
const SETTLEMENT_SCHEMA = {
    settleMs: z.number().default(250),
    maxSettleMs: z.number().default(5_000),
    maxWaitMs: z.number().default(30_000),
};
/** How much of one provider tree is read before it is treated as truncated. */
const OBSERVATION_SCHEMA = {
    maxNodes: z.number().default(500),
    maxDepth: z.number().default(14),
    maxTextBytes: z.number().default(64_000),
    maxScreenshotBytes: z.number().default(33_554_432),
};
/** Foreground, keyboard, pointer, and Agent cursor policy for one action. */
const INTERACTION_SCHEMA = z.object({
    focusPolicy: z.union(['preserve', 'activate']).default('preserve'),
    keyboardPolicy: z.union(['preserve', 'activate']).default('preserve'),
    pointerInputPolicy: z.union(['deny', 'targeted']).default('targeted'),
    cursorVisualization: z.union(['hidden', 'visible']).default('visible'),
    cursorMotionMs: z.number(),
    cursorSpeedPxPerSecond: z.number().default(1_600),
    cursorAccelerationPxPerSecondSquared: z.number().default(6_000),
    cursorClickDelayMs: z.number().default(90),
    cursorAutoHideMs: z.number().default(0),
});
/** How the helper is located, and whether a missing packaged helper may be built from source. */
const HELPER_SCHEMA = z.object({
    path: z.string(),
    allowSourceBuild: z.boolean().default(false),
});
/** Which applications the service may read and control. */
const ACCESS_SCHEMA = {
    allowAllApps: z.boolean().default(false),
    grants: z.array(z.object({
        bundleId: z.string(),
        read: z.boolean().default(false),
        control: z.boolean().default(false),
    })).default([]),
};
/**
 * Configuration schema used by Cordis and the Settings provider.
 *
 * Key order is the settings-document order users and the plugin panel see, so
 * the groups below are spread back in that order.
 */
export const Config = z.object({
    ...TIMING_SCHEMA,
    ...SETTLEMENT_SCHEMA,
    ...OBSERVATION_SCHEMA,
    artifactRoot: z.string().default('.dsh-computer-use/artifacts'),
    helper: HELPER_SCHEMA,
    interaction: INTERACTION_SCHEMA,
    ...ACCESS_SCHEMA,
});
//# sourceMappingURL=tuning.schema.js.map