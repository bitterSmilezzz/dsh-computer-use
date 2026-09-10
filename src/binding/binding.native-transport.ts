/**
 * Binding native transport: the subprocess JSON-line transport, the one-shot
 * command client, and the drag barrier protocol.
 *
 * The helper is a separate process, so everything it sends back is untrusted
 * input: replies are size-bounded by the transport, decoded defensively, and an
 * error code the published vocabulary does not know becomes a provider failure
 * rather than being asserted into the union.
 */

import { dirname, resolve } from 'node:path'
import { createInterface, type Interface } from 'node:readline'
import type { Writable } from 'node:stream'
import type { Context } from '@deepseek-ai/cordis'
import type { SubprocessHandle, SubprocessOutcome } from '@deepseek-ai/dsh-subprocess'
import type { CursorVisibility } from '../charter/charter.context.ts'
import type { ResolvedComputerUseConfig } from '../tuning/tuning.schema.ts'
import { ComputerUseError, computerUseError, computerUseErrorCode } from '../charter/charter.fault.ts'
import { collected, nativeRoot, prepareNativeHelper, type PreparedNativeHelper } from './binding.native-manifest.ts'
import {
  disposeCursorOwner,
  executeCursorCommand,
  type CursorOwner,
  type CursorProcess,
} from './binding.native-cursor.ts'

/** Largest single reply line the transport accepts before it gives up on the child. */
const REPLY_MAX_BYTES = 4 * 1024 * 1024

/** Diagnostics are quoted back to the model, so their collected tail stays small. */
const STDERR_MAX_BYTES = 64 * 1024

/** A child that ignores its termination request gets one second before it is killed. */
const TERMINATION_GRACE_MS = 1000

/** One provider-reported failure as the helper serializes it. */
interface HelperFailureDetail {
  /** Untrusted provider-reported string; validated against the public vocabulary before use. */
  code: string
  message: string
}

/** A refusal: the command did not run, and the reason is bounded provider text. */
interface HelperFailureFrame {
  ok: false
  error: HelperFailureDetail
}

/** The value half of a successful helper reply. */
interface HelperSuccessFrame<T> {
  ok: true
  value: T
}

/** The two reply shapes a helper command can produce. */
type HelperFrame<T> = HelperFailureFrame | HelperSuccessFrame<T>

/** The child environment every helper process gets, so its own diagnostics read cleanly. */
function childEnvironment(): NodeJS.ProcessEnv {
  return {
    LANG: process.env.LANG ?? 'en_US.UTF-8',
    LC_ALL: process.env.LC_ALL ?? 'en_US.UTF-8',
  }
}

/**
 * Decode one provider reply line.
 *
 * The label names the protocol in the failure message, because the one-shot and
 * drag protocols report invalid JSON differently.
 */
function decodeFrame<T>(raw: string, label: string): HelperFrame<T> {
  try {
    return JSON.parse(raw) as HelperFrame<T>
  } catch (error) {
    throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', label, { cause: error })
  }
}

/**
 * Turn one provider-reported failure into a bounded {@link ComputerUseError}.
 *
 * A code outside the published vocabulary becomes COMPUTER_PROVIDER_FAILURE with
 * the raw code preserved in the model-facing message, so a newer helper is still
 * diagnosable instead of being asserted into the union.
 */
function unwrapFailure(error: HelperFailureDetail): never {
  const message = error.message.slice(0, 1000)
  const code = computerUseErrorCode(error.code)
  throw code === undefined
    ? new ComputerUseError('COMPUTER_PROVIDER_FAILURE', `native helper reported an unknown error code ${error.code}: ${message}`)
    : new ComputerUseError(code, message)
}

/** One helper that exited without a usable reply, quoted with its bounded stderr tail. */
function exitFailure(exitCode: number | null, stderr: string): ComputerUseError {
  const tail = stderr.trim()
  return new ComputerUseError(
    'COMPUTER_PROVIDER_FAILURE',
    `native helper exited ${String(exitCode)}${tail.length === 0 ? '' : `: ${tail.slice(0, 1000)}`}`,
  )
}

/** Settle a pending promise with `abortReason()` as soon as `signal` aborts. */
function abortable<T>(pending: Promise<T>, signal: AbortSignal, abortReason: () => unknown): Promise<T> {
  return new Promise<T>((resolvePromise, rejectPromise) => {
    const onAbort = (): void => { rejectPromise(abortReason()) }
    if (signal.aborted) {
      onAbort()
      return
    }
    signal.addEventListener('abort', onAbort, { once: true })
    void pending.then(resolvePromise, rejectPromise).finally(() => {
      signal.removeEventListener('abort', onAbort)
    })
  })
}

