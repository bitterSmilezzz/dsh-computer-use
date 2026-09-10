/**
 * Charter of execution context: caller scope, provider diagnostics, and the agent-cursor evidence shape.
 */

import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ToolCallId } from '@deepseek-ai/dsh-llm'
import type { ComputerPermissionState } from './charter.identity.ts'

/** Caller context: scoping, cancellation, approval audit, and artifact placement. */
export interface ComputerUseContext {
  signal: AbortSignal
  workspace: string
  agent: Agent
  callId?: ToolCallId
}

/** Which native provider backs the current Computer Use generation. */
export type ComputerUseProviderKind = 'macos-ax' | 'unsupported'

/** Identifies the native helper build the provider is currently using. */
export interface ComputerHelperBuild {
  helperPath: string
  helperVersion?: string
  helperSha256?: string
}

/** Provider and permission diagnostics surfaced in Settings. */
export interface ComputerUseStatus extends ComputerHelperBuild {
  provider: ComputerUseProviderKind
  platform: NodeJS.Platform
  generation: number
  ready: boolean
  accessibility: ComputerPermissionState
  screenRecording: ComputerPermissionState
  lastError?: string
}

/** Whether the agent cursor ended up visible, and the reason when it did not. */
export interface CursorVisibility {
  readonly reason?: string
  readonly reasonCode?: 'target-not-frontmost' | 'target-invalid'
  readonly visible: boolean
}
