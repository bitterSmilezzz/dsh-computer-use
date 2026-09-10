/**
 * Optics locate: describing one element as a rebind-able descriptor, and
 * resolving that descriptor against a fresh provider observation.
 *
 * Resolution is fail-closed and deterministic. It never guesses: a tier either
 * produces exactly one candidate whose stable fields still match, or the whole
 * resolution is refused, with the evidence (candidate count, required
 * confidence) carried in the error. The tiers run in one fixed order — the
 * original locator, then the provider's own identifier, then semantic identity —
 * and the first tier that can vouch for a candidate wins.
 */
import type { BackendElement, BackendObservation } from './optics.sighting.ts';
import { type ComputerTargetDescriptor } from './optics.fingerprint.ts';
/** Re-exported so one locate import covers the descriptor a resolution returns. */
export type { ComputerTargetDescriptor } from './optics.fingerprint.ts';
import type { ComputerTargetResolutionResult } from '../charter/charter.index.ts';
/** Successful resolution plus the fresh provider observation used for input. */
export interface ResolvedComputerTarget {
    element: BackendElement;
    observation: BackendObservation;
    resolution: ComputerTargetResolutionResult;
}
/** Build the normalized descriptor stored behind one opaque handle. */
export declare function describeComputerTarget(element: BackendElement, observation: BackendObservation): ComputerTargetDescriptor;
/** Resolve one descriptor against a fresh provider observation without guessing. */
export declare function resolveComputerTarget(original: BackendObservation, fresh: BackendObservation, expected: ComputerTargetDescriptor, allowRebind: boolean): ResolvedComputerTarget;
//# sourceMappingURL=optics.locate.d.ts.map