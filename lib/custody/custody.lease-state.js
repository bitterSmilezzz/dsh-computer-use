/**
 * Custody lease state: the durable Session-sidecar row shape plus the turn,
 * identity, snapshot, and configured-access helpers the lease manager decides with.
 *
 * The zod schema and domain contract themselves are charter facts and stay in
 * {@link file://../charter/charter.custody.ts}; this module owns their custody-side use.
 */
/** Session-sidecar lease schema and domain contract, defined in the custody charter. */
export { computerUseSessionStateSchema, computerUseStateDomainSpec, } from "../charter/charter.custody.js";
/** Open turn number of the innermost started-and-unfinished turn, if any. */
export function currentTurn(events) {
    for (let index = events.length - 1; index >= 0; index -= 1) {
        const event = events[index];
        if (event?.type === 'turn/end')
            return undefined;
        if (event?.type === 'turn/start')
            return event.data.turn;
    }
    return undefined;
}
/** Session lifecycle facts that fence one sidecar row to one exact Session. */
export function identityOf(header) {
    return Object.freeze({
        createdAt: header.createdAt,
        ...(header.cwd === undefined ? {} : { cwd: header.cwd }),
    });
}
/** True when a stored row still belongs to the Session header asking for it. */
export function sameIdentity(row, header) {
    return row.session.createdAt === header.createdAt && row.session.cwd === header.cwd;
}
/** Freeze one immutable snapshot of the durable read grants and denials. */
export function stateSnapshot(header, readGrants, denied) {
    const readGrantSnapshot = Object.freeze([...readGrants]);
    const deniedSnapshot = Object.freeze([...denied].map(item => Object.freeze({ ...item })));
    return Object.freeze({
        session: identityOf(header),
        readGrants: readGrantSnapshot,
        denied: deniedSnapshot,
    });
}
/** Configured static app policy, checked before any interactive approval. */
export function configuredAccess(config, bundleId, scope) {
    if (config.allowAllApps)
        return true;
    return config.grants.find(grant => grant.bundleId === bundleId)?.[scope] === true;
}
//# sourceMappingURL=custody.lease-state.js.map