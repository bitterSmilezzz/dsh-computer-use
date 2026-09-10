/**
 * Browser entry — mounts the Computer Use settings section into the DSH
 * Settings page.
 *
 * The client loader reads `inject` to know which client services must exist
 * before the factory runs, then calls `apply`; everything registered here is
 * torn down again when the plugin unloads.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
export { integerInRange } from './guard.bounds.ts';
/** Client services this plugin depends on. */
export declare const inject: string[];
/** Register the Computer Use Settings section. */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map