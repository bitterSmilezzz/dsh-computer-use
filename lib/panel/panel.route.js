/**
 * Panel route: the exact same-origin Settings endpoint, its request plumbing,
 * and the one attachment point that keeps the route optional.
 */
import { COMPUTER_USE_SETTINGS_NAMESPACE, } from "../tuning/tuning.schema.js";
import { ComputerUseWebBackend } from "./panel.snapshot.js";
/** Exact same-origin Settings endpoint. */
export const COMPUTER_USE_SETTINGS_ROUTE = '/_dsh/computer-use/settings';
/** Largest POST body this endpoint will read. */
const MAX_REQUEST_BYTES = 128 * 1024;
const RESPONSE_HEADERS = [
    ['Content-Type', 'application/json; charset=utf-8'],
    ['Cache-Control', 'no-store'],
    ['X-Content-Type-Options', 'nosniff'],
    ['Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'"],
];
function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function descriptorOf(ctx) {
    const descriptor = ctx.settings.describe().find(row => row.ns === COMPUTER_USE_SETTINGS_NAMESPACE);
    if (descriptor !== undefined)
        return descriptor;
    throw new Error('computer-use Settings namespace is not registered');
}
export function responseJson(res, status, body) {
    const bytes = Buffer.from(JSON.stringify(body));
    for (const [name, value] of RESPONSE_HEADERS)
        res.setHeader(name, value);
    res.setHeader('Content-Length', String(bytes.length));
    res.writeHead(status);
    res.end(bytes);
}
export function requestError(res, status, code, message) {
    responseJson(res, status, { ok: false, error: { code, message } });
}
export function sameOriginPost(req) {
    const fetchSite = req.headers['sec-fetch-site'];
    if (fetchSite === 'cross-site')
        return false;
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (origin === undefined)
        return fetchSite === 'same-origin' || fetchSite === 'same-site' || fetchSite === 'none';
    if (host === undefined)
        return false;
    try {
        const source = new URL(origin);
        if (source.protocol !== 'http:' && source.protocol !== 'https:')
            return false;
        return source.host === host;
    }
    catch {
        return false;
    }
}
/** Read one JSON body, refusing anything that is not bounded JSON. */
async function readJson(req, maxBytes = MAX_REQUEST_BYTES) {
    const contentType = req.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase();
    if (contentType !== 'application/json')
        throw new TypeError('Content-Type must be application/json');
    const chunks = [];
    let received = 0;
    for await (const chunk of req) {
        const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        received += part.length;
        if (received > maxBytes)
            throw new RangeError(`request body exceeds ${maxBytes} bytes`);
        chunks.push(part);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function parseRequest(value) {
    if (!isRecord(value) || typeof value.action !== 'string')
        throw new TypeError('request needs an action');
    if (value.action === 'health')
        return { action: 'health' };
    if (value.action === 'open-settings') {
        if (value.kind !== 'accessibility' && value.kind !== 'screen-recording') {
            throw new TypeError('open-settings needs a valid kind');
        }
        return { action: 'open-settings', kind: value.kind };
    }
    if (value.action === 'save') {
        if (!Number.isInteger(value.expectedRevision) || !isRecord(value.value)) {
            throw new TypeError('save needs expectedRevision and value');
        }
        return {
            action: 'save',
            value: value.value,
            expectedRevision: value.expectedRevision,
        };
    }
    throw new TypeError(`unknown action: ${value.action}`);
}
export function publicMessage(error) {
    return error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000);
}
/** Read and validate one POST body. */
export async function readSettingsRequest(req) {
    return parseRequest(await readJson(req));
}
/** Attach the optional route when a Web host is present. */
export function installComputerUseWeb(ctx) {
    const backend = new ComputerUseWebBackend(ctx);
    ctx.inject(['webServer'], (webCtx) => {
        webCtx.effect(() => webCtx.webServer.register({
            kind: 'exact',
            path: COMPUTER_USE_SETTINGS_ROUTE,
            handler: (req, res) => backend.handle(req, res),
        }), 'dsh-computer-use: Web Settings route');
    });
}
//# sourceMappingURL=panel.route.js.map