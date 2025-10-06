// very small top-to-bottom layout
// computes generations from parent edges and places nodes on a grid

import type { Graph } from '$lib/types/graph'

export const layoutSimple = (g: Graph): Graph => {
  const parentsOf = new Map<string, Set<string>>()
  const childrenOf = new Map<string, Set<string>>()

  for (const e of g.edges) if (e.type === 'parent') {
    if (!childrenOf.has(e.from)) childrenOf.set(e.from, new Set())
    childrenOf.get(e.from)!.add(e.to)
    if (!parentsOf.has(e.to)) parentsOf.set(e.to, new Set())
    parentsOf.get(e.to)!.add(e.from)
  }

  const gen = new Map<string, number>()
  const roots = g.nodes.map(n => n.id).filter(id => !parentsOf.has(id))
  const queue = [...roots.map(id => [id, 0] as const)]

  while (queue.length) {
    const [id, d] = queue.shift()!
    if (!gen.has(id) || d > gen.get(id)!) gen.set(id, d)
    for (const ch of childrenOf.get(id) ?? []) queue.push([ch, d + 1])
  }

  // fallback for isolated nodes with parents set but no ancestry
  for (const n of g.nodes) if (!gen.has(n.id)) gen.set(n.id, 0)

  // group by generation and place in rows
  const rows = new Map<number, string[]>()
  for (const [id, d] of gen) {
    if (!rows.has(d)) rows.set(d, [])
    rows.get(d)!.push(id)
  }
  for (const r of rows.values()) r.sort()

  const nodeW = 140
  const nodeH = 60
  const gapX = 40
  const gapY = 90

  const placed = new Map(g.nodes.map(n => [n.id, n]))
  for (const [d, ids] of rows) {
    const totalW = ids.length * nodeW + (ids.length - 1) * gapX
    let x = -totalW * 0.5
    let y = d * (nodeH + gapY)

    for (const id of ids) {
      const n = placed.get(id)!
      n.x = x + nodeW * 0.5
      n.y = y + nodeH * 0.5
      x += nodeW + gapX
    }
  }

  return {
    nodes: Array.from(placed.values()),
    edges: g.edges
  }
}
