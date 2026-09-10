/** Custody lease: interactive read/control leases with durable denials and serialized tails. */
import { approvalPolicy } from "./custody.policy.js";
import { configuredAccess, currentTurn, sameIdentity, stateSnapshot, } from "./custody.lease-state.js";
import { computerUseStateDomainSpec } from "../charter/charter.custody.js";
import { ComputerUseError } from "../charter/charter.fault.js";
function boundedFailure(error) {
    return (error instanceof Error ? error.message : String(error)).slice(0, 500);
}
/** Every lease refusal speaks with this one code, so callers can branch on it. */
function permissionRequired(message) {
    return new ComputerUseError('COMPUTER_PERMISSION_REQUIRED', message);
}
/** How a persistence failure names the decision it could not store. */
function describePurpose(decision) {
    return decision.kind === 'read-granted'
        ? 'the Session-wide read grant'
        : `the Session-wide ${decision.scope} denial`;
}
/** The question the user is asked, phrased for the scope being requested. */
function approvalReason(app, scope) {
    if (scope === 'read') {
        return `Allow this Agent to inspect the Accessibility state and requested screenshot of ${app.name} (${app.bundleId}) for this Session.`;
    }
    return `Allow this Agent to send UI input to ${app.name} (${app.bundleId}) for the current turn.`;
}
/**
 * A per-key promise chain. Operations queued for one Session run strictly one
 * after another — decisions in arrival order, sidecar writes in decision order —
 * while unrelated Sessions keep running in parallel.
 */
