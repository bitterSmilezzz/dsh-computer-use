/**
 * Binding native manifest: helper path resolution, packaged hash/version
 * verification, and the explicit source-build path.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { ResolvedComputerUseConfig } from '../tuning/tuning.schema.ts';
/** Exact helper paths and integrity data for one active generation. */
export interface PreparedNativeHelper {
    path: string;
    version: string;
    sha256: string;
}
/** Subprocess capability the manifest preparation needs. */
export interface NativeHelperSubprocessContext {
    readonly ctx: Context;
}
/** Absolute path of the packaged helper directory inside this installation. */
export declare function nativeRoot(): string;
/** Collect one bounded protocol stream, failing closed on lossy truncation. */
export declare function collected(reader: {
    readFrom(offset: number): {
        lossy: boolean;
        text: string;
    };
} | undefined): string;
/**
 * Verify platform, file type, packaged hash, and executable mode before use.
 *
 * The managed helper is located relative to this module, so the path segment
 * count is part of the build layout rather than free-form configuration.
 */
export declare function prepareNativeHelper(client: NativeHelperSubprocessContext & {
    readonly config: ResolvedComputerUseConfig;
    readonly managedRoot: string;
    readonly helperPath: string;
    prepared?: PreparedNativeHelper;
}, signal: AbortSignal): Promise<PreparedNativeHelper>;
/** Run the packaged native build for the managed helper and confirm it produced a file. */
export declare function buildManagedHelper(client: NativeHelperSubprocessContext & {
    readonly helperPath: string;
}, signal: AbortSignal): Promise<void>;
//# sourceMappingURL=binding.native-manifest.d.ts.map