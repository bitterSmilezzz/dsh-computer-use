/** Provider-independent Computer Use Service: leases, observations, staleness, confirmations, and fresh post-action state. */
import { setTimeout as delay } from 'node:timers/promises';
import { Service } from '@deepseek-ai/cordis';
import { ComputerConfirmationManager } from "../custody/custody.consent.js";
import { Ledger } from "../custody/custody.ledger.js";
import { ComputerUseError, computerUseError } from "../charter/charter.fault.js";
import { ComputerLeaseManager } from "../custody/custody.lease.js";
import { allocateScreenshotPath } from "../optics/optics.artifact.js";
import { resolveComputerTarget } from "../optics/optics.locate.js";
import { captureObservation } from "./conductor.capture.js";
import { CursorFlight } from "./conductor.cursor.js";
import { ConductorQueue } from "./conductor.queue.js";
import { selectActionTarget } from "./conductor.target.js";
import { applyHealth, degradedHealth, describeStatus, unavailableHealth, } from "./conductor.health.js";
import { allowsTargetRebind, requiresPointerInput, validateAction, } from "../motion/motion.envelope.js";
import { matchesWait, resolveWaitTimeout } from "../motion/motion.budget.js";
import { runSettleLoop, settleEffect } from "../motion/motion.settle.js";
/**
 * Say which direction of a wait ran out of budget, so an appearance that never
 * came is distinguishable from a disappearance that never came.
 */
