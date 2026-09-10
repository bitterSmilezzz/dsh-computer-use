/**
 * Stable Computer Use failure codes returned across provider and Tool boundaries.
 *
 * The codes live in one runtime list so a provider-reported string can be
 * matched against the same vocabulary instead of being asserted into the union.
 */
export const COMPUTER_USE_ERROR_CODES = [
    // Platform and permission gate.
    'COMPUTER_UNSUPPORTED_PLATFORM',
    'COMPUTER_PERMISSION_REQUIRED',
    'COMPUTER_APP_NOT_FOUND',
    'COMPUTER_STALE_OBSERVATION',
    // Observation and target resolution.
    'COMPUTER_ELEMENT_UNAVAILABLE',
    'COMPUTER_TARGET_UNAVAILABLE',
    'COMPUTER_TARGET_AMBIGUOUS',
    'COMPUTER_TARGET_LOW_CONFIDENCE',
    // Confirmation and action admission.
    'COMPUTER_TARGET_REBIND_REQUIRES_CONFIRMATION',
    'COMPUTER_CONFIRMATION_REQUIRED',
    'COMPUTER_ACTION_BLOCKED',
    'COMPUTER_INVALID_ARGUMENT',
    // Terminal outcomes.
    'COMPUTER_TIMEOUT',
    'COMPUTER_CANCELLED',
    'COMPUTER_PROVIDER_FAILURE',
];
/** Return the exact known failure code, or `undefined` when a provider reports a string outside the vocabulary. */
export function computerUseErrorCode(value) {
    if (!COMPUTER_USE_ERROR_CODES.includes(value))
        return undefined;
    return value;
}
/** Failure carrying a stable model-visible code and bounded public details. */
export class ComputerUseError extends Error {
    code;
    /**
     * @param code - Stable failure category the caller can branch on.
     * @param message - Bounded, correction-oriented description with no UI secrets.
     * @param options - Cause, kept out of the model-facing message.
     */
    constructor(code, message, options) {
        super(`${code}: ${message}`, options);
        this.code = code;
        this.name = 'ComputerUseError';
    }
}
/** Fold an unknown failure into the provider-failure category without leaking unbounded native text. */
export function computerUseError(error, fallback) {
    if (error instanceof ComputerUseError)
        return error;
    const detail = error instanceof Error ? error.message : String(error);
    return new ComputerUseError('COMPUTER_PROVIDER_FAILURE', `${fallback}: ${detail.slice(0, 1000)}`, { cause: error });
}
//# sourceMappingURL=charter.fault.js.map