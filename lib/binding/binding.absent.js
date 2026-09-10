/** Binding absent: non-macOS fallback backend that keeps the Service injectable and fails closed. */
import { ComputerUseError } from "../charter/charter.fault.js";
/** The single failure this backend reports, naming the host it refused. */
function unsupportedOn(platform) {
    return new ComputerUseError('COMPUTER_UNSUPPORTED_PLATFORM', `dsh-computer-use supports macOS only; Computer Use is disabled on ${platform}`);
}
/** Backend that reports a clear unavailable state instead of failing profile startup on non-macOS hosts. */
export class UnsupportedPlatformBackend {
    platform;
    name = 'unsupported';
    helperPath = '';
    constructor(platform) {
        this.platform = platform;
    }
    /** Every capability below refuses with the same typed failure. */
    refuse() {
        return Promise.reject(unsupportedOn(this.platform));
    }
    async health() {
        const failure = unsupportedOn(this.platform);
        return {
            ready: false,
            error: failure.message,
            helperVersion: 'unsupported',
            helperSha256: '',
            accessibility: 'unavailable',
            screenRecording: 'unavailable',
        };
    }
    resolveApp(_selector) {
        return this.refuse();
    }
    listApps() {
        return this.refuse();
    }
    observe(_app, _options) {
        return this.refuse();
    }
    activateForCursor(_app, _expectedStateHash, _options) {
        return this.refuse();
    }
    act(_request) {
        return this.refuse();
    }
    actDragWithCursor(_request, _cursor) {
        return this.refuse();
    }
    visualizeCursor(_action, _phase) {
        return this.refuse();
    }
    openSettings(_kind) {
        return this.refuse();
    }
    async dispose() { }
}
//# sourceMappingURL=binding.absent.js.map