/** The value of one successful reply, or the refusal it carries. */
function unwrapFrame<T>(frame: HelperFrame<T>): T {
  if (frame.ok !== true) unwrapFailure(frame.error)
  return frame.value
}

/** Explicit pre-mouse-down barrier around one validated native drag. */
export interface PreparedNativeDrag<T> {
  readonly result: Promise<T>
  start(): Promise<void>
  cancel(): void
}

/**
 * One drag barrier's pipes.
 *
 * The helper holds the drag until it receives `START`, so both sides of the
 * protocol matter: replies arrive one line at a time and the process is owned by
 * a signal this channel controls. Cancellation is bridged in exactly one place —
 * the caller's abort only tears the process down while mouse-down is still
 * impossible.
 */
class DragChannel {
  /** True once START has been written; from then on the native motion owns the process. */
  private started = false

  private readonly onCallerAbort = (): void => {
    if (!this.started) this.processAbort.abort()
  }

  private constructor(
    private readonly processAbort: AbortController,
    private readonly handle: SubprocessHandle,
    private readonly callerSignal: AbortSignal,
    private readonly stdin: Writable,
    private readonly lines: Interface,
    private readonly replies: AsyncIterator<string>,
  ) {
    callerSignal.addEventListener('abort', this.onCallerAbort)
  }

  /** Spawn the drag helper and take ownership of its protocol pipes. */
  static async open(ctx: Context, prepared: PreparedNativeHelper, callerSignal: AbortSignal): Promise<DragChannel> {
    const processAbort = new AbortController()
    const handle = ctx.subprocess.spawn({
      argv: [prepared.path, '--drag-action'],
      cwd: dirname(prepared.path),
      stdio: {
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: { maxBytes: STDERR_MAX_BYTES },
      },
      graceMs: TERMINATION_GRACE_MS,
      signal: processAbort.signal,
      env: childEnvironment(),
    })
    if (handle.stdin === undefined || handle.stdout === undefined) {
      handle.terminate()
      await handle.waitForExit()
      throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', 'native drag barrier protocol pipes are unavailable')
    }
    const stdin = handle.stdin
    const stdout = handle.stdout
    stdin.on('error', () => {
      // Write callbacks and process completion own protocol error reporting.
    })
    const lines = createInterface({ input: stdout, crlfDelay: Infinity })
    return new DragChannel(
      processAbort,
      handle,
      callerSignal,
      stdin,
      lines,
      lines[Symbol.asyncIterator](),
    )
  }

  /** The process-ownership signal: aborting it tears the drag helper down. */
  get signal(): AbortSignal {
    return this.processAbort.signal
  }

  /** The child's exit outcome, resolved when it terminates on its own. */
  async outcome(): Promise<SubprocessOutcome> {
    return await this.handle.done
  }

  /** The child's exit outcome, with a failure swallowed for teardown paths. */
  async exited(): Promise<void> {
    await this.handle.done.catch(() => undefined)
  }

  /** Stop bridging caller cancellation; the barrier outcome decides from here. */
  detach(): void {
    this.callerSignal.removeEventListener('abort', this.onCallerAbort)
  }

  /** Release the readline reader; the process itself is torn down separately. */
  close(): void {
    this.lines.close()
  }

  /** Tear the child process down. */
  abort(): void {
    this.processAbort.abort()
  }

  /** Write one protocol line; the write callback owns reporting a closed pipe. */
  async write(line: string): Promise<void> {
    await new Promise<void>((resolveWrite, rejectWrite) => {
      this.stdin.write(`${line}\n`, error => {
        if (error === undefined || error === null) resolveWrite()
        else rejectWrite(error)
      })
    })
  }

  /** The next reply line, bounded by the caller's read budget. */
  async read(readSignal: AbortSignal): Promise<string> {
    const next = await this.nextLine(readSignal)
    if (next.done === true) throw new Error('native drag helper closed before replying')
    if (Buffer.byteLength(next.value) > REPLY_MAX_BYTES) throw new Error('native drag helper response exceeded its protocol limit')
    return next.value
  }

  /** One iterator step that gives up as soon as the read signal aborts. */
  private async nextLine(readSignal: AbortSignal): Promise<IteratorResult<string>> {
    if (readSignal.aborted) throw readSignal.reason
    const step = this.replies.next()
    return await new Promise<IteratorResult<string>>((resolveStep, rejectStep) => {
      const onAbort = (): void => { rejectStep(readSignal.reason) }
      readSignal.addEventListener('abort', onAbort, { once: true })
      const settle = (): void => { readSignal.removeEventListener('abort', onAbort) }
      void step.then(
        value => { settle(); resolveStep(value) },
        error => { settle(); rejectStep(error) },
      )
    })
  }

