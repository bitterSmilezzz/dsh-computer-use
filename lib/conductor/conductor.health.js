/** Conductor health: the last provider health facts and their public projection. */
/** The unpublished default: nothing is ready until the provider says so. */
export const UNAVAILABLE_HEALTH = {
    ready: false,
    accessibility: 'unavailable',
    screenRecording: 'unavailable',
};
/** Persist backend health facts while allowing a disabled provider to stay ready=false with a visible reason. */
export function applyHealth(health) {
    return {
        ready: health.ready ?? true,
        helperVersion: health.helperVersion,
        helperSha256: health.helperSha256,
        accessibility: health.accessibility,
        screenRecording: health.screenRecording,
        ...(health.error === undefined ? {} : { lastError: health.error }),
    };
}
/** Health state for a provider generation that never answered. */
export function unavailableHealth(message) {
    return { ...UNAVAILABLE_HEALTH, lastError: message };
}
/** Keep the last known facts, but mark the provider not ready and show why. */
export function degradedHealth(current, message) {
    return { ...current, ready: false, lastError: message };
}
/** Current provider and permission diagnostics. */
export function describeStatus(host) {
    return {
        platform: host.platform,
        provider: host.provider,
        generation: host.generation,
        helperPath: host.helperPath,
        ...host.health,
    };
}
//# sourceMappingURL=conductor.health.js.map