/**
 * Optics snapshot: the model-visible projection of one sighting plus the stored
 * observation index the ledger keeps per Agent.
 */
import { randomUUID } from 'node:crypto';
import { describeComputerTarget } from "./optics.locate.js";
import { ComputerTargetHandle, } from "../charter/charter.index.js";
/** Project one provider observation into model-addressable elements and target descriptors. */
export function publicElements(observation) {
    const targets = new Map();
    const elements = observation.elements.map((backendElement) => {
        const { locator: _locator, nativeIdentifier: _nativeIdentifier, ...element } = backendElement;
        const targetHandle = ComputerTargetHandle(randomUUID());
        targets.set(targetHandle, describeComputerTarget(backendElement, observation));
        return { ...element, targetHandle };
    });
    return { elements, targets };
}
//# sourceMappingURL=optics.snapshot.js.map