/**
 * Client bounds — the numeric envelope of the editable settings fields.
 *
 * The envelope itself is not restated here: `tuning/tuning.bounds.ts` holds the
 * one table `resolveConfig` enforces on the host half, and the browser half
 * imports the very same object, so the two can never drift apart. Only the
 * localized wording for a rejected value lives in this module.
 */

import type { BoundedNumericField, NumericBound } from '../tuning/tuning.bounds.ts'
import { NUMERIC_BOUNDS } from '../tuning/tuning.bounds.ts'
import type { LocaleKey, Translate } from './copy.en.ts'
import type { Draft } from './state.draft.ts'

/**
 * Read one bounded integer, or raise the caller's localized message.
 *
 * The caller supplies the wording, which keeps this helper free of any locale
 * dependency while still being the single gate every numeric field passes
 * through.
 */
export function integerInRange(
  value: string, field: string,
  min: number, max: number,
  formatError: (field: string, min: number, max: number) => string,
): number {
  const parsed = Number(value)
  const acceptable = Number.isSafeInteger(parsed) && parsed >= min && parsed <= max
  if (acceptable) return parsed
  throw new Error(formatError(field, min, max))
}

/** Numeric draft fields whose envelope mirrors the host resolver, never widened. */
export type NumericKey = BoundedNumericField

/** The host envelope, re-exported for the section that renders the controls. */
export const NUMERIC: Record<NumericKey, NumericBound> = NUMERIC_BOUNDS

/**
 * Label key per numeric field, so validation messages name the field the user
 * sees. Alphabetical, like the envelope it mirrors.
 */
const FIELD_LABEL: Record<NumericKey, LocaleKey> = {
  actionTimeoutMs: 'actionTimeout',
  confirmationTtlMs: 'confirmationTtl',
  cursorAccelerationPxPerSecondSquared: 'cursorAcceleration',
  cursorAutoHideMs: 'cursorAutoHide',
  cursorClickDelayMs: 'cursorClickDelay',
  cursorSpeedPxPerSecond: 'cursorSpeed',
  maxDepth: 'maxDepth',
  maxNodes: 'maxNodes',
  maxScreenshotBytes: 'maxScreenshot',
  maxSettleMs: 'maxSettle',
  maxTextBytes: 'maxText',
  maxWaitMs: 'maxWait',
  observationTtlMs: 'ttl',
  settleMs: 'settle',
}

/**
 * Whether the raw draft text is a legal value for the field: a non-empty
 * in-range safe integer, plus the single documented escape hatch — `0` on the
 * one field whose envelope carries a second legal value.
 */
function acceptableText(raw: string, bound: NumericBound): boolean {
  if (raw.length === 0) return false
  const parsed = Number(raw)
  if (bound.allowZero && parsed === 0) return true
  return Number.isSafeInteger(parsed) && parsed >= bound.min && parsed <= bound.max
}

/** The localized complaint for one numeric field, or undefined when the text is legal. */
export function numericIssueOf(draft: Draft, key: NumericKey, t: Translate): string | undefined {
  const bound = NUMERIC_BOUNDS[key]
  if (acceptableText(draft[key].trim(), bound)) return undefined
  return t('numberRange', { field: t(FIELD_LABEL[key]), min: bound.min, max: bound.max })
}
