/** Toolbelt tools: the focused model-facing Computer Use Tool definitions. */
import { defineTool } from '@deepseek-ai/dsh-tools';
import { ComputerObservationId, } from "../charter/charter.index.js";
import { actionOutput, contextOf, deferVisionHandoff, renderJson, } from "./toolbelt.handoff.js";
import { actionBase, appSchema, appSelectorSchema, confirmationActionSchema, elementTarget, keyNames, observationSchema, sensitiveParameters, } from "./toolbelt.schema.js";
/**
 * The four states a macOS privacy permission can report, shared by the app list
 * and by every observation.
 */
const PERMISSION_STATES = ['granted', 'denied', 'not-determined', 'unavailable'];
/** One shared modifier vocabulary across keyboard and pointer actions. */
const MODIFIER_ITEMS = { type: 'string', enum: ['command', 'control', 'option', 'shift'] };
/** The exact observation a call is anchored to; every action and read takes one. */
const OBSERVATION_ID = { type: 'string', required: true };
/** Default window-relative x/y, with screen-global Quartz coordinates as the escape hatch. */
const COORDINATE_SPACE = {
    type: 'string',
    enum: ['window', 'screen'],
    description: 'Default window interprets x/y inside the observed window frame; screen uses Quartz screen-global coordinates.',
};
/** The pointer button a click may target. */
const POINTER_BUTTON = { type: 'string', enum: ['left', 'right', 'middle'] };
/**
 * Entry-point arguments shared verbatim by every element-targeted Tool: the
 * exact observation to act inside, plus the element to act on.
 */
