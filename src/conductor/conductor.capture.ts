/**
 * Conductor capture: turn one provider frame into the projected, stored, and
 * returned observation.
 *
 * The frame the caller asked for is reused whenever it already carries the
 * evidence the request needs, and a frame that lacks it is never downgraded in
 * place — the provider is asked again instead.
 */

import { randomUUID } from 'node:crypto'
import type { BackendObservation, ComputerUseBackend } from '../binding/binding.port.ts'
import { ComputerUseError } from '../charter/charter.fault.ts'
import {
  ComputerObservationId,
  type ComputerAppIdentity,
  type ComputerObservation,
  type ComputerObserveRequest,
  type ComputerUseContext,
} from '../charter/charter.index.ts'
import type { Ledger } from '../custody/custody.ledger.ts'
import { allocateScreenshotPath, describeScreenshot } from '../optics/optics.artifact.ts'
import { diffElements } from '../optics/optics.drift.ts'
import { publicElements } from '../optics/optics.snapshot.ts'
import type { ResolvedComputerUseConfig } from '../tuning/tuning.schema.ts'

/** Everything one capture needs from the live service generation. */
export interface CaptureHost {
  readonly backend: ComputerUseBackend
  readonly config: ResolvedComputerUseConfig
  readonly ledger: Ledger
  /** Aborted when this service generation is disposed. */
  readonly lifetime: AbortSignal
}

/** Observe (or reuse), project, store, and return one observation. */
export async function captureObservation(
  host: CaptureHost,
  app: ComputerAppIdentity,
  request: ComputerObserveRequest,
  context: ComputerUseContext,
  sourceTool: 'computer_observe' | 'computer_action',
  preObserved?: BackendObservation,
): Promise<ComputerObservation> {
  const signal = AbortSignal.any([context.signal, host.lifetime])
  const screenshot = request.screenshot ?? 'optional'
  // A pre-observed frame is reused whenever it already carries the evidence
  // the caller asked for: `none` needs no screenshot, and any other mode needs
  // the frame to have one. A frame that lacks it is never downgraded in place,
  // the provider is asked again instead.
  const reuse = preObserved !== undefined && (screenshot === 'none' || preObserved.screenshot !== undefined)
  // A reused frame needs no artifact path, and a `none` request needs no file.
  const screenshotPath = reuse || screenshot === 'none'
    ? undefined
    : await allocateScreenshotPath(context.workspace, host.config.artifactRoot, context.agent.session.id)
  const backend = reuse
    ? preObserved
    : await host.backend.observe(app, {
      screenshot,
      ...(screenshotPath === undefined ? {} : { screenshotPath }),
      maxNodes: host.config.maxNodes,
      maxDepth: host.config.maxDepth,
      maxTextBytes: host.config.maxTextBytes,
    }, signal)
  if (backend.app.bundleId !== app.bundleId || backend.app.pid !== app.pid) {
    throw new ComputerUseError('COMPUTER_STALE_OBSERVATION', 'the selected application restarted or resolved to a different process')
  }
  const state = host.ledger.stateOf(context.agent)
  host.ledger.prune(context.agent)
  const key = `${app.bundleId}:${app.pid}`
  const previousId = state.latestByApp.get(key)
  const previous = previousId === undefined ? undefined : state.observations.get(previousId)
  const projected = publicElements(backend)
  const elements = projected.elements
  const full = request.full === true || previous === undefined
  const createdAt = Date.now()
  const observationId = ComputerObservationId(randomUUID())
  const artifact = backend.screenshot === undefined
    ? undefined
    : await describeScreenshot(
      backend.screenshot.path,
      backend.screenshot.width,
      backend.screenshot.height,
      host.config.maxScreenshotBytes,
      sourceTool,
    )
  const observation: ComputerObservation = {
    observationId,
    app: backend.app,
    createdAt: new Date(createdAt).toISOString(),
    expiresAt: host.config.observationTtlMs === 0
      ? '9999-12-31T23:59:59.999Z'
      : new Date(createdAt + host.config.observationTtlMs).toISOString(),
    frontmost: backend.frontmost,
    ...(backend.window === undefined ? {} : { window: backend.window }),
    tree: {
      mode: full ? 'full' : 'diff',
      text: full ? backend.treeText : diffElements(previous.public.elements, elements, host.config.maxTextBytes),
      truncated: backend.truncated,
    },
    elements,
    ...(artifact === undefined ? {} : { screenshot: artifact }),
    permissions: backend.permissions,
  }
  host.ledger.store(context.agent, key, observation, backend, projected.targets)
  return observation
}
