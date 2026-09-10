/**
 * Client issues — the text-shaped and cross-field rules a draft must satisfy
 * before the browser half is willing to build a save payload.
 *
 * Every rule here is a mirror of a host-side rule from `tuning/tuning.normalize.ts`;
 * the wording is localized, the acceptance is not. Keeping the mirrors exact is
 * what makes an inline hint mean the same thing as a rejected save.
 */

import type { Translate } from './copy.en.ts'
import type { Draft } from './state.draft.ts'
import { numericIssueOf } from './guard.bounds.ts'

/** One parsed app rule, in the shape the host document expects. */
interface Grant {
  bundleId: string
  read: boolean
  control: boolean
}

/** Host rule: the settlement interval may not sit above the settlement ceiling. */
export function crossIssueOf(draft: Draft, t: Translate): string | undefined {
  const interval = numericIssueOf(draft, 'settleMs', t)
  const ceiling = numericIssueOf(draft, 'maxSettleMs', t)
  if (interval !== undefined || ceiling !== undefined) return undefined
  if (Number(draft.settleMs) <= Number(draft.maxSettleMs)) return undefined
  return t('settleExceedsMax', { settle: t('settle'), max: t('maxSettle') })
}

/** Host rule: the artifact directory is a non-empty workspace-relative path. */
export function artifactIssueOf(draft: Draft, t: Translate): string | undefined {
  const path = draft.artifactRoot.trim()
  const rejected = path.length === 0 || path.startsWith('/') || path.split(/[\\/]+/u).includes('..')
  return rejected ? t('artifactRootInvalid') : undefined
}

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
export function parseGrants(
  text: string,
  t: Translate,
): { value?: Array<{ bundleId: string; read: boolean; control: boolean }>; issue?: string } {
  const value: Grant[] = []
  const seen = new Set<string>()
  for (const raw of text.split(/\r?\n/u)) {
    const line = raw.trim()
    if (line.length === 0) continue
    const tokens = line.split(/\s+/u)
    const scopeToken = tokens.at(-1)
    if (tokens.length < 2 || scopeToken === undefined) return { issue: t('grantLine', { line }) }
    const scopes = scopeToken.split(',')
    if (!scopes.every(scope => scope === 'read' || scope === 'control')) return { issue: t('grantScope', { line }) }
    const bundleId = tokens.slice(0, -1).join(' ')
    const wildcard = bundleId.includes('*')
    if (wildcard) return { issue: t('grantBundleId', { line }) }
    const repeated = seen.has(bundleId)
    if (repeated) return { issue: t('grantDuplicate', { bundleId }) }
    seen.add(bundleId)
    const control = scopes.includes('control')
    value.push({ bundleId, read: true, control })
  }
  return { value }
}
