import { createSignal, For } from "solid-js"
import { useKeyboard, useRenderer } from "@opentui/solid"

type FocusFlags = {
  focused: boolean
  within: boolean
  local: boolean
}

type GridNodeProps = {
  id: string
  label: string
  width: `${number}%`
  height: `${number}%`
}

const GridNode = (props: GridNodeProps) => {
  const [flags, setFlags] = createSignal<FocusFlags>({
    focused: false,
    within: false,
    local: false,
  })

  const updateFlags = (partial: Partial<FocusFlags>) => {
    setFlags((prev) => ({ ...prev, ...partial }))
  }

  return (
    <grid_node
      id={props.id}
      style={{
        width: props.width,
        height: props.height,
        alignItems: "center",
        justifyContent: "center",
        border: true,
      }}
      onFocus={() => {
        updateFlags({ focused: true })
      }}
      onBlur={() => {
        updateFlags({ focused: false })
      }}
      onFocusWithin={() => {
        updateFlags({ within: true })
      }}
      onBlurWithin={() => {
        updateFlags({ within: false })
      }}
      onFocusLocal={() => {
        updateFlags({ local: true })
      }}
      onBlurLocal={() => {
        updateFlags({ local: false })
      }}
    >
      <text>
        {props.label}: {flags().focused ? "F" : "-"}
        {flags().within ? "W" : "-"}
        {flags().local ? "L" : "-"}
      </text>
    </grid_node>
  )
}

const SubGridNested = (props: {
  id: string
  label: string
  color: string
  width: `${number}%`
  height: `${number}%`
}) => {
  const items = [
    { id: `1`, label: `1`, color: "blue" },
    { id: `2`, label: `2`, color: "red" },
    { id: `3`, label: `3`, color: "green" },
  ]

  const [flags, setFlags] = createSignal<FocusFlags>({
    focused: false,
    within: false,
    local: false,
  })

  const updateFlags = (partial: Partial<FocusFlags>) => {
    setFlags((prev) => ({ ...prev, ...partial }))
  }

  return (
    <grid
      id={props.id}
      title={` ${props.label}: ${flags().focused ? "F" : "-"} ${flags().within ? "W" : "-"} ${flags().local ? "L" : "-"} `}
      layout={[items.map((item) => item.id)]}
      directionKeys={{
        right: { name: "right" },
        left: { name: "left" },
      }}
      style={{
        flexDirection: "row",
        width: props.width,
        height: props.height,
        backgroundColor: props.color,
        border: true,
      }}
      onFocus={(ref) => {
        ref.focusCurrentLocal()
        updateFlags({ focused: true })
      }}
      onBlur={() => updateFlags({ focused: false })}
      onFocusWithin={() => {
        updateFlags({ within: true })
      }}
      onBlurWithin={() => {
        updateFlags({ within: false })
      }}
      onFocusLocal={() => {
        updateFlags({ local: true })
      }}
      onBlurLocal={() => {
        updateFlags({ local: false })
      }}
    >
      <For each={items}>
        {(item) => {
          return <GridNode id={item.id} label={item.label} width="100%" height="100%" />
        }}
      </For>
    </grid>
  )
}

const SubGrid = (props: { id: string; label: string; color: string; width: `${number}%`; height: `${number}%` }) => {
  const items = [
    {
      id: `a`,
      label: `A`,
      color: props.color === "blue" ? "magenta" : "blue",
    },
    {
      id: `b`,
      label: `B`,
      color: props.color === "red" ? "magenta" : "red",
    },
    {
      id: `c`,
      label: `C`,
      color: props.color === "green" ? "magenta" : "green",
    },
  ]
  const [flags, setFlags] = createSignal<FocusFlags>({
    focused: false,
    within: false,
    local: false,
  })

  const updateFlags = (partial: Partial<FocusFlags>) => {
    setFlags((prev) => ({ ...prev, ...partial }))
  }

  return (
    <grid
      id={props.id}
      title={` ${props.label}: ${flags().focused ? "F" : "-"} ${flags().within ? "W" : "-"} ${flags().local ? "L" : "-"} `}
      layout={items.map((item) => [item.id])}
      directionKeys={{
        up: { name: "up" },
        down: { name: "down" },
      }}
      style={{
        width: props.width,
        height: props.height,
        backgroundColor: props.color,
        border: true,
      }}
      onFocus={(ref) => {
        ref.focusCurrentLocal()
        updateFlags({ focused: true })
      }}
      onBlur={() => {
        updateFlags({ focused: false })
      }}
      onFocusWithin={() => {
        updateFlags({ within: true })
      }}
      onBlurWithin={() => {
        updateFlags({ within: false })
      }}
      onFocusLocal={() => {
        updateFlags({ local: true })
      }}
      onBlurLocal={() => {
        updateFlags({ local: false })
      }}
    >
      <text>
        {props.label} {flags().focused ? "F" : "-"}
        {flags().within ? "W" : "-"}
        {flags().local ? "L" : "-"}
      </text>
      <For each={items}>
        {(item) => {
          return <SubGridNested id={item.id} label={item.label} width="100%" height="100%" color={item.color} />
        }}
      </For>
    </grid>
  )
}

export default function GridSandbox() {
  const items = [
    {
      id: "left",
      label: "Left",
      color: "red",
    },
    {
      id: "mid",
      label: "Mid",
      color: "green",
    },
    {
      id: "right",
      label: "Right",
      color: "blue",
    },
  ]
  const renderer = useRenderer()

  useKeyboard((keyEv) => {
    if (keyEv.name === "`") renderer.console.toggle()
  })

  return (
    <grid
      id="root"
      layout={[["left", "mid", "right"]]}
      directionKeys={{
        left: { name: "left", conditions: ["ctrl"] },
        right: { name: "right", conditions: ["ctrl"] },
      }}
      style={{
        flexDirection: "row",
        backgroundColor: "black",
        width: "100%",
        height: "100%",
      }}
    >
      <For each={items}>
        {(item) => {
          return <SubGrid id={item.id} label={item.label} color={item.color} width="100%" height="100%" />
        }}
      </For>
    </grid>
  )
}
