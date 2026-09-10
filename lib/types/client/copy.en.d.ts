/**
 * Locale copy — English side of the Computer Use settings card, and the key
 * union every other browser-side module imports. `copy.zh.ts` is typed as
 * `Record<LocaleKey, string>`, so adding, dropping, or renaming a key here is a
 * compile error there until both dictionaries agree again.
 */
export declare const en: {
    readonly nav: "Computer Use";
    readonly title: "macOS Computer Use";
    readonly intro: "Review the native helper, macOS privacy permissions, input routing policy, observation limits, and the exact read/control rules per application.";
    readonly pluginKind: "Native DSH plugin";
    readonly privacy: "macOS privacy permissions";
    readonly accessibility: "Accessibility";
    readonly screenRecording: "Screen Recording";
    readonly granted: "Allowed";
    readonly denied: "Permission required";
    readonly openSettings: "Open System Settings";
    readonly refresh: "Re-check";
    readonly access: "Application scope";
    readonly accessHint: "Decide whether Computer Use may operate on any app. Exact per-app rules can still be supplied under Advanced settings.";
    readonly allowAllApps: "Let every app be read and controlled";
    readonly allowAllAppsHint: "While on, per-app rules are ignored and all running apps may be read and controlled.";
    readonly grants: "Per-app rules";
    readonly grantsHint: "Each line: one exact app identifier, then read or read,control. Wildcards are not accepted.";
    readonly advanced: "Advanced settings";
    readonly advancedHint: "Observation limits, helper location, cursor timing, and per-app rules.";
    readonly interaction: "Input routing and foreground behaviour";
    readonly interactionHint: "By default pointer and keyboard events go only to the chosen process; the system cursor stays put and the app is not brought forward.";
    readonly focusPolicy: "When a window must come forward";
    readonly focusPreserve: "Keep the current app in front";
    readonly focusActivate: "Allow bringing the target app to the front";
    readonly keyboardPolicy: "Before typing text";
    readonly keyboardPreserve: "Keep the current app (some apps may reject typing)";
    readonly keyboardActivate: "Bring the target app forward first";
    readonly pointerInputPolicy: "Mouse input for the target process";
    readonly pointerDeny: "Refuse click, drag, and wheel events";
    readonly pointerAllow: "Send events only to the chosen app";
    readonly cursorVisualization: "Agent cursor display";
    readonly cursorVisible: "Draw a separate pass-through agent cursor";
    readonly cursorHidden: "Keep the agent cursor hidden";
    readonly cursorTiming: "Agent cursor movement";
    readonly cursorSpeed: "Target cursor speed ceiling (px/s)";
    readonly cursorAcceleration: "Cursor acceleration and deceleration (px/s²)";
    readonly cursorClickDelay: "Pause between arriving and clicking (ms)";
    readonly cursorAutoHide: "Cursor hides itself after (ms; 0 = always visible)";
    readonly limits: "Observation and action ceilings";
    readonly ttl: "Observation lifetime (ms; 0 = never expires)";
    readonly confirmationTtl: "Confirmation lifetime (ms)";
    readonly actionTimeout: "Per-action timeout (ms)";
    readonly settle: "Interface re-check interval (ms)";
    readonly maxSettle: "Longest settlement wait (ms)";
    readonly maxWait: "Longest computer_wait timeout (ms; raised to the settlement ceiling if lower)";
    readonly maxNodes: "AX node ceiling per read";
    readonly maxDepth: "AX tree depth ceiling";
    readonly maxText: "AX text byte ceiling";
    readonly maxScreenshot: "Screenshot byte ceiling";
    readonly artifactRoot: "Artifact directory";
    readonly helper: "Native runtime helper";
    readonly helperUnknown: "Not detected";
    readonly ready: "Available";
    readonly unavailable: "Not usable now";
    readonly generation: "Applied during this run";
    readonly generationValue: "{generation} time(s)";
    readonly helperPath: "External helper location";
    readonly helperPathPlaceholder: "Managed automatically";
    readonly sourceBuild: "Permit building from source when the helper is missing";
    readonly techDetails: "Technical information";
    readonly save: "Apply and save";
    readonly saving: "Saving...";
    readonly saved: "Changes applied.";
    readonly unsaved: "Edits not saved yet";
    readonly discard: "Revert edits";
    readonly readOnly: "This settings provider is read-only.";
    readonly loading: "Reading Computer Use settings...";
    readonly retry: "Try again";
    readonly numberRange: "{field} has to be a whole number between {min} and {max}.";
    readonly settleExceedsMax: "{settle} cannot exceed {max}.";
    readonly grantLine: "An app rule needs one app identifier and a read or read,control scope: {line}";
    readonly grantScope: "Scopes in an app rule accept only read or control: {line}";
    readonly grantBundleId: "App identifiers must be exact, with no wildcard characters: {line}";
    readonly grantDuplicate: "This app appears more than once: {bundleId}";
    readonly artifactRootInvalid: "Give a path relative to the workspace: no leading slash and no \"..\" segment.";
};
export type LocaleKey = keyof typeof en;
/** One localized string lookup, already bound to the Computer Use namespace. */
export type Translate = (key: LocaleKey, params?: Record<string, string | number>) => string;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Keys of the Computer Use settings card. */
        'computer-use': LocaleKey;
    }
}
//# sourceMappingURL=copy.en.d.ts.map