/**
 * Optics locate: describing one element as a rebind-able descriptor, and
 * resolving that descriptor against a fresh provider observation.
 *
 * Resolution is fail-closed and deterministic. It never guesses: a tier either
 * produces exactly one candidate whose stable fields still match, or the whole
 * resolution is refused, with the evidence (candidate count, required
 * confidence) carried in the error. The tiers run in one fixed order — the
 * original locator, then the provider's own identifier, then semantic identity —
 * and the first tier that can vouch for a candidate wins.
 */
import { TARGET_RESOLUTION_CONFIDENCE, fingerprintAccessibleName, locatorIndex, locatorKey, normalizedText, sameExactIdentity, sameLocator, sameSemanticIdentity, sameStableFields, sameWindow, } from "./optics.fingerprint.js";
import { ComputerUseError } from "../charter/charter.fault.js";
/** Refuse one resolution with a published target error. */
function refused(code, message) {
    throw new ComputerUseError(code, message);
}
/** More than one candidate for a supposedly unique identity: refuse rather than pick one. */
function ambiguous(tier, candidateCount) {
    return refused('COMPUTER_TARGET_AMBIGUOUS', `${tier} resolution found ${candidateCount} candidates in the selected process and window`);
}
/** No candidate could be vouched for; the message says which evidence was missing. */
function tooWeak(candidateCount, reason) {
    return refused('COMPUTER_TARGET_LOW_CONFIDENCE', `${reason}; candidateCount=${candidateCount}, confidence=0, required=${TARGET_RESOLUTION_CONFIDENCE.semanticThreshold}`);
}
/** Build one successful resolution around an already-validated candidate. */
function hit(candidate, fresh, mode, confidence, candidateCount) {
    return {
        element: candidate.element,
        observation: fresh,
        resolution: { mode, confidence, candidateCount, targetChanged: mode !== 'exact-locator' },
    };
}
/**
 * The elements a descriptor was built from must still be the same process and
 * the same window; anything else makes the observed locator meaningless.
 */
function requireSameSubject(original, fresh) {
    const sameProcess = fresh.app.bundleId === original.app.bundleId && fresh.app.pid === original.app.pid;
    if (!sameProcess) {
        throw new ComputerUseError('COMPUTER_STALE_OBSERVATION', 'the selected application restarted or resolved to a different process');
    }
    if (sameWindow(original.window, fresh.window))
        return;
    throw new ComputerUseError('COMPUTER_STALE_OBSERVATION', 'the selected window changed after the referenced observation');
}
/**
 * Ancestor chain of one element, outermost first: only the fields a re-render
 * keeps are recorded, so the chain survives the target being re-created.
 */
function ancestorChain(element, byLocator) {
    const chain = [];
    for (let depth = 0; depth < element.locator.length; depth += 1) {
        const ancestor = byLocator.get(locatorKey(element.locator.slice(0, depth)));
        if (ancestor === undefined)
            continue;
        const name = fingerprintAccessibleName(ancestor);
        chain.push({
            role: ancestor.role,
            ...(ancestor.subrole === undefined ? {} : { subrole: ancestor.subrole }),
            ...(name === undefined ? {} : { accessibleName: name }),
        });
    }
    return chain;
}
/**
 * Element frame relative to the selected window, so a window that merely moved
 * does not look like an element that moved.
 */
