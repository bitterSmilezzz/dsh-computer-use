/** Binding macOS provider: Cordis Service assembly over the native backend. */
import { Service, type Context } from '@deepseek-ai/cordis';
import { type ComputerUseConfig } from '../tuning/tuning.schema.ts';
import { ComputerUseService } from '../conductor/conductor.service.ts';
/** Cordis Service provider loaded by the Bundle before the model-facing consumer. */
export declare class MacOSComputerUseProvider extends ComputerUseService {
    static inject: string[];
    static Config: import("@deepseek-ai/schemastery").default<ComputerUseConfig>;
    private readonly settings;
    constructor(ctx: Context, config?: ComputerUseConfig);
    /** Verify helper integrity and permissions before the service is injectable. */
    protected [Service.init](): Promise<void>;
}
export default MacOSComputerUseProvider;
//# sourceMappingURL=binding.macos-provider.d.ts.map