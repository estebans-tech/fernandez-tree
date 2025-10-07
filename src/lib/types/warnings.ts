// Findings (INFO/WARN/ERROR) + codes
// Finding severities, codes, and shape

export type FindingSeverity = 'INFO' | 'WARN' | 'ERROR'

// Edge warnings
// W100 DuplicateEdge         – the edge already exists (skipped)
// W101 ParentAgeAnomaly      – implausible age relation (gap < threshold or parent >= child)
// W102 SelfSpouse            – A=A spouse
// W103 SelfParent            – A=A parent

// Edge errors
// E101 AmbiguousParent       – parent token resolves to multiple candidates

export type FindingCode =
  | 'I001' // CreatedNode
  | 'I003' // DuplicateNameYearCreated
  | 'I011' // BirthYearFromShorthand
  | 'I010' // AttrMerge (reserved)
  | 'W001' // AmbiguousName
  | 'W002' // AutoIndexedDuplicates
  | 'W020' // ExtraYearTokensIgnored
  | 'W021' // BirthYearConflictInBracket
  | 'W022' // BirthYearChanged
  | 'E001' //
  | 'E002' //
  | 'E003' //
  | 'E004' //
  | 'E005' //
  | 'E006' //
  | 'E007' //
  // NEW: WARN (edges)
  | 'W100' | 'W101' | 'W102' | 'W103'
  // NEW: ERROR (edges)
  | 'E101' | 'E102' | 'E103' | 'E104'
export interface Finding {
  severity: FindingSeverity
  code: FindingCode
  message: string
  line?: number
  hint?: string
  contextIdCandidates?: string[]
}
