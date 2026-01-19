import { extend } from "@opentui/solid"
import {
  GridRenderable,
  type Direction,
  type DirectionKeys,
  type GridFocusChangeEvent,
  type GridLayout,
  type GridOptions,
  type KeyCondition,
  type KeySpec,
} from "./grid"
import { GridNodeRenderable, type GridNodeOptions } from "./grid_node"

export const registerGridComponents = () => {
  extend({
    grid: GridRenderable,
    box_focusable: GridNodeRenderable,
  })
}

registerGridComponents()

export {
  GridNodeRenderable,
  GridRenderable,
  type GridNodeOptions,
  type Direction,
  type DirectionKeys,
  type GridFocusChangeEvent,
  type GridLayout,
  type GridOptions,
  type KeyCondition,
  type KeySpec,
}
