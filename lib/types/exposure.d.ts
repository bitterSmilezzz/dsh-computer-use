/** Agent-scoped progressive exposure for Computer Use execution Tools. */
import type { Session } from '@deepseek-ai/dsh-session';
import { type ToolDefinition } from '@deepseek-ai/dsh-tools';
import type { Context } from '@deepseek-ai/cordis';
/** One global bootstrap retained until the current Agent loads the Skill. */
export declare const COMPUTER_USE_ACTIVATE = "computer_use_activate";
/** Activation result returned to the model. */
export interface ComputerUseActivationResult {
    activated: boolean;
    tools: string[];
}
/** Whether durable Session history proves that the bundled Skill was loaded. */
export declare function hasLoadedComputerUseSkill(session: Session): boolean;
/** Owns one progressive Tool-exposure generation. */
export declare class ComputerUseExposure {
    private readonly ctx;
    private readonly createTools;
    readonly activationTool: ToolDefinition;
    private readonly states;
    /**
     * Memoized Skill-activation verdicts, released with the Session they describe.
     * `snapshot` is the exact event snapshot the verdict came from: Session
     * snapshots are stable per revision and replaced on every append, so an
     * identical snapshot cannot be hiding new events. Doubles that grow an array
     * in place are still caught by the length and last-event checks.
     */
    private readonly skillProbes;
    private installed;
    constructor(ctx: Context, createTools: () => ToolDefinition[]);
    /**
     * Cached form of `hasLoadedComputerUseSkill` for the per-call paths: the scan
     * walks the whole Session log looking for a 7.5 KB needle, which must not run
     * on every bash invocation. A verdict is reused only while the log is visibly
     * unchanged, and any doubt falls back to a full rescan.
     */
    private hasLoadedSkill;
    /** Install lifecycle listeners and adopt existing Agents. */
    install(): () => void;
    private attach;
    private activate;
    private detach;
    private disposeStates;
    private disposeState;
}
//# sourceMappingURL=exposure.d.ts.map