// Edge helpers and parsing (contract + implementation)
// Comments in English, avoid semicolons

import type { EdgeEntry, EdgeId, EdgeSet } from '$lib/types/edges'
import type { Finding } from '$lib/types/warnings'
import { PARENT_MIN_AGE_GAP, WARN_IF_PARENT_YOUNGER_OR_EQUAL } from '$lib/constants/edges'

import type { NodeRegistry } from '$lib/types/nodes'
import type { Attrs } from '$lib/types/domain'
import { parseNodeToken, extractLabelAndAttrs } from '$lib/data/nodes'
import { toIdBase } from '$lib/utils/strings'
// ---------------------------------------------------------------------
// Core edge helpers
// ---------------------------------------------------------------------

// Create an empty edge set
export function createEmptyEdgeSet(): EdgeSet {
  return {
    byId: new Map(),
    list: []
  }
}

// Deterministic id for spouse edge (unordered)
export function edgeIdSpouse(a: string, b: string): EdgeId {
  // order-invariant id: min-max-spouse
  const [x, y] = [a, b].sort()
  return `${x}-${y}-spouse`
}

// Deterministic id for parent edge (directed)
export function edgeIdParent(from: string, to: string): EdgeId {
  return `${from}-${to}-parent`
}

// Insert an edge if it does not already exist
// - Emits W100 on duplicates
export function insertEdge(
  set: EdgeSet,
  edge: Omit<EdgeEntry, 'id'> & { id?: EdgeId },
  findings: Finding[]
): EdgeEntry | null {
  const id =
    edge.id ??
    (edge.type === 'spouse'
      ? edgeIdSpouse(edge.from, edge.to)
      : edgeIdParent(edge.from, edge.to))

  if (set.byId.has(id)) {
    findings.push({
      severity: 'WARN',
      code: 'W100',
      message: `Duplicate edge skipped: ${id}`,
      line: edge.meta?.line
    })
    return set.byId.get(id) || null
  }

  const entry: EdgeEntry = {
    id,
    type: edge.type,
    from: edge.from,
    to: edge.to,
    meta: edge.meta
  }

  set.byId.set(id, entry)
  set.list.push(entry)
  return entry
}

// Assess parent-child age plausibility
// Returns W101 when both years exist and rules are violated, else null
export function assessParentAge(
  parentBirthYear: number | null | undefined,
  childBirthYear: number | null | undefined
): Finding | null {
  if (parentBirthYear == null || childBirthYear == null) return null

  if (WARN_IF_PARENT_YOUNGER_OR_EQUAL && parentBirthYear >= childBirthYear) {
    return {
      severity: 'WARN',
      code: 'W101',
      message: `Parent birth year ${parentBirthYear} is >= child birth year ${childBirthYear}`
    }
  }

  const gap = childBirthYear - parentBirthYear
  if (gap < PARENT_MIN_AGE_GAP) {
    return {
      severity: 'WARN',
      code: 'W101',
      message: `Unlikely parent-child age gap: ${gap} years (min ${PARENT_MIN_AGE_GAP})`
    }
  }

  return null
}

// ---------------------------------------------------------------------
// High-level parser
// ---------------------------------------------------------------------

