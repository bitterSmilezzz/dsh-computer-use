/**
 * Binding native transport: the subprocess JSON-line transport, the one-shot
 * command client, and the drag barrier protocol.
 *
 * The helper is a separate process, so everything it sends back is untrusted
 * input: replies are size-bounded by the transport, decoded defensively, and an
 * error code the published vocabulary does not know becomes a provider failure
 * rather than being asserted into the union.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { CursorVisibility } from '../charter/charter.context.ts';
import type { ResolvedComputerUseConfig } from '../tuning/tuning.schema.ts';
import { type PreparedNativeHelper } from './binding.native-manifest.ts';
import { type CursorProcess } from './binding.native-cursor.ts';
/** Explicit pre-mouse-down barrier around one validated native drag. */
export interface PreparedNativeDrag<T> {
    readonly result: Promise<T>;
    start(): Promise<void>;
    cancel(): void;
}
/** Invokes only the packaged JSON protocol through `ctx.subprocess`; no source or shell reaches the helper. */
export declare class NativeHelperClient {
    private readonly ctx;
    private readonly config;
    private readonly managedRoot;
    private preparedState?;
    /** Overlay process generation; owned here, driven by the cursor protocol module. */
    cursor: CursorProcess | undefined;
    /** In-flight overlay spawn, so concurrent commands share one process. */
    cursorStart: {
        promise: Promise<CursorProcess>;
    } | undefined;
    private cursorCommandTail;
    private disposed;
    constructor(ctx: Context, config: ResolvedComputerUseConfig, managedRoot?: string);
    /** Absolute executable path selected by explicit override or the packaged managed binary. */
    get helperPath(): string;
    /** Exactly the helper preparation and cursor command paths read. */
    get prepared(): PreparedNativeHelper | undefined;
    /** Verify platform, file type, packaged hash, and executable mode before use. */
    prepare(signal: AbortSignal): Promise<PreparedNativeHelper>;
    /** Invoke one fixed helper command and parse its bounded JSON envelope. */
    invoke<T>(request: Record<string, unknown>, signal: AbortSignal): Promise<T>;
    /**
     * Why a helper call ended before its reply: the caller cancelled it, or its
     * action deadline expired. Callers only reach this after the child has exited,
     * so no process is left behind either way.
     */
    private abortReason;
    /** Prepare and validate a drag, then wait for an explicit pre-mouse-down start barrier. */
    prepareDrag<T>(request: Record<string, unknown>, signal: AbortSignal, readinessTimeoutMs: number): Promise<PreparedNativeDrag<T>>;
    /** Send one serialized command to the persistent, click-through Agent cursor overlay. */
    cursorCommand(command: Record<string, unknown>, signal: AbortSignal, onWritten?: () => void | Promise<void>): Promise<CursorVisibility>;
    /**
     * Chain one overlay command behind the one before it. The chain survives a
     * failed command — the next command still runs against the current generation —
     * and the refusal itself reaches the caller through the returned promise.
     */
    private enqueueCursorCommand;
    /**
     * Drive the overlay for one command. Exposed for the cursor protocol only;
     * callers go through {@link cursorCommand} for serialization.
     */
    runCursorCommand(command: Record<string, unknown>, signal: AbortSignal, onWritten?: () => void | Promise<void>): Promise<CursorVisibility>;
    /** Retire the current overlay process generation and clear it from this client. */
    discardCursor(cursor: CursorProcess): void;
    /** Stop the cursor process before a provider generation is replaced or disposed. */
    dispose(): Promise<void>;
    /** Prepared integrity facts used by provider health. */
    preparedInfo(): PreparedNativeHelper;
}
//# sourceMappingURL=binding.native-transport.d.ts.map