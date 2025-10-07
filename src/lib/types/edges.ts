// Edge domain types

export type EdgeType = 'parent' | 'spouse'

export type EdgeId = string

export type EdgeEntry = {
  id: EdgeId
  type: EdgeType
  from: string   // node id
  to: string     // node id
  meta?: {
    line?: number
  }
}

// A lightweight duplicate-safe container for edges
export type EdgeSet = {
  byId: Map<EdgeId, EdgeEntry>
  list: EdgeEntry[]
}