class SerialTails {
    tails = new Map();
    /** Append one operation behind everything already queued for `key`. */
    run(key, operation) {
        const previous = this.tails.get(key) ?? Promise.resolve();
        const result = previous.then(operation);
        const tail = result.then(() => undefined, () => undefined);
        this.tails.set(key, tail);
        return result.finally(() => {
            if (this.tails.get(key) === tail)
                this.tails.delete(key);
        });
    }
    /** Every queued tail, so a teardown never closes under a live write. */
    pending() {
        return Promise.all(this.tails.values());
    }
}
/** Applies configured app policy and routes missing leases through DSH approval. */
export class ComputerLeaseManager {
    ctx;
    config;
    storage;
    storageFiber;
    decisions = new SerialTails();
    mutations = new SerialTails();
    controlGrants = new WeakMap();
    constructor(ctx, config) {
        this.ctx = ctx;
        this.config = config;
        this.storageFiber = ctx.inject(['storageDomain'], storageCtx => this.openSidecar(storageCtx));
        ctx.effect(() => () => this.storageFiber.dispose(), 'dsh-computer-use: optional lease sidecar');
    }
    /**
     * Open the durable sidecar once the storage service is composed and keep the
     * binding until it is torn down. Teardown drains queued writes first, so a
     * closing table can never drop a decision that was already granted.
     */
    async openSidecar(storageCtx) {
        const domain = await storageCtx.storageDomain.open(computerUseStateDomainSpec);
        const binding = { table: domain.table('sessions') };
        this.storage = binding;
        return async () => {
            if (this.storage === binding)
                this.storage = undefined;
            await this.mutations.pending();
            await domain.close();
        };
    }
    /** Open (or confirm) the sidecar before the first decision needs a row. */
    async initialize() {
        await this.prepareStorage();
    }
    /** Ensure one Agent may read or control one exact running application. */
    async ensure(agent, app, scope, toolName, callId, signal) {
        if (configuredAccess(this.config(), app.bundleId, scope))
            return 'configured';
        const request = { agent, app, scope, toolName, callId, signal };
        return this.decisions.run(agent.session.id, async () => {
            // The queue is not instantaneous: while this request waited for its turn,
            // an earlier decision may have granted exactly what it asks for.
            if (configuredAccess(this.config(), app.bundleId, scope))
                return 'configured';
            return this.ensureInteractive(request);
        });
    }
    /** Forget process-local control grants when their Agent is disposed. */
    releaseAgent(agent) {
        this.controlGrants.delete(agent);
    }
    /**
     * Decide one interactive lease. Everything here is fail-closed: a request that
     * cannot be proven granted — outside a turn, without storage, refused by
     * approval — ends as a refusal, never as an implicit allow.
     */
    async ensureInteractive(request) {
        const { agent, app, scope } = request;
        await this.prepareStorage();
        const turn = this.openTurn(request);
        const remembered = this.rememberedDecision(request, turn);
        if (remembered === 'granted')
            return 'approved';
        if (remembered === 'denied') {
            throw permissionRequired(`${scope} access for ${app.name} was rejected earlier in this Session; do not retry without new user instructions`);
        }
        if (approvalPolicy(this.ctx, agent) === 'never') {
            throw permissionRequired([
                `${scope} access for ${app.name} is blocked because approval prompts are disabled in this Session`,
                '(approval/policy: never, e.g. the danger-full-access preset);',
                `add "${app.bundleId}" to the computer-use grants in Settings, or switch the permission preset to one with approval ask`,
            ].join(' '));
        }
        if (scope === 'read' && this.storage === undefined) {
            throw this.storageRequired(app, scope, 'a Session-wide interactive read grant');
        }
        const outcome = await this.ctx.approval.request({
            agent,
            toolName: request.toolName,
            ...(request.callId === undefined ? {} : { callId: request.callId }),
            reason: approvalReason(app, scope),
            signal: request.signal,
        });
        return this.settleOutcome(request, turn, outcome);
    }
    /** Turn one approval outcome into a grant, a durable denial, or a refusal. */
    async settleOutcome(request, turn, outcome) {
        const { agent, app, scope } = request;
        switch (outcome) {
            case 'cancelled':
                throw new ComputerUseError('COMPUTER_CANCELLED', `${scope} access request for ${app.name} was cancelled`);
            case 'rejected': {
                if (this.storage === undefined) {
                    throw this.storageRequired(app, scope, 'the rejected interactive decision');
                }
                await this.persist(agent, app, { kind: 'denied', scope });
                throw permissionRequired(`${scope} access for ${app.name} was not granted (rejected); do not retry in this Session without new user instructions`);
            }
            case 'allowed-once':
                break;
            default:
                throw permissionRequired(`${scope} access for ${app.name} was not granted (${outcome})`);
        }
        if (scope === 'control') {
            this.rememberControlGrant(agent, app.bundleId, turn);
            return 'approved';
        }
        await this.persist(agent, app, { kind: 'read-granted' });
        return 'approved';
    }
    /**
     * What this Session already decided about the app/scope pair. A control grant
     * is held for the current turn only, a read grant for the whole Session, and a
     * denial for the rest of it; that order is the order of the checks below.
     */
    rememberedDecision(request, turn) {
        const { agent, app, scope } = request;
        if (scope === 'control' && this.controlGrants.get(agent)?.get(app.bundleId) === turn)
            return 'granted';
        const stored = this.currentState(agent);
        if (scope === 'read' && stored?.readGrants.includes(app.bundleId) === true)
            return 'granted';
        if (stored?.denied.some(denial => denial.bundleId === app.bundleId && denial.scope === scope) === true) {
            return 'denied';
        }
        return undefined;
    }
    /** Control consent lives in process memory and expires with the turn. */
    rememberControlGrant(agent, bundleId, turn) {
        const grants = this.controlGrants.get(agent) ?? new Map();
        grants.set(bundleId, turn);
        this.controlGrants.set(agent, grants);
    }
    /** The open turn this request belongs to; without one nothing can be granted. */
    openTurn(request) {
        const { agent, app, scope } = request;
        const turn = currentTurn(this.sessionLog(agent));
        if (turn === undefined) {
            throw permissionRequired(`${scope} access for ${app.name} must be requested inside an open Agent turn`);
        }
        return turn;
    }
    /**
     * The Session log through the current `snapshotEvents()` surface, with the
     * legacy `events` array of pre-0.1.2-alpha.4 Sessions as the fallback.
     */
    sessionLog(agent) {
        const session = agent.session;
        return typeof session.snapshotEvents === 'function' ? session.snapshotEvents() : session.events ?? [];
    }
    /** This Agent's durable state, or undefined when there is nothing to trust. */
    currentState(agent) {
        return this.storage === undefined ? undefined : this.rememberedRow(this.storage, agent);
    }
    /** The stored row, unless it belongs to a different header identity. */
    rememberedRow(binding, agent) {
        const stored = binding.table.get(agent.session.id);
        return stored !== undefined && sameIdentity(stored, agent.session.header) ? stored : undefined;
    }
    /** The remembered row, or a fresh empty one when this Session has no state yet. */
    rowFor(binding, agent) {
        return this.rememberedRow(binding, agent) ?? stateSnapshot(agent.session.header, [], []);
    }
    /**
     * The sidecar opens lazily: only a composed storage-domain service can open
     * it, and every decision path awaits that opening before it reads a row.
     */
    async prepareStorage() {
        if (this.storage === undefined && this.ctx.get('storageDomain') !== undefined)
            await this.storageFiber;
        return this.storage;
    }
    /**
     * Make one decision durable after the approval audit. The Session log is
     * flushed first, so the sidecar row can never outrun the transcript that
     * explains why it exists.
     */
    async persist(agent, app, decision) {
        const purpose = describePurpose(decision);
        try {
            const participated = await this.ctx.sessions.flush(agent.session);
            if (!participated) {
                throw new Error('no Session persistence listener participated in ctx.sessions.flush');
            }
            await this.mutations.run(agent.session.id, async () => {
                const binding = this.storage;
                if (binding === undefined) {
                    throw this.storageRequired(app, decision.kind === 'read-granted' ? 'read' : decision.scope, purpose);
                }
                await binding.table.put(agent.session.id, this.foldDecision(this.rowFor(binding, agent), agent, app, decision));
            });
        }
        catch (error) {
            if (error instanceof ComputerUseError)
                throw error;
            const failure = boundedFailure(error);
            throw new ComputerUseError('COMPUTER_PERMISSION_REQUIRED', `${purpose} for ${app.name} could not be persisted after the approval audit: ${failure}; configure working Session persistence and @deepseek-ai/dsh-storage-domain before retrying`, { cause: error });
        }
    }
    /**
     * Fold one decision onto a row: read grants accumulate, denials append at most
     * once per app and scope, and the result is frozen into a new snapshot.
     */
    foldDecision(row, agent, app, decision) {
        const header = agent.session.header;
        if (decision.kind === 'read-granted') {
            const readGrants = new Set(row.readGrants);
            readGrants.add(app.bundleId);
            return stateSnapshot(header, readGrants, row.denied);
        }
        const alreadyDenied = row.denied.some(item => item.bundleId === app.bundleId && item.scope === decision.scope);
        const denied = alreadyDenied ? row.denied : [...row.denied, { bundleId: app.bundleId, scope: decision.scope }];
        return stateSnapshot(header, row.readGrants, denied);
    }
    /** The one failure every storage-less interactive path raises. */
    storageRequired(app, scope, purpose) {
        return permissionRequired([
            `${scope} access for ${app.name} requires ctx.storageDomain to persist ${purpose};`,
            `compose @deepseek-ai/dsh-storage-domain or add an exact static grant for "${app.bundleId}" before retrying`,
        ].join(' '));
    }
}
//# sourceMappingURL=custody.lease.js.map