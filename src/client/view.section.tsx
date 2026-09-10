/**
 * Settings section — the Computer Use card rendered inside the DSH Settings page.
 *
 * One Settings document drives the whole card. The macOS permission tiles and
 * the everyday "every app" decision come first, the save bar follows, and the
 * technical half — input routing, numeric ceilings, cursor motion, helper
 * provenance, per-app rules — sits behind a single Advanced disclosure so the
 * common flow never has to scroll past it.
 */

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { LocaleKey, Translate } from './copy.en.ts'
import { NUMERIC, numericIssueOf, type NumericKey } from './guard.bounds.ts'
import { artifactIssueOf, crossIssueOf, parseGrants } from './guard.issues.ts'
import { configOf, draftOf, serializeDraft, type Draft } from './state.draft.ts'
import type { ComputerUseSettingsController, Snapshot } from './state.controller.ts'

/** Slot props plus the controller and translator `apply` injects next to them. */
type SectionProps = PropsRuntime<'settings.section'> & { controller?: ComputerUseSettingsController; t?: Translate }

/** ARIA wiring a labelled control needs; the render prop below hands these down. */
interface Wiring {
  id: string
  'aria-describedby'?: string
}

const describe = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/**
 * One labelled control.
 *
 * The validation message is *described by* the control instead of being nested
 * inside its `<label>`, where assistive tech would fold it into the control's
 * accessible name; `htmlFor` keeps the click-to-focus behaviour that a wrapping
 * label used to provide.
 */
function LabeledControl({ label, issue, children }: {
  label: string
  issue?: string | undefined
  children: (wiring: Wiring) => ReactNode
}) {
  const controlId = useId()
  const noteId = `${controlId}-note`
  const wiring: Wiring = issue === undefined ? { id: controlId } : { id: controlId, 'aria-describedby': noteId }
  return <div className="dcu-field" data-invalid={issue === undefined ? undefined : true}>
    <label htmlFor={controlId}>{label}</label>
    {children(wiring)}
    {issue === undefined ? null : <span id={noteId} className="dcu-field-error" role="alert">{issue}</span>}
  </div>
}

type PermissionKind = 'accessibility' | 'screen-recording'

/** One macOS permission, with the button that opens the matching system pane. */
function PermissionTile({ title, status, kind, controller, t }: {
  title: string
  status: string
  kind: PermissionKind
  controller: ComputerUseSettingsController
  t: Translate
}) {
  const allowed = status === 'granted'
  return <article className="dcu-permission" data-granted={allowed || undefined}>
    <div><span>{title}</span><strong>{allowed ? t('granted') : t('denied')}</strong></div>
    {allowed ? null : <Button variant="outline" onClick={() => { void controller.action('open-settings', { kind }, 'open') }}>{t('openSettings')}</Button>}
  </article>
}

/** Everything the access overview renders: live permission state plus the "every app" flag. */
interface AccessOverviewProps {
  allowAllApps: boolean
  controller: ComputerUseSettingsController
  onAllowAllApps: (value: boolean) => void
  provider: Snapshot['provider']
  t: Translate
}

/** Permission diagnostics plus the everyday "every app" decision, above the save bar. */
function AccessOverview({ allowAllApps, controller, onAllowAllApps, provider, t }: AccessOverviewProps) {
  return <>
    <section className="dcu-panel">
      <div className="dcu-panel-title">
        <h3>{t('privacy')}</h3>
        <Button variant="outline" onClick={() => { void controller.action('health', {}, 'health') }}>{t('refresh')}</Button>
      </div>
      <div className="dcu-permissions">
        <PermissionTile title={t('accessibility')} status={provider.accessibility} kind="accessibility" controller={controller} t={t} />
        <PermissionTile title={t('screenRecording')} status={provider.screenRecording} kind="screen-recording" controller={controller} t={t} />
      </div>
    </section>
    <section className="dcu-panel dcu-essential">
      <div className="dcu-panel-title"><div><h3>{t('access')}</h3><p>{t('accessHint')}</p></div></div>
      <label className="dcu-check dcu-check-primary">
        <input type="checkbox" checked={allowAllApps} aria-describedby="dcu-allow-all-hint" onChange={event => onAllowAllApps(event.target.checked)} />
        <span><strong>{t('allowAllApps')}</strong><small id="dcu-allow-all-hint">{t('allowAllAppsHint')}</small></span>
      </label>
    </section>
  </>
}

