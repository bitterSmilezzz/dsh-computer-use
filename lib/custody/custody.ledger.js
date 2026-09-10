/**
 * Custody ledger: the per-Agent observation index, its TTL/generation pruning,
 * and the storage write path that keeps model-visible observations addressable.
 */
import { ComputerUseError } from "../charter/charter.fault.js";
/** Observations retained per Agent before the oldest rows are dropped. */
const MAX_OBSERVATIONS_PER_AGENT = 64;
/** One provider generation's observation index, keyed by Agent. */
export class Ledger {
    generation = 1;
    agents = new Map();
    /** Bump the provider generation; every earlier observation becomes stale. */
    nextGeneration() {
        this.generation += 1;
    }
    /** The current provider generation stamped onto newly stored observations. */
    get currentGeneration() {
        return this.generation;
    }
    /** Open or create the observation index for one Agent. */
    stateOf(agent) {
        let state = this.agents.get(agent);
        if (state === undefined) {
            state = { observations: new Map(), latestByApp: new Map() };
            this.agents.set(agent, state);
        }
        return state;
    }
    /** Drop every observation whose TTL elapsed or whose generation was replaced. */
    prune(agent) {
        const state = this.agents.get(agent);
        if (state === undefined)
            return;
        const now = Date.now();
        for (const [id, stored] of state.observations) {
            if (Date.parse(stored.public.expiresAt) <= now || stored.generation !== this.generation)
                state.observations.delete(id);
        }
        for (const [app, id] of state.latestByApp) {
            if (!state.observations.has(id))
                state.latestByApp.delete(app);
        }
    }
    /** Resolve one live observation or fail closed with the stale-observation code. */
    require(id, agent) {
        this.prune(agent);
        const stored = this.stateOf(agent).observations.get(id);
        if (stored === undefined || stored.generation !== this.generation) {
            throw new ComputerUseError('COMPUTER_STALE_OBSERVATION', `observation ${String(id)} is unknown, expired, or belongs to another provider generation`);
        }
        return stored;
    }
    /** Store one freshly captured observation and bound the retained history. */
    store(agent, key, observation, backend, targets) {
        const state = this.stateOf(agent);
        state.observations.set(observation.observationId, { public: observation, backend, targets, generation: this.generation });
        state.latestByApp.set(key, observation.observationId);
        while (state.observations.size > MAX_OBSERVATIONS_PER_AGENT) {
            const oldest = state.observations.keys().next().value;
            if (oldest === undefined)
                break;
            state.observations.delete(oldest);
        }
    }
    /** Forget the observations of one disposed Agent. */
    releaseAgent(agent) {
        this.agents.delete(agent);
    }
    /** Forget every Agent's observations on teardown or provider replacement. */
    clear() {
        this.agents.clear();
    }
}
//# sourceMappingURL=custody.ledger.js.map