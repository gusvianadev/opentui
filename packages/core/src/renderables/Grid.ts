import {
  BoxRenderable,
  RenderableEvents,
  type BoxOptions,
  type KeyEvent,
  type RenderContext,
  type Renderable,
} from "@opentui/core"

export type KeyCondition = "ctrl" | "shift" | "meta" | "option"
export type Direction = "left" | "right" | "up" | "down"

export interface KeySpec {
  name: string
  conditions?: KeyCondition[]
}

export type DirectionKeys = Partial<Record<Direction, KeySpec>>
export type GridLayout = string[] | string[][]

export interface GridFocusChangeEvent {
  prevFocus: Renderable | null
  newFocus: Renderable | null
  triggeredBy?: KeyEvent
}

export interface GridOptions extends BoxOptions<BoxRenderable> {
  layout?: GridLayout
  directionKeys?: DirectionKeys
  onNativeFocusChange?: (event: GridFocusChangeEvent) => void
  onFocusWithinChange?: (event: GridFocusChangeEvent) => void
  onFocusLocalChange?: (event: GridFocusChangeEvent) => void
  onKeyDown?: (event: KeyEvent) => void
  onFocus?: (ref: GridRenderable) => void
  onBlur?: (ref: GridRenderable) => void
  onFocusWithin?: (ref: GridRenderable) => void
  onBlurWithin?: (ref: GridRenderable) => void
  onFocusLocal?: (ref: GridRenderable) => void
  onBlurLocal?: (ref: GridRenderable) => void
}

type GridCell = {
  row: number
  col: number
  id: string
}

export const bubbleKeyDownMarker = Symbol("bubbleKeyDown")
export const focusWithinStateSymbol = Symbol("focusWithinState")
export const getFocusWithinStateSymbol = Symbol("getFocusWithinState")
export const focusLocalStateSymbol = Symbol("focusLocalState")
export const getFocusLocalStateSymbol = Symbol("getFocusLocalState")

export type FocusWithinCapable = Renderable & {
  [focusWithinStateSymbol](next: boolean): void
  [getFocusWithinStateSymbol](): boolean
  focusWithin(): void
  blurWithin(): void
}

export type FocusLocalCapable = Renderable & {
  [focusLocalStateSymbol](next: boolean): void
  [getFocusLocalStateSymbol](): boolean
  focusLocal(): void
  blurLocal(): void
  blurLocalChain(): void
}

const directionDeltas: Record<Direction, { dr: number; dc: number }> = {
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
}

export const isBubblingKeyDown = (event: KeyEvent): boolean =>
  !!(event as { [bubbleKeyDownMarker]?: boolean })[bubbleKeyDownMarker]

export const bubbleKeyDown = (start: Renderable, event: KeyEvent): boolean => {
  let current = start.parent

  while (current) {
    const handler = (current as { onKeyDown?: (key: KeyEvent) => void }).onKeyDown
    if (handler) {
      const marked = (event as { [bubbleKeyDownMarker]?: boolean })[bubbleKeyDownMarker]
      ;(event as { [bubbleKeyDownMarker]?: boolean })[bubbleKeyDownMarker] = true
      try {
        handler(event)
      } finally {
        if (!marked) {
          delete (event as { [bubbleKeyDownMarker]?: boolean })[bubbleKeyDownMarker]
        }
      }
      if (event.defaultPrevented || event.propagationStopped) {
        return true
      }
    }

    current = current.parent
  }

  return false
}

const normalizeLayout = (layout?: GridLayout): string[][] => {
  if (!layout || layout.length === 0) {
    return []
  }

  if (typeof layout[0] === "string") {
    return (layout as string[]).map((id) => [id])
  }

  return layout as string[][]
}

const matchesKeySpec = (spec: KeySpec | undefined, event: KeyEvent): boolean => {
  if (!spec || spec.name !== event.name) {
    return false
  }

  const conditions: KeyCondition[] = ["ctrl", "shift", "meta", "option"]
  const activeConditions = conditions.filter((condition) => event[condition])

  return (
    activeConditions.every((condition) => spec.conditions?.includes(condition)) &&
    activeConditions.length === (spec.conditions?.length ?? 0)
  )
}

