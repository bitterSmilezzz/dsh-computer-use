/**
 * Optics fingerprint: normalized target descriptors, ancestor fingerprints, and the
 * stable/semantic/exact identity predicates the resolver decides with.
 */
import type { BackendElement, BackendObservation } from './optics.sighting.ts';
import type { ComputerRect } from '../charter/charter.index.ts';
/** Fixed confidence values used by the deterministic resolver. */
export declare const TARGET_RESOLUTION_CONFIDENCE: {
    readonly exactLocator: 1;
    readonly nativeIdentifier: 1;
    readonly semantic: 0.9;
    readonly semanticThreshold: 0.9;
};
/** One ancestor recorded in an element's fingerprint chain. */
interface AncestorFingerprintEntry {
    role: string;
    subrole?: string;
    accessibleName?: string;
}
/** Normalized provider evidence stored behind an opaque target handle. */
export interface ComputerTargetDescriptor {
    locator: number[];
    nativeIdentifier?: string;
    role: string;
    subrole?: string;
    accessibleName?: string;
    ancestorFingerprint: AncestorFingerprintEntry[];
    normalizedFrame?: ComputerRect;
    availableActions: string[];
}
export declare function normalizedText(value: string | undefined): string | undefined;
export declare function locatorKey(locator: readonly number[]): string;
/** The memoized locator index of one observation, built on first use. */
export declare function locatorIndex(observation: BackendObservation): Map<string, BackendElement>;
export declare function sameLocator(left: readonly number[], right: readonly number[]): boolean;
export declare function sameStableFields(left: ComputerTargetDescriptor, right: ComputerTargetDescriptor): boolean;
export declare function sameSemanticIdentity(left: ComputerTargetDescriptor, right: ComputerTargetDescriptor): boolean;
export declare function sameExactIdentity(left: ComputerTargetDescriptor, right: ComputerTargetDescriptor): boolean;
export declare function sameRect(left: ComputerRect, right: ComputerRect): boolean;
export declare function sameWindow(left: BackendObservation['window'], right: BackendObservation['window']): boolean;
/** Accessible name of one backend element as the fingerprint layer normalizes it. */
export declare function fingerprintAccessibleName(element: BackendElement): string | undefined;
export {};
//# sourceMappingURL=optics.fingerprint.d.ts.map