// minimal parser for lines like:
// Bo+Rita>Kalle[b=1975],Lisa[b=1978]
// Rita=Kaj
// Bo+Layla>Ruth
// name[ key=value; key2=value2 ] supports b=YYYY

import type { Graph } from '$lib/types/graph'

type Attrs = Record<string, string>

const parseAttrs = (raw: string): Attrs => {
  const out: Attrs = {}
  const body = raw.trim()
  if (!body) return out
  body.split(';').forEach(p => {
    const [k, v] = p.split('=').map(s => s.trim())
    if (k && v) out[k] = v
  })
  return out
}

const norm = (s: string) => s.trim()

const parsePerson = (raw: string) => {
  const m = norm(raw).match(/^([^\[\]]+)(?:\[(.+)\])?$/)
  const label = norm(m ? m[1] : raw)
  const attrs = m && m[2] ? parseAttrs(m[2]) : {}
  const id = label.toLowerCase().replace(/\s+/g, '_')
  return { id, label, attrs }
}

export const parseDsl = (text: string): Graph => {
  const nodes = new Map<string, { id: string, label: string, attrs: Attrs, x?: number, y?: number }>()
  const edges: Graph['edges'] = []

  const ensure = (raw: string) => {
    const p = parsePerson(raw)
    if (!nodes.has(p.id)) nodes.set(p.id, p)
    else Object.assign(nodes.get(p.id)!.attrs, p.attrs)
    return nodes.get(p.id)!
  }

  const addEdge = (from: string, to: string, type: 'parent' | 'spouse') => {
    const id = `${from}-${to}-${type}`
    if (!edges.find(e => e.id === id)) edges.push({ id, from, to, type })
  }

  const lines = text.split(/\r?\n/).map(s => s.split('#')[0].trim()).filter(Boolean)

  for (const line of lines) {
    if (/>/.test(line)) {
      const [parents, children] = line.split('>')
      const ps = parents.split('+').map(norm).filter(Boolean)
      const cs = children.split(',').map(norm).filter(Boolean)

      // optional spouse tie between listed parents
      if (ps.length >= 2) addEdge(ensure(ps[0]).id, ensure(ps[1]).id, 'spouse')

      for (const p of ps) for (const c of cs) {
        const P = ensure(p).id
        const C = ensure(c).id
        addEdge(P, C, 'parent')
      }
      continue
    }

    if (/=/.test(line)) {
      const [a, b] = line.split('=')
      const A = ensure(a).id
      const B = ensure(b).id
      addEdge(A, B, 'spouse')
      continue
    }

    ensure(line)
  }

  // enrich labels with birth year if present
  for (const n of nodes.values()) {
    if (n.attrs.b && !/\(b\./i.test(n.label)) n.label = `${n.label} (b. ${n.attrs.b})`
  }

  // return without positions — a simple fallback layout will place them
  return {
    nodes: Array.from(nodes.values()).map(n => ({ id: n.id, label: n.label, x: n.x ?? 0, y: n.y ?? 0 })),
    edges
  }
}
