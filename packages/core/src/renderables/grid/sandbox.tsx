import { createSignal, createUniqueId, For, Index } from "solid-js"
import { RGBA } from "@opentui/core"
import GridRenderable from "./grid"
import { innerGridKeys, outerGridElements, outerGridKeys } from "./constants"

const transparent = RGBA.fromInts(0, 0, 0, 0)

function InnerGrid(props: { orientation: "vertical" | "horizontal"; id: string; coords: [number, number] }) {
  const [innerItems, setInnerItems] = createSignal([0, 1, 2, 3])

  return (
    <grid
      id={props.id}
      coords={props.coords}
      keys={innerGridKeys(props)}
      style={{
        width: "50%",
        height: "50%",
        border: true,
        borderColor: transparent,
        focusedBorderColor: "white",
        backgroundColor: transparent,
        flexDirection: props.orientation === "vertical" ? "column" : "row",
        gap: 1,
      }}
      onKeyDown={(ev) => {
        switch (ev.name) {
          case "space":
            ev.stopPropagation()

            setInnerItems([0])
            break
        }
      }}
      onFocus={(ev) => {
        ev.target.currentFocusLocal?.focus()
      }}
      onFocusLocal={(ev) => {
        ev.target.backgroundColor = "white"
        ev.target.borderColor = "white"
      }}
      onBlurLocal={(ev) => {
        ev.target.backgroundColor = transparent
        ev.target.borderColor = transparent
      }}
    >
      <Index each={innerItems()}>
        {(item, i) => {
          const slotId = createUniqueId()

          return (
            <grid_node
              id={`${props.id}|${slotId}`}
              coords={props.orientation === "vertical" ? [i, 0] : [0, i]}
              style={{
                backgroundColor: "red",
                width: props.orientation === "vertical" ? undefined : "100%",
                height: props.orientation === "vertical" ? "100%" : undefined,
                border: true,
                borderColor: "red",
                focusedBorderColor: "white",
              }}
              onKeyDown={(ev) => {
                switch (ev.name) {
                  case "space":
                    ev.stopPropagation()

                    setInnerItems((prev) => [...prev.slice(0, i), item(), ...prev.slice(i)])
                    break
                  case "backspace":
                    setInnerItems((prev) => prev.filter((_, j) => i !== j))
                    break
                }
              }}
              onFocusLocal={(ev) => {
                ev.target.backgroundColor = "green"
                ev.target.borderColor = "green"
              }}
              onBlurLocal={(ev) => {
                ev.target.backgroundColor = "red"
                ev.target.borderColor = "red"
              }}
            >
              <text>
                {item()}-{slotId}
              </text>
            </grid_node>
          )
        }}
      </Index>
    </grid>
  )
}

export default function (props: { ref: GridRenderable }) {
  return (
    <grid
      coords={[0, 0]}
      id="main"
      ref={props.ref}
      keys={outerGridKeys}
      style={{
        flexDirection: "row",
        backgroundColor: "black",
        width: "100%",
        height: "100%",
        flexWrap: "wrap",
      }}
    >
      <For each={outerGridElements}>
        {(item) => <InnerGrid id={item.id} orientation={item.orientation} coords={item.coords} />}
      </For>
    </grid>
  )
}
