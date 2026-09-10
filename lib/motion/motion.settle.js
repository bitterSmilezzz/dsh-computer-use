/**
 * Motion settle: the bounded post-action loop that decides whether the action
 * left a lasting structural change behind.
 *
 * The loop reports whether the bounded structural observation changed. It
 * complements routing facts without claiming causal proof or visibility into
 * pixel-only, transient, or remote effects.
 *
 * Two rules carry the whole design:
 *
 * 1. A frame taken at least settleMs after the action stands on its own: it is
 *    the same evidence a wait-first loop would have collected. A frame inside
 *    that window can only *nominate* a change — a hover, a focus ring, a busy
 *    indicator, or a single intermediate layout looks like a real effect for one
 *    frame — so it takes a confirming frame before the change counts as settled.
 * 2. The first wait is the configured settleMs and every later wait doubles it,
 *    so a slow UI costs logarithmic provider round trips instead of one full
 *    observation per settleMs. `Math.max(1, ...)` keeps settleMs = 0 from
 *    spinning, and no wait crosses the maxSettleMs budget.
 */
import { rm } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
/**
 * The post-action effect report.
 *
 * It reports only what the bounded structural observation can prove.
 * Pixel-only, remote, or transient effects remain outside this hash and
 * must not be described as action failure. `observedForMs` is the whole loop
 * duration, not the time since the change was first nominated.
 */
export function settleEffect(settled, observedForMs) {
    return {
        observedStateChanged: settled,
        observedForMs,
        ...(settled ? {} : {
            note: 'no change was observed in the window title, id, frame, or accessibility element tree;'
                + ' pixel-only, remote, or transient effects may still have occurred',
        }),
    };
}
export async function runSettleLoop(input) {
    const { budget } = input;
    const started = Date.now();
    let latest;
    let settled = false;
    let backoffMs = 0;
    /** State a pre-window frame reported, still awaiting its confirming frame. */
    let pendingHash;
    /** Cleared once a frame that carried a screenshot failed to end the loop. */
    let evidence = input.wantsScreenshot;
    for (;;) {
        const conclusive = pendingHash !== undefined || Date.now() - started >= budget.settleMs;
        // The caller's screenshot rides only on a frame that can become the
        // returned evidence, so an intermediate frame costs no window capture and
        // leaves no artifact behind.
        const screenshot = evidence && conclusive ? 'optional' : 'none';
        const screenshotPath = screenshot === 'none'
            ? undefined
            : await input.allocateScreenshotPath();
        // Check what the action left behind before waiting, so a visible effect
        // costs no settleMs at all.
        latest = await input.observe({
            screenshot,
            ...(screenshotPath === undefined ? {} : { screenshotPath }),
            maxNodes: budget.maxNodes,
            maxDepth: budget.maxDepth,
            maxTextBytes: budget.maxTextBytes,
        });
        if (pendingHash !== undefined && latest.stateHash === pendingHash) {
            // Two frames reporting the same changed state is the evidence that the
            // change outlived the settle window instead of reverting behind it.
            settled = true;
            break;
        }
        // A frame at least settleMs after the action stands on its own, so a change
        // it reports settles the loop; a pre-window frame only nominates the change
        // it saw, to be confirmed or dropped by the next frame.
        const changed = latest.stateHash !== input.referenceHash;
        if (changed && conclusive) {
            settled = true;
            break;
        }
        pendingHash = changed ? latest.stateHash : undefined;
        const remaining = budget.maxSettleMs - (Date.now() - started);
        if (remaining <= 0)
            break;
        if (screenshotPath !== undefined) {
            // Only the frame that ends the loop can be returned, so an artifact from
            // an earlier frame is removed instead of being left behind unreferenced,
            // and later frames stop asking for one.
            await rm(screenshotPath, { force: true }).catch(() => undefined);
            evidence = false;
        }
        backoffMs = backoffMs === 0 ? Math.max(1, budget.settleMs) : backoffMs * 2;
        await delay(Math.min(backoffMs, remaining), undefined, { signal: input.signal });
    }
    return { observation: latest, settled, startedAt: started };
}
//# sourceMappingURL=motion.settle.js.map