/**
 * Binding macOS: the fixed-command native backend, its cursor phases, and health.
 *
 * Every provider operation is one JSON envelope handed to the prepared helper;
 * nothing here builds a shell command or interpolates user text. The cursor is
 * the only stateful part: one action is shown in up to three phases (before,
 * during, after), each contributing its own overlay commands, and their
 * responses are folded into the single visibility the caller reports.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { BackendActionRequest, BackendActionResult, BackendCursorActivation, BackendTrackedDragResult, BackendCursorAction, BackendHealth, BackendObservation, BackendObserveOptions, CursorVisibility } from '../optics/optics.sighting.ts';
import type { ComputerUseBackend } from './binding.port.ts';
import type { ResolvedComputerUseConfig } from '../tuning/tuning.schema.ts';
import type { ComputerAppIdentity, ComputerAppSelector, ComputerAppSummary } from '../charter/charter.index.ts';
import { NativeHelperClient } from './binding.native-transport.ts';
/** One phase of cursor work for one action. */
type CursorPhase = 'before' | 'during' | 'after';
/** Fixed-command native backend. */
export declare class MacOSBackend implements ComputerUseBackend {
    readonly name: "macos-ax";
    /** Prepared-helper transport; its lifetime follows this backend's generation. */
    readonly client: NativeHelperClient;
    /** Host-side policy this backend stamps onto every request. */
    private readonly config;
    constructor(ctx: Context, config: ResolvedComputerUseConfig);
    /** Absolute helper path in use, for diagnostics and health reporting. */
    get helperPath(): string;
    /**
     * One helper command. The envelope is assembled here so every call site sends
     * the same command-first JSON object and none of them hand-rolls it.
     */
    private callHelper;
    /** Prepare the helper, then ask it for permission and version state. */
    health(signal: AbortSignal): Promise<BackendHealth>;
    /** Open the macOS privacy pane that grants one of the two permissions. */
    openSettings(kind: 'accessibility' | 'screen-recording', signal: AbortSignal): Promise<void>;
    /** Retire the helper generation; the Service creates a new backend instead of reusing one. */
    dispose(): Promise<void>;
    /** Resolve one running application selector to a concrete process. */
    resolveApp(selector: ComputerAppSelector, signal: AbortSignal): Promise<ComputerAppIdentity>;
    /** Every running application the provider can see, with its permission state. */
    listApps(signal: AbortSignal): Promise<ComputerAppSummary[]>;
    /** Read one bounded provider tree for the selected application. */
    observe(app: ComputerAppIdentity, options: BackendObserveOptions, signal: AbortSignal): Promise<BackendObservation>;
    /** Bring the target forward so the Agent cursor lands on it, then re-observe. */
    activateForCursor(app: ComputerAppIdentity, expectedStateHash: string, options: BackendObserveOptions, signal: AbortSignal): Promise<BackendCursorActivation>;
    /** Observation limits stamped on every action request, so one action cannot read an unbounded tree. */
    private get actionLimits();
    /**
     * The action envelope both the plain and the drag path send. `limits` and the
     * deadline are host policy, so they are stamped on top of the caller's request
     * rather than trusted to it.
     */
    private actEnvelope;
    /** Run one action; a drag takes the explicit start-barrier route instead. */
    act(request: BackendActionRequest, signal: AbortSignal): Promise<BackendActionResult>;
    /** A drag runs through the explicit start barrier, never the one-shot `act` invocation. */
    private runNativeDrag;
    /** Prepare and validate a drag, then track it with the Agent cursor while it runs. */
    actDragWithCursor(request: BackendActionRequest, cursor: BackendCursorAction & {
        kind: 'drag';
    }, signal: AbortSignal): Promise<BackendTrackedDragResult>;
    private prepareNativeDrag;
    /**
     * Show the cursor while the drag is in flight.
     *
     * The native drag only starts once the endpoint move has been written, so a
     * cursor that cannot be shown before mouse-down cancels the prepared drag and
     * reports the original failure. Once mouse-down is possible the drag owns the
     * process: the bounded native motion has to reach mouse-up, so a later cursor
     * failure is downgraded to "the cursor was not visible" instead of aborting.
     */
    private trackDragCursor;
    /** Drive the Agent cursor for one action; `during` is drag-only. */
    visualizeCursor(action: BackendCursorAction, phase: CursorPhase, signal: AbortSignal): Promise<CursorVisibility>;
    /** The overlay command that carries a target and the motion profile for one move. */
    private moveCommand;
    /** The overlay command that closes one phase against the bound target. */
    private settleCommand;
    /** The overlay command that marks the click point after arrival and dwell. */
    private pressCommand;
    /**
     * Send one overlay command, forwarding the write callback only when the caller
     * supplied one. The callback is the pre-mouse-down barrier for a drag, so the
     * two-argument and three-argument forms are not interchangeable.
     */
    private sendCursor;
    private visualizeCursorPhase;
}
export {};
//# sourceMappingURL=binding.macos.d.ts.map