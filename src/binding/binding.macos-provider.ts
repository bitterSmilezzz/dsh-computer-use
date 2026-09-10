/** Binding macOS provider: Cordis Service assembly over the native backend. */

import { Service, type Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-subprocess'
import type {} from '@deepseek-ai/dsh-user-approval'
import {
  Config,
  COMPUTER_USE_SETTINGS_NAMESPACE,
  type ComputerUseConfig,
  type ResolvedComputerUseConfig,
} from '../tuning/tuning.schema.ts'
import { resolveConfig } from '../tuning/tuning.normalize.ts'
import { ComputerUseService } from '../conductor/conductor.service.ts'
import { MacOSBackend } from './binding.macos.ts'
import { UnsupportedPlatformBackend } from './binding.absent.ts'
import type { ComputerUseBackend } from './binding.port.ts'

const PROVIDER_INJECT = ['subprocess', 'approval', 'settings', 'sessions', 'agents']

/** The backend this host can actually run. */
function selectBackend(ctx: Context, config: ResolvedComputerUseConfig): ComputerUseBackend {
  if (process.platform === 'darwin') return new MacOSBackend(ctx, config)
  return new UnsupportedPlatformBackend(process.platform)
}

/** Cordis Service provider loaded by the Bundle before the model-facing consumer. */
export class MacOSComputerUseProvider extends ComputerUseService {
  static inject = [...PROVIDER_INJECT]
  static Config = Config

  private readonly settings

  constructor(ctx: Context, config: ComputerUseConfig = {}) {
    const settings = ctx.settings.register(COMPUTER_USE_SETTINGS_NAMESPACE, Config, {
      base: config,
      applies: 'live',
      validate: (value) => { resolveConfig(value) },
    })
    const resolved = resolveConfig(settings.get())
    super(ctx, selectBackend(ctx, resolved), resolved)
    this.settings = settings
    if (process.platform !== 'darwin') {
      ctx.logger.warn('dsh-computer-use: supports macOS only; Computer Use Tools are disabled on %s', process.platform)
    }
    ctx.effect(() => this.settings.watch(async (next) => {
      const candidate = resolveConfig(next)
      const swapped = selectBackend(ctx, candidate)
      try {
        await this.reconfigure(swapped, candidate)
      } catch (error) {
        await swapped.dispose()
        throw error
      }
    }), 'dsh-computer-use: Settings watch')
    ctx.effect(() => ctx.on('agent/disposed', ({ agent }) => { this.releaseAgent(agent) }), 'dsh-computer-use: Agent cleanup')
  }

  /** Verify helper integrity and permissions before the service is injectable. */
  protected async [Service.init](): Promise<void> {
    await this.initialize()
  }
}

export default MacOSComputerUseProvider
