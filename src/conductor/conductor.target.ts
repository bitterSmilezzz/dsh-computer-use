/**
 * Conductor target: the fail-closed gate that turns one model action into the
 * provider element it will be applied to, before any lease or input happens.
 */

import type { BackendElement, BackendObservation } from '../optics/optics.sighting.ts'
import type { ComputerTargetDescriptor } from '../optics/optics.fingerprint.ts'
import type { StoredObservation } from '../custody/custody.ledger.ts'
import { ComputerUseError } from '../charter/charter.fault.ts'
import type { ComputerActionRequest, ComputerTargetResolutionResult } from '../charter/charter.index.ts'
import type { ResolvedComputerUseConfig } from '../tuning/tuning.schema.ts'
import {
  allowsTargetRebind,
  requiresElement,
  requiresForegroundPermission,
  requiresPointerInput,
  targetHandle,
  targetIndex,
} from '../motion/motion.envelope.ts'

/** One non-waiting action shape, as accepted by the target gate. */
type InputAction = Exclude<ComputerActionRequest, { kind: 'wait' }>

/** What the gate found: the element, its descriptor, and the resolution to report. */
export interface SelectedActionTarget {
  /** Set when the action addressed a targetHandle; drives pre-input rebinding. */
  descriptor: ComputerTargetDescriptor | undefined
  /** Provider element the action addressed inside the referenced observation. */
  element: BackendElement | undefined
  /** Resolution outcome, absent when the action carried no element evidence. */
  resolution: ComputerTargetResolutionResult | undefined
}

/** Whether a descriptor locator still names exactly this provider element. */
function locatorNamesElement(locator: readonly number[], element: BackendElement | undefined): boolean {
  if (element === undefined) return false
  if (locator.length !== element.locator.length) return false
  return locator.every((part, position) => part === element.locator[position])
}

/** The provider element one observation-local element index currently names. */
function elementAtIndex(observation: BackendObservation, index: number | undefined): BackendElement | undefined {
  if (index === undefined) return undefined
  return observation.elements.find(candidate => candidate.index === index)
}

/** The provider element a stored descriptor still finds in a fresh observation. */
function elementForDescriptor(
  observation: BackendObservation,
  descriptor: ComputerTargetDescriptor | undefined,
): BackendElement | undefined {
  if (descriptor === undefined) return undefined
  return observation.elements.find(candidate => locatorNamesElement(descriptor.locator, candidate))
}

/**
 * Reject an action that targets nothing usable, or nothing this deployment is
 * allowed to drive, and otherwise report the element it resolved to. Every check
 * fails closed: the caller gets a specific error instead of an action that would
 * silently address the wrong element.
 */
export function selectActionTarget(
  stored: StoredObservation,
  action: InputAction,
  config: ResolvedComputerUseConfig,
): SelectedActionTarget {
  const index = targetIndex(action)
  const handle = targetHandle(action)
  const byIndex = elementAtIndex(stored.backend, index)
  if (index !== undefined && byIndex === undefined) {
    throw new ComputerUseError('COMPUTER_ELEMENT_UNAVAILABLE', `element ${index} is not part of observation ${String(action.observationId)}`)
  }
  if (handle === undefined && allowsTargetRebind(action)) {
    throw new ComputerUseError('COMPUTER_TARGET_UNAVAILABLE', 'allowRebind requires a targetHandle from the referenced observation')
  }
  const descriptor = handle === undefined ? undefined : stored.targets.get(handle)
  if (handle !== undefined && descriptor === undefined) {
    throw new ComputerUseError('COMPUTER_TARGET_UNAVAILABLE', 'targetHandle is unknown or does not belong to the referenced observation')
  }
  if (descriptor !== undefined && index !== undefined && !locatorNamesElement(descriptor.locator, byIndex)) {
    throw new ComputerUseError('COMPUTER_TARGET_UNAVAILABLE', 'elementIndex and targetHandle select different elements')
  }
  const element = byIndex ?? elementForDescriptor(stored.backend, descriptor)
  if (descriptor !== undefined && element === undefined) {
    throw new ComputerUseError('COMPUTER_TARGET_UNAVAILABLE', 'targetHandle no longer has provider evidence in the referenced observation')
  }
  if (requiresElement(action) && element === undefined) {
    throw new ComputerUseError('COMPUTER_ELEMENT_UNAVAILABLE', `${action.kind} requires elementIndex or targetHandle`)
  }
  if (requiresPointerInput(action, element) && config.interaction.pointerInputPolicy === 'deny') {
    throw new ComputerUseError(
      'COMPUTER_ACTION_BLOCKED',
      `${action.kind} requires target-process pointer input, which interaction.pointerInputPolicy denies; use an Accessibility action or enable targeted pointer input in host Settings`,
    )
  }
  if (requiresForegroundPermission(action) && config.interaction.focusPolicy === 'preserve') {
    throw new ComputerUseError(
      'COMPUTER_ACTION_BLOCKED',
      'AXRaise may raise the target window, which interaction.focusPolicy preserve denies; enable explicit activation in host Settings before using this action',
    )
  }
  return {
    descriptor,
    element,
    // Addressing an element by index or handle is an exact hit against this
    // observation; a descriptor-driven rebind replaces this with the real outcome.
    resolution: element === undefined ? undefined : { mode: 'exact-locator', confidence: 1, candidateCount: 1, targetChanged: false },
  }
}
