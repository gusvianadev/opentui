import type { BoxOptions, BoxRenderable } from "@opentui/core"
import type GridRenderable from "./grid"
import type GridNodeRenderable from "./grid_node"

// === Key configuration ===
/** Modifier keys that must be held for a keybinding. */
export type KeySettingsCondition = "ctrl" | "meta" | "shift" | "option"
/** How movement behaves when a direction runs out of bounds. */
export type MovementOverflowBehavior = "stop" | "bubble" | "wrap-around"

/** Key configuration for movement or actions. */
export interface KeySettings {
  name: string
  conditions?: KeySettingsCondition[]
  overflowBehavior?: MovementOverflowBehavior
}
export interface ActionKeySettings extends Omit<KeySettings, "overflowBehavior"> {}

/** Logical directions supported by grid navigation. */
export type MovementDirection = "left" | "right" | "up" | "down"

/** Movement bindings and defaults for overflow handling. */
export interface GridMovement extends Partial<Record<MovementDirection, KeySettings>> {
  overflowBehavior?: MovementOverflowBehavior
}

/** Complete keymap for grid navigation. */
export type GridKeys = {
  movement: GridMovement
  actions?: {
    focus: ActionKeySettings
    unfocus: ActionKeySettings
  }
}

/** Grid-specific options combining node options with keymap. */
export interface GridOptions extends GridNodeOptions<GridRenderable> {
  keys: GridKeys
}

// === Event typing ===
/** Event handler type with bivariance for ergonomic callbacks. */
export type EventHandler<TEvent> = { bivarianceHack(event: TEvent): void }["bivarianceHack"]

/** Base focus event for grid nodes. */
export interface FocusEvent<TTarget extends GridNodeRenderable = GridNodeRenderable> {
  target: TTarget
}

/** Focus event for focus-within. */
export interface FocusWithinEvent<TTarget extends GridNodeRenderable = GridNodeRenderable>
  extends FocusEvent<TTarget> {}

/** Focus event for local focus inside a grid. */
export interface FocusLocalEvent<TTarget extends GridNodeRenderable = GridNodeRenderable> extends FocusEvent<TTarget> {}

/** Base blur event for grid nodes. */
export interface BlurEvent<TTarget extends GridNodeRenderable = GridNodeRenderable> {
  target: TTarget
}

/** Blur event for focus-within. */
export interface BlurWithinEvent<TTarget extends GridNodeRenderable = GridNodeRenderable> extends BlurEvent<TTarget> {}

/** Blur event for local focus inside a grid. */
export interface BlurLocalEvent<TTarget extends GridNodeRenderable = GridNodeRenderable> extends BlurEvent<TTarget> {}

export type GridCoords = [number, number]

// === Node options ===
export interface GridNodeOptions<TTarget extends GridNodeRenderable = GridNodeRenderable>
  extends BoxOptions<BoxRenderable> {
  coords: [number, number]
  onFocus?: EventHandler<FocusEvent<TTarget>>
  onFocusWithin?: EventHandler<FocusWithinEvent<TTarget>>
  onFocusLocal?: EventHandler<FocusLocalEvent<TTarget>>

  onBlur?: EventHandler<BlurEvent<TTarget>>
  onBlurWithin?: EventHandler<BlurWithinEvent<TTarget>>
  onBlurLocal?: EventHandler<BlurLocalEvent<TTarget>>
}
