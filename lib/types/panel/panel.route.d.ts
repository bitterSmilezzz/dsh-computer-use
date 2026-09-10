/**
 * Panel route: the exact same-origin Settings endpoint, its request plumbing,
 * and the one attachment point that keeps the route optional.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
import type { SettingsDescriptor } from '@deepseek-ai/dsh-settings';
import { type ComputerUseConfig } from '../tuning/tuning.schema.ts';
/** Exact same-origin Settings endpoint. */
export declare const COMPUTER_USE_SETTINGS_ROUTE = "/_dsh/computer-use/settings";
export type SettingsRequest = {
    action: 'save';
    expectedRevision: number;
    value: ComputerUseConfig;
} | {
    action: 'health';
} | {
    action: 'open-settings';
    kind: 'accessibility' | 'screen-recording';
};
export type JsonResponse<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: {
        code: string;
        message: string;
    };
};
export declare function descriptorOf(ctx: Context): SettingsDescriptor;
export declare function responseJson<T>(res: ServerResponse, status: number, body: JsonResponse<T>): void;
export declare function requestError(res: ServerResponse, status: number, code: string, message: string): void;
export declare function sameOriginPost(req: IncomingMessage): boolean;
export declare function publicMessage(error: unknown): string;
/** Read and validate one POST body. */
export declare function readSettingsRequest(req: IncomingMessage): Promise<SettingsRequest>;
/** Attach the optional route when a Web host is present. */
export declare function installComputerUseWeb(ctx: Context): void;
//# sourceMappingURL=panel.route.d.ts.map