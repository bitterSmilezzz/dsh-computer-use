/**
 * Conductor capture: turn one provider frame into the projected, stored, and
 * returned observation.
 *
 * The frame the caller asked for is reused whenever it already carries the
 * evidence the request needs, and a frame that lacks it is never downgraded in
 * place — the provider is asked again instead.
 */
import type { BackendObservation, ComputerUseBackend } from '../binding/binding.port.ts';
import { type ComputerAppIdentity, type ComputerObservation, type ComputerObserveRequest, type ComputerUseContext } from '../charter/charter.index.ts';
import type { Ledger } from '../custody/custody.ledger.ts';
import type { ResolvedComputerUseConfig } from '../tuning/tuning.schema.ts';
/** Everything one capture needs from the live service generation. */
export interface CaptureHost {
    readonly backend: ComputerUseBackend;
    readonly config: ResolvedComputerUseConfig;
    readonly ledger: Ledger;
    /** Aborted when this service generation is disposed. */
    readonly lifetime: AbortSignal;
}
/** Observe (or reuse), project, store, and return one observation. */
export declare function captureObservation(host: CaptureHost, app: ComputerAppIdentity, request: ComputerObserveRequest, context: ComputerUseContext, sourceTool: 'computer_observe' | 'computer_action', preObserved?: BackendObservation): Promise<ComputerObservation>;
//# sourceMappingURL=conductor.capture.d.ts.map