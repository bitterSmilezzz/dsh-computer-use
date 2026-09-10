/**
 * Playbook guard — the progressive exposure lifecycle for the Computer Use
 * execution Tools, plus the shell guard that keeps screenshot reading inside the
 * Vision Toolkit.
 *
 * Two contracts live here and must not drift:
 *   - the OCR-avoidance patterns may only ever be widened to catch one more
 *     shell-built OCR path, and never narrowed;
 *   - an activation that durable Session history already proved stays proven
 *     for the remaining life of that Session.
 */

import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import {
  defineTool,
  type ToolDefinition,
  type ToolExecution,
  type ValueSchemaSpec,
} from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import { COMPUTER_USE_SKILL_CONTENT, COMPUTER_USE_SKILL_NAME } from './playbook.skill.ts'

/** The single global bootstrap Tool, kept visible only until its Agent loads the Skill. */
export const COMPUTER_USE_ACTIVATE = 'computer_use_activate'

/** Toolkit Tools that prove pixel analysis is already wired up for this Agent. */
const VISION_TOOL_NAMES = [
  'vision_glance', 'vision_ground', 'vision_detect', 'vision_crop',
  'vision_long_screenshot_ocr', 'vision_toolkit_activate',
] as const

/*
 * OCR-avoidance patterns. These are transcribed from the published guard shape:
 * kept whole, kept in one block, and never inlined into the matcher below.
 */

/** Leading `VAR=x`, `sudo`, `env`, `time`, … noise stripped before a segment is judged. */
const SHELL_NOISE = /^(?:(?:[A-Za-z_][A-Za-z0-9_]*=\S+)\s+)*(?:(?:\S*\/)?(?:sudo|env|nohup|time|command|exec)\s+(?:(?:-\S+|[A-Za-z_][A-Za-z0-9_]*=\S+)\s+)*)?/iu
/** Capability probing: `which tesseract`, `type screencapture`, `command -v …`. */
const PROBES_OCR_TOOLING = /^(?:which|type|command\s+-v)\b[^\n;&|]*\b(?:tesseract|screencapture)\b/iu
/** A bare or path-qualified OCR binary run. */
const RUNS_OCR_BINARY = /^(?:\S*\/)?(?:tesseract|screencapture)(?:\s|$)/iu
/** Package-manager installs that would assemble a shell OCR stack. */
const INSTALLS_OCR_STACK = /^(?:(?:\S*\/)?(?:brew|port|apt(?:-get)?|dnf|yum|pacman)\b[^\n]*(?:install|add)\b[^\n]*\btesseract(?:-ocr)?\b|(?:\S*\/)?(?:pip(?:3(?:\.\d+)*)?|uv\s+pip|poetry\s+add|pdm\s+add)\b[^\n]*(?:install|add)?[^\n]*\b(?:pytesseract|easyocr|ocrmypdf)\b)/iu
/** A script host able to wrap a native Vision call. */
const RUNS_SCRIPT_HOST = /^(?:\S*\/)?(?:python(?:3(?:\.\d+)*)?|swift)(?:\s|$)/iu
/** Library or framework markers that only appear inside a scripted OCR body. */
const MENTIONS_SCRIPTED_OCR = /(?:\bpytesseract\b|\beasyocr\b|\bocrmypdf\b|VNRecognizeTextRequest|\bimport\s+Vision\b)/iu
/** Shell separators that begin a new simple command within one `command` string. */
const COMMAND_BREAKS = /(?:&&|\|\||[;|\n])/u

/** Denial text handed to the model when it tries to build OCR out of shell tools. */
const SHELL_OCR_REFUSAL = [
  'Computer Use screenshot analysis must use the installed Vision Toolkit instead of a shell-built OCR stack.',
  'If vision_glance is absent, call the skill tool with {"name":"vision-tools"}; then pass the existing screenshot Artifact path to vision_glance, vision_ground, vision_detect, vision_crop, or vision_long_screenshot_ocr.',
].join(' ')

/** One Agent's live exposure scope. */
interface AgentScope {
  /** Whether the execution Tools are currently registered for this Agent. */
  active: boolean
  /** Restricts the bootstrap Tool back out of the Agent registry, or null before that happens. */
  hideActivation: (() => void) | null
  /** Tool disposers in registration order; released in reverse. */
  toolDisposers: Array<() => void>
  /** Names of the exposed Tools in registration order. */
  toolNames: string[]
}

