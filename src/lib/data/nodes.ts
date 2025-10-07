// Node parsing step 1 (no edges). Handles label, id policy, attributes, and findings.

import type { Attrs, NodeEntry } from '$lib/types/domain'
import type { Extracted, IdDecision, NodeRegistry } from '$lib/types/nodes'
import type { Finding } from '$lib/types/warnings'

import { toLabel, toIdBase } from '$lib/utils/strings'
import { isYearToken } from '$lib/utils/years'
import { YEAR_MIN, YEAR_MAX } from '$lib/constants/years'

// ---------- Registry ----------

export function createEmptyRegistry(): NodeRegistry {
  return {
    byBase: new Map(),
    byId: new Map()
  }
}

function ensureBase(reg: NodeRegistry, base: string) {
  if (!reg.byBase.has(base)) {
    reg.byBase.set(base, {
      byYear: new Map<number, string[]>(),
      noYearIds: [],
      persons: new Map<string, NodeEntry>()
    })
  }
  return reg.byBase.get(base)!
}

// ---------- Extraction (label + attrs) ----------

/**
 * Extracts label and attrs from a person token, e.g.:
 *  "Göte[b=1999]"    → b=1999
 *  "Gertrud[1966]"   → shorthand b=1966 (I011)
 *  "X[1966, 2002]"   → b=1966 + W020 for the extra year
 *  "Y[b=1999, 2001]" → b=1999 + W021 for conflict with shorthand
 */
export function extractLabelAndAttrs(personToken: string): Extracted {
  const findings: Finding[] = []

  const trimmed = personToken.trim()

  // E001: unbalanced brackets (any '[' without matching ']' at end)
  const openCount = (trimmed.match(/\[/g) || []).length
  const closeCount = (trimmed.match(/\]/g) || []).length
  if (openCount !== closeCount) {
    findings.push({
      severity: 'ERROR',
      code: 'E001',
      message: `Unclosed '[' in attribute block.`
    })
    // keep whole text as label but DO NOT set attrs; caller should skip create/resolve on ERROR
    return { nameRaw: trimmed, label: toLabel(trimmed), attrs: {}, findings }
  }

  const m = trimmed.match(/\[(.*?)\]\s*$/) // attribute block at the end (optional)
  const rawAttr = m ? m[1] : ''
  const nameRaw = m ? trimmed.slice(0, m.index) : trimmed

  const label = toLabel(nameRaw)
  const attrs: Attrs = {}

  let firstShorthandYear: number | null = null
  let explicitBirth: number | null = null
  let seenExplicitB = false

  if (rawAttr) {
    const tokens = rawAttr.split(/\s*,\s*/)

    for (const tokRaw of tokens) {
      const tok = tokRaw.trim()
      if (!tok) {
        findings.push({
          severity: 'ERROR',
          code: 'E005',
          message: `Malformed empty attribute token.`
        })
        continue
      }

      if (tok.includes('=')) {
        const [kRaw, vRaw] = tok.split('=')
        const k = (kRaw || '').trim()
        const v = (vRaw || '').trim()

        if (!k || !v) {
          findings.push({
            severity: 'ERROR',
            code: 'E005',
            message: `Malformed attribute '${tok}'.`
          })
          continue
        }

        if (k === 'b') {
          if (!/^\d{4}$/.test(v)) {
            findings.push({
              severity: 'ERROR',
              code: 'E002',
              message: `Invalid shorthand/explicit year '${v}'. Expected 4 digits.`
            })
            continue
          }
          const y = +v
          if (!isYearToken(v)) {
            findings.push({
              severity: 'ERROR',
              code: 'E003',
              message: `Year ${y} is out of allowed range.`
            })
            continue
          }
          if (seenExplicitB && explicitBirth !== y) {
            findings.push({
              severity: 'ERROR',
              code: 'E004',
              message: `Conflicting 'b' values (${explicitBirth} vs ${y}) in the same bracket.`
            })
            continue
          }
          seenExplicitB = true
          explicitBirth = y
          attrs.b = y
        } else {
          // pass through other keys as strings
          attrs[k] = v
        }
      } else {
        // potential shorthand year
        if (/^\d{4}$/.test(tok)) {
          const y = +tok
          if (y < YEAR_MIN || y > YEAR_MAX) {
            findings.push({
              severity: 'ERROR',
              code: 'E003',
              message: `Year ${y} is out of allowed range.`
            })
            continue
          }
          if (firstShorthandYear == null) firstShorthandYear = y
          else {
            findings.push({
              severity: 'WARN',
              code: 'W020',
              message: `Extra year token ignored: ${tok}`
            })
          }
        } else if (/^\d+$/.test(tok)) {
          // numeric but not 4 digits
          findings.push({
            severity: 'ERROR',
            code: 'E002',
            message: `Invalid shorthand year token '${tok}'. Expected 4 digits.`
          })
        } else {
          // non-numeric free token → ignored (step 1)
        }
      }
    }

    // conflict rule: explicit b wins over shorthand (already validated)
    if (explicitBirth != null) {
      if (firstShorthandYear != null && firstShorthandYear !== explicitBirth) {
        findings.push({
          severity: 'WARN',
          code: 'W021',
          message: `Conflict in bracket: b=${explicitBirth} vs ${firstShorthandYear}. Using b=${explicitBirth}.`
        })
      }
    } else if (firstShorthandYear != null) {
      attrs.b = firstShorthandYear
      findings.push({
        severity: 'INFO',
        code: 'I011',
        message: `Birth year inferred from shorthand: b=${firstShorthandYear}`
      })
    }
  }

  return { nameRaw, label, attrs, findings }
}

