// Small formatter for findings for UI logs
import type { Finding } from '$lib/types/warnings'

export function formatFinding(f: Finding): string {
  const where = f.line ? `@line${f.line}: ` : ''
  const hint = f.hint ? ` Hint: ${f.hint}` : ''

  return `${f.severity} ${f.code} ${where}${f.message}${hint}`
}
