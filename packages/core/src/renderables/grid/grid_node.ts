import { BoxRenderable, KeyEvent, Renderable, RenderableEvents } from "@opentui/core"
import { type RenderContext } from "@opentui/core"
import GridRenderable from "./grid"
import { bubbleKeyDown, walkGridNodeAncestors } from "./utils"
import { prevFocusedRenderable, type AddPrevFocusedRenderable } from "./symbols"
import type {
  EventHandler,
  BlurEvent,
  BlurLocalEvent,
  BlurWithinEvent,
  FocusEvent,
  FocusLocalEvent,
  FocusWithinEvent,
  GridNodeOptions,
} from "./types"

export default class GridNodeRenderable extends BoxRenderable {
  /** Grid coordinates in the parent matrix. Managed externally. */
  public coords: [number, number] = [0, 0]

  // === Focus state ===
  /** Tracks focus-within for the grid subtree. */
  protected _focusedWithin: boolean = false

  /** Focus handlers for this node. */
  public _onFocus?: EventHandler<FocusEvent<this>>
  public _onFocusWithin?: EventHandler<FocusWithinEvent<this>>
  public _onFocusLocal?: EventHandler<FocusLocalEvent<this>>

  /** Blur handlers for this node. */
  public _onBlur?: EventHandler<BlurEvent<this>>
  public _onBlurWithin?: EventHandler<BlurWithinEvent<this>>
  public _onBlurLocal?: EventHandler<BlurLocalEvent<this>>

  // === Key handling ===
  /** Stored external handler so we can wrap bubbling logic safely. */
  private externalKeyDown?: (event: KeyEvent) => void

  constructor(ctx: RenderContext, options: GridNodeOptions) {
    super(ctx, options)

    this._focusable = true
    this.on(RenderableEvents.FOCUSED, this.handleFocusEvent)
    this.on(RenderableEvents.BLURRED, this.handleBlurEvent)
  }

  override focus() {
    super.focus()
  }

  // === Identity ===
  /** Sync id changes back into the parent grid lookup table. */
  public override set id(id: string) {
    const previousId = super.id
    super.id = id

    if (this.parent instanceof GridRenderable && previousId !== id) {
      this.parent.updateChildId(previousId, id, this)
    }
  }

  public override get id() {
    return super.id
  }

  // === Focus: primary ===
  set onFocus(handler: EventHandler<FocusWithinEvent<this>> | undefined) {
    this._onFocus = handler
  }
  get onFocus(): EventHandler<FocusWithinEvent<this>> | undefined {
    return this._onFocus
  }

  set onBlur(handler: EventHandler<BlurEvent<this>> | undefined) {
    this._onBlur = handler
  }
  get onBlur() {
    return this._onBlur
  }

  /** Primary focus handler. Updates focus-within and local focus state. */
  private handleFocusEvent() {
    let current: Renderable | null = this

    while (current) {
      if (!(current instanceof GridNodeRenderable)) {
        current = current.parent
        continue
      }

      if (current.focusedWithin) {
        // Blur any previous focus-within chain before re-focusing.
        walkGridNodeAncestors((this._ctx as AddPrevFocusedRenderable)[prevFocusedRenderable], current, (node) =>
          node.blurWithin(),
        )
        break
      }

      // Bubble focus-within and focus-local up to the grid root.
      current.focusWithin()
      current.focusLocal()
      current = current.parent
    }

    // NOTE: This must be called after the while loop, otherwise someone could do
    // `onFocus={() => somethingElse.focus()}` and break the whole chain.
    this._onFocus?.({ target: this })
    this.focusLocal()
  }

  /** Stores the last focused node so focus-within can be blurred next time. */
  private handleBlurEvent() {
    this._onBlur?.({ target: this })
    ;(this._ctx as AddPrevFocusedRenderable)[prevFocusedRenderable] = this
  }

  // === Focus: within ===
  set onFocusWithin(handler: EventHandler<FocusWithinEvent<this>> | undefined) {
    this._onFocusWithin = handler
  }
  get onFocusWithin(): EventHandler<FocusWithinEvent<this>> | undefined {
    return this._onFocusWithin
  }

  set onBlurWithin(handler: EventHandler<BlurWithinEvent<this>> | undefined) {
    this._onBlurWithin = handler
  }
  get onBlurWithin() {
    return this._onBlurWithin
  }

  protected get focusedWithin() {
    return this._focusedWithin
  }

  protected focusWithin() {
    this._focusedWithin = true
    this._onFocusWithin?.({
      target: this,
    })
  }

  protected blurWithin() {
    this._focusedWithin = false
    this._onBlurWithin?.({ target: this })
  }

  // === Focus: local ===
  set onFocusLocal(handler: EventHandler<FocusLocalEvent<this>> | undefined) {
    this._onFocusLocal = handler
  }
  get onFocusLocal(): EventHandler<FocusLocalEvent<this>> | undefined {
    return this._onFocusLocal
  }

  set onBlurLocal(handler: EventHandler<BlurLocalEvent<this>> | undefined) {
    this._onBlurLocal = (ev) => {
      // Blur normal focus first to keep parent state consistent.
      this.blur()
      this.blurWithin()
      handler?.({ target: ev.target })
    }
  }
  get onBlurLocal() {
    return this._onBlurLocal
  }
  public get focusedLocal() {
    return !(this.parent instanceof GridRenderable) || this.parent.currentFocusLocal === this
  }

  /** Request local focus from the parent grid. */
  public focusLocal() {
    if (!(this.parent instanceof GridRenderable)) return
    this.parent.currentFocusLocal = this
  }

  /** Drop local focus in the parent grid. */
  public blurLocal() {
    if (!(this.parent instanceof GridRenderable)) return
    this.parent.currentFocusLocal = undefined
  }

  // === Key handling ===
  /** Wrap keydown to bubble to ancestors once local handlers run. */
  public override set onKeyDown(handler: ((key: KeyEvent) => void) | undefined) {
    this.externalKeyDown = handler

    super.onKeyDown = (event: KeyEvent) => {
      // Invoke external handler first, then bubble upward.
      handler?.(event)
      bubbleKeyDown(this, event)
    }
  }

  public override get onKeyDown() {
    return this.externalKeyDown
  }
}
