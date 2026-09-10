/**
 * Toolbelt handoff: what a Tool returns to the model, how a Tool call is bound
 * to one Agent Session, and how visual evidence is handed to the Vision Toolkit.
 */

import { createUserMessage, type ContentBlock } from '@deepseek-ai/dsh-llm'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import type { ComputerArtifact, ComputerUseContext } from '../charter/charter.index.ts'
import { actionResultSchema } from './toolbelt.schema.ts'

export function renderJson(_args: unknown, value: unknown): ContentBlock[] {
  const text = JSON.stringify(value, null, 2)
  return [{ type: 'text', text }]
}

export function contextOf(exec: ToolRunContext): ComputerUseContext {
  const agent = exec.agent
  if (agent === undefined) throw new Error(`${exec.name}: an Agent Session is required`)
  return {
    signal: exec.signal,
    workspace: agent.session.header.cwd ?? process.cwd(),
    agent,
    callId: exec.callId,
  }
}

export function deferVisionHandoff(exec: ToolRunContext, artifact: ComputerArtifact | undefined): void {
  if (artifact === undefined) return
  const guidance = [
    `Computer Use returned a screenshot Artifact at ${JSON.stringify(artifact.path)}.`,
    'If the task now needs OCR, visual grounding, or pixel inspection and vision_glance is not visible, call the skill tool with {"name":"vision-tools"}; then pass this exact Artifact path to vision_glance, vision_ground, vision_detect, vision_crop, or vision_long_screenshot_ocr.',
    'Do not inspect OCR executables or use bash, tesseract, screencapture, or an ad hoc Swift/Python OCR implementation.',
  ].join(' ')
  exec.deferContext(createUserMessage({
    content: [{ type: 'text', text: guidance }],
    source: { kind: 'plugin', plugin: 'dsh-computer-use' },
  }))
}

export function artifactPresentation(artifact: ComputerArtifact): JsonValue {
  const { path, filename, mimeType, kind, description, sourceTool, previewIntent, bytes, width, height } = artifact
  return { path, filename, mimeType, kind, description, sourceTool, previewIntent, bytes, width, height }
}

export function actionOutput() {
  const presentationMeta = (
    _args: unknown,
    value: { observation: { screenshot?: ComputerArtifact } },
  ): JsonValue => {
    const screenshot = value.observation.screenshot
    if (screenshot === undefined) return {}
    return { artifacts: [artifactPresentation(screenshot)] }
  }
  return { schema: actionResultSchema, render: renderJson, presentationMeta }
}