function waitTimeoutDetail(condition, budget) {
    const direction = condition.absent === true
        ? 'the wait condition was still present after'
        : 'the wait condition was not met within';
    return `${direction} ${budget} milliseconds; call computer_observe to inspect the current app state instead of guessing`;
}
/** Complete Service Definition plus provider-independent implementation. */
export class ComputerUseService extends Service {
    backend;
    config;
    ledger = new Ledger();
    queue = new ConductorQueue();
    leases;
    confirmations;
    lifecycle = new AbortController();
    healthState = {
        ready: false,
        accessibility: 'unavailable',
        screenRecording: 'unavailable',
    };
    /** Register `ctx.computerUse` using one validated backend and configuration generation. */
    constructor(ctx, backend, config) {
        super(ctx, 'computerUse');
        this.backend = backend;
        this.config = config;
        this.leases = new ComputerLeaseManager(ctx, () => this.config);
        this.confirmations = new ComputerConfirmationManager(ctx, () => this.config);
        ctx.effect(() => async () => {
            this.lifecycle.abort();
            this.clearState();
            await this.backend.dispose();
        }, 'dsh-computer-use: service lifecycle');
    }
    /** Verify the active backend before consumers become injectable. */
    async initialize() {
        try {
            await this.leases.initialize();
            this.healthState = applyHealth(await this.backend.health(this.lifecycle.signal));
        }
        catch (error) {
            const failure = computerUseError(error, 'Computer Use provider initialization failed');
            this.healthState = unavailableHealth(failure.message);
            throw failure;
        }
    }
    /** Replace the backend/config generation after a validated live Settings update. */
    async reconfigure(backend, config) {
        const health = await backend.health(this.lifecycle.signal);
        const previous = this.backend;
        this.backend = backend;
        this.config = config;
        this.ledger.nextGeneration();
        this.clearState();
        this.healthState = applyHealth(health);
        await previous.dispose();
    }
    /** Current provider and permission diagnostics. */
    status() {
        return describeStatus({
            platform: process.platform,
            provider: this.backend.name,
            generation: this.ledger.currentGeneration,
            helperPath: this.backend.helperPath,
            health: this.healthState,
        });
    }
    /** Re-run non-mutating provider health checks. */
    async health(signal) {
        try {
            this.healthState = applyHealth(await this.backend.health(AbortSignal.any([signal, this.lifecycle.signal])));
        }
        catch (error) {
            const failure = computerUseError(error, 'Computer Use health check failed');
            this.healthState = degradedHealth(this.healthState, failure.message);
            throw failure;
        }
        return this.status();
    }
    /** Open the exact macOS privacy pane after an explicit Settings-page action. */
    async openPermissionSettings(kind, signal) {
        await this.backend.openSettings(kind, AbortSignal.any([signal, this.lifecycle.signal]));
    }
    /** List bounded running applications without inspecting their UI contents. */
    async listApps(context) {
        return await this.backend.listApps(AbortSignal.any([context.signal, this.lifecycle.signal]));
    }
    /** Obtain a fresh, scoped observation after enforcing the app read lease. */
    async observe(request, context) {
        const signal = AbortSignal.any([context.signal, this.lifecycle.signal]);
        const app = await this.backend.resolveApp(request.app, signal);
        await this.leases.ensure(context.agent, app, 'read', 'computer_observe', context.callId, signal);
        return await this.capture(app, request, context, 'computer_observe');
    }
    /** Ask for a one-use token bound to an exact proposed sensitive action. */
    async confirm(request, context) {
        const stored = this.requireObservation(request.action.observationId, context.agent);
        return await this.confirmations.confirm(context.agent, stored.backend.app, request, context.callId, AbortSignal.any([context.signal, this.lifecycle.signal]));
    }
    /** Execute one observation-bound action and always return a fresh post-action observation. */
    async act(action, context) {
        const signal = AbortSignal.any([context.signal, this.lifecycle.signal]);
        validateAction(action);
        const stored = this.requireObservation(action.observationId, context.agent);
        if (action.kind === 'wait')
            return await this.wait(stored, action, context, signal);
        return await this.queue.enqueue(stored.backend.app, async () => {
            signal.throwIfAborted();
            return await this.actNow(action, context, signal);
        });
    }
    /** Live generation facts one capture reads. */
    captureHost() {
        return {
            backend: this.backend,
            config: this.config,
            ledger: this.ledger,
            lifetime: this.lifecycle.signal,
        };
    }
    async actNow(action, context, signal) {
        const stored = this.requireObservation(action.observationId, context.agent);
        const target = selectActionTarget(stored, action, this.config);
        await this.leases.ensure(context.agent, stored.backend.app, 'control', `computer_${action.kind}`, context.callId, signal);
        const observeOptions = {
            screenshot: 'none',
            maxNodes: this.config.maxNodes,
            maxDepth: this.config.maxDepth,
            maxTextBytes: this.config.maxTextBytes,
        };
        const flight = new CursorFlight(this.backend, this.config, action, target.element);
        let actionObservation = stored.backend;
        let cursorActivation;
        let element = target.element;
        let resolution = target.resolution;
        // Input must run against evidence collected immediately before it, so a
        // descriptor is re-resolved here and again after any window activation.
        if (target.descriptor !== undefined) {
            const fresh = await this.backend.observe(stored.backend.app, observeOptions, signal);
            const rebound = resolveComputerTarget(stored.backend, fresh, target.descriptor, allowsTargetRebind(action));
            actionObservation = rebound.observation;
            element = rebound.element;
            resolution = rebound.resolution;
            this.rejectReboundSensitiveTarget(action, context.agent, resolution);
        }
        if (flight.expected
            && this.config.interaction.focusPolicy === 'activate'
            && requiresPointerInput(action, target.element)
            && !actionObservation.frontmost) {
            const activated = await this.backend.activateForCursor(stored.backend.app, actionObservation.stateHash, observeOptions, signal);
            actionObservation = activated.observation;
            cursorActivation = activated.activation;
            if (target.descriptor !== undefined) {
                const rebound = resolveComputerTarget(stored.backend, actionObservation, target.descriptor, allowsTargetRebind(action));
                actionObservation = rebound.observation;
                element = rebound.element;
                resolution = rebound.resolution;
            }
        }
        this.rejectReboundSensitiveTarget(action, context.agent, resolution);
        await flight.prepare(element, actionObservation, signal);
        const request = {
            action,
            app: actionObservation.app,
            expectedStateHash: actionObservation.stateHash,
            interaction: this.config.interaction,
            ...(element === undefined ? {} : { element }),
            ...(actionObservation.window === undefined ? {} : { window: actionObservation.window }),
        };
        let outcome;
        try {
            this.confirmations.consume(context.agent, stored.backend.app, action);
            outcome = await flight.dispatch(request, signal);
            if (cursorActivation === 'activated' && outcome.activation !== 'activated') {
                outcome = { ...outcome, activation: 'activated' };
            }
        }
        catch (error) {
            throw computerUseError(error, `Computer Use ${action.kind} failed`);
        }
        finally {
            await flight.settle();
        }
        // The settle loop decides whether the action left a lasting structural
        // change behind; it carries the reference hash the action was issued
        // against and reports the effect that hash comparison proves.
        const settle = await runSettleLoop({
            budget: this.config,
            referenceHash: actionObservation.stateHash,
            wantsScreenshot: stored.public.screenshot !== undefined,
            signal,
            allocateScreenshotPath: () => allocateScreenshotPath(context.workspace, this.config.artifactRoot, context.agent.session.id),
            observe: options => this.backend.observe(stored.backend.app, options, signal),
        });
        const captured = await this.capture(stored.backend.app, { app: { bundleId: stored.backend.app.bundleId, pid: stored.backend.app.pid }, screenshot: stored.public.screenshot === undefined ? 'none' : 'optional' }, context, 'computer_action', settle.observation);
        const lost = flight.lost;
        return {
            action: action.kind,
            channel: outcome.channel,
            activation: outcome.activation,
            pointerInput: outcome.pointerInput,
            pointerRouting: outcome.pointerRouting,
            // Only reported when the cursor was meant to be showing and is not, so a
            // normal result stays unchanged and a lost cursor becomes visible to the
            // caller instead of to nobody.
            ...(lost === undefined ? {} : { agentCursor: lost }),
            effect: settleEffect(settle.settled, Date.now() - settle.startedAt),
            ...(resolution === undefined ? {} : { resolution }),
            observation: captured,
        };
    }
    /**
     * A sensitive action loses its consent the moment its target rebinds: the
     * approval described one element, and input would now reach another.
     */
    rejectReboundSensitiveTarget(action, agent, resolution) {
        if (action.sensitive !== true || resolution?.targetChanged !== true)
            return;
        this.confirmations.invalidate(agent, action.confirmationToken);
        throw new ComputerUseError('COMPUTER_TARGET_REBIND_REQUIRES_CONFIRMATION', 'the sensitive target rebound to a fresh element; observe the current UI and request a new one-use confirmation before acting');
    }
    /** Release all scoped observations and confirmations for one disposed Agent. */
    releaseAgent(agent) {
        this.ledger.releaseAgent(agent);
        this.leases.releaseAgent(agent);
        this.confirmations.releaseAgent(agent);
    }
    requireObservation(id, agent) {
        return this.ledger.require(id, agent);
    }
    async capture(app, request, context, sourceTool, preObserved) {
        return await captureObservation(this.captureHost(), app, request, context, sourceTool, preObserved);
    }
    async wait(stored, action, context, signal) {
        await this.leases.ensure(context.agent, stored.backend.app, 'read', 'computer_wait', context.callId, signal);
        // An omitted timeout keeps the historical default (maxSettleMs); the ceiling
        // is the separate maxWaitMs budget, so a slow load is no longer capped by the
        // post-action settle window.
        const budget = resolveWaitTimeout(action.timeoutMs, this.config);
        const startedAt = Date.now();
        const latest = await this.awaitCondition(stored, action, budget, startedAt + budget, signal);
        const observation = await this.capture(stored.backend.app, { app: { bundleId: stored.backend.app.bundleId, pid: stored.backend.app.pid }, screenshot: stored.public.screenshot === undefined ? 'none' : 'optional' }, context, 'computer_action', latest);
        const structuralChange = latest.stateHash !== stored.backend.stateHash;
        return {
            action: 'wait',
            channel: 'wait',
            activation: 'not-requested',
            effect: {
                observedStateChanged: structuralChange,
                observedForMs: Date.now() - startedAt,
                ...(structuralChange ? {} : { note: 'the wait condition was already satisfied by the referenced observation' }),
            },
            pointerInput: false,
            pointerRouting: 'none',
            observation,
        };
    }
    /**
     * Poll provider state until the wait condition holds. Running out of the budget
     * fails with the direction that was being waited for, so the model can tell an
     * appearance that never came from a disappearance that never came.
     */
    async awaitCondition(stored, action, budget, deadline, signal) {
        const options = {
            screenshot: 'none',
            maxNodes: this.config.maxNodes,
            maxDepth: this.config.maxDepth,
            maxTextBytes: this.config.maxTextBytes,
        };
        let latest = stored.backend;
        while (!matchesWait(latest, action)) {
            if (Date.now() >= deadline) {
                throw new ComputerUseError('COMPUTER_TIMEOUT', waitTimeoutDetail(action.condition, budget));
            }
            // Never poll faster than one settleMs step, never past the deadline, and
            // never with a zero delay.
            const pause = Math.min(this.config.settleMs || 100, Math.max(1, deadline - Date.now()));
            await delay(pause, undefined, { signal });
            latest = await this.backend.observe(stored.backend.app, options, signal);
        }
        return latest;
    }
    clearState() {
        this.ledger.clear();
        this.confirmations.clear();
    }
}
export default ComputerUseService;
//# sourceMappingURL=conductor.service.js.map