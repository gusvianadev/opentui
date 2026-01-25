import type { GridKeys } from "./types"

export const innerGridKeys = (props: {
  orientation: "vertical" | "horizontal"
  id: string
  coords: [number, number]
}): GridKeys => ({
  movement: {
    overflowBehavior: "wrap-around",
    ...(props.orientation === "vertical"
      ? {
          up: {
            name: "up",
            overflowBehavior: props.id === "x, y" ? "stop" : undefined,
          },
          down: {
            name: "down",
            overflowBehavior: props.id === "-x, -y" ? "stop" : undefined,
          },
        }
      : {
          left: {
            name: "left",
            overflowBehavior: props.id === "x, -y" ? "stop" : undefined,
          },
          right: {
            name: "right",
            overflowBehavior: props.id === "-x, y" ? "stop" : undefined,
          },
        }),
  },
})

export const outerGridElements: {
  id: string
  orientation: "vertical" | "horizontal"
  coords: [number, number]
}[] = [
  {
    id: "-x, -y",
    coords: [0, 0],
    orientation: "vertical",
  },
  {
    id: "x, -y",
    coords: [0, 1],
    orientation: "horizontal",
  },
  {
    id: "-x, y",
    coords: [1, 0],
    orientation: "horizontal",
  },
  {
    id: "x, y",
    coords: [1, 1],
    orientation: "vertical",
  },
]

export const outerGridKeys = {
  actions: {
    focus: {
      name: "return",
    },
    unfocus: {
      name: "escape",
    },
  },

  movement: {
    overflowBehavior: "wrap-around",
    left: {
      name: "left",
      conditions: ["ctrl"],
    },
    right: {
      name: "right",
      conditions: ["ctrl"],
    },
    up: {
      name: "up",
      conditions: ["ctrl"],
    },
    down: {
      name: "down",
      conditions: ["ctrl"],
    },
  },
}
