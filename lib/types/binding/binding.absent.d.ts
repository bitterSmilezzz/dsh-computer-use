/** Binding absent: non-macOS fallback backend that keeps the Service injectable and fails closed. */
import type { BackendActionRequest, BackendActionResult, BackendCursorActivation, BackendCursorAction, BackendHealth, BackendObservation, BackendObserveOptions, BackendTrackedDragResult, CursorVisibility } from '../optics/optics.sighting.ts';
import type { ComputerAppIdentity, ComputerAppSelector, ComputerAppSummary } from '../charter/charter.index.ts';
import type { ComputerUseBackend } from './binding.port.ts';
/** Backend that reports a clear unavailable state instead of failing profile startup on non-macOS hosts. */
export declare class UnsupportedPlatformBackend implements ComputerUseBackend {
    private readonly platform;
    readonly name: "unsupported";
    readonly helperPath = "";
    constructor(platform: NodeJS.Platform);
    /** Every capability below refuses with the same typed failure. */
    private refuse;
    health(): Promise<BackendHealth>;
    resolveApp(_selector: ComputerAppSelector): Promise<ComputerAppIdentity>;
    listApps(): Promise<ComputerAppSummary[]>;
    observe(_app: ComputerAppIdentity, _options: BackendObserveOptions): Promise<BackendObservation>;
    activateForCursor(_app: ComputerAppIdentity, _expectedStateHash: string, _options: BackendObserveOptions): Promise<BackendCursorActivation>;
    act(_request: BackendActionRequest): Promise<BackendActionResult>;
    actDragWithCursor(_request: BackendActionRequest, _cursor: BackendCursorAction & {
        kind: 'drag';
    }): Promise<BackendTrackedDragResult>;
    visualizeCursor(_action: BackendCursorAction, _phase: 'before' | 'during' | 'after'): Promise<CursorVisibility>;
    openSettings(_kind: 'accessibility' | 'screen-recording'): Promise<void>;
    dispose(): Promise<void>;
}
//# sourceMappingURL=binding.absent.d.ts.map