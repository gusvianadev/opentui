import GridNodeRenderable from "./grid_node"
import type { KeyEvent, RenderContext } from "@opentui/core"
import type { GridKeys, GridOptions, MovementDirection } from "./types"
import { eventMatchesConditions } from "./utils"

export default class GridRenderable extends GridNodeRenderable {
  /** 2D matrix of grid nodes indexed by coordinates. */
  private matrix: GridNodeRenderable[][] = [[]]

  // === Registry ===
  /** Lookup table for nodes by id. */
  private gridNodesById: { [id: string]: GridNodeRenderable } = {}
  /** Currently focused node inside this grid. Does not get modified when the node gets blurred*/
  private _currentFocusLocal?: GridNodeRenderable

  // === Keys ===
  /** Stored keydown handler so we can preserve wrapper behavior. */
  private externalGridKeydown?: (event: KeyEvent) => void
  /** Keymap for movement and actions handled by the grid. */
  public keys: GridKeys = { movement: {} }

  constructor(ctx: RenderContext, options: GridOptions) {
    super(ctx, options)

    // NOTE: Initialize wrapper so keydown bubbling is consistent.
    this.onKeyDown = undefined
  }

  /** Return the node at a given coordinate, if any. */
  public childAt([x, y]: [number, number]) {
    return this.matrix[x]?.[y]
  }

  // === Focus: local ===
  public set currentFocusLocal(node: GridNodeRenderable | undefined) {
    const prev = this._currentFocusLocal
    if (prev === node) return

    this._currentFocusLocal = node

    // Ensure blur/focus are paired when focus changes.
    prev?.onBlurLocal?.({ target: prev })
    node?.onFocusLocal?.({ target: node })
  }
  public get currentFocusLocal() {
    return this._currentFocusLocal
  }

  /** Update the id lookup when id gets changed. */
  // NOTE: This is mostly for Solid behavior but it barely does anything on that regard.
  // So it should be modified to better handle Solid on-update-id-shifting
  public updateChildId(previousId: string, nextId: string, node: GridNodeRenderable) {
    if (previousId === nextId) return

    if (this.gridNodesById[previousId] === node) delete this.gridNodesById[previousId]

    this.gridNodesById[nextId] = node
  }

  // === Key handling ===
  /** Move local focus to a neighbor based on direction, honoring overflow settings. */
  private focusLocalNeighbor(direction: MovementDirection, [dx, dy]: [number, number], ev: KeyEvent) {
    if (!this.currentFocusLocal) return
    if (!eventMatchesConditions(ev, this.keys.movement[direction]?.conditions)) return

    const movement = this.keys.movement
    const [x, y] = this.currentFocusLocal.coords
    const overflowBehavior = movement[direction]?.overflowBehavior ?? movement.overflowBehavior

    let row = this.matrix[x + dx]
    let neighbor = row?.[y + dy]

    if (!neighbor) {
      switch (overflowBehavior) {
        case "stop":
          // Stop propagation so parent grids do not interpret the key.
          ev.stopPropagation()
          return
        case "wrap-around":
          if (!row) {
            row = this.matrix[dx < 0 ? this.matrix.length - 1 : 0]
            neighbor = row?.[y + dy]
          } else {
            neighbor = row?.[dy < 0 ? row.length - 1 : 0]
          }
          break
        default:
          return
      }
    }

    ev.stopPropagation()

    if (this.keys.actions) {
      neighbor?.focusLocal()
      this.focus()
    } else {
      neighbor?.focus()
    }
  }

  /** Handle movement keys and action bindings. */
  private handleGridKeys(ev: KeyEvent) {
    const movement = this.keys.movement

    switch (ev.name) {
      case movement.left?.name:
        return this.focusLocalNeighbor("left", [0, -1], ev)
      case movement.right?.name:
        return this.focusLocalNeighbor("right", [0, 1], ev)
      case movement.up?.name:
        return this.focusLocalNeighbor("up", [-1, 0], ev)
      case movement.down?.name:
        return this.focusLocalNeighbor("down", [1, 0], ev)
    }

    const actions = this.keys.actions
    if (!actions || !this.currentFocusLocal) return

    switch (ev.name) {
      case actions.focus.name:
        if (eventMatchesConditions(ev, actions.focus.conditions))
          // Promote focused local node to full focus.
          this.currentFocusLocal.focus()
        break
      case actions.unfocus.name:
        if (eventMatchesConditions(ev, actions.focus.conditions))
          // Return focus to the grid container.
          this.focus()
        break
    }

    ev.stopPropagation()
  }

  /** Wrap keydown so grid navigation runs before external handlers. */
  public override set onKeyDown(handler: ((key: KeyEvent) => void) | undefined) {
    const wrapper = (event: KeyEvent) => {
      this.handleGridKeys(event)
      handler?.(event)
    }
    this.externalGridKeydown = wrapper
    super.onKeyDown = wrapper
  }

  public override get onKeyDown() {
    return this.externalGridKeydown
  }

  // === Node lifecycle ===
  /** Insert a node into the matrix and initialize local focus. */
  override add(node: unknown, index?: number | undefined): number {
    if (node instanceof GridNodeRenderable) {
      const [x, y] = node.coords

      if (this.matrix[x] === undefined) {
        this.matrix[x] = []
      }

      const existing = this.matrix[x][y]
      if (existing && existing !== node) {
        this.remove(existing.id)
      }

      this.matrix[x][y] = node

      // TODO: If a component momentarily goes to 0 children due to an update, this might not work as expected
      // Try to create a scenario where that happens and see if it causes an issue
      if (x === 0 && y === 0) {
        this.currentFocusLocal = node
      }

      this.gridNodesById[node.id] = node
    }

    return super.add(node, index)
  }

  /** Remove node and patch matrix/focus state. */
  override remove(id: string) {
    const node = this.gridNodesById[id]

    if (node instanceof GridNodeRenderable) {
      const [x, y] = node.coords
      const wasFocused = node.focused

      if (node.focusedLocal) {
        // Try to preserve local focus by selecting a neighbor.
        const neighbor =
          this.childAt([x - 1, y]) ?? this.childAt([x + 1, y]) ?? this.childAt([x, y - 1]) ?? this.childAt([x, y + 1])

        if (neighbor) {
          if (wasFocused) {
            neighbor.focus()
          } else {
            neighbor.focusLocal()
          }
        }
      }

      const matrix = this.matrix

      matrix[x]?.splice(y, 1)

      if (matrix[x]?.length === 0) {
        matrix.splice(x, 1)

        if (matrix.length === 0) {
          // NOTE: Order here is important because user could have
          // `onFocus={(ev) => ev.target.currentFocusLocal?.focus()}` which would cause them to
          // focus the component we are about to delete, losing the general focus.
          this.currentFocusLocal = undefined

          if (wasFocused) {
            this.focus()
          }
        }
      }

      delete this.gridNodesById[id]
    }

    super.remove(id)
  }
}