/** A memoized activation verdict together with the log revision it came from. */
interface ActivationMemo {
  /** The exact snapshot object the verdict was computed from. */
  snapshot: readonly SessionEvent[]
  /** That snapshot's length at the time. */
  count: number
  /** That snapshot's final event at the time. */
  last: SessionEvent | undefined
  /** The verdict; `true` is permanent for the Session. */
  proven: boolean
}

/** Activation result handed back to the model. */
export interface ComputerUseActivationResult {
  /** Whether this call is what registered the execution Tools. */
  activated: boolean
  /** Names of the exposed Tools, in registration order. */
  tools: string[]
}

/** Output schema of the bootstrap Tool: whether it activated, and which Tools now exist. */
const ACTIVATION_OUTPUT = {
  type: 'object',
  additionalProperties: false,
  properties: {
    activated: { type: 'boolean', required: true },
    tools: {
      type: 'array',
      items: { type: 'string' },
      required: true,
    },
  },
} as const satisfies ValueSchemaSpec

function renderJson(_args: unknown, value: unknown): ContentBlock[] {
  const serialized = JSON.stringify(value, null, 2)
  return [{ type: 'text', text: serialized }]
}

/** Narrow an arbitrary value to a plain JSON record. */
function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

/** The shell command inside a bash Tool argument block, when there is one. */
function shellCommandOf(value: unknown): string | undefined {
  const command = asRecord(value)?.command
  return typeof command === 'string' ? command : undefined
}

/** Cut one command string into the simple commands a guard has to judge. */
function simpleCommands(command: string): string[] {
  return command
    .split(COMMAND_BREAKS)
    .map(segment => segment.trimStart().replace(SHELL_NOISE, ''))
}

/** Whether one simple command probes for, runs, or installs OCR tooling. */
function matchesShellOcrTooling(segment: string): boolean {
  return PROBES_OCR_TOOLING.test(segment)
    || RUNS_OCR_BINARY.test(segment)
    || INSTALLS_OCR_STACK.test(segment)
}

/** Whether a bash argument block describes an ad hoc OCR stack. */
function adHocOcrCommand(value: unknown): boolean {
  const command = shellCommandOf(value)
  if (command === undefined) return false
  const segments = simpleCommands(command)
  if (segments.some(matchesShellOcrTooling)) return true
  return MENTIONS_SCRIPTED_OCR.test(command)
    && segments.some(segment => RUNS_SCRIPT_HOST.test(segment))
}

/** Whether a parsed Tool-argument value names the bundled Skill. */
function namesBundledSkill(value: unknown): boolean {
  return asRecord(value)?.name === COMPUTER_USE_SKILL_NAME
}

/** Whether a raw Tool-argument string parses to a bundled-Skill invocation. */
function namesBundledSkillInJson(raw: string): boolean {
  try {
    return namesBundledSkill(JSON.parse(raw))
  } catch {
    return false
  }
}

/** Whether a content block list carries the bundled Skill body verbatim. */
function carriesSkillBody(blocks: readonly unknown[]): boolean {
  return blocks.some((block) => {
    const record = asRecord(block)
    return record !== undefined
      && record.type === 'text'
      && typeof record.text === 'string'
      && record.text.includes(COMPUTER_USE_SKILL_CONTENT)
  })
}

/** Whether a Tool result value is the bundled Skill reporting its own body. */
function isBundledSkillResult(value: unknown): boolean {
  const record = asRecord(value)
  return record !== undefined
    && record.name === COMPUTER_USE_SKILL_NAME
    && record.content === COMPUTER_USE_SKILL_CONTENT
}

/**
 * Read a Session log. Current Sessions expose `snapshotEvents()`; the older
 * `events` array is still honored so pre-0.1.2-alpha.4 Sessions and the doubles
 * imitating them keep working.
 */
function sessionEventLog(session: Session): readonly SessionEvent[] {
  const candidate = session as Partial<Session> & { events?: readonly SessionEvent[] }
  if (typeof candidate.snapshotEvents !== 'function') return candidate.events ?? []
  return candidate.snapshotEvents()
}

/**
 * Judge one event as possible Skill-activation evidence. Native `skill` calls
 * are remembered by call id so a later result can be traced back to one.
 */
