/**
 * Motion envelope: what one action request addresses, and whether its arguments
 * can be satisfied at all.
 *
 * These predicates answer four questions before any provider work begins: which
 * element an action names, whether a stable handle may re-bind that element,
 * whether the action needs an element or target-process pointer input, and
 * whether it needs explicit foreground permission. `validateAction` is the one
 * immediate correction a caller gets, instead of a deadline that can never be met.
 */

import type { BackendObservation } from '../binding/binding.port.ts'
import { ComputerUseError } from '../charter/charter.fault.ts'
import type { ComputerActionRequest, ComputerTargetHandle } from '../charter/charter.index.ts'
import { MAX_SET_VALUE_CHARACTERS, waitConditionDefined } from './motion.budget.ts'

/** Actions addressed through the shared element target fields. */
type ElementAddressedAction = Extract<
  ComputerActionRequest,
  { kind: 'click' | 'scroll' | 'set-value' | 'perform-action' }
>

function isElementAddressed(action: ComputerActionRequest): action is ElementAddressedAction {
  switch (action.kind) {
    case 'click':
    case 'scroll':
    case 'set-value':
    case 'perform-action': return true
    default: return false
  }
}

export function targetIndex(action: ComputerActionRequest): number | undefined {
  if (!isElementAddressed(action)) return undefined
  return action.elementIndex
}

export function targetHandle(action: ComputerActionRequest): ComputerTargetHandle | undefined {
  if (!isElementAddressed(action)) return undefined
  return action.targetHandle
}

export function allowsTargetRebind(action: ComputerActionRequest): boolean {
  return isElementAddressed(action) && action.allowRebind === true
}

export function requiresElement(action: ComputerActionRequest): boolean {
  return action.kind === 'set-value' || action.kind === 'perform-action'
}

export function requiresPointerInput(
  action: Exclude<ComputerActionRequest, { kind: 'wait' }>,
  element: BackendObservation['elements'][number] | undefined,
): boolean {
  switch (action.kind) {
    case 'scroll':
    case 'drag': return true
    case 'click':
      return action.x !== undefined
        || action.y !== undefined
        || (element !== undefined && action.allowCoordinateFallback === true)
    case 'set-value':
    case 'type-text':
    case 'press-key':
    case 'perform-action': return false
  }
}

export function requiresForegroundPermission(action: Exclude<ComputerActionRequest, { kind: 'wait' }>): boolean {
  return action.kind === 'perform-action' && action.action === 'AXRaise'
}

/**
 * Reject an action whose arguments cannot be satisfied at all, before any lease,
 * queue, or provider work. The model gets one immediate correction instead of a
 * deadline that can never be met.
 */
export function validateAction(action: ComputerActionRequest): void {
  if (action.kind === 'wait' && !waitConditionDefined(action.condition)) {
    throw new ComputerUseError(
      'COMPUTER_INVALID_ARGUMENT',
      'condition must set at least one of text, elementRole, elementTitle, or elementValue; add absent=true when the wait should resolve once that match disappears',
    )
  }
  if (action.kind === 'set-value' && action.value.length > MAX_SET_VALUE_CHARACTERS) {
    throw new ComputerUseError(
      'COMPUTER_INVALID_ARGUMENT',
      `value must be at most ${MAX_SET_VALUE_CHARACTERS} characters (received ${action.value.length}); use computer_type_text after focusing the control for longer text`,
    )
  }
}
