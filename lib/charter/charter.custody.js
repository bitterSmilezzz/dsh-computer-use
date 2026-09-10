/** Charter of custody: confirmation request/result shapes and the durable Session lease schema. */
import { z } from 'zod';
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain';
const safeCounter = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const leaseScopeSchema = z.union([z.literal('read'), z.literal('control')]);
const sessionIdentitySchema = z.object({
    createdAt: safeCounter,
    cwd: z.string().optional(),
});
const deniedLeaseSchema = z.object({
    bundleId: z.string().min(1),
    scope: leaseScopeSchema,
});
/**
 * Reports every repeated key once per extra occurrence, carrying the caller's
 * message and the index of the offending entry.
 */
function reportRepeats(keys, ctx, field, describe) {
    const seen = new Set();
    keys.forEach((key, index) => {
        if (seen.has(key)) {
            ctx.addIssue({ code: 'custom', path: [field, index], message: describe(key) });
        }
        seen.add(key);
    });
}
/** Runtime validation for the whole-Session sidecar row. */
export const computerUseSessionStateSchema = z.object({
    session: sessionIdentitySchema,
    readGrants: z.array(z.string().min(1)),
    denied: z.array(deniedLeaseSchema),
}).superRefine((row, ctx) => {
    reportRepeats(row.readGrants, ctx, 'readGrants', bundleId => `duplicate Computer Use read grant '${bundleId}'`);
    reportRepeats(row.denied.map(denial => `${denial.scope}\0${denial.bundleId}`), ctx, 'denied', key => {
        const separator = key.indexOf('\0');
        const scope = key.slice(0, separator);
        return `duplicate Computer Use ${scope} denial '${key.slice(separator + 1)}'`;
    });
});
/** The Computer Use sidecar record: one per Session id, bound to its lifecycle. */
export const computerUseStateDomainSpec = defineDomain({
    name: 'computer_use_state',
    version: 0,
    tables: {
        sessions: domainTable(computerUseSessionStateSchema),
    },
});
//# sourceMappingURL=charter.custody.js.map