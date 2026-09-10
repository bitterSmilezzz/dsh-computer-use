/**
 * Client controller — the settings endpoint the section reads and writes, plus
 * the minimal external store React subscribes to.
 *
 * One document, one action slot: every mutation is a POST that returns the new
 * snapshot, so the section never has to merge state by hand. Both requests read
 * the same envelope, which is why the unwrapping lives in a module-level helper
 * instead of being repeated per call site.
 */
import type { ConfigValue } from './state.draft.ts';
export declare const NS = "computer-use";
export declare const ROUTE = "/_dsh/computer-use/settings";
/** Actions the endpoint accepts. */
type ActionName = 'save' | 'health' | 'open-settings';
/** In-flight marker kept in state; opening the system pane shows up as `open`. */
type ActionMark = 'save' | 'health' | 'open';
/** Host-side status the section renders; alphabetical inside each level. */
export interface Snapshot {
    provider: {
        accessibility: string;
        generation: number;
        helperPath: string;
        helperSha256?: string;
        helperVersion?: string;
        lastError?: string;
        platform: string;
        provider: string;
        ready: boolean;
        screenRecording: string;
    };
    schemaVersion: 1;
    settings: {
        value: ConfigValue;
        revision: number;
        applies: 'live';
    };
    writable: boolean;
}
export interface ControllerState {
    action?: ActionMark;
    error?: string;
    notice?: string;
    snapshot?: Snapshot;
    status: 'idle' | 'loading' | 'ready' | 'error';
}
/** Loads the document, runs one action at a time, and re-reads on external change. */
export declare class ComputerUseSettingsController {
    private current;
    private readonly listeners;
    readonly subscribe: (listener: () => void) => (() => void);
    readonly snapshot: () => ControllerState;
    private commit;
    /** Re-read the document; a load keeps the previous snapshot on screen while it runs. */
    load(): Promise<void>;
    /**
     * Run one action and adopt the snapshot it returns.
     *
     * A failed action leaves the document on screen — the user's edits stay
     * visible — and only reports the failure, so a rejected save never blanks the
     * form it just refused.
     */
    action(action: ActionName, payload: Record<string, unknown>, marker: ActionMark): Promise<void>;
    /** Re-read only when a document is already on screen; before that the mount effect loads it. */
    refreshIfLoaded(): void;
}
export {};
//# sourceMappingURL=state.controller.d.ts.map