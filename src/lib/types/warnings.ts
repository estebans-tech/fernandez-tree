// Findings (INFO/WARN/ERROR) + codes
// Finding severities, codes, and shape

export type FindingSeverity = 'INFO' | 'WARN' | 'ERROR'

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

export interface Finding {
  severity: FindingSeverity
  code: FindingCode
  message: string
  line?: number
  hint?: string
  contextIdCandidates?: string[]
}
