/** Custody lease: interactive read/control leases with durable denials and serialized tails. */
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { ToolCallId } from '@deepseek-ai/dsh-llm';
import type { Context } from '@deepseek-ai/cordis';
import { type ComputerLeaseSource } from './custody.lease-state.ts';
import type { ComputerAppIdentity } from '../charter/charter.index.ts';
import type { ResolvedComputerUseConfig } from '../tuning/tuning.schema.ts';
/** Applies configured app policy and routes missing leases through DSH approval. */
export declare class ComputerLeaseManager {
    private readonly ctx;
    private readonly config;
    private storage;
    private readonly storageFiber;
    private readonly decisions;
    private readonly mutations;
    private readonly controlGrants;
    constructor(ctx: Context, config: () => ResolvedComputerUseConfig);
    /**
     * Open the durable sidecar once the storage service is composed and keep the
     * binding until it is torn down. Teardown drains queued writes first, so a
     * closing table can never drop a decision that was already granted.
     */
    private openSidecar;
    /** Open (or confirm) the sidecar before the first decision needs a row. */
    initialize(): Promise<void>;
    /** Ensure one Agent may read or control one exact running application. */
    ensure(agent: Agent, app: ComputerAppIdentity, scope: 'read' | 'control', toolName: string, callId: ToolCallId | undefined, signal: AbortSignal): Promise<ComputerLeaseSource>;
    /** Forget process-local control grants when their Agent is disposed. */
    releaseAgent(agent: Agent): void;
    /**
     * Decide one interactive lease. Everything here is fail-closed: a request that
     * cannot be proven granted — outside a turn, without storage, refused by
     * approval — ends as a refusal, never as an implicit allow.
     */
    private ensureInteractive;
    /** Turn one approval outcome into a grant, a durable denial, or a refusal. */
    private settleOutcome;
    /**
     * What this Session already decided about the app/scope pair. A control grant
     * is held for the current turn only, a read grant for the whole Session, and a
     * denial for the rest of it; that order is the order of the checks below.
     */
    private rememberedDecision;
    /** Control consent lives in process memory and expires with the turn. */
    private rememberControlGrant;
    /** The open turn this request belongs to; without one nothing can be granted. */
    private openTurn;
    /**
     * The Session log through the current `snapshotEvents()` surface, with the
     * legacy `events` array of pre-0.1.2-alpha.4 Sessions as the fallback.
     */
    private sessionLog;
    /** This Agent's durable state, or undefined when there is nothing to trust. */
    private currentState;
    /** The stored row, unless it belongs to a different header identity. */
    private rememberedRow;
    /** The remembered row, or a fresh empty one when this Session has no state yet. */
    private rowFor;
    /**
     * The sidecar opens lazily: only a composed storage-domain service can open
     * it, and every decision path awaits that opening before it reads a row.
     */
    private prepareStorage;
    /**
     * Make one decision durable after the approval audit. The Session log is
     * flushed first, so the sidecar row can never outrun the transcript that
     * explains why it exists.
     */
    private persist;
    /**
     * Fold one decision onto a row: read grants accumulate, denials append at most
     * once per app and scope, and the result is frozen into a new snapshot.
     */
    private foldDecision;
    /** The one failure every storage-less interactive path raises. */
    private storageRequired;
}
//# sourceMappingURL=custody.lease.d.ts.map