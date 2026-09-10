/** Conductor health: the last provider health facts and their public projection. */
import type { BackendHealth } from '../binding/binding.port.ts';
import type { ComputerUseStatus } from '../charter/charter.index.ts';
/** Health facts as this service keeps them, without the identity fields `status()` adds. */
export type HealthSnapshot = Omit<ComputerUseStatus, 'platform' | 'provider' | 'generation' | 'helperPath'>;
/** The unpublished default: nothing is ready until the provider says so. */
export declare const UNAVAILABLE_HEALTH: HealthSnapshot;
/** Persist backend health facts while allowing a disabled provider to stay ready=false with a visible reason. */
export declare function applyHealth(health: BackendHealth): HealthSnapshot;
/** Health state for a provider generation that never answered. */
export declare function unavailableHealth(message: string): HealthSnapshot;
/** Keep the last known facts, but mark the provider not ready and show why. */
export declare function degradedHealth(current: HealthSnapshot, message: string): HealthSnapshot;
/** Identity of the live generation plus the health facts it last reported. */
export interface StatusHost {
    platform: ComputerUseStatus['platform'];
    provider: ComputerUseStatus['provider'];
    generation: number;
    helperPath: string;
    health: HealthSnapshot;
}
/** Current provider and permission diagnostics. */
export declare function describeStatus(host: StatusHost): ComputerUseStatus;
//# sourceMappingURL=conductor.health.d.ts.map