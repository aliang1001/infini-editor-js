export type Point = { x: number; y: number }
export type Size = { height: number; width: number }
export type Rect = { origin: Point; size: Size }

export function inRect(point: Point, rect: Rect) {
  const dx = point.x - rect.origin.x
  const dy = point.y - rect.origin.y
  if (dx < 0 || dx > rect.size.width) {
    return false
  }
  if (dy < 0 || dy > rect.size.height) {
    return false
  }
  return true
}
