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

import { ComputerUseError } from '../charter/charter.fault.ts'
import type {
  ComputerUseConfig,
  ResolvedComputerUseBudget,
  ResolvedComputerUseConfig,
  ResolvedComputerUseInteraction,
  ResolvedComputerUseLimits,
} from './tuning.schema.ts'

type Resolved = ResolvedComputerUseConfig
type Workspace = Pick<Resolved, 'artifactRoot' | 'helper'>
type Access = Pick<Resolved, 'allowAllApps' | 'grants'>

/** Refuse one settings value with the published provider-failure tag. */
function refuse(message: string): never {
  throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', message)
}

/** One settings number as an integer inside an inclusive envelope. */
function boundedInteger(field: string, value: number, min: number, max: number): number {
  if (Number.isInteger(value) && value >= min && value <= max) return value
  return refuse(`${field} must be an integer between ${min} and ${max}`)
}

/** One settings string drawn from a closed vocabulary. */
function boundedOption<T extends string>(field: string, value: string, allowed: readonly T[]): T {
  if (allowed.includes(value as T)) return value as T
  return refuse(`${field} must be one of ${allowed.join(', ')}`)
}

/**
 * How long provider evidence and confirmation tokens stay usable, and how long
 * one action may take before it is given up on.
 *
 * `observationTtlMs` is the one field whose documented `0` is not a duration:
 * it turns expiry off. Every other value goes through the usual envelope.
 */
function resolveTiming(config: ComputerUseConfig): Pick<ResolvedComputerUseBudget, 'observationTtlMs' | 'confirmationTtlMs' | 'actionTimeoutMs'> {
  const requestedObservationTtl = config.observationTtlMs ?? 0
  return {
    observationTtlMs: requestedObservationTtl === 0
      ? 0
      : boundedInteger('observationTtlMs', requestedObservationTtl, 1_000, 86_400_000),
    confirmationTtlMs: boundedInteger('confirmationTtlMs', config.confirmationTtlMs ?? 300_000, 1_000, 900_000),
    actionTimeoutMs: boundedInteger('actionTimeoutMs', config.actionTimeoutMs ?? 15_000, 1_000, 120_000),
  }
}

/**
 * The post-action settle budget.
 *
 * `maxWaitMs` is a budget of its own — it caps one `computer_wait` timeout, not
 * the settle loop — but it may never sit below the settle ceiling: a call that
 * omits `timeoutMs` falls back to `maxSettleMs`, so a lower wait ceiling would
 * make that documented default impossible and reject a settings document that
 * only raises `maxSettleMs`. The wait ceiling is therefore raised to meet the
 * settle ceiling instead of being refused.
 */
function resolveSettlement(config: ComputerUseConfig): Pick<ResolvedComputerUseBudget, 'settleMs' | 'maxSettleMs' | 'maxWaitMs'> {
  const settleMs = boundedInteger('settleMs', config.settleMs ?? 250, 0, 10_000)
  const maxSettleMs = boundedInteger('maxSettleMs', config.maxSettleMs ?? 5_000, 100, 60_000)
  if (settleMs > maxSettleMs) refuse('settleMs must be no greater than maxSettleMs')
  const maxWaitMs = Math.max(
    boundedInteger('maxWaitMs', config.maxWaitMs ?? 30_000, 100, 600_000),
    maxSettleMs,
  )
  return { settleMs, maxSettleMs, maxWaitMs }
}

/** How much of one provider tree is read before the observation counts as truncated. */
function resolveObservationLimits(config: ComputerUseConfig): ResolvedComputerUseLimits {
  return {
    maxNodes: boundedInteger('maxNodes', config.maxNodes ?? 500, 10, 5_000),
    maxDepth: boundedInteger('maxDepth', config.maxDepth ?? 14, 1, 64),
    maxTextBytes: boundedInteger('maxTextBytes', config.maxTextBytes ?? 64_000, 1_024, 1_048_576),
    maxScreenshotBytes: boundedInteger('maxScreenshotBytes', config.maxScreenshotBytes ?? 33_554_432, 1_024, 268_435_456),
  }
}

/**
 * Where generated files land and which helper binary is used.
 *
 * The artifact root is always workspace-relative: an absolute path would let one
 * settings document write anywhere the host process can, and a `..` segment
 * would escape the workspace the same way.
 */
