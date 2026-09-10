/**
 * Custody policy: the approval policy a Computer Use permission path must obey,
 * read from the shared DSH approval service.
 */
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { ApprovalPolicy } from '@deepseek-ai/dsh-user-approval';
import type { Context } from '@deepseek-ai/cordis';
/**
 * Resolve the approval policy that governs one Agent's Session.
 *
 * A policy of `'never'` means the approval service answers every ask on its own
 * without ever showing the user a prompt; Computer Use reads that as "no
 * interactive consent is available" and refuses sensitive actions instead of
 * pretending they were approved.
 *
 * @param ctx - context exposing the approval service.
 * @param agent - agent whose Session policy applies.
 * @returns the Session override, else the configured default, else `'ask'`.
 */
export declare function approvalPolicy(ctx: Context, agent: Agent): ApprovalPolicy;
//# sourceMappingURL=custody.policy.d.ts.map