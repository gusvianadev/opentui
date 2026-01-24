import type { Renderable } from "@opentui/core";

export const prevFocusedRenderable = Symbol("prevFocusedRenderable");
export type AddPrevFocusedRenderable = { [prevFocusedRenderable]?: Renderable | null };
