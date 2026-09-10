/**
 * Locale copy: the Simplified Chinese dictionary for the Computer Use settings
 * card. Keyed exactly like `copy.en.ts`; the shared `LocaleKey` union is what
 * keeps the two dictionaries from drifting apart.
 */

import type { LocaleKey } from './copy.en.ts'

export const zh: Record<LocaleKey, string> = {
  // Card heading and the two entry points users see first.
  nav: '电脑操作',
  title: 'macOS 电脑操作',
  pluginKind: 'DSH 原生插件',
  intro: '允许智能体读取并操作 macOS 应用。可以在这里检查系统权限、划定应用范围，并按需调整操作方式。',

  // Permission state and the buttons that refresh or open it.
  privacy: 'macOS 隐私权限',
  accessibility: '辅助功能',
  screenRecording: '屏幕录制',
  granted: '已允许',
  denied: '尚未授权',
  openSettings: '打开 macOS 系统设置',
  refresh: '重新检查',

  // Application scope: the simple switch, plus a pointer to the exact rules.
  access: '应用访问范围',
  accessHint: '日常使用只需决定是否允许操作所有应用；要精确控制，可在高级设置中填写指定应用规则。',
  allowAllApps: '允许读取和操作所有应用',
  allowAllAppsHint: '开启后无需逐个添加应用。关闭后，可在高级设置中填写允许访问的应用。',
  grants: '指定应用规则',
  grantsHint: '每行填写一个应用标识，后接 read 或 read,control。应用标识须完整填写，不支持通配符。',

  // Advanced section shell.
  advanced: '高级设置',
  advancedHint: '操作方式、性能上限、光标效果、应用规则与运行组件。通常不需要改动。',

  // Input routing and the Agent cursor.
  interaction: '操作与输入方式',
  interactionHint: '默认下，指针和键盘事件只发给选定的应用，不会移动你的系统光标，也不会主动切换当前应用。',
  focusPolicy: '需要把窗口调到前台时',
  focusPreserve: '保持当前应用不变',
  focusActivate: '允许把目标应用切到前台',
  keyboardPolicy: '输入文字之前',
  keyboardPreserve: '沿用当前应用（有些应用可能无法输入）',
  keyboardActivate: '先把目标应用切到前台',
  pointerInputPolicy: '目标进程的鼠标输入',
  pointerDeny: '拒绝点击、拖动和滚轮事件',
  pointerAllow: '事件只发给选定的应用',
  cursorVisualization: '智能体光标',
  cursorVisible: '显示单独的智能体光标',
  cursorHidden: '隐藏智能体光标',
  cursorTiming: '智能体光标移动',
  cursorSpeed: '光标的最大速度期望值（像素/秒）',
  cursorAcceleration: '光标的加/减速度（像素/秒²）',
  cursorClickDelay: '光标到达后、点击前的延迟（毫秒）',
  cursorAutoHide: '光标自动隐藏延时（毫秒；0 = 保持显示）',

  // Observation, action, and settle limits.
  limits: '性能与安全上限',
  ttl: '界面识别结果的有效期（毫秒；0 表示不过期）',
  confirmationTtl: '操作确认的有效期（毫秒）',
  actionTimeout: '单个动作的超时（毫秒）',
  settle: '动作完成后检查界面的间隔（毫秒）',
  maxSettle: '界面稳定等待的最长时间（毫秒）',
  maxWait: '等待操作完成的最长时间（毫秒；若小于稳定上限，则按稳定上限生效）',
  maxNodes: '单次读取的界面元素数上限',
  maxDepth: '界面结构的层级上限',
  maxText: '界面文字总量上限（字节）',
  maxScreenshot: '截图文件大小上限（字节）',
  artifactRoot: '生成文件存放目录',

  // Helper generation and integrity.
  helper: '本地运行组件',
  helperUnknown: '未知',
  ready: '就绪',
  unavailable: '当前不可用',
  generation: '本次运行中的应用次数',
  generationValue: '{generation} 次',
  helperPath: '外部运行组件路径',
  helperPathPlaceholder: '由插件自动管理',
  sourceBuild: '找不到运行组件时允许从源码构建',
  techDetails: '技术信息',

  // Saving, drafting, and load state.
  save: '保存并应用',
  saving: '正在应用...',
  saved: '设置已应用。',
  unsaved: '有改动尚未保存',
  discard: '撤销改动',
  readOnly: '当前设置为只读，无法在此修改。',
  loading: '正在加载电脑操作配置...',
  retry: '重试',

  // Field-level validation messages.
  numberRange: '{field}需为 {min} 至 {max} 之间的整数。',
  settleExceedsMax: '{settle}不得超过{max}。',
  grantLine: '每条应用规则须写成「应用标识 read」或「应用标识 read,control」：{line}',
  grantScope: '应用规则里的权限只支持 read 或 control：{line}',
  grantBundleId: '应用标识须完整填写，不支持通配符：{line}',
  grantDuplicate: '同一应用出现了多次：{bundleId}',
  artifactRootInvalid: '请填写相对工作区的路径：不能以「/」开头，也不能包含「..」。',
}
