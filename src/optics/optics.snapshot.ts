/**
 * Optics snapshot: the model-visible projection of one sighting plus the stored
 * observation index the ledger keeps per Agent.
 */

import { randomUUID } from 'node:crypto'
import type { BackendObservation } from './optics.sighting.ts'
import { describeComputerTarget, type ComputerTargetDescriptor } from './optics.locate.ts'
import {
  ComputerTargetHandle,
  type ComputerElement,
  type ComputerObservation,
  type ComputerObservationId,
} from '../charter/charter.index.ts'

/** Stored evidence for one live model-visible observation. */
export interface StoredObservation {
  public: ComputerObservation
  backend: BackendObservation
  targets: Map<ComputerTargetHandle, ComputerTargetDescriptor>
  generation: number
}

/** Per-Agent observation index retained for staleness checks and diff projection. */
export interface AgentObservationState {
  observations: Map<ComputerObservationId, StoredObservation>
  latestByApp: Map<string, ComputerObservationId>
}

/** Project one provider observation into model-addressable elements and target descriptors. */
export function publicElements(observation: BackendObservation): {
  elements: ComputerElement[]
  targets: Map<ComputerTargetHandle, ComputerTargetDescriptor>
} {
  const targets = new Map<ComputerTargetHandle, ComputerTargetDescriptor>()
  const elements = observation.elements.map((backendElement) => {
    const { locator: _locator, nativeIdentifier: _nativeIdentifier, ...element } = backendElement
    const targetHandle = ComputerTargetHandle(randomUUID())
    targets.set(targetHandle, describeComputerTarget(backendElement, observation))
    return { ...element, targetHandle }
  })
  return { elements, targets }
}
