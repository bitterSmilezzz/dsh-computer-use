/**
 * Motion budget: the argument envelope one action must fit before any lease,
 * queue, or provider work — the bounded value length, the wait matchers, and the
 * wait timeout a caller may ask for.
 *
 * Everything here is a constant or a pure predicate. The monotonic `maxWaitMs`
 * lift (`Math.max(maxWaitMs, maxSettleMs)`) belongs to
 * {@link file://../tuning/tuning.normalize.ts}, which is the only place a
 * ceiling is resolved; this file only enforces the resolved numbers.
 */
import type { BackendObservation } from '../binding/binding.port.ts';
import type { ComputerActionRequest, ComputerWaitCondition } from '../charter/charter.index.ts';
/**
 * Largest Accessibility value this Service will attempt to assign.
 *
 * Mirrors the byte-oriented `maxTextBytes` style of the observation limits with
 * one clear character bound: an element value far beyond any editable control's
 * capacity is a caller mistake, not an assignment worth a native round trip.
 */
export declare const MAX_SET_VALUE_CHARACTERS = 64000;
/** True when the caller supplied at least one matcher the wait can test. */
export declare function waitConditionDefined(condition: ComputerWaitCondition): boolean;
export declare function matchesWait(observation: BackendObservation, action: Extract<ComputerActionRequest, {
    kind: 'wait';
}>): boolean;
/**
 * Resolve the one wait timeout an action may use.
 *
 * An omitted timeout keeps the historical default (maxSettleMs), while the
 * ceiling is the separate maxWaitMs budget, so a slow load is no longer limited
 * by the post-action settle window.
 */
export declare function resolveWaitTimeout(timeoutMs: number | undefined, ceiling: {
    maxSettleMs: number;
    maxWaitMs: number;
}): number;
//# sourceMappingURL=motion.budget.d.ts.map