import type { Rect, ShopMap, Vec2 } from './types'

export function distanceSq(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.sqrt(distanceSq(a, b))
}

export function circleIntersectsRect(x: number, y: number, radius: number, rect: Rect): boolean {
  const closestX = Math.max(rect.x, Math.min(x, rect.x + rect.w))
  const closestY = Math.max(rect.y, Math.min(y, rect.y + rect.h))
  const dx = x - closestX
  const dy = y - closestY
  return dx * dx + dy * dy < radius * radius
}

export function blockedAt(x: number, y: number, radius: number, map: ShopMap): boolean {
  if (x - radius < map.wall || x + radius > map.room.w - map.wall) return true
  if (y - radius < map.wall || y + radius > map.room.h - map.wall) return true
  return map.obstacles.some((rect) => circleIntersectsRect(x, y, radius, rect))
}

/**
 * Axis-separated circle movement. Blocked axes are discarded, so diagonal
 * input slides along shelves and the counter instead of sticking.
 */
export function moveWithCollision(
  pos: Vec2,
  dx: number,
  dy: number,
  radius: number,
  map: ShopMap,
): Vec2 {
  let x = pos.x
  let y = pos.y
  if (!blockedAt(x + dx, y, radius, map)) x += dx
  if (!blockedAt(x, y + dy, radius, map)) y += dy
  return { x, y }
}

export function moveToward(from: Vec2, to: Vec2, maxStep: number): { pos: Vec2; arrived: boolean } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length <= maxStep || length === 0) return { pos: to, arrived: true }
  return {
    pos: { x: from.x + (dx / length) * maxStep, y: from.y + (dy / length) * maxStep },
    arrived: false,
  }
}
