// top-to-bottom layout with simple couple hubs
// keeps spouses adjacent on the same row and centers children under the couple
// resilient to missing nodes by creating placeholders and always placing every node

import type { Graph, Node } from '$lib/types/graph'

type GenMap = Map<string, number>

const spouseKey = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`

export const layoutWithHubs = (g: Graph): Graph => {
  // clone nodes so we never mutate the input
  const nodesById = new Map<string, Node>(g.nodes.map(n => [n.id, { ...n }]))

  // ensure every edge endpoint has a node placeholder
  for (const e of g.edges) {
    for (const id of [e.from, e.to]) {
      if (!nodesById.has(id)) nodesById.set(id, { id, label: id, x: 0, y: 0 })
    }
  }

  // quick maps for traversal
  const parentsOf = new Map<string, Set<string>>()   // child -> parents
  const childrenOf = new Map<string, Set<string>>()  // parent -> children
  const spousePairs = new Set<string>()              // undirected a|b
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

  // compute generations via BFS from roots
  const gen: GenMap = new Map()
  const roots = Array.from(nodesById.keys()).filter(id => !parentsOf.has(id))
  const queue: Array<[string, number]> = roots.map(id => [id, 0])

  while (queue.length) {
    const [id, d] = queue.shift()!
    if (!gen.has(id) || d > gen.get(id)!) gen.set(id, d)
    for (const ch of childrenOf.get(id) ?? []) queue.push([ch, d + 1])
  }
  // fallback for nodes without ancestry info
  for (const id of nodesById.keys()) if (!gen.has(id)) gen.set(id, 0)

  // collect couple units per generation and their couple-children
  type Couple = { a: string, b: string, children: string[] }
  const couplesByGen = new Map<number, Couple[]>()
  const singlesByGen = new Map<number, string[]>()

  for (const key of spousePairs) {
    const [a, b] = key.split('|')
    const ga = gen.get(a) ?? 0
    const gb = gen.get(b) ?? 0
    if (ga !== gb) continue
    const children: string[] = []
    for (const [child, ps] of parentsOf) {
      if (ps.size === 2 && ps.has(a) && ps.has(b)) children.push(child)
    }
    const arr = couplesByGen.get(ga) ?? []
    arr.push({ a, b, children })
    couplesByGen.set(ga, arr)
  }

  // singles are nodes without a same-gen spouse
  for (const id of nodesById.keys()) {
    const d = gen.get(id) ?? 0
    const hasSameGenSpouse = Array.from(spousesOf.get(id) ?? []).some(s => (gen.get(s) ?? -1) === d)
    if (!hasSameGenSpouse) {
      const arr = singlesByGen.get(d) ?? []
      arr.push(id)
      singlesByGen.set(d, arr)
    }
  }

  // geometry constants
  const nodeW = 140
  const nodeH = 60
  const gapX = 40
  const gapY = 90
  const partnerGap = 20
  const siblingGap = 30

  // all generations in order
  const allGens = Array.from(new Set([...couplesByGen.keys(), ...singlesByGen.keys()])).sort((a, b) => a - b)

  // place each generation row
  for (const d of allGens) {
    const couples = couplesByGen.get(d) ?? []
    const singles = singlesByGen.get(d) ?? []

    type Unit = { width: number, place: (cx: number) => void }
    const units: Unit[] = []

    // couple unit places spouses side by side and centers their children on next row
    for (const c of couples) {
      const width = nodeW * 2 + partnerGap
      const y = d * (nodeH + gapY) + nodeH * 0.5

      units.push({
        width,
        place: cx => {
          const [left, right] = c.a < c.b ? [c.a, c.b] : [c.b, c.a]

          const A = nodesById.get(left) ?? { id: left, label: left, x: 0, y: 0 }
          const B = nodesById.get(right) ?? { id: right, label: right, x: 0, y: 0 }
          nodesById.set(left, A)
          nodesById.set(right, B)

          const leftX = cx - (partnerGap + nodeW) * 0.5
          const rightX = cx + (partnerGap + nodeW) * 0.5
          A.x = leftX
          A.y = y
          B.x = rightX
          B.y = y

          if (c.children.length) {
            const rowY = (d + 1) * (nodeH + gapY) + nodeH * 0.5
            const kids = [...c.children].sort()
            const k = kids.length
            const totalW = k * nodeW + (k - 1) * siblingGap
            let x0 = cx - totalW * 0.5 + nodeW * 0.5
            for (const ch of kids) {
              const C = nodesById.get(ch) ?? { id: ch, label: ch, x: 0, y: 0 }
              nodesById.set(ch, C)
              C.x = x0
              C.y = rowY
              x0 += nodeW + siblingGap
            }
          }
        }
      })
    }

    // single unit centers the node and its non-couple children on next row
    for (const id of singles.sort()) {
      const width = nodeW
      const y = d * (nodeH + gapY) + nodeH * 0.5

      units.push({
        width,
        place: cx => {
          const N = nodesById.get(id) ?? { id, label: id, x: 0, y: 0 }
          nodesById.set(id, N)
          N.x = cx
          N.y = y

          const kids = Array.from(childrenOf.get(id) ?? []).filter(ch => {
            const ps = parentsOf.get(ch) ?? new Set()
            if (ps.size !== 2) return true
            const [p1, p2] = Array.from(ps) as [string, string]
            return !spousePairs.has(spouseKey(p1, p2))
          })

          if (kids.length) {
            const rowY = (d + 1) * (nodeH + gapY) + nodeH * 0.5
            const k = kids.length
            const totalW = k * nodeW + (k - 1) * siblingGap
            let x0 = cx - totalW * 0.5 + nodeW * 0.5
            for (const ch of kids.sort()) {
              const C = nodesById.get(ch) ?? { id: ch, label: ch, x: 0, y: 0 }
              nodesById.set(ch, C)
              // if already placed by some other parent, keep it
              C.x = Number.isFinite(C.x) ? C.x : x0
              C.y = Number.isFinite(C.y) ? C.y : rowY
              x0 += nodeW + siblingGap
            }
          }
        }
      })
    }

    // pack all units left-to-right on the row
    const rowWidth = units.reduce((s, u) => s + u.width, 0) + Math.max(0, units.length - 1) * gapX
    let currentX = -rowWidth * 0.5
    for (const u of units) {
      const cx = currentX + u.width * 0.5
      u.place(cx)
      currentX += u.width + gapX
    }
  }

  // fallback: place any nodes that still lack coordinates
  const byGen = new Map<number, string[]>()
  for (const [id, n] of nodesById) {
    if (Number.isFinite(n.x) && Number.isFinite(n.y)) continue
    const d = gen.get(id) ?? 0
    const arr = byGen.get(d) ?? []
    arr.push(id)
    byGen.set(d, arr)
  }

  for (const [d, ids] of byGen) {
    const rowY = d * (nodeH + gapY) + nodeH * 0.5
    const k = ids.length
    const totalW = k * nodeW + (k - 1) * gapX
    let x0 = -totalW * 0.5 + nodeW * 0.5
    for (const id of ids.sort()) {
      const N = nodesById.get(id)!
      N.x = Number.isFinite(N.x) ? N.x : x0
      N.y = Number.isFinite(N.y) ? N.y : rowY
      x0 += nodeW + gapX
    }
  }

  return { nodes: Array.from(nodesById.values()), edges: g.edges }
}
