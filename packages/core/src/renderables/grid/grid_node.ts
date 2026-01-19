import {
  BoxRenderable,
  RenderableEvents,
  type BoxOptions,
  type KeyEvent,
  type RenderContext,
  type Renderable,
} from "@opentui/core"
import {
  bubbleKeyDown,
  blurWithinManual,
  clearFocusLocalRecursive,
  focusWithinManual,
  getFocusWithinStateSymbol,
  getFocusLocalStateSymbol,
  isBubblingKeyDown,
  focusLocalStateSymbol,
  updateFocusWithinChain,
  updateFocusLocalFromNative,
  focusWithinStateSymbol,
  findNearestGrid,
} from "./Grid"

export interface GridNodeOptions extends BoxOptions<BoxRenderable> {
  onKeyDown?: (event: KeyEvent) => void
  onFocus?: (ref: GridNodeRenderable) => void
  onBlur?: (ref: GridNodeRenderable) => void
  onFocusWithin?: (ref: GridNodeRenderable) => void
  onBlurWithin?: (ref: GridNodeRenderable) => void
  onFocusLocal?: (ref: GridNodeRenderable) => void
  onBlurLocal?: (ref: GridNodeRenderable) => void
}

export class GridNodeRenderable extends BoxRenderable {
  private externalKeyDown?: (event: KeyEvent) => void
  private focusHandler?: (ref: GridNodeRenderable) => void
  private blurHandler?: (ref: GridNodeRenderable) => void
  private focusWithinHandler?: (ref: GridNodeRenderable) => void
  private blurWithinHandler?: (ref: GridNodeRenderable) => void
  private focusLocalHandler?: (ref: GridNodeRenderable) => void
  private blurLocalHandler?: (ref: GridNodeRenderable) => void
  private focusWithinState = false
  private focusLocalRef = false
  private nativeFocused = false

  constructor(ctx: RenderContext, options: GridNodeOptions) {
    const { onKeyDown, onFocus, onBlur, onFocusWithin, onBlurWithin, onFocusLocal, onBlurLocal, ...rest } = options

    super(ctx, rest)

    this._focusable = true
    this.externalKeyDown = onKeyDown
    this.focusHandler = onFocus
    this.blurHandler = onBlur
    this.focusWithinHandler = onFocusWithin
    this.blurWithinHandler = onBlurWithin
    this.focusLocalHandler = onFocusLocal
    this.blurLocalHandler = onBlurLocal
    super.onKeyDown = this.handleKeyDown
    this.on(RenderableEvents.FOCUSED, this.handleFocusEvent)
    this.on(RenderableEvents.BLURRED, this.handleBlurEvent)
    this.syncInitialFocus()
  }

  private syncInitialFocus() {
    if (this.nativeFocused) {
      return
    }
    const focused = this.getFocusedRenderable()
    if (focused === this) {
      this.handleFocusEvent()
    }
  }

  private getFocusedRenderable(): Renderable | null {
    const renderer = this.ctx as unknown as { currentFocusedRenderable?: Renderable | null }
    return renderer.currentFocusedRenderable ?? null
  }

  private handleFocusEvent = () => {
    if (!this.nativeFocused) {
      this.nativeFocused = true
    }
    this.focusHandler?.(this)
    updateFocusWithinChain(this)
    updateFocusLocalFromNative(this)
  }

  private handleBlurEvent = () => {
    this.nativeFocused = false
    this.blurHandler?.(this)
  }

  override set onKeyDown(handler: ((event: KeyEvent) => void) | undefined) {
    this.externalKeyDown = handler
    super.onKeyDown = this.handleKeyDown
  }

  override get onKeyDown(): ((event: KeyEvent) => void) | undefined {
    return super.onKeyDown
  }

  set onFocus(handler: ((ref: GridNodeRenderable) => void) | undefined) {
    this.focusHandler = handler
  }

  get onFocus(): ((ref: GridNodeRenderable) => void) | undefined {
    return this.focusHandler
  }

  set onBlur(handler: ((ref: GridNodeRenderable) => void) | undefined) {
    this.blurHandler = handler
  }

  get onBlur(): ((ref: GridNodeRenderable) => void) | undefined {
    return this.blurHandler
  }

  set onFocusWithin(handler: ((ref: GridNodeRenderable) => void) | undefined) {
    this.focusWithinHandler = handler
  }

  get onFocusWithin(): ((ref: GridNodeRenderable) => void) | undefined {
    return this.focusWithinHandler
  }

  set onBlurWithin(handler: ((ref: GridNodeRenderable) => void) | undefined) {
    this.blurWithinHandler = handler
  }

  get onBlurWithin(): ((ref: GridNodeRenderable) => void) | undefined {
    return this.blurWithinHandler
  }

  set onFocusLocal(handler: ((ref: GridNodeRenderable) => void) | undefined) {
    this.focusLocalHandler = handler
  }

  get onFocusLocal(): ((ref: GridNodeRenderable) => void) | undefined {
    return this.focusLocalHandler
  }

  set onBlurLocal(handler: ((ref: GridNodeRenderable) => void) | undefined) {
    this.blurLocalHandler = handler
  }

  get onBlurLocal(): ((ref: GridNodeRenderable) => void) | undefined {
    return this.blurLocalHandler
  }

  override focus() {
    super.focus()
    this[focusWithinStateSymbol](true)
    updateFocusWithinChain(this)
    updateFocusLocalFromNative(this)
  }

  focusWithin() {
    focusWithinManual(this)
  }

  blurWithin() {
    blurWithinManual(this)
  }

  focusLocal() {
    const grid = findNearestGrid(this)
    if (grid) {
      grid.setLocalFocusForDescendant(this)
      return
    }
    this[focusLocalStateSymbol](true)
  }

  blurLocal() {
    this[focusLocalStateSymbol](false)
  }

  blurLocalChain() {
    clearFocusLocalRecursive(this)
  }

  private handleKeyDown = (event: KeyEvent) => {
    this.externalKeyDown?.(event)

    if (event.defaultPrevented || event.propagationStopped || isBubblingKeyDown(event)) {
      return
    }

    bubbleKeyDown(this, event)
  };

  [focusWithinStateSymbol](next: boolean) {
    if (this.focusWithinState === next) {
      return
    }
    this.focusWithinState = next
    if (next) {
      this.focusWithinHandler?.(this)
    } else {
      this.blurWithinHandler?.(this)
    }
  }

  [getFocusWithinStateSymbol](): boolean {
    return this.focusWithinState
  }

  [focusLocalStateSymbol](next: boolean) {
    if (this.focusLocalRef === next) {
      return
    }
    this.focusLocalRef = next
    if (next) {
      this.focusLocalHandler?.(this)
    } else {
      this.blurLocalHandler?.(this)
    }
  }

  [getFocusLocalStateSymbol](): boolean {
    return this.focusLocalRef
  }
}