export const getChildren = (target: Renderable): Renderable[] => {
  const children = (target as { getChildren?: () => Renderable[] }).getChildren?.()
  return children ?? []
}

export const isFocusWithinCapable = (node: Renderable): node is FocusWithinCapable =>
  typeof (node as FocusWithinCapable)[getFocusWithinStateSymbol] === "function"

export const isFocusLocalCapable = (node: Renderable): node is FocusLocalCapable =>
  typeof (node as FocusLocalCapable)[getFocusLocalStateSymbol] === "function"

const getFocusWithinChain = (node: Renderable): FocusWithinCapable[] => {
  const chain: FocusWithinCapable[] = []
  let current: Renderable | null = node

  while (current) {
    if (isFocusWithinCapable(current)) {
      chain.push(current)
    }
    current = current.parent
  }

  return chain
}

export const clearFocusWithinRecursive = (node: Renderable) => {
  const stack: Renderable[] = [node]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) {
      continue
    }
    if (isFocusWithinCapable(current)) {
      current[focusWithinStateSymbol](false)
    }
    const children = getChildren(current)
    if (children.length > 0) {
      stack.push(...children)
    }
  }
}

export const clearFocusLocalRecursive = (node: Renderable) => {
  const stack: Renderable[] = [node]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) {
      continue
    }
    if (isFocusLocalCapable(current)) {
      current[focusLocalStateSymbol](false)
    }
    const children = getChildren(current)
    if (children.length > 0) {
      stack.push(...children)
    }
  }
}

let lastFocusedRenderable: Renderable | null = null
let lastManualFocusWithin: FocusWithinCapable | null = null

export const updateFocusWithinChain = (focused: Renderable) => {
  const newChain = getFocusWithinChain(focused)
  const previous = lastFocusedRenderable
  const previousChain = previous ? getFocusWithinChain(previous) : []

  let overlapNode: FocusWithinCapable | null = null
  for (const node of newChain) {
    if (node[getFocusWithinStateSymbol]()) {
      overlapNode = node
      break
    }
  }

  for (const node of newChain) {
    if (node === overlapNode) {
      break
    }
    node[focusWithinStateSymbol](true)
  }

  for (const node of previousChain) {
    if (node === overlapNode) {
      break
    }
    node[focusWithinStateSymbol](false)
  }

  lastFocusedRenderable = focused
}

export const updateFocusLocalFromNative = (focused: Renderable) => {
  const grid = findNearestGrid(focused)
  if (grid) {
    grid.setLocalFocusForDescendant(focused)
    return
  }

  if (isFocusLocalCapable(focused)) {
    focused[focusLocalStateSymbol](true)
  }
}

export const findNearestGrid = (node: Renderable): GridRenderable | null => {
  let current = node.parent
  while (current) {
    if (current instanceof GridRenderable) {
      return current
    }
    current = current.parent
  }
  return null
}

export const focusWithinManual = (node: FocusWithinCapable) => {
  if (lastManualFocusWithin && lastManualFocusWithin !== node) {
    lastManualFocusWithin.blurWithin()
  }
  node[focusWithinStateSymbol](true)
  lastManualFocusWithin = node
}

export const blurWithinManual = (node: FocusWithinCapable) => {
  if (lastManualFocusWithin === node) {
    lastManualFocusWithin = null
  }
  clearFocusWithinRecursive(node)
}

export class GridRenderable extends BoxRenderable {
  private layoutMatrix: string[][] = []
  private layoutValue?: GridLayout
  private directionKeysValue?: DirectionKeys
  private nativeFocusChangeHandler?: (event: GridFocusChangeEvent) => void
  private focusWithinChangeHandler?: (event: GridFocusChangeEvent) => void
  private focusLocalChangeHandler?: (event: GridFocusChangeEvent) => void
  private externalKeyDown?: (event: KeyEvent) => void
  private focusHandler?: (ref: GridRenderable) => void
  private blurHandler?: (ref: GridRenderable) => void
  private focusWithinHandler?: (ref: GridRenderable) => void
  private blurWithinHandler?: (ref: GridRenderable) => void
  private focusLocalHandler?: (ref: GridRenderable) => void
  private blurLocalHandler?: (ref: GridRenderable) => void
  private focusWithinState = false
  private localFocus = false
  private localFocusedDescendant: Renderable | null = null
  private nativeFocused = false
  private childrenById = new Map<string, Renderable>()
  private currentCell?: GridCell
  private currentId?: string

