/**
 * Binding native cursor: the persistent, click-through Agent cursor overlay
 * subprocess, its line protocol, and its readiness/motion timeouts.
 */
import { dirname } from 'node:path';
import { ComputerUseError, computerUseError } from "../charter/charter.fault.js";
import { collected } from "./binding.native-manifest.js";
/**
 * The response includes synchronous WindowServer validation, which can exceed
 * a scheduler tick under load even though the protocol itself is local.
 */
// Keep the bound finite. A timed-out generation is discarded before the next
// serialized command, so a late frame cannot satisfy a later command.
const CURSOR_RESPONSE_TIMEOUT_MS = 1_000;
const CURSOR_MOTION_RESPONSE_TIMEOUT_MS = 4_000;
const CURSOR_READY_TIMEOUT_MS = 2_000;
const CURSOR_PROTOCOL_MAX_BYTES = 64 * 1024;
/** Per-command response budget: motion commands are allowed to travel. */
export function cursorResponseTimeout(command) {
    if (command.op !== 'move')
        return CURSOR_RESPONSE_TIMEOUT_MS;
    if (typeof command.speedPxPerSecond === 'number')
        return CURSOR_MOTION_RESPONSE_TIMEOUT_MS;
    if (typeof command.durationMs === 'number' && Number.isFinite(command.durationMs)) {
        return Math.max(CURSOR_RESPONSE_TIMEOUT_MS, Math.trunc(command.durationMs) + 2 * CURSOR_RESPONSE_TIMEOUT_MS);
    }
    return CURSOR_RESPONSE_TIMEOUT_MS;
}
/** Bounded, untrusted detail string from one overlay failure response. */
export function cursorErrorMessage(error) {
    const candidate = typeof error === 'object' && error !== null
        ? error.message
        : error;
    if (typeof candidate !== 'string' || candidate.length === 0)
        return undefined;
    return candidate.slice(0, 1000);
}
/** A refused command: nothing is visible, and the generation may or may not survive. */
function cursorRefusal(reason, discardGeneration) {
    return { result: { visible: false, reason }, discardGeneration };
}
/**
 * Read one overlay response against the command it answers and decide whether its
 * process generation is still trustworthy. A reply the protocol cannot vouch for
 * poisons the generation; a well-formed refusal does not.
 */
export function normalizeCursorResponse(command, response) {
    if (response.ok === false) {
        const detail = cursorErrorMessage(response.error);
        return cursorRefusal(detail === undefined
            ? 'the native cursor overlay rejected its command'
            : `the native cursor overlay rejected its command: ${detail}`, false);
    }
    if (response.ok !== true) {
        return cursorRefusal('the native cursor overlay returned a malformed response', true);
    }
    if (typeof command.op !== 'string' || response.op !== command.op) {
        return cursorRefusal('the native cursor overlay response did not match its command', true);
    }
    if (response.visible === true)
        return { result: { visible: true }, discardGeneration: false };
    if (response.visible !== false) {
        return cursorRefusal('the native cursor overlay did not report boolean visibility', true);
    }
    const reasonCode = response.reasonCode === 'target-not-frontmost' || response.reasonCode === 'target-invalid'
        ? response.reasonCode
        : undefined;
    const reason = typeof response.reason === 'string' && response.reason.length > 0
        ? response.reason.slice(0, 1000)
        : 'the native cursor overlay reported that the cursor is not visible';
    return {
        result: { visible: false, ...(reasonCode === undefined ? {} : { reasonCode }), reason },
        discardGeneration: false,
    };
}
/**
 * One overlay generation started at most once per owner: the slot is published
 * before anything can await it, and it clears itself when that generation exits.
 */
