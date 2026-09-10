/** Motion pointer: derive the Agent-cursor path one action implies, if any. */
function carriesCoordinateSpace(action) {
    return action.kind === 'click' || action.kind === 'scroll' || action.kind === 'drag';
}
/**
 * Cursor path for one action, already normalized into the coordinate space the
 * provider expects: element frames are window-relative, so a `screen` request
 * keeps its point and everything else is offset by the observed window origin.
 */
export function cursorAction(action, element, window, app) {
    if (window === undefined || window.id === undefined)
        return undefined;
    const origin = window.frame;
    const windowNumber = window.id;
    const pid = app.pid;
    const resolvePoint = (x, y) => {
        if (x === undefined || y === undefined)
            return undefined;
        if (carriesCoordinateSpace(action) && action.coordinateSpace === 'screen')
            return { x, y };
        return { x: origin.x + x, y: origin.y + y };
    };
    const elementPoint = element?.frame === undefined
        ? undefined
        : {
            x: element.frame.x + element.frame.width / 2,
            y: element.frame.y + element.frame.height / 2,
        };
    switch (action.kind) {
        case 'click':
        case 'scroll': {
            const point = elementPoint ?? resolvePoint(action.x, action.y);
            if (point === undefined)
                return undefined;
            return {
                kind: action.kind,
                to: point,
                targetPid: pid,
                targetWindowNumber: windowNumber,
                targetWindowFrame: { ...origin },
            };
        }
        case 'drag': {
            const from = resolvePoint(action.fromX, action.fromY);
            const to = resolvePoint(action.toX, action.toY);
            if (from === undefined || to === undefined)
                return undefined;
            return {
                kind: 'drag',
                from,
                to,
                targetPid: pid,
                targetWindowNumber: windowNumber,
                targetWindowFrame: { ...origin },
            };
        }
        case 'set-value':
        case 'type-text':
        case 'press-key':
        case 'perform-action': return undefined;
    }
}
//# sourceMappingURL=motion.pointer.js.map