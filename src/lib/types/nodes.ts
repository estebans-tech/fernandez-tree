// Node-specific types and registry shape

import type { NodeEntry } from '$lib/types/domain'
import type { Finding } from '$lib/types/warnings'

export interface Extracted {
  nameRaw: string              // raw name part
  label: string                // NFC-trimmed label
  attrs: Record<string, any>   // at least { b?: number }
  findings: Finding[]          // I011/W020/W021 etc
}

export interface IdDecision {
  id: string | null            // null when ambiguous in 'resolve'
  created: boolean
  reused: boolean
  findings: Finding[]
}

export interface NodeRegistry {
  byBase: Map<string, {
    byYear: Map<number, string[]>   // year -> list of ids
    noYearIds: string[]             // ids without birth year, in creation order
    persons: Map<string, NodeEntry> // id -> node
  }>
  byId: Map<string, NodeEntry>
}

