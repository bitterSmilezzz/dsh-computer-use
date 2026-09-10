/**
 * Conductor cursor: the Agent-cursor choreography around one action — placing
 * the overlay before input, optionally tracking a drag, and validating the
 * overlay afterwards.
 */

import type {
  BackendActionRequest,
  BackendActionResult,
  BackendCursorAction,
  BackendObservation,
  ComputerUseBackend,
} from '../binding/binding.port.ts'
import type { BackendElement } from '../optics/optics.sighting.ts'
import type { CursorVisibility } from '../charter/charter.context.ts'
import type { ComputerActionRequest } from '../charter/charter.index.ts'
import type { ResolvedComputerUseConfig } from '../tuning/tuning.schema.ts'
import { ComputerUseError, computerUseError } from '../charter/charter.fault.ts'
import { cursorAction } from '../motion/motion.pointer.ts'
import { requiresPointerInput } from '../motion/motion.envelope.ts'

/** How long the overlay gets to confirm its post-action placement. */
const CURSOR_AFTER_TIMEOUT_MS = 1_500

/** An overlay that was expected on screen and is not, as the action result reports it. */
export interface LostCursor {
  visible: false
  reason?: string
}

/** One action shape, without the wait branch that never drives the cursor. */
type InputAction = Exclude<ComputerActionRequest, { kind: 'wait' }>

/**
 * The cursor side of a single action. A flight is created per action, so the
 * reports it collects belong to exactly one attempt and never bleed into the next.
 */
export class CursorFlight {
  private visualization: BackendCursorAction | undefined
  private started = false
  private reported: CursorVisibility | undefined

  constructor(
    private readonly backend: ComputerUseBackend,
    private readonly config: ResolvedComputerUseConfig,
    private readonly action: InputAction,
    private readonly sourceElement: BackendElement | undefined,
  ) {}

  /** Whether this action is one the overlay is configured and able to visualize. */
  get expected(): boolean {
    if (this.config.interaction.cursorVisualization !== 'visible') return false
    return this.action.kind === 'click' || this.action.kind === 'scroll' || this.action.kind === 'drag'
  }

  /** The overlay was expected and is missing, or undefined when it was fine. */
  get lost(): LostCursor | undefined {
    const settled = this.reported
    if (settled === undefined || settled.visible) return undefined
    return { visible: false, ...(settled.reason === undefined ? {} : { reason: settled.reason }) }
  }

  /**
   * Keep the first report, except that a hidden overlay always overrides a shown
   * one: once the cursor went missing it must surface to the caller even if a
   * later probe saw it again.
   */
  private note(next: CursorVisibility): void {
    const settled = this.reported
    if (settled === undefined) {
      this.reported = next
      return
    }
    if (settled.visible && !next.visible) this.reported = next
  }

  /**
   * Place the overlay before the input is sent. A cursor that cannot be placed
   * for a foreground target fails the action: input must never travel without
   * the visual evidence the user was promised.
   */
  async prepare(element: BackendElement | undefined, observation: BackendObservation, signal: AbortSignal): Promise<void> {
    if (!this.expected) return
    const visualization = cursorAction(this.action, element, observation.window, observation.app)
    this.visualization = visualization
    if (visualization === undefined) {
      const unavailable: CursorVisibility = {
        visible: false,
        reason: observation.window?.id === undefined
          ? 'the agent cursor could not be bound because the target window has no stable window id'
          : 'the agent cursor could not be placed because this action has no observable cursor position',
        ...(!observation.frontmost ? { reasonCode: 'target-not-frontmost' as const } : {}),
      }
      this.note(unavailable)
      if (observation.frontmost) {
        throw new ComputerUseError(
          'COMPUTER_PROVIDER_FAILURE',
          `the agent cursor could not complete before the action: ${unavailable.reason}`,
        )
      }
      return
    }
    let before: CursorVisibility
    try {
      before = await this.backend.visualizeCursor(visualization, 'before', signal)
    } catch (error) {
      throw computerUseError(error, 'the agent cursor could not be driven before the action')
    }
    this.note(before)
    // A background target is allowed to hide the overlay on purpose; anything
    // else that leaves the cursor invisible is a failure before input travels.
    const hidingIsIntentional = before.reasonCode === 'target-not-frontmost'
      && (this.config.interaction.focusPolicy === 'preserve' || !requiresPointerInput(this.action, this.sourceElement))
    if (!before.visible && !hidingIsIntentional) {
      throw new ComputerUseError(
        'COMPUTER_PROVIDER_FAILURE',
        `the agent cursor could not complete before the action: ${before.reason ?? 'the overlay is unavailable'}`,
      )
    }
    this.started = before.visible
  }

  /** Run the backend action, taking the tracked drag path while the cursor is live. */
  async dispatch(request: BackendActionRequest, signal: AbortSignal): Promise<BackendActionResult> {
    const visualization = this.visualization
    if (!this.started || visualization?.kind !== 'drag') return await this.backend.act(request, signal)
    const tracked = await this.backend.actDragWithCursor(
      request,
      visualization as BackendCursorAction & { kind: 'drag' },
      signal,
    )
    this.note(tracked.cursor)
    return tracked.action
  }

  /**
   * Confirm the post-action placement. This never fails the action: a cursor
   * that cannot be validated afterwards is reported as lost instead.
   */
  async settle(): Promise<void> {
    const visualization = this.visualization
    if (!this.started || visualization === undefined) return
    try {
      this.note(await this.backend.visualizeCursor(visualization, 'after', AbortSignal.timeout(CURSOR_AFTER_TIMEOUT_MS)))
    } catch (error) {
      this.note({
        visible: false,
        reason: `the agent cursor could not be validated after the action: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }
}