  /**
   * Let the native drag begin. This is the point of no return: the caller's
   * cancellation stops owning the process, because the bounded native motion has
   * to reach mouse-up.
   */
  async start(): Promise<void> {
    if (this.started) return
    if (this.callerSignal.aborted) {
      this.abort()
      throw new ComputerUseError('COMPUTER_CANCELLED', 'native drag action was cancelled before mouse-down')
    }
    this.started = true
    this.detach()
    try {
      await this.write('START')
    } catch (error) {
      this.abort()
      throw computerUseError(error, 'native drag start barrier failed')
    }
  }

  /** Give up on the drag while mouse-down is still impossible; after START this is a no-op. */
  cancelStart(): void {
    if (!this.started) this.abort()
  }
}

/** Invokes only the packaged JSON protocol through `ctx.subprocess`; no source or shell reaches the helper. */
export class NativeHelperClient {
  private readonly managedRoot: string
  private preparedState?: PreparedNativeHelper
  /** Overlay process generation; owned here, driven by the cursor protocol module. */
  cursor: CursorProcess | undefined
  /** In-flight overlay spawn, so concurrent commands share one process. */
  cursorStart: { promise: Promise<CursorProcess> } | undefined
  private cursorCommandTail: Promise<void> = Promise.resolve()
  private disposed = false

  constructor(
    private readonly ctx: Context,
    private readonly config: ResolvedComputerUseConfig,
    managedRoot = nativeRoot(),
  ) {
    this.managedRoot = managedRoot
  }

  /** Absolute executable path selected by explicit override or the packaged managed binary. */
  get helperPath(): string {
    return this.preparedState?.path ?? this.config.helper.path ?? resolve(this.managedRoot, 'bin', 'dsh-computer-use-helper')
  }

  /** Exactly the helper preparation and cursor command paths read. */
  get prepared(): PreparedNativeHelper | undefined {
    return this.preparedState
  }

  /** Verify platform, file type, packaged hash, and executable mode before use. */
  async prepare(signal: AbortSignal): Promise<PreparedNativeHelper> {
    const prepared = await prepareNativeHelper({
      ctx: this.ctx,
      config: this.config,
      managedRoot: this.managedRoot,
      helperPath: this.helperPath,
    }, signal)
    this.preparedState = prepared
    return prepared
  }

  /** Invoke one fixed helper command and parse its bounded JSON envelope. */
  async invoke<T>(request: Record<string, unknown>, signal: AbortSignal): Promise<T> {
    const prepared = this.preparedState ?? await this.prepare(signal)
    const combined = AbortSignal.any([signal, AbortSignal.timeout(this.config.actionTimeoutMs)])
    const handle = this.ctx.subprocess.spawn({
      argv: [prepared.path],
      cwd: dirname(prepared.path),
      stdio: {
        stdin: { data: `${JSON.stringify({ protocolVersion: 1, ...request })}\n` },
        stdout: { maxBytes: REPLY_MAX_BYTES },
        stderr: { maxBytes: STDERR_MAX_BYTES },
      },
      graceMs: TERMINATION_GRACE_MS,
      signal: combined,
      env: childEnvironment(),
    })
    let outcome: SubprocessOutcome
    try {
      outcome = await handle.done
    } catch (error) {
      throw computerUseError(error, 'native helper failed to start')
    }
    if (combined.aborted) throw this.abortReason(signal)
    const stdout = collected(handle.collected.stdout)
    const stderr = collected(handle.collected.stderr)
    if (outcome.exitCode !== 0 && stdout.trim().length === 0) throw exitFailure(outcome.exitCode, stderr)
    return unwrapFrame<T>(decodeFrame<T>(stdout, 'native helper returned invalid JSON'))
  }

  /**
   * Why a helper call ended before its reply: the caller cancelled it, or its
   * action deadline expired. Callers only reach this after the child has exited,
   * so no process is left behind either way.
   */
  private abortReason(callerSignal: AbortSignal): ComputerUseError {
    return callerSignal.aborted
      ? new ComputerUseError('COMPUTER_CANCELLED', 'native helper call was cancelled')
      : new ComputerUseError('COMPUTER_TIMEOUT', `native helper exceeded ${this.config.actionTimeoutMs} milliseconds`)
  }