  constructor(ctx: RenderContext, options: GridOptions) {
    const {
      layout,
      directionKeys,
      onNativeFocusChange,
      onFocusWithinChange,
      onFocusLocalChange,
      onKeyDown,
      onFocus,
      onBlur,
      onFocusWithin,
      onBlurWithin,
      onFocusLocal: onFocusLocal,
      onBlurLocal,
      ...rest
    } = options

    super(ctx, rest)

    this._focusable = true
    this.externalKeyDown = onKeyDown
    this.directionKeysValue = directionKeys
    this.nativeFocusChangeHandler = onNativeFocusChange
    this.focusWithinChangeHandler = onFocusWithinChange
    this.focusLocalChangeHandler = onFocusLocalChange
    this.focusHandler = onFocus
    this.blurHandler = onBlur
    this.focusWithinHandler = onFocusWithin
    this.blurWithinHandler = onBlurWithin
    this.focusLocalHandler = onFocusLocal
    this.blurLocalHandler = onBlurLocal
    this.layout = layout ?? []
    super.onKeyDown = this.handleKeyDown
    this.on(RenderableEvents.FOCUSED, this.handleFocusEvent)
    this.on(RenderableEvents.BLURRED, this.handleBlurEvent)
    this.handleChildrenChanged()
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

  private handleFocusEvent = () => {
    if (this.nativeFocused) {
      return
    }
    this.nativeFocused = true
    this.focusHandler?.(this)
    updateFocusWithinChain(this)
    updateFocusLocalFromNative(this)
    if (!this.currentCell) {
      this.focusFirstChild()
    }
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

  set onFocus(handler: ((ref: GridRenderable) => void) | undefined) {
    this.focusHandler = handler
  }

  get onFocus(): ((ref: GridRenderable) => void) | undefined {
    return this.focusHandler
  }

  set onBlur(handler: ((ref: GridRenderable) => void) | undefined) {
    this.blurHandler = handler
  }

  get onBlur(): ((ref: GridRenderable) => void) | undefined {
    return this.blurHandler
  }

  set onFocusWithin(handler: ((ref: GridRenderable) => void) | undefined) {
    this.focusWithinHandler = handler
  }

  get onFocusWithin(): ((ref: GridRenderable) => void) | undefined {
    return this.focusWithinHandler
  }

  set onBlurWithin(handler: ((ref: GridRenderable) => void) | undefined) {
    this.blurWithinHandler = handler
  }

  get onBlurWithin(): ((ref: GridRenderable) => void) | undefined {
    return this.blurWithinHandler
  }

  set onFocusLocal(handler: ((ref: GridRenderable) => void) | undefined) {
    this.focusLocalHandler = handler
  }

  get onFocusLocal(): ((ref: GridRenderable) => void) | undefined {
    return this.focusLocalHandler
  }

  set onBlurLocal(handler: ((ref: GridRenderable) => void) | undefined) {
    this.blurLocalHandler = handler
  }

  get onBlurLocal(): ((ref: GridRenderable) => void) | undefined {
    return this.blurLocalHandler
  }

  get focusedWithin(): boolean {
    return this.focusWithinState
  }

  get focusedLocal(): boolean {
    return this.localFocus
  }

  set layout(value: GridLayout | undefined) {
    this.layoutValue = value
    this.layoutMatrix = normalizeLayout(value)
    this.syncFocusWithLayout()
  }

  get layout(): GridLayout | undefined {
    return this.layoutValue
  }

  set directionKeys(value: DirectionKeys | undefined) {
    this.directionKeysValue = value
  }

  get directionKeys(): DirectionKeys | undefined {
    return this.directionKeysValue
  }

  set onNativeFocusChange(handler: ((event: GridFocusChangeEvent) => void) | undefined) {
    this.nativeFocusChangeHandler = handler
  }

  get onNativeFocusChange(): ((event: GridFocusChangeEvent) => void) | undefined {
    return this.nativeFocusChangeHandler
  }

  set onFocusWithinChange(handler: ((event: GridFocusChangeEvent) => void) | undefined) {
    this.focusWithinChangeHandler = handler
  }

  get onFocusWithinChange(): ((event: GridFocusChangeEvent) => void) | undefined {
    return this.focusWithinChangeHandler
  }

  set onFocusLocalChange(handler: ((event: GridFocusChangeEvent) => void) | undefined) {
    this.focusLocalChangeHandler = handler
  }

  get onFocusLocalChange(): ((event: GridFocusChangeEvent) => void) | undefined {
    return this.focusLocalChangeHandler
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

  focusCurrentLocal() {
    if (this.localFocusedDescendant) {
      this.localFocusedDescendant.focus()
    }
  }

  override add(obj: unknown, index?: number): number {
    const result = super.add(obj, index)
    this.handleChildrenChanged()
    return result
  }

  override insertBefore(obj: unknown, anchor?: unknown): number {
    const result = super.insertBefore(obj, anchor)
    this.handleChildrenChanged()
    return result
  }

  override remove(id: string): void {
    super.remove(id)
    this.handleChildrenChanged()
  }

  handleDirectionalKey(event: KeyEvent, source?: Renderable | null): boolean {
    const direction = this.getDirectionForEvent(event)

    if (!direction) {
      return false
    }

    this.syncCurrentCellFromSource(source)

    if (!this.currentCell) {
      const focused = this.focusFirstChild()
      if (focused) {
        event.stopPropagation()
        return true
      }
      return false
    }

    const nextCell = this.findNextCell(direction, this.currentCell)
    if (!nextCell) {
      return false
    }

    const moved = this.focusCell(nextCell, { emitChange: true, triggeredBy: event })
    if (moved) {
      event.stopPropagation()
    }
    return moved
  }

  private handleKeyDown = (event: KeyEvent) => {
    const handled = this.handleDirectionalKey(event, this.getFocusedRenderable())

    if (handled) {
      return
    }

    this.externalKeyDown?.(event)

    if (!event.defaultPrevented && !event.propagationStopped && !isBubblingKeyDown(event)) {
      bubbleKeyDown(this, event)
    }
  }

  private handleChildrenChanged() {
    this.rebuildChildrenMap()
    this.syncFocusWithLayout()
  }

  private rebuildChildrenMap() {
    this.childrenById.clear()

    for (const child of this.getChildren()) {
      this.childrenById.set(child.id, child)
    }
  }

  setLocalFocusForDescendant(target: Renderable) {
    if (this.localFocusedDescendant === target) {
      return
    }

    const prev = this.localFocusedDescendant ?? null

    if (this.localFocusedDescendant && isFocusLocalCapable(this.localFocusedDescendant)) {
      this.localFocusedDescendant[focusLocalStateSymbol](false)
    }

    if (isFocusLocalCapable(target)) {
      target[focusLocalStateSymbol](true)
    }

    this.localFocusedDescendant = target

    if (this.focusLocalChangeHandler) {
      this.focusLocalChangeHandler({
        prevFocus: prev,
        newFocus: target,
        triggeredBy: undefined,
      })
    }
  }

  private syncFocusWithLayout() {
    if (!this.layoutMatrix.length) {
      this.currentCell = undefined
      this.currentId = undefined
      return
    }

    this.rebuildChildrenMap()

    if (!this.currentId) {
      const focused = this.getFocusedRenderable()
      if (focused && (focused === this || this.isAncestorOf(focused))) {
        this.focusFirstChild()
      }
      if (!focused && !findNearestGrid(this)) {
        this.focusFirstChild()
      }
      return
    }

    if (!this.childrenById.has(this.currentId) || !this.layoutContainsId(this.currentId)) {
      this.currentCell = undefined
      this.currentId = undefined
      this.focusFirstChild()
      return
    }

    const cell = this.findFirstCellForId(this.currentId)
    if (cell) {
      this.currentCell = cell
    }
  }

  private focusFirstChild(): boolean {
    const cell = this.findFirstCellWithChild()
    if (!cell) {
      return false
    }

    return this.focusCell(cell, { emitChange: false })
  }

  private focusCell(cell: GridCell, options: { emitChange: boolean; triggeredBy?: KeyEvent }): boolean {
    const next = this.childrenById.get(cell.id)
    if (!next) {
      return false
    }

    const prev = this.currentId ? (this.childrenById.get(this.currentId) ?? null) : null
    this.currentCell = cell
    this.currentId = cell.id

    if (this.getFocusedRenderable() !== next) {
      next.focus()
    }

    this.setLocalFocusForDescendant(next)

    if (options.emitChange) {
      this.nativeFocusChangeHandler?.({
        prevFocus: prev,
        newFocus: next,
        triggeredBy: options.triggeredBy,
      })
    }

    return true
  }

  private syncCurrentCellFromSource(source?: Renderable | null) {
    const sourceId = source?.id ?? this.getFocusedRenderable()?.id

    if (!sourceId) {
      return
    }

    if (this.currentId === sourceId) {
      return
    }

    const cell = this.findFirstCellForId(sourceId)
    if (cell) {
      this.currentCell = cell
      this.currentId = cell.id
    }
  }

  private getFocusedRenderable(): Renderable | null {
    const renderer = this.ctx as unknown as { currentFocusedRenderable?: Renderable | null }
    return renderer.currentFocusedRenderable ?? null
  }

  private isAncestorOf(node: Renderable): boolean {
    let current: Renderable | null = node
    while (current) {
      if (current === this) {
        return true
      }
      current = current.parent
    }
    return false
  }

  private getDirectionForEvent(event: KeyEvent): Direction | null {
    if (!this.directionKeysValue) {
      return null
    }

    if (matchesKeySpec(this.directionKeysValue.left, event)) {
      return "left"
    }
    if (matchesKeySpec(this.directionKeysValue.right, event)) {
      return "right"
    }
    if (matchesKeySpec(this.directionKeysValue.up, event)) {
      return "up"
    }
    if (matchesKeySpec(this.directionKeysValue.down, event)) {
      return "down"
    }

    return null
  }

  private findNextCell(direction: Direction, from: GridCell): GridCell | undefined {
    const delta = directionDeltas[direction]
    let row = from.row + delta.dr
    let col = from.col + delta.dc
    const currentId = from.id

    while (this.isInBounds(row, col)) {
      const id = this.layoutMatrix[row]?.[col]
      if (id && id !== currentId) {
        return { row, col, id }
      }
      row += delta.dr
      col += delta.dc
    }

    return undefined
  }

  private isInBounds(row: number, col: number): boolean {
    if (row < 0 || row >= this.layoutMatrix.length) {
      return false
    }
    const rowData = this.layoutMatrix[row]
    return !!rowData && col >= 0 && col < rowData.length
  }

  private findFirstCellWithChild(): GridCell | undefined {
    for (let row = 0; row < this.layoutMatrix.length; row += 1) {
      const rowData = this.layoutMatrix[row]
      if (!rowData) {
        continue
      }
      for (let col = 0; col < rowData.length; col += 1) {
        const id = rowData[col]
        if (!id) {
          continue
        }
        if (this.childrenById.has(id)) {
          return { row, col, id }
        }
      }
    }
    return undefined
  }

  private findFirstCellForId(id: string): GridCell | undefined {
    for (let row = 0; row < this.layoutMatrix.length; row += 1) {
      const rowData = this.layoutMatrix[row]
      if (!rowData) {
        continue
      }
      for (let col = 0; col < rowData.length; col += 1) {
        if (rowData[col] === id) {
          return { row, col, id }
        }
      }
    }
    return undefined
  }

  private layoutContainsId(id: string): boolean {
    return this.layoutMatrix.some((row) => row.includes(id))
  }

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
    if (this.localFocus === next) {
      return
    }
    this.localFocus = next
    if (next) {
      this.focusLocalHandler?.(this)
    } else {
      this.blurLocalHandler?.(this)
    }
  }

  [getFocusLocalStateSymbol](): boolean {
    return this.localFocus
  }
}
