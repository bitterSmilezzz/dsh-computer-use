/**
 * Client bounds — the numeric envelope of the editable settings fields.
 *
 * The envelope itself is not restated here: `tuning/tuning.bounds.ts` holds the
 * one table `resolveConfig` enforces on the host half, and the browser half
 * imports the very same object, so the two can never drift apart. Only the
 * localized wording for a rejected value lives in this module.
 */
import type { BoundedNumericField, NumericBound } from '../tuning/tuning.bounds.ts';
import type { Translate } from './copy.en.ts';
import type { Draft } from './state.draft.ts';
/**
 * Read one bounded integer, or raise the caller's localized message.
 *
 * The caller supplies the wording, which keeps this helper free of any locale
 * dependency while still being the single gate every numeric field passes
 * through.
 */
export declare function integerInRange(value: string, field: string, min: number, max: number, formatError: (field: string, min: number, max: number) => string): number;
/** Numeric draft fields whose envelope mirrors the host resolver, never widened. */
export type NumericKey = BoundedNumericField;
/** The host envelope, re-exported for the section that renders the controls. */
export declare const NUMERIC: Record<NumericKey, NumericBound>;
/** The localized complaint for one numeric field, or undefined when the text is legal. */
export declare function numericIssueOf(draft: Draft, key: NumericKey, t: Translate): string | undefined;
//# sourceMappingURL=guard.bounds.d.ts.map