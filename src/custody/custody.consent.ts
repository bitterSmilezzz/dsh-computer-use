/** Custody consent: one-use just-in-time confirmation tokens for sensitive Computer Use actions. */

import { createHash, randomUUID } from 'node:crypto'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ToolCallId } from '@deepseek-ai/dsh-llm'
import type { Context } from '@deepseek-ai/cordis'
import { approvalPolicy } from './custody.policy.ts'
import type { ResolvedComputerUseConfig } from '../tuning/tuning.schema.ts'
import { ComputerUseError } from '../charter/charter.fault.ts'
import {
  type ComputerActionRequest,
  type ComputerAppIdentity,
  type ComputerConfirmRequest,
  type ComputerConfirmation,
  type ComputerObservationId,
  ComputerConfirmationToken,
} from '../charter/charter.index.ts'

/** The consent one pending token stands for, and when it stops being usable. */
interface ConfirmationRecord {
  /** Epoch milliseconds after which the token authorizes nothing. */
  expiresAt: number
  /** The application the user approved. */
  app: ComputerAppIdentity
  /** The observation whose element the approval described. */
  observationId: ComputerObservationId
  /** Digest of the approved action with its token stripped. */
  actionHash: string
}

/** Rejection text shared by every way a token can fail to authorize an action. */
const TOKEN_REJECTED = 'COMPUTER_CONFIRMATION_REQUIRED' as const

/** The prompt text: what the caller asked for, plus the target and payload it names. */
function confirmReason(request: ComputerConfirmRequest): string {
  const payload = request.dataSummary === undefined ? '' : ` Data: ${request.dataSummary}.`
  return `${request.reason} Target: ${request.target}.${payload}`
}

/**
 * Canonical JSON with object members sorted by key and `undefined` members
 * omitted, so two equal actions hash alike no matter what order their keys were
 * built in.
 */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  const record = value as Record<string, unknown>
  const members: string[] = []
  for (const key of Object.keys(record).sort()) {
    const member = record[key]
    if (member === undefined) continue
    members.push(`${JSON.stringify(key)}:${canonical(member)}`)
  }
  return `{${members.join(',')}}`
}

/**
 * Digest over everything an action means except the token that authorizes it, so
 * a token minted for one action cannot be replayed against a different one.
 */
function actionFingerprint(
  action: Omit<ComputerActionRequest, 'confirmationToken'> | ComputerActionRequest,
): string {
  const { confirmationToken: _unused, ...meaning } = action as ComputerActionRequest
  return createHash('sha256').update(canonical(meaning)).digest('hex')
}

/** Owner of the sensitive-action tokens: minting, one-use consumption, and release. */
export class ComputerConfirmationManager {
  /** Pending tokens, partitioned per Agent so a release can drop one Session's set. */
  private readonly pending = new Map<Agent, Map<ComputerConfirmationToken, ConfirmationRecord>>()

  constructor(
    private readonly ctx: Context,
    private readonly config: () => ResolvedComputerUseConfig,
  ) {}

  /** One Agent's pending-token table, created the first time that Agent asks. */
  private tableFor(agent: Agent): Map<ComputerConfirmationToken, ConfirmationRecord> {
    const existing = this.pending.get(agent)
    if (existing !== undefined) return existing
    const created = new Map<ComputerConfirmationToken, ConfirmationRecord>()
    this.pending.set(agent, created)
    return created
  }

  /**
   * Claim one token for an Agent and return it together with the record it held.
   * Claiming removes the record even when the caller goes on to reject it, which
   * is what makes a token strictly one-use.
   */
  private claim(agent: Agent, token: ComputerConfirmationToken): ConfirmationRecord | undefined {
    const table = this.pending.get(agent)
    const record = table?.get(token)
    if (record !== undefined) table?.delete(token)
    return record
  }

  /** Whether a claimed record was issued for exactly this app, observation, and action. */
  private authorizes(
    record: ConfirmationRecord,
    app: ComputerAppIdentity,
    action: ComputerActionRequest,
  ): boolean {
    if (record.app.bundleId !== app.bundleId || record.app.pid !== app.pid) return false
    if (record.observationId !== action.observationId) return false
    return record.actionHash === actionFingerprint(action)
  }

  /** Ask the user, then mint one token bound to the action they approved. */
  async confirm(
    agent: Agent,
    app: ComputerAppIdentity,
    request: ComputerConfirmRequest,
    callId: ToolCallId | undefined,
    signal: AbortSignal,
  ): Promise<ComputerConfirmation> {
    if (approvalPolicy(this.ctx, agent) === 'never') {
      throw new ComputerUseError(
        TOKEN_REJECTED,
        'sensitive action confirmation is blocked because approval prompts are disabled in this Session (approval/policy: never); do not execute the action, and ask the user to switch the permission preset to one with approval ask or run it manually',
      )
    }
    const outcome = await this.ctx.approval.request({
      agent,
      toolName: 'computer_confirm',
      reason: confirmReason(request),
      signal,
      ...(callId === undefined ? {} : { callId }),
    })
    if (outcome === 'cancelled') {
      throw new ComputerUseError('COMPUTER_CANCELLED', 'sensitive action confirmation was cancelled')
    }
    if (outcome !== 'allowed-once') {
      throw new ComputerUseError(TOKEN_REJECTED, `sensitive action was not confirmed (${outcome})`)
    }
    const observationId = request.action.observationId
    const expiresAt = Date.now() + this.config().confirmationTtlMs
    const token = ComputerConfirmationToken(randomUUID())
    this.tableFor(agent).set(token, {
      app,
      observationId,
      actionHash: actionFingerprint(request.action),
      expiresAt,
    })
    return { token, observationId, app, expiresAt: new Date(expiresAt).toISOString() }
  }

  /** Spend the one token a sensitive action claims; every other case is refused. */
  consume(agent: Agent, app: ComputerAppIdentity, action: ComputerActionRequest): void {
    if (action.sensitive !== true) {
      if (action.confirmationToken !== undefined) {
        throw new ComputerUseError(TOKEN_REJECTED, 'confirmationToken is valid only when sensitive is true')
      }
      return
    }
    const token = action.confirmationToken
    if (token === undefined) {
      throw new ComputerUseError(TOKEN_REJECTED, 'sensitive action requires a token from computer_confirm')
    }
    const record = this.claim(agent, token)
    if (record === undefined) {
      throw new ComputerUseError(TOKEN_REJECTED, 'confirmation token is unknown, expired, or already consumed')
    }
    if (record.expiresAt < Date.now()) {
      throw new ComputerUseError(TOKEN_REJECTED, 'confirmation token expired')
    }
    if (!this.authorizes(record, app, action)) {
      throw new ComputerUseError(TOKEN_REJECTED, 'confirmation token does not match this app, observation, or action')
    }
  }

  /** Drop a pending token whose target identity changed before input was sent. */
  invalidate(agent: Agent, token: ComputerConfirmationToken | undefined): void {
    if (token !== undefined) this.pending.get(agent)?.delete(token)
  }

  /** Forget everything one Agent still has pending. */
  releaseAgent(agent: Agent): void {
    this.pending.delete(agent)
  }

  /** Forget every pending token: provider teardown or generation replacement. */
  clear(): void {
    this.pending.clear()
  }
}
