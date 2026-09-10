/** Motion pointer: derive the Agent-cursor path one action implies, if any. */
import type { BackendCursorAction, BackendObservation } from '../binding/binding.port.ts';
import type { ComputerActionRequest } from '../charter/charter.index.ts';
/** One non-waiting action: the only kind that can move the Agent cursor. */
type PointerAction = Exclude<ComputerActionRequest, {
    kind: 'wait';
}>;
/**
 * Cursor path for one action, already normalized into the coordinate space the
 * provider expects: element frames are window-relative, so a `screen` request
 * keeps its point and everything else is offset by the observed window origin.
 */
export declare function cursorAction(action: PointerAction, element: BackendObservation['elements'][number] | undefined, window: BackendObservation['window'] | undefined, app: BackendObservation['app']): BackendCursorAction | undefined;
export {};
//# sourceMappingURL=motion.pointer.d.ts.map