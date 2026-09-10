/**
 * Custody lease state: the durable Session-sidecar row shape plus the turn,
 * identity, snapshot, and configured-access helpers the lease manager decides with.
 *
 * The zod schema and domain contract themselves are charter facts and stay in
 * {@link file://../charter/charter.custody.ts}; this module owns their custody-side use.
 */
import type { SessionEvent, SessionHeader, SessionId } from '@deepseek-ai/dsh-session';
import type { KvTable } from '@deepseek-ai/dsh-storage-domain';
import type { ComputerUseDeniedLease, ComputerUseSessionIdentity, ComputerUseSessionState } from '../charter/charter.custody.ts';
import type { ResolvedComputerUseConfig } from '../tuning/tuning.schema.ts';
/** Session-sidecar lease schema and domain contract, defined in the custody charter. */
export { computerUseSessionStateSchema, computerUseStateDomainSpec, } from '../charter/charter.custody.ts';
export type { ComputerLeaseSource, ComputerUseDeniedLease, ComputerUseSessionIdentity, ComputerUseSessionState, } from '../charter/charter.custody.ts';
/** Live handle to the opened sidecar table for one Session id. */
export interface StorageBinding {
    table: KvTable<SessionId, ComputerUseSessionState>;
}
/** Open turn number of the innermost started-and-unfinished turn, if any. */
export declare function currentTurn(events: readonly SessionEvent[]): number | undefined;
/** Session lifecycle facts that fence one sidecar row to one exact Session. */
export declare function identityOf(header: SessionHeader): ComputerUseSessionIdentity;
/** True when a stored row still belongs to the Session header asking for it. */
export declare function sameIdentity(row: ComputerUseSessionState, header: SessionHeader): boolean;
/** Freeze one immutable snapshot of the durable read grants and denials. */
export declare function stateSnapshot(header: SessionHeader, readGrants: Iterable<string>, denied: Iterable<ComputerUseDeniedLease>): ComputerUseSessionState;
/** Configured static app policy, checked before any interactive approval. */
export declare function configuredAccess(config: ResolvedComputerUseConfig, bundleId: string, scope: 'read' | 'control'): boolean;
//# sourceMappingURL=custody.lease-state.d.ts.map