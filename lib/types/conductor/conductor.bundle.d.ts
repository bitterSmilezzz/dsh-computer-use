/** Conductor bundle: the DSH Bundle that publishes Computer Use to one profile. */
import { Service, type Context } from '@deepseek-ai/cordis';
import { MacOSComputerUseProvider } from '../binding/binding.macos-provider.ts';
import { type ComputerUseConfig } from '../tuning/tuning.schema.ts';
/** Register the portable Skill, bootstrap, Agent-scoped Tools, and optional Web diagnostics. */
export declare function installComputerUseConsumer(ctx: Context): () => void;
/** macOS provider plus the portable Skill, scoped Tools, and optional Web diagnostics. */
export declare class ComputerUseBundle extends MacOSComputerUseProvider {
    static inject: string[];
    static Config: import("@deepseek-ai/schemastery").default<ComputerUseConfig>;
    private consumerDispose;
    constructor(ctx: Context, config?: ComputerUseConfig);
    /** Publish model-facing capabilities only after provider integrity and health pass. */
    protected [Service.init](): Promise<void>;
}
export default ComputerUseBundle;
//# sourceMappingURL=conductor.bundle.d.ts.map