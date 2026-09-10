/**
 * Binding native manifest: helper path resolution, packaged hash/version
 * verification, and the explicit source-build path.
 */

import { createHash } from 'node:crypto'
import { access, chmod, lstat, readFile, realpath, stat } from 'node:fs/promises'
import { constants, type Stats } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type { SubprocessHandle } from '@deepseek-ai/dsh-subprocess'
import type { ResolvedComputerUseConfig } from '../tuning/tuning.schema.ts'
import { ComputerUseError } from '../charter/charter.fault.ts'

interface NativeManifest {
  schemaVersion: 1
  helperVersion: string
  sourceSha256: string
  binary: {
    path: string
    sha256: string
    architectures: string[]
    minimumMacOS: string
  }
}

/** Exact helper paths and integrity data for one active generation. */
export interface PreparedNativeHelper {
  path: string
  version: string
  sha256: string
}

/** Subprocess capability the manifest preparation needs. */
export interface NativeHelperSubprocessContext {
  readonly ctx: Context
}

/** Absolute path of the packaged helper directory inside this installation. */
export function nativeRoot(): string {
  return fileURLToPath(new URL('../../native/macos/', import.meta.url))
}

/** Collect one bounded protocol stream, failing closed on lossy truncation. */
export function collected(reader: { readFrom(offset: number): { lossy: boolean; text: string } } | undefined): string {
  if (reader === undefined) return ''
  const value = reader.readFrom(0)
  if (value.lossy) throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', 'native helper output exceeded its protocol limit')
  return value.text
}

async function sha256(path: string): Promise<string> {
  return createHash('sha256').update(await readFile(path)).digest('hex')
}

/**
 * Verify platform, file type, packaged hash, and executable mode before use.
 *
 * The managed helper is located relative to this module, so the path segment
 * count is part of the build layout rather than free-form configuration.
 */
export async function prepareNativeHelper(
  client: NativeHelperSubprocessContext & {
    readonly config: ResolvedComputerUseConfig
    readonly managedRoot: string
    readonly helperPath: string
    prepared?: PreparedNativeHelper
  },
  signal: AbortSignal,
): Promise<PreparedNativeHelper> {
  if (process.platform !== 'darwin') {
    throw new ComputerUseError('COMPUTER_UNSUPPORTED_PLATFORM', `macOS provider cannot run on ${process.platform}`)
  }
  const managed = client.config.helper.path === undefined
  let path = client.helperPath
  let selectedInfo: Stats
  try {
    selectedInfo = await lstat(path)
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === 'ENOENT'
    if (!managed || !missing || !client.config.helper.allowSourceBuild) {
      throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', `native helper is missing or unreadable: ${path}`, { cause: error })
    }
    await buildManagedHelper(client, signal)
    selectedInfo = await lstat(path)
  }
  if (!selectedInfo.isFile() || selectedInfo.isSymbolicLink()) {
    throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', 'native helper must be a regular non-symbolic-link executable')
  }
  path = await realpath(path)
  const digest = await sha256(path)
  let version = 'external'
  if (managed) {
    const manifestPath = resolve(client.managedRoot, 'manifest.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as NativeManifest
    if (manifest.schemaVersion !== 1 || manifest.binary.path !== 'bin/dsh-computer-use-helper') {
      throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', 'native helper manifest is malformed')
    }
    if (manifest.binary.sha256 !== digest) {
      throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', 'native helper hash does not match native/macos/manifest.json')
    }
    version = manifest.helperVersion
  }
  try {
    await access(path, constants.X_OK)
  } catch (error) {
    if (!managed) {
      throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', `external native helper is not executable: ${path}`, { cause: error })
    }
    try {
      // npm-compatible tarballs normalize non-bin payloads to 0644. Restore
      // only the owner's execute bit after the committed hash is verified.
      await chmod(path, (selectedInfo.mode & 0o777) | 0o100)
      await access(path, constants.X_OK)
    } catch (chmodError) {
      throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', `managed native helper cannot be marked executable: ${path}`, { cause: chmodError })
    }
  }
  return { path, version, sha256: digest }
}

/** Run the packaged native build for the managed helper and confirm it produced a file. */
export async function buildManagedHelper(
  client: NativeHelperSubprocessContext & { readonly helperPath: string },
  signal: AbortSignal,
): Promise<void> {
  const script = fileURLToPath(new URL('../../scripts/build-native.mjs', import.meta.url))
  const handle: SubprocessHandle = client.ctx.subprocess.spawn({
    argv: [process.execPath, script, '--helper-only'],
    cwd: dirname(script),
    stdio: {
      stdin: 'ignore',
      stdout: { maxBytes: 256 * 1024 },
      stderr: { maxBytes: 256 * 1024 },
    },
    graceMs: 1000,
    signal,
    env: {},
  })
  const outcome = await handle.done
  if (outcome.exitCode !== 0) {
    const stderr = collected(handle.collected.stderr)
    throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', `explicit native source build failed: ${stderr.slice(0, 1000)}`)
  }
  const info = await stat(client.helperPath).catch(() => undefined)
  if (info?.isFile() !== true) throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', 'native source build completed without producing the helper')
}
