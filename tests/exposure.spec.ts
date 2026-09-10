import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'
import {
  COMPUTER_USE_ACTIVATE,
  ComputerUseExposure,
  hasLoadedComputerUseSkill,
} from '../src/exposure.ts'
import { COMPUTER_USE_SKILL_CONTENT, COMPUTER_USE_SKILL_NAME } from '../src/skill.ts'

function loadedSession(): { events: unknown[] } {
  return {
    events: [{
      type: 'user/message',
      data: {
        source: { kind: 'skill-invocation', name: COMPUTER_USE_SKILL_NAME },
        content: [{ type: 'text', text: COMPUTER_USE_SKILL_CONTENT }],
      },
    }],
  }
}

describe('progressive Computer Use exposure', () => {
  it('recognizes only durable evidence containing the bundled Skill', () => {
    expect(COMPUTER_USE_SKILL_CONTENT).toContain('does not require danger-full-access')
    expect(COMPUTER_USE_SKILL_CONTENT).toContain('load the vision-tools\nSkill')
    expect(COMPUTER_USE_SKILL_CONTENT).toContain('vision_glance for semantic inspection, OCR, or image comparison')
    expect(COMPUTER_USE_SKILL_CONTENT).toContain('Do not check for OCR executables, invoke tesseract')
    expect(COMPUTER_USE_SKILL_CONTENT).toContain('do not build a temporary OCR stack')
    expect(hasLoadedComputerUseSkill(loadedSession() as never)).toBe(true)
    expect(hasLoadedComputerUseSkill({ events: [] } as never)).toBe(false)
    expect(hasLoadedComputerUseSkill({
      events: [{
        type: 'user/message',
        data: { source: { kind: 'skill-invocation', name: COMPUTER_USE_SKILL_NAME }, content: [{ type: 'text', text: '# Different' }] },
      }],
    } as never)).toBe(false)
    expect(hasLoadedComputerUseSkill({
      events: [{
        type: 'tool/call',
        data: { name: 'skill', callId: 'call-1', arguments: JSON.stringify({ name: COMPUTER_USE_SKILL_NAME }) },
      }, {
        type: 'tool/result',
        data: {
          message: {
            content: [{
              type: 'tool-result',
              toolCallId: 'call-1',
              isError: false,
              content: [{ type: 'text', text: COMPUTER_USE_SKILL_CONTENT }],
            }],
          },
        },
      }],
    } as never)).toBe(true)
  })

  it('activates tools only for an Agent that loaded the Skill and disposes its scope', async () => {
    const listeners = new Map<string, (...args: never[]) => unknown>()
    const registered: string[] = []
    const disposed: string[] = []
    let restrictionDisposed = false
    const agent = {
      id: 'agent-1',
      session: loadedSession(),
      ctx: {
        tools: {
          register(definition: ToolDefinition) {
            registered.push(definition.name)
            return () => { disposed.push(definition.name) }
          },
          restrict(value: unknown) {
            expect(value).toEqual({ deny: [COMPUTER_USE_ACTIVATE] })
            return () => { restrictionDisposed = true }
          },
        },
      },
    }
    const ctx = {
      on(name: string, listener: (...args: never[]) => unknown) {
        listeners.set(name, listener)
        return () => { listeners.delete(name) }
      },
      agents: { list: () => [agent] },
      tools: { guard: () => () => {} },
    }
    const definitions = [{ name: 'computer_observe' }, { name: 'computer_click' }] as ToolDefinition[]
    const exposure = new ComputerUseExposure(ctx as never, () => definitions)
    const dispose = exposure.install()
    expect(registered).toEqual(['computer_observe', 'computer_click'])
    await expect(exposure.activationTool.execute({}, { agent } as never)).resolves.toEqual({
      activated: false,
      tools: ['computer_observe', 'computer_click'],
    })
    dispose()
    expect(restrictionDisposed).toBe(true)
    expect(disposed).toEqual(['computer_click', 'computer_observe'])
    expect(listeners.size).toBe(0)
  })

  it('fails activation before durable Skill evidence and activates on a successful Skill result', async () => {
    const listeners = new Map<string, (...args: never[]) => unknown>()
    const registered: string[] = []
    const agent = {
      id: 'agent-2',
      session: { events: [] },
      ctx: {
        tools: {
          register(definition: ToolDefinition) { registered.push(definition.name); return () => {} },
          restrict: () => () => {},
        },
      },
    }
    const ctx = {
      on(name: string, listener: (...args: never[]) => unknown) { listeners.set(name, listener); return () => {} },
      agents: { list: () => [agent] },
      tools: { guard: () => () => {} },
    }
    const exposure = new ComputerUseExposure(ctx as never, () => [{ name: 'computer_observe' }] as ToolDefinition[])
    exposure.install()
    await expect(exposure.activationTool.execute({}, { agent } as never)).rejects.toThrow(/load the computer-use Skill first/)
    const listener = listeners.get('tools/result')
    expect(listener).toBeDefined()
    listener?.(
      { name: 'skill', agent, arguments: { name: COMPUTER_USE_SKILL_NAME } },
      { isError: false, value: { name: COMPUTER_USE_SKILL_NAME, content: COMPUTER_USE_SKILL_CONTENT } },
    )
    expect(registered).toEqual(['computer_observe'])
  })

  it('rolls back a partially registered generation', () => {
    const disposed: string[] = []
    let count = 0
    const agent = {
      id: 'agent-3',
      session: loadedSession(),
      ctx: {
        tools: {
          register(definition: ToolDefinition) {
            count += 1
            if (count === 2) throw new Error('registration failed')
            return () => { disposed.push(definition.name) }
          },
          restrict: () => () => {},
        },
      },
    }
    const ctx = {
      on: () => () => {},
      agents: { list: () => [agent] },
      tools: { guard: () => () => {} },
    }
    const exposure = new ComputerUseExposure(ctx as never, () => [
      { name: 'computer_observe' },
      { name: 'computer_click' },
    ] as ToolDefinition[])
    expect(() => exposure.install()).toThrow('registration failed')
    expect(disposed).toEqual(['computer_observe'])
  })

  it('blocks ad hoc OCR shell calls when Vision Toolkit is ready', async () => {
    const listeners = new Map<string, (...args: never[]) => unknown>()
    let guard: ((exec: { name: string; agent?: typeof agent; arguments: unknown }) => string | undefined) | undefined
    const agent = {
      id: 'agent-4',
      session: loadedSession(),
      ctx: {
        tools: {
          register: () => () => {},
          restrict: () => () => {},
        },
      },
    }
    let visionReady = true
    const ctx = {
      on(name: string, listener: (...args: never[]) => unknown) { listeners.set(name, listener); return () => {} },
      agents: { list: () => [agent] },
      tools: {
        get(name: string) {
          return visionReady && name === 'vision_toolkit_activate' ? { name } : undefined
        },
        guard(value: typeof guard) {
          guard = value
          return () => { guard = undefined }
        },
      },
    }
    new ComputerUseExposure(ctx as never, () => []).install()
    expect(guard).toBeDefined()

    expect(guard?.({
      name: 'bash',
      agent,
      arguments: { command: 'which swift tesseract screencapture; tesseract screenshot.png stdout' },
    })).toContain('call the skill tool with {"name":"vision-tools"}')

    expect(guard?.({ name: 'bash', agent, arguments: { command: 'git status --short' } })).toBeUndefined()

    expect(guard?.({ name: 'bash', agent, arguments: { command: 'rg -n "tesseract|screencapture" src tests' } })).toBeUndefined()
    expect(guard?.({ name: 'bash', agent, arguments: { command: 'rg -n "python|import Vision|VNRecognizeTextRequest" src tests' } })).toBeUndefined()

    expect(guard?.({
      name: 'bash',
      agent,
      arguments: { command: "python3 <<'PY'\nfrom Vision import VNRecognizeTextRequest\nPY" },
    })).toContain('installed Vision Toolkit')
    expect(guard?.({ name: 'bash', agent, arguments: { command: 'brew install tesseract' } })).toContain('installed Vision Toolkit')
    expect(guard?.({ name: 'bash', agent, arguments: { command: 'uv pip install easyocr' } })).toContain('installed Vision Toolkit')
    expect(guard?.({ name: 'bash', agent, arguments: { command: 'command tesseract screen.png stdout' } })).toContain('installed Vision Toolkit')

    visionReady = false
    expect(guard?.({ name: 'bash', agent, arguments: { command: 'tesseract screenshot.png stdout' } })).toBeUndefined()
  })

  it('memoizes the Skill-activation verdict per Session log revision', async () => {
    let guard: ((exec: { name: string; agent?: typeof agent; arguments: unknown }) => string | undefined) | undefined
    const agent = {
      id: 'agent-5',
      session: { id: 'session-5', snapshotEvents: () => tracked },
      ctx: { tools: { register: () => () => {}, restrict: () => () => {} } },
    }
    const ctx = {
      on: () => () => {},
      agents: { list: () => [agent] },
      tools: {
        get(name: string) { return name === 'vision_glance' ? { name } : undefined },
        guard(value: typeof guard) { guard = value; return () => { guard = undefined } },
      },
    }
    // The guard runs on every bash call, so a repeated verdict must not walk the
    // whole log again; the proxy counts how many events it actually reads.
    const events: unknown[] = Array.from({ length: 200 }, (_value, index) => ({
      type: 'user/message',
      data: { source: { kind: 'user' }, content: [{ type: 'text', text: `note ${index}` }] },
    }))
    let reads = 0
    const tracked = new Proxy(events, {
      get(target, property, receiver) {
        if (typeof property === 'string' && /^\d+$/u.test(property)) reads += 1
        return Reflect.get(target, property, receiver)
      },
    })
    new ComputerUseExposure(ctx as never, () => []).install()
    const command = { command: 'tesseract screenshot.png stdout' }
    expect(guard?.({ name: 'bash', agent, arguments: command })).toBeUndefined()
    const scanned = reads
    expect(guard?.({ name: 'bash', agent, arguments: command })).toBeUndefined()
    expect(reads - scanned).toBeLessThanOrEqual(1)

    // Growing the log in place must invalidate the cached verdict.
    events.splice(1, 0, {
      type: 'user/message',
      data: {
        source: { kind: 'skill-invocation', name: COMPUTER_USE_SKILL_NAME },
        content: [{ type: 'text', text: COMPUTER_USE_SKILL_CONTENT }],
      },
    })
    expect(guard?.({ name: 'bash', agent, arguments: command })).toContain('installed Vision Toolkit')

    // Activation cannot be un-proven inside one Session, so the proven verdict
    // is kept even after the log changes again.
    events.length = 0
    expect(guard?.({ name: 'bash', agent, arguments: command })).toContain('installed Vision Toolkit')
  })
})