function startCursorOnce(owner, prepared) {
    const slot = { promise: Promise.resolve(undefined) };
    slot.promise = spawnCursorProcess(owner, prepared)
        .then(cursor => {
        owner.cursor = cursor;
        void cursor.done.catch(() => undefined).finally(() => {
            if (owner.cursor === cursor)
                owner.cursor = undefined;
        });
        return cursor;
    })
        .finally(() => {
        if (owner.cursorStart === slot)
            owner.cursorStart = undefined;
    });
    return slot;
}
/** Refuse to hand out an overlay client that was cancelled or already disposed. */
function requireLiveOwner(owner, signal) {
    signal.throwIfAborted();
    if (owner.disposed)
        throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', 'native cursor overlay client is disposed');
}
/**
 * A client that came back from an await may belong to a generation disposed while
 * it was starting; such a process is discarded instead of being handed out.
 */
function requireLiveCursor(owner, cursor) {
    if (!owner.disposed)
        return;
    owner.discardCursor(cursor);
    throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', 'native cursor overlay client is disposed');
}
/** Trade in the current overlay process generation for a fresh one. */
export async function getCursorProcess(owner, prepared, signal) {
    requireLiveOwner(owner, signal);
    const existing = owner.cursor;
    if (existing !== undefined)
        return existing;
    owner.cursorStart ??= startCursorOnce(owner, prepared);
    const cursor = await owner.cursorStart.promise;
    requireLiveOwner(owner, signal);
    requireLiveCursor(owner, cursor);
    return cursor;
}
/**
 * One overlay generation's replies. Commands are serialized by the client and the
 * overlay answers one line per command, so replies are matched in order: the
 * oldest waiting command takes the frame, and a frame that arrives with nobody
 * waiting is held for the next one. A protocol failure is fatal for the whole
 * generation — the caller drops the process — so a buffered or late frame can
 * never reach the replacement generation.
 */
