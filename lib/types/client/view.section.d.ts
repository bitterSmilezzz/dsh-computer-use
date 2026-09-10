/**
 * Settings section — the Computer Use card rendered inside the DSH Settings page.
 *
 * One Settings document drives the whole card. The macOS permission tiles and
 * the everyday "every app" decision come first, the save bar follows, and the
 * technical half — input routing, numeric ceilings, cursor motion, helper
 * provenance, per-app rules — sits behind a single Advanced disclosure so the
 * common flow never has to scroll past it.
 */
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { Translate } from './copy.en.ts';
import type { ComputerUseSettingsController } from './state.controller.ts';
/** Slot props plus the controller and translator `apply` injects next to them. */
type SectionProps = PropsRuntime<'settings.section'> & {
    controller?: ComputerUseSettingsController;
    t?: Translate;
};
declare function SettingsSection({ controller, t }: SectionProps): import("react").JSX.Element | null;
export { SettingsSection };
//# sourceMappingURL=view.section.d.ts.map