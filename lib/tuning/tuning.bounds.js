/**
 * Tuning bounds: the numeric envelope of every editable settings field.
 *
 * Pure data plus pure predicates — no imports, no dependencies, nothing client-side.
 * The values mirror `resolveConfig` in {@link file://../tuning/tuning.normalize.ts}
 * exactly and are never widened. `observationTtlMs` is the single field whose
 * envelope carries a second legal value: `0` disables expiry instead of timing one.
 *
 * The deprecated host-only `interaction.cursorMotionMs` envelope (0–2000) is
 * deliberately absent: no settings field exposes it, so no draft guard needs it.
 */
/** Host envelope per numeric field: the bounds `resolveConfig` enforces, never widened for the draft guard. */
export const NUMERIC_BOUNDS = {
    observationTtlMs: { min: 1000, max: 86400000, allowZero: true },
    confirmationTtlMs: { min: 1000, max: 900000, allowZero: false },
    actionTimeoutMs: { min: 1000, max: 120000, allowZero: false },
    settleMs: { min: 0, max: 10000, allowZero: false },
    maxSettleMs: { min: 100, max: 60000, allowZero: false },
    maxWaitMs: { min: 100, max: 600000, allowZero: false },
    maxNodes: { min: 10, max: 5000, allowZero: false },
    maxDepth: { min: 1, max: 64, allowZero: false },
    maxTextBytes: { min: 1024, max: 1048576, allowZero: false },
    maxScreenshotBytes: { min: 1024, max: 268435456, allowZero: false },
    cursorSpeedPxPerSecond: { min: 100, max: 50000, allowZero: false },
    cursorAccelerationPxPerSecondSquared: { min: 100, max: 500000, allowZero: false },
    cursorClickDelayMs: { min: 0, max: 1000, allowZero: false },
    cursorAutoHideMs: { min: 0, max: 30000, allowZero: false },
};
/** Read the envelope of one numeric field. */
export function boundsOf(field) {
    return NUMERIC_BOUNDS[field];
}
/** Whether one number is legal for the field: an in-range integer, or that field's documented zero escape hatch. */
export function withinBounds(field, value) {
    const bound = NUMERIC_BOUNDS[field];
    if (bound.allowZero && value === 0)
        return true;
    return Number.isInteger(value) && value >= bound.min && value <= bound.max;
}
//# sourceMappingURL=tuning.bounds.js.map