/**
 * Stable Computer Use failure codes returned across provider and Tool boundaries.
 *
 * Declared as one runtime list so a provider-reported string can be checked
 * against the same vocabulary instead of being asserted into the union.
 */
export const COMPUTER_USE_ERROR_CODES = [
  'COMPUTER_UNSUPPORTED_PLATFORM',
  'COMPUTER_PERMISSION_REQUIRED',
  'COMPUTER_APP_NOT_FOUND',
  'COMPUTER_STALE_OBSERVATION',
  'COMPUTER_ELEMENT_UNAVAILABLE',
  'COMPUTER_TARGET_UNAVAILABLE',
  'COMPUTER_TARGET_AMBIGUOUS',
  'COMPUTER_TARGET_LOW_CONFIDENCE',
  'COMPUTER_TARGET_REBIND_REQUIRES_CONFIRMATION',
  'COMPUTER_CONFIRMATION_REQUIRED',
  'COMPUTER_ACTION_BLOCKED',
  'COMPUTER_INVALID_ARGUMENT',
  'COMPUTER_TIMEOUT',
  'COMPUTER_CANCELLED',
  'COMPUTER_PROVIDER_FAILURE',
] as const

export type ComputerUseErrorCode = (typeof COMPUTER_USE_ERROR_CODES)[number]

/** Return the exact known failure code, or `undefined` for a provider-reported string outside the vocabulary. */
export function computerUseErrorCode(value: string): ComputerUseErrorCode | undefined {
  return (COMPUTER_USE_ERROR_CODES as readonly string[]).includes(value)
    ? value as ComputerUseErrorCode
    : undefined
}

/** Error with a stable model-visible code and bounded public details. */
export class ComputerUseError extends Error {
  readonly code: ComputerUseErrorCode

  /**
   * @param code - Stable failure category.
   * @param message - Bounded correction-oriented description without UI secrets.
   * @param options - Optional original cause retained outside the model-facing message.
   */
  constructor(code: ComputerUseErrorCode, message: string, options?: ErrorOptions) {
    super(`${code}: ${message}`, options)
    this.name = 'ComputerUseError'
    this.code = code
  }
}

/** Convert an unknown failure into the provider-failure category without leaking unbounded native text. */
export function computerUseError(error: unknown, fallback: string): ComputerUseError {
  if (error instanceof ComputerUseError) return error
  const message = error instanceof Error ? error.message : String(error)
  return new ComputerUseError('COMPUTER_PROVIDER_FAILURE', `${fallback}: ${message.slice(0, 1000)}`, { cause: error })
}
