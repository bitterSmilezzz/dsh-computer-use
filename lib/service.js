/** Provider-independent Computer Use Service: leases, observations, staleness, confirmations, and fresh post-action state. */
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { Service } from '@deepseek-ai/cordis';
import { allocateScreenshotPath, describeScreenshot } from "./artifacts.js";
import { ComputerConfirmationManager } from "./confirmations.js";
import { diffElements } from "./diff.js";
import { ComputerUseError, computerUseError } from "./errors.js";
import { ComputerLeaseManager } from "./leases.js";
import { describeComputerTarget, resolveComputerTarget, } from "./target-resolver.js";
import { ComputerObservationId, ComputerTargetHandle, } from "./types.js";
function publicElements(observation) {
    const targets = new Map();
    const elements = observation.elements.map((backendElement) => {
        const { locator: _locator, nativeIdentifier: _nativeIdentifier, ...element } = backendElement;
        const targetHandle = ComputerTargetHandle(randomUUID());
        targets.set(targetHandle, describeComputerTarget(backendElement, observation));
        return { ...element, targetHandle };
    });
    return { elements, targets };
}
/**
 * Largest Accessibility value this Service will attempt to assign.
 *
 * Mirrors the byte-oriented `maxTextBytes` style of the observation limits with
 * one clear character bound: an element value far beyond any editable control's
 * capacity is a caller mistake, not an assignment worth a native round trip.
 */
