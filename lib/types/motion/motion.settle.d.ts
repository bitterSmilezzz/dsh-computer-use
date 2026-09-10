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
import type { BackendObservation, BackendObserveOptions } from '../binding/binding.port.ts';
import type { ComputerActionEffect } from '../charter/charter.index.ts';
/** Limits and windows the loop spends, resolved once per action generation. */
export interface SettleBudget {
    settleMs: number;
    maxSettleMs: number;
    maxNodes: number;
    maxDepth: number;
    maxTextBytes: number;
}
export interface SettleLoopInput {
    budget: SettleBudget;
    /** State hash the action was prepared against. */
    referenceHash: string;
    /** True when the caller asked for a screenshot on the frame that ends the loop. */
    wantsScreenshot: boolean;
    signal: AbortSignal;
    /** Allocate the artifact path for a frame that may become the returned evidence. */
    allocateScreenshotPath: () => Promise<string | undefined>;
    /** Observe the acted-on app with the frame's screenshot request already folded in. */
    observe: (options: BackendObserveOptions) => Promise<BackendObservation>;
}
export interface SettleLoopResult {
    /** Last frame the loop collected; undefined only if the loop never ran a frame. */
    observation: BackendObservation | undefined;
    settled: boolean;
    /** When the loop started, so `effect.observedForMs` can report its whole duration. */
    startedAt: number;
}
/**
 * The post-action effect report.
 *
 * It reports only what the bounded structural observation can prove.
 * Pixel-only, remote, or transient effects remain outside this hash and
 * must not be described as action failure. `observedForMs` is the whole loop
 * duration, not the time since the change was first nominated.
 */
export declare function settleEffect(settled: boolean, observedForMs: number): ComputerActionEffect;
export declare function runSettleLoop(input: SettleLoopInput): Promise<SettleLoopResult>;
//# sourceMappingURL=motion.settle.d.ts.map