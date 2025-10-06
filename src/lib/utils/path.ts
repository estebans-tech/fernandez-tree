// build a simple orthogonal polyline path between two points
export const elbowPath = (sx: number, sy: number, tx: number, ty: number, midY?: number) => {
  const y = midY ?? (sy + ty) * 0.5
  return `M ${sx} ${sy} L ${sx} ${y} L ${tx} ${y} L ${tx} ${ty}`
}