// Transform lines like "A+B>C,D" and "A=B" into edges, using NodeRegistry and node decision logic.
// Rules:
// - "A+B>C,D": spouse(A,B) + parent(A→C,D) + parent(B→C,D)
// - "A=B": spouse(A,B)
// Parents are resolved first; if ambiguous → E101 for that parent and skip edges from it.
// Children are always created.
// Duplicate edges are skipped via insertEdge (W100). Self-edges W102/W103. Age anomalies W101.
export function parseEdgesFromDsl(
  text: string,
  registry: NodeRegistry,
  opts: { strictMode?: boolean, createMissingNodes?: boolean } = {}
): { edges: EdgeSet, findings: Finding[] } {
  const strictMode = !!opts.strictMode
  const createMissing = opts.createMissingNodes ?? true

  const edges = createEmptyEdgeSet()
  const findings: Finding[] = []

  const lines = text.split(/\r?\n/).map(s => s.split('#')[0].trim()).filter(Boolean)

  for (let li = 0; li < lines.length; li++) {
    const lineNo = li + 1
    const raw = lines[li]

    // mask + , > inside [...]
    let masked = '', depth = 0, arrows = 0
    for (const ch of raw) {
      if (ch === '[') depth++
      else if (ch === ']') depth = Math.max(0, depth - 1)
      if (ch === '>' && depth === 0) arrows++
      masked += (depth > 0 && (ch === '+' || ch === ',' || ch === '>')) ? '§' : ch
    }

    // multiple '>' → error, skip line
    if (arrows > 1) {
      findings.push({ severity: 'ERROR', code: 'E103', message: `Multiple '>' in one line is not allowed`, line: lineNo })
      continue
    }

    // spouse-only line (A=B) at top-level
    if (arrows === 0 && /=/.test(masked)) {
      const eqTop = topLevelEqualsCount(masked)
      if (eqTop !== 1) {
        findings.push({ severity: 'ERROR', code: 'E102', message: `Invalid spouse syntax on line`, line: lineNo })
        continue
      }

      const [aTok, bTok] = masked.split('=').map(s => s.trim()).map(t => t.replace(/§/g, ','))
      if (!aTok || !bTok) {
        findings.push({ severity: 'ERROR', code: 'E102', message: `Empty person token in spouse expression`, line: lineNo })
        continue
      }

      const ar = parseNodeToken(aTok, registry, 'resolve', lineNo)
      const br = parseNodeToken(bTok, registry, 'resolve', lineNo)
      findings.push(...ar.findings, ...br.findings)

      const aAmb = isAmbiguous(ar.findings)
      const bAmb = isAmbiguous(br.findings)

      if (!ar.node && !aAmb) findings.push(...parseNodeToken(aTok, registry, 'create', lineNo).findings)
      if (!br.node && !bAmb) findings.push(...parseNodeToken(bTok, registry, 'create', lineNo).findings)

      const aId = resolveIdForLabel(aTok, registry)
      const bId = resolveIdForLabel(bTok, registry)

      if (aAmb || bAmb || !aId || !bId) {
        findings.push({ severity: 'ERROR', code: 'E102', message: `Ambiguous or unresolved spouse token(s)`, line: lineNo })
        continue
      }
      if (aId === bId) {
        findings.push({ severity: 'WARN', code: 'W102', message: `Self-spouse edge ignored`, line: lineNo })
        continue
      }

      insertEdge(edges, { type: 'spouse', from: aId, to: bId, meta: { line: lineNo } }, findings)
      continue
    }

    // parent-child line (contains exactly one '>')
    if (arrows === 1) {
      const [left, right] = masked.split('>')
      const parentTokens = splitTokens(left).map(t => t.replace(/§/g, ','))
      const childTokens  = splitTokens(right).map(t => t.replace(/§/g, ','))

      if (parentTokens.length === 0 || childTokens.length === 0) {
        findings.push({ severity: 'ERROR', code: 'E104', message: `Empty parent or child side`, line: lineNo })
        continue
      }

      // resolve/create parents
      const parentIds: Array<{ id: string | null, ambiguous: boolean, tok: string }> = []
      let lineHasAmbiguity = false

      for (const tok of parentTokens) {
        const r = parseNodeToken(tok, registry, 'resolve', lineNo)
        findings.push(...r.findings)

        const amb = isAmbiguous(r.findings)
        if (createMissing && !r.node && !amb) {
          findings.push(...parseNodeToken(tok, registry, 'create', lineNo).findings)
        }

        const id = amb ? null : resolveIdForLabel(tok, registry)
        parentIds.push({ id, ambiguous: amb, tok })
        if (amb) {
          lineHasAmbiguity = true
          findings.push({ severity: 'ERROR', code: 'E101', message: `Ambiguous parent token '${tok}'`, line: lineNo })
        }
      }

      // resolve/create children
      const childIds: string[] = []
      for (const tok of childTokens) {
        if (createMissing) {
          findings.push(...parseNodeToken(tok, registry, 'create', lineNo).findings)
        }
        const id = resolveIdForLabel(tok, registry)
        if (id) childIds.push(id)
      }

      // strict mode: ambiguity on line → skip edges from this line
      if (strictMode && lineHasAmbiguity) {
        findings.push({ severity: 'ERROR', code: 'E101', message: `Ambiguous token(s) on this line — skipped`, line: lineNo })
        continue
      }

      // spouse between first two resolved parents (if distinct)
      const firstTwo = parentIds.filter(p => !!p.id).slice(0, 2)
      if (firstTwo.length >= 2) {
        const a = firstTwo[0].id!, b = firstTwo[1].id!
        if (a !== b) {
          insertEdge(edges, { type: 'spouse', from: a, to: b, meta: { line: lineNo } }, findings)
        } else {
          findings.push({ severity: 'WARN', code: 'W102', message: `Self-spouse edge ignored`, line: lineNo })
        }
      }

      // parent→child for all combinations
      for (const p of parentIds) {
        if (!p.id) { if (strictMode) break; else continue }
        for (const cId of childIds) {
          if (p.id === cId) {
            findings.push({ severity: 'WARN', code: 'W103', message: `Self-parent edge ignored`, line: lineNo })
            continue
          }
          insertEdge(edges, { type: 'parent', from: p.id, to: cId, meta: { line: lineNo } }, findings)

          // age sanity
          const pb = getBirth(registry, p.id)
          const cb = getBirth(registry, cId)
          const warn = assessParentAge(pb, cb)
          if (warn) findings.push({ ...warn, line: lineNo })
        }
      }

      continue
    }

    // neither '=' nor '>' → no edges on this line
  }

  return { edges, findings }
}
// ---------------------------------------------------------------------
// Local helpers (not exported)
// ---------------------------------------------------------------------

