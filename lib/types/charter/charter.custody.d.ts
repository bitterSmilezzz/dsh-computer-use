/** Charter of custody: confirmation request/result shapes and the durable Session lease schema. */
import { z } from 'zod';
import type { SessionId } from '@deepseek-ai/dsh-session';
import type { ComputerAppIdentity, ComputerConfirmationToken, ComputerObservationId } from './charter.identity.ts';
import type { ComputerActionRequest } from './charter.action.ts';
/** Result of a confirmation request: a one-use token bound to one observation. */
export interface ComputerConfirmation {
    token: ComputerConfirmationToken;
    observationId: ComputerObservationId;
    app: ComputerAppIdentity;
    expiresAt: string;
}
/** Confirmation request: one exact proposed action plus its human-readable impact. */
export interface ComputerConfirmRequest {
    action: Omit<ComputerActionRequest, 'confirmationToken'>;
    reason: string;
    target: string;
    dataSummary?: string;
}
declare const sessionIdentitySchema: z.ZodObject<{
    createdAt: z.ZodNumber;
    cwd: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/** Session fields that fence a sidecar row to exactly one Session lifecycle. */
export type ComputerUseSessionIdentity = z.infer<typeof sessionIdentitySchema>;
declare const deniedLeaseSchema: z.ZodObject<{
    bundleId: z.ZodString;
    scope: z.ZodUnion<readonly [z.ZodLiteral<"read">, z.ZodLiteral<"control">]>;
}, z.core.$strip>;
/** One application/scope rejection; final for the rest of the Session lifecycle. */
export type ComputerUseDeniedLease = z.infer<typeof deniedLeaseSchema>;
/** Runtime validation for the whole-Session sidecar row. */
export declare const computerUseSessionStateSchema: z.ZodObject<{
    session: z.ZodObject<{
        createdAt: z.ZodNumber;
        cwd: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    readGrants: z.ZodArray<z.ZodString>;
    denied: z.ZodArray<z.ZodObject<{
        bundleId: z.ZodString;
        scope: z.ZodUnion<readonly [z.ZodLiteral<"read">, z.ZodLiteral<"control">]>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/** Durable authorization state owned by the plugin for one Session lifecycle. */
export type ComputerUseSessionState = z.infer<typeof computerUseSessionStateSchema>;
/** The Computer Use sidecar record: one per Session id, bound to its lifecycle. */
export declare const computerUseStateDomainSpec: {
    name: string;
    version: number;
    tables: {
        sessions: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<SessionId, {
            session: {
                createdAt: number;
                cwd?: string | undefined;
            };
            readGrants: string[];
            denied: {
                bundleId: string;
                scope: "read" | "control";
            }[];
        }>;
    };
};
/** Where the technical application lease used by an operation came from. */
export type ComputerLeaseSource = 'configured' | 'approved';
export {};
//# sourceMappingURL=charter.custody.d.ts.map