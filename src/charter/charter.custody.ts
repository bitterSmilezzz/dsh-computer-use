/** Charter of custody: confirmation request/result shapes and the durable Session lease schema. */

import { z } from 'zod'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import type {
  ComputerAppIdentity,
  ComputerConfirmationToken,
  ComputerObservationId,
} from './charter.identity.ts'
import type { ComputerActionRequest } from './charter.action.ts'

/** Result of a confirmation request: a one-use token bound to one observation. */
export interface ComputerConfirmation {
  token: ComputerConfirmationToken
  observationId: ComputerObservationId
  app: ComputerAppIdentity
  expiresAt: string
}

/** Confirmation request: one exact proposed action plus its human-readable impact. */
export interface ComputerConfirmRequest {
  action: Omit<ComputerActionRequest, 'confirmationToken'>
  reason: string
  target: string
  dataSummary?: string
}

const safeCounter = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const leaseScopeSchema = z.union([z.literal('read'), z.literal('control')])

const sessionIdentitySchema = z.object({
  createdAt: safeCounter,
  cwd: z.string().optional(),
})

/** Session fields that fence a sidecar row to exactly one Session lifecycle. */
export type ComputerUseSessionIdentity = z.infer<typeof sessionIdentitySchema>

const deniedLeaseSchema = z.object({
  bundleId: z.string().min(1),
  scope: leaseScopeSchema,
})

/** One application/scope rejection; final for the rest of the Session lifecycle. */
export type ComputerUseDeniedLease = z.infer<typeof deniedLeaseSchema>

/**
 * Reports every repeated key once per extra occurrence, carrying the caller's
 * message and the index of the offending entry.
 */
function reportRepeats(
  keys: readonly string[],
  ctx: z.RefinementCtx,
  field: string,
  describe: (key: string) => string,
): void {
  const seen = new Set<string>()
  keys.forEach((key, index) => {
    if (seen.has(key)) {
      ctx.addIssue({ code: 'custom', path: [field, index], message: describe(key) })
    }
    seen.add(key)
  })
}

/** Runtime validation for the whole-Session sidecar row. */
export const computerUseSessionStateSchema = z.object({
  session: sessionIdentitySchema,
  readGrants: z.array(z.string().min(1)),
  denied: z.array(deniedLeaseSchema),
}).superRefine((row, ctx) => {
  reportRepeats(row.readGrants, ctx, 'readGrants', bundleId => `duplicate Computer Use read grant '${bundleId}'`)
  reportRepeats(
    row.denied.map(denial => `${denial.scope}\0${denial.bundleId}`),
    ctx,
    'denied',
    key => {
      const separator = key.indexOf('\0')
      const scope = key.slice(0, separator)
      return `duplicate Computer Use ${scope} denial '${key.slice(separator + 1)}'`
    },
  )
})

/** Durable authorization state owned by the plugin for one Session lifecycle. */
export type ComputerUseSessionState = z.infer<typeof computerUseSessionStateSchema>

/** The Computer Use sidecar record: one per Session id, bound to its lifecycle. */
export const computerUseStateDomainSpec = defineDomain({
  name: 'computer_use_state',
  version: 0,
  tables: {
    sessions: domainTable<SessionId, ComputerUseSessionState>(computerUseSessionStateSchema),
  },
})

/** Where the technical application lease used by an operation came from. */
export type ComputerLeaseSource = 'configured' | 'approved'
