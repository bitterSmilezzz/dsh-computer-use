/** Validated provider, observation, settlement, artifact, and app-policy configuration. */
import type Schema from '@deepseek-ai/schemastery';
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings';
/**
 * Settings document namespace owned by this package.
 *
 * Declared as a literal branded at the type level only: `settingsNamespace()`
 * was removed from `@deepseek-ai/dsh-settings` in DSH 0.1.2-alpha.2
 * (`f4e49ccf8f`, "move shared values behind service APIs"), where the runtime
 * brand became an internal `parseSettingsNamespace`. `ctx.settings.register`
 * still validates the string at runtime, and the generic narrows the literal.
 */
export declare const COMPUTER_USE_SETTINGS_NAMESPACE: SettingsNamespace;
/** One persisted application grant. Wildcards are intentionally unsupported. */
export interface ComputerUseAppGrant {
    bundleId: string;
    read?: boolean;
    control?: boolean;
}
/** Host-owned policy for foreground activation, keyboard routing, target-process input, and the visible Agent cursor. */
export interface ComputerUseInteractionConfig {
    focusPolicy?: 'preserve' | 'activate';
    keyboardPolicy?: 'preserve' | 'activate';
    pointerInputPolicy?: 'deny' | 'targeted';
    cursorVisualization?: 'hidden' | 'visible';
    /** @deprecated Accepted for 0.2.x settings compatibility; physical motion replaces fixed duration. */
    cursorMotionMs?: number;
    cursorSpeedPxPerSecond?: number;
    cursorAccelerationPxPerSecondSquared?: number;
    cursorClickDelayMs?: number;
    cursorAutoHideMs?: number;
}
/** User-facing configuration; schema defaults are repeated by {@link resolveConfig}. `observationTtlMs: 0` disables observation expiry. */
export interface ComputerUseConfig {
    observationTtlMs?: number;
    confirmationTtlMs?: number;
    actionTimeoutMs?: number;
    settleMs?: number;
    maxSettleMs?: number;
    /** Upper bound for one computer_wait `timeoutMs`. Independent of the post-action settle budget. */
    maxWaitMs?: number;
    maxNodes?: number;
    maxDepth?: number;
    maxTextBytes?: number;
    maxScreenshotBytes?: number;
    artifactRoot?: string;
    helper?: {
        path?: string;
        allowSourceBuild?: boolean;
    };
    interaction?: ComputerUseInteractionConfig;
    allowAllApps?: boolean;
    grants?: ComputerUseAppGrant[];
}
/** Configuration schema used by Cordis and the Settings provider. */
export declare const Config: Schema<ComputerUseConfig>;
/** Fully defaulted configuration consumed at runtime. */
export interface ResolvedComputerUseConfig {
    observationTtlMs: number;
    confirmationTtlMs: number;
    actionTimeoutMs: number;
    settleMs: number;
    maxSettleMs: number;
    maxWaitMs: number;
    maxNodes: number;
    maxDepth: number;
    maxTextBytes: number;
    maxScreenshotBytes: number;
    artifactRoot: string;
    helper: {
        path?: string;
        allowSourceBuild: boolean;
    };
    interaction: {
        focusPolicy: 'preserve' | 'activate';
        keyboardPolicy: 'preserve' | 'activate';
        pointerInputPolicy: 'deny' | 'targeted';
        cursorVisualization: 'hidden' | 'visible';
        cursorSpeedPxPerSecond: number;
        cursorAccelerationPxPerSecondSquared: number;
        cursorClickDelayMs: number;
        cursorAutoHideMs: number;
    };
    allowAllApps: boolean;
    grants: Array<{
        bundleId: string;
        read: boolean;
        control: boolean;
    }>;
}
/** Validate and normalize one raw config object. */
export declare function resolveConfig(config?: ComputerUseConfig): ResolvedComputerUseConfig;
//# sourceMappingURL=config.d.ts.map