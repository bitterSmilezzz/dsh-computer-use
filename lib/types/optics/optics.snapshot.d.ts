/**
 * Optics snapshot: the model-visible projection of one sighting plus the stored
 * observation index the ledger keeps per Agent.
 */
import type { BackendObservation } from './optics.sighting.ts';
import { type ComputerTargetDescriptor } from './optics.locate.ts';
import { ComputerTargetHandle, type ComputerElement, type ComputerObservation, type ComputerObservationId } from '../charter/charter.index.ts';
/** Stored evidence for one live model-visible observation. */
export interface StoredObservation {
    public: ComputerObservation;
    backend: BackendObservation;
    targets: Map<ComputerTargetHandle, ComputerTargetDescriptor>;
    generation: number;
}
/** Per-Agent observation index retained for staleness checks and diff projection. */
export interface AgentObservationState {
    observations: Map<ComputerObservationId, StoredObservation>;
    latestByApp: Map<string, ComputerObservationId>;
}
/** Project one provider observation into model-addressable elements and target descriptors. */
export declare function publicElements(observation: BackendObservation): {
    elements: ComputerElement[];
    targets: Map<ComputerTargetHandle, ComputerTargetDescriptor>;
};
//# sourceMappingURL=optics.snapshot.d.ts.map