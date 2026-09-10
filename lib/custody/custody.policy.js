/**
 * Custody policy: the approval policy a Computer Use permission path must obey,
 * read from the shared DSH approval service.
 */
/** Assumed when neither the Session nor the approval plugin states a policy. */
const ASSUMED_POLICY = 'ask';
const POLICY_SOURCES = [
    (ctx, agent) => ctx.approval.overrideOf(agent.session),
    ctx => ctx.approval.config.policy,
];
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
export function approvalPolicy(ctx, agent) {
    for (const source of POLICY_SOURCES) {
        const resolved = source(ctx, agent);
        if (resolved !== undefined)
            return resolved;
    }
    return ASSUMED_POLICY;
}
//# sourceMappingURL=custody.policy.js.map