const TARGETED_ENTRY = {
    observationId: OBSERVATION_ID,
    elementIndex: { type: 'integer' },
    targetHandle: { type: 'string' },
    allowRebind: { type: 'boolean' },
};
/** Build the generic pending-card presenter shared by every Tool in this file. */
function present(title, kind) {
    return () => ({ card: 'generic', title, kind });
}
/** One listed application: the full identity plus the flags only a live listing knows. */
const APP_LIST_ITEM = {
    type: 'object',
    additionalProperties: false,
    properties: {
        // Identity fields shared with every observation, then the live flags.
        ...appSchema.properties,
        frontmost: { type: 'boolean', required: true },
        accessibility: { type: 'string', enum: PERMISSION_STATES, required: true },
        screenRecording: { type: 'string', enum: PERMISSION_STATES, required: true },
    },
};
/** The bounded application listing, used to resolve a bundle id the task did not name. */
function appListTool(service) {
    return defineTool({
        name: 'computer_list_apps',
        description: 'List the bounded set of running, user-facing macOS applications. Use it only when the task does not already identify a unique bundle id.',
        parameters: {},
        output: {
            schema: { type: 'array', items: APP_LIST_ITEM },
            render: renderJson,
        },
        execute: (_args, exec) => service.listApps(contextOf(exec)),
        presentCall: present('List macOS apps', 'read'),
    });
}
/** The fresh Accessibility read, its screenshot Artifact, and its artifact projection. */
const OBSERVE_PARAMETERS = {
    app: { ...appSelectorSchema, required: true },
    screenshot: { type: 'string', enum: ['none', 'optional', 'required'], description: 'Default optional. Required fails when Screen Recording is unavailable.' },
    full: { type: 'boolean', description: 'Return a full tree instead of a diff from the previous observation.' },
};
/** One fresh Accessibility read, optionally carrying a screenshot Artifact. */
function observationTool(service) {
    return defineTool({
        name: 'computer_observe',
        description: 'Read one fresh Accessibility observation of exactly one running app. Element indexes are meaningful only inside the observationId that returned them. Prefer the tree, and ask for a screenshot only for pixel-only facts. When a screenshot needs OCR, visual grounding, or pixel inspection, load the vision-tools Skill and hand the returned Artifact path to its native tools instead of using bash, tesseract, screencapture, or an ad hoc OCR script.',
        parameters: OBSERVE_PARAMETERS,
        output: {
            schema: observationSchema,
            render: renderJson,
            presentationMeta: (_args, value) => value.screenshot === undefined ? {} : { artifacts: [value.screenshot] },
        },
        execute: async (args, exec) => {
            const context = contextOf(exec);
            const observation = await service.observe(args, context);
            deferVisionHandoff(exec, observation.screenshot);
            return observation;
        },
        presentCall: present('Observe macOS app', 'read'),
    });
}
/** computer_click arguments: which element or point, plus how the click behaves. */
const CLICK_PARAMETERS = {
    observationId: OBSERVATION_ID,
    elementIndex: { type: 'integer' },
    targetHandle: { type: 'string', description: 'Opaque handle returned on the selected observation element.' },
    allowRebind: { type: 'boolean', description: 'Allow fail-closed native-identifier or unique semantic rebinding. Requires targetHandle.' },
    x: { type: 'number' },
    y: { type: 'number' },
    coordinateSpace: COORDINATE_SPACE,
    button: POINTER_BUTTON,
    clickCount: { type: 'integer', description: 'Click count, 1 to 3; the native helper clamps values outside that range.' },
    modifiers: {
        type: 'array',
        items: MODIFIER_ITEMS,
        description: 'Hold these modifiers for the click, for example ["command"] for a new-tab click. Modifiers force a real pointer click, so the element must allow coordinate fallback or an explicit x/y.',
    },
    allowCoordinateFallback: { type: 'boolean' },
    ...sensitiveParameters,
};
/** A click, either through AXPress on an element or through a real pointer event. */
function clickTool(service) {
    return defineTool({
        name: 'computer_click',
        description: 'Click an element from an observation — AXPress is preferred and needs no foreground activation — or click a window-relative or screen-global coordinate when the host pointer policy allows it. To recover safely after harmless tree reordering, pass the element targetHandle together with allowRebind=true; elementIndex is kept for exact-observation compatibility. Pass modifiers to hold command, control, option, or shift across the click; a modified click is always a real pointer click. A successful result carries deterministic resolution metadata plus a fresh post-click observation.',
        parameters: CLICK_PARAMETERS,
        output: actionOutput(),
        execute: (args, exec) => {
            const { x, y, coordinateSpace, button, clickCount, modifiers, allowCoordinateFallback } = args;
            return service.act({
                kind: 'click',
                ...actionBase(args),
                ...elementTarget(args),
                ...(x === undefined ? {} : { x }),
                ...(y === undefined ? {} : { y }),
                ...(coordinateSpace === undefined ? {} : { coordinateSpace }),
                ...(button === undefined ? {} : { button }),
                ...(clickCount === undefined ? {} : { clickCount }),
                ...(modifiers === undefined ? {} : { modifiers }),
                ...(allowCoordinateFallback === undefined ? {} : { allowCoordinateFallback }),
            }, contextOf(exec));
        },
        presentCall: present('Click macOS app', 'execute'),
    });
}
/** A direct Accessibility value write, never through the clipboard. */
function setValueTool(service) {
    return defineTool({
        name: 'computer_set_value',
        description: 'Set the Accessibility value of one observed editable element, never through the clipboard. Supply elementIndex or targetHandle; targetHandle with allowRebind=true permits deterministic fail-closed recovery after harmless tree reordering.',
        parameters: {
            ...TARGETED_ENTRY,
            value: { type: 'string', required: true },
            ...sensitiveParameters,
        },
        output: actionOutput(),
        execute: (args, exec) => service.act({
            kind: 'set-value',
            ...actionBase(args),
            ...elementTarget(args),
            value: args.value,
        }, contextOf(exec)),
        presentCall: present('Set app value', 'execute'),
    });
}
/** Unicode typing into the focused control, without touching the clipboard. */
function typeTextTool(service) {
    return defineTool({
        name: 'computer_type_text',
        description: 'Type Unicode text into whatever control currently holds focus, without reading or replacing the clipboard. Focus the control from fresh state first; the keyboard fallback may need host-authorized foreground activation. The supplied text is never echoed back in the result.',
        parameters: {
            observationId: OBSERVATION_ID,
            text: { type: 'string', required: true },
            ...sensitiveParameters,
        },
        output: actionOutput(),
        execute: (args, exec) => service.act({
            kind: 'type-text',
            ...actionBase(args),
            text: args.text,
        }, contextOf(exec)),
        presentCall: present('Type in macOS app', 'execute'),
    });
}
/** One validated key or chord, routed to the bound application process. */
function pressKeyTool(service) {
    return defineTool({
        name: 'computer_press_key',
        description: 'Press a single validated key or chord, routed to the selected app process. The default host policy leaves the current foreground app in place; use the documented key names and read the fresh observation that comes back.',
        parameters: {
            observationId: OBSERVATION_ID,
            key: { type: 'string', enum: keyNames, required: true },
            modifiers: { type: 'array', items: MODIFIER_ITEMS },
            ...sensitiveParameters,
        },
        output: actionOutput(),
        execute: (args, exec) => service.act({
            kind: 'press-key',
            ...actionBase(args),
            key: args.key,
            ...(args.modifiers === undefined ? {} : { modifiers: args.modifiers }),
        }, contextOf(exec)),
        presentCall: present('Press app key', 'execute'),
    });
}
/** A wheel event delivered to the bound process at an element or a point. */
function scrollTool(service) {
    return defineTool({
        name: 'computer_scroll',
        description: 'Scroll by routing a wheel event to the selected app process alone, at an element from an observation or at a window-relative or screen-global coordinate. The system cursor never moves.',
        parameters: {
            ...TARGETED_ENTRY,
            x: { type: 'number' },
            y: { type: 'number' },
            coordinateSpace: COORDINATE_SPACE,
            direction: { type: 'string', enum: ['up', 'down', 'left', 'right'], required: true },
            pages: { type: 'integer', description: 'Scroll pages, 1 to 10; the native helper clamps values outside that range.' },
            ...sensitiveParameters,
        },
        output: actionOutput(),
        execute: (args, exec) => {
            const { x, y, coordinateSpace, pages } = args;
            return service.act({
                kind: 'scroll',
                ...actionBase(args),
                ...elementTarget(args),
                direction: args.direction,
                ...(x === undefined ? {} : { x }),
                ...(y === undefined ? {} : { y }),
                ...(coordinateSpace === undefined ? {} : { coordinateSpace }),
                ...(pages === undefined ? {} : { pages }),
            }, contextOf(exec));
        },
        presentCall: present('Scroll macOS app', 'execute'),
    });
}
/** computer_drag arguments: the two gesture points and the coordinate space. */
const DRAG_PARAMETERS = {
    observationId: OBSERVATION_ID,
    fromX: { type: 'number', required: true },
    fromY: { type: 'number', required: true },
    toX: { type: 'number', required: true },
    toY: { type: 'number', required: true },
    coordinateSpace: {
        type: 'string',
        enum: ['window', 'screen'],
        description: 'Default window interprets the points inside the observed window frame; screen uses Quartz screen-global coordinates.',
    },
    modifiers: {
        type: 'array',
        items: MODIFIER_ITEMS,
        description: 'Hold these modifiers for the whole drag, for example ["option"] for a copy drag.',
    },
    ...sensitiveParameters,
};
/** A two-point mouse gesture inside the bound process. */
function dragTool(service) {
    return defineTool({
        name: 'computer_drag',
        description: 'Drag by routing mouse events to the selected app process alone, between two points expressed in the observed-window or screen-global coordinate space. The system cursor never moves. Pass modifiers to hold command, control, option, or shift for the whole gesture; a modified drag stays a real pointer drag.',
        parameters: DRAG_PARAMETERS,
        output: actionOutput(),
        execute: (args, exec) => {
            const { coordinateSpace, modifiers } = args;
            return service.act({
                kind: 'drag',
                ...actionBase(args),
                fromX: args.fromX,
                fromY: args.fromY,
                toX: args.toX,
                toY: args.toY,
                ...(coordinateSpace === undefined ? {} : { coordinateSpace }),
                ...(modifiers === undefined ? {} : { modifiers }),
            }, contextOf(exec));
        },
        presentCall: present('Drag in macOS app', 'execute'),
    });
}
/** One Accessibility action advertised by an observed element. */
function performActionTool(service) {
    return defineTool({
        name: 'computer_perform_action',
        description: 'Invoke one Accessibility action that an observed element advertises as available. Give elementIndex or targetHandle; targetHandle with allowRebind=true allows deterministic fail-closed recovery after harmless tree reordering.',
        parameters: {
            ...TARGETED_ENTRY,
            action: { type: 'string', required: true },
            ...sensitiveParameters,
        },
        output: actionOutput(),
        execute: (args, exec) => service.act({
            kind: 'perform-action',
            ...actionBase(args),
            ...elementTarget(args),
            action: args.action,
        }, contextOf(exec)),
        presentCall: present('Perform app action', 'execute'),
    });
}
/** The matchers a wait condition can set; at least one of them must be present. */
const WAIT_MATCHERS = {
    text: { type: 'string', description: 'Case-insensitive substring of the Accessibility tree text.' },
    elementRole: { type: 'string', description: 'Exact role of one observed element, for example AXButton.' },
    elementTitle: { type: 'string', description: 'Exact element title or accessible label.' },
    elementValue: { type: 'string', description: 'Exact value of one observed element.' },
};
/** What computer_wait accepts: the observation to read plus one bounded condition. */
const WAIT_PARAMETERS = {
    observationId: OBSERVATION_ID,
    condition: {
        type: 'object',
        additionalProperties: false,
        required: true,
        properties: {
            ...WAIT_MATCHERS,
            // Inversion flag: it turns any of the matchers above into a wait-for-absence.
            absent: { type: 'boolean', description: 'Default false. True resolves the wait as soon as the matchers no longer match, which is how a caller waits for something to disappear.' },
        },
    },
    timeoutMs: { type: 'integer', description: 'Default host maxSettleMs; must stay between 100 and the host maxWaitMs.' },
};
/** A read-only wait for one bounded Accessibility condition. */
function waitTool(service) {
    return defineTool({
        name: 'computer_wait',
        description: 'Wait for one bounded Accessibility condition on the referenced app to hold, then return fresh state without mutating the app. Prefer it over polling with repeated computer_observe calls. Pass absent=true to wait for a loading indicator, banner, or dialog to disappear rather than to appear. A condition must set at least one of text, elementRole, elementTitle, or elementValue; an empty condition fails immediately instead of waiting. timeoutMs defaults to the host maxSettleMs and can be raised up to the host maxWaitMs; when it times out, the error tells you to observe the current state rather than guess.',
        parameters: WAIT_PARAMETERS,
        output: actionOutput(),
        execute: (args, exec) => {
            const { timeoutMs } = args;
            return service.act({
                kind: 'wait',
                observationId: ComputerObservationId(args.observationId),
                condition: args.condition,
                ...(timeoutMs === undefined ? {} : { timeoutMs }),
            }, contextOf(exec));
        },
        presentCall: present('Wait for app state', 'read'),
    });
}
/** computer_confirm arguments: the exact action to approve plus its audit text. */
const CONFIRM_PARAMETERS = {
    action: { ...confirmationActionSchema, required: true },
    reason: { type: 'string', required: true },
    target: { type: 'string', required: true },
    dataSummary: { type: 'string' },
};
/** computer_confirm's answer: a one-use token bound to the approved action. */
const CONFIRM_OUTPUT = {
    type: 'object',
    additionalProperties: false,
    properties: {
        // The token, then the exact observation and app it was minted for.
        token: { type: 'string', required: true },
        observationId: { type: 'string', required: true },
        app: { ...appSchema, required: true },
        expiresAt: { type: 'string', required: true },
    },
};
/** The just-in-time sensitive-action approval request. */
function confirmTool(service) {
    return defineTool({
        name: 'computer_confirm',
        description: 'Ask for just-in-time approval of one exact sensitive action. Call it immediately before that action, then repeat the same action with sensitive=true and the token it returned.',
        parameters: CONFIRM_PARAMETERS,
        output: { schema: CONFIRM_OUTPUT, render: renderJson },
        execute: (args, exec) => {
            const { dataSummary } = args;
            return service.confirm({
                action: { ...args.action, observationId: ComputerObservationId(args.action.observationId), sensitive: true },
                reason: args.reason,
                target: args.target,
                ...(dataSummary === undefined ? {} : { dataSummary }),
            }, contextOf(exec));
        },
        presentCall: present('Confirm sensitive app action', 'execute'),
    });
}
/** Create the focused execution definitions bound to one active Service generation. */
export function createComputerUseTools(service) {
    return [
        appListTool,
        observationTool,
        clickTool,
        setValueTool,
        typeTextTool,
        pressKeyTool,
        scrollTool,
        dragTool,
        performActionTool,
        waitTool,
        confirmTool,
    ].map(build => build(service));
}
//# sourceMappingURL=toolbelt.tools.js.map