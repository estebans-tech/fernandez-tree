// viewport helpers for zoom and fit

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export const clampScale = (k: number, kmin = 0.2, kmax = 3) => clamp(k, kmin, kmax)

// zoom around a given pointer position in screen coords
export const zoomAt = (t: { x: number, y: number, k: number }, cx: number, cy: number, dk: number) => {
  const kNew = clampScale(t.k * dk)
  const sx = cx - t.x
  const sy = cy - t.y
  const scale = kNew / t.k

  return {
    x: cx - sx * scale,
    y: cy - sy * scale,
    k: kNew
  }
}

// compute a simple fit transform for a given content bbox
export const fitTo = (
  bbox: { x: number, y: number, width: number, height: number },
  viewport: { width: number, height: number },
  padding = 40
) => {
  const w = bbox.width + padding * 2
  const h = bbox.height + padding * 2
  const k = clampScale(Math.min(viewport.width / w, viewport.height / h))
  const x = (viewport.width - bbox.width * k) * 0.5 - bbox.x * k
  const y = (viewport.height - bbox.height * k) * 0.5 - bbox.y * k
  return { x, y, k }
}
