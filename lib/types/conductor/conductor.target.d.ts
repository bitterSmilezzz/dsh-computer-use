/**
 * Conductor target: the fail-closed gate that turns one model action into the
 * provider element it will be applied to, before any lease or input happens.
 */
import type { BackendElement } from '../optics/optics.sighting.ts';
import type { ComputerTargetDescriptor } from '../optics/optics.fingerprint.ts';
import type { StoredObservation } from '../custody/custody.ledger.ts';
import type { ComputerActionRequest, ComputerTargetResolutionResult } from '../charter/charter.index.ts';
import type { ResolvedComputerUseConfig } from '../tuning/tuning.schema.ts';
/** One non-waiting action shape, as accepted by the target gate. */
type InputAction = Exclude<ComputerActionRequest, {
    kind: 'wait';
}>;
/** What the gate found: the element, its descriptor, and the resolution to report. */
export interface SelectedActionTarget {
    /** Set when the action addressed a targetHandle; drives pre-input rebinding. */
    descriptor: ComputerTargetDescriptor | undefined;
    /** Provider element the action addressed inside the referenced observation. */
    element: BackendElement | undefined;
    /** Resolution outcome, absent when the action carried no element evidence. */
    resolution: ComputerTargetResolutionResult | undefined;
}
/**
 * Reject an action that targets nothing usable, or nothing this deployment is
 * allowed to drive, and otherwise report the element it resolved to. Every check
 * fails closed: the caller gets a specific error instead of an action that would
 * silently address the wrong element.
 */
export declare function selectActionTarget(stored: StoredObservation, action: InputAction, config: ResolvedComputerUseConfig): SelectedActionTarget;
export {};
//# sourceMappingURL=conductor.target.d.ts.map