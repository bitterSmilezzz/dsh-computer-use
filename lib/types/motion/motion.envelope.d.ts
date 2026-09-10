/**
 * Motion envelope: what one action request addresses, and whether its arguments
 * can be satisfied at all.
 *
 * These predicates answer four questions before any provider work begins: which
 * element an action names, whether a stable handle may re-bind that element,
 * whether the action needs an element or target-process pointer input, and
 * whether it needs explicit foreground permission. `validateAction` is the one
 * immediate correction a caller gets, instead of a deadline that can never be met.
 */
import type { BackendObservation } from '../binding/binding.port.ts';
import type { ComputerActionRequest, ComputerTargetHandle } from '../charter/charter.index.ts';
export declare function targetIndex(action: ComputerActionRequest): number | undefined;
export declare function targetHandle(action: ComputerActionRequest): ComputerTargetHandle | undefined;
export declare function allowsTargetRebind(action: ComputerActionRequest): boolean;
export declare function requiresElement(action: ComputerActionRequest): boolean;
export declare function requiresPointerInput(action: Exclude<ComputerActionRequest, {
    kind: 'wait';
}>, element: BackendObservation['elements'][number] | undefined): boolean;
export declare function requiresForegroundPermission(action: Exclude<ComputerActionRequest, {
    kind: 'wait';
}>): boolean;
/**
 * Reject an action whose arguments cannot be satisfied at all, before any lease,
 * queue, or provider work. The model gets one immediate correction instead of a
 * deadline that can never be met.
 */
export declare function validateAction(action: ComputerActionRequest): void;
//# sourceMappingURL=motion.envelope.d.ts.map