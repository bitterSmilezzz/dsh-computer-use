/** Conductor health: the last provider health facts and their public projection. */

import type { BackendHealth } from '../binding/binding.port.ts'
import type { ComputerUseStatus } from '../charter/charter.index.ts'

/** Health facts as this service keeps them, without the identity fields `status()` adds. */
export type HealthSnapshot = Omit<ComputerUseStatus, 'platform' | 'provider' | 'generation' | 'helperPath'>

/** The unpublished default: nothing is ready until the provider says so. */
export const UNAVAILABLE_HEALTH: HealthSnapshot = {
  ready: false,
  accessibility: 'unavailable',
  screenRecording: 'unavailable',
}

/** Persist backend health facts while allowing a disabled provider to stay ready=false with a visible reason. */
export function applyHealth(health: BackendHealth): HealthSnapshot {
  return {
    ready: health.ready ?? true,
    helperVersion: health.helperVersion,
    helperSha256: health.helperSha256,
    accessibility: health.accessibility,
    screenRecording: health.screenRecording,
    ...(health.error === undefined ? {} : { lastError: health.error }),
  }
}

/** Health state for a provider generation that never answered. */
export function unavailableHealth(message: string): HealthSnapshot {
  return { ...UNAVAILABLE_HEALTH, lastError: message }
}

/** Keep the last known facts, but mark the provider not ready and show why. */
export function degradedHealth(current: HealthSnapshot, message: string): HealthSnapshot {
  return { ...current, ready: false, lastError: message }
}

/** Identity of the live generation plus the health facts it last reported. */
export interface StatusHost {
  platform: ComputerUseStatus['platform']
  provider: ComputerUseStatus['provider']
  generation: number
  helperPath: string
  health: HealthSnapshot
}

/** Current provider and permission diagnostics. */
export function describeStatus(host: StatusHost): ComputerUseStatus {
  return {
    platform: host.platform,
    provider: host.provider,
    generation: host.generation,
    helperPath: host.helperPath,
    ...host.health,
  }
}