/** One integer field, guarded by the same envelope the host resolver enforces. */
function NumberRow({ field, label, draft, onEdit, t }: {
  field: NumericKey
  label: LocaleKey
  draft: Draft
  onEdit: (field: NumericKey, next: string) => void
  t: Translate
}) {
  const bound = NUMERIC[field]
  const issue = numericIssueOf(draft, field, t) ?? (field === 'settleMs' ? crossIssueOf(draft, t) : undefined)
  return <LabeledControl label={t(label)} issue={issue}>{(wiring) => (
    <Input
      {...wiring}
      type="number"
      min={bound.allowZero ? 0 : bound.min}
      max={bound.max}
      step={1}
      value={draft[field]}
      aria-invalid={issue !== undefined}
      onChange={event => onEdit(field, event.target.value)}
    />
  )}</LabeledControl>
}

type ChoiceField = 'focusPolicy' | 'keyboardPolicy' | 'pointerInputPolicy' | 'cursorVisualization'

/** One enumerated field: a label and the values it offers, in display order. */
interface ChoiceRow {
  field: ChoiceField
  label: LocaleKey
  options: ReadonlyArray<{ value: string; label: LocaleKey }>
}

const ROUTING_ROWS: ReadonlyArray<ChoiceRow> = [
  { field: 'focusPolicy', label: 'focusPolicy', options: [{ value: 'preserve', label: 'focusPreserve' }, { value: 'activate', label: 'focusActivate' }] },
  { field: 'keyboardPolicy', label: 'keyboardPolicy', options: [{ value: 'preserve', label: 'keyboardPreserve' }, { value: 'activate', label: 'keyboardActivate' }] },
  { field: 'pointerInputPolicy', label: 'pointerInputPolicy', options: [{ value: 'deny', label: 'pointerDeny' }, { value: 'targeted', label: 'pointerAllow' }] },
  { field: 'cursorVisualization', label: 'cursorVisualization', options: [{ value: 'visible', label: 'cursorVisible' }, { value: 'hidden', label: 'cursorHidden' }] },
]

function SelectRow({ row, value, onEdit, t }: {
  row: ChoiceRow
  value: string
  onEdit: (field: ChoiceField, next: string) => void
  t: Translate
}) {
  return <LabeledControl label={t(row.label)}>{(wiring) => (
    <select {...wiring} value={value} onChange={event => onEdit(row.field, event.target.value)}>
      {row.options.map(option => <option key={option.value} value={option.value}>{t(option.label)}</option>)}
    </select>
  )}</LabeledControl>
}

/** Numeric rows in the Observation limits panel, in render order. */
const LIMIT_ROWS: ReadonlyArray<{ field: NumericKey; label: LocaleKey }> = [
  { field: 'observationTtlMs', label: 'ttl' },
  { field: 'confirmationTtlMs', label: 'confirmationTtl' },
  { field: 'actionTimeoutMs', label: 'actionTimeout' },
  { field: 'settleMs', label: 'settle' },
  { field: 'maxSettleMs', label: 'maxSettle' },
  { field: 'maxWaitMs', label: 'maxWait' },
  { field: 'maxNodes', label: 'maxNodes' },
  { field: 'maxDepth', label: 'maxDepth' },
  { field: 'maxTextBytes', label: 'maxText' },
  { field: 'maxScreenshotBytes', label: 'maxScreenshot' },
]

/** Numeric rows in the Agent cursor motion panel, in render order. */
const MOTION_ROWS: ReadonlyArray<{ field: NumericKey; label: LocaleKey }> = [
  { field: 'cursorSpeedPxPerSecond', label: 'cursorSpeed' },
  { field: 'cursorAccelerationPxPerSecondSquared', label: 'cursorAcceleration' },
  { field: 'cursorClickDelayMs', label: 'cursorClickDelay' },
  { field: 'cursorAutoHideMs', label: 'cursorAutoHide' },
]

/**
 * One bordered settings panel with an optional hint line and an optional action
 * on the title row. The heading row keeps the exact DOM the styles expect: a
 * bare `<h3>` when there is no hint, a `<div>` wrapper when there is.
 */
function Panel({ heading, hint, action, children }: {
  heading: string
  hint?: string | undefined
  action?: ReactNode
  children: ReactNode
}) {
  return <section className="dcu-panel">
    <div className="dcu-panel-title">
      {hint === undefined ? <h3>{heading}</h3> : <div><h3>{heading}</h3><p>{hint}</p></div>}
      {action}
    </div>
    {children}
  </section>
}

