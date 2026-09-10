/** Conductor queue: one serial tail per acted-on application. */
import type { ComputerAppIdentity } from '../charter/charter.index.ts';
/**
 * Orders actions per `bundleId:pid` so a service generation never overlaps two
 * observations of the same app. The tail is dropped as soon as it is the last
 * one, so an app that stops being acted on leaves nothing behind.
 */
export declare class ConductorQueue {
    private readonly tails;
    /** Keep this service's actions for one process ordered through post-action observation. */
    enqueue<T>(app: ComputerAppIdentity, operation: () => Promise<T>): Promise<T>;
}
//# sourceMappingURL=conductor.queue.d.ts.map