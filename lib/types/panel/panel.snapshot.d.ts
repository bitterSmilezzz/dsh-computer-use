/** Panel snapshot: the browser-safe Settings document plus one request handler. */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
import { type ComputerUseConfig } from '../tuning/tuning.schema.ts';
import type { ComputerUseStatus } from '../charter/charter.context.ts';
/** Browser-safe Settings snapshot. */
export interface ComputerUseSettingsSnapshot {
    schemaVersion: 1;
    writable: boolean;
    settings: {
        value: ComputerUseConfig;
        user?: unknown;
        base?: unknown;
        revision: number;
        applies: 'live';
    };
    provider: ComputerUseStatus;
}
/** Same-origin backend used by the optional client Settings section. */
export declare class ComputerUseWebBackend {
    private readonly ctx;
    constructor(ctx: Context);
    /** Answer a read with the current snapshot, or 503 when it cannot be built. */
    private serveSnapshot;
    /** Current browser-safe Settings and health state. */
    snapshot(): ComputerUseSettingsSnapshot;
    /** Handle one Settings request. */
    handle(req: IncomingMessage, res: ServerResponse): Promise<void>;
}
//# sourceMappingURL=panel.snapshot.d.ts.map