// top-to-bottom layout with simple couple hubs
// keeps spouses adjacent on the same row and centers children under the couple

import type { Graph, Node } from '$lib/types/graph'

type GenMap = Map<string, number>

const spouseKey = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`

export const layoutWithHubs = (g: Graph): Graph => {
  const nodesById = new Map(g.nodes.map(n => [n.id, { ...n } as Node]))

  // maps for quick traversal
  const parentsOf = new Map<string, Set<string>>()   // child -> parents
  const childrenOf = new Map<string, Set<string>>()  // parent -> children
  const spousePairs = new Set<string>()              // undirected key a|b
  const spousesOf = new Map<string, Set<string>>()   // person -> spouses

  for (const e of g.edges) {
    if (e.type === 'parent') {
      if (!parentsOf.has(e.to)) parentsOf.set(e.to, new Set())
      parentsOf.get(e.to)!.add(e.from)
      if (!childrenOf.has(e.from)) childrenOf.set(e.from, new Set())
      childrenOf.get(e.from)!.add(e.to)
    } else if (e.type === 'spouse') {
      spousePairs.add(spouseKey(e.from, e.to))
      if (!spousesOf.has(e.from)) spousesOf.set(e.from, new Set())
      if (!spousesOf.has(e.to)) spousesOf.set(e.to, new Set())
      spousesOf.get(e.from)!.add(e.to)
      spousesOf.get(e.to)!.add(e.from)
    }
  }

  // generations based on parent edges
  const gen: GenMap = new Map()
  const roots = g.nodes
    .map(n => n.id)
    .filter(id => !parentsOf.has(id))
  const queue: Array<[string, number]> = roots.map(id => [id, 0])

  while (queue.length) {
    const [id, d] = queue.shift()!
    if (!gen.has(id) || d > gen.get(id)!) gen.set(id, d)
    for (const ch of childrenOf.get(id) ?? []) queue.push([ch, d + 1])
  }
  // fallback for isolated nodes
  for (const n of g.nodes) if (!gen.has(n.id)) gen.set(n.id, 0)

  // couple units per generation
  type Couple = { a: string, b: string, children: string[] }
  const couplesByGen = new Map<number, Couple[]>()
  const singlesByGen = new Map<number, string[]>()

  // find couples on the same generation row
  for (const [key] of spousePairs) {
    const [a, b] = key.split('|')
    const ga = gen.get(a) ?? 0
    const gb = gen.get(b) ?? 0
    if (ga !== gb) continue
    const children: string[] = []
    // child has exactly these two parents
    for (const [child, ps] of parentsOf) {
      if (ps.size === 2 && ps.has(a) && ps.has(b)) children.push(child)
    }
    const arr = couplesByGen.get(ga) ?? []
    arr.push({ a, b, children })
    couplesByGen.set(ga, arr)
  }

  // singles are nodes without a same-gen spouse unit
  for (const n of g.nodes) {
    const d = gen.get(n.id) ?? 0
    const hasSameGenSpouse = Array.from(spousesOf.get(n.id) ?? [])
      .some(s => (gen.get(s) ?? -1) === d)
    if (!hasSameGenSpouse) {
      const arr = singlesByGen.get(d) ?? []
      arr.push(n.id)
      singlesByGen.set(d, arr)
    }
  }

  // geometry
  const nodeW = 140
  const nodeH = 60
  const gapX = 40
  const gapY = 90
  const partnerGap = 20
  const siblingGap = 30

  // place each generation
  const allGens = Array.from(new Set([...couplesByGen.keys(), ...singlesByGen.keys()])).sort((a, b) => a - b)

  for (const d of allGens) {
    const couples = couplesByGen.get(d) ?? []
    const singles = singlesByGen.get(d) ?? []

    // build row units: couples first (more stable), then singles
    type Unit = { width: number, place: () => void }
    const units: Unit[] = []

    // couple units
    for (const c of couples) {
      const width = nodeW * 2 + partnerGap
      const y = d * (nodeH + gapY) + nodeH * 0.5

      units.push({
        width,
        place: () => {
          const cx = currentX + width * 0.5
          // left parent then right parent, keep stable order by id
          const [left, right] = c.a < c.b ? [c.a, c.b] : [c.b, c.a]
          const leftX = cx - (partnerGap + nodeW) * 0.5
          const rightX = cx + (partnerGap + nodeW) * 0.5

          const A = nodesById.get(left)!
          const B = nodesById.get(right)!
          A.x = leftX
          A.y = y
          B.x = rightX
          B.y = y

          // lay out children on next row, centered under the couple
          if (c.children.length) {
            const rowY = (d + 1) * (nodeH + gapY) + nodeH * 0.5
            const k = c.children.length
            const totalW = k * nodeW + (k - 1) * siblingGap
            let x0 = cx - totalW * 0.5 + nodeW * 0.5
            for (const ch of c.children.sort()) {
              const C = nodesById.get(ch)
              if (!C) continue
              C.x = x0
              C.y = rowY
              x0 += nodeW + siblingGap
            }
          }
        }
      })
    }

    // single units
    for (const id of singles.sort()) {
      const width = nodeW
      const y = d * (nodeH + gapY) + nodeH * 0.5
      units.push({
        width,
        place: () => {
          const cx = currentX + width * 0.5
          const N = nodesById.get(id)!
          N.x = cx
          N.y = y

          // children of a single parent that are not already placed by a couple
          const kids = Array.from(childrenOf.get(id) ?? [])
            .filter(ch => {
              const ps = parentsOf.get(ch) ?? new Set()
              // if child is a couple-child, it was placed above
              return !(ps.size === 2 && spousePairs.has(spouseKey(...Array.from(ps) as [string, string])))
            })
          if (kids.length) {
            const rowY = (d + 1) * (nodeH + gapY) + nodeH * 0.5
            const k = kids.length
            const totalW = k * nodeW + (k - 1) * siblingGap
            let x0 = cx - totalW * 0.5 + nodeW * 0.5
            for (const ch of kids.sort()) {
              const C = nodesById.get(ch)
              if (!C) continue
              C.x = C.x ?? x0
              C.y = C.y ?? rowY
              x0 += nodeW + siblingGap
            }
          }
        }
      })
    }

    // pack row left-to-right
    const rowWidth = units.reduce((s, u) => s + u.width, 0) + Math.max(0, units.length - 1) * gapX
    let currentX = -rowWidth * 0.5
    for (let i = 0; i < units.length; i++) {
      units[i].place()
      currentX += units[i].width + gapX
    }
  }

  return { nodes: Array.from(nodesById.values()), edges: g.edges }
}
