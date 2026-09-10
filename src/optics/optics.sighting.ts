/**
 * Optics sighting: the raw provider-evidence shapes an observation is built from.
 *
 * The provider-facing shapes are authoritative here; `binding/binding.port.ts`
 * re-exports them beside the backend interface.
 */

import type {
  ComputerActionRequest,
  ComputerAppIdentity,
  ComputerElement,
  ComputerPermissionState,
  ComputerRect,
  ComputerScreenshotMode,
  CursorVisibility,
} from '../charter/charter.index.ts'
import type { ResolvedComputerUseConfig } from '../tuning/tuning.schema.ts'

/**
 * Cursor evidence is part of the public contract and is defined in
 * {@link file://../charter/charter.context.ts}; it is re-exported here so
 * provider-protocol consumers keep one import site.
 */
export type { CursorVisibility }

/** Internal provider evidence: never exposed to the model, never persisted in Session logs. */
export interface BackendElement extends Omit<ComputerElement, 'targetHandle'> {
  locator: number[]
  nativeIdentifier?: string
}

/** The window a raw observation was taken against, when the provider identified one. */
interface BackendObservationWindow {
  frame: ComputerRect
  title?: string
  id?: number
}

/** A captured screenshot, before it becomes a model-visible artifact. */
interface BackendObservationScreenshot {
  path: string
  width: number
  height: number
}

/** Permission state the provider reported for one observation. */
interface BackendObservationPermissions {
  screenRecording: ComputerPermissionState
  accessibility: ComputerPermissionState
}

/** Raw full-state observation returned by a provider before Service diff projection. */
export interface BackendObservation {
  app: ComputerAppIdentity
  stateHash: string
  frontmost: boolean
  window?: BackendObservationWindow
  /** Flattened Accessibility tree, as text. */
  treeText: string
  truncated: boolean
  elements: BackendElement[]
  screenshot?: BackendObservationScreenshot
  permissions: BackendObservationPermissions
}

/** Provider limits resolved by the configuration owner before a call. */
export interface BackendObserveOptions {
  screenshot: ComputerScreenshotMode
  /** Destination for a captured artifact; the configured default when omitted. */
  screenshotPath?: string
  maxNodes: number
  maxDepth: number
  maxTextBytes: number
}

/** Action bound to fresh provider state and one exact internally resolved target. */
export interface BackendActionRequest {
  action: Exclude<ComputerActionRequest, { kind: 'wait' }>
  app: ComputerAppIdentity
  expectedStateHash: string
  interaction: ResolvedComputerUseConfig['interaction']
  /** Present when the action addressed an element rather than coordinates. */
  element?: BackendElement
  window?: BackendObservation['window']
}

/** Provider action outcome before the Service obtains the mandatory post-action observation. */
export interface BackendActionResult {
  channel: 'accessibility' | 'coordinates' | 'keyboard'
  activation: 'not-requested' | 'already-frontmost' | 'activated'
  pointerInput: boolean
  pointerRouting: 'none' | 'target-process'
}

/** Fresh state after a host-authorized foreground activation for cursor sequencing. */
export interface BackendCursorActivation {
  readonly observation: BackendObservation
  readonly activation: 'already-frontmost' | 'activated'
}

/** Native drag input and its Agent-cursor endpoint tracking result. */
export interface BackendTrackedDragResult {
  readonly action: BackendActionResult
  readonly cursor: CursorVisibility
}

/** One model-selected point or gesture for the non-interactive Agent cursor overlay. */
export interface BackendCursorAction {
  kind: 'click' | 'scroll' | 'drag'
  /** Present for a drag gesture. */
  from?: { x: number; y: number }
  to: { x: number; y: number }
  targetPid: number
  targetWindowNumber: number
  /** Exact target identity, so the overlay cannot linger over another window. */
  targetWindowFrame: ComputerRect
}

/** Health facts obtained without changing permissions. */
export interface BackendHealth {
  helperVersion: string
  /** Digest of the helper binary this report describes. */
  helperSha256: string
  accessibility: ComputerPermissionState
  screenRecording: ComputerPermissionState
  /** False when the provider is intentionally disabled on this host (for example non-macOS). */
  ready?: boolean
  /** Operator-facing reason shown in Settings when `ready` is false. */
  error?: string
}
