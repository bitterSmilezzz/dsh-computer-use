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
/** Inclusive integer envelope accepted for one numeric settings field. */
export interface NumericBound {
    min: number;
    max: number;
    /** True when the field's documented `0` escape hatch is legal in addition to `min`…`max`. */
    allowZero: boolean;
}
/** Numeric settings fields whose value must be an integer inside a fixed envelope. */
export type BoundedNumericField = 'observationTtlMs' | 'confirmationTtlMs' | 'actionTimeoutMs' | 'settleMs' | 'maxSettleMs' | 'maxWaitMs' | 'maxNodes' | 'maxDepth' | 'maxTextBytes' | 'maxScreenshotBytes' | 'cursorSpeedPxPerSecond' | 'cursorAccelerationPxPerSecondSquared' | 'cursorClickDelayMs' | 'cursorAutoHideMs';
/** Host envelope per numeric field: the bounds `resolveConfig` enforces, never widened for the draft guard. */
export declare const NUMERIC_BOUNDS: Record<BoundedNumericField, NumericBound>;
/** Read the envelope of one numeric field. */
export declare function boundsOf(field: BoundedNumericField): NumericBound;
/** Whether one number is legal for the field: an in-range integer, or that field's documented zero escape hatch. */
export declare function withinBounds(field: BoundedNumericField, value: number): boolean;
//# sourceMappingURL=tuning.bounds.d.ts.map