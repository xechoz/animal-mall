import type { Rng } from '@mg/core/rng'
import { distance } from './collision'
import { findPath, walkablePointNear } from './nav'
import type { ShopMap, Vec2, WanderTuning } from './types'

/**
 * Builds a path that occasionally bends through a nearby open point instead of
 * always taking the shortest line. Extra distance is bounded so patience and
 * staff throughput stay predictable.
 */
export function wanderPath(
  from: Vec2,
  to: Vec2,
  radius: number,
  map: ShopMap,
  rng: Rng,
  tuning: WanderTuning,
): readonly Vec2[] {
  const direct = findPath(from, to, radius, map)
  if (direct === null) return [to]

  const directLength = pathLength(from, direct)
  if (directLength < tuning.minLeg) return direct
  if (rng.next() > tuning.chance) return direct

  const waypoint = pickWaypoint(from, to, directLength, radius, map, rng, tuning)
  if (waypoint === null) return direct

  const first = findPath(from, waypoint, radius, map)
  const second = findPath(waypoint, to, radius, map)
  if (first === null || second === null) return direct

  const candidate = [...first, ...second.slice(1)]
  const extra = pathLength(from, candidate) - directLength
  if (extra < tuning.minExtra || extra > directLength * tuning.maxExtra) return direct
  return candidate
}

function pickWaypoint(
  from: Vec2,
  to: Vec2,
  directLength: number,
  radius: number,
  map: ShopMap,
  rng: Rng,
  tuning: WanderTuning,
): Vec2 | null {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return null

  const along = 0.35 + rng.next() * 0.3
  const side = rng.next() < 0.5 ? -1 : 1
  const offset = Math.min(tuning.maxOffset, length * 0.35)
  const raw = {
    x: from.x + dx * along - (dy / length) * offset * side,
    y: from.y + dy * along + (dx / length) * offset * side,
  }
  const waypoint = walkablePointNear(raw, radius, map)
  if (waypoint === null) return null
  if (distance(waypoint, from) < directLength * 0.25) return null
  if (distance(waypoint, to) < directLength * 0.25) return null
  return waypoint
}

function pathLength(from: Vec2, path: readonly Vec2[]): number {
  let total = 0
  let previous = from
  for (const point of path) {
    total += distance(previous, point)
    previous = point
  }
  return total
}
