/**
 * Tuning normalization: turns a partial Settings document into the bounded,
 * fully-defaulted configuration the host half runs on.
 *
 * The work is grouped by concern rather than by field. Each resolver below owns
 * one cluster of settings — timing, the settle/wait budget, observation limits,
 * the artifact workspace, interaction policy, app access — checks that cluster's
 * envelope and hands back already-validated values. `resolveConfig` only orders
 * those clusters, which is what keeps two guarantees stable no matter how a
 * cluster is rearranged internally:
 *
 * - a document whose fields are invalid in several places is still refused for
 *   the same field first, because the clusters run in document order; and
 * - nothing reaches the runtime half unpinned, because every value is checked
 *   before it is placed in the result.
 */
import type { ComputerUseConfig, ResolvedComputerUseConfig } from './tuning.schema.ts';
/** Validate and normalize one raw config object. */
export declare function resolveConfig(config?: ComputerUseConfig): ResolvedComputerUseConfig;
//# sourceMappingURL=tuning.normalize.d.ts.map