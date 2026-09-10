/** Charter of identity: opaque brand constructors, geometry, permission state, and application identity. */
import type { Branded } from '@deepseek-ai/dsh-brand';
/** Opaque identifier for one immutable observed UI state. */
export type ComputerObservationId = Branded<'ComputerObservationId'>;
/** Mint an observation id from a generated string. */
export declare const ComputerObservationId: (value: string) => ComputerObservationId;
/** Opaque reference to one element descriptor captured inside an observation. */
export type ComputerTargetHandle = Branded<'ComputerTargetHandle'>;
/** Mint a target handle from a generated string. */
export declare const ComputerTargetHandle: (value: string) => ComputerTargetHandle;
/** Opaque grant, usable once, for one confirmed sensitive action. */
export type ComputerConfirmationToken = Branded<'ComputerConfirmationToken'>;
/** Mint a confirmation token from a generated string. */
export declare const ComputerConfirmationToken: (value: string) => ComputerConfirmationToken;
/**
 * Rectangle in screen-global point coordinates. A containing type may restate
 * the space it is measured in.
 */
export interface ComputerRect {
    width: number;
    height: number;
    y: number;
    x: number;
}
/** macOS permission state exactly as reported; nothing here requests a grant. */
export type ComputerPermissionState = 'granted' | 'denied' | 'not-determined' | 'unavailable';
/** Identity of one running user-facing application, stable for its lifetime. */
export interface ComputerAppIdentity {
    pid: number;
    name: string;
    bundleId: string;
}
/** Selector a model or caller uses to name the target application. */
export interface ComputerAppSelector {
    name?: string;
    bundleId?: string;
    pid?: number;
}
/** One bounded application row as returned by discovery. */
export interface ComputerAppSummary extends ComputerAppIdentity {
    screenRecording: ComputerPermissionState;
    accessibility: ComputerPermissionState;
    frontmost: boolean;
}
//# sourceMappingURL=charter.identity.d.ts.map