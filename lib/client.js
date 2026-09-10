window.__ModuleLoader__.load({
	id: "@bittersmilezzz/dsh-computer-use",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/copy.en.ts
		const en = {
			nav: "Computer Use",
			title: "macOS Computer Use",
			intro: "Review the native helper, macOS privacy permissions, input routing policy, observation limits, and the exact read/control rules per application.",
			pluginKind: "Native DSH plugin",
			privacy: "macOS privacy permissions",
			accessibility: "Accessibility",
			screenRecording: "Screen Recording",
			granted: "Allowed",
			denied: "Permission required",
			openSettings: "Open System Settings",
			refresh: "Re-check",
			access: "Application scope",
			accessHint: "Decide whether Computer Use may operate on any app. Exact per-app rules can still be supplied under Advanced settings.",
			allowAllApps: "Let every app be read and controlled",
			allowAllAppsHint: "While on, per-app rules are ignored and all running apps may be read and controlled.",
			grants: "Per-app rules",
			grantsHint: "Each line: one exact app identifier, then read or read,control. Wildcards are not accepted.",
			advanced: "Advanced settings",
			advancedHint: "Observation limits, helper location, cursor timing, and per-app rules.",
			interaction: "Input routing and foreground behaviour",
			interactionHint: "By default pointer and keyboard events go only to the chosen process; the system cursor stays put and the app is not brought forward.",
			focusPolicy: "When a window must come forward",
			focusPreserve: "Keep the current app in front",
			focusActivate: "Allow bringing the target app to the front",
			keyboardPolicy: "Before typing text",
			keyboardPreserve: "Keep the current app (some apps may reject typing)",
			keyboardActivate: "Bring the target app forward first",
			pointerInputPolicy: "Mouse input for the target process",
			pointerDeny: "Refuse click, drag, and wheel events",
			pointerAllow: "Send events only to the chosen app",
			cursorVisualization: "Agent cursor display",
			cursorVisible: "Draw a separate pass-through agent cursor",
			cursorHidden: "Keep the agent cursor hidden",
			cursorTiming: "Agent cursor movement",
			cursorSpeed: "Target cursor speed ceiling (px/s)",
			cursorAcceleration: "Cursor acceleration and deceleration (px/s²)",
			cursorClickDelay: "Pause between arriving and clicking (ms)",
			cursorAutoHide: "Cursor hides itself after (ms; 0 = always visible)",
			limits: "Observation and action ceilings",
			ttl: "Observation lifetime (ms; 0 = never expires)",
			confirmationTtl: "Confirmation lifetime (ms)",
			actionTimeout: "Per-action timeout (ms)",
			settle: "Interface re-check interval (ms)",
			maxSettle: "Longest settlement wait (ms)",
			maxWait: "Longest computer_wait timeout (ms; raised to the settlement ceiling if lower)",
			maxNodes: "AX node ceiling per read",
			maxDepth: "AX tree depth ceiling",
			maxText: "AX text byte ceiling",
			maxScreenshot: "Screenshot byte ceiling",
			artifactRoot: "Artifact directory",
			helper: "Native runtime helper",
			helperUnknown: "Not detected",
			ready: "Available",
			unavailable: "Not usable now",
			generation: "Applied during this run",
			generationValue: "{generation} time(s)",
			helperPath: "External helper location",
			helperPathPlaceholder: "Managed automatically",
			sourceBuild: "Permit building from source when the helper is missing",
			techDetails: "Technical information",
			save: "Apply and save",
			saving: "Saving...",
			saved: "Changes applied.",
			unsaved: "Edits not saved yet",
			discard: "Revert edits",
			readOnly: "This settings provider is read-only.",
			loading: "Reading Computer Use settings...",
			retry: "Try again",
			numberRange: "{field} has to be a whole number between {min} and {max}.",
			settleExceedsMax: "{settle} cannot exceed {max}.",
			grantLine: "An app rule needs one app identifier and a read or read,control scope: {line}",
			grantScope: "Scopes in an app rule accept only read or control: {line}",
			grantBundleId: "App identifiers must be exact, with no wildcard characters: {line}",
			grantDuplicate: "This app appears more than once: {bundleId}",
			artifactRootInvalid: "Give a path relative to the workspace: no leading slash and no \"..\" segment."
		};
		//#endregion
		//#region src/client/copy.zh.ts
		const zh = {
			nav: "电脑操作",
			title: "macOS 电脑操作",
			pluginKind: "DSH 原生插件",
			intro: "允许智能体读取并操作 macOS 应用。可以在这里检查系统权限、划定应用范围，并按需调整操作方式。",
			privacy: "macOS 隐私权限",
			accessibility: "辅助功能",
			screenRecording: "屏幕录制",
			granted: "已允许",
			denied: "尚未授权",
			openSettings: "打开 macOS 系统设置",
			refresh: "重新检查",
			access: "应用访问范围",
			accessHint: "日常使用只需决定是否允许操作所有应用；要精确控制，可在高级设置中填写指定应用规则。",
			allowAllApps: "允许读取和操作所有应用",
			allowAllAppsHint: "开启后无需逐个添加应用。关闭后，可在高级设置中填写允许访问的应用。",
			grants: "指定应用规则",
			grantsHint: "每行填写一个应用标识，后接 read 或 read,control。应用标识须完整填写，不支持通配符。",
			advanced: "高级设置",
			advancedHint: "操作方式、性能上限、光标效果、应用规则与运行组件。通常不需要改动。",
			interaction: "操作与输入方式",
			interactionHint: "默认下，指针和键盘事件只发给选定的应用，不会移动你的系统光标，也不会主动切换当前应用。",
			focusPolicy: "需要把窗口调到前台时",
			focusPreserve: "保持当前应用不变",
			focusActivate: "允许把目标应用切到前台",
			keyboardPolicy: "输入文字之前",
			keyboardPreserve: "沿用当前应用（有些应用可能无法输入）",
			keyboardActivate: "先把目标应用切到前台",
			pointerInputPolicy: "目标进程的鼠标输入",
			pointerDeny: "拒绝点击、拖动和滚轮事件",
			pointerAllow: "事件只发给选定的应用",
			cursorVisualization: "智能体光标",
			cursorVisible: "显示单独的智能体光标",
			cursorHidden: "隐藏智能体光标",
			cursorTiming: "智能体光标移动",
			cursorSpeed: "光标的最大速度期望值（像素/秒）",
			cursorAcceleration: "光标的加/减速度（像素/秒²）",
			cursorClickDelay: "光标到达后、点击前的延迟（毫秒）",
			cursorAutoHide: "光标自动隐藏延时（毫秒；0 = 保持显示）",
			limits: "性能与安全上限",
			ttl: "界面识别结果的有效期（毫秒；0 表示不过期）",
			confirmationTtl: "操作确认的有效期（毫秒）",
			actionTimeout: "单个动作的超时（毫秒）",
			settle: "动作完成后检查界面的间隔（毫秒）",
			maxSettle: "界面稳定等待的最长时间（毫秒）",
			maxWait: "等待操作完成的最长时间（毫秒；若小于稳定上限，则按稳定上限生效）",
			maxNodes: "单次读取的界面元素数上限",
			maxDepth: "界面结构的层级上限",
			maxText: "界面文字总量上限（字节）",
			maxScreenshot: "截图文件大小上限（字节）",
			artifactRoot: "生成文件存放目录",
			helper: "本地运行组件",
			helperUnknown: "未知",
			ready: "就绪",
			unavailable: "当前不可用",
			generation: "本次运行中的应用次数",
			generationValue: "{generation} 次",
			helperPath: "外部运行组件路径",
			helperPathPlaceholder: "由插件自动管理",
			sourceBuild: "找不到运行组件时允许从源码构建",
			techDetails: "技术信息",
			save: "保存并应用",
			saving: "正在应用...",
			saved: "设置已应用。",
			unsaved: "有改动尚未保存",
			discard: "撤销改动",
			readOnly: "当前设置为只读，无法在此修改。",
			loading: "正在加载电脑操作配置...",
			retry: "重试",
			numberRange: "{field}需为 {min} 至 {max} 之间的整数。",
			settleExceedsMax: "{settle}不得超过{max}。",
			grantLine: "每条应用规则须写成「应用标识 read」或「应用标识 read,control」：{line}",
			grantScope: "应用规则里的权限只支持 read 或 control：{line}",
			grantBundleId: "应用标识须完整填写，不支持通配符：{line}",
			grantDuplicate: "同一应用出现了多次：{bundleId}",
			artifactRootInvalid: "请填写相对工作区的路径：不能以「/」开头，也不能包含「..」。"
		};
		//#endregion
		//#region src/client/state.controller.ts
		const NS = "computer-use";
		const ROUTE = "/_dsh/computer-use/settings";
		/** A transport or envelope failure, as text the section can display verbatim. */
		function reasonOf(error) {
			return error instanceof Error ? error.message : String(error);
		}
		/** The snapshot inside one response, or the host-supplied failure message. */
		async function snapshotOf(response) {
			const body = await response.json();
			if (!response.ok || body.ok !== true || body.value === void 0) throw new Error(body.error?.message ?? `HTTP ${response.status}`);
			return body.value;
		}
		/** Loads the document, runs one action at a time, and re-reads on external change. */
		var ComputerUseSettingsController = class {
			current = { status: "idle" };
			listeners = /* @__PURE__ */ new Set();
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			snapshot = () => this.current;
			commit(next) {
				this.current = next;
				for (const listener of this.listeners) listener();
			}
			/** Re-read the document; a load keeps the previous snapshot on screen while it runs. */
			async load() {
				const carried = this.current.snapshot;
				this.commit(carried === void 0 ? { status: "loading" } : {
					status: "loading",
					snapshot: carried
				});
				try {
					const read = fetch(ROUTE, {
						credentials: "same-origin",
						cache: "no-store"
					});
					this.commit({
						status: "ready",
						snapshot: await snapshotOf(await read)
					});
				} catch (error) {
					this.commit({
						status: "error",
						error: reasonOf(error)
					});
				}
			}
			/**
			* Run one action and adopt the snapshot it returns.
			*
			* A failed action leaves the document on screen — the user's edits stay
			* visible — and only reports the failure, so a rejected save never blanks the
			* form it just refused.
			*/
			async action(action, payload, marker) {
				const carried = this.current.snapshot;
				this.commit({
					status: this.current.status,
					action: marker,
					...carried === void 0 ? {} : { snapshot: carried }
				});
				const request = {
					method: "POST",
					credentials: "same-origin",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						action,
						...payload
					})
				};
				try {
					const next = await snapshotOf(await fetch(ROUTE, request));
					this.commit(action === "save" ? {
						status: "ready",
						snapshot: next,
						notice: "saved"
					} : {
						status: "ready",
						snapshot: next
					});
				} catch (error) {
					const kept = this.current.snapshot;
					this.commit({
						status: "ready",
						...kept === void 0 ? {} : { snapshot: kept },
						error: reasonOf(error)
					});
				}
			}
			/** Re-read only when a document is already on screen; before that the mount effect loads it. */
			refreshIfLoaded() {
				if (this.current.status === "idle") return;
				this.load();
			}
		};
		//#endregion
		//#region src/tuning/tuning.bounds.ts
		/** Host envelope per numeric field: the bounds `resolveConfig` enforces, never widened for the draft guard. */
		const NUMERIC_BOUNDS = {
			observationTtlMs: {
				min: 1e3,
				max: 864e5,
				allowZero: true
			},
			confirmationTtlMs: {
				min: 1e3,
				max: 9e5,
				allowZero: false
			},
			actionTimeoutMs: {
				min: 1e3,
				max: 12e4,
				allowZero: false
			},
			settleMs: {
				min: 0,
				max: 1e4,
				allowZero: false
			},
			maxSettleMs: {
				min: 100,
				max: 6e4,
				allowZero: false
			},
			maxWaitMs: {
				min: 100,
				max: 6e5,
				allowZero: false
			},
			maxNodes: {
				min: 10,
				max: 5e3,
				allowZero: false
			},
			maxDepth: {
				min: 1,
				max: 64,
				allowZero: false
			},
			maxTextBytes: {
				min: 1024,
				max: 1048576,
				allowZero: false
			},
			maxScreenshotBytes: {
				min: 1024,
				max: 268435456,
				allowZero: false
			},
			cursorSpeedPxPerSecond: {
				min: 100,
				max: 5e4,
				allowZero: false
			},
			cursorAccelerationPxPerSecondSquared: {
				min: 100,
				max: 5e5,
				allowZero: false
			},
			cursorClickDelayMs: {
				min: 0,
				max: 1e3,
				allowZero: false
			},
			cursorAutoHideMs: {
				min: 0,
				max: 3e4,
				allowZero: false
			}
		};
		//#endregion
		//#region src/client/guard.bounds.ts
		/**
		* Read one bounded integer, or raise the caller's localized message.
		*
		* The caller supplies the wording, which keeps this helper free of any locale
		* dependency while still being the single gate every numeric field passes
		* through.
		*/
		function integerInRange(value, field, min, max, formatError) {
			const parsed = Number(value);
			if (Number.isSafeInteger(parsed) && parsed >= min && parsed <= max) return parsed;
			throw new Error(formatError(field, min, max));
		}
		/** The host envelope, re-exported for the section that renders the controls. */
		const NUMERIC = NUMERIC_BOUNDS;
		/**
		* Label key per numeric field, so validation messages name the field the user
		* sees. Alphabetical, like the envelope it mirrors.
		*/
		const FIELD_LABEL = {
			actionTimeoutMs: "actionTimeout",
			confirmationTtlMs: "confirmationTtl",
			cursorAccelerationPxPerSecondSquared: "cursorAcceleration",
			cursorAutoHideMs: "cursorAutoHide",
			cursorClickDelayMs: "cursorClickDelay",
			cursorSpeedPxPerSecond: "cursorSpeed",
			maxDepth: "maxDepth",
			maxNodes: "maxNodes",
			maxScreenshotBytes: "maxScreenshot",
			maxSettleMs: "maxSettle",
			maxTextBytes: "maxText",
			maxWaitMs: "maxWait",
			observationTtlMs: "ttl",
			settleMs: "settle"
		};
		/**
		* Whether the raw draft text is a legal value for the field: a non-empty
		* in-range safe integer, plus the single documented escape hatch — `0` on the
		* one field whose envelope carries a second legal value.
		*/
		function acceptableText(raw, bound) {
			if (raw.length === 0) return false;
			const parsed = Number(raw);
			if (bound.allowZero && parsed === 0) return true;
			return Number.isSafeInteger(parsed) && parsed >= bound.min && parsed <= bound.max;
		}
		/** The localized complaint for one numeric field, or undefined when the text is legal. */
		function numericIssueOf(draft, key, t) {
			const bound = NUMERIC_BOUNDS[key];
			if (acceptableText(draft[key].trim(), bound)) return void 0;
			return t("numberRange", {
				field: t(FIELD_LABEL[key]),
				min: bound.min,
				max: bound.max
			});
		}
		//#endregion
		//#region src/client/guard.issues.ts
		/** Host rule: the settlement interval may not sit above the settlement ceiling. */
		function crossIssueOf(draft, t) {
			const interval = numericIssueOf(draft, "settleMs", t);
			const ceiling = numericIssueOf(draft, "maxSettleMs", t);
			if (interval !== void 0 || ceiling !== void 0) return void 0;
			if (Number(draft.settleMs) <= Number(draft.maxSettleMs)) return void 0;
			return t("settleExceedsMax", {
				settle: t("settle"),
				max: t("maxSettle")
			});
		}
		/** Host rule: the artifact directory is a non-empty workspace-relative path. */
		function artifactIssueOf(draft, t) {
			const path = draft.artifactRoot.trim();
			return path.length === 0 || path.startsWith("/") || path.split(/[\\/]+/u).includes("..") ? t("artifactRootInvalid") : void 0;
		}
		/**
		* Turn the grants textarea back into host-shaped rules, reporting the first
		* offending line in the active locale.
		*
		* A line reads `<app identifier> <scope list>`; the identifier is every
		* whitespace-separated token except the last, and the scope list is the last
		* one. Splitting this way — rather than treating the first token as the
		* identifier — keeps the parser exactly as permissive about identifiers as the
		* host (`tuning/tuning.normalize.ts` rejects only an empty, wildcard, or
		* repeated identifier, so an identifier containing a space is legal there),
		* while staying stricter about the overall line shape. A stricter split would
		* produce drafts the host accepts but this form could never parse back.
		*/
		function parseGrants(text, t) {
			const value = [];
			const seen = /* @__PURE__ */ new Set();
			for (const raw of text.split(/\r?\n/u)) {
				const line = raw.trim();
				if (line.length === 0) continue;
				const tokens = line.split(/\s+/u);
				const scopeToken = tokens.at(-1);
				if (tokens.length < 2 || scopeToken === void 0) return { issue: t("grantLine", { line }) };
				const scopes = scopeToken.split(",");
				if (!scopes.every((scope) => scope === "read" || scope === "control")) return { issue: t("grantScope", { line }) };
				const bundleId = tokens.slice(0, -1).join(" ");
				if (bundleId.includes("*")) return { issue: t("grantBundleId", { line }) };
				if (seen.has(bundleId)) return { issue: t("grantDuplicate", { bundleId }) };
				seen.add(bundleId);
				const control = scopes.includes("control");
				value.push({
					bundleId,
					read: true,
					control
				});
			}
			return { value };
		}
		//#endregion
		//#region src/client/state.draft.ts
		/** Host fallbacks for the root-level numeric fields; the envelope itself lives in tuning.bounds.ts. */
		const ROOT_FALLBACK = {
			observationTtlMs: 0,
			confirmationTtlMs: 3e5,
			actionTimeoutMs: 15e3,
			settleMs: 250,
			maxSettleMs: 5e3,
			maxWaitMs: 3e4,
			maxNodes: 500,
			maxDepth: 14,
			maxTextBytes: 64e3,
			maxScreenshotBytes: 33554432
		};
		/** Host fallbacks for the cursor-motion fields. */
		const CURSOR_FALLBACK = {
			cursorSpeedPxPerSecond: 1600,
			cursorAccelerationPxPerSecondSquared: 6e3,
			cursorClickDelayMs: 90,
			cursorAutoHideMs: 0
		};
		const DEFAULT_ARTIFACT_ROOT = ".dsh-computer-use/artifacts";
		/** Form text for one optional number, using the host default when the document omits it. */
		function fieldText(value, fallback) {
			return String(value ?? fallback);
		}
		/** One-line-per-rule rendering of the stored grants, as the textarea shows them. */
		function grantsToText(grants) {
			return (grants ?? []).map((rule) => `${rule.bundleId} ${rule.control === true ? "read,control" : "read"}`).join("\n");
		}
		/** Project a saved document into the editable draft the form renders. */
		function draftOf(value) {
			const motion = value.interaction;
			const helper = value.helper;
			return {
				observationTtlMs: fieldText(value.observationTtlMs, ROOT_FALLBACK.observationTtlMs),
				confirmationTtlMs: fieldText(value.confirmationTtlMs, ROOT_FALLBACK.confirmationTtlMs),
				actionTimeoutMs: fieldText(value.actionTimeoutMs, ROOT_FALLBACK.actionTimeoutMs),
				settleMs: fieldText(value.settleMs, ROOT_FALLBACK.settleMs),
				maxSettleMs: fieldText(value.maxSettleMs, ROOT_FALLBACK.maxSettleMs),
				maxWaitMs: fieldText(value.maxWaitMs, ROOT_FALLBACK.maxWaitMs),
				maxNodes: fieldText(value.maxNodes, ROOT_FALLBACK.maxNodes),
				maxDepth: fieldText(value.maxDepth, ROOT_FALLBACK.maxDepth),
				maxTextBytes: fieldText(value.maxTextBytes, ROOT_FALLBACK.maxTextBytes),
				maxScreenshotBytes: fieldText(value.maxScreenshotBytes, ROOT_FALLBACK.maxScreenshotBytes),
				artifactRoot: value.artifactRoot ?? DEFAULT_ARTIFACT_ROOT,
				helperPath: helper?.path ?? "",
				allowSourceBuild: helper?.allowSourceBuild ?? false,
				focusPolicy: motion?.focusPolicy ?? "preserve",
				keyboardPolicy: motion?.keyboardPolicy ?? "preserve",
				pointerInputPolicy: motion?.pointerInputPolicy ?? "targeted",
				cursorVisualization: motion?.cursorVisualization ?? "visible",
				cursorSpeedPxPerSecond: fieldText(motion?.cursorSpeedPxPerSecond, CURSOR_FALLBACK.cursorSpeedPxPerSecond),
				cursorAccelerationPxPerSecondSquared: fieldText(motion?.cursorAccelerationPxPerSecondSquared, CURSOR_FALLBACK.cursorAccelerationPxPerSecondSquared),
				cursorClickDelayMs: fieldText(motion?.cursorClickDelayMs, CURSOR_FALLBACK.cursorClickDelayMs),
				cursorAutoHideMs: fieldText(motion?.cursorAutoHideMs, CURSOR_FALLBACK.cursorAutoHideMs),
				allowAllApps: value.allowAllApps ?? false,
				grants: grantsToText(value.grants)
			};
		}
		/**
		* Canonical form of one draft: the exact JSON the save path would send. Returns
		* undefined when the draft cannot be saved at all, which callers must read as
		* "not comparable with the server" rather than as "unchanged".
		*/
		function serializeDraft(draft, t) {
			let encoded;
			try {
				encoded = JSON.stringify(configOf(draft, t));
			} catch {
				return;
			}
			return encoded;
		}
		/** Parse the grants textarea, raising the localized complaint when it is not saveable. */
		function requiredGrants(text, t) {
			const parsed = parseGrants(text, t);
			if (parsed.value === void 0) throw new Error(parsed.issue ?? t("grantLine", { line: text }));
			return parsed.value;
		}
		/**
		* Build the host-shaped document for one draft.
		*
		* Every numeric field goes through the same guard the inline hints use, so a
		* value the user can see flagged can never reach the wire; the first failing
		* field throws with the same localized message the form shows beside it.
		*/
		function configOf(draft, t) {
			const integer = (key) => {
				const issue = numericIssueOf(draft, key, t);
				if (issue !== void 0) throw new Error(issue);
				return Number(draft[key]);
			};
			const settleConflict = crossIssueOf(draft, t);
			if (settleConflict !== void 0) throw new Error(settleConflict);
			const artifactConflict = artifactIssueOf(draft, t);
			if (artifactConflict !== void 0) throw new Error(artifactConflict);
			const grants = requiredGrants(draft.grants, t);
			const helperPath = draft.helperPath.trim();
			return {
				actionTimeoutMs: integer("actionTimeoutMs"),
				allowAllApps: draft.allowAllApps,
				artifactRoot: draft.artifactRoot.trim(),
				confirmationTtlMs: integer("confirmationTtlMs"),
				grants,
				helper: {
					...helperPath.length === 0 ? {} : { path: helperPath },
					allowSourceBuild: draft.allowSourceBuild
				},
				interaction: {
					cursorAccelerationPxPerSecondSquared: integer("cursorAccelerationPxPerSecondSquared"),
					cursorAutoHideMs: integer("cursorAutoHideMs"),
					cursorClickDelayMs: integer("cursorClickDelayMs"),
					cursorSpeedPxPerSecond: integer("cursorSpeedPxPerSecond"),
					cursorVisualization: draft.cursorVisualization,
					focusPolicy: draft.focusPolicy,
					keyboardPolicy: draft.keyboardPolicy,
					pointerInputPolicy: draft.pointerInputPolicy
				},
				maxDepth: integer("maxDepth"),
				maxNodes: integer("maxNodes"),
				maxScreenshotBytes: integer("maxScreenshotBytes"),
				maxSettleMs: integer("maxSettleMs"),
				maxTextBytes: integer("maxTextBytes"),
				maxWaitMs: integer("maxWaitMs"),
				observationTtlMs: integer("observationTtlMs"),
				settleMs: integer("settleMs")
			};
		}
		//#endregion
		//#region src/client/view.section.tsx
		/**
		* Settings section — the Computer Use card rendered inside the DSH Settings page.
		*
		* One Settings document drives the whole card. The macOS permission tiles and
		* the everyday "every app" decision come first, the save bar follows, and the
		* technical half — input routing, numeric ceilings, cursor motion, helper
		* provenance, per-app rules — sits behind a single Advanced disclosure so the
		* common flow never has to scroll past it.
		*/
		const describe = (error) => error instanceof Error ? error.message : String(error);
		/**
		* One labelled control.
		*
		* The validation message is *described by* the control instead of being nested
		* inside its `<label>`, where assistive tech would fold it into the control's
		* accessible name; `htmlFor` keeps the click-to-focus behaviour that a wrapping
		* label used to provide.
		*/
		function LabeledControl({ label, issue, children }) {
			const controlId = (0, react.useId)();
			const noteId = `${controlId}-note`;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dcu-field",
				"data-invalid": issue === void 0 ? void 0 : true,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						htmlFor: controlId,
						children: label
					}),
					children(issue === void 0 ? { id: controlId } : {
						id: controlId,
						"aria-describedby": noteId
					}),
					issue === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						id: noteId,
						className: "dcu-field-error",
						role: "alert",
						children: issue
					})
				]
			});
		}
		/** One macOS permission, with the button that opens the matching system pane. */
		function PermissionTile({ title, status, kind, controller, t }) {
			const allowed = status === "granted";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
				className: "dcu-permission",
				"data-granted": allowed || void 0,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: title }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: allowed ? t("granted") : t("denied") })] }), allowed ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					onClick: () => {
						controller.action("open-settings", { kind }, "open");
					},
					children: t("openSettings")
				})]
			});
		}
		/** Permission diagnostics plus the everyday "every app" decision, above the save bar. */
		function AccessOverview({ allowAllApps, controller, onAllowAllApps, provider, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dcu-panel",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dcu-panel-title",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("privacy") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						onClick: () => {
							controller.action("health", {}, "health");
						},
						children: t("refresh")
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dcu-permissions",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PermissionTile, {
						title: t("accessibility"),
						status: provider.accessibility,
						kind: "accessibility",
						controller,
						t
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PermissionTile, {
						title: t("screenRecording"),
						status: provider.screenRecording,
						kind: "screen-recording",
						controller,
						t
					})]
				})]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dcu-panel dcu-essential",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dcu-panel-title",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("access") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("accessHint") })] })
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: "dcu-check dcu-check-primary",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: allowAllApps,
						"aria-describedby": "dcu-allow-all-hint",
						onChange: (event) => onAllowAllApps(event.target.checked)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t("allowAllApps") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", {
						id: "dcu-allow-all-hint",
						children: t("allowAllAppsHint")
					})] })]
				})]
			})] });
		}
		/** One integer field, guarded by the same envelope the host resolver enforces. */
		function NumberRow({ field, label, draft, onEdit, t }) {
			const bound = NUMERIC[field];
			const issue = numericIssueOf(draft, field, t) ?? (field === "settleMs" ? crossIssueOf(draft, t) : void 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LabeledControl, {
				label: t(label),
				issue,
				children: (wiring) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
					...wiring,
					type: "number",
					min: bound.allowZero ? 0 : bound.min,
					max: bound.max,
					step: 1,
					value: draft[field],
					"aria-invalid": issue !== void 0,
					onChange: (event) => onEdit(field, event.target.value)
				})
			});
		}
		const ROUTING_ROWS = [
			{
				field: "focusPolicy",
				label: "focusPolicy",
				options: [{
					value: "preserve",
					label: "focusPreserve"
				}, {
					value: "activate",
					label: "focusActivate"
				}]
			},
			{
				field: "keyboardPolicy",
				label: "keyboardPolicy",
				options: [{
					value: "preserve",
					label: "keyboardPreserve"
				}, {
					value: "activate",
					label: "keyboardActivate"
				}]
			},
			{
				field: "pointerInputPolicy",
				label: "pointerInputPolicy",
				options: [{
					value: "deny",
					label: "pointerDeny"
				}, {
					value: "targeted",
					label: "pointerAllow"
				}]
			},
			{
				field: "cursorVisualization",
				label: "cursorVisualization",
				options: [{
					value: "visible",
					label: "cursorVisible"
				}, {
					value: "hidden",
					label: "cursorHidden"
				}]
			}
		];
		function SelectRow({ row, value, onEdit, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LabeledControl, {
				label: t(row.label),
				children: (wiring) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
					...wiring,
					value,
					onChange: (event) => onEdit(row.field, event.target.value),
					children: row.options.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: option.value,
						children: t(option.label)
					}, option.value))
				})
			});
		}
		/** Numeric rows in the Observation limits panel, in render order. */
		const LIMIT_ROWS = [
			{
				field: "observationTtlMs",
				label: "ttl"
			},
			{
				field: "confirmationTtlMs",
				label: "confirmationTtl"
			},
			{
				field: "actionTimeoutMs",
				label: "actionTimeout"
			},
			{
				field: "settleMs",
				label: "settle"
			},
			{
				field: "maxSettleMs",
				label: "maxSettle"
			},
			{
				field: "maxWaitMs",
				label: "maxWait"
			},
			{
				field: "maxNodes",
				label: "maxNodes"
			},
			{
				field: "maxDepth",
				label: "maxDepth"
			},
			{
				field: "maxTextBytes",
				label: "maxText"
			},
			{
				field: "maxScreenshotBytes",
				label: "maxScreenshot"
			}
		];
		/** Numeric rows in the Agent cursor motion panel, in render order. */
		const MOTION_ROWS = [
			{
				field: "cursorSpeedPxPerSecond",
				label: "cursorSpeed"
			},
			{
				field: "cursorAccelerationPxPerSecondSquared",
				label: "cursorAcceleration"
			},
			{
				field: "cursorClickDelayMs",
				label: "cursorClickDelay"
			},
			{
				field: "cursorAutoHideMs",
				label: "cursorAutoHide"
			}
		];
		/**
		* One bordered settings panel with an optional hint line and an optional action
		* on the title row. The heading row keeps the exact DOM the styles expect: a
		* bare `<h3>` when there is no hint, a `<div>` wrapper when there is.
		*/
		function Panel({ heading, hint, action, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dcu-panel",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dcu-panel-title",
					children: [hint === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: heading }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: heading }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: hint })] }), action]
				}), children]
			});
		}
		/** The save / revert strip; it appears twice in the card, sticky at the top and inline at the bottom. */
		function SaveBar({ where, dirty, blocked, applying, writable, onSave, onDiscard, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dcu-actions",
				"data-place": where,
				"data-dirty": dirty || void 0,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						disabled: !writable || !dirty || blocked,
						"aria-busy": applying,
						onClick: onSave,
						children: applying ? t("saving") : t("save")
					}),
					dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-dirty",
						role: "status",
						children: t("unsaved")
					}) : null,
					dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						disabled: blocked,
						onClick: onDiscard,
						children: t("discard")
					}) : null
				]
			});
		}
		function SettingsBody({ controller, t }) {
			const state = (0, react.useSyncExternalStore)(controller.subscribe, controller.snapshot, controller.snapshot);
			const [draft, setDraft] = (0, react.useState)();
			const [draftError, setDraftError] = (0, react.useState)();
			(0, react.useEffect)(() => {
				if (state.status === "idle") controller.load();
			}, [controller, state.status]);
			const documentValue = state.snapshot?.settings.value;
			const cleanBaseline = documentValue === void 0 ? void 0 : serializeDraft(draftOf(documentValue), t);
			const lastBaseline = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => {
				if (documentValue === void 0) return;
				const incoming = draftOf(documentValue);
				const incomingBaseline = serializeDraft(incoming, t);
				const previous = lastBaseline.current;
				if (incomingBaseline !== void 0) lastBaseline.current = incomingBaseline;
				setDraft((current) => {
					if (current === void 0) return incoming;
					if (previous === void 0 || incomingBaseline === void 0) return current;
					return serializeDraft(current, t) === previous ? incoming : current;
				});
			}, [documentValue, t]);
			if (state.snapshot === void 0 || draft === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dcu-settings",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dcu-panel",
					children: state.error ?? t("loading")
				}), state.status === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					onClick: () => {
						controller.load();
					},
					children: t("retry")
				}) : null]
			});
			const snapshot = state.snapshot;
			const provider = snapshot.provider;
			const dirty = cleanBaseline === void 0 || serializeDraft(draft, t) !== cleanBaseline;
			const applying = state.action === "save";
			const blocked = state.action !== void 0;
			const patch = (key, value) => {
				setDraft((current) => current === void 0 ? current : {
					...current,
					[key]: value
				});
			};
			const revert = () => {
				setDraftError(void 0);
				setDraft(draftOf(snapshot.settings.value));
			};
			const submit = () => {
				try {
					setDraftError(void 0);
					controller.action("save", {
						expectedRevision: snapshot.settings.revision,
						value: configOf(draft, t)
					}, "save");
				} catch (error) {
					setDraftError(describe(error));
				}
			};
			const grantsIssue = parseGrants(draft.grants, t).issue;
			const artifactIssue = artifactIssueOf(draft, t);
			const notices = [];
			if (provider.lastError !== void 0) notices.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dcu-alert error",
				role: "alert",
				children: provider.lastError
			}, "provider"));
			if (!snapshot.writable) notices.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dcu-alert warning",
				role: "status",
				children: t("readOnly")
			}, "readonly"));
			if (state.error !== void 0 || draftError !== void 0) notices.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dcu-alert error",
				role: "alert",
				children: draftError ?? state.error
			}, "failure"));
			if (state.notice === "saved" && !dirty) notices.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dcu-alert ok",
				role: "status",
				children: t("saved")
			}, "saved"));
			const saveBar = (where) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SaveBar, {
				where,
				dirty,
				blocked,
				applying,
				writable: snapshot.writable,
				onSave: submit,
				onDiscard: revert,
				t
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dcu-settings",
				children: [
					notices,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AccessOverview, {
						provider,
						allowAllApps: draft.allowAllApps,
						onAllowAllApps: (value) => patch("allowAllApps", value),
						controller,
						t
					}),
					saveBar("above"),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						className: "dcu-advanced",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("advanced") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: t("advancedHint") })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-advanced-body",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Panel, {
									heading: t("interaction"),
									hint: t("interactionHint"),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dcu-grid",
										children: ROUTING_ROWS.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectRow, {
											row,
											value: draft[row.field],
											onEdit: (field, next) => patch(field, next),
											t
										}, row.field))
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Panel, {
									heading: t("limits"),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dcu-grid",
										children: [LIMIT_ROWS.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberRow, {
											field: row.field,
											label: row.label,
											draft,
											onEdit: (field, next) => patch(field, next),
											t
										}, row.field)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LabeledControl, {
											label: t("artifactRoot"),
											issue: artifactIssue,
											children: (wiring) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
												...wiring,
												value: draft.artifactRoot,
												"aria-invalid": artifactIssue !== void 0,
												onChange: (event) => patch("artifactRoot", event.target.value)
											})
										})]
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Panel, {
									heading: t("cursorTiming"),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dcu-grid",
										children: MOTION_ROWS.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberRow, {
											field: row.field,
											label: row.label,
											draft,
											onEdit: (field, next) => patch(field, next),
											t
										}, row.field))
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Panel, {
									heading: t("helper"),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dcu-grid",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(LabeledControl, {
											label: t("helperPath"),
											children: (wiring) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
												...wiring,
												value: draft.helperPath,
												placeholder: t("helperPathPlaceholder"),
												onChange: (event) => patch("helperPath", event.target.value)
											})
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: "dcu-check",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: draft.allowSourceBuild,
												onChange: (event) => patch("allowSourceBuild", event.target.checked)
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("sourceBuild") })]
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
										className: "dcu-tech",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: t("techDetails") }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
												className: "dcu-path",
												children: provider.helperPath
											}),
											provider.helperSha256 === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", {
												className: "dcu-path",
												children: ["sha256 ", provider.helperSha256]
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Panel, {
									heading: t("grants"),
									hint: t("grantsHint"),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
										"aria-label": t("grants"),
										"aria-invalid": grantsIssue !== void 0,
										value: draft.grants,
										disabled: draft.allowAllApps,
										onChange: (event) => patch("grants", event.target.value),
										placeholder: "com.example.App read\ncom.example.Editor read,control"
									}), grantsIssue === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dcu-field-error",
										role: "alert",
										children: grantsIssue
									})]
								}),
								saveBar("below")
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
						className: "dcu-footer",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-kicker",
								children: t("pluginKind")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: t("title") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("intro") })
						] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-release",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									t("helper"),
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: provider.helperVersion ?? t("helperUnknown") })
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									t("generation"),
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t("generationValue", { generation: provider.generation }) })
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: provider.ready ? "ok" : "bad",
									children: provider.ready ? t("ready") : t("unavailable")
								})
							]
						})]
					})
				]
			});
		}
		function SettingsSection({ controller, t }) {
			if (controller === void 0 || t === void 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsBody, {
				controller,
				t
			});
		}
		//#endregion
		//#region src/client/view.styles.ts
		/**
		* Settings styles: the section's own CSS, injected once per document and
		* removed with the plugin's effect.
		*
		* Colours come from the host `--dsw-*` tokens so the panel follows the system
		* light/dark theme like every other Settings card.
		*/
		const CSS = `
.dcu-settings{display:grid;gap:14px;max-width:920px;padding:2px 0 24px}.dcu-footer{display:flex;justify-content:space-between;gap:22px;align-items:flex-start;margin-top:8px;padding:20px 2px 4px;border-top:1px solid var(--dsw-alias-border-l2);opacity:.82}.dcu-footer h2{margin:4px 0 6px;font-size:18px}.dcu-footer p{margin:0;max-width:610px;font-size:11px;line-height:1.55;color:var(--dsw-alias-label-secondary)}.dcu-kicker{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--dsw-alias-label-caption);font-weight:700}.dcu-release{display:grid;gap:5px;min-width:220px;padding:10px 12px;border-radius:11px;background:var(--dsw-alias-bg-layer-2);font-size:10px}.dcu-release span{display:flex;justify-content:space-between;gap:12px;white-space:nowrap}.dcu-release .ok{color:var(--dsw-alias-state-success-primary)}.dcu-release .bad{color:var(--dsw-alias-state-error-primary)}.dcu-panel{display:grid;gap:13px;padding:16px;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1)}.dcu-essential{border-color:var(--dsw-alias-border-l3);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-label-caption) 6%,transparent)}.dcu-panel-title{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.dcu-panel-title h3{margin:0;font-size:14px}.dcu-panel-title p{margin:4px 0 0;font-size:10px;line-height:1.45;color:var(--dsw-alias-label-secondary)}.dcu-permissions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.dcu-permission{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px;border-radius:11px;background:var(--dsw-alias-bg-layer-2);border-left:3px solid var(--dsw-alias-state-error-primary)}.dcu-permission[data-granted]{border-left-color:var(--dsw-alias-state-success-primary)}.dcu-permission div{display:grid;gap:3px}.dcu-permission span{font-size:10px}.dcu-permission strong{font-size:11px}.dcu-path{display:block;overflow:auto;padding:8px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);font-size:10px;color:var(--dsw-alias-label-secondary)}.dcu-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.dcu-field{display:grid;gap:5px}.dcu-field>span,.dcu-field>label{font-size:10px;font-weight:650}.dcu-field-error{font-size:10px;line-height:1.4;color:var(--dsw-alias-state-error-primary)}.dcu-field select,.dcu-panel textarea{border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-1);color:inherit}.dcu-field[data-invalid] select,.dcu-field[data-invalid] input,.dcu-panel textarea[aria-invalid="true"]{border-color:var(--dsw-alias-state-error-primary)}.dcu-field select{min-height:34px;padding:6px 9px;font:11px inherit}.dcu-check{display:flex;align-items:center;gap:8px;padding-top:19px;font-size:11px}.dcu-check-primary{align-items:flex-start;padding:10px 0}.dcu-check-primary input{margin-top:2px}.dcu-check-primary span{display:grid;gap:3px}.dcu-check-primary strong{font-size:12px}.dcu-check-primary small{font-size:10px;line-height:1.45;color:var(--dsw-alias-label-secondary)}.dcu-panel textarea{min-height:110px;resize:vertical;padding:10px;font:12px ui-monospace,SFMono-Regular,Menlo,monospace}.dcu-alert{padding:10px 12px;border-radius:10px;font-size:11px}.dcu-alert.error{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-state-error-primary)}.dcu-alert.warning{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-label)}.dcu-alert.ok{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 14%,transparent);color:var(--dsw-alias-state-success-primary)}.dcu-actions{position:sticky;bottom:0;z-index:3;display:flex;align-items:center;gap:10px;padding:10px 0;background:color-mix(in srgb,var(--dsw-alias-bg-base) 88%,transparent);backdrop-filter:blur(10px)}.dcu-actions[data-place=below]{position:static;padding:2px 0 0;background:none;backdrop-filter:none}.dcu-dirty{font-size:11px;color:var(--dsw-alias-state-warn-label)}.dcu-tech{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2)}.dcu-tech>summary{padding:8px 10px;cursor:pointer;list-style:none;font-size:10px;color:var(--dsw-alias-label-secondary)}.dcu-tech>summary::-webkit-details-marker{display:none}.dcu-tech[open]{display:grid;gap:8px;padding:0 10px 10px}@media(max-width:720px){.dcu-footer{display:grid}.dcu-release{width:auto}.dcu-grid,.dcu-permissions{grid-template-columns:1fr}}
`;
		const ADVANCED_CSS = `.dcu-advanced{border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1);overflow:hidden}.dcu-advanced>summary{display:flex;align-items:center;gap:10px;padding:14px 16px;cursor:pointer;list-style:none;font-size:13px;font-weight:650}.dcu-advanced>summary::-webkit-details-marker{display:none}.dcu-advanced>summary small{margin-left:auto;font-size:10px;font-weight:400;color:var(--dsw-alias-label-secondary)}.dcu-advanced>summary::after{content:"▸";margin-left:2px;font-size:12px;color:var(--dsw-alias-label-tertiary);transform:rotate(0deg);transition:transform .15s ease}.dcu-advanced[open]>summary::after{transform:rotate(90deg)}.dcu-advanced-body{display:grid;gap:14px;padding:2px 16px 16px}`;
		/** Inject the section stylesheet once per document; the returned disposer removes it. */
		function installStyles() {
			const marker = "@bittersmilezzz/dsh-computer-use/client";
			if (document.querySelector(`style[data-plugin-css="${marker}"]`) !== null) return () => {};
			const element = document.createElement("style");
			element.dataset.plugin = "@bittersmilezzz/dsh-computer-use";
			element.dataset.pluginCss = marker;
			element.textContent = CSS.concat(ADVANCED_CSS);
			document.head.appendChild(element);
			return () => {
				element.remove();
			};
		}
		//#endregion
		//#region src/client/index.tsx
		/** Client services this plugin depends on. */
		const inject = [
			"slots",
			"locale",
			"remote"
		];
		/** Register the Computer Use Settings section. */
		function apply(ctx) {
			ctx.effect(installStyles, "dsh-computer-use: styles");
			ctx.effect(() => ctx.locale.register(NS, {
				en,
				zh
			}), "dsh-computer-use: locale");
			const t = ctx.locale.bind(NS);
			const controller = new ComputerUseSettingsController();
			const sectionLabel = () => t("nav");
			const sectionProps = () => ({
				controller,
				t
			});
			ctx.effect(() => {
				const stopDocument = ctx.remote.$on("settings/document-updated", (namespace) => {
					if (namespace === "computer-use") controller.refreshIfLoaded();
				});
				const stopReset = ctx.on("connection/reset", () => {
					controller.refreshIfLoaded();
				});
				return () => {
					stopDocument();
					stopReset();
				};
			}, "dsh-computer-use: Settings invalidation");
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "computer-use",
				order: 35,
				label: sectionLabel,
				inject: sectionProps
			}, SettingsSection));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.integerInRange = integerInRange;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map