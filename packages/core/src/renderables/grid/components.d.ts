import { GridRenderable } from "./grid.ts"
import { GridNodeRenderable } from "./grid_node.ts"

declare module "@opentui/solid" {
  interface OpenTUIComponents {
    grid: typeof GridRenderable
    box_focusable: typeof GridNodeRenderable
  }
}