function eventProvesActivation(event: SessionEvent, skillCalls: Set<string>): boolean {
  switch (event.type) {
    case 'user/message': {
      const { source, content } = event.data
      return source.kind === 'skill-invocation'
        && source.name === COMPUTER_USE_SKILL_NAME
        && carriesSkillBody(content)
    }
    case 'tool/call': {
      if (event.data.name === 'skill' && namesBundledSkillInJson(event.data.arguments)) {
        skillCalls.add(String(event.data.callId))
      }
      return false
    }
    case 'tool/result': {
      const [first] = event.data.message.content
      if (first?.type !== 'tool-result') return false
      return first.isError !== true
        && skillCalls.has(String(first.toolCallId))
        && carriesSkillBody(first.content)
    }
    case 'tool/ptc-dispatch': {
      return event.data.name === 'skill'
        && event.data.isError === false
        && namesBundledSkill(event.data.arguments)
        && carriesSkillBody(event.data.content)
    }
    default:
      return false
  }
}

/** Scan one immutable event snapshot for durable Skill-activation evidence. */
function loadedFromEvents(events: readonly SessionEvent[]): boolean {
  const skillCalls = new Set<string>()
  return events.some(event => eventProvesActivation(event, skillCalls))
}

/** Whether durable Session history proves that the bundled Skill was loaded. */
export function hasLoadedComputerUseSkill(session: Session): boolean {
  return loadedFromEvents(sessionEventLog(session))
}

/**
 * Per-Session memo for the activation scan. The scan itself walks the whole log
 * hunting for a multi-kilobyte needle, which is far too expensive to repeat on
 * every bash call: a verdict is trusted only while the log is demonstrably the
 * same object at the same revision, and any doubt falls back to a full rescan.
 */
class ActivationVerdicts {
  private readonly verdicts = new WeakMap<Session, ActivationMemo>()

  /**
   * `true` is kept forever, because nothing appended to a Session can undo a
   * proven load. `false` is kept only while the snapshot identity, its length,
   * and its last event all still match — doubles that grow one array in place
   * are caught by the length and last-event checks.
   */
  proven(session: Session): boolean {
    const events = sessionEventLog(session)
    const memo = this.verdicts.get(session)
    if (memo !== undefined) {
      if (memo.proven) return true
      if (memo.snapshot === events
        && memo.count === events.length
        && memo.last === events[events.length - 1]) return false
    }
    const proven = loadedFromEvents(events)
    this.verdicts.set(session, {
      snapshot: events,
      count: events.length,
      last: events[events.length - 1],
      proven,
    })
    return proven
  }
}

/** Owns one progressive Tool-exposure generation. */
export class ComputerUseExposure {
  readonly activationTool: ToolDefinition
  private readonly scopes = new Map<Agent, AgentScope>()
  private readonly verdicts = new ActivationVerdicts()
  private readonly ctx: Context
  private readonly createTools: () => ToolDefinition[]
  private installed = false

  constructor(ctx: Context, createTools: () => ToolDefinition[]) {
    this.ctx = ctx
    this.createTools = createTools
    this.activationTool = defineTool({
      name: COMPUTER_USE_ACTIVATE,
      description: `Establish the macOS Computer Use execution tools for this Agent, once the ${COMPUTER_USE_SKILL_NAME} Skill is loaded. Loading the Skill through the Skill tool normally exposes them on its own; call this only after a direct Skill invocation left them missing. The bootstrap removes itself once it succeeds.`,
      parameters: {},
      output: { schema: ACTIVATION_OUTPUT, render: renderJson },
      execute: (_args, exec) => {
        const agent = exec.agent
        if (agent === undefined) throw new Error(`${COMPUTER_USE_ACTIVATE}: an Agent Session is required`)
        if (!this.verdicts.proven(agent.session)) {
          throw new Error(`${COMPUTER_USE_ACTIVATE}: load the ${COMPUTER_USE_SKILL_NAME} Skill first`)
        }
        return Promise.resolve(this.activate(agent))
      },
      presentCall: () => ({ card: 'generic', title: 'Activate Computer Use', kind: 'execute' }),
    })
  }

