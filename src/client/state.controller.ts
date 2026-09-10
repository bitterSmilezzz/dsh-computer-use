/**
 * Client controller — the settings endpoint the section reads and writes, plus
 * the minimal external store React subscribes to.
 *
 * One document, one action slot: every mutation is a POST that returns the new
 * snapshot, so the section never has to merge state by hand. Both requests read
 * the same envelope, which is why the unwrapping lives in a module-level helper
 * instead of being repeated per call site.
 */

import type { ConfigValue } from './state.draft.ts'

export const NS = 'computer-use'
export const ROUTE = '/_dsh/computer-use/settings'

/** Actions the endpoint accepts. */
type ActionName = 'save' | 'health' | 'open-settings'

/** In-flight marker kept in state; opening the system pane shows up as `open`. */
type ActionMark = 'save' | 'health' | 'open'

/** Host-side status the section renders; alphabetical inside each level. */
export interface Snapshot {
  provider: {
    accessibility: string
    generation: number
    helperPath: string
    helperSha256?: string
    helperVersion?: string
    lastError?: string
    platform: string
    provider: string
    ready: boolean
    screenRecording: string
  }
  schemaVersion: 1
  settings: { value: ConfigValue; revision: number; applies: 'live' }
  writable: boolean
}

export interface ControllerState {
  action?: ActionMark
  error?: string
  notice?: string
  snapshot?: Snapshot
  status: 'idle' | 'loading' | 'ready' | 'error'
}

/** Envelope every settings route answers with, success or failure. */
interface Envelope {
  ok: boolean
  value?: Snapshot
  error?: { message?: string }
}

/** A transport or envelope failure, as text the section can display verbatim. */
function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** The snapshot inside one response, or the host-supplied failure message. */
async function snapshotOf(response: Response): Promise<Snapshot> {
  const body = await response.json() as Envelope
  if (!response.ok || body.ok !== true || body.value === undefined) {
    throw new Error(body.error?.message ?? `HTTP ${response.status}`)
  }
  return body.value
}

/** Loads the document, runs one action at a time, and re-reads on external change. */
export class ComputerUseSettingsController {
  private current: ControllerState = { status: 'idle' }
  private readonly listeners = new Set<() => void>()

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  readonly snapshot = (): ControllerState => this.current

  private commit(next: ControllerState): void {
    this.current = next
    for (const listener of this.listeners) listener()
  }

  /** Re-read the document; a load keeps the previous snapshot on screen while it runs. */
  async load(): Promise<void> {
    const carried = this.current.snapshot
    this.commit(carried === undefined ? { status: 'loading' } : { status: 'loading', snapshot: carried })
    try {
      const read = fetch(ROUTE, { credentials: 'same-origin', cache: 'no-store' })
      this.commit({ status: 'ready', snapshot: await snapshotOf(await read) })
    } catch (error) {
      this.commit({ status: 'error', error: reasonOf(error) })
    }
  }

  /**
   * Run one action and adopt the snapshot it returns.
   *
   * A failed action leaves the document on screen — the user's edits stay
   * visible — and only reports the failure, so a rejected save never blanks the
   * form it just refused.
   */
  async action(action: ActionName, payload: Record<string, unknown>, marker: ActionMark): Promise<void> {
    const carried = this.current.snapshot
    this.commit({ status: this.current.status, action: marker, ...(carried === undefined ? {} : { snapshot: carried }) })
    const request: RequestInit = {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    }
    try {
      const next = await snapshotOf(await fetch(ROUTE, request))
      this.commit(action === 'save' ? { status: 'ready', snapshot: next, notice: 'saved' } : { status: 'ready', snapshot: next })
    } catch (error) {
      const kept = this.current.snapshot
      this.commit({ status: 'ready', ...(kept === undefined ? {} : { snapshot: kept }), error: reasonOf(error) })
    }
  }

  /** Re-read only when a document is already on screen; before that the mount effect loads it. */
  refreshIfLoaded(): void {
    if (this.current.status === 'idle') return
    void this.load()
  }
}
