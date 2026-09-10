/**
 * Optics fingerprint: normalized target descriptors, ancestor fingerprints, and the
 * stable/semantic/exact identity predicates the resolver decides with.
 */
/** Fixed confidence values used by the deterministic resolver. */
export const TARGET_RESOLUTION_CONFIDENCE = {
    exactLocator: 1,
    nativeIdentifier: 1,
    semantic: 0.9,
    semanticThreshold: 0.9,
};
/** Element-wise equality over two sequences of equal length. */
function sameSequence(left, right, equal) {
    return left.length === right.length && left.every((value, index) => equal(value, right[index]));
}
function sameEntry(left, right) {
    if (right === undefined)
        return false;
    return left.role === right.role
        && left.subrole === right.subrole
        && left.accessibleName === right.accessibleName;
}
function sameActions(left, right) {
    return sameSequence(left, right, (value, candidate) => value === candidate);
}
export function normalizedText(value) {
    const normalized = value?.normalize('NFKC').trim().replace(/\s+/gu, ' ');
    if (normalized === undefined || normalized.length === 0)
        return undefined;
    return normalized;
}
function accessibleName(element) {
    return normalizedText(element.label ?? element.title);
}
export function locatorKey(locator) {
    return locator.join('.');
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
const locatorIndexes = new WeakMap();
/** The memoized locator index of one observation, built on first use. */
export function locatorIndex(observation) {
    const cached = locatorIndexes.get(observation);
    if (cached !== undefined)
        return cached;
    const built = new Map(observation.elements.map(candidate => [locatorKey(candidate.locator), candidate]));
    locatorIndexes.set(observation, built);
    return built;
}
export function sameLocator(left, right) {
    return sameSequence(left, right, (value, candidate) => value === candidate);
}
function sameAncestorFingerprint(left, right) {
    return sameSequence(left, right, sameEntry);
}
export function sameStableFields(left, right) {
    if (left.role !== right.role)
        return false;
    if (left.subrole !== right.subrole)
        return false;
    if (left.accessibleName !== right.accessibleName)
        return false;
    if (!sameActions(left.availableActions, right.availableActions))
        return false;
    return sameAncestorFingerprint(left.ancestorFingerprint, right.ancestorFingerprint);
}
export function sameSemanticIdentity(left, right) {
    return left.accessibleName !== undefined && sameStableFields(left, right);
}
export function sameExactIdentity(left, right) {
    if (left.nativeIdentifier !== undefined || right.nativeIdentifier !== undefined) {
        return left.nativeIdentifier === right.nativeIdentifier && sameStableFields(left, right);
    }
    if (!sameStableFields(left, right))
        return false;
    const leftFrame = left.normalizedFrame;
    const rightFrame = right.normalizedFrame;
    if (leftFrame === undefined || rightFrame === undefined)
        return leftFrame === rightFrame;
    return sameRect(leftFrame, rightFrame);
}
export function sameRect(left, right) {
    return left.x === right.x
        && left.y === right.y
        && left.width === right.width
        && left.height === right.height;
}
export function sameWindow(left, right) {
    if (left === undefined || right === undefined)
        return left === right;
    return left.id === right.id && left.title === right.title && sameRect(left.frame, right.frame);
}
/** Accessible name of one backend element as the fingerprint layer normalizes it. */
export function fingerprintAccessibleName(element) {
    return accessibleName(element);
}
//# sourceMappingURL=optics.fingerprint.js.map