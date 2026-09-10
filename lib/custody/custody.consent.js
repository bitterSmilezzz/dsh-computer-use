/** Custody consent: one-use just-in-time confirmation tokens for sensitive Computer Use actions. */
import { createHash, randomUUID } from 'node:crypto';
import { approvalPolicy } from "./custody.policy.js";
import { ComputerUseError } from "../charter/charter.fault.js";
import { ComputerConfirmationToken, } from "../charter/charter.index.js";
/** Rejection text shared by every way a token can fail to authorize an action. */
const TOKEN_REJECTED = 'COMPUTER_CONFIRMATION_REQUIRED';
/** The prompt text: what the caller asked for, plus the target and payload it names. */
function confirmReason(request) {
    const payload = request.dataSummary === undefined ? '' : ` Data: ${request.dataSummary}.`;
    return `${request.reason} Target: ${request.target}.${payload}`;
}
/**
 * Canonical JSON with object members sorted by key and `undefined` members
 * omitted, so two equal actions hash alike no matter what order their keys were
 * built in.
 */
function canonical(value) {
    if (Array.isArray(value))
        return `[${value.map(canonical).join(',')}]`;
    if (value === null || typeof value !== 'object')
        return JSON.stringify(value);
    const record = value;
    const members = [];
    for (const key of Object.keys(record).sort()) {
        const member = record[key];
        if (member === undefined)
            continue;
        members.push(`${JSON.stringify(key)}:${canonical(member)}`);
    }
    return `{${members.join(',')}}`;
}
/**
 * Digest over everything an action means except the token that authorizes it, so
 * a token minted for one action cannot be replayed against a different one.
 */
function actionFingerprint(action) {
    const { confirmationToken: _unused, ...meaning } = action;
    return createHash('sha256').update(canonical(meaning)).digest('hex');
}
/** Owner of the sensitive-action tokens: minting, one-use consumption, and release. */
export class ComputerConfirmationManager {
    ctx;
    config;
    /** Pending tokens, partitioned per Agent so a release can drop one Session's set. */
    pending = new Map();
    constructor(ctx, config) {
        this.ctx = ctx;
        this.config = config;
    }
    /** One Agent's pending-token table, created the first time that Agent asks. */
    tableFor(agent) {
        const existing = this.pending.get(agent);
        if (existing !== undefined)
            return existing;
        const created = new Map();
        this.pending.set(agent, created);
        return created;
    }
    /**
     * Claim one token for an Agent and return it together with the record it held.
     * Claiming removes the record even when the caller goes on to reject it, which
     * is what makes a token strictly one-use.
     */
    claim(agent, token) {
        const table = this.pending.get(agent);
        const record = table?.get(token);
        if (record !== undefined)
            table?.delete(token);
        return record;
    }
    /** Whether a claimed record was issued for exactly this app, observation, and action. */
    authorizes(record, app, action) {
        if (record.app.bundleId !== app.bundleId || record.app.pid !== app.pid)
            return false;
        if (record.observationId !== action.observationId)
            return false;
        return record.actionHash === actionFingerprint(action);
    }
    /** Ask the user, then mint one token bound to the action they approved. */
    async confirm(agent, app, request, callId, signal) {
        if (approvalPolicy(this.ctx, agent) === 'never') {
            throw new ComputerUseError(TOKEN_REJECTED, 'sensitive action confirmation is blocked because approval prompts are disabled in this Session (approval/policy: never); do not execute the action, and ask the user to switch the permission preset to one with approval ask or run it manually');
        }
        const outcome = await this.ctx.approval.request({
            agent,
            toolName: 'computer_confirm',
            reason: confirmReason(request),
            signal,
            ...(callId === undefined ? {} : { callId }),
        });
        if (outcome === 'cancelled') {
            throw new ComputerUseError('COMPUTER_CANCELLED', 'sensitive action confirmation was cancelled');
        }
        if (outcome !== 'allowed-once') {
            throw new ComputerUseError(TOKEN_REJECTED, `sensitive action was not confirmed (${outcome})`);
        }
        const observationId = request.action.observationId;
        const expiresAt = Date.now() + this.config().confirmationTtlMs;
        const token = ComputerConfirmationToken(randomUUID());
        this.tableFor(agent).set(token, {
            app,
            observationId,
            actionHash: actionFingerprint(request.action),
            expiresAt,
        });
        return { token, observationId, app, expiresAt: new Date(expiresAt).toISOString() };
    }
    /** Spend the one token a sensitive action claims; every other case is refused. */
    consume(agent, app, action) {
        if (action.sensitive !== true) {
            if (action.confirmationToken !== undefined) {
                throw new ComputerUseError(TOKEN_REJECTED, 'confirmationToken is valid only when sensitive is true');
            }
            return;
        }
        const token = action.confirmationToken;
        if (token === undefined) {
            throw new ComputerUseError(TOKEN_REJECTED, 'sensitive action requires a token from computer_confirm');
        }
        const record = this.claim(agent, token);
        if (record === undefined) {
            throw new ComputerUseError(TOKEN_REJECTED, 'confirmation token is unknown, expired, or already consumed');
        }
        if (record.expiresAt < Date.now()) {
            throw new ComputerUseError(TOKEN_REJECTED, 'confirmation token expired');
        }
        if (!this.authorizes(record, app, action)) {
            throw new ComputerUseError(TOKEN_REJECTED, 'confirmation token does not match this app, observation, or action');
        }
    }
    /** Drop a pending token whose target identity changed before input was sent. */
    invalidate(agent, token) {
        if (token !== undefined)
            this.pending.get(agent)?.delete(token);
    }
    /** Forget everything one Agent still has pending. */
    releaseAgent(agent) {
        this.pending.delete(agent);
    }
    /** Forget every pending token: provider teardown or generation replacement. */
    clear() {
        this.pending.clear();
    }
}
//# sourceMappingURL=custody.consent.js.map