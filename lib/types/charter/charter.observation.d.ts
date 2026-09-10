/** Charter of observation: model-addressable elements, projections, screenshot artifacts, and observe requests. */
import type { ComputerAppIdentity, ComputerAppSelector, ComputerObservationId, ComputerPermissionState, ComputerRect, ComputerTargetHandle } from './charter.identity.ts';
/** One model-addressable element. Its index and opaque handle belong only to the enclosing observation. */
export interface ComputerElement {
    targetHandle: ComputerTargetHandle;
    index: number;
    role: string;
    subrole?: string;
    label?: string;
    title?: string;
    value?: string;
    frame?: ComputerRect;
    actions: string[];
    enabled?: boolean;
    focused?: boolean;
    selected?: boolean;
}
/** Deterministic route the resolver walks immediately before input. */
export type ComputerTargetResolutionMode = 'exact-locator' | 'native-identifier' | 'semantic-rebind';
/** Evidence, visible to the model, of how an element target was resolved. */
export interface ComputerTargetResolutionResult {
    mode: ComputerTargetResolutionMode;
    candidateCount: number;
    confidence: number;
    targetChanged: boolean;
}
/** File artifact emitted by a Computer Use observation. */
export interface ComputerArtifact {
    kind: 'image';
    mimeType: 'image/png';
    path: string;
    filename: string;
    description: string;
    sourceTool: 'computer_observe' | 'computer_action';
    previewIntent: 'image';
    bytes: number;
    width: number;
    height: number;
}
/** Bounded Accessibility tree projection carried by one observation. */
export interface ComputerObservationTree {
    mode: 'full' | 'diff';
    text: string;
    truncated: boolean;
}
/** The observed window, when the provider could identify one. */
export interface ComputerObservationWindow {
    frame: ComputerRect;
    title?: string;
    id?: number;
}
/** Permission state folded into one observation. */
export interface ComputerObservationPermissions {
    screenRecording: ComputerPermissionState;
    accessibility: ComputerPermissionState;
}
/** Complete model-visible observation. */
export interface ComputerObservation {
    observationId: ComputerObservationId;
    app: ComputerAppIdentity;
    /** When the observation was taken. */
    createdAt: string;
    /** After this instant the observation must not be used as input evidence. */
    expiresAt: string;
    frontmost: boolean;
    /** Absent when the provider could not identify a window. */
    window?: ComputerObservationWindow;
    tree: ComputerObservationTree;
    elements: ComputerElement[];
    /** Absent in `none` mode or when best-effort capture found nothing. */
    screenshot?: ComputerArtifact;
    permissions: ComputerObservationPermissions;
}
/** Whether screenshot capture is omitted, best-effort, or required. */
export type ComputerScreenshotMode = 'none' | 'optional' | 'required';
/** Request for a fresh observation. */
export interface ComputerObserveRequest {
    app: ComputerAppSelector;
    full?: boolean;
    screenshot?: ComputerScreenshotMode;
}
//# sourceMappingURL=charter.observation.d.ts.map