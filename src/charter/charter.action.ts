/** Charter of action: the closed action vocabulary, its shared target fields, and its post-action evidence. */

import type {
  ComputerConfirmationToken,
  ComputerObservationId,
  ComputerTargetHandle,
} from './charter.identity.ts'
import type {
  ComputerObservation,
  ComputerTargetResolutionResult,
} from './charter.observation.ts'

/** Closed set of supported mouse buttons. */
export type ComputerMouseButton = 'left' | 'right' | 'middle'

/** Closed set of supported key modifiers. */
export type ComputerKeyModifier = 'command' | 'control' | 'option' | 'shift'

/** Coordinate space accepted by coordinate-based pointer actions. */
export type ComputerCoordinateSpace = 'window' | 'screen'

/** Target selection fields shared by the element-addressed actions. */
export interface ComputerElementTarget {
  /** Permit deterministic native-identifier or unique semantic rebinding. */
  allowRebind?: boolean
  /** Observation-local compatibility index. It does not authorize rebinding by itself. */
  elementIndex?: number
  /** Opaque handle returned for the selected observation element. */
  targetHandle?: ComputerTargetHandle
}

/** Fields every action against an existing observation carries. */
export interface ComputerActionBase {
  observationId: ComputerObservationId
  /** Set only when the Skill classified this action as needing just-in-time confirmation. */
  sensitive?: boolean
  /** One-use token returned by {@link ComputerUseService.confirm}. */
  confirmationToken?: ComputerConfirmationToken
}

/** Click an observed element, or a coordinate inside the observed window. */
export interface ComputerClickAction extends ComputerActionBase, ComputerElementTarget {
  kind: 'click'
  button?: ComputerMouseButton
  clickCount?: number
  x?: number
  y?: number
  /** `window` (default) resolves `x`/`y` inside the observed window frame; `screen` treats them as Quartz screen-global points. */
  coordinateSpace?: ComputerCoordinateSpace
  allowCoordinateFallback?: boolean
  /** Held modifiers for the pointer event, for example `command` for a new-tab click. */
  modifiers?: ComputerKeyModifier[]
}

/** Write a new Accessibility value onto one observed editable element. */
export interface ComputerSetValueAction extends ComputerActionBase, ComputerElementTarget {
  kind: 'set-value'
  value: string
}

/** Insert Unicode into the focused control via Accessibility or the keyboard fallback; the clipboard is never touched. */
export interface ComputerTypeTextAction extends ComputerActionBase {
  kind: 'type-text'
  text: string
}

/** Press one validated key chord. */
export interface ComputerPressKeyAction extends ComputerActionBase {
  kind: 'press-key'
  key: string
  modifiers?: ComputerKeyModifier[]
}

/** Scroll at one observed element or window coordinate. */
export interface ComputerScrollAction extends ComputerActionBase, ComputerElementTarget {
  kind: 'scroll'
  direction: 'up' | 'down' | 'left' | 'right'
  pages?: number
  x?: number
  y?: number
  coordinateSpace?: ComputerCoordinateSpace
}

/** Drag from one point to another inside the observed window or the screen. */
export interface ComputerDragAction extends ComputerActionBase {
  kind: 'drag'
  /** Gesture origin. */
  fromX: number
  fromY: number
  /** Gesture destination. */
  toX: number
  toY: number
  coordinateSpace?: ComputerCoordinateSpace
  /** Held modifiers for the whole drag gesture, for example `option` for a copy drag. */
  modifiers?: ComputerKeyModifier[]
}

/** Perform one Accessibility action the observed element advertises. */
export interface ComputerPerformAction extends ComputerActionBase, ComputerElementTarget {
  kind: 'perform-action'
  action: string
}

/**
 * One AND-combined Accessibility wait condition.
 *
 * A condition must set at least one matcher; `absent` only inverts the match,
 * so an empty matcher set is rejected instead of waiting for the deadline.
 */
export interface ComputerWaitCondition {
  /** When true the wait resolves as soon as the matchers stop matching, which is how a caller waits for a progress indicator or dialog to disappear. */
  absent?: boolean
  text?: string
  elementRole?: string
  elementTitle?: string
  /** Exact match on one observed element value. */
  elementValue?: string
}

/** Wait for a bounded UI condition; nothing is mutated while waiting. */
export interface ComputerWaitAction extends ComputerActionBase {
  kind: 'wait'
  condition: ComputerWaitCondition
  /** Bounded by the host `maxWaitMs`; omitted means the host `maxSettleMs`. */
  timeoutMs?: number
}

/** Every action a model is allowed to request. */
export type ComputerActionRequest =
  // Pointer input.
  | ComputerClickAction
  | ComputerScrollAction
  | ComputerDragAction
  // Keyboard and text input.
  | ComputerPressKeyAction
  | ComputerSetValueAction
  | ComputerTypeTextAction
  // Accessibility actions and bounded waiting.
  | ComputerPerformAction
  | ComputerWaitAction

/**
 * What the bounded post-action structural observation shows as changed.
 *
 * Coverage is the window title, id and frame plus the Accessibility element
 * tree. A difference here does not prove this action caused it, and pixel-only,
 * transient, remote, or otherwise external effects stay invisible to it.
 */
export interface ComputerActionEffect {
  note?: string
  /** True when the post-action structural state hash differed. */
  observedStateChanged: boolean
  /** How long the settle loop watched, in milliseconds. */
  observedForMs: number
}

/** One successful action, followed by the fresh observation it produced. */
export interface ComputerActionResult {
  action: ComputerActionRequest['kind']
  channel: 'accessibility' | 'coordinates' | 'keyboard' | 'wait'
  /** Verifiable target-app foreground state transition requested by the helper for this action. */
  activation: 'not-requested' | 'already-frontmost' | 'activated'
  /** Whether the helper emitted mouse, drag, or scroll-wheel input to the target process. */
  pointerInput: boolean
  /** Pointer-event route selected by the helper; global HID routing is not supported. */
  pointerRouting: 'none' | 'target-process'
  observation: ComputerObservation
  effect: ComputerActionEffect
  /** Present when the action addressed an observed element. */
  resolution?: ComputerTargetResolutionResult
  /** Present only when the agent cursor is supposed to be on screen but is not. */
  agentCursor?: { visible: false; reason?: string }
}
