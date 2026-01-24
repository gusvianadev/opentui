import GridRenderable from "./grid";
import GridNodeRenderable from "./grid_node";

declare module "@opentui/solid" {
    interface OpenTUIComponents {
        grid: typeof GridRenderable;
        grid_node: typeof GridNodeRenderable;
    }
}
