/** Custody consent: one-use just-in-time confirmation tokens for sensitive Computer Use actions. */
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { ToolCallId } from '@deepseek-ai/dsh-llm';
import type { Context } from '@deepseek-ai/cordis';
import type { ResolvedComputerUseConfig } from '../tuning/tuning.schema.ts';
import { type ComputerActionRequest, type ComputerAppIdentity, type ComputerConfirmRequest, type ComputerConfirmation, ComputerConfirmationToken } from '../charter/charter.index.ts';
/** Owner of the sensitive-action tokens: minting, one-use consumption, and release. */
export declare class ComputerConfirmationManager {
    private readonly ctx;
    private readonly config;
    /** Pending tokens, partitioned per Agent so a release can drop one Session's set. */
    private readonly pending;
    constructor(ctx: Context, config: () => ResolvedComputerUseConfig);
    /** One Agent's pending-token table, created the first time that Agent asks. */
    private tableFor;
    /**
     * Claim one token for an Agent and return it together with the record it held.
     * Claiming removes the record even when the caller goes on to reject it, which
     * is what makes a token strictly one-use.
     */
    private claim;
    /** Whether a claimed record was issued for exactly this app, observation, and action. */
    private authorizes;
    /** Ask the user, then mint one token bound to the action they approved. */
    confirm(agent: Agent, app: ComputerAppIdentity, request: ComputerConfirmRequest, callId: ToolCallId | undefined, signal: AbortSignal): Promise<ComputerConfirmation>;
    /** Spend the one token a sensitive action claims; every other case is refused. */
    consume(agent: Agent, app: ComputerAppIdentity, action: ComputerActionRequest): void;
    /** Drop a pending token whose target identity changed before input was sent. */
    invalidate(agent: Agent, token: ComputerConfirmationToken | undefined): void;
    /** Forget everything one Agent still has pending. */
    releaseAgent(agent: Agent): void;
    /** Forget every pending token: provider teardown or generation replacement. */
    clear(): void;
}
//# sourceMappingURL=custody.consent.d.ts.map