import { extend } from "@opentui/solid";
import GridRenderable, { type GridOptions } from "./grid";
import GridNodeRenderable, { type GridNodeOptions } from "./grid_node";

export const registerGridComponents = () => {
    extend({
        grid: GridRenderable,
        grid_node: GridNodeRenderable,
    });
};

registerGridComponents();

export { GridNodeRenderable, GridRenderable, type GridNodeOptions, type GridOptions };
