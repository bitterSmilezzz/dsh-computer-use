/**
 * Binding macOS: the fixed-command native backend, its cursor phases, and health.
 *
 * Every provider operation is one JSON envelope handed to the prepared helper;
 * nothing here builds a shell command or interpolates user text. The cursor is
 * the only stateful part: one action is shown in up to three phases (before,
 * during, after), each contributing its own overlay commands, and their
 * responses are folded into the single visibility the caller reports.
 */
import { setTimeout as delay } from 'node:timers/promises';
import { NativeHelperClient } from "./binding.native-transport.js";
/** Bounded, human-readable reason for one failed cursor command. */
function describeFailure(error) {
    return error instanceof Error ? error.message : String(error);
}
/**
 * Per-phase fold of overlay responses.
 *
 * The overlay answers once per command, so a phase can produce several replies.
 * The least visible one wins: a cursor that vanished part-way through is a
 * cursor the user cannot follow, and "it moved, then it was refused" has to be
 * reported as refused.
 */
class CursorOutcome {
    worst = { visible: true };
    /** Keep the first refusal; a later reply cannot improve on it. */
    note(response) {
        if (!response.visible && this.worst.visible)
            this.worst = response;
    }
    get value() {
        return this.worst;
    }
}
/** Fixed-command native backend. */
export class MacOSBackend {
    name = 'macos-ax';
    /** Prepared-helper transport; its lifetime follows this backend's generation. */
    client;
    /** Host-side policy this backend stamps onto every request. */
    config;
    constructor(ctx, config) {
        this.config = config;
        this.client = new NativeHelperClient(ctx, config);
    }
    /** Absolute helper path in use, for diagnostics and health reporting. */
    get helperPath() {
        return this.client.helperPath;
    }
    /**
     * One helper command. The envelope is assembled here so every call site sends
     * the same command-first JSON object and none of them hand-rolls it.
     */
    async callHelper(command, payload, signal) {
        return await this.client.invoke({ command, ...payload }, signal);
    }
    /** Prepare the helper, then ask it for permission and version state. */
    async health(signal) {
        const prepared = await this.client.prepare(signal);
        const reported = await this.callHelper('health', {}, signal);
        return {
            helperVersion: reported.helperVersion || prepared.version,
            helperSha256: prepared.sha256,
            accessibility: reported.accessibility,
            screenRecording: reported.screenRecording,
        };
    }
    /** Open the macOS privacy pane that grants one of the two permissions. */
    async openSettings(kind, signal) {
        await this.callHelper('open-settings', { kind }, signal);
    }
    /** Retire the helper generation; the Service creates a new backend instead of reusing one. */
    async dispose() {
        await this.client.dispose();
    }
    /** Resolve one running application selector to a concrete process. */
    async resolveApp(selector, signal) {
        return await this.callHelper('resolve-app', { selector }, signal);
    }
    /** Every running application the provider can see, with its permission state. */
    async listApps(signal) {
        return await this.callHelper('list-apps', {}, signal);
    }
    /** Read one bounded provider tree for the selected application. */
    async observe(app, options, signal) {
        return await this.callHelper('observe', { app, options }, signal);
    }
    /** Bring the target forward so the Agent cursor lands on it, then re-observe. */
    async activateForCursor(app, expectedStateHash, options, signal) {
        return await this.callHelper('activate-for-cursor', {
            app,
            expectedStateHash,
            options,
            actionTimeoutMs: this.config.actionTimeoutMs,
        }, signal);
    }
    /** Observation limits stamped on every action request, so one action cannot read an unbounded tree. */
    get actionLimits() {
        return {
            maxNodes: this.config.maxNodes,
            maxDepth: this.config.maxDepth,
            maxTextBytes: this.config.maxTextBytes,
        };
    }
    /**
     * The action envelope both the plain and the drag path send. `limits` and the
     * deadline are host policy, so they are stamped on top of the caller's request
     * rather than trusted to it.
     */
    actEnvelope(request) {
        return {
            command: 'act',
            request: {
                ...request,
                actionTimeoutMs: this.config.actionTimeoutMs,
                limits: this.actionLimits,
            },
        };
    }
    /** Run one action; a drag takes the explicit start-barrier route instead. */
    async act(request, signal) {
        if (request.action.kind === 'drag')
            return await this.runNativeDrag(request, signal);
        return await this.client.invoke(this.actEnvelope(request), signal);
    }
    /** A drag runs through the explicit start barrier, never the one-shot `act` invocation. */
    async runNativeDrag(request, signal) {
        const execution = await this.prepareNativeDrag(request, signal);
        await execution.start();
        return await execution.result;
    }
    /** Prepare and validate a drag, then track it with the Agent cursor while it runs. */
    async actDragWithCursor(request, cursor, signal) {
        const execution = await this.prepareNativeDrag(request, signal);
        // The cursor phase drives the start barrier, so it has to run — and write
        // the endpoint move — before the native result is awaited.
        const tracked = await this.trackDragCursor(cursor, execution, signal);
        return { action: await execution.result, cursor: tracked };
    }
    async prepareNativeDrag(request, signal) {
        return await this.client.prepareDrag(this.actEnvelope(request), signal, this.config.actionTimeoutMs + 2_000);
    }
    /**
     * Show the cursor while the drag is in flight.
     *
     * The native drag only starts once the endpoint move has been written, so a
     * cursor that cannot be shown before mouse-down cancels the prepared drag and
     * reports the original failure. Once mouse-down is possible the drag owns the
     * process: the bounded native motion has to reach mouse-up, so a later cursor
     * failure is downgraded to "the cursor was not visible" instead of aborting.
     */
    async trackDragCursor(cursor, execution, signal) {
        let started = false;
        try {
            return await this.visualizeCursorPhase(cursor, 'during', signal, async () => {
                await execution.start();
                started = true;
            });
        }
        catch (error) {
            if (started) {
                return { visible: false, reason: `the agent cursor could not track the drag action: ${describeFailure(error)}` };
            }
            execution.cancel();
            await execution.result.catch(() => undefined);
            throw error;
        }
    }
    /** Drive the Agent cursor for one action; `during` is drag-only. */
    async visualizeCursor(action, phase, signal) {
        return await this.visualizeCursorPhase(action, phase, signal);
    }
    /** The overlay command that carries a target and the motion profile for one move. */
    moveCommand(action, point) {
        return {
            op: 'move',
            x: point.x,
            y: point.y,
            speedPxPerSecond: this.config.interaction.cursorSpeedPxPerSecond,
            accelerationPxPerSecondSquared: this.config.interaction.cursorAccelerationPxPerSecondSquared,
            // Auto-hide is armed only once native input has completed; a cursor that
            // hid during travel or dwell would invalidate the press behind it.
            autoHideMs: 0,
            targetPid: action.targetPid,
            targetWindowNumber: action.targetWindowNumber,
            targetWindowFrame: action.targetWindowFrame,
        };
    }
    /** The overlay command that closes one phase against the bound target. */
    settleCommand(action) {
        return {
            // A drag ends with a real release; click and scroll only re-check the target.
            op: action.kind === 'drag' ? 'release' : 'validate',
            autoHideMs: this.config.interaction.cursorAutoHideMs,
            targetPid: action.targetPid,
            targetWindowNumber: action.targetWindowNumber,
            targetWindowFrame: action.targetWindowFrame,
        };
    }
    /** The overlay command that marks the click point after arrival and dwell. */
    pressCommand(action) {
        return {
            op: 'press',
            autoHideMs: 0,
            targetPid: action.targetPid,
            targetWindowNumber: action.targetWindowNumber,
            targetWindowFrame: action.targetWindowFrame,
            sustainedPress: action.kind === 'drag',
        };
    }
    /**
     * Send one overlay command, forwarding the write callback only when the caller
     * supplied one. The callback is the pre-mouse-down barrier for a drag, so the
     * two-argument and three-argument forms are not interchangeable.
     */
    async sendCursor(command, signal, onWritten) {
        return await (onWritten === undefined
            ? this.client.cursorCommand(command, signal)
            : this.client.cursorCommand(command, signal, onWritten));
    }
    async visualizeCursorPhase(action, phase, signal, onMoveWritten) {
        if (this.config.interaction.cursorVisualization !== 'visible') {
            return { visible: false, reason: 'the agent cursor is disabled by configuration' };
        }
        const outcome = new CursorOutcome();
        switch (phase) {
            case 'after':
                // Every action validates the bound target after native input.
                outcome.note(await this.sendCursor(this.settleCommand(action), signal));
                return outcome.value;
            case 'during':
                if (action.kind !== 'drag')
                    return { visible: false, reason: 'only drag has a during-action cursor phase' };
                outcome.note(await this.sendCursor(this.moveCommand(action, action.to), signal, onMoveWritten));
                return outcome.value;
            default: {
                const from = action.kind === 'drag' ? action.from : action.to;
                if (from === undefined)
                    return { visible: false, reason: 'this action has no cursor position to show' };
                // A move response means the native overlay reached its destination; the
                // configured dwell then runs between arrival and the press behind it.
                outcome.note(await this.sendCursor(this.moveCommand(action, from), signal));
                if (!outcome.value.visible || action.kind === 'scroll')
                    return outcome.value;
                if (this.config.interaction.cursorClickDelayMs > 0) {
                    await delay(this.config.interaction.cursorClickDelayMs, undefined, { signal });
                }
                outcome.note(await this.sendCursor(this.pressCommand(action), signal));
                return outcome.value;
            }
        }
    }
}
//# sourceMappingURL=binding.macos.js.map