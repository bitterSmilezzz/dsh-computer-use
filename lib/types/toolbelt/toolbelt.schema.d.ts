/**
 * Toolbelt schema: the model-visible argument and output shapes of every
 * Computer Use Tool, plus the argument readers that rebuild branded ids.
 *
 * These declarations are the published contract with the model and are never
 * widened for convenience — a shape change here changes what the model can send.
 */
import { ComputerConfirmationToken, ComputerObservationId, ComputerTargetHandle } from '../charter/charter.index.ts';
export declare const rectSchema: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
        readonly x: {
            readonly type: "number";
            readonly required: true;
        };
        readonly y: {
            readonly type: "number";
            readonly required: true;
        };
        readonly width: {
            readonly type: "number";
            readonly required: true;
        };
        readonly height: {
            readonly type: "number";
            readonly required: true;
        };
    };
};
export declare const appSelectorSchema: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
        readonly bundleId: {
            readonly type: "string";
            readonly description: "Preferred exact macOS bundle identifier.";
        };
        readonly pid: {
            readonly type: "integer";
            readonly description: "Exact current process id when already observed.";
        };
        readonly name: {
            readonly type: "string";
            readonly description: "Display name accepted only when it resolves uniquely.";
        };
    };
};
export declare const appSchema: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
        readonly bundleId: {
            readonly type: "string";
            readonly required: true;
        };
        readonly pid: {
            readonly type: "integer";
            readonly required: true;
        };
        readonly name: {
            readonly type: "string";
            readonly required: true;
        };
    };
};
export declare const artifactSchema: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
        readonly path: {
            readonly type: "string";
            readonly required: true;
        };
        readonly filename: {
            readonly type: "string";
            readonly required: true;
        };
        readonly mimeType: {
            readonly type: "string";
            readonly enum: readonly ["image/png"];
            readonly required: true;
        };
        readonly kind: {
            readonly type: "string";
            readonly enum: readonly ["image"];
            readonly required: true;
        };
        readonly description: {
            readonly type: "string";
            readonly required: true;
        };
        readonly sourceTool: {
            readonly type: "string";
            readonly enum: readonly ["computer_observe", "computer_action"];
            readonly required: true;
        };
        readonly previewIntent: {
            readonly type: "string";
            readonly enum: readonly ["image"];
            readonly required: true;
        };
        readonly bytes: {
            readonly type: "integer";
            readonly required: true;
        };
        readonly width: {
            readonly type: "integer";
            readonly required: true;
        };
        readonly height: {
            readonly type: "integer";
            readonly required: true;
        };
    };
};
export declare const observationSchema: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
        readonly observationId: {
            readonly type: "string";
            readonly required: true;
        };
        readonly app: {
            readonly required: true;
            readonly type: "object";
            readonly additionalProperties: false;
            readonly properties: {
                readonly bundleId: {
                    readonly type: "string";
                    readonly required: true;
                };
                readonly pid: {
                    readonly type: "integer";
                    readonly required: true;
                };
                readonly name: {
                    readonly type: "string";
                    readonly required: true;
                };
            };
        };
        readonly createdAt: {
            readonly type: "string";
            readonly required: true;
        };
        readonly expiresAt: {
            readonly type: "string";
            readonly required: true;
        };
        readonly frontmost: {
            readonly type: "boolean";
            readonly required: true;
        };
        readonly window: {
            readonly type: "object";
            readonly additionalProperties: false;
            readonly properties: {
                readonly title: {
                    readonly type: "string";
                };
                readonly frame: {
                    readonly required: true;
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly x: {
                            readonly type: "number";
                            readonly required: true;
                        };
                        readonly y: {
                            readonly type: "number";
                            readonly required: true;
                        };
                        readonly width: {
                            readonly type: "number";
                            readonly required: true;
                        };
                        readonly height: {
                            readonly type: "number";
                            readonly required: true;
                        };
                    };
                };
                readonly id: {
                    readonly type: "integer";
                };
            };
        };
        readonly tree: {
            readonly type: "object";
            readonly additionalProperties: false;
            readonly required: true;
            readonly properties: {
                readonly mode: {
                    readonly type: "string";
                    readonly enum: readonly ["full", "diff"];
                    readonly required: true;
                };
                readonly text: {
                    readonly type: "string";
                    readonly required: true;
                };
                readonly truncated: {
                    readonly type: "boolean";
                    readonly required: true;
                };
            };
        };
        readonly elements: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly properties: {
                    readonly index: {
                        readonly type: "integer";
                        readonly required: true;
                    };
                    readonly targetHandle: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly role: {
                        readonly type: "string";
                        readonly required: true;
                    };
                    readonly subrole: {
                        readonly type: "string";
                    };
                    readonly title: {
                        readonly type: "string";
                    };
                    readonly label: {
                        readonly type: "string";
                    };
                    readonly value: {
                        readonly type: "string";
                    };
                    readonly enabled: {
                        readonly type: "boolean";
                    };
                    readonly focused: {
                        readonly type: "boolean";
                    };
                    readonly selected: {
                        readonly type: "boolean";
                    };
                    readonly frame: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly x: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly y: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly width: {
                                readonly type: "number";
                                readonly required: true;
                            };
                            readonly height: {
                                readonly type: "number";
                                readonly required: true;
                            };
                        };
                    };
                    readonly actions: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                        readonly required: true;
                    };
                };
            };
            readonly required: true;
        };
        readonly screenshot: {
            readonly type: "object";
            readonly additionalProperties: false;
            readonly properties: {
                readonly path: {
                    readonly type: "string";
                    readonly required: true;
                };
                readonly filename: {
                    readonly type: "string";
                    readonly required: true;
                };
                readonly mimeType: {
                    readonly type: "string";
                    readonly enum: readonly ["image/png"];
                    readonly required: true;
                };
                readonly kind: {
                    readonly type: "string";
                    readonly enum: readonly ["image"];
                    readonly required: true;
                };
                readonly description: {
                    readonly type: "string";
                    readonly required: true;
                };
                readonly sourceTool: {
                    readonly type: "string";
                    readonly enum: readonly ["computer_observe", "computer_action"];
                    readonly required: true;
                };
                readonly previewIntent: {
                    readonly type: "string";
                    readonly enum: readonly ["image"];
                    readonly required: true;
                };
                readonly bytes: {
                    readonly type: "integer";
                    readonly required: true;
                };
                readonly width: {
                    readonly type: "integer";
                    readonly required: true;
                };
                readonly height: {
                    readonly type: "integer";
                    readonly required: true;
                };
            };
        };
        readonly permissions: {
            readonly type: "object";
            readonly additionalProperties: false;
            readonly required: true;
            readonly properties: {
                readonly accessibility: {
                    readonly type: "string";
                    readonly enum: readonly ["granted", "denied", "not-determined", "unavailable"];
                    readonly required: true;
                };
                readonly screenRecording: {
                    readonly type: "string";
                    readonly enum: readonly ["granted", "denied", "not-determined", "unavailable"];
                    readonly required: true;
                };
            };
        };
    };
};
export declare const actionResultSchema: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
        readonly action: {
            readonly type: "string";
            readonly enum: readonly ["click", "set-value", "type-text", "press-key", "scroll", "drag", "perform-action", "wait"];
            readonly required: true;
        };
        readonly channel: {
            readonly type: "string";
            readonly enum: readonly ["accessibility", "coordinates", "keyboard", "wait"];
            readonly required: true;
        };
        readonly activation: {
            readonly type: "string";
            readonly enum: readonly ["not-requested", "already-frontmost", "activated"];
            readonly required: true;
        };
        readonly pointerInput: {
            readonly type: "boolean";
            readonly required: true;
        };
        readonly pointerRouting: {
            readonly type: "string";
            readonly enum: readonly ["none", "target-process"];
            readonly required: true;
        };
        readonly resolution: {
            readonly type: "object";
            readonly additionalProperties: false;
            readonly properties: {
                readonly mode: {
                    readonly type: "string";
                    readonly enum: readonly ["exact-locator", "native-identifier", "semantic-rebind"];
                    readonly required: true;
                };
                readonly confidence: {
                    readonly type: "number";
                    readonly required: true;
                };
                readonly candidateCount: {
                    readonly type: "integer";
                    readonly required: true;
                };
                readonly targetChanged: {
                    readonly type: "boolean";
                    readonly required: true;
                };
            };
        };
        readonly agentCursor: {
            readonly type: "object";
            readonly additionalProperties: false;
            readonly properties: {
                readonly visible: {
                    readonly type: "boolean";
                    readonly const: false;
                    readonly required: true;
                };
                readonly reason: {
                    readonly type: "string";
                };
            };
        };
        readonly effect: {
            readonly type: "object";
            readonly additionalProperties: false;
            readonly required: true;
            readonly properties: {
                readonly observedStateChanged: {
                    readonly type: "boolean";
                    readonly required: true;
                };
                readonly observedForMs: {
                    readonly type: "integer";
                    readonly required: true;
                };
                readonly note: {
                    readonly type: "string";
                };
            };
        };
        readonly observation: {
            readonly required: true;
            readonly type: "object";
            readonly additionalProperties: false;
            readonly properties: {
                readonly observationId: {
                    readonly type: "string";
                    readonly required: true;
                };
                readonly app: {
                    readonly required: true;
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly bundleId: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly pid: {
                            readonly type: "integer";
                            readonly required: true;
                        };
                        readonly name: {
                            readonly type: "string";
                            readonly required: true;
                        };
                    };
                };
                readonly createdAt: {
                    readonly type: "string";
                    readonly required: true;
                };
                readonly expiresAt: {
                    readonly type: "string";
                    readonly required: true;
                };
                readonly frontmost: {
                    readonly type: "boolean";
                    readonly required: true;
                };
                readonly window: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly title: {
                            readonly type: "string";
                        };
                        readonly frame: {
                            readonly required: true;
                            readonly type: "object";
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly x: {
                                    readonly type: "number";
                                    readonly required: true;
                                };
                                readonly y: {
                                    readonly type: "number";
                                    readonly required: true;
                                };
                                readonly width: {
                                    readonly type: "number";
                                    readonly required: true;
                                };
                                readonly height: {
                                    readonly type: "number";
                                    readonly required: true;
                                };
                            };
                        };
                        readonly id: {
                            readonly type: "integer";
                        };
                    };
                };
                readonly tree: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly required: true;
                    readonly properties: {
                        readonly mode: {
                            readonly type: "string";
                            readonly enum: readonly ["full", "diff"];
                            readonly required: true;
                        };
                        readonly text: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly truncated: {
                            readonly type: "boolean";
                            readonly required: true;
                        };
                    };
                };
                readonly elements: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly index: {
                                readonly type: "integer";
                                readonly required: true;
                            };
                            readonly targetHandle: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly role: {
                                readonly type: "string";
                                readonly required: true;
                            };
                            readonly subrole: {
                                readonly type: "string";
                            };
                            readonly title: {
                                readonly type: "string";
                            };
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly value: {
                                readonly type: "string";
                            };
                            readonly enabled: {
                                readonly type: "boolean";
                            };
                            readonly focused: {
                                readonly type: "boolean";
                            };
                            readonly selected: {
                                readonly type: "boolean";
                            };
                            readonly frame: {
                                readonly type: "object";
                                readonly additionalProperties: false;
                                readonly properties: {
                                    readonly x: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly y: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly width: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                    readonly height: {
                                        readonly type: "number";
                                        readonly required: true;
                                    };
                                };
                            };
                            readonly actions: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                };
                                readonly required: true;
                            };
                        };
                    };
                    readonly required: true;
                };
                readonly screenshot: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly path: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly filename: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly mimeType: {
                            readonly type: "string";
                            readonly enum: readonly ["image/png"];
                            readonly required: true;
                        };
                        readonly kind: {
                            readonly type: "string";
                            readonly enum: readonly ["image"];
                            readonly required: true;
                        };
                        readonly description: {
                            readonly type: "string";
                            readonly required: true;
                        };
                        readonly sourceTool: {
                            readonly type: "string";
                            readonly enum: readonly ["computer_observe", "computer_action"];
                            readonly required: true;
                        };
                        readonly previewIntent: {
                            readonly type: "string";
                            readonly enum: readonly ["image"];
                            readonly required: true;
                        };
                        readonly bytes: {
                            readonly type: "integer";
                            readonly required: true;
                        };
                        readonly width: {
                            readonly type: "integer";
                            readonly required: true;
                        };
                        readonly height: {
                            readonly type: "integer";
                            readonly required: true;
                        };
                    };
                };
                readonly permissions: {
                    readonly type: "object";
                    readonly additionalProperties: false;
                    readonly required: true;
                    readonly properties: {
                        readonly accessibility: {
                            readonly type: "string";
                            readonly enum: readonly ["granted", "denied", "not-determined", "unavailable"];
                            readonly required: true;
                        };
                        readonly screenRecording: {
                            readonly type: "string";
                            readonly enum: readonly ["granted", "denied", "not-determined", "unavailable"];
                            readonly required: true;
                        };
                    };
                };
            };
        };
    };
};
export declare const sensitiveParameters: {
    readonly sensitive: {
        readonly type: "boolean";
        readonly description: "Set true for an action classified by the Skill as high impact or sensitive.";
    };
    readonly confirmationToken: {
        readonly type: "string";
        readonly description: "One-use token from computer_confirm for this exact action.";
    };
};
export declare const keyNames: readonly ["a", "s", "d", "f", "h", "g", "z", "x", "c", "v", "b", "q", "w", "e", "r", "y", "t", "1", "2", "3", "4", "6", "5", "=", "9", "7", "-", "8", "0", "]", "o", "u", "[", "i", "p", "return", "l", "j", "'", "k", ";", "\\", ",", "/", "n", "m", ".", "tab", "space", "delete", "escape", "home", "pageup", "forwarddelete", "end", "pagedown", "left", "right", "down", "up"];
declare const confirmationActionSchema: {
    readonly oneOf: readonly [{
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "click";
                readonly required: true;
            };
            readonly observationId: {
                readonly type: "string";
                readonly required: true;
            };
            readonly elementIndex: {
                readonly type: "integer";
            };
            readonly targetHandle: {
                readonly type: "string";
            };
            readonly allowRebind: {
                readonly type: "boolean";
            };
            readonly x: {
                readonly type: "number";
            };
            readonly y: {
                readonly type: "number";
            };
            readonly coordinateSpace: {
                readonly type: "string";
                readonly enum: readonly ["window", "screen"];
            };
            readonly button: {
                readonly type: "string";
                readonly enum: readonly ["left", "right", "middle"];
            };
            readonly clickCount: {
                readonly type: "integer";
            };
            readonly modifiers: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                    readonly enum: readonly ["command", "control", "option", "shift"];
                };
            };
            readonly allowCoordinateFallback: {
                readonly type: "boolean";
            };
        };
    }, {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "set-value";
                readonly required: true;
            };
            readonly observationId: {
                readonly type: "string";
                readonly required: true;
            };
            readonly elementIndex: {
                readonly type: "integer";
            };
            readonly targetHandle: {
                readonly type: "string";
            };
            readonly allowRebind: {
                readonly type: "boolean";
            };
            readonly value: {
                readonly type: "string";
                readonly required: true;
            };
        };
    }, {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "type-text";
                readonly required: true;
            };
            readonly observationId: {
                readonly type: "string";
                readonly required: true;
            };
            readonly text: {
                readonly type: "string";
                readonly required: true;
            };
        };
    }, {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "press-key";
                readonly required: true;
            };
            readonly observationId: {
                readonly type: "string";
                readonly required: true;
            };
            readonly key: {
                readonly type: "string";
                readonly enum: readonly ["a", "s", "d", "f", "h", "g", "z", "x", "c", "v", "b", "q", "w", "e", "r", "y", "t", "1", "2", "3", "4", "6", "5", "=", "9", "7", "-", "8", "0", "]", "o", "u", "[", "i", "p", "return", "l", "j", "'", "k", ";", "\\", ",", "/", "n", "m", ".", "tab", "space", "delete", "escape", "home", "pageup", "forwarddelete", "end", "pagedown", "left", "right", "down", "up"];
                readonly required: true;
            };
            readonly modifiers: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                    readonly enum: readonly ["command", "control", "option", "shift"];
                };
            };
        };
    }, {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "scroll";
                readonly required: true;
            };
            readonly observationId: {
                readonly type: "string";
                readonly required: true;
            };
            readonly elementIndex: {
                readonly type: "integer";
            };
            readonly targetHandle: {
                readonly type: "string";
            };
            readonly allowRebind: {
                readonly type: "boolean";
            };
            readonly x: {
                readonly type: "number";
            };
            readonly y: {
                readonly type: "number";
            };
            readonly coordinateSpace: {
                readonly type: "string";
                readonly enum: readonly ["window", "screen"];
            };
            readonly direction: {
                readonly type: "string";
                readonly enum: readonly ["up", "down", "left", "right"];
                readonly required: true;
            };
            readonly pages: {
                readonly type: "integer";
            };
        };
    }, {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "drag";
                readonly required: true;
            };
            readonly observationId: {
                readonly type: "string";
                readonly required: true;
            };
            readonly fromX: {
                readonly type: "number";
                readonly required: true;
            };
            readonly fromY: {
                readonly type: "number";
                readonly required: true;
            };
            readonly toX: {
                readonly type: "number";
                readonly required: true;
            };
            readonly toY: {
                readonly type: "number";
                readonly required: true;
            };
            readonly coordinateSpace: {
                readonly type: "string";
                readonly enum: readonly ["window", "screen"];
            };
            readonly modifiers: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                    readonly enum: readonly ["command", "control", "option", "shift"];
                };
            };
        };
    }, {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly type: "string";
                readonly const: "perform-action";
                readonly required: true;
            };
            readonly observationId: {
                readonly type: "string";
                readonly required: true;
            };
            readonly elementIndex: {
                readonly type: "integer";
            };
            readonly targetHandle: {
                readonly type: "string";
            };
            readonly allowRebind: {
                readonly type: "boolean";
            };
            readonly action: {
                readonly type: "string";
                readonly required: true;
            };
        };
    }];
};
export declare function actionBase(args: {
    observationId: string;
    sensitive?: boolean;
    confirmationToken?: string;
}): {
    confirmationToken?: never;
    sensitive?: boolean;
    observationId: ComputerObservationId;
} | {
    confirmationToken: ComputerConfirmationToken;
    sensitive?: boolean;
    observationId: ComputerObservationId;
};
export declare function elementTarget(args: {
    elementIndex?: number;
    targetHandle?: string;
    allowRebind?: boolean;
}): {
    allowRebind?: boolean;
    targetHandle?: never;
    elementIndex?: number;
} | {
    allowRebind?: boolean;
    targetHandle: ComputerTargetHandle;
    elementIndex?: number;
};
export { confirmationActionSchema };
//# sourceMappingURL=toolbelt.schema.d.ts.map