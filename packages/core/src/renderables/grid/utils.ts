import type { KeyEvent, Renderable } from "@opentui/core";
import GridNodeRenderable from "./grid_node";

const bubbleKeyDownMarker = Symbol("bubbleKeyDown");

/**
 * Bubble a keydown event through renderable parents, avoiding repeated
 * handler reentry while preserving event state.
 */
export const bubbleKeyDown = (start: GridNodeRenderable, event: KeyEvent) => {
    if (event.defaultPrevented || event.propagationStopped) return;

    let current = start.parent;

    while (current) {
        const handler = current.onKeyDown;

        if (handler) {
            const marked = (event as { [bubbleKeyDownMarker]?: boolean })[bubbleKeyDownMarker];

            // Mark to avoid re-entrancy and allow cleanup for top-level callers.
            (event as { [bubbleKeyDownMarker]?: boolean })[bubbleKeyDownMarker] = true;

            try {
                handler(event);
            } finally {
                if (!marked) {
                    delete (event as { [bubbleKeyDownMarker]?: boolean })[bubbleKeyDownMarker];
                }
            }

            if (event.defaultPrevented || event.propagationStopped) return;
        }

        current = current.parent;
    }
};

/** Walk ancestor renderables and invoke a callback for GridNodeRenderable nodes. */
export const walkGridNodeAncestors = (
    start: Renderable | null | undefined,
    end: Renderable | null,
    visitor: (node: GridNodeRenderable) => void,
) => {
    let current = start;

    while (current && current !== end) {
        if (!(current instanceof GridNodeRenderable)) {
            current = current.parent;
            continue;
        }

        visitor(current);
        current = current.parent;
    }
};
