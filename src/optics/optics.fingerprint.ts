/**
 * Optics fingerprint: normalized target descriptors, ancestor fingerprints, and the
 * stable/semantic/exact identity predicates the resolver decides with.
 */

import type { BackendElement, BackendObservation } from './optics.sighting.ts'
import type { ComputerRect } from '../charter/charter.index.ts'

/** Fixed confidence values used by the deterministic resolver. */
export const TARGET_RESOLUTION_CONFIDENCE = {
  exactLocator: 1,
  nativeIdentifier: 1,
  semantic: 0.9,
  semanticThreshold: 0.9,
} as const

/** One ancestor recorded in an element's fingerprint chain. */
interface AncestorFingerprintEntry {
  role: string
  subrole?: string
  accessibleName?: string
}

/** Normalized provider evidence stored behind an opaque target handle. */
export interface ComputerTargetDescriptor {
  locator: number[]
  nativeIdentifier?: string
  role: string
  subrole?: string
  accessibleName?: string
  ancestorFingerprint: AncestorFingerprintEntry[]
  normalizedFrame?: ComputerRect
  availableActions: string[]
}

/** Element-wise equality over two sequences of equal length. */
function sameSequence<T>(
  left: readonly T[],
  right: readonly T[],
  equal: (left: T, right: T | undefined) => boolean,
): boolean {
  return left.length === right.length && left.every((value, index) => equal(value, right[index]))
}

function sameEntry(left: AncestorFingerprintEntry, right: AncestorFingerprintEntry | undefined): boolean {
  if (right === undefined) return false
  return left.role === right.role
    && left.subrole === right.subrole
    && left.accessibleName === right.accessibleName
}

function sameActions(left: readonly string[], right: readonly string[]): boolean {
  return sameSequence(left, right, (value, candidate) => value === candidate)
}

export function normalizedText(value: string | undefined): string | undefined {
  const normalized = value?.normalize('NFKC').trim().replace(/\s+/gu, ' ')
  if (normalized === undefined || normalized.length === 0) return undefined
  return normalized
}

function accessibleName(element: BackendElement): string | undefined {
  return normalizedText(element.label ?? element.title)
}

export function locatorKey(locator: readonly number[]): string {
  return locator.join('.')
}

/**
 * Lazily built locator index per provider observation.
 *
 * Projection and rebinding describe every element of one observation against
 * the same immutable element list, so rebuilding this map per element made both
 * paths quadratic (500 elements meant 250k map inserts on the host thread that
 * also drives the UI). Observations are replaced instead of mutated, and the
 * WeakMap keeps the index alive exactly as long as the observation that owns it,
 * so a replaced observation can never serve a stale index.
 */
const locatorIndexes = new WeakMap<BackendObservation, Map<string, BackendElement>>()

/** The memoized locator index of one observation, built on first use. */
export function locatorIndex(observation: BackendObservation): Map<string, BackendElement> {
  const cached = locatorIndexes.get(observation)
  if (cached !== undefined) return cached
  const built = new Map(observation.elements.map(candidate => [locatorKey(candidate.locator), candidate]))
  locatorIndexes.set(observation, built)
  return built
}

export function sameLocator(left: readonly number[], right: readonly number[]): boolean {
  return sameSequence(left, right, (value, candidate) => value === candidate)
}

function sameAncestorFingerprint(
  left: readonly AncestorFingerprintEntry[],
  right: readonly AncestorFingerprintEntry[],
): boolean {
  return sameSequence(left, right, sameEntry)
}

export function sameStableFields(left: ComputerTargetDescriptor, right: ComputerTargetDescriptor): boolean {
  if (left.role !== right.role) return false
  if (left.subrole !== right.subrole) return false
  if (left.accessibleName !== right.accessibleName) return false
  if (!sameActions(left.availableActions, right.availableActions)) return false
  return sameAncestorFingerprint(left.ancestorFingerprint, right.ancestorFingerprint)
}

export function sameSemanticIdentity(left: ComputerTargetDescriptor, right: ComputerTargetDescriptor): boolean {
  return left.accessibleName !== undefined && sameStableFields(left, right)
}

export function sameExactIdentity(left: ComputerTargetDescriptor, right: ComputerTargetDescriptor): boolean {
  if (left.nativeIdentifier !== undefined || right.nativeIdentifier !== undefined) {
    return left.nativeIdentifier === right.nativeIdentifier && sameStableFields(left, right)
  }
  if (!sameStableFields(left, right)) return false
  const leftFrame = left.normalizedFrame
  const rightFrame = right.normalizedFrame
  if (leftFrame === undefined || rightFrame === undefined) return leftFrame === rightFrame
  return sameRect(leftFrame, rightFrame)
}

export function sameRect(left: ComputerRect, right: ComputerRect): boolean {
  return left.x === right.x
    && left.y === right.y
    && left.width === right.width
    && left.height === right.height
}

export function sameWindow(left: BackendObservation['window'], right: BackendObservation['window']): boolean {
  if (left === undefined || right === undefined) return left === right
  return left.id === right.id && left.title === right.title && sameRect(left.frame, right.frame)
}

/** Accessible name of one backend element as the fingerprint layer normalizes it. */
export function fingerprintAccessibleName(element: BackendElement): string | undefined {
  return accessibleName(element)
}
