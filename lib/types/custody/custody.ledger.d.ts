/**
 * Custody ledger: the per-Agent observation index, its TTL/generation pruning,
 * and the storage write path that keeps model-visible observations addressable.
 */
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { BackendObservation } from '../optics/optics.sighting.ts';
import type { ComputerTargetDescriptor } from '../optics/optics.fingerprint.ts';
import type { AgentObservationState, StoredObservation } from '../optics/optics.snapshot.ts';
import type { ComputerObservation, ComputerObservationId, ComputerTargetHandle } from '../charter/charter.index.ts';
export type { AgentObservationState, StoredObservation } from '../optics/optics.snapshot.ts';
/** One provider generation's observation index, keyed by Agent. */
export declare class Ledger {
    private generation;
    private readonly agents;
    /** Bump the provider generation; every earlier observation becomes stale. */
    nextGeneration(): void;
    /** The current provider generation stamped onto newly stored observations. */
    get currentGeneration(): number;
    /** Open or create the observation index for one Agent. */
    stateOf(agent: Agent): AgentObservationState;
    /** Drop every observation whose TTL elapsed or whose generation was replaced. */
    prune(agent: Agent): void;
    /** Resolve one live observation or fail closed with the stale-observation code. */
    require(id: ComputerObservationId, agent: Agent): StoredObservation;
    /** Store one freshly captured observation and bound the retained history. */
    store(agent: Agent, key: string, observation: ComputerObservation, backend: BackendObservation, targets: Map<ComputerTargetHandle, ComputerTargetDescriptor>): void;
    /** Forget the observations of one disposed Agent. */
    releaseAgent(agent: Agent): void;
    /** Forget every Agent's observations on teardown or provider replacement. */
    clear(): void;
}
//# sourceMappingURL=custody.ledger.d.ts.map