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

import type { Translate } from './copy.en.ts'
import { numericIssueOf, type NumericKey } from './guard.bounds.ts'
import { artifactIssueOf, crossIssueOf, parseGrants } from './guard.issues.ts'

/**
 * Settings document shape the client rewrites; the host validates it again on
 * save. Members are alphabetical so an added field has an obvious home, and all
 * of them are optional: the client sends only what the form actually carries.
 */
export interface ConfigValue {
  actionTimeoutMs?: number
  allowAllApps?: boolean
  artifactRoot?: string
  confirmationTtlMs?: number
  grants?: Array<{ bundleId: string; read?: boolean; control?: boolean }>
  helper?: { path?: string; allowSourceBuild?: boolean }
  interaction?: {
    cursorAccelerationPxPerSecondSquared?: number
    cursorAutoHideMs?: number
    cursorClickDelayMs?: number
    /** Retired host field, kept in the shape so an older document still round-trips. */
    cursorMotionMs?: number
    cursorSpeedPxPerSecond?: number
    cursorVisualization?: 'hidden' | 'visible'
    focusPolicy?: 'preserve' | 'activate'
    keyboardPolicy?: 'preserve' | 'activate'
    pointerInputPolicy?: 'deny' | 'targeted'
  }
  maxDepth?: number
  maxNodes?: number
  maxScreenshotBytes?: number
  maxSettleMs?: number
  maxTextBytes?: number
  maxWaitMs?: number
  observationTtlMs?: number
  settleMs?: number
}

/**
 * One editable value per settings field: form text for every number and text
 * input, the real union for enums, the real flag for toggles. Also alphabetical,
 * for the same reason as the document above.
 */
export interface Draft {
  actionTimeoutMs: string
  allowAllApps: boolean
  allowSourceBuild: boolean
  artifactRoot: string
  confirmationTtlMs: string
  cursorAccelerationPxPerSecondSquared: string
  cursorAutoHideMs: string
  cursorClickDelayMs: string
  cursorSpeedPxPerSecond: string
  cursorVisualization: 'hidden' | 'visible'
  focusPolicy: 'preserve' | 'activate'
  grants: string
  helperPath: string
  keyboardPolicy: 'preserve' | 'activate'
  maxDepth: string
  maxNodes: string
  maxScreenshotBytes: string
  maxSettleMs: string
  maxTextBytes: string
  maxWaitMs: string
  observationTtlMs: string
  pointerInputPolicy: 'deny' | 'targeted'
  settleMs: string
}

/** The four cursor-motion fields, which live under `interaction` in the document. */
type CursorKey = Extract<NumericKey, `cursor${string}`>

/** The numeric fields stored at the document root. */
type RootKey = Exclude<NumericKey, CursorKey>

/** Host fallbacks for the root-level numeric fields; the envelope itself lives in tuning.bounds.ts. */
const ROOT_FALLBACK: Record<RootKey, number> = {
  observationTtlMs: 0,
  confirmationTtlMs: 300000,
  actionTimeoutMs: 15000,
  settleMs: 250,
  maxSettleMs: 5000,
  maxWaitMs: 30000,
  maxNodes: 500,
  maxDepth: 14,
  maxTextBytes: 64000,
  maxScreenshotBytes: 33554432,
}

/** Host fallbacks for the cursor-motion fields. */
const CURSOR_FALLBACK: Record<CursorKey, number> = {
  cursorSpeedPxPerSecond: 1600,
  cursorAccelerationPxPerSecondSquared: 6000,
  cursorClickDelayMs: 90,
  cursorAutoHideMs: 0,
}

const DEFAULT_ARTIFACT_ROOT = '.dsh-computer-use/artifacts'

/** Form text for one optional number, using the host default when the document omits it. */
function fieldText(value: number | undefined, fallback: number): string {
  return String(value ?? fallback)
}

/** One-line-per-rule rendering of the stored grants, as the textarea shows them. */
function grantsToText(grants: ConfigValue['grants']): string {
  return (grants ?? []).map(rule => `${rule.bundleId} ${rule.control === true ? 'read,control' : 'read'}`).join('\n')
}