/** The save / revert strip; it appears twice in the card, sticky at the top and inline at the bottom. */
function SaveBar({ where, dirty, blocked, applying, writable, onSave, onDiscard, t }: {
  where: 'above' | 'below'
  dirty: boolean
  blocked: boolean
  applying: boolean
  writable: boolean
  onSave: () => void
  onDiscard: () => void
  t: Translate
}) {
  return <div className="dcu-actions" data-place={where} data-dirty={dirty || undefined}>
    <Button variant="primary" disabled={!writable || !dirty || blocked} aria-busy={applying} onClick={onSave}>{applying ? t('saving') : t('save')}</Button>
    {dirty ? <span className="dcu-dirty" role="status">{t('unsaved')}</span> : null}
    {dirty ? <Button variant="outline" disabled={blocked} onClick={onDiscard}>{t('discard')}</Button> : null}
  </div>
}

function SettingsBody({ controller, t }: { controller: ComputerUseSettingsController; t: Translate }) {
  const state = useSyncExternalStore(controller.subscribe, controller.snapshot, controller.snapshot)
  const [draft, setDraft] = useState<Draft>()
  const [draftError, setDraftError] = useState<string>()

  useEffect(() => { if (state.status === 'idle') void controller.load() }, [controller, state.status])

  // Draft sync. The snapshot's own serialization is the clean baseline, and the
  // baseline from the previous pass says whether the draft on screen is still
  // clean: a dirty draft keeps the user's edits, a clean one follows the
  // server, so a health refresh or an external document update never discards
  // work silently. A snapshot that cannot be serialized yields no baseline at
  // all, and "no baseline" must never read as "clean" — the draft cannot be
  // proven equal to the server, so the user's text wins.
  const documentValue = state.snapshot?.settings.value
  const cleanBaseline = documentValue === undefined ? undefined : serializeDraft(draftOf(documentValue), t)
  const lastBaseline = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (documentValue === undefined) return
    const incoming = draftOf(documentValue)
    const incomingBaseline = serializeDraft(incoming, t)
    const previous = lastBaseline.current
    if (incomingBaseline !== undefined) lastBaseline.current = incomingBaseline
    setDraft(current => {
      if (current === undefined) return incoming
      if (previous === undefined || incomingBaseline === undefined) return current
      return serializeDraft(current, t) === previous ? incoming : current
    })
  }, [documentValue, t])

  if (state.snapshot === undefined || draft === undefined) {
    return <div className="dcu-settings">
      <div className="dcu-panel">{state.error ?? t('loading')}</div>
      {state.status === 'error' ? <Button variant="outline" onClick={() => { void controller.load() }}>{t('retry')}</Button> : null}
    </div>
  }

  const snapshot = state.snapshot
  const provider = snapshot.provider
  // An unrepresentable baseline means the server value can neither be compared
  // with nor produced from this form, so the card is dirty rather than latching
  // Save behind a comparison that can never run.
  const dirty = cleanBaseline === undefined || serializeDraft(draft, t) !== cleanBaseline
  const applying = state.action === 'save'
  const blocked = state.action !== undefined
  const patch = <K extends keyof Draft>(key: K, value: Draft[K]): void => {
    setDraft(current => (current === undefined ? current : { ...current, [key]: value }))
  }
  const revert = (): void => {
    setDraftError(undefined)
    setDraft(draftOf(snapshot.settings.value))
  }
  const submit = (): void => {
    try {
      setDraftError(undefined)
      void controller.action('save', { expectedRevision: snapshot.settings.revision, value: configOf(draft, t) }, 'save')
    } catch (error) {
      setDraftError(describe(error))
    }
  }

  const grantsIssue = parseGrants(draft.grants, t).issue
  const artifactIssue = artifactIssueOf(draft, t)

  const notices: ReactNode[] = []
  if (provider.lastError !== undefined) notices.push(<div key="provider" className="dcu-alert error" role="alert">{provider.lastError}</div>)
  if (!snapshot.writable) notices.push(<div key="readonly" className="dcu-alert warning" role="status">{t('readOnly')}</div>)
  if (state.error !== undefined || draftError !== undefined) notices.push(<div key="failure" className="dcu-alert error" role="alert">{draftError ?? state.error}</div>)
  if (state.notice === 'saved' && !dirty) notices.push(<div key="saved" className="dcu-alert ok" role="status">{t('saved')}</div>)

  const saveBar = (where: 'above' | 'below'): ReactNode => (
    <SaveBar
      where={where}
      dirty={dirty}
      blocked={blocked}
      applying={applying}
      writable={snapshot.writable}
      onSave={submit}
      onDiscard={revert}
      t={t}
    />
  )

  return <div className="dcu-settings">
    {notices}
    <AccessOverview provider={provider} allowAllApps={draft.allowAllApps} onAllowAllApps={value => patch('allowAllApps', value)} controller={controller} t={t} />
    {saveBar('above')}
    <details className="dcu-advanced">
      <summary>
        <span>{t('advanced')}</span>
        <small>{t('advancedHint')}</small>
      </summary>
      <div className="dcu-advanced-body">
        <Panel heading={t('interaction')} hint={t('interactionHint')}>
          <div className="dcu-grid">
            {ROUTING_ROWS.map(row => (
              <SelectRow key={row.field} row={row} value={draft[row.field]} onEdit={(field, next) => patch(field, next as never)} t={t} />
            ))}
          </div>
        </Panel>
        <Panel heading={t('limits')}>
          <div className="dcu-grid">
            {LIMIT_ROWS.map(row => (
              <NumberRow key={row.field} field={row.field} label={row.label} draft={draft} onEdit={(field, next) => patch(field, next as never)} t={t} />
            ))}
            <LabeledControl label={t('artifactRoot')} issue={artifactIssue}>{(wiring) => (
              <Input {...wiring} value={draft.artifactRoot} aria-invalid={artifactIssue !== undefined} onChange={event => patch('artifactRoot', event.target.value)} />
            )}</LabeledControl>
          </div>
        </Panel>
        <Panel heading={t('cursorTiming')}>
          <div className="dcu-grid">
            {MOTION_ROWS.map(row => (
              <NumberRow key={row.field} field={row.field} label={row.label} draft={draft} onEdit={(field, next) => patch(field, next as never)} t={t} />
            ))}
          </div>
        </Panel>
        <Panel heading={t('helper')}>
          <div className="dcu-grid">
            <LabeledControl label={t('helperPath')}>{(wiring) => (
              <Input {...wiring} value={draft.helperPath} placeholder={t('helperPathPlaceholder')} onChange={event => patch('helperPath', event.target.value)} />
            )}</LabeledControl>
            <label className="dcu-check">
              <input type="checkbox" checked={draft.allowSourceBuild} onChange={event => patch('allowSourceBuild', event.target.checked)} />
              <span>{t('sourceBuild')}</span>
            </label>
          </div>
          <details className="dcu-tech">
            <summary>{t('techDetails')}</summary>
            <code className="dcu-path">{provider.helperPath}</code>
            {provider.helperSha256 === undefined ? null : <code className="dcu-path">sha256 {provider.helperSha256}</code>}
          </details>
        </Panel>
        <Panel heading={t('grants')} hint={t('grantsHint')}>
          <textarea
            aria-label={t('grants')}
            aria-invalid={grantsIssue !== undefined}
            value={draft.grants}
            disabled={draft.allowAllApps}
            onChange={event => patch('grants', event.target.value)}
            placeholder={'com.example.App read\ncom.example.Editor read,control'}
          />
          {grantsIssue === undefined ? null : <span className="dcu-field-error" role="alert">{grantsIssue}</span>}
        </Panel>
        {saveBar('below')}
      </div>
    </details>
    <footer className="dcu-footer">
      <div><span className="dcu-kicker">{t('pluginKind')}</span><h2>{t('title')}</h2><p>{t('intro')}</p></div>
      <div className="dcu-release">
        <span>{t('helper')} <strong>{provider.helperVersion ?? t('helperUnknown')}</strong></span>
        <span>{t('generation')} <strong>{t('generationValue', { generation: provider.generation })}</strong></span>
        <span className={provider.ready ? 'ok' : 'bad'}>{provider.ready ? t('ready') : t('unavailable')}</span>
      </div>
    </footer>
  </div>
}

function SettingsSection({ controller, t }: SectionProps) {
  if (controller === undefined || t === undefined) return null
  return <SettingsBody controller={controller} t={t} />
}

export { SettingsSection }