  /** Install lifecycle listeners and adopt the Agents that already exist. */
  install(): () => void {
    if (this.installed) throw new Error('dsh-computer-use: progressive exposure is already installed')
    this.installed = true
    const effects: Array<() => void> = [
      this.ctx.on('agent/created', ({ agent }) => { this.attach(agent) }),
      this.ctx.on('agent/disposed', ({ agent }) => { this.detach(agent) }),
      this.ctx.tools.guard(exec => this.shellOcrRefusal(exec)),
      this.ctx.on('tools/result', (exec, result) => this.noteSkillResult(exec, result)),
    ]
    try {
      for (const agent of this.ctx.agents.list()) this.attach(agent)
    } catch (error) {
      this.retract(effects)
      throw error
    }
    return () => {
      if (this.installed) this.retract(effects)
    }
  }

  /** Deny a bash call that would build OCR out of shell tools while vision is ready. */
  private shellOcrRefusal(exec: Readonly<ToolExecution>): string | undefined {
    const { agent } = exec
    if (exec.name !== 'bash' || agent === undefined) return undefined
    if (!this.verdicts.proven(agent.session) || !adHocOcrCommand(exec.arguments)) return undefined
    const visionReady = VISION_TOOL_NAMES.some(name => this.ctx.tools.get(name, agent) !== undefined)
    return visionReady ? SHELL_OCR_REFUSAL : undefined
  }

  /** Loading the Skill through its own Tool activates exposure without a bootstrap call. */
  private noteSkillResult(
    exec: Readonly<ToolExecution>,
    result: Readonly<{ isError?: boolean; value?: unknown }>,
  ): undefined {
    const agent = exec.agent
    if (agent !== undefined && result.isError === false && exec.name === 'skill'
      && namesBundledSkill(exec.arguments) && isBundledSkillResult(result.value)) {
      this.activate(agent)
    }
    return undefined
  }

  /** Undo every listener and every registered Tool of this generation. */
  private retract(effects: Array<() => void>): void {
    this.installed = false
    for (const dispose of effects.reverse()) dispose()
    for (const scope of this.scopes.values()) this.releaseScope(scope)
    this.scopes.clear()
  }

  /** Adopt one Agent, activating immediately when its history already proves a load. */
  private attach(agent: Agent): void {
    if (this.scopes.has(agent)) return
    this.scopes.set(agent, { active: false, hideActivation: null, toolDisposers: [], toolNames: [] })
    if (this.verdicts.proven(agent.session)) this.activate(agent)
  }

  /** Register the execution Tools for one Agent and hide the bootstrap. */
  private activate(agent: Agent): ComputerUseActivationResult {
    this.attach(agent)
    const scope = this.scopes.get(agent)
    if (scope === undefined) throw new Error(`dsh-computer-use: Agent ${String(agent.id)} has no exposure state`)
    if (scope.active) return { activated: false, tools: [...scope.toolNames] }

    const { definitions, hideActivation, toolDisposers } = this.openScope(agent)
    scope.active = true
    scope.hideActivation = hideActivation
    scope.toolDisposers = toolDisposers
    scope.toolNames = definitions.map(definition => definition.name)
    return { activated: true, tools: [...scope.toolNames] }
  }

  /**
   * Register every definition in order and hide the bootstrap behind them. A
   * failure at any point leaves nothing behind: the Agent keeps the exact
   * registry it had before the attempt.
   */
  private openScope(agent: Agent): {
    definitions: ToolDefinition[]
    hideActivation: (() => void) | null
    toolDisposers: Array<() => void>
  } {
    const definitions = this.createTools()
    const toolDisposers: Array<() => void> = []
    let hideActivation: (() => void) | undefined
    /** Leave the registry exactly as it was before this attempt. */
    const rollback = (): void => {
      hideActivation?.()
      for (const dispose of toolDisposers.reverse()) dispose()
    }
    try {
      for (const definition of definitions) {
        toolDisposers.push(agent.ctx.tools.register(definition))
      }
      hideActivation = agent.ctx.tools.restrict({ deny: [COMPUTER_USE_ACTIVATE] })
    } catch (error) {
      rollback()
      throw error
    }
    return { definitions, hideActivation: hideActivation ?? null, toolDisposers }
  }

  private detach(agent: Agent): void {
    const scope = this.scopes.get(agent)
    if (scope === undefined) return
    this.scopes.delete(agent)
    this.releaseScope(scope)
  }

  private releaseScope(scope: AgentScope): void {
    scope.hideActivation?.()
    for (const dispose of scope.toolDisposers.reverse()) dispose()
  }
}