function splitTokens(side: string): string[] {
  return side.split(/[+,]/).map(s => s.trim()).filter(Boolean)
}

function topLevelEqualsCount(masked: string): number {
  let depth = 0, count = 0
  for (const ch of masked) {
    if (ch === '[') depth++
    else if (ch === ']') depth = Math.max(0, depth - 1)
    else if (ch === '=' && depth === 0) count++
  }
  return count
}

function isAmbiguous(finds: Finding[]): boolean {
  return finds.some(f => f.code === 'W001' && (f as any).contextIdCandidates && (f as any).contextIdCandidates.length > 1)
}

// Resolves a DSL token to a single node id *if and only if* it maps uniquely in the registry.
// - Uses SAME parsing & id-base as node creation (diacritics preserved).
// - With birth year → matches bucket.byYear[year] when length===1
// - Without year  → matches exactly one in noYearIds, else null
function resolveIdForLabel(raw: string, reg: NodeRegistry): string | null {
  const ex = extractLabelAndAttrs(raw)
  // if token itself was erroneous, give up
  if (ex.findings.some(f => f.severity === 'ERROR')) return null

  const base = toIdBase(ex.label)
  const b = typeof ex.attrs.b === 'number' ? ex.attrs.b : null
  const bucket = reg.byBase.get(base)
  if (!bucket) return null

  if (b != null) {
    const list = bucket.byYear.get(b) || []
    return list.length === 1 ? list[0] : null
  } else {
    const list = bucket.noYearIds
    return list.length === 1 ? list[0] : null
  }
}

function extractLabelOnly(personToken: string): string {
  const trimmed = personToken.trim()
  const m = trimmed.match(/\[(.*?)\]\s*$/)
  return m ? trimmed.slice(0, m.index) : trimmed
}

function getBirth(reg: NodeRegistry, id: string): number | null {
  const n = reg.byId.get(id)
  const b = (n?.attrs as Attrs | undefined)?.b
  return typeof b === 'number' ? b : null
}