const MAX_SET_VALUE_CHARACTERS = 64_000;
/** True when the caller supplied at least one matcher the wait can test. */
function waitConditionDefined(condition) {
    return condition.text !== undefined
        || condition.elementRole !== undefined
        || condition.elementTitle !== undefined
        || condition.elementValue !== undefined;
}
function waitConditionMatches(observation, condition) {
    if (condition.text !== undefined && !observation.treeText.toLocaleLowerCase().includes(condition.text.toLocaleLowerCase()))
        return false;
    if (condition.elementRole !== undefined && !observation.elements.some(element => element.role === condition.elementRole))
        return false;
    if (condition.elementTitle !== undefined && !observation.elements.some(element => element.title === condition.elementTitle || element.label === condition.elementTitle))
        return false;
    if (condition.elementValue !== undefined && !observation.elements.some(element => element.value === condition.elementValue))
        return false;
    return true;
}
function matchesWait(observation, action) {
    const matched = waitConditionMatches(observation, action.condition);
    // `absent` inverts the matcher set so a caller can wait for a loading
    // indicator, banner, or dialog to disappear instead of polling observe.
    return action.condition.absent === true ? !matched : matched;
}
function targetIndex(action) {
    switch (action.kind) {
        case 'click':
        case 'scroll': return action.elementIndex;
        case 'set-value':
        case 'perform-action': return action.elementIndex;
        case 'type-text':
        case 'press-key':
        case 'drag':
        case 'wait': return undefined;
    }
}
function targetHandle(action) {
    switch (action.kind) {
        case 'click':
        case 'scroll':
        case 'set-value':
        case 'perform-action': return action.targetHandle;
        case 'type-text':
        case 'press-key':
        case 'drag':
        case 'wait': return undefined;
    }
}
function allowsTargetRebind(action) {
    switch (action.kind) {
        case 'click':
        case 'scroll':
        case 'set-value':
        case 'perform-action': return action.allowRebind === true;
        case 'type-text':
        case 'press-key':
        case 'drag':
        case 'wait': return false;
    }
}
function requiresElement(action) {
    return action.kind === 'set-value' || action.kind === 'perform-action';
}
function requiresPointerInput(action, element) {
    switch (action.kind) {
        case 'click':
            if (action.x !== undefined || action.y !== undefined)
                return true;
            return element !== undefined
                && action.allowCoordinateFallback === true;
        case 'scroll':
        case 'drag': return true;
        case 'set-value':
        case 'type-text':
        case 'press-key':
        case 'perform-action': return false;
    }
}
function requiresForegroundPermission(action) {
    return action.kind === 'perform-action' && action.action === 'AXRaise';
}
function cursorAction(action, element, window, app) {
    if (window?.id === undefined)
        return undefined;
    const target = {
        targetPid: app.pid,
        targetWindowNumber: window.id,
        targetWindowFrame: { ...window.frame },
    };
    const elementPoint = element?.frame === undefined
        ? undefined
        : {
            x: element.frame.x + element.frame.width / 2,
            y: element.frame.y + element.frame.height / 2,
        };
    const coordinateSpace = action.kind === 'click' || action.kind === 'scroll' || action.kind === 'drag'
        ? action.coordinateSpace
        : undefined;
    const windowPoint = (x, y) => {
        if (x === undefined || y === undefined || window === undefined)
            return undefined;
        return coordinateSpace === 'screen' ? { x, y } : { x: window.frame.x + x, y: window.frame.y + y };
    };
    switch (action.kind) {
        case 'click':
        case 'scroll': {
            const point = elementPoint ?? windowPoint(action.x, action.y);
            return point === undefined ? undefined : { kind: action.kind, to: point, ...target };
        }
        case 'drag': {
            const from = windowPoint(action.fromX, action.fromY);
            const to = windowPoint(action.toX, action.toY);
            return from === undefined || to === undefined ? undefined : { kind: 'drag', from, to, ...target };
        }
        case 'set-value':
        case 'type-text':
        case 'press-key':
        case 'perform-action': return undefined;
    }
}
/** Complete Service Definition plus provider-independent implementation. */
export class ComputerUseService extends Service {
    backend;
    config;
    generation = 1;
    agents = new Map();
    actionTails = new Map();
    leases;
    confirmations;
    lifecycle = new AbortController();
    healthState = {
        ready: false,
        accessibility: 'unavailable',
        screenRecording: 'unavailable',
    };
    /** Persist backend health facts while allowing a disabled provider to stay ready=false with a visible reason. */
    applyHealth(health) {
        this.healthState = {
            ready: health.ready ?? true,
            helperVersion: health.helperVersion,
            helperSha256: health.helperSha256,
            accessibility: health.accessibility,
            screenRecording: health.screenRecording,
            ...(health.error === undefined ? {} : { lastError: health.error }),
        };
    }
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
            this.applyHealth(await this.backend.health(this.lifecycle.signal));
        }
        catch (error) {
            const failure = computerUseError(error, 'Computer Use provider initialization failed');
            this.healthState = {
                ready: false,
                accessibility: 'unavailable',
                screenRecording: 'unavailable',
                lastError: failure.message,
            };
            throw failure;
        }
    }
    /** Replace the backend/config generation after a validated live Settings update. */
    async reconfigure(backend, config) {
        const health = await backend.health(this.lifecycle.signal);
        const previous = this.backend;
        this.backend = backend;
        this.config = config;
        this.generation += 1;
        this.clearState();
        this.applyHealth(health);
        await previous.dispose();
    }
    /** Current provider and permission diagnostics. */
    status() {
        return {
            platform: process.platform,
            provider: this.backend.name,
            generation: this.generation,
            helperPath: this.backend.helperPath,
            ...this.healthState,
        };
    }
    /** Re-run non-mutating provider health checks. */
    async health(signal) {
        try {
            this.applyHealth(await this.backend.health(AbortSignal.any([signal, this.lifecycle.signal])));
        }
        catch (error) {
            const failure = computerUseError(error, 'Computer Use health check failed');
            this.healthState = { ...this.healthState, ready: false, lastError: failure.message };
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
        this.validateAction(action);
        const stored = this.requireObservation(action.observationId, context.agent);
        if (action.kind === 'wait')
            return await this.wait(stored, action, context, signal);
        return await this.enqueueAction(stored.backend.app, async () => {
            signal.throwIfAborted();
            return await this.actNow(action, context, signal);
        });
    }
    /**
     * Reject an action whose arguments cannot be satisfied at all, before any
     * lease, queue, or provider work. The model gets one immediate correction
     * instead of a deadline that can never be met.
     */
    validateAction(action) {
        if (action.kind === 'wait' && !waitConditionDefined(action.condition)) {
            throw new ComputerUseError('COMPUTER_INVALID_ARGUMENT', 'condition must set at least one of text, elementRole, elementTitle, or elementValue; add absent=true when the wait should resolve once that match disappears');
        }
        if (action.kind === 'set-value' && action.value.length > MAX_SET_VALUE_CHARACTERS) {
            throw new ComputerUseError('COMPUTER_INVALID_ARGUMENT', `value must be at most ${MAX_SET_VALUE_CHARACTERS} characters (received ${action.value.length}); use computer_type_text after focusing the control for longer text`);
        }
    }
    /** Keep this service's actions for one process ordered through post-action observation. */
    async actNow(action, context, signal) {
        const stored = this.requireObservation(action.observationId, context.agent);
        const index = targetIndex(action);
        const handle = targetHandle(action);
        const originalElement = index === undefined ? undefined : stored.backend.elements.find(candidate => candidate.index === index);
        if (index !== undefined && originalElement === undefined) {
            throw new ComputerUseError('COMPUTER_ELEMENT_UNAVAILABLE', `element ${index} is not part of observation ${String(action.observationId)}`);
        }
        if (allowsTargetRebind(action) && handle === undefined) {
            throw new ComputerUseError('COMPUTER_TARGET_UNAVAILABLE', 'allowRebind requires a targetHandle from the referenced observation');
        }
        const descriptor = handle === undefined ? undefined : stored.targets.get(handle);
        if (handle !== undefined && descriptor === undefined) {
            throw new ComputerUseError('COMPUTER_TARGET_UNAVAILABLE', 'targetHandle is unknown or does not belong to the referenced observation');
        }
        if (descriptor !== undefined && index !== undefined && (descriptor.locator.length !== originalElement?.locator.length
            || !descriptor.locator.every((part, position) => part === originalElement.locator[position]))) {
            throw new ComputerUseError('COMPUTER_TARGET_UNAVAILABLE', 'elementIndex and targetHandle select different elements');
        }
        const selectedOriginalElement = originalElement ?? (descriptor === undefined
            ? undefined
            : stored.backend.elements.find(candidate => candidate.locator.length === descriptor.locator.length
                && candidate.locator.every((part, position) => part === descriptor.locator[position])));
        if (descriptor !== undefined && selectedOriginalElement === undefined) {
            throw new ComputerUseError('COMPUTER_TARGET_UNAVAILABLE', 'targetHandle no longer has provider evidence in the referenced observation');
        }
        if (requiresElement(action) && selectedOriginalElement === undefined) {
            throw new ComputerUseError('COMPUTER_ELEMENT_UNAVAILABLE', `${action.kind} requires elementIndex or targetHandle`);
        }
        if (requiresPointerInput(action, selectedOriginalElement) && this.config.interaction.pointerInputPolicy === 'deny') {
            throw new ComputerUseError('COMPUTER_ACTION_BLOCKED', `${action.kind} requires target-process pointer input, which interaction.pointerInputPolicy denies; use an Accessibility action or enable targeted pointer input in host Settings`);
        }
        if (requiresForegroundPermission(action) && this.config.interaction.focusPolicy === 'preserve') {
            throw new ComputerUseError('COMPUTER_ACTION_BLOCKED', 'AXRaise may raise the target window, which interaction.focusPolicy preserve denies; enable explicit activation in host Settings before using this action');
        }
        await this.leases.ensure(context.agent, stored.backend.app, 'control', `computer_${action.kind}`, context.callId, signal);
        const cursorRequested = this.config.interaction.cursorVisualization === 'visible'
            && (action.kind === 'click' || action.kind === 'scroll' || action.kind === 'drag');
        const observationOptions = {
            screenshot: 'none',
            maxNodes: this.config.maxNodes,
            maxDepth: this.config.maxDepth,
            maxTextBytes: this.config.maxTextBytes,
        };
        let actionObservation = stored.backend;
        let cursorActivation;
        let element = selectedOriginalElement;
        let resolution = selectedOriginalElement === undefined
            ? undefined
            : { mode: 'exact-locator', confidence: 1, candidateCount: 1, targetChanged: false };
        if (descriptor !== undefined) {
            const fresh = actionObservation === stored.backend
                ? await this.backend.observe(stored.backend.app, observationOptions, signal)
                : actionObservation;
            const resolved = resolveComputerTarget(stored.backend, fresh, descriptor, allowsTargetRebind(action));
            actionObservation = resolved.observation;
            element = resolved.element;
            resolution = resolved.resolution;
        }
        if (action.sensitive === true && resolution?.targetChanged === true) {
            this.confirmations.invalidate(context.agent, action.confirmationToken);
            throw new ComputerUseError('COMPUTER_TARGET_REBIND_REQUIRES_CONFIRMATION', 'the sensitive target rebound to a fresh element; observe the current UI and request a new one-use confirmation before acting');
        }
        if (cursorRequested
            && this.config.interaction.focusPolicy === 'activate'
            && requiresPointerInput(action, selectedOriginalElement)
            && !actionObservation.frontmost) {
            const activated = await this.backend.activateForCursor(stored.backend.app, actionObservation.stateHash, observationOptions, signal);
            actionObservation = activated.observation;
            cursorActivation = activated.activation;
            if (descriptor !== undefined) {
                const resolved = resolveComputerTarget(stored.backend, actionObservation, descriptor, allowsTargetRebind(action));
                actionObservation = resolved.observation;
                element = resolved.element;
                resolution = resolved.resolution;
            }
        }
        if (action.sensitive === true && resolution?.targetChanged === true) {
            this.confirmations.invalidate(context.agent, action.confirmationToken);
            throw new ComputerUseError('COMPUTER_TARGET_REBIND_REQUIRES_CONFIRMATION', 'the sensitive target rebound to a fresh element; observe the current UI and request a new one-use confirmation before acting');
        }
        const visualization = cursorAction(action, element, actionObservation.window, actionObservation.app);
        let cursorStarted = false;
        // Background targets intentionally hide the overlay. Any other pre-action
        // failure would violate move-before-input ordering and therefore fails closed.
        let cursorState;
        const recordCursor = (next) => {
            if (cursorState === undefined || (cursorState.visible && !next.visible))
                cursorState = next;
        };
        if (cursorRequested && visualization === undefined) {
            const unavailable = {
                visible: false,
                reason: actionObservation.window?.id === undefined
                    ? 'the agent cursor could not be bound because the target window has no stable window id'
                    : 'the agent cursor could not be placed because this action has no observable cursor position',
                ...(!actionObservation.frontmost ? { reasonCode: 'target-not-frontmost' } : {}),
            };
            recordCursor(unavailable);
            if (actionObservation.frontmost) {
                throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', `the agent cursor could not complete before the action: ${unavailable.reason}`);
            }
        }
        else if (visualization !== undefined && cursorRequested) {
            let beforeCursor;
            try {
                beforeCursor = await this.backend.visualizeCursor(visualization, 'before', signal);
            }
            catch (error) {
                throw computerUseError(error, 'the agent cursor could not be driven before the action');
            }
            recordCursor(beforeCursor);
            const intentionalBackground = beforeCursor.reasonCode === 'target-not-frontmost'
                && (this.config.interaction.focusPolicy === 'preserve'
                    || !requiresPointerInput(action, selectedOriginalElement));
            if (!beforeCursor.visible && !intentionalBackground) {
                throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', `the agent cursor could not complete before the action: ${beforeCursor.reason ?? 'the overlay is unavailable'}`);
            }
            cursorStarted = beforeCursor.visible;
        }
        let outcome;
        const request = {
            action,
            app: actionObservation.app,
            expectedStateHash: actionObservation.stateHash,
            interaction: this.config.interaction,
            ...(element === undefined ? {} : { element }),
            ...(actionObservation.window === undefined ? {} : { window: actionObservation.window }),
        };
        try {
            this.confirmations.consume(context.agent, stored.backend.app, action);
            if (cursorStarted && visualization?.kind === 'drag') {
                const tracked = await this.backend.actDragWithCursor(request, visualization, signal);
                recordCursor(tracked.cursor);
                outcome = tracked.action;
            }
            else {
                outcome = await this.backend.act(request, signal);
            }
            if (cursorActivation === 'activated' && outcome.activation !== 'activated') {
                outcome = { ...outcome, activation: 'activated' };
            }
        }
        catch (error) {
            throw computerUseError(error, `Computer Use ${action.kind} failed`);
        }
        finally {
            if (cursorStarted && visualization !== undefined) {
                try {
                    recordCursor(await this.backend.visualizeCursor(visualization, 'after', AbortSignal.timeout(1_500)));
                }
                catch (error) {
                    recordCursor({
                        visible: false,
                        reason: `the agent cursor could not be validated after the action: ${error instanceof Error ? error.message : String(error)}`,
                    });
                }
            }
        }
        // The settle loop reports whether the bounded structural observation
        // changed. It complements routing facts without claiming causal proof or
        // visibility into pixel-only, transient, or remote effects.
        const started = Date.now();
        const wantsScreenshot = stored.public.screenshot !== undefined;
        // A frame taken at least settleMs after the action stands on its own: it is
        // the same evidence the previous loop collected by waiting first. A frame
        // inside that window can only nominate a change — a hover, a focus ring, a
        // busy indicator, or a single intermediate layout looks like a real effect
        // for one frame — so it waits for a confirming frame before the change is
        // reported as settled.
        let latest;
        let settled = false;
        let backoffMs = 0;
        /** State a pre-window frame reported, still awaiting its confirming frame. */
        let pendingHash;
        /** Cleared once a frame that carried a screenshot failed to end the loop. */
        let evidence = wantsScreenshot;
        for (;;) {
            const conclusive = pendingHash !== undefined || Date.now() - started >= this.config.settleMs;
            // The caller's screenshot rides only on a frame that can become the
            // returned evidence, so an intermediate frame costs no window capture and
            // leaves no artifact behind.
            const screenshot = evidence && conclusive ? 'optional' : 'none';
            const screenshotPath = screenshot === 'none'
                ? undefined
                : await allocateScreenshotPath(context.workspace, this.config.artifactRoot, context.agent.session.id);
            // Check what the action left behind before waiting, so a visible effect
            // costs no settleMs at all.
            latest = await this.backend.observe(stored.backend.app, {
                screenshot,
                ...(screenshotPath === undefined ? {} : { screenshotPath }),
                maxNodes: this.config.maxNodes,
                maxDepth: this.config.maxDepth,
                maxTextBytes: this.config.maxTextBytes,
            }, signal);
            if (pendingHash !== undefined && latest.stateHash === pendingHash) {
                // Two frames reporting the same changed state is the evidence that the
                // change outlived the settle window instead of reverting behind it.
                settled = true;
                break;
            }
            // A frame at least settleMs after the action stands on its own, so a change
            // it reports settles the loop; a pre-window frame only nominates the change
            // it saw, to be confirmed or dropped by the next frame.
            const changed = latest.stateHash !== actionObservation.stateHash;
            if (changed && conclusive) {
                settled = true;
                break;
            }
            pendingHash = changed ? latest.stateHash : undefined;
            const remaining = this.config.maxSettleMs - (Date.now() - started);
            if (remaining <= 0)
                break;
            if (screenshotPath !== undefined) {
                // Only the frame that ends the loop can be returned, so an artifact from
                // an earlier frame is removed instead of being left behind unreferenced,
                // and later frames stop asking for one.
                await rm(screenshotPath, { force: true }).catch(() => undefined);
                evidence = false;
            }
            // The first wait is the configured settleMs and every later wait doubles
            // it, so a slow UI costs logarithmic provider round trips instead of one
            // full observation per settleMs. `Math.max(1, ...)` keeps settleMs = 0
            // from spinning, and no wait crosses the maxSettleMs budget.
            backoffMs = backoffMs === 0 ? Math.max(1, this.config.settleMs) : backoffMs * 2;
            await delay(Math.min(backoffMs, remaining), undefined, { signal });
        }
        const observation = await this.capture(stored.backend.app, { app: { bundleId: stored.backend.app.bundleId, pid: stored.backend.app.pid }, screenshot: stored.public.screenshot === undefined ? 'none' : 'optional' }, context, 'computer_action', latest);
        return {
            action: action.kind,
            channel: outcome.channel,
            activation: outcome.activation,
            pointerInput: outcome.pointerInput,
            pointerRouting: outcome.pointerRouting,
            // Only reported when the cursor is meant to be showing and is not, so a
            // normal result stays unchanged and a lost cursor becomes visible to the
            // caller instead of to nobody.
            ...(cursorState === undefined || cursorState.visible ? {} : {
                agentCursor: { visible: false, ...(cursorState.reason === undefined ? {} : { reason: cursorState.reason }) },
            }),
            // This reports only what the bounded structural observation can prove.
            // Pixel-only, remote, or transient effects remain outside this hash and
            // must not be described as action failure.
            effect: {
                observedStateChanged: settled,
                observedForMs: Date.now() - started,
                ...(settled ? {} : {
                    note: 'no change was observed in the window title, id, frame, or accessibility element tree;'
                        + ' pixel-only, remote, or transient effects may still have occurred',
                }),
            },
            ...(resolution === undefined ? {} : { resolution }),
            observation,
        };
    }
    async enqueueAction(app, operation) {
        const key = `${app.bundleId}:${app.pid}`;
        const previous = this.actionTails.get(key) ?? Promise.resolve();
        const run = previous.catch(() => undefined).then(operation);
        const tail = run.then(() => undefined, () => undefined);
        this.actionTails.set(key, tail);
        try {
            return await run;
        }
        finally {
            if (this.actionTails.get(key) === tail)
                this.actionTails.delete(key);
        }
    }
    /** Release all scoped observations and confirmations for one disposed Agent. */
    releaseAgent(agent) {
        this.agents.delete(agent);
        this.leases.releaseAgent(agent);
        this.confirmations.releaseAgent(agent);
    }
    state(agent) {
        let state = this.agents.get(agent);
        if (state === undefined) {
            state = { observations: new Map(), latestByApp: new Map() };
            this.agents.set(agent, state);
        }
        return state;
    }
    requireObservation(id, agent) {
        this.prune(agent);
        const stored = this.state(agent).observations.get(id);
        if (stored === undefined || stored.generation !== this.generation) {
            throw new ComputerUseError('COMPUTER_STALE_OBSERVATION', `observation ${String(id)} is unknown, expired, or belongs to another provider generation`);
        }
        return stored;
    }
    prune(agent) {
        const state = this.agents.get(agent);
        if (state === undefined)
            return;
        const now = Date.now();
        for (const [id, stored] of state.observations) {
            if (Date.parse(stored.public.expiresAt) <= now || stored.generation !== this.generation)
                state.observations.delete(id);
        }
        for (const [app, id] of state.latestByApp) {
            if (!state.observations.has(id))
                state.latestByApp.delete(app);
        }
    }
    async capture(app, request, context, sourceTool, preObserved) {
        const signal = AbortSignal.any([context.signal, this.lifecycle.signal]);
        const screenshot = request.screenshot ?? 'optional';
        // A pre-observed frame is reused whenever it already carries the evidence
        // the caller asked for: `none` needs no screenshot, and any other mode needs
        // the frame to have one. A frame that lacks it is never downgraded in place,
        // the provider is asked again instead.
        const reuse = preObserved !== undefined && (screenshot === 'none' || preObserved.screenshot !== undefined);
        // A reused frame needs no artifact path, and a `none` request needs no file.
        const screenshotPath = reuse || screenshot === 'none'
            ? undefined
            : await allocateScreenshotPath(context.workspace, this.config.artifactRoot, context.agent.session.id);
        const backend = reuse
            ? preObserved
            : await this.backend.observe(app, {
                screenshot,
                ...(screenshotPath === undefined ? {} : { screenshotPath }),
                maxNodes: this.config.maxNodes,
                maxDepth: this.config.maxDepth,
                maxTextBytes: this.config.maxTextBytes,
            }, signal);
        if (backend.app.bundleId !== app.bundleId || backend.app.pid !== app.pid) {
            throw new ComputerUseError('COMPUTER_STALE_OBSERVATION', 'the selected application restarted or resolved to a different process');
        }
        const state = this.state(context.agent);
        this.prune(context.agent);
        const key = `${app.bundleId}:${app.pid}`;
        const previousId = state.latestByApp.get(key);
        const previous = previousId === undefined ? undefined : state.observations.get(previousId);
        const projected = publicElements(backend);
        const elements = projected.elements;
        const full = request.full === true || previous === undefined;
        const createdAt = Date.now();
        const observationId = ComputerObservationId(randomUUID());
        const artifact = backend.screenshot === undefined
            ? undefined
            : await describeScreenshot(backend.screenshot.path, backend.screenshot.width, backend.screenshot.height, this.config.maxScreenshotBytes, sourceTool);
        const observation = {
            observationId,
            app: backend.app,
            createdAt: new Date(createdAt).toISOString(),
            expiresAt: this.config.observationTtlMs === 0
                ? '9999-12-31T23:59:59.999Z'
                : new Date(createdAt + this.config.observationTtlMs).toISOString(),
            frontmost: backend.frontmost,
            ...(backend.window === undefined ? {} : { window: backend.window }),
            tree: {
                mode: full ? 'full' : 'diff',
                text: full ? backend.treeText : diffElements(previous.public.elements, elements, this.config.maxTextBytes),
                truncated: backend.truncated,
            },
            elements,
            ...(artifact === undefined ? {} : { screenshot: artifact }),
            permissions: backend.permissions,
        };
        state.observations.set(observationId, { public: observation, backend, targets: projected.targets, generation: this.generation });
        state.latestByApp.set(key, observationId);
        while (state.observations.size > 64) {
            const oldest = state.observations.keys().next().value;
            if (oldest === undefined)
                break;
            state.observations.delete(oldest);
        }
        return observation;
    }
    async wait(stored, action, context, signal) {
        await this.leases.ensure(context.agent, stored.backend.app, 'read', 'computer_wait', context.callId, signal);
        // An omitted timeout keeps the historical default (maxSettleMs), while the
        // ceiling moved to the separate maxWaitMs budget so a slow load is no longer
        // limited by the post-action settle window.
        const timeoutMs = action.timeoutMs ?? this.config.maxSettleMs;
        if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > this.config.maxWaitMs) {
            throw new ComputerUseError('COMPUTER_INVALID_ARGUMENT', `wait timeoutMs must be an integer between 100 and ${this.config.maxWaitMs} milliseconds`);
        }
        const started = Date.now();
        const deadline = started + timeoutMs;
        let latest = stored.backend;
        while (!matchesWait(latest, action)) {
            if (Date.now() >= deadline) {
                throw new ComputerUseError('COMPUTER_TIMEOUT', action.condition.absent === true
                    ? `the wait condition was still present after ${timeoutMs} milliseconds; call computer_observe to inspect the current app state instead of guessing`
                    : `the wait condition was not met within ${timeoutMs} milliseconds; call computer_observe to inspect the current app state instead of guessing`);
            }
            await delay(Math.min(this.config.settleMs || 100, Math.max(1, deadline - Date.now())), undefined, { signal });
            latest = await this.backend.observe(stored.backend.app, {
                screenshot: 'none',
                maxNodes: this.config.maxNodes,
                maxDepth: this.config.maxDepth,
                maxTextBytes: this.config.maxTextBytes,
            }, signal);
        }
        const observation = await this.capture(stored.backend.app, { app: { bundleId: stored.backend.app.bundleId, pid: stored.backend.app.pid }, screenshot: stored.public.screenshot === undefined ? 'none' : 'optional' }, context, 'computer_action', latest);
        return {
            action: 'wait',
            channel: 'wait',
            activation: 'not-requested',
            effect: {
                observedStateChanged: latest.stateHash !== stored.backend.stateHash,
                observedForMs: Date.now() - started,
                ...(latest.stateHash === stored.backend.stateHash
                    ? { note: 'the wait condition was already satisfied by the referenced observation' }
                    : {}),
            },
            pointerInput: false,
            pointerRouting: 'none',
            observation,
        };
    }
    clearState() {
        this.agents.clear();
        this.confirmations.clear();
    }
}
export default ComputerUseService;
//# sourceMappingURL=service.js.map