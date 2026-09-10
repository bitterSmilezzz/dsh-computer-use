/** Optics drift: accessibility-tree diff projection for model-context efficiency. */
/** Shown instead of a diff body when nothing observable moved between observations. */
const UNCHANGED_MARKER = '(no accessibility changes)';
/** Appended (and budgeted for) when the projection has to be cut short. */
const TRUNCATION_SUFFIX = '\n… diff truncated';
/**
 * Row state tokens, as `[field, triggering value, token]`. A row is tagged when
 * the named field carries exactly the triggering value: `disabled` reports the
 * absence of enablement while `focused` and `selected` report its presence.
 */
const STATE_TOKENS = [
    ['enabled', false, 'disabled'],
    ['focused', true, 'focused'],
    ['selected', true, 'selected'],
];
/**
 * Index-free row identity: role, subrole, naming, and rounded geometry. Rows that
 * share an identity describe the same UI element, so the diff can pair them
 * across observations even after a reorder moved their element indexes.
 */
function identity(element) {
    const box = element.frame === undefined
        ? ''
        : [element.frame.x, element.frame.y, element.frame.width, element.frame.height].map(Math.round).join(',');
    return `${element.role}|${element.subrole ?? ''}|${element.title ?? ''}|${element.label ?? ''}|${box}`;
}
/** One compact model-visible row; the index prefix is only meaningful for current rows. */
function summary(element, withIndex) {
    const tokens = [];
    if (withIndex)
        tokens.push(`[${element.index}]`);
    tokens.push(element.role);
    const name = element.title ?? element.label;
    if (name !== undefined)
        tokens.push(JSON.stringify(name));
    if (element.value !== undefined)
        tokens.push(`value=${JSON.stringify(element.value)}`);
    for (const [field, trigger, token] of STATE_TOKENS) {
        if (element[field] === trigger)
            tokens.push(token);
    }
    return tokens.join(' ');
}
/**
 * Whether two rows with one identity still expose the same mutable state. Only
 * non-identity fields count: the identity itself was already matched.
 */
function sameState(left, right) {
    if (left.value !== right.value || left.enabled !== right.enabled)
        return false;
    if (left.focused !== right.focused || left.selected !== right.selected)
        return false;
    if (left.actions.length !== right.actions.length)
        return false;
    return left.actions.every((action, position) => action === right.actions[position]);
}
/** Index one observation's rows by identity; among duplicates the last row wins. */
function indexRows(elements) {
    const index = new Map();
    for (const element of elements)
        index.set(identity(element), element);
    return index;
}
/** Return a bounded full-to-full element diff whose current rows use current indexes. */
export function diffElements(previous, current, maxBytes) {
    const before = indexRows(previous);
    const after = indexRows(current);
    const removed = [...before]
        .filter(([key]) => !after.has(key))
        .map(([, element]) => `- ${summary(element, false)}`);
    const touched = [...after].flatMap(([key, element]) => {
        const earlier = before.get(key);
        if (earlier === undefined)
            return [`+ ${summary(element, true)}`];
        return sameState(earlier, element) ? [] : [`~ ${summary(element, true)}`];
    });
    const rows = [...removed, ...touched];
    if (rows.length === 0)
        return UNCHANGED_MARKER;
    const text = rows.join('\n');
    if (Buffer.byteLength(text) <= maxBytes)
        return text;
    const keep = Math.max(0, maxBytes - Buffer.byteLength(TRUNCATION_SUFFIX));
    return `${Buffer.from(text).subarray(0, keep).toString('utf8')}${TRUNCATION_SUFFIX}`;
}
//# sourceMappingURL=optics.drift.js.map