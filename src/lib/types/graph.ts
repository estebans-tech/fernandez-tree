export type NodeId = string

export type Node = {
  id: NodeId
  label: string
  x: number
  y: number
}

export type Edge = {
  id: string
  from: NodeId
  to: NodeId
  type: 'parent' | 'spouse'
}

export type Graph = {
  nodes: Node[]
  edges: Edge[]
}

export type Transform = {
  x: number   // pan x in px
  y: number   // pan y in px
  k: number   // scale factor
}
