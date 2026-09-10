/** Conductor bundle: the DSH Bundle that publishes Computer Use to one profile. */

import { Service, type Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-skill'
import type {} from '@deepseek-ai/dsh-tools'
import { MacOSComputerUseProvider } from '../binding/binding.macos-provider.ts'
import { ComputerUseExposure } from '../playbook/playbook.guard.ts'
import { COMPUTER_USE_SKILL } from '../playbook/playbook.skill.ts'
import { installComputerUseWeb } from '../panel/panel.route.ts'
import { createComputerUseTools } from '../toolbelt/toolbelt.tools.ts'
import { Config, type ComputerUseConfig } from '../tuning/tuning.schema.ts'

const CONSUMER_INJECT = ['subprocess', 'approval', 'settings', 'sessions', 'agents', 'tools', 'skills']

/** Register the portable Skill, bootstrap, Agent-scoped Tools, and optional Web diagnostics. */
export function installComputerUseConsumer(ctx: Context): () => void {
  const exposure = new ComputerUseExposure(ctx, () => createComputerUseTools(ctx.computerUse))
  const disposers: Array<() => void> = []
  try {
    disposers.push(ctx.tools.register(exposure.activationTool))
    disposers.push(ctx.skills.register(COMPUTER_USE_SKILL))
    disposers.push(exposure.install())
    installComputerUseWeb(ctx)
  } catch (error) {
    // Undo only what was registered before the failure, newest first.
    for (let index = disposers.length - 1; index >= 0; index -= 1) disposers[index]?.()
    throw error
  }
  const [activationDispose, skillDispose, exposureDispose] = disposers
  return () => {
    exposureDispose?.()
    activationDispose?.()
    skillDispose?.()
  }
}

/** macOS provider plus the portable Skill, scoped Tools, and optional Web diagnostics. */
export class ComputerUseBundle extends MacOSComputerUseProvider {
  static override inject = [...CONSUMER_INJECT]
  static override Config = Config

  private consumerDispose: (() => void) | undefined

  constructor(ctx: Context, config: ComputerUseConfig = {}) {
    super(ctx, config)
    // The consumer half is torn down together with the provider that owns it.
    ctx.effect(() => () => {
      this.consumerDispose?.()
      this.consumerDispose = undefined
    }, 'dsh-computer-use: consumer lifecycle')
  }

  /** Publish model-facing capabilities only after provider integrity and health pass. */
  protected override async [Service.init](): Promise<void> {
    await super[Service.init]()
    if (process.platform !== 'darwin') {
      // A non-macOS host keeps the profile healthy and reports the reason in Web
      // Settings; neither the Tools nor the Skill ever reach the model there.
      installComputerUseWeb(this.ctx)
      return
    }
    this.consumerDispose = installComputerUseConsumer(this.ctx)
  }
}

export default ComputerUseBundle
