/**
 * Conductor cursor: the Agent-cursor choreography around one action — placing
 * the overlay before input, optionally tracking a drag, and validating the
 * overlay afterwards.
 */
import type { BackendActionRequest, BackendActionResult, BackendObservation, ComputerUseBackend } from '../binding/binding.port.ts';
import type { BackendElement } from '../optics/optics.sighting.ts';
import type { ComputerActionRequest } from '../charter/charter.index.ts';
import type { ResolvedComputerUseConfig } from '../tuning/tuning.schema.ts';
/** An overlay that was expected on screen and is not, as the action result reports it. */
export interface LostCursor {
    visible: false;
    reason?: string;
}
/** One action shape, without the wait branch that never drives the cursor. */
type InputAction = Exclude<ComputerActionRequest, {
    kind: 'wait';
}>;
/**
 * The cursor side of a single action. A flight is created per action, so the
 * reports it collects belong to exactly one attempt and never bleed into the next.
 */
export declare class CursorFlight {
    private readonly backend;
    private readonly config;
    private readonly action;
    private readonly sourceElement;
    private visualization;
    private started;
    private reported;
    constructor(backend: ComputerUseBackend, config: ResolvedComputerUseConfig, action: InputAction, sourceElement: BackendElement | undefined);
    /** Whether this action is one the overlay is configured and able to visualize. */
    get expected(): boolean;
    /** The overlay was expected and is missing, or undefined when it was fine. */
    get lost(): LostCursor | undefined;
    /**
     * Keep the first report, except that a hidden overlay always overrides a shown
     * one: once the cursor went missing it must surface to the caller even if a
     * later probe saw it again.
     */
    private note;
    /**
     * Place the overlay before the input is sent. A cursor that cannot be placed
     * for a foreground target fails the action: input must never travel without
     * the visual evidence the user was promised.
     */
    prepare(element: BackendElement | undefined, observation: BackendObservation, signal: AbortSignal): Promise<void>;
    /** Run the backend action, taking the tracked drag path while the cursor is live. */
    dispatch(request: BackendActionRequest, signal: AbortSignal): Promise<BackendActionResult>;
    /**
     * Confirm the post-action placement. This never fails the action: a cursor
     * that cannot be validated afterwards is reported as lost instead.
     */
    settle(): Promise<void>;
}
export {};
//# sourceMappingURL=conductor.cursor.d.ts.map