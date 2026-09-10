/** Binding absent: non-macOS fallback backend that keeps the Service injectable and fails closed. */

import type {
  BackendActionRequest,
  BackendActionResult,
  BackendCursorActivation,
  BackendCursorAction,
  BackendHealth,
  BackendObservation,
  BackendObserveOptions,
  BackendTrackedDragResult,
  CursorVisibility,
} from '../optics/optics.sighting.ts'
import type { ComputerAppIdentity, ComputerAppSelector, ComputerAppSummary } from '../charter/charter.index.ts'
import { ComputerUseError } from '../charter/charter.fault.ts'
import type { ComputerUseBackend } from './binding.port.ts'

/** The single failure this backend reports, naming the host it refused. */
function unsupportedOn(platform: NodeJS.Platform): ComputerUseError {
  return new ComputerUseError(
    'COMPUTER_UNSUPPORTED_PLATFORM',
    `dsh-computer-use supports macOS only; Computer Use is disabled on ${platform}`,
  )
}

/** Backend that reports a clear unavailable state instead of failing profile startup on non-macOS hosts. */
export class UnsupportedPlatformBackend implements ComputerUseBackend {
  readonly name = 'unsupported' as const
  readonly helperPath = ''

  constructor(private readonly platform: NodeJS.Platform) {}

  /** Every capability below refuses with the same typed failure. */
  private refuse<T>(): Promise<T> {
    return Promise.reject(unsupportedOn(this.platform))
  }

  async health(): Promise<BackendHealth> {
    const failure = unsupportedOn(this.platform)
    return {
      ready: false,
      error: failure.message,
      helperVersion: 'unsupported',
      helperSha256: '',
      accessibility: 'unavailable',
      screenRecording: 'unavailable',
    }
  }

  resolveApp(_selector: ComputerAppSelector): Promise<ComputerAppIdentity> {
    return this.refuse()
  }

  listApps(): Promise<ComputerAppSummary[]> {
    return this.refuse()
  }

  observe(_app: ComputerAppIdentity, _options: BackendObserveOptions): Promise<BackendObservation> {
    return this.refuse()
  }

  activateForCursor(
    _app: ComputerAppIdentity,
    _expectedStateHash: string,
    _options: BackendObserveOptions,
  ): Promise<BackendCursorActivation> {
    return this.refuse()
  }

  act(_request: BackendActionRequest): Promise<BackendActionResult> {
    return this.refuse()
  }

  actDragWithCursor(
    _request: BackendActionRequest,
    _cursor: BackendCursorAction & { kind: 'drag' },
  ): Promise<BackendTrackedDragResult> {
    return this.refuse()
  }

  visualizeCursor(_action: BackendCursorAction, _phase: 'before' | 'during' | 'after'): Promise<CursorVisibility> {
    return this.refuse()
  }

  openSettings(_kind: 'accessibility' | 'screen-recording'): Promise<void> {
    return this.refuse()
  }

  async dispose(): Promise<void> {}
}