// ---------- Id decision ----------

/**
 * Determines id and updates registry
 * mode:
 *  - 'create'  → always create a new person in the group
 *  - 'resolve' → reuse only if UNIQUE match exists, else WARN W001 and return null
 */
export function decideId(
  label: string,
  attrs: Attrs,
  reg: NodeRegistry,
  mode: 'create' | 'resolve' = 'create'
): IdDecision {
  const findings: Finding[] = []
  const base = toIdBase(label)
  const b = typeof attrs.b === 'number' ? attrs.b : null

  const bucket = ensureBase(reg, base)

  // -----------------------
  // Resolve mode (no create)
  // -----------------------
  if (mode === 'resolve') {
    if (b != null) {
      const list = bucket.byYear.get(b) || []
      if (list.length === 1) {
        return { id: list[0], created: false, reused: true, findings }
      }
      if (list.length > 1) {
        findings.push({
          severity: 'WARN',
          code: 'W001',
          message: `Ambiguous: ${list.length} persons match ${label} (b=${b}).`,
          contextIdCandidates: list.slice()
        })
        return { id: null, created: false, reused: false, findings }
      }
      // list.length === 0 → silent "can't resolve"
      return { id: null, created: false, reused: false, findings }
    } else {
      const noYear = bucket.noYearIds
      if (noYear.length === 1) {
        return { id: noYear[0], created: false, reused: true, findings }
      }
      if (noYear.length > 1) {
        findings.push({
          severity: 'WARN',
          code: 'W001',
          message: `Ambiguous: ${label} matches ${noYear.length} persons without birth year.`,
          contextIdCandidates: noYear.slice()
        })
        return { id: null, created: false, reused: false, findings }
      }
      // Optional heuristic: if exactly one person exists in this base (any year), reuse it
      if (bucket.persons.size === 1) {
        const only = [...bucket.persons.keys()][0]
        return { id: only, created: false, reused: true, findings }
      }
      // 0 candidates → silent "can't resolve"
      return { id: null, created: false, reused: false, findings }
    }
  }

  // -----------------------
  // Create mode (always create a new person in this group)
  // -----------------------
  let id: string
  if (b != null) {
    const list = bucket.byYear.get(b) || []
    if (list.length === 0) {
      id = `${base}_${b}`
      bucket.byYear.set(b, [id])
    } else {
      id = `${base}_${b}_${list.length + 1}`
      bucket.byYear.set(b, [...list, id])
      findings.push({
        severity: 'INFO',
        code: 'I003',
        message: `Created another person with same name+year: ${id}.`
      })
    }
  } else {
    const idx = bucket.noYearIds.length + 1
    id = `${base}_${idx}`
    bucket.noYearIds.push(id)
    if (idx > 1) {
      findings.push({
        severity: 'WARN',
        code: 'W002',
        message: `Multiple persons without birth year for ${label}. Assigned ids: ${bucket.noYearIds.join(', ')}.`
      })
    }
  }

  const node: NodeEntry = { id, label, attrs: { ...attrs } }
  bucket.persons.set(id, node)
  reg.byId.set(id, node)

  findings.push({
    severity: 'INFO',
    code: 'I001',
    message: `Created new person: ${id}.`
  })

  return { id, created: true, reused: false, findings }
}

// ---------- High-level: parse a single person token ----------

export function parseNodeToken(
  token: string,
  reg: NodeRegistry,
  mode: 'create' | 'resolve' = 'create',
  line?: number
): { node: NodeEntry | null, findings: Finding[] } {
  const ex = extractLabelAndAttrs(token)
  const decision = decideId(ex.label, ex.attrs as Attrs, reg, mode)

  const findings = [...ex.findings, ...decision.findings].map(f =>
    line ? { ...f, line } : f
  )

  if (!decision.id) return { node: null, findings }

  const existing = reg.byId.get(decision.id)
  if (existing) {
    Object.assign(existing.attrs, ex.attrs)
    return { node: existing, findings }
  }

  return { node: reg.byId.get(decision.id)!, findings }
}
