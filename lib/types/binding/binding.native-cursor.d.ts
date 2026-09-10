/**
 * Binding native cursor: the persistent, click-through Agent cursor overlay
 * subprocess, its line protocol, and its readiness/motion timeouts.
 */
import type { Writable } from 'node:stream';
import type { Context } from '@deepseek-ai/cordis';
import type { SubprocessHandle } from '@deepseek-ai/dsh-subprocess';
import type { ResolvedComputerUseConfig } from '../tuning/tuning.schema.ts';
import type { CursorVisibility } from '../charter/charter.context.ts';
import { type PreparedNativeHelper } from './binding.native-manifest.ts';
export type CursorProtocolFrame = {
    kind: 'response';
    response: Record<string, unknown>;
} | {
    kind: 'failure';
    reason: string;
};
export interface CursorProcess {
    stdin: Writable;
    done: Promise<import('@deepseek-ai/dsh-subprocess').SubprocessOutcome>;
    terminate: () => void;
    waitForExit: SubprocessHandle['waitForExit'];
    /** Next response line from this process generation, in command order. */
    nextResponse: (timeoutMs: number, signal: AbortSignal) => Promise<CursorProtocolFrame>;
}
/** Per-command response budget: motion commands are allowed to travel. */
export declare function cursorResponseTimeout(command: Record<string, unknown>): number;
/** Bounded, untrusted detail string from one overlay failure response. */
export declare function cursorErrorMessage(error: unknown): string | undefined;
/**
 * Read one overlay response against the command it answers and decide whether its
 * process generation is still trustworthy. A reply the protocol cannot vouch for
 * poisons the generation; a well-formed refusal does not.
 */
export declare function normalizeCursorResponse(command: Record<string, unknown>, response: Record<string, unknown>): {
    result: CursorVisibility;
    discardGeneration: boolean;
};
/** Cursor-owning state the overlay helpers read and update in place. */
export interface CursorOwner {
    readonly ctx: Context;
    readonly config: ResolvedComputerUseConfig;
    readonly disposed: boolean;
    cursor: CursorProcess | undefined;
    cursorStart: {
        promise: Promise<CursorProcess>;
    } | undefined;
    discardCursor(cursor: CursorProcess): void;
}
/** Trade in the current overlay process generation for a fresh one. */
export declare function getCursorProcess(owner: CursorOwner, prepared: PreparedNativeHelper, signal: AbortSignal): Promise<CursorProcess>;
/** Spawn one overlay process and wire its line protocol. */
export declare function spawnCursorProcess(owner: CursorOwner, prepared: PreparedNativeHelper): Promise<CursorProcess>;
/** Await the overlay's single ready frame under its bounded readiness window. */
export declare function waitForCursorReady(handle: SubprocessHandle): Promise<void>;
/** Send one serialized command to the overlay and normalize its reply. */
export declare function executeCursorCommand(owner: CursorOwner & {
    readonly prepared: PreparedNativeHelper | undefined;
    prepare(signal: AbortSignal): Promise<PreparedNativeHelper>;
}, command: Record<string, unknown>, signal: AbortSignal, onWritten?: () => void | Promise<void>): Promise<CursorVisibility>;
/** Stop the overlay process before a provider generation is replaced or disposed. */
export declare function disposeCursorOwner(owner: {
    readonly cursorCommandTail: Promise<void>;
    cursor: CursorProcess | undefined;
    cursorStart: {
        promise: Promise<CursorProcess>;
    } | undefined;
}): Promise<void>;
//# sourceMappingURL=binding.native-cursor.d.ts.map