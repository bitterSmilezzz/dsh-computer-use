/** Conductor queue: one serial tail per acted-on application. */
/**
 * Orders actions per `bundleId:pid` so a service generation never overlaps two
 * observations of the same app. The tail is dropped as soon as it is the last
 * one, so an app that stops being acted on leaves nothing behind.
 */
export class ConductorQueue {
    tails = new Map();
    /** Keep this service's actions for one process ordered through post-action observation. */
    async enqueue(app, operation) {
        const key = `${app.bundleId}:${app.pid}`;
        const previous = this.tails.get(key) ?? Promise.resolve();
        const run = previous.catch(() => undefined).then(operation);
        const tail = run.then(() => undefined, () => undefined);
        this.tails.set(key, tail);
        try {
            return await run;
        }
        finally {
            if (this.tails.get(key) === tail)
                this.tails.delete(key);
        }
    }
}
//# sourceMappingURL=conductor.queue.js.map