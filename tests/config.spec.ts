import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/tuning/tuning.normalize.ts'

describe('Computer Use configuration', () => {
  it('resolves bounded defaults and promotes control grants to read access', () => {
    const config = resolveConfig({
      grants: [{ bundleId: 'com.example.Editor', control: true }],
    })
    expect(config).toMatchObject({
      observationTtlMs: 0,
      confirmationTtlMs: 300000,
      actionTimeoutMs: 15000,
      settleMs: 250,
      maxSettleMs: 5000,
      artifactRoot: '.dsh-computer-use/artifacts',
      helper: { allowSourceBuild: false },
      interaction: {
        focusPolicy: 'preserve',
        keyboardPolicy: 'preserve',
        pointerInputPolicy: 'targeted',
        cursorVisualization: 'visible',
        cursorSpeedPxPerSecond: 1600,
        cursorAccelerationPxPerSecondSquared: 6000,
        cursorClickDelayMs: 90,
        cursorAutoHideMs: 0,
      },
      grants: [{ bundleId: 'com.example.Editor', read: true, control: true }],
      allowAllApps: false,
    })
  })

  it('resolves allowAllApps independently of per-app grants', () => {
    expect(resolveConfig({ allowAllApps: true })).toMatchObject({ allowAllApps: true })
  })

  it('accepts an explicit foreground, keyboard, and target-process pointer policy', () => {
    expect(resolveConfig({
      interaction: {
        focusPolicy: 'activate',
        keyboardPolicy: 'activate',
        pointerInputPolicy: 'targeted',
        cursorVisualization: 'hidden',
        cursorMotionMs: 0,
        cursorSpeedPxPerSecond: 50000,
        cursorAccelerationPxPerSecondSquared: 500000,
        cursorClickDelayMs: 0,
        cursorAutoHideMs: 30000,
      },
    }).interaction).toEqual({
      focusPolicy: 'activate',
      keyboardPolicy: 'activate',
      pointerInputPolicy: 'targeted',
      cursorVisualization: 'hidden',
      cursorSpeedPxPerSecond: 50000,
      cursorAccelerationPxPerSecondSquared: 500000,
      cursorClickDelayMs: 0,
      cursorAutoHideMs: 30000,
    })
  })

  it('loads a 0.2.x interaction document containing only the deprecated motion duration', () => {
    expect(resolveConfig({ interaction: { cursorMotionMs: 750 } }).interaction).toEqual({
      focusPolicy: 'preserve',
      keyboardPolicy: 'preserve',
      pointerInputPolicy: 'targeted',
      cursorVisualization: 'visible',
      cursorSpeedPxPerSecond: 1600,
      cursorAccelerationPxPerSecondSquared: 6000,
      cursorClickDelayMs: 90,
      cursorAutoHideMs: 0,
    })
  })

  it('accepts an observation TTL of zero to disable expiry and raises the upper bound', () => {
    expect(resolveConfig({ observationTtlMs: 0 }).observationTtlMs).toBe(0)
    expect(resolveConfig({ observationTtlMs: 86400000 }).observationTtlMs).toBe(86400000)
  })

  it.each([
    [{ observationTtlMs: 999 }, /observationTtlMs/],
    [{ observationTtlMs: 86400001 }, /observationTtlMs/],
    [{ settleMs: 5001, maxSettleMs: 5000 }, /settleMs/],
    [{ artifactRoot: '../outside' }, /artifactRoot/],
    [{ helper: { path: '   ' } }, /helper\.path/],
    [{ interaction: { focusPolicy: 'invalid' } }, /interaction\.focusPolicy/],
    [{ interaction: { keyboardPolicy: 'invalid' } }, /interaction\.keyboardPolicy/],
    [{ interaction: { pointerInputPolicy: 'invalid' } }, /interaction\.pointerInputPolicy/],
    [{ interaction: { cursorVisualization: 'invalid' } }, /interaction\.cursorVisualization/],
    [{ interaction: { cursorMotionMs: 2001 } }, /interaction\.cursorMotionMs/],
    [{ interaction: { cursorSpeedPxPerSecond: 99 } }, /interaction\.cursorSpeedPxPerSecond/],
    [{ interaction: { cursorSpeedPxPerSecond: 50001 } }, /interaction\.cursorSpeedPxPerSecond/],
    [{ interaction: { cursorAccelerationPxPerSecondSquared: 99 } }, /interaction\.cursorAccelerationPxPerSecondSquared/],
    [{ interaction: { cursorAccelerationPxPerSecondSquared: 500001 } }, /interaction\.cursorAccelerationPxPerSecondSquared/],
    [{ interaction: { cursorClickDelayMs: 1001 } }, /interaction\.cursorClickDelayMs/],
    [{ interaction: { cursorAutoHideMs: 30001 } }, /interaction\.cursorAutoHideMs/],
    [{ grants: [{ bundleId: '*' }] }, /non-wildcard/],
    [{ grants: [{ bundleId: 'com.example.App' }, { bundleId: 'com.example.App' }] }, /duplicate/],
    [{ maxWaitMs: 99 }, /maxWaitMs/],
    [{ maxWaitMs: 600001 }, /maxWaitMs/],
  ] as const)('rejects invalid configuration %o', (value, pattern) => {
    expect(() => resolveConfig(value)).toThrow(pattern)
  })

  it('bounds computer_wait with an independent maxWaitMs that never shrinks the settle default', () => {
    // The default wait ceiling is its own budget, and the historical default
    // timeout (maxSettleMs) must stay legal under it without failing the whole
    // settings document.
    expect(resolveConfig({}).maxWaitMs).toBe(30000)
    expect(resolveConfig({ maxSettleMs: 60000 }).maxWaitMs).toBe(60000)
    expect(resolveConfig({ maxSettleMs: 60000, maxWaitMs: 600000 }).maxWaitMs).toBe(600000)
    expect(resolveConfig({ maxSettleMs: 5000, maxWaitMs: 4000 }).maxWaitMs).toBe(5000)
  })
})
