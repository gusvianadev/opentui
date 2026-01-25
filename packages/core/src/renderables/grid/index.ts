import { extend } from "@opentui/solid"
import GridRenderable from "./grid"
import GridNodeRenderable from "./grid_node"

export const registerGridComponents = () => {
  extend({
    grid: GridRenderable,
    grid_node: GridNodeRenderable,
  })
}

registerGridComponents()

export { GridNodeRenderable, GridRenderable }
export * from "./types"
