/**
 * Binding port: the provider-facing backend protocol kept below the public
 * Computer Use Service.
 *
 * The observation, action, cursor, and health shapes it speaks live in
 * {@link file://../optics/optics.sighting.ts}; this module owns only the
 * platform interface the conductor drives.
 */

import type {
  ComputerAppIdentity,
  ComputerAppSelector,
  ComputerAppSummary,
} from '../charter/charter.index.ts'
import type {
  BackendActionRequest,
  BackendActionResult,
  BackendCursorAction,
  BackendCursorActivation,
  BackendHealth,
  BackendObservation,
  BackendObserveOptions,
  BackendTrackedDragResult,
  CursorVisibility,
} from '../optics/optics.sighting.ts'

/**
 * The backend protocol is read as one site by its consumers, so the evidence
 * shapes it speaks are re-exported alongside the interface.
 */
export type {
  BackendActionRequest,
  BackendActionResult,
  BackendCursorAction,
  BackendCursorActivation,
  BackendHealth,
  BackendObservation,
  BackendObserveOptions,
  BackendTrackedDragResult,
  CursorVisibility,
}

/** Platform backend used by the provider-independent Service implementation. */
export interface ComputerUseBackend {
  readonly name: 'macos-ax' | 'unsupported'
  readonly helperPath: string
  resolveApp(selector: ComputerAppSelector, signal: AbortSignal): Promise<ComputerAppIdentity>
  listApps(signal: AbortSignal): Promise<ComputerAppSummary[]>
  observe(app: ComputerAppIdentity, options: BackendObserveOptions, signal: AbortSignal): Promise<BackendObservation>
  activateForCursor(app: ComputerAppIdentity, expectedStateHash: string, options: BackendObserveOptions, signal: AbortSignal): Promise<BackendCursorActivation>
  act(request: BackendActionRequest, signal: AbortSignal): Promise<BackendActionResult>
  actDragWithCursor(request: BackendActionRequest, cursor: BackendCursorAction & { kind: 'drag' }, signal: AbortSignal): Promise<BackendTrackedDragResult>
  /**
   * Drive the agent cursor for one action.
   * @returns whether the cursor is on screen afterwards, plus why not when it
   * is hidden. The Service permits intentional background hiding but fails
   * closed for foreground placement, transport, and target-validation failures.
   */
  visualizeCursor(action: BackendCursorAction, phase: 'before' | 'during' | 'after', signal: AbortSignal): Promise<CursorVisibility>
  dispose(): Promise<void>
  health(signal: AbortSignal): Promise<BackendHealth>
  openSettings(kind: 'accessibility' | 'screen-recording', signal: AbortSignal): Promise<void>
}
