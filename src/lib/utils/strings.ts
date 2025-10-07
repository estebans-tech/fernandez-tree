// Unicode-safe string helpers for labels and id bases

/** Returns NFC-normalized, trimmed label for display */
export function toLabel(raw: string): string {
  return raw.normalize('NFC').trim()
}

/** Builds an id base: lowercase, whitespace/hyphen -> '_', keep L/M/N/_ (incl. å/ä/ö/é/ñ) */
export function toIdBase(name: string): string {
  const n = name.normalize('NFC').trim().toLowerCase()

  return n
    .replace(/[\s\-]+/g, '_')
    .replace(/[^\p{L}\p{M}\p{N}_]+/gu, '')
}