/** Project a saved document into the editable draft the form renders. */
export function draftOf(value: ConfigValue): Draft {
  const motion = value.interaction
  const helper = value.helper
  return {
    observationTtlMs: fieldText(value.observationTtlMs, ROOT_FALLBACK.observationTtlMs),
    confirmationTtlMs: fieldText(value.confirmationTtlMs, ROOT_FALLBACK.confirmationTtlMs),
    actionTimeoutMs: fieldText(value.actionTimeoutMs, ROOT_FALLBACK.actionTimeoutMs),
    settleMs: fieldText(value.settleMs, ROOT_FALLBACK.settleMs),
    maxSettleMs: fieldText(value.maxSettleMs, ROOT_FALLBACK.maxSettleMs),
    maxWaitMs: fieldText(value.maxWaitMs, ROOT_FALLBACK.maxWaitMs),
    maxNodes: fieldText(value.maxNodes, ROOT_FALLBACK.maxNodes),
    maxDepth: fieldText(value.maxDepth, ROOT_FALLBACK.maxDepth),
    maxTextBytes: fieldText(value.maxTextBytes, ROOT_FALLBACK.maxTextBytes),
    maxScreenshotBytes: fieldText(value.maxScreenshotBytes, ROOT_FALLBACK.maxScreenshotBytes),
    artifactRoot: value.artifactRoot ?? DEFAULT_ARTIFACT_ROOT,
    helperPath: helper?.path ?? '',
    allowSourceBuild: helper?.allowSourceBuild ?? false,
    focusPolicy: motion?.focusPolicy ?? 'preserve',
    keyboardPolicy: motion?.keyboardPolicy ?? 'preserve',
    pointerInputPolicy: motion?.pointerInputPolicy ?? 'targeted',
    cursorVisualization: motion?.cursorVisualization ?? 'visible',
    cursorSpeedPxPerSecond: fieldText(motion?.cursorSpeedPxPerSecond, CURSOR_FALLBACK.cursorSpeedPxPerSecond),
    cursorAccelerationPxPerSecondSquared: fieldText(motion?.cursorAccelerationPxPerSecondSquared, CURSOR_FALLBACK.cursorAccelerationPxPerSecondSquared),
    cursorClickDelayMs: fieldText(motion?.cursorClickDelayMs, CURSOR_FALLBACK.cursorClickDelayMs),
    cursorAutoHideMs: fieldText(motion?.cursorAutoHideMs, CURSOR_FALLBACK.cursorAutoHideMs),
    allowAllApps: value.allowAllApps ?? false,
    grants: grantsToText(value.grants),
  }
}

/**
 * Canonical form of one draft: the exact JSON the save path would send. Returns
 * undefined when the draft cannot be saved at all, which callers must read as
 * "not comparable with the server" rather than as "unchanged".
 */
export function serializeDraft(draft: Draft, t: Translate): string | undefined {
  let encoded: string
  try {
    encoded = JSON.stringify(configOf(draft, t))
  } catch {
    return undefined
  }
  return encoded
}

/** Parse the grants textarea, raising the localized complaint when it is not saveable. */
function requiredGrants(text: string, t: Translate): Array<{ bundleId: string; read: boolean; control: boolean }> {
  const parsed = parseGrants(text, t)
  if (parsed.value === undefined) throw new Error(parsed.issue ?? t('grantLine', { line: text }))
  return parsed.value
}

/**
 * Build the host-shaped document for one draft.
 *
 * Every numeric field goes through the same guard the inline hints use, so a
 * value the user can see flagged can never reach the wire; the first failing
 * field throws with the same localized message the form shows beside it.
 */
export function configOf(draft: Draft, t: Translate): ConfigValue {
  const integer = (key: NumericKey): number => {
    const issue = numericIssueOf(draft, key, t)
    if (issue !== undefined) throw new Error(issue)
    return Number(draft[key])
  }
  const settleConflict = crossIssueOf(draft, t)
  if (settleConflict !== undefined) throw new Error(settleConflict)
  const artifactConflict = artifactIssueOf(draft, t)
  if (artifactConflict !== undefined) throw new Error(artifactConflict)
  const grants = requiredGrants(draft.grants, t)
  const helperPath = draft.helperPath.trim()
  return {
    actionTimeoutMs: integer('actionTimeoutMs'),
    allowAllApps: draft.allowAllApps,
    artifactRoot: draft.artifactRoot.trim(),
    confirmationTtlMs: integer('confirmationTtlMs'),
    grants,
    helper: {
      ...(helperPath.length === 0 ? {} : { path: helperPath }),
      allowSourceBuild: draft.allowSourceBuild,
    },
    interaction: {
      cursorAccelerationPxPerSecondSquared: integer('cursorAccelerationPxPerSecondSquared'),
      cursorAutoHideMs: integer('cursorAutoHideMs'),
      cursorClickDelayMs: integer('cursorClickDelayMs'),
      cursorSpeedPxPerSecond: integer('cursorSpeedPxPerSecond'),
      cursorVisualization: draft.cursorVisualization,
      focusPolicy: draft.focusPolicy,
      keyboardPolicy: draft.keyboardPolicy,
      pointerInputPolicy: draft.pointerInputPolicy,
    },
    maxDepth: integer('maxDepth'),
    maxNodes: integer('maxNodes'),
    maxScreenshotBytes: integer('maxScreenshotBytes'),
    maxSettleMs: integer('maxSettleMs'),
    maxTextBytes: integer('maxTextBytes'),
    maxWaitMs: integer('maxWaitMs'),
    observationTtlMs: integer('observationTtlMs'),
    settleMs: integer('settleMs'),
  }
}
