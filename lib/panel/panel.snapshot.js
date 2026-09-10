/** Panel snapshot: the browser-safe Settings document plus one request handler. */
import { SettingsConflictError } from '@deepseek-ai/dsh-settings';
import { COMPUTER_USE_SETTINGS_NAMESPACE, } from "../tuning/tuning.schema.js";
import { descriptorOf, publicMessage, readSettingsRequest, requestError, responseJson, sameOriginPost, } from "./panel.route.js";
/** 405 carrying the methods this endpoint accepts. */
function rejectMethod(res) {
    res.setHeader('Allow', 'GET, POST');
    requestError(res, 405, 'method-not-allowed', 'Use GET or POST');
}
/** 403 for a POST that did not originate from this Web application. */
function rejectOrigin(res) {
    requestError(res, 403, 'origin-rejected', 'The request must originate from this DSH Web application');
}
/** Parse one request body, answering 413 or 400 when it cannot be read. */
async function parseRequest(req, res) {
    try {
        return await readSettingsRequest(req);
    }
    catch (error) {
        requestError(res, error instanceof RangeError ? 413 : 400, 'invalid-request', publicMessage(error));
        return undefined;
    }
}
/** Same-origin backend used by the optional client Settings section. */
export class ComputerUseWebBackend {
    ctx;
    constructor(ctx) {
        this.ctx = ctx;
    }
    /** Answer a read with the current snapshot, or 503 when it cannot be built. */
    serveSnapshot(res) {
        try {
            responseJson(res, 200, { ok: true, value: this.snapshot() });
        }
        catch (error) {
            requestError(res, 503, 'settings-unavailable', publicMessage(error));
        }
    }
    /** Current browser-safe Settings and health state. */
    snapshot() {
        const descriptor = descriptorOf(this.ctx);
        const provenance = {};
        if (descriptor.user !== undefined)
            provenance.user = descriptor.user;
        if (descriptor.base !== undefined)
            provenance.base = descriptor.base;
        return {
            schemaVersion: 1,
            writable: this.ctx.settings.writable,
            settings: {
                value: descriptor.value,
                ...provenance,
                revision: descriptor.revision,
                applies: 'live',
            },
            provider: this.ctx.computerUse.status(),
        };
    }
    /** Handle one Settings request. */
    async handle(req, res) {
        if (req.method === 'GET') {
            this.serveSnapshot(res);
            return;
        }
        if (req.method !== 'POST') {
            rejectMethod(res);
            return;
        }
        if (!sameOriginPost(req)) {
            rejectOrigin(res);
            return;
        }
        const parsed = await parseRequest(req, res);
        if (parsed === undefined)
            return;
        try {
            switch (parsed.action) {
                case 'save': {
                    if (!this.ctx.settings.writable)
                        throw new Error('settings provider is read-only');
                    await this.ctx.settings.replace(COMPUTER_USE_SETTINGS_NAMESPACE, parsed.value, parsed.expectedRevision);
                    break;
                }
                case 'health': {
                    await this.ctx.computerUse.health(AbortSignal.timeout(30000));
                    break;
                }
                default: {
                    await this.ctx.computerUse.openPermissionSettings(parsed.kind, AbortSignal.timeout(10000));
                }
            }
            responseJson(res, 200, { ok: true, value: this.snapshot() });
        }
        catch (error) {
            const conflict = error instanceof SettingsConflictError;
            this.ctx.logger.warn('dsh-computer-use Web action=%s failed: %s', parsed.action, publicMessage(error));
            requestError(res, conflict ? 409 : 400, conflict ? 'settings-conflict' : 'action-failed', publicMessage(error));
        }
    }
}
//# sourceMappingURL=panel.snapshot.js.map