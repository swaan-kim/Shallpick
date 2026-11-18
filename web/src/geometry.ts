export type Transform = { scale: number; x: number; y: number }
type Point = { x: number; y: number }
type Size = { width: number; height: number }
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
export function gridColumnsForScale(start: number, scale: number) { return clamp(Math.round(start / Math.max(.01, scale)), 2, 6) }

/** Keep the same image point under the gesture's moving midpoint. */
export function zoomAroundPoint(value: Transform, requestedScale: number, from: Point, to: Point = from): Transform {
  const scale = clamp(requestedScale, 1, 4), ratio = scale / value.scale
  return { scale, x: to.x - (from.x - value.x) * ratio, y: to.y - (from.y - value.y) * ratio }
}

/** A scaled photo never exposes space beyond its edges when dragged. */
export function boundedTransform(value: Transform, image: Size, viewport: Size): Transform {
  const scale = clamp(value.scale, 1, 4)
  if (scale <= 1.01) return { scale: 1, x: 0, y: 0 }
  const maxX = Math.max(0, (image.width * scale - viewport.width) / 2)
  const maxY = Math.max(0, (image.height * scale - viewport.height) / 2)
  return { scale, x: clamp(value.x, -maxX, maxX), y: clamp(value.y, -maxY, maxY) }
}
