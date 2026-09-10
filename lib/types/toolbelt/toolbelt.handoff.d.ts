/**
 * Toolbelt handoff: what a Tool returns to the model, how a Tool call is bound
 * to one Agent Session, and how visual evidence is handed to the Vision Toolkit.
 */
import { type ContentBlock } from '@deepseek-ai/dsh-llm';
import type { JsonValue } from '@deepseek-ai/dsh-util-values';
import type { ToolRunContext } from '@deepseek-ai/dsh-tools';
import type { ComputerArtifact, ComputerUseContext } from '../charter/charter.index.ts';
export declare function renderJson(_args: unknown, value: unknown): ContentBlock[];
export declare function contextOf(exec: ToolRunContext): ComputerUseContext;
export declare function deferVisionHandoff(exec: ToolRunContext, artifact: ComputerArtifact | undefined): void;
export declare function artifactPresentation(artifact: ComputerArtifact): JsonValue;
export declare function actionOutput(): {
    schema: {
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
    render: typeof renderJson;
    presentationMeta: (_args: unknown, value: {
        observation: {
            screenshot?: ComputerArtifact;
        };
    }) => JsonValue;
};
//# sourceMappingURL=toolbelt.handoff.d.ts.map