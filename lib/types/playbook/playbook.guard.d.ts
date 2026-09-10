/**
 * Playbook guard — the progressive exposure lifecycle for the Computer Use
 * execution Tools, plus the shell guard that keeps screenshot reading inside the
 * Vision Toolkit.
 *
 * Two contracts live here and must not drift:
 *   - the OCR-avoidance patterns may only ever be widened to catch one more
 *     shell-built OCR path, and never narrowed;
 *   - an activation that durable Session history already proved stays proven
 *     for the remaining life of that Session.
 */
import type { Session } from '@deepseek-ai/dsh-session';
import { type ToolDefinition } from '@deepseek-ai/dsh-tools';
import type { Context } from '@deepseek-ai/cordis';
/** The single global bootstrap Tool, kept visible only until its Agent loads the Skill. */
export declare const COMPUTER_USE_ACTIVATE = "computer_use_activate";
/** Activation result handed back to the model. */
export interface ComputerUseActivationResult {
    /** Whether this call is what registered the execution Tools. */
    activated: boolean;
    /** Names of the exposed Tools, in registration order. */
    tools: string[];
}
/** Whether durable Session history proves that the bundled Skill was loaded. */
export declare function hasLoadedComputerUseSkill(session: Session): boolean;
/** Owns one progressive Tool-exposure generation. */
export declare class ComputerUseExposure {
    readonly activationTool: ToolDefinition;
    private readonly scopes;
    private readonly verdicts;
    private readonly ctx;
    private readonly createTools;
    private installed;
    constructor(ctx: Context, createTools: () => ToolDefinition[]);
    /** Install lifecycle listeners and adopt the Agents that already exist. */
    install(): () => void;
    /** Deny a bash call that would build OCR out of shell tools while vision is ready. */
    private shellOcrRefusal;
    /** Loading the Skill through its own Tool activates exposure without a bootstrap call. */
    private noteSkillResult;
    /** Undo every listener and every registered Tool of this generation. */
    private retract;
    /** Adopt one Agent, activating immediately when its history already proves a load. */
    private attach;
    /** Register the execution Tools for one Agent and hide the bootstrap. */
    private activate;
    /**
     * Register every definition in order and hide the bootstrap behind them. A
     * failure at any point leaves nothing behind: the Agent keeps the exact
     * registry it had before the attempt.
     */
    private openScope;
    private detach;
    private releaseScope;
}
//# sourceMappingURL=playbook.guard.d.ts.map