/**
 * Locale copy — English side of the Computer Use settings card, and the key
 * union every other browser-side module imports. `copy.zh.ts` is typed as
 * `Record<LocaleKey, string>`, so adding, dropping, or renaming a key here is a
 * compile error there until both dictionaries agree again.
 */

import type {} from '@deepseek-ai/dsh-client-ui-slots'

export const en = {
  // Card identity, shown in the settings navigation and the footer block.
  nav: 'Computer Use',
  title: 'macOS Computer Use',
  intro: 'Review the native helper, macOS privacy permissions, input routing policy, observation limits, and the exact read/control rules per application.',
  pluginKind: 'Native DSH plugin',

  // macOS permission state, with the buttons that re-read or open it.
  privacy: 'macOS privacy permissions',
  accessibility: 'Accessibility',
  screenRecording: 'Screen Recording',
  granted: 'Allowed',
  denied: 'Permission required',
  openSettings: 'Open System Settings',
  refresh: 'Re-check',

  // Application scope: the everyday decision, plus the pointer to exact rules.
  access: 'Application scope',
  accessHint: 'Decide whether Computer Use may operate on any app. Exact per-app rules can still be supplied under Advanced settings.',
  allowAllApps: 'Let every app be read and controlled',
  allowAllAppsHint: 'While on, per-app rules are ignored and all running apps may be read and controlled.',
  grants: 'Per-app rules',
  grantsHint: 'Each line: one exact app identifier, then read or read,control. Wildcards are not accepted.',

  // Advanced disclosure shell.
  advanced: 'Advanced settings',
  advancedHint: 'Observation limits, helper location, cursor timing, and per-app rules.',

  // How input is routed, and which cursor the agent draws.
  interaction: 'Input routing and foreground behaviour',
  interactionHint: 'By default pointer and keyboard events go only to the chosen process; the system cursor stays put and the app is not brought forward.',
  focusPolicy: 'When a window must come forward',
  focusPreserve: 'Keep the current app in front',
  focusActivate: 'Allow bringing the target app to the front',
  keyboardPolicy: 'Before typing text',
  keyboardPreserve: 'Keep the current app (some apps may reject typing)',
  keyboardActivate: 'Bring the target app forward first',
  pointerInputPolicy: 'Mouse input for the target process',
  pointerDeny: 'Refuse click, drag, and wheel events',
  pointerAllow: 'Send events only to the chosen app',
  cursorVisualization: 'Agent cursor display',
  cursorVisible: 'Draw a separate pass-through agent cursor',
  cursorHidden: 'Keep the agent cursor hidden',
  cursorTiming: 'Agent cursor movement',
  cursorSpeed: 'Target cursor speed ceiling (px/s)',
  cursorAcceleration: 'Cursor acceleration and deceleration (px/s²)',
  cursorClickDelay: 'Pause between arriving and clicking (ms)',
  cursorAutoHide: 'Cursor hides itself after (ms; 0 = always visible)',

  // Observation, action, and settle ceilings.
  limits: 'Observation and action ceilings',
  ttl: 'Observation lifetime (ms; 0 = never expires)',
  confirmationTtl: 'Confirmation lifetime (ms)',
  actionTimeout: 'Per-action timeout (ms)',
  settle: 'Interface re-check interval (ms)',
  maxSettle: 'Longest settlement wait (ms)',
  maxWait: 'Longest computer_wait timeout (ms; raised to the settlement ceiling if lower)',
  maxNodes: 'AX node ceiling per read',
  maxDepth: 'AX tree depth ceiling',
  maxText: 'AX text byte ceiling',
  maxScreenshot: 'Screenshot byte ceiling',
  artifactRoot: 'Artifact directory',

  // Helper provenance and integrity.
  helper: 'Native runtime helper',
  helperUnknown: 'Not detected',
  ready: 'Available',
  unavailable: 'Not usable now',
  generation: 'Applied during this run',
  generationValue: '{generation} time(s)',
  helperPath: 'External helper location',
  helperPathPlaceholder: 'Managed automatically',
  sourceBuild: 'Permit building from source when the helper is missing',
  techDetails: 'Technical information',

  // Drafting, saving, and load state.
  save: 'Apply and save',
  saving: 'Saving...',
  saved: 'Changes applied.',
  unsaved: 'Edits not saved yet',
  discard: 'Revert edits',
  readOnly: 'This settings provider is read-only.',
  loading: 'Reading Computer Use settings...',
  retry: 'Try again',

  // Per-field validation messages.
  numberRange: '{field} has to be a whole number between {min} and {max}.',
  settleExceedsMax: '{settle} cannot exceed {max}.',
  grantLine: 'An app rule needs one app identifier and a read or read,control scope: {line}',
  grantScope: 'Scopes in an app rule accept only read or control: {line}',
  grantBundleId: 'App identifiers must be exact, with no wildcard characters: {line}',
  grantDuplicate: 'This app appears more than once: {bundleId}',
  artifactRootInvalid: 'Give a path relative to the workspace: no leading slash and no ".." segment.',
} as const

export type LocaleKey = keyof typeof en

/** One localized string lookup, already bound to the Computer Use namespace. */
export type Translate = (key: LocaleKey, params?: Record<string, string | number>) => string

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Keys of the Computer Use settings card. */
    'computer-use': LocaleKey
  }
}
