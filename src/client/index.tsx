/**
 * Browser entry — mounts the Computer Use settings section into the DSH
 * Settings page.
 *
 * The client loader reads `inject` to know which client services must exist
 * before the factory runs, then calls `apply`; everything registered here is
 * torn down again when the plugin unloads.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// The settings-document event and the connection-reset hook arrive through these services.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// `connection/reset` is declared by the connection plugin's client half; the
// type-only import pulls that augmentation into this program.
import type {} from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-settings/types'
// Type-only: brings in the ui-renderer Context merge that declares ctx.slots.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { en } from './copy.en.ts'
import { zh } from './copy.zh.ts'
import { ComputerUseSettingsController, NS } from './state.controller.ts'
import { SettingsSection } from './view.section.tsx'
import { installStyles } from './view.styles.ts'

// Still part of the browser half's public surface: callers may parse a bounded
// numeric field from the entry, even though the implementation now sits beside
// the envelope it validates against.
export { integerInRange } from './guard.bounds.ts'

/** Client services this plugin depends on. */
export const inject = ['slots', 'locale', 'remote']

/** Register the Computer Use Settings section. */
export function apply(ctx: ClientContext): void {
  ctx.effect(installStyles, 'dsh-computer-use: styles')
  ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'dsh-computer-use: locale')

  const t = ctx.locale.bind(NS)
  const controller = new ComputerUseSettingsController()
  const sectionLabel = (): string => t('nav')
  const sectionProps = () => ({ controller, t })

  // The stored document can change under the open card: another client saves
  // it, or the connection comes back after a reset. Both paths re-read, and
  // `refreshIfLoaded` keeps that a no-op while nothing is on screen yet.
  ctx.effect(() => {
    const stopDocument = ctx.remote.$on('settings/document-updated', (namespace: string) => {
      if (namespace === NS) controller.refreshIfLoaded()
    })
    const stopReset = ctx.on('connection/reset', () => { controller.refreshIfLoaded() })
    return () => { stopDocument(); stopReset() }
  }, 'dsh-computer-use: Settings invalidation')

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'computer-use',
    order: 35,
    label: sectionLabel,
    inject: sectionProps,
  }, SettingsSection))
}