class CursorReplyStream {
    waiting = [];
    held = [];
    residue = '';
    /** Hand one frame to the oldest waiting command, or hold it until one asks. */
    deliver(frame) {
        const waiter = this.waiting.shift();
        if (waiter === undefined)
            this.held.push(frame);
        else
            waiter(frame);
    }
    /** Decode one stdout chunk into protocol lines and deliver each as a frame. */
    ingest(chunk) {
        this.residue += chunk;
        if (Buffer.byteLength(this.residue) > CURSOR_PROTOCOL_MAX_BYTES && !this.residue.includes('\n')) {
            this.residue = '';
            this.deliver({ kind: 'failure', reason: 'the native cursor overlay response exceeded its protocol limit' });
            return;
        }
        for (;;) {
            const newline = this.residue.indexOf('\n');
            if (newline < 0)
                return;
            const line = this.residue.slice(0, newline).trim();
            this.residue = this.residue.slice(newline + 1);
            if (line.length === 0)
                continue;
            this.deliver(interpretCursorLine(line));
        }
    }
    /** The next frame for one command, bounded by that command's response budget. */
    next(timeoutMs, signal) {
        const held = this.held.shift();
        if (held !== undefined) {
            signal.throwIfAborted();
            return Promise.resolve(held);
        }
        const waiting = this.waiting;
        return new Promise((resolveFrame, rejectFrame) => {
            let timer;
            // The first outcome wins: it detaches the timer and the abort listener, so
            // a later frame or a late timeout cannot decide this command twice.
            function detach() {
                const position = waiting.indexOf(handler);
                if (position >= 0)
                    waiting.splice(position, 1);
                if (timer !== undefined)
                    clearTimeout(timer);
                signal.removeEventListener('abort', onAbort);
            }
            function handler(frame) {
                detach();
                resolveFrame(frame);
            }
            function onAbort() {
                detach();
                rejectFrame(signal.reason);
            }
            timer = setTimeout(() => handler({
                kind: 'failure',
                reason: `the native cursor overlay did not respond within ${timeoutMs} milliseconds`,
            }), timeoutMs);
            if (signal.aborted) {
                onAbort();
                return;
            }
            signal.addEventListener('abort', onAbort, { once: true });
            waiting.push(handler);
        });
    }
}
/** Translate one protocol line into a frame; every malformed line becomes a failure. */
function interpretCursorLine(line) {
    if (Buffer.byteLength(line) > CURSOR_PROTOCOL_MAX_BYTES) {
        return { kind: 'failure', reason: 'the native cursor overlay response exceeded its protocol limit' };
    }
    let parsed;
    try {
        parsed = JSON.parse(line);
    }
    catch {
        return { kind: 'failure', reason: 'the native cursor overlay returned invalid JSON' };
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return { kind: 'failure', reason: 'the native cursor overlay returned a malformed response' };
    }
    return { kind: 'response', response: parsed };
}
/** Complete the ready handshake, or tear the process down and quote its stderr. */
async function requireCursorReady(handle) {
    try {
        await waitForCursorReady(handle);
    }
    catch (error) {
        handle.terminate();
        await handle.waitForExit();
        const stderr = collected(handle.collected.stderr).trim();
        throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', `native cursor overlay failed to become ready${stderr.length === 0 ? '' : `: ${stderr.slice(0, 1000)}`}`, { cause: error });
    }
}
/** Overlay stdio: one reply line on stdout, diagnostics collected from stderr. */
function cursorStdio() {
    return {
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: { maxBytes: 64 * 1024 },
    };
}
/** Child environment: pin the locale so the overlay's own diagnostics read cleanly. */
function cursorEnvironment() {
    return {
        LANG: process.env.LANG ?? 'en_US.UTF-8',
        LC_ALL: process.env.LC_ALL ?? 'en_US.UTF-8',
    };
}
/** Spawn one overlay process and wire its line protocol. */
export async function spawnCursorProcess(owner, prepared) {
    const cursorSignal = new AbortController();
    const handle = owner.ctx.subprocess.spawn({
        argv: [prepared.path, '--cursor-overlay'],
        cwd: dirname(prepared.path),
        stdio: cursorStdio(),
        graceMs: 1000,
        signal: cursorSignal.signal,
        env: cursorEnvironment(),
    });
    if (handle.stdin === undefined || handle.stdout === undefined) {
        handle.terminate();
        await handle.waitForExit();
        throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', 'native cursor overlay protocol pipes are unavailable');
    }
    handle.stdin.on('error', () => {
        // Process outcome and the next command own recovery from a closed protocol pipe.
    });
    await requireCursorReady(handle);
    const replies = new CursorReplyStream();
    handle.stdout.setEncoding('utf8').on('data', (chunk) => replies.ingest(chunk));
    handle.stdout.once('end', () => {
        replies.deliver({ kind: 'failure', reason: 'the native cursor overlay closed before replying' });
    });
    handle.stdout.once('error', error => {
        replies.deliver({ kind: 'failure', reason: `the native cursor overlay response stream failed: ${error.message}` });
    });
    return {
        stdin: handle.stdin,
        done: handle.done,
        nextResponse: (timeoutMs, signal) => replies.next(timeoutMs, signal),
        terminate: () => {
            cursorSignal.abort();
            handle.terminate();
        },
        waitForExit: signal => handle.waitForExit(signal),
    };
}
/** Await the overlay's single ready frame under its bounded readiness window. */
export async function waitForCursorReady(handle) {
    const stdout = handle.stdout;
    if (stdout === undefined)
        throw new Error('cursor stdout is unavailable');
    const timeout = AbortSignal.timeout(CURSOR_READY_TIMEOUT_MS);
    let residual = '';
    await new Promise((resolveReady, rejectReady) => {
        let decided = false;
        // Exactly one outcome is reported: the first event to arrive detaches every
        // listener, so anything that follows a teardown is simply ignored.
        const detach = () => {
            stdout.removeListener('data', onData);
            stdout.removeListener('end', onEnd);
            stdout.removeListener('error', onError);
            timeout.removeEventListener('abort', onTimeout);
        };
        const accept = () => {
            if (decided)
                return;
            decided = true;
            detach();
            resolveReady();
        };
        const refuse = (failure) => {
            if (decided)
                return;
            decided = true;
            detach();
            rejectReady(failure);
        };
        /** Interpret one handshake line; no error means the overlay announced readiness. */
        const interpret = (line) => {
            let response;
            try {
                response = JSON.parse(line);
            }
            catch (error) {
                return error;
            }
            const announcement = response;
            if (typeof response === 'object' && response !== null
                && announcement?.ok === true && announcement.ready === true) {
                return undefined;
            }
            return new Error('cursor overlay returned an unexpected ready response');
        };
        const onData = (chunk) => {
            residual += chunk.toString();
            if (Buffer.byteLength(residual) > CURSOR_PROTOCOL_MAX_BYTES) {
                refuse(new Error('cursor ready response exceeded its protocol limit'));
                return;
            }
            for (;;) {
                const newline = residual.indexOf('\n');
                if (newline < 0)
                    return;
                const line = residual.slice(0, newline);
                residual = residual.slice(newline + 1);
                if (line.length === 0)
                    continue;
                const failure = interpret(line);
                if (failure === undefined)
                    accept();
                else
                    refuse(failure);
                return;
            }
        };
        const onEnd = () => { refuse(new Error('cursor overlay stdout closed before ready')); };
        const onError = (error) => { refuse(error); };
        const onTimeout = () => { refuse(new Error(`cursor overlay ready timeout after ${CURSOR_READY_TIMEOUT_MS} milliseconds`)); };
        stdout.on('data', onData);
        stdout.once('end', onEnd);
        stdout.once('error', onError);
        timeout.addEventListener('abort', onTimeout, { once: true });
        void handle.done.then(outcome => { refuse(new Error(`cursor overlay exited before ready (${String(outcome.exitCode ?? outcome.signal)})`)); }, error => { refuse(error); });
    });
}
/** Send one serialized command to the overlay and normalize its reply. */
export async function executeCursorCommand(owner, command, signal, onWritten) {
    const prepared = owner.prepared ?? await owner.prepare(signal);
    if (owner.disposed)
        throw new ComputerUseError('COMPUTER_PROVIDER_FAILURE', 'native cursor overlay client is disposed');
    const cursor = await getCursorProcess(owner, prepared, signal);
    requireLiveOwner(owner, signal);
    requireLiveCursor(owner, cursor);
    try {
        await new Promise((resolveWrite, rejectWrite) => {
            cursor.stdin.write(`${JSON.stringify(command)}\n`, error => {
                if (error === undefined || error === null)
                    resolveWrite();
                else
                    rejectWrite(error);
            });
        });
        await onWritten?.();
        const frame = await cursor.nextResponse(cursorResponseTimeout(command), signal);
        if (frame.kind === 'failure') {
            owner.discardCursor(cursor);
            return { visible: false, reason: frame.reason };
        }
        const normalized = normalizeCursorResponse(command, frame.response);
        if (normalized.discardGeneration)
            owner.discardCursor(cursor);
        return normalized.result;
    }
    catch (error) {
        owner.discardCursor(cursor);
        if (signal.aborted) {
            throw new ComputerUseError('COMPUTER_CANCELLED', 'native cursor overlay command was cancelled', { cause: error });
        }
        throw computerUseError(error, 'native cursor overlay command failed');
    }
}
/** Stop the overlay process before a provider generation is replaced or disposed. */
export async function disposeCursorOwner(owner) {
    const cursor = owner.cursor ?? await owner.cursorStart?.promise.catch(() => undefined);
    owner.cursorStart = undefined;
    owner.cursor = undefined;
    if (cursor === undefined) {
        await owner.cursorCommandTail.catch(() => undefined);
        return;
    }
    try {
        cursor.stdin.end(`${JSON.stringify({ op: 'stop' })}\n`);
    }
    catch {
        // A child that already closed its pipe is handled by the tree-exit wait below.
    }
    if (!await cursor.waitForExit(AbortSignal.timeout(1_000))) {
        cursor.terminate();
        await cursor.waitForExit();
    }
    await owner.cursorCommandTail.catch(() => undefined);
}
//# sourceMappingURL=binding.native-cursor.js.map