function windowRelativeFrame(element, observation) {
    const frame = element.frame;
    if (frame === undefined)
        return undefined;
    const window = observation.window;
    if (window === undefined)
        return { ...frame };
    return {
        x: frame.x - window.frame.x,
        y: frame.y - window.frame.y,
        width: frame.width,
        height: frame.height,
    };
}
/** Build the normalized descriptor stored behind one opaque handle. */
export function describeComputerTarget(element, observation) {
    const ancestors = ancestorChain(element, locatorIndex(observation)).slice(-4);
    const nativeIdentifier = normalizedText(element.nativeIdentifier);
    const accessibleName = fingerprintAccessibleName(element);
    const normalizedFrame = windowRelativeFrame(element, observation);
    return {
        locator: [...element.locator],
        ...(nativeIdentifier === undefined ? {} : { nativeIdentifier }),
        role: element.role,
        ...(element.subrole === undefined ? {} : { subrole: element.subrole }),
        ...(accessibleName === undefined ? {} : { accessibleName }),
        ancestorFingerprint: ancestors,
        ...(normalizedFrame === undefined ? {} : { normalizedFrame }),
        availableActions: [...new Set(element.actions)].sort(),
    };
}
/**
 * Provider-native identifier tier: the strongest rebind, because the provider
 * itself names the element. Skipped when the described element had no identifier.
 */
const byNativeIdentifier = (expected, candidates, fresh) => {
    if (expected.nativeIdentifier === undefined)
        return undefined;
    const matches = candidates.filter(candidate => candidate.descriptor.nativeIdentifier === expected.nativeIdentifier);
    if (matches.length > 1)
        ambiguous('native identifier', matches.length);
    const match = matches[0];
    if (match === undefined)
        return undefined;
    if (!sameStableFields(expected, match.descriptor)) {
        tooWeak(1, 'the native identifier resolved to an element with different stable semantics');
    }
    return hit(match, fresh, 'native-identifier', TARGET_RESOLUTION_CONFIDENCE.nativeIdentifier, 1);
};
/**
 * Semantic tier: same role, accessible name, actions, and ancestor fingerprint.
 * The weakest tier, so it stays off entirely for an unnamed target — nothing
 * there would be unique enough to act on.
 */
const bySemanticIdentity = (expected, candidates, fresh) => {
    if (expected.accessibleName === undefined)
        return undefined;
    const matches = candidates.filter(candidate => sameSemanticIdentity(expected, candidate.descriptor));
    if (matches.length > 1)
        ambiguous('semantic', matches.length);
    if (matches.length === 0) {
        tooWeak(0, 'no candidate retained the target role, accessible name, actions, and ancestor fingerprint');
    }
    if (TARGET_RESOLUTION_CONFIDENCE.semantic < TARGET_RESOLUTION_CONFIDENCE.semanticThreshold) {
        tooWeak(matches.length, 'the deterministic semantic score is below the configured threshold');
    }
    return hit(matches[0], fresh, 'semantic-rebind', TARGET_RESOLUTION_CONFIDENCE.semantic, matches.length);
};
/** Rebinding tiers in the order they are tried. */
const REBIND_TIERS = [byNativeIdentifier, bySemanticIdentity];
/** Resolve one descriptor against a fresh provider observation without guessing. */
export function resolveComputerTarget(original, fresh, expected, allowRebind) {
    requireSameSubject(original, fresh);
    const candidates = fresh.elements.map(element => ({
        element,
        descriptor: describeComputerTarget(element, fresh),
    }));
    const exact = candidates.find(candidate => sameLocator(candidate.element.locator, expected.locator));
    if (exact !== undefined && sameExactIdentity(expected, exact.descriptor)) {
        return hit(exact, fresh, 'exact-locator', TARGET_RESOLUTION_CONFIDENCE.exactLocator, 1);
    }
    if (!allowRebind) {
        throw new ComputerUseError('COMPUTER_STALE_OBSERVATION', 'the target locator no longer identifies the selected element and rebinding was not allowed');
    }
    if (fresh.truncated) {
        tooWeak(0, 'target uniqueness cannot be established from a truncated fresh observation');
    }
    for (const tier of REBIND_TIERS) {
        const resolution = tier(expected, candidates, fresh);
        if (resolution !== undefined)
            return resolution;
    }
    tooWeak(0, 'the target has no native identifier or accessible name');
}
//# sourceMappingURL=optics.locate.js.map