/**
 * Toolbelt schema: the model-visible argument and output shapes of every
 * Computer Use Tool, plus the argument readers that rebuild branded ids.
 *
 * These declarations are the published contract with the model and are never
 * widened for convenience — a shape change here changes what the model can send.
 */
import { ComputerConfirmationToken, ComputerObservationId, ComputerTargetHandle, } from "../charter/charter.index.js";
/** macOS permission vocabulary, shared by every schema that reports it. */
const permissionStates = ['granted', 'denied', 'not-determined', 'unavailable'];
export const rectSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        x: { type: 'number', required: true }, y: { type: 'number', required: true },
        width: { type: 'number', required: true }, height: { type: 'number', required: true },
    },
};
export const appSelectorSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        bundleId: { type: 'string', description: 'Preferred exact macOS bundle identifier.' },
        pid: { type: 'integer', description: 'Exact current process id when already observed.' },
        name: { type: 'string', description: 'Display name accepted only when it resolves uniquely.' },
    },
};
export const appSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        bundleId: { type: 'string', required: true }, pid: { type: 'integer', required: true },
        name: { type: 'string', required: true },
    },
};
const elementSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        index: { type: 'integer', required: true }, targetHandle: { type: 'string', required: true },
        role: { type: 'string', required: true }, subrole: { type: 'string' },
        title: { type: 'string' }, label: { type: 'string' }, value: { type: 'string' },
        enabled: { type: 'boolean' }, focused: { type: 'boolean' }, selected: { type: 'boolean' },
        frame: rectSchema,
        actions: { type: 'array', items: { type: 'string' }, required: true },
    },
};
export const artifactSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        path: { type: 'string', required: true }, filename: { type: 'string', required: true },
        mimeType: { type: 'string', enum: ['image/png'], required: true },
        kind: { type: 'string', enum: ['image'], required: true },
        description: { type: 'string', required: true },
        sourceTool: { type: 'string', enum: ['computer_observe', 'computer_action'], required: true },
        previewIntent: { type: 'string', enum: ['image'], required: true },
        bytes: { type: 'integer', required: true }, width: { type: 'integer', required: true },
        height: { type: 'integer', required: true },
    },
};
export const observationSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        observationId: { type: 'string', required: true },
        app: { ...appSchema, required: true },
        createdAt: { type: 'string', required: true }, expiresAt: { type: 'string', required: true },
        frontmost: { type: 'boolean', required: true },
        window: {
            type: 'object',
            additionalProperties: false,
            properties: {
                title: { type: 'string' }, frame: { ...rectSchema, required: true }, id: { type: 'integer' },
            },
        },
        tree: {
            type: 'object', additionalProperties: false, required: true,
            properties: {
                mode: { type: 'string', enum: ['full', 'diff'], required: true }, text: { type: 'string', required: true },
                truncated: { type: 'boolean', required: true },
            },
        },
        elements: { type: 'array', items: elementSchema, required: true },
        screenshot: artifactSchema,
        permissions: {
            type: 'object', additionalProperties: false, required: true,
            properties: {
                accessibility: { type: 'string', enum: permissionStates, required: true },
                screenRecording: { type: 'string', enum: permissionStates, required: true },
            },
        },
    },
};
export const actionResultSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        action: {
            type: 'string',
            enum: ['click', 'set-value', 'type-text', 'press-key', 'scroll', 'drag', 'perform-action', 'wait'],
            required: true,
        },
        channel: {
            type: 'string',
            enum: ['accessibility', 'coordinates', 'keyboard', 'wait'],
            required: true,
        },
        activation: {
            type: 'string',
            enum: ['not-requested', 'already-frontmost', 'activated'],
            required: true,
        },
        pointerInput: { type: 'boolean', required: true },
        pointerRouting: { type: 'string', enum: ['none', 'target-process'], required: true },
        resolution: {
            type: 'object',
            additionalProperties: false,
            properties: {
                mode: { type: 'string', enum: ['exact-locator', 'native-identifier', 'semantic-rebind'], required: true },
                confidence: { type: 'number', required: true }, candidateCount: { type: 'integer', required: true },
                targetChanged: { type: 'boolean', required: true },
            },
        },
        agentCursor: {
            type: 'object',
            additionalProperties: false,
            properties: {
                visible: { type: 'boolean', const: false, required: true }, reason: { type: 'string' },
            },
        },
        effect: {
            type: 'object',
            additionalProperties: false, required: true,
            properties: {
                observedStateChanged: { type: 'boolean', required: true }, observedForMs: { type: 'integer', required: true },
                note: { type: 'string' },
            },
        },
        observation: { ...observationSchema, required: true },
    },
};
export const sensitiveParameters = {
    sensitive: {
        type: 'boolean',
        description: 'Set true for an action classified by the Skill as high impact or sensitive.',
    },
    confirmationToken: {
        type: 'string',
        description: 'One-use token from computer_confirm for this exact action.',
    },
};
export const keyNames = [
    'a', 's', 'd', 'f', 'h', 'g', 'z', 'x', 'c', 'v', 'b', 'q', 'w', 'e', 'r', 'y', 't', '1', '2', '3',
    '4', '6', '5', '=', '9', '7', '-', '8', '0', ']', 'o', 'u', '[', 'i', 'p', 'return', 'l', 'j', "'",
    'k', ';', '\\', ',', '/', 'n', 'm', '.', 'tab', 'space', 'delete', 'escape', 'home', 'pageup',
    'forwarddelete', 'end', 'pagedown', 'left', 'right', 'down', 'up',
];
const confirmationActionSchema = {
    oneOf: [
        {
            type: 'object',
            additionalProperties: false,
            properties: {
                kind: { type: 'string', const: 'click', required: true },
                observationId: { type: 'string', required: true },
                elementIndex: { type: 'integer' }, targetHandle: { type: 'string' }, allowRebind: { type: 'boolean' },
                x: { type: 'number' }, y: { type: 'number' },
                coordinateSpace: { type: 'string', enum: ['window', 'screen'] },
                button: { type: 'string', enum: ['left', 'right', 'middle'] },
                clickCount: { type: 'integer' },
                modifiers: { type: 'array', items: { type: 'string', enum: ['command', 'control', 'option', 'shift'] } },
                allowCoordinateFallback: { type: 'boolean' },
            },
        },
        {
            type: 'object',
            additionalProperties: false,
            properties: {
                kind: { type: 'string', const: 'set-value', required: true },
                observationId: { type: 'string', required: true },
                elementIndex: { type: 'integer' }, targetHandle: { type: 'string' }, allowRebind: { type: 'boolean' },
                value: { type: 'string', required: true },
            },
        },
        {
            type: 'object',
            additionalProperties: false,
            properties: {
                kind: { type: 'string', const: 'type-text', required: true },
                observationId: { type: 'string', required: true },
                text: { type: 'string', required: true },
            },
        },
        {
            type: 'object',
            additionalProperties: false,
            properties: {
                kind: { type: 'string', const: 'press-key', required: true },
                observationId: { type: 'string', required: true },
                key: { type: 'string', enum: keyNames, required: true },
                modifiers: { type: 'array', items: { type: 'string', enum: ['command', 'control', 'option', 'shift'] } },
            },
        },
        {
            type: 'object',
            additionalProperties: false,
            properties: {
                kind: { type: 'string', const: 'scroll', required: true },
                observationId: { type: 'string', required: true },
                elementIndex: { type: 'integer' }, targetHandle: { type: 'string' }, allowRebind: { type: 'boolean' },
                x: { type: 'number' }, y: { type: 'number' },
                coordinateSpace: { type: 'string', enum: ['window', 'screen'] },
                direction: { type: 'string', enum: ['up', 'down', 'left', 'right'], required: true },
                pages: { type: 'integer' },
            },
        },
        {
            type: 'object',
            additionalProperties: false,
            properties: {
                kind: { type: 'string', const: 'drag', required: true },
                observationId: { type: 'string', required: true },
                fromX: { type: 'number', required: true }, fromY: { type: 'number', required: true },
                toX: { type: 'number', required: true }, toY: { type: 'number', required: true },
                coordinateSpace: { type: 'string', enum: ['window', 'screen'] },
                modifiers: { type: 'array', items: { type: 'string', enum: ['command', 'control', 'option', 'shift'] } },
            },
        },
        {
            type: 'object',
            additionalProperties: false,
            properties: {
                kind: { type: 'string', const: 'perform-action', required: true },
                observationId: { type: 'string', required: true },
                elementIndex: { type: 'integer' }, targetHandle: { type: 'string' }, allowRebind: { type: 'boolean' },
                action: { type: 'string', required: true },
            },
        },
    ],
};
export function actionBase(args) {
    const confirmation = args.confirmationToken === undefined
        ? {}
        : { confirmationToken: ComputerConfirmationToken(args.confirmationToken) };
    return {
        observationId: ComputerObservationId(args.observationId),
        ...(args.sensitive === undefined ? {} : { sensitive: args.sensitive }),
        ...confirmation,
    };
}
export function elementTarget(args) {
    const handle = args.targetHandle === undefined ? {} : { targetHandle: ComputerTargetHandle(args.targetHandle) };
    return {
        ...(args.elementIndex === undefined ? {} : { elementIndex: args.elementIndex }),
        ...handle,
        ...(args.allowRebind === undefined ? {} : { allowRebind: args.allowRebind }),
    };
}
export { confirmationActionSchema };
//# sourceMappingURL=toolbelt.schema.js.map