  /** Prepare and validate a drag, then wait for an explicit pre-mouse-down start barrier. */
  async prepareDrag<T>(
    request: Record<string, unknown>,
    signal: AbortSignal,
    readinessTimeoutMs: number,
  ): Promise<PreparedNativeDrag<T>> {
    const prepared = this.preparedState ?? await this.prepare(signal)
    if (signal.aborted) throw new ComputerUseError('COMPUTER_CANCELLED', 'native drag preparation was cancelled')
    const channel = await DragChannel.open(this.ctx, prepared, signal)
    const readinessTimeout = AbortSignal.timeout(readinessTimeoutMs)
    try {
      await channel.write(JSON.stringify({ protocolVersion: 1, ...request }))
      const readySignal = AbortSignal.any([signal, readinessTimeout, channel.signal])
      const ready = JSON.parse(await channel.read(readySignal)) as Record<string, unknown>
      if (ready.ok !== true || ready.event !== 'drag-ready') {
        throw new Error('native drag helper returned an invalid ready frame')
      }
    } catch (error) {
      channel.abort()
      await channel.exited()
      channel.detach()
      channel.close()
      if (signal.aborted) throw new ComputerUseError('COMPUTER_CANCELLED', 'native drag preparation was cancelled', { cause: error })
      if (readinessTimeout.aborted) {
        throw new ComputerUseError('COMPUTER_TIMEOUT', `native drag preparation exceeded ${readinessTimeoutMs} milliseconds`, { cause: error })
      }
      throw computerUseError(error, 'native drag preparation failed')
    }

    const result = (async (): Promise<T> => {
      try {
        const raw = await channel.read(channel.signal)
        const outcome = await channel.outcome()
        const frame = decodeFrame<T>(raw, 'native drag helper returned invalid JSON')
        if (frame.ok !== true) unwrapFailure(frame.error)
        if (outcome.exitCode !== 0) {
          throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', `native drag helper exited ${String(outcome.exitCode)}`)
        }
        if (signal.aborted) throw new ComputerUseError('COMPUTER_CANCELLED', 'native drag action was cancelled after safe mouse release')
        return frame.value
      } catch (error) {
        if (error instanceof ComputerUseError && error.code === 'COMPUTER_CANCELLED') throw error
        if (signal.aborted) {
          throw new ComputerUseError('COMPUTER_CANCELLED', 'native drag action was cancelled', { cause: error })
        }
        throw computerUseError(error, 'native drag action failed')
      } finally {
        channel.detach()
        channel.close()
      }
    })()
    void result.catch(() => undefined)
    return {
      result,
      start: () => channel.start(),
      cancel: () => { channel.cancelStart() },
    }
  }

  /** Send one serialized command to the persistent, click-through Agent cursor overlay. */
  cursorCommand(
    command: Record<string, unknown>,
    signal: AbortSignal,
    onWritten?: () => void | Promise<void>,
  ): Promise<CursorVisibility> {
    const run = this.enqueueCursorCommand(command, signal, onWritten)
    return abortable(run, signal, () => new ComputerUseError('COMPUTER_CANCELLED', 'native cursor overlay command was cancelled'))
  }

  /**
   * Chain one overlay command behind the one before it. The chain survives a
   * failed command — the next command still runs against the current generation —
   * and the refusal itself reaches the caller through the returned promise.
   */
  private enqueueCursorCommand(
    command: Record<string, unknown>,
    signal: AbortSignal,
    onWritten?: () => void | Promise<void>,
  ): Promise<CursorVisibility> {
    const run = this.cursorCommandTail.then(async () => {
      if (signal.aborted) throw new ComputerUseError('COMPUTER_CANCELLED', 'native cursor overlay command was cancelled')
      if (this.disposed) throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', 'native cursor overlay client is disposed')
      return await this.runCursorCommand(command, signal, onWritten)
    })
    this.cursorCommandTail = run.then(() => undefined, () => undefined)
    return run
  }

  /**
   * Drive the overlay for one command. Exposed for the cursor protocol only;
   * callers go through {@link cursorCommand} for serialization.
   */
  async runCursorCommand(
    command: Record<string, unknown>,
    signal: AbortSignal,
    onWritten?: () => void | Promise<void>,
  ): Promise<CursorVisibility> {
    return await executeCursorCommand(
      this as unknown as CursorOwner & {
        readonly prepared: PreparedNativeHelper | undefined
        prepare(signal: AbortSignal): Promise<PreparedNativeHelper>
      },
      command,
      signal,
      onWritten,
    )
  }

  /** Retire the current overlay process generation and clear it from this client. */
  discardCursor(cursor: CursorProcess): void {
    if (this.cursor === cursor) this.cursor = undefined
    cursor.terminate()
  }

  /** Stop the cursor process before a provider generation is replaced or disposed. */
  async dispose(): Promise<void> {
    this.disposed = true
    await disposeCursorOwner(this as unknown as {
      readonly cursorCommandTail: Promise<void>
      cursor: CursorProcess | undefined
      cursorStart: { promise: Promise<CursorProcess> } | undefined
    })
  }

  /** Prepared integrity facts used by provider health. */
  preparedInfo(): PreparedNativeHelper {
    if (this.preparedState === undefined) throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', 'native helper is not prepared')
    return this.preparedState
  }
}
