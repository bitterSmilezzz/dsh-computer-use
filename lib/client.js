window.__ModuleLoader__.load({ id: "@bittersmilezzz/dsh-computer-use", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inject = void 0;
exports.integerInRange = integerInRange;
exports.apply = apply;
const jsx_runtime_1 = require("react/jsx-runtime");
/** DSH Computer Use browser plugin: provider health, permissions, limits, and app policy. */
const react_1 = require("react");
const dsh_client_ui_primitives_1 = require("@deepseek-ai/dsh-client-ui-primitives");
/** Parse one bounded integer using caller-owned localized error copy. */
function integerInRange(value, field, min, max, formatError) {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
        throw new Error(formatError(field, min, max));
    }
    return parsed;
}
const NS = 'computer-use';
const ROUTE = '/_dsh/computer-use/settings';
const en = {
    nav: 'Computer Use',
    title: 'macOS Computer Use',
    intro: 'Inspect the native helper, macOS privacy permissions, foreground/targeted-input policy, observation limits, and exact per-app read/control grants.',
    pluginKind: 'DSH native plugin',
    privacy: 'macOS privacy',
    access: 'Application access',
    accessHint: 'Choose whether Computer Use may work with every app. Exact per-app rules remain available under Advanced settings.',
    advanced: 'Advanced options',
    advancedHint: 'Limits, helper path, cursor timing, and application grants.',
    cursorTiming: 'Agent cursor motion',
    helper: 'Native helper',
    helperUnknown: 'Unknown',
    ready: 'Ready',
    unavailable: 'Unavailable',
    generation: 'Applied in this run',
    generationValue: '{generation} times',
    accessibility: 'Accessibility',
    screenRecording: 'Screen Recording',
    granted: 'Granted',
    denied: 'Needs permission',
    openSettings: 'Open macOS Settings',
    refresh: 'Refresh health',
    limits: 'Observation and action limits',
    ttl: 'Observation TTL (ms; 0 = no expiry)',
    confirmationTtl: 'Confirmation TTL (ms)',
    actionTimeout: 'Action timeout (ms)',
    settle: 'Settlement interval (ms)',
    maxSettle: 'Maximum settlement (ms)',
    maxWait: 'Maximum computer_wait timeout (ms; raised to the settlement ceiling when lower)',
    maxNodes: 'Maximum AX nodes',
    maxDepth: 'Maximum AX depth',
    maxText: 'Maximum AX text bytes',
    maxScreenshot: 'Maximum screenshot bytes',
    artifactRoot: 'Artifact root',
    helperPath: 'External helper path',
    helperPathPlaceholder: 'Managed by the plugin',
    sourceBuild: 'Allow explicit source-build fallback',
    techDetails: 'Technical details',
    interaction: 'Foreground and targeted input',
    interactionHint: 'The default route sends pointer and keyboard events only to the selected process. It does not move the system cursor or activate the app.',
    focusPolicy: 'Foreground policy',
    focusPreserve: 'Preserve current foreground app',
    focusActivate: 'Allow activating the target app',
    keyboardPolicy: 'Keyboard policy',
    keyboardPreserve: 'Preserve foreground; typing compatibility varies',
    keyboardActivate: 'Activate the target app before typing',
    pointerInputPolicy: 'Target-process pointer input',
    pointerDeny: 'Deny mouse, drag, and wheel events',
    pointerAllow: 'Route events only to the target process',
    cursorVisualization: 'Agent cursor',
    cursorVisible: 'Show a separate click-through Agent cursor',
    cursorHidden: 'Hide the Agent cursor',
    cursorSpeed: 'Requested maximum cursor speed (px/s)',
    cursorAcceleration: 'Cursor acceleration/deceleration (px/s²)',
    cursorClickDelay: 'Delay after arrival before click (ms)',
    cursorAutoHide: 'Cursor auto-hide (ms; 0 = stay visible)',
    grants: 'Application grants',
    grantsHint: 'One exact bundle id per line, followed by read or read,control. Wildcards are rejected.',
    allowAllApps: 'Allow read and control for every app',
    allowAllAppsHint: 'When enabled, exact grants are ignored and every running app is readable and controllable.',
    save: 'Save and apply',
    saving: 'Applying...',
    saved: 'Settings applied.',
    unsaved: 'Unsaved changes',
    discard: 'Discard changes',
    readOnly: 'The current Settings provider is read-only.',
    loading: 'Loading Computer Use settings...',
    retry: 'Retry',
    numberRange: '{field} must be an integer from {min} to {max}.',
    settleExceedsMax: '{settle} must not be greater than {max}.',
    grantLine: 'Each app rule must be one app identifier followed by read or read,control: {line}',
    grantScope: 'App rule permissions may only be read or control: {line}',
    grantBundleId: 'The app identifier must be exact and cannot contain wildcards: {line}',
    grantDuplicate: 'The same app is listed more than once: {bundleId}',
    artifactRootInvalid: 'Use a workspace-relative path without a leading slash or "..".',
};
const zh = {
    nav: '电脑操作',
    title: '电脑操作',
    intro: '让智能体读取并操作 macOS 应用。这里可以检查系统权限、设置应用范围，并按需调整操作方式。',
    pluginKind: 'DSH 原生插件',
    privacy: '系统权限检查',
    access: '应用访问范围',
    accessHint: '日常使用只需决定是否允许操作所有应用；指定应用规则可在高级设置中配置。',
    advanced: '高级设置',
    advancedHint: '操作方式、性能限制、光标效果、指定应用规则和运行组件。一般无需修改。',
    cursorTiming: '智能体光标移动',
    helper: '运行组件版本',
    helperUnknown: '未提供',
    ready: '已就绪',
    unavailable: '不可用',
    generation: '本次运行已应用',
    generationValue: '{generation} 次',
    accessibility: '辅助功能',
    screenRecording: '屏幕录制',
    granted: '已授权',
    denied: '需要授权',
    openSettings: '打开 macOS 设置',
    refresh: '重新检查',
    limits: '性能与安全限制',
    ttl: '界面识别结果有效期（毫秒；0 表示一直有效）',
    confirmationTtl: '操作确认有效期（毫秒）',
    actionTimeout: '动作超时（毫秒）',
    settle: '操作完成后的检查间隔（毫秒）',
    maxSettle: '等待界面稳定的最长时间（毫秒）',
    maxWait: '等待操作完成的最长时间（毫秒；小于稳定上限时按稳定上限生效）',
    maxNodes: '最多读取的界面元素数',
    maxDepth: '界面结构层级上限',
    maxText: '界面文字大小上限（字节）',
    maxScreenshot: '截图大小上限（字节）',
    artifactRoot: '生成文件目录',
    helperPath: '自定义运行组件路径',
    helperPathPlaceholder: '由插件自动管理',
    sourceBuild: '找不到运行组件时允许从源码构建',
    techDetails: '技术详情',
    interaction: '操作方式',
    interactionHint: '默认只操作选定的应用，不移动你的系统光标，也不会主动切换当前应用。',
    focusPolicy: '需要操作窗口时',
    focusPreserve: '不主动切换当前应用',
    focusActivate: '允许切换到目标应用',
    keyboardPolicy: '输入文字前',
    keyboardPreserve: '保持当前应用（部分应用可能无法输入）',
    keyboardActivate: '先切换到目标应用',
    pointerInputPolicy: '鼠标操作',
    pointerDeny: '不允许点击、拖动和滚动',
    pointerAllow: '只操作选定的应用',
    cursorVisualization: '智能体光标',
    cursorVisible: '显示单独的智能体光标',
    cursorHidden: '隐藏智能体光标',
    cursorSpeed: '光标期望最大速度（像素/秒）',
    cursorAcceleration: '光标加/减速度（像素/秒²）',
    cursorClickDelay: '到达后点击延迟（毫秒）',
    cursorAutoHide: '光标自动隐藏（毫秒；0 = 保持显示）',
    grants: '指定应用规则',
    grantsHint: '每行填写一个应用标识，后接 read 或 read,control。应用标识必须完整，不能使用通配符。',
    allowAllApps: '允许读取和操作所有应用',
    allowAllAppsHint: '开启后无需逐个添加应用。关闭后，可在高级设置中填写允许访问的应用。',
    save: '保存设置',
    saving: '正在保存...',
    saved: '设置已生效。',
    unsaved: '有未保存的修改',
    discard: '放弃修改',
    readOnly: '当前配置为只读，无法在这里修改。',
    loading: '正在加载电脑操作设置...',
    retry: '重试',
    numberRange: '{field}必须是 {min} 到 {max} 之间的整数。',
    settleExceedsMax: '{settle}不能大于{max}。',
    grantLine: '应用规则应为「应用标识 read」或「应用标识 read,control」：{line}',
    grantScope: '应用规则中的权限只能填 read 或 control：{line}',
    grantBundleId: '应用标识必须完整，不能使用通配符：{line}',
    grantDuplicate: '同一个应用被重复添加：{bundleId}',
    artifactRootInvalid: '请填写相对于工作区的路径，不能以「/」开头，也不能包含「..」。',
};
class ComputerUseSettingsController {
    state = { status: 'idle' };
    listeners = new Set();
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };
    snapshot = () => this.state;
    publish(next) {
        this.state = next;
        for (const listener of this.listeners)
            listener();
    }
    async load() {
        this.publish({
            status: 'loading',
            ...(this.state.snapshot === undefined ? {} : { snapshot: this.state.snapshot }),
        });
        try {
            const response = await fetch(ROUTE, { credentials: 'same-origin', cache: 'no-store' });
            const body = await response.json();
            if (!response.ok || body.ok !== true || body.value === undefined)
                throw new Error(body.error?.message ?? `HTTP ${response.status}`);
            this.publish({ status: 'ready', snapshot: body.value });
        }
        catch (error) {
            this.publish({ status: 'error', error: error instanceof Error ? error.message : String(error) });
        }
    }
    async action(action, payload, marker) {
        this.publish({
            status: this.state.status,
            action: marker,
            ...(this.state.snapshot === undefined ? {} : { snapshot: this.state.snapshot }),
        });
        try {
            const response = await fetch(ROUTE, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ action, ...payload }),
            });
            const body = await response.json();
            if (!response.ok || body.ok !== true || body.value === undefined)
                throw new Error(body.error?.message ?? `HTTP ${response.status}`);
            this.publish({
                status: 'ready',
                snapshot: body.value,
                ...(action === 'save' ? { notice: 'saved' } : {}),
            });
        }
        catch (error) {
            this.publish({
                status: 'ready',
                ...(this.state.snapshot === undefined ? {} : { snapshot: this.state.snapshot }),
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    refreshIfLoaded() {
        if (this.state.status !== 'idle')
            void this.load();
    }
}
function draftOf(value) {
    return {
        observationTtlMs: String(value.observationTtlMs ?? 0),
        confirmationTtlMs: String(value.confirmationTtlMs ?? 300000),
        actionTimeoutMs: String(value.actionTimeoutMs ?? 15000),
        settleMs: String(value.settleMs ?? 250),
        maxSettleMs: String(value.maxSettleMs ?? 5000),
        maxWaitMs: String(value.maxWaitMs ?? 30000),
        maxNodes: String(value.maxNodes ?? 500),
        maxDepth: String(value.maxDepth ?? 14),
        maxTextBytes: String(value.maxTextBytes ?? 64000),
        maxScreenshotBytes: String(value.maxScreenshotBytes ?? 33554432),
        artifactRoot: value.artifactRoot ?? '.dsh-computer-use/artifacts',
        helperPath: value.helper?.path ?? '',
        allowSourceBuild: value.helper?.allowSourceBuild ?? false,
        focusPolicy: value.interaction?.focusPolicy ?? 'preserve',
        keyboardPolicy: value.interaction?.keyboardPolicy ?? 'preserve',
        pointerInputPolicy: value.interaction?.pointerInputPolicy ?? 'targeted',
        cursorVisualization: value.interaction?.cursorVisualization ?? 'visible',
        cursorSpeedPxPerSecond: String(value.interaction?.cursorSpeedPxPerSecond ?? 1600),
        cursorAccelerationPxPerSecondSquared: String(value.interaction?.cursorAccelerationPxPerSecondSquared ?? 6000),
        cursorClickDelayMs: String(value.interaction?.cursorClickDelayMs ?? 90),
        cursorAutoHideMs: String(value.interaction?.cursorAutoHideMs ?? 0),
        allowAllApps: value.allowAllApps ?? false,
        grants: (value.grants ?? []).map(grant => `${grant.bundleId} ${grant.control === true ? 'read,control' : 'read'}`).join('\n'),
    };
}
/** Host bounds (src/config.ts) plus the one extra legal value the host accepts: observationTtlMs 0. */
const NUMERIC = {
    observationTtlMs: { min: 1000, max: 86400000, allowZero: true },
    confirmationTtlMs: { min: 1000, max: 900000, allowZero: false },
    actionTimeoutMs: { min: 1000, max: 120000, allowZero: false },
    settleMs: { min: 0, max: 10000, allowZero: false },
    maxSettleMs: { min: 100, max: 60000, allowZero: false },
    maxWaitMs: { min: 100, max: 600000, allowZero: false },
    maxNodes: { min: 10, max: 5000, allowZero: false },
    maxDepth: { min: 1, max: 64, allowZero: false },
    maxTextBytes: { min: 1024, max: 1048576, allowZero: false },
    maxScreenshotBytes: { min: 1024, max: 268435456, allowZero: false },
    cursorSpeedPxPerSecond: { min: 100, max: 50000, allowZero: false },
    cursorAccelerationPxPerSecondSquared: { min: 100, max: 500000, allowZero: false },
    cursorClickDelayMs: { min: 0, max: 1000, allowZero: false },
    cursorAutoHideMs: { min: 0, max: 30000, allowZero: false },
};
/** Field label copy reused by inline validation messages. */
const NUMERIC_COPY = {
    observationTtlMs: 'ttl',
    confirmationTtlMs: 'confirmationTtl',
    actionTimeoutMs: 'actionTimeout',
    settleMs: 'settle',
    maxSettleMs: 'maxSettle',
    maxWaitMs: 'maxWait',
    maxNodes: 'maxNodes',
    maxDepth: 'maxDepth',
    maxTextBytes: 'maxText',
    maxScreenshotBytes: 'maxScreenshot',
    cursorSpeedPxPerSecond: 'cursorSpeed',
    cursorAccelerationPxPerSecondSquared: 'cursorAcceleration',
    cursorClickDelayMs: 'cursorClickDelay',
    cursorAutoHideMs: 'cursorAutoHide',
};
/** Localized issue for one numeric field; the single source of truth for both inline hints and save. */
function numericIssueOf(draft, key, t) {
    const bound = NUMERIC[key];
    const field = t(NUMERIC_COPY[key]);
    const raw = draft[key].trim();
    if (raw.length === 0)
        return t('numberRange', { field, min: bound.min, max: bound.max });
    if (bound.allowZero && Number(raw) === 0)
        return undefined;
    try {
        integerInRange(raw, field, bound.min, bound.max, (label, min, max) => t('numberRange', { field: label, min, max }));
        return undefined;
    }
    catch {
        return t('numberRange', { field, min: bound.min, max: bound.max });
    }
}
/** Cross-field rule mirrored from resolveConfig: settleMs must not exceed maxSettleMs. */
function crossIssueOf(draft, t) {
    if (numericIssueOf(draft, 'settleMs', t) !== undefined || numericIssueOf(draft, 'maxSettleMs', t) !== undefined)
        return undefined;
    return Number(draft.settleMs) > Number(draft.maxSettleMs)
        ? t('settleExceedsMax', { settle: t('settle'), max: t('maxSettle') })
        : undefined;
}
/** Workspace-relative path rule mirrored from resolveConfig (no leading slash, no .. segment, not empty). */
function artifactIssueOf(draft, t) {
    const value = draft.artifactRoot.trim();
    return value.length === 0 || value.startsWith('/') || value.split(/[\\/]+/u).includes('..')
        ? t('artifactRootInvalid')
        : undefined;
}
/**
 * Parse the grants textarea into host-shaped grants, reporting the first invalid line in the active
 * locale. The last whitespace-separated token is the scope list and everything before it is the app
 * identifier, which keeps this parser exactly as permissive as the host for the identifier itself
 * (src/config.ts only rejects an empty, wildcard, or duplicate bundle id — an identifier that contains
 * a space is accepted there) while staying stricter about the line shape. Parsing a prefix instead
 * would make `draftOf` output that the host accepts unsaveable and unparseable back into a draft.
 */
function parseGrants(text, t) {
    const value = [];
    const seen = new Set();
    for (const raw of text.split(/\r?\n/u)) {
        const line = raw.trim();
        if (line.length === 0)
            continue;
        const parts = line.split(/\s+/u);
        const bundleId = parts.slice(0, -1).join(' ');
        const rawScopes = parts.at(-1);
        if (parts.length < 2 || rawScopes === undefined)
            return { issue: t('grantLine', { line }) };
        const scopes = rawScopes.split(',');
        if (!scopes.every(scope => scope === 'read' || scope === 'control'))
            return { issue: t('grantScope', { line }) };
        if (bundleId.includes('*'))
            return { issue: t('grantBundleId', { line }) };
        if (seen.has(bundleId))
            return { issue: t('grantDuplicate', { bundleId }) };
        seen.add(bundleId);
        value.push({ bundleId, read: true, control: scopes.includes('control') });
    }
    return { value };
}
/** Serialize one draft through the save-path normalization; undefined when the draft cannot be saved. */
function serializeDraft(draft, t) {
    try {
        return JSON.stringify(configOf(draft, t));
    }
    catch {
        return undefined;
    }
}
function configOf(draft, t) {
    const number = (key) => {
        const issue = numericIssueOf(draft, key, t);
        if (issue !== undefined)
            throw new Error(issue);
        return Number(draft[key]);
    };
    const settleIssue = crossIssueOf(draft, t);
    if (settleIssue !== undefined)
        throw new Error(settleIssue);
    const artifactIssue = artifactIssueOf(draft, t);
    if (artifactIssue !== undefined)
        throw new Error(artifactIssue);
    const parsedGrants = parseGrants(draft.grants, t);
    if (parsedGrants.value === undefined)
        throw new Error(parsedGrants.issue ?? t('grantLine', { line: draft.grants }));
    return {
        observationTtlMs: number('observationTtlMs'),
        confirmationTtlMs: number('confirmationTtlMs'),
        actionTimeoutMs: number('actionTimeoutMs'),
        settleMs: number('settleMs'),
        maxSettleMs: number('maxSettleMs'),
        maxWaitMs: number('maxWaitMs'),
        maxNodes: number('maxNodes'),
        maxDepth: number('maxDepth'),
        maxTextBytes: number('maxTextBytes'),
        maxScreenshotBytes: number('maxScreenshotBytes'),
        artifactRoot: draft.artifactRoot.trim(),
        helper: {
            ...(draft.helperPath.trim().length === 0 ? {} : { path: draft.helperPath.trim() }),
            allowSourceBuild: draft.allowSourceBuild,
        },
        interaction: {
            focusPolicy: draft.focusPolicy,
            keyboardPolicy: draft.keyboardPolicy,
            pointerInputPolicy: draft.pointerInputPolicy,
            cursorVisualization: draft.cursorVisualization,
            cursorSpeedPxPerSecond: number('cursorSpeedPxPerSecond'),
            cursorAccelerationPxPerSecondSquared: number('cursorAccelerationPxPerSecondSquared'),
            cursorClickDelayMs: number('cursorClickDelayMs'),
            cursorAutoHideMs: number('cursorAutoHideMs'),
        },
        allowAllApps: draft.allowAllApps,
        grants: parsedGrants.value,
    };
}
/**
 * One labeled control. The message is wired to the control with `aria-describedby` instead of living
 * inside the `<label>`, where it would be folded into the control's accessible name; `htmlFor` keeps
 * the label click-to-focus behaviour the wrapping label used to provide.
 */
function Field({ label, error, children }) {
    const controlId = (0, react_1.useId)();
    const errorId = `${controlId}-error`;
    const control = (0, react_1.cloneElement)(children, {
        id: controlId,
        ...(error === undefined ? {} : { 'aria-describedby': errorId }),
    });
    return (0, jsx_runtime_1.jsxs)("div", { className: "dcu-field", "data-invalid": error === undefined ? undefined : true, children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: controlId, children: label }), control, error === undefined ? null : (0, jsx_runtime_1.jsx)("span", { id: errorId, className: "dcu-field-error", role: "alert", children: error })] });
}
function SettingsSection({ controller, t }) {
    if (controller === undefined || t === undefined)
        return null;
    return (0, jsx_runtime_1.jsx)(LoadedSettings, { controller: controller, t: t });
}
function PermissionCard({ label, state, kind, controller, t }) {
    const granted = state === 'granted';
    return (0, jsx_runtime_1.jsxs)("article", { className: "dcu-permission", "data-granted": granted || undefined, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { children: label }), (0, jsx_runtime_1.jsx)("strong", { children: granted ? t('granted') : t('denied') })] }), !granted ? (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Button, { variant: "outline", onClick: () => { void controller.action('open-settings', { kind }, 'open'); }, children: t('openSettings') }) : null] });
}
/** Health/permission diagnostics plus the everyday "all apps" switch, above the save flow. */
function ProviderPanels({ provider, allowAllApps, onAllowAllApps, controller, t }) {
    return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("section", { className: "dcu-panel", children: [(0, jsx_runtime_1.jsxs)("div", { className: "dcu-panel-title", children: [(0, jsx_runtime_1.jsx)("h3", { children: t('privacy') }), (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Button, { variant: "outline", onClick: () => { void controller.action('health', {}, 'health'); }, children: t('refresh') })] }), (0, jsx_runtime_1.jsxs)("div", { className: "dcu-permissions", children: [(0, jsx_runtime_1.jsx)(PermissionCard, { label: t('accessibility'), state: provider.accessibility, kind: "accessibility", controller: controller, t: t }), (0, jsx_runtime_1.jsx)(PermissionCard, { label: t('screenRecording'), state: provider.screenRecording, kind: "screen-recording", controller: controller, t: t })] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "dcu-panel dcu-essential", children: [(0, jsx_runtime_1.jsx)("div", { className: "dcu-panel-title", children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { children: t('access') }), (0, jsx_runtime_1.jsx)("p", { children: t('accessHint') })] }) }), (0, jsx_runtime_1.jsxs)("label", { className: "dcu-check dcu-check-primary", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: allowAllApps, "aria-describedby": "dcu-allow-all-hint", onChange: event => onAllowAllApps(event.target.checked) }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: t('allowAllApps') }), (0, jsx_runtime_1.jsx)("small", { id: "dcu-allow-all-hint", children: t('allowAllAppsHint') })] })] })] })] });
}
function LoadedSettings({ controller, t }) {
    const state = (0, react_1.useSyncExternalStore)(controller.subscribe, controller.snapshot, controller.snapshot);
    const [draft, setDraft] = (0, react_1.useState)();
    const [draftError, setDraftError] = (0, react_1.useState)();
    (0, react_1.useEffect)(() => { if (state.status === 'idle')
        void controller.load(); }, [controller, state.status]);
    // Draft sync: the snapshot's own serialization is the clean baseline; the previous baseline tells us
    // whether the in-flight draft is still clean, so a health refresh / document update never silently
    // discards edits the user is making (dirty drafts keep their content, clean ones follow the server).
    // A snapshot the client cannot serialize yields no baseline at all, and "no baseline" must never mean
    // "clean": we cannot prove the draft still matches the server, so the user's text wins.
    const snapshotValue = state.snapshot?.settings.value;
    const baseline = snapshotValue === undefined ? undefined : serializeDraft(draftOf(snapshotValue), t);
    const previousBaseline = (0, react_1.useRef)(undefined);
    (0, react_1.useEffect)(() => {
        if (snapshotValue === undefined)
            return;
        const next = draftOf(snapshotValue);
        const nextBaseline = serializeDraft(next, t);
        const previous = previousBaseline.current;
        if (nextBaseline !== undefined)
            previousBaseline.current = nextBaseline;
        setDraft(current => {
            if (current === undefined)
                return next;
            if (previous === undefined || nextBaseline === undefined)
                return current;
            return serializeDraft(current, t) === previous ? next : current;
        });
    }, [snapshotValue, t]);
    if (state.snapshot === undefined || draft === undefined) {
        return (0, jsx_runtime_1.jsxs)("div", { className: "dcu-settings", children: [(0, jsx_runtime_1.jsx)("div", { className: "dcu-panel", children: state.error ?? t('loading') }), state.status === 'error' ? (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Button, { variant: "outline", onClick: () => { void controller.load(); }, children: t('retry') }) : null] });
    }
    const snapshot = state.snapshot;
    // An unrepresentable baseline means the server value cannot be compared with (or produced from) this
    // form, so treat the card as dirty rather than dead-locking Save behind a comparison that never runs.
    const dirty = baseline === undefined || serializeDraft(draft, t) !== baseline;
    const saveBusy = state.action === 'save';
    const saveLabel = saveBusy ? t('saving') : t('save');
    const update = (key, value) => setDraft(current => current === undefined ? current : { ...current, [key]: value });
    const discard = () => {
        setDraftError(undefined);
        setDraft(draftOf(snapshot.settings.value));
    };
    const save = () => {
        try {
            setDraftError(undefined);
            void controller.action('save', { expectedRevision: snapshot.settings.revision, value: configOf(draft, t) }, 'save');
        }
        catch (error) {
            setDraftError(error instanceof Error ? error.message : String(error));
        }
    };
    const numberField = (key, label) => {
        const bound = NUMERIC[key];
        const issue = numericIssueOf(draft, key, t) ?? (key === 'settleMs' ? crossIssueOf(draft, t) : undefined);
        return (0, jsx_runtime_1.jsx)(Field, { label: label, error: issue, children: (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Input, { type: "number", min: bound.allowZero ? 0 : bound.min, max: bound.max, step: 1, value: draft[key], "aria-invalid": issue !== undefined, onChange: event => update(key, event.target.value) }) });
    };
    const grantsIssue = parseGrants(draft.grants, t).issue;
    const artifactIssue = artifactIssueOf(draft, t);
    const actionBar = (place) => ((0, jsx_runtime_1.jsxs)("div", { className: "dcu-actions", "data-place": place, "data-dirty": dirty || undefined, children: [(0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Button, { variant: "primary", disabled: !snapshot.writable || !dirty || state.action !== undefined, "aria-busy": saveBusy, onClick: save, children: saveLabel }), dirty ? (0, jsx_runtime_1.jsx)("span", { className: "dcu-dirty", role: "status", children: t('unsaved') }) : null, dirty ? (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Button, { variant: "outline", disabled: state.action !== undefined, onClick: discard, children: t('discard') }) : null] }));
    return (0, jsx_runtime_1.jsxs)("div", { className: "dcu-settings", children: [snapshot.provider.lastError === undefined ? null : (0, jsx_runtime_1.jsx)("div", { className: "dcu-alert error", role: "alert", children: snapshot.provider.lastError }), !snapshot.writable ? (0, jsx_runtime_1.jsx)("div", { className: "dcu-alert warning", role: "status", children: t('readOnly') }) : null, state.error === undefined && draftError === undefined ? null : (0, jsx_runtime_1.jsx)("div", { className: "dcu-alert error", role: "alert", children: draftError ?? state.error }), state.notice === 'saved' && !dirty ? (0, jsx_runtime_1.jsx)("div", { className: "dcu-alert ok", role: "status", children: t('saved') }) : null, (0, jsx_runtime_1.jsx)(ProviderPanels, { provider: snapshot.provider, allowAllApps: draft.allowAllApps, onAllowAllApps: value => update('allowAllApps', value), controller: controller, t: t }), actionBar('above'), (0, jsx_runtime_1.jsxs)("details", { className: "dcu-advanced", children: [(0, jsx_runtime_1.jsxs)("summary", { children: [(0, jsx_runtime_1.jsx)("span", { children: t('advanced') }), (0, jsx_runtime_1.jsx)("small", { children: t('advancedHint') })] }), (0, jsx_runtime_1.jsxs)("div", { className: "dcu-advanced-body", children: [(0, jsx_runtime_1.jsxs)("section", { className: "dcu-panel", children: [(0, jsx_runtime_1.jsx)("div", { className: "dcu-panel-title", children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { children: t('interaction') }), (0, jsx_runtime_1.jsx)("p", { children: t('interactionHint') })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "dcu-grid", children: [(0, jsx_runtime_1.jsx)(Field, { label: t('focusPolicy'), children: (0, jsx_runtime_1.jsxs)("select", { value: draft.focusPolicy, onChange: event => update('focusPolicy', event.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "preserve", children: t('focusPreserve') }), (0, jsx_runtime_1.jsx)("option", { value: "activate", children: t('focusActivate') })] }) }), (0, jsx_runtime_1.jsx)(Field, { label: t('keyboardPolicy'), children: (0, jsx_runtime_1.jsxs)("select", { value: draft.keyboardPolicy, onChange: event => update('keyboardPolicy', event.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "preserve", children: t('keyboardPreserve') }), (0, jsx_runtime_1.jsx)("option", { value: "activate", children: t('keyboardActivate') })] }) }), (0, jsx_runtime_1.jsx)(Field, { label: t('pointerInputPolicy'), children: (0, jsx_runtime_1.jsxs)("select", { value: draft.pointerInputPolicy, onChange: event => update('pointerInputPolicy', event.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "deny", children: t('pointerDeny') }), (0, jsx_runtime_1.jsx)("option", { value: "targeted", children: t('pointerAllow') })] }) }), (0, jsx_runtime_1.jsx)(Field, { label: t('cursorVisualization'), children: (0, jsx_runtime_1.jsxs)("select", { value: draft.cursorVisualization, onChange: event => update('cursorVisualization', event.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "visible", children: t('cursorVisible') }), (0, jsx_runtime_1.jsx)("option", { value: "hidden", children: t('cursorHidden') })] }) })] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "dcu-panel", children: [(0, jsx_runtime_1.jsx)("div", { className: "dcu-panel-title", children: (0, jsx_runtime_1.jsx)("h3", { children: t('limits') }) }), (0, jsx_runtime_1.jsxs)("div", { className: "dcu-grid", children: [numberField('observationTtlMs', t('ttl')), numberField('confirmationTtlMs', t('confirmationTtl')), numberField('actionTimeoutMs', t('actionTimeout')), numberField('settleMs', t('settle')), numberField('maxSettleMs', t('maxSettle')), numberField('maxWaitMs', t('maxWait')), numberField('maxNodes', t('maxNodes')), numberField('maxDepth', t('maxDepth')), numberField('maxTextBytes', t('maxText')), numberField('maxScreenshotBytes', t('maxScreenshot')), (0, jsx_runtime_1.jsx)(Field, { label: t('artifactRoot'), error: artifactIssue, children: (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Input, { value: draft.artifactRoot, "aria-invalid": artifactIssue !== undefined, onChange: event => update('artifactRoot', event.target.value) }) })] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "dcu-panel", children: [(0, jsx_runtime_1.jsx)("div", { className: "dcu-panel-title", children: (0, jsx_runtime_1.jsx)("h3", { children: t('cursorTiming') }) }), (0, jsx_runtime_1.jsxs)("div", { className: "dcu-grid", children: [numberField('cursorSpeedPxPerSecond', t('cursorSpeed')), numberField('cursorAccelerationPxPerSecondSquared', t('cursorAcceleration')), numberField('cursorClickDelayMs', t('cursorClickDelay')), numberField('cursorAutoHideMs', t('cursorAutoHide'))] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "dcu-panel", children: [(0, jsx_runtime_1.jsx)("div", { className: "dcu-panel-title", children: (0, jsx_runtime_1.jsx)("h3", { children: t('helper') }) }), (0, jsx_runtime_1.jsxs)("div", { className: "dcu-grid", children: [(0, jsx_runtime_1.jsx)(Field, { label: t('helperPath'), children: (0, jsx_runtime_1.jsx)(dsh_client_ui_primitives_1.Input, { value: draft.helperPath, placeholder: t('helperPathPlaceholder'), onChange: event => update('helperPath', event.target.value) }) }), (0, jsx_runtime_1.jsxs)("label", { className: "dcu-check", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: draft.allowSourceBuild, onChange: event => update('allowSourceBuild', event.target.checked) }), (0, jsx_runtime_1.jsx)("span", { children: t('sourceBuild') })] })] }), (0, jsx_runtime_1.jsxs)("details", { className: "dcu-tech", children: [(0, jsx_runtime_1.jsx)("summary", { children: t('techDetails') }), (0, jsx_runtime_1.jsx)("code", { className: "dcu-path", children: snapshot.provider.helperPath }), snapshot.provider.helperSha256 === undefined ? null : (0, jsx_runtime_1.jsxs)("code", { className: "dcu-path", children: ["sha256 ", snapshot.provider.helperSha256] })] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "dcu-panel", children: [(0, jsx_runtime_1.jsx)("div", { className: "dcu-panel-title", children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { children: t('grants') }), (0, jsx_runtime_1.jsx)("p", { children: t('grantsHint') })] }) }), (0, jsx_runtime_1.jsx)("textarea", { "aria-label": t('grants'), "aria-invalid": grantsIssue !== undefined, value: draft.grants, disabled: draft.allowAllApps, onChange: event => update('grants', event.target.value), placeholder: 'com.example.App read\ncom.example.Editor read,control' }), grantsIssue === undefined ? null : (0, jsx_runtime_1.jsx)("span", { className: "dcu-field-error", role: "alert", children: grantsIssue })] }), actionBar('below')] })] }), (0, jsx_runtime_1.jsxs)("footer", { className: "dcu-footer", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "dcu-kicker", children: t('pluginKind') }), (0, jsx_runtime_1.jsx)("h2", { children: t('title') }), (0, jsx_runtime_1.jsx)("p", { children: t('intro') })] }), (0, jsx_runtime_1.jsxs)("div", { className: "dcu-release", children: [(0, jsx_runtime_1.jsxs)("span", { children: [t('helper'), " ", (0, jsx_runtime_1.jsx)("strong", { children: snapshot.provider.helperVersion ?? t('helperUnknown') })] }), (0, jsx_runtime_1.jsxs)("span", { children: [t('generation'), " ", (0, jsx_runtime_1.jsx)("strong", { children: t('generationValue', { generation: snapshot.provider.generation }) })] }), (0, jsx_runtime_1.jsx)("span", { className: snapshot.provider.ready ? 'ok' : 'bad', children: snapshot.provider.ready ? t('ready') : t('unavailable') })] })] })] });
}
const CSS = `
.dcu-settings{display:grid;gap:14px;max-width:920px;padding:2px 0 24px}.dcu-footer{display:flex;justify-content:space-between;gap:22px;align-items:flex-start;margin-top:8px;padding:20px 2px 4px;border-top:1px solid var(--dsw-alias-border-l2);opacity:.82}.dcu-footer h2{margin:4px 0 6px;font-size:18px}.dcu-footer p{margin:0;max-width:610px;font-size:11px;line-height:1.55;color:var(--dsw-alias-label-secondary)}.dcu-kicker{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--dsw-alias-label-caption);font-weight:700}.dcu-release{display:grid;gap:5px;min-width:220px;padding:10px 12px;border-radius:11px;background:var(--dsw-alias-bg-layer-2);font-size:10px}.dcu-release span{display:flex;justify-content:space-between;gap:12px;white-space:nowrap}.dcu-release .ok{color:var(--dsw-alias-state-success-primary)}.dcu-release .bad{color:var(--dsw-alias-state-error-primary)}.dcu-panel{display:grid;gap:13px;padding:16px;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1)}.dcu-essential{border-color:var(--dsw-alias-border-l3);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-label-caption) 6%,transparent)}.dcu-panel-title{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.dcu-panel-title h3{margin:0;font-size:14px}.dcu-panel-title p{margin:4px 0 0;font-size:10px;line-height:1.45;color:var(--dsw-alias-label-secondary)}.dcu-permissions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.dcu-permission{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px;border-radius:11px;background:var(--dsw-alias-bg-layer-2);border-left:3px solid var(--dsw-alias-state-error-primary)}.dcu-permission[data-granted]{border-left-color:var(--dsw-alias-state-success-primary)}.dcu-permission div{display:grid;gap:3px}.dcu-permission span{font-size:10px}.dcu-permission strong{font-size:11px}.dcu-path{display:block;overflow:auto;padding:8px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);font-size:10px;color:var(--dsw-alias-label-secondary)}.dcu-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.dcu-field{display:grid;gap:5px}.dcu-field>span,.dcu-field>label{font-size:10px;font-weight:650}.dcu-field-error{font-size:10px;line-height:1.4;color:var(--dsw-alias-state-error-primary)}.dcu-field select,.dcu-panel textarea{border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-1);color:inherit}.dcu-field[data-invalid] select,.dcu-field[data-invalid] input,.dcu-panel textarea[aria-invalid="true"]{border-color:var(--dsw-alias-state-error-primary)}.dcu-field select{min-height:34px;padding:6px 9px;font:11px inherit}.dcu-check{display:flex;align-items:center;gap:8px;padding-top:19px;font-size:11px}.dcu-check-primary{align-items:flex-start;padding:10px 0}.dcu-check-primary input{margin-top:2px}.dcu-check-primary span{display:grid;gap:3px}.dcu-check-primary strong{font-size:12px}.dcu-check-primary small{font-size:10px;line-height:1.45;color:var(--dsw-alias-label-secondary)}.dcu-panel textarea{min-height:110px;resize:vertical;padding:10px;font:12px ui-monospace,SFMono-Regular,Menlo,monospace}.dcu-alert{padding:10px 12px;border-radius:10px;font-size:11px}.dcu-alert.error{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary)}.dcu-alert.warning{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-label)}.dcu-alert.ok{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 14%,transparent);color:var(--dsw-alias-state-success-primary)}.dcu-actions{position:sticky;bottom:0;z-index:3;display:flex;align-items:center;gap:10px;padding:10px 0;background:color-mix(in srgb,var(--dsw-alias-bg-base) 88%,transparent);backdrop-filter:blur(10px)}.dcu-actions[data-place=below]{position:static;padding:2px 0 0;background:none;backdrop-filter:none}.dcu-dirty{font-size:11px;color:var(--dsw-alias-state-warn-label)}.dcu-tech{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2)}.dcu-tech>summary{padding:8px 10px;cursor:pointer;list-style:none;font-size:10px;color:var(--dsw-alias-label-secondary)}.dcu-tech>summary::-webkit-details-marker{display:none}.dcu-tech[open]{display:grid;gap:8px;padding:0 10px 10px}@media(max-width:720px){.dcu-footer{display:grid}.dcu-release{width:auto}.dcu-grid,.dcu-permissions{grid-template-columns:1fr}}
`;
const ADVANCED_CSS = `.dcu-advanced{border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1);overflow:hidden}.dcu-advanced>summary{display:flex;align-items:center;gap:10px;padding:14px 16px;cursor:pointer;list-style:none;font-size:13px;font-weight:650}.dcu-advanced>summary::-webkit-details-marker{display:none}.dcu-advanced>summary small{margin-left:auto;font-size:10px;font-weight:400;color:var(--dsw-alias-label-secondary)}.dcu-advanced>summary::after{content:"▸";margin-left:2px;font-size:12px;color:var(--dsw-alias-label-tertiary);transform:rotate(0deg);transition:transform .15s ease}.dcu-advanced[open]>summary::after{transform:rotate(90deg)}.dcu-advanced-body{display:grid;gap:14px;padding:2px 16px 16px}`;
function installStyles() {
    const id = '@bittersmilezzz/dsh-computer-use/client';
    const existing = document.querySelector(`style[data-plugin-css="${id}"]`);
    if (existing !== null)
        return () => { };
    const style = document.createElement('style');
    style.dataset.plugin = '@bittersmilezzz/dsh-computer-use';
    style.dataset.pluginCss = id;
    style.textContent = CSS + ADVANCED_CSS;
    document.head.appendChild(style);
    return () => { style.remove(); };
}
/** Required browser services. */
exports.inject = ['slots', 'locale', 'remote'];
/** Register the Computer Use Settings section. */
function apply(ctx) {
    ctx.effect(installStyles, 'dsh-computer-use: styles');
    ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'dsh-computer-use: locale');
    const t = ctx.locale.bind(NS);
    const controller = new ComputerUseSettingsController();
    ctx.effect(() => {
        const disposers = [
            ctx.remote.$on('settings/document-updated', ns => { if (ns === NS)
                controller.refreshIfLoaded(); }),
            ctx.on('connection/reset', () => { controller.refreshIfLoaded(); }),
        ];
        return () => { for (const dispose of disposers)
            dispose(); };
    }, 'dsh-computer-use: Settings invalidation');
    ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'computer-use',
        order: 35,
        label: () => t('nav'),
        inject: () => ({ controller, t }),
    }, SettingsSection));
}
return module.exports; } });
//# sourceMappingURL=client.js.map