function resolveWorkspace(config: ComputerUseConfig): Workspace {
  const artifactRoot = (config.artifactRoot ?? '.dsh-computer-use/artifacts').trim()
  if (artifactRoot.length === 0 || artifactRoot.startsWith('/') || artifactRoot.split(/[\\/]+/u).includes('..')) {
    refuse('artifactRoot must be a non-empty workspace-relative path without ..')
  }
  const helperPath = config.helper?.path?.trim()
  if (helperPath !== undefined && helperPath.length === 0) refuse('helper.path must not be empty')
  return {
    artifactRoot,
    helper: {
      ...(helperPath === undefined ? {} : { path: helperPath }),
      allowSourceBuild: config.helper?.allowSourceBuild ?? false,
    },
  }
}

/**
 * Foreground, keyboard, pointer, and Agent cursor policy.
 *
 * The deprecated `cursorMotionMs` is checked but never carried into the result:
 * it is accepted so an existing 0.2.x document still loads, and cursor travel is
 * driven by the speed and acceleration fields instead.
 */
function resolveInteraction(config: ComputerUseConfig): ResolvedComputerUseInteraction {
  const source = config.interaction
  const focusPolicy = boundedOption('interaction.focusPolicy', source?.focusPolicy ?? 'preserve', ['preserve', 'activate'] as const)
  const keyboardPolicy = boundedOption('interaction.keyboardPolicy', source?.keyboardPolicy ?? 'preserve', ['preserve', 'activate'] as const)
  const pointerInputPolicy = boundedOption('interaction.pointerInputPolicy', source?.pointerInputPolicy ?? 'targeted', ['deny', 'targeted'] as const)
  const cursorVisualization = boundedOption('interaction.cursorVisualization', source?.cursorVisualization ?? 'visible', ['hidden', 'visible'] as const)
  const legacyMotion = source?.cursorMotionMs
  if (legacyMotion !== undefined) boundedInteger('interaction.cursorMotionMs', legacyMotion, 0, 2_000)
  return {
    focusPolicy,
    keyboardPolicy,
    pointerInputPolicy,
    cursorVisualization,
    cursorSpeedPxPerSecond: boundedInteger('interaction.cursorSpeedPxPerSecond', source?.cursorSpeedPxPerSecond ?? 1_600, 100, 50_000),
    cursorAccelerationPxPerSecondSquared: boundedInteger('interaction.cursorAccelerationPxPerSecondSquared', source?.cursorAccelerationPxPerSecondSquared ?? 6_000, 100, 500_000),
    cursorClickDelayMs: boundedInteger('interaction.cursorClickDelayMs', source?.cursorClickDelayMs ?? 90, 0, 1_000),
    cursorAutoHideMs: boundedInteger('interaction.cursorAutoHideMs', source?.cursorAutoHideMs ?? 0, 0, 30_000),
  }
}

/**
 * Which applications may be read and controlled.
 *
 * A grant names exactly one application — the `*` wildcard is rejected on
 * purpose, since "every app" is what `allowAllApps` expresses. Control implies
 * read: an application that may be driven by input is necessarily readable.
 */
function resolveAppAccess(config: ComputerUseConfig): Access {
  const named = new Set<string>()
  const grants: Resolved['grants'][number][] = []
  for (const requested of config.grants ?? []) {
    const bundleId = requested.bundleId.trim()
    if (bundleId.length === 0 || bundleId.includes('*')) {
      refuse('grants[].bundleId must be one exact non-wildcard bundle id')
    }
    if (named.has(bundleId)) refuse(`duplicate app grant for ${bundleId}`)
    named.add(bundleId)
    const control = requested.control ?? false
    grants.push({ bundleId, read: (requested.read ?? false) || control, control })
  }
  return { allowAllApps: config.allowAllApps ?? false, grants }
}

/** Validate and normalize one raw config object. */
export function resolveConfig(config: ComputerUseConfig = {}): ResolvedComputerUseConfig {
  return {
    ...resolveTiming(config),
    ...resolveSettlement(config),
    ...resolveObservationLimits(config),
    ...resolveWorkspace(config),
    interaction: resolveInteraction(config),
    ...resolveAppAccess(config),
  }
}
