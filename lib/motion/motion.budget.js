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
import { ComputerUseError } from "../charter/charter.fault.js";
/**
 * Largest Accessibility value this Service will attempt to assign.
 *
 * Mirrors the byte-oriented `maxTextBytes` style of the observation limits with
 * one clear character bound: an element value far beyond any editable control's
 * capacity is a caller mistake, not an assignment worth a native round trip.
 */
export const MAX_SET_VALUE_CHARACTERS = 64_000;
/** True when the caller supplied at least one matcher the wait can test. */
export function waitConditionDefined(condition) {
    return condition.text !== undefined
        || condition.elementRole !== undefined
        || condition.elementTitle !== undefined
        || condition.elementValue !== undefined;
}
function waitConditionMatches(observation, condition) {
    if (condition.text !== undefined && !observation.treeText.toLocaleLowerCase().includes(condition.text.toLocaleLowerCase()))
        return false;
    if (condition.elementRole !== undefined && !observation.elements.some(element => element.role === condition.elementRole))
        return false;
    if (condition.elementTitle !== undefined && !observation.elements.some(element => element.title === condition.elementTitle || element.label === condition.elementTitle))
        return false;
    if (condition.elementValue !== undefined && !observation.elements.some(element => element.value === condition.elementValue))
        return false;
    return true;
}
export function matchesWait(observation, action) {
    const matched = waitConditionMatches(observation, action.condition);
    // `absent` inverts the matcher set so a caller can wait for a loading
    // indicator, banner, or dialog to disappear instead of polling observe.
    return action.condition.absent === true ? !matched : matched;
}
/**
 * Resolve the one wait timeout an action may use.
 *
 * An omitted timeout keeps the historical default (maxSettleMs), while the
 * ceiling is the separate maxWaitMs budget, so a slow load is no longer limited
 * by the post-action settle window.
 */
export function resolveWaitTimeout(timeoutMs, ceiling) {
    const resolved = timeoutMs ?? ceiling.maxSettleMs;
    if (!Number.isInteger(resolved) || resolved < 100 || resolved > ceiling.maxWaitMs) {
        throw new ComputerUseError('COMPUTER_INVALID_ARGUMENT', `wait timeoutMs must be an integer between 100 and ${ceiling.maxWaitMs} milliseconds`);
    }
    return resolved;
}
//# sourceMappingURL=motion.budget.js.map