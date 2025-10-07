// Year-related helpers

import { YEAR_MIN, YEAR_MAX } from '$lib/constants/years'

/** True if token is a plain 4-digit year within [YEAR_MIN..YEAR_MAX] */
export function isYearToken(s: string): boolean {
  if (!/^[0-9]{4}$/.test(s)) return false
  const y = +s
  return y >= YEAR_MIN && y <= YEAR_MAX
}
