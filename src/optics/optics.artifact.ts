/** Optics artifact: workspace-fenced screenshot artifact allocation and validation. */

import { randomUUID } from 'node:crypto'
import { lstat, mkdir, realpath, stat } from 'node:fs/promises'
import { basename, isAbsolute, relative, resolve, sep } from 'node:path'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { ComputerUseError } from '../charter/charter.fault.ts'
import type { ComputerArtifact } from '../charter/charter.index.ts'

/**
 * Pixel-level work belongs to the sibling Vision Toolkit, so every screenshot
 * Artifact carries the same handoff text: what this image is, and the exact
 * native tools that may be pointed at this path.
 */
const SCREENSHOT_HANDOFF = [
  'For OCR, visual grounding, or pixel inspection, load the vision-tools Skill and pass this exact path to vision_glance, vision_ground, vision_detect, or vision_crop;',
  'do not recreate OCR with bash, tesseract, or an ad hoc script.',
].join(' ')

/** Screenshot description that hands visual analysis to the sibling Vision Toolkit. */
export const COMPUTER_SCREENSHOT_DESCRIPTION = `Current macOS application window observation. ${SCREENSHOT_HANDOFF}`

/** True when `candidate` is `root` itself or lives underneath it. */
function isWithin(root: string, candidate: string): boolean {
  const rel = relative(root, candidate)
  if (rel === '') return true
  if (isAbsolute(rel)) return false
  return rel !== '..' && !rel.startsWith(`..${sep}`)
}

/**
 * Whether a path that may not exist yet is a symbolic link. Only a missing path
 * is treated as "not a link"; every other failure still surfaces.
 */
async function isSymbolicLink(path: string): Promise<boolean> {
  try {
    return (await lstat(path)).isSymbolicLink()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

/**
 * Refuse a target whose existing ancestors already contain a symbolic link, so a
 * link planted inside the workspace cannot redirect the write outside it.
 */
async function rejectSymlinkComponents(root: string, target: string): Promise<void> {
  const components = relative(root, target).split(sep).filter(Boolean)
  for (let reached = 0; reached < components.length; reached += 1) {
    const walked = resolve(root, ...components.slice(0, reached + 1))
    if (await isSymbolicLink(walked)) {
      throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', `artifact path component must not be a symbolic link: ${components[reached]}`)
    }
  }
}

/** Allocate a unique managed PNG path inside the current Session workspace. */
export async function allocateScreenshotPath(
  workspace: string,
  artifactRoot: string,
  sessionId: SessionId,
): Promise<string> {
  const workspaceRoot = await realpath(workspace)
  const directory = resolve(workspaceRoot, artifactRoot, String(sessionId))
  if (!isWithin(workspaceRoot, directory)) {
    throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', 'artifactRoot escapes the Session workspace')
  }
  await rejectSymlinkComponents(workspaceRoot, directory)
  await mkdir(directory, { recursive: true, mode: 0o700 })
  const settledDirectory = await realpath(directory)
  if (!isWithin(workspaceRoot, settledDirectory)) {
    throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', 'artifact directory escaped the Session workspace')
  }
  return resolve(settledDirectory, `observation-${randomUUID()}.png`)
}

/**
 * Confirm the capture exists as a regular file and return its byte size. A
 * symlink or a non-file is rejected: the Artifact path must address the pixels
 * themselves, not an indirection.
 */
async function measureRegularFile(path: string): Promise<number> {
  const link = await lstat(path).catch((error: unknown) => {
    throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', 'the screenshot artifact was not created', { cause: error })
  })
  if (link.isSymbolicLink() || !link.isFile()) {
    throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', 'the screenshot artifact must be a regular non-symbolic-link file')
  }
  return (await stat(path)).size
}

/** Reject a capture whose pixels the provider could not report as positive integers. */
function requireDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', 'provider returned invalid screenshot dimensions')
  }
}

/** Build the stable descriptor both the model and the client read for one capture. */
function artifactDescriptor(
  path: string,
  bytes: number,
  width: number,
  height: number,
  sourceTool: ComputerArtifact['sourceTool'],
): ComputerArtifact {
  return {
    path,
    filename: basename(path),
    mimeType: 'image/png',
    kind: 'image',
    description: COMPUTER_SCREENSHOT_DESCRIPTION,
    sourceTool,
    previewIntent: 'image',
    bytes,
    width,
    height,
  }
}

/** Validate a committed screenshot and return its stable model/client descriptor. */
export async function describeScreenshot(
  path: string,
  width: number,
  height: number,
  maxBytes: number,
  sourceTool: ComputerArtifact['sourceTool'],
): Promise<ComputerArtifact> {
  const bytes = await measureRegularFile(path)
  if (bytes > maxBytes) {
    throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', `screenshot exceeds maxScreenshotBytes (${bytes} > ${maxBytes})`)
  }
  requireDimensions(width, height)
  return artifactDescriptor(path, bytes, width, height, sourceTool)
}
