import { blockedAt } from './collision'
import { NAV_CELL } from './config'
import type { ShopMap, Vec2 } from './types'

interface Grid {
  readonly w: number
  readonly h: number
  readonly cells: number
}

const DIAGONAL = Math.SQRT2
const grids = new WeakMap<ShopMap, Grid>()

const NEIGHBORS: readonly { readonly dx: number; readonly dy: number; readonly cost: number }[] = [
  { dx: 1, dy: 0, cost: 1 },
  { dx: -1, dy: 0, cost: 1 },
  { dx: 0, dy: 1, cost: 1 },
  { dx: 0, dy: -1, cost: 1 },
  { dx: 1, dy: 1, cost: DIAGONAL },
  { dx: 1, dy: -1, cost: DIAGONAL },
  { dx: -1, dy: 1, cost: DIAGONAL },
  { dx: -1, dy: -1, cost: DIAGONAL },
]

interface Node {
  readonly index: number
  readonly g: number
  readonly f: number
}

function gridFor(map: ShopMap): Grid {
  const cached = grids.get(map)
  if (cached !== undefined) return cached
  const w = Math.max(1, Math.ceil(map.room.w / NAV_CELL))
  const h = Math.max(1, Math.ceil(map.room.h / NAV_CELL))
  const grid = { w, h, cells: w * h }
  grids.set(map, grid)
  return grid
}

export function findPath(
  start: Vec2,
  goal: Vec2,
  radius: number,
  map: ShopMap,
): readonly Vec2[] | null {
  const grid = gridFor(map)
  const startCell = nearestWalkable(toCell(start, grid), radius, map, grid)
  const goalCell = nearestWalkable(toCell(goal, grid), radius, map, grid)
  if (startCell < 0 || goalCell < 0) return null

  const blocked = new Uint8Array(grid.cells)
  for (let index = 0; index < grid.cells; index += 1) {
    const point = fromCell(index, grid)
    blocked[index] = blockedAt(point.x, point.y, radius, map) ? 1 : 0
  }
  blocked[startCell] = 0
  blocked[goalCell] = 0

  const gScore = new Float64Array(grid.cells)
  for (let index = 0; index < grid.cells; index += 1) gScore[index] = Number.POSITIVE_INFINITY
  const cameFrom = new Int32Array(grid.cells)
  cameFrom.fill(-1)
  const closed = new Uint8Array(grid.cells)
  const open: Node[] = []
  gScore[startCell] = 0
  open.push({ index: startCell, g: 0, f: heuristic(startCell, goalCell, grid) })

  while (open.length > 0) {
    const current = popLowest(open)
    if (current.index === goalCell)
      return buildPath(cameFrom, startCell, goalCell, goal, radius, map, grid)
    if (closed[current.index] === 1) continue
    closed[current.index] = 1
    const cx = current.index % grid.w
    const cy = Math.floor(current.index / grid.w)

    for (const step of NEIGHBORS) {
      const nx = cx + step.dx
      const ny = cy + step.dy
      if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h) continue
      const next = ny * grid.w + nx
      if (blocked[next] === 1 || closed[next] === 1) continue
      if (step.dx !== 0 && step.dy !== 0) {
        if (blocked[cy * grid.w + nx] === 1 || blocked[ny * grid.w + cx] === 1) continue
      }
      const tentative = current.g + step.cost
      if (tentative >= gScore[next]) continue
      gScore[next] = tentative
      cameFrom[next] = current.index
      open.push({ index: next, g: tentative, f: tentative + heuristic(next, goalCell, grid) })
    }
  }

  return null
}

export function lineWalkable(from: Vec2, to: Vec2, radius: number, map: ShopMap): boolean {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  const steps = Math.max(1, Math.ceil(length / 6))
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps
    if (blockedAt(from.x + dx * t, from.y + dy * t, radius, map)) return false
  }
  return true
}

function buildPath(
  cameFrom: Int32Array,
  start: number,
  goal: number,
  exactGoal: Vec2,
  radius: number,
  map: ShopMap,
  grid: Grid,
): readonly Vec2[] {
  const reversed: Vec2[] = []
  let current = goal
  while (current !== start) {
    reversed.push(fromCell(current, grid))
    const previous = cameFrom[current]
    if (previous < 0) break
    current = previous
  }
  reversed.push(fromCell(start, grid))
  reversed.reverse()

  if (!blockedAt(exactGoal.x, exactGoal.y, radius, map)) {
    const last = reversed[reversed.length - 1]
    if (last && (last.x !== exactGoal.x || last.y !== exactGoal.y)) reversed.push(exactGoal)
  }

  const smoothed: Vec2[] = []
  let anchor = 0
  const first = reversed[0]
  if (first === undefined) return []
  smoothed.push(first)
  while (anchor < reversed.length - 1) {
    let farthest = anchor + 1
    for (let index = anchor + 2; index < reversed.length; index += 1) {
      const from = reversed[anchor]
      const to = reversed[index]
      if (from === undefined || to === undefined) break
      if (lineWalkable(from, to, radius, map)) farthest = index
      else break
    }
    const point = reversed[farthest]
    if (point !== undefined) smoothed.push(point)
    anchor = farthest
  }
  return smoothed
}

function popLowest(open: Node[]): Node {
  let best = 0
  for (let index = 1; index < open.length; index += 1) {
    const candidate = open[index]
    const current = open[best]
    if (candidate !== undefined && current !== undefined && candidate.f < current.f) best = index
  }
  const node = open[best]
  if (node === undefined) throw new Error('open set is empty')
  open[best] = open[open.length - 1] as Node
  open.pop()
  return node
}

function heuristic(from: number, to: number, grid: Grid): number {
  const fx = from % grid.w
  const fy = Math.floor(from / grid.w)
  const tx = to % grid.w
  const ty = Math.floor(to / grid.w)
  const dx = Math.abs(fx - tx)
  const dy = Math.abs(fy - ty)
  return dx + dy + (DIAGONAL - 2) * Math.min(dx, dy)
}

function toCell(point: Vec2, grid: Grid): number {
  const cx = Math.max(0, Math.min(grid.w - 1, Math.floor(point.x / NAV_CELL)))
  const cy = Math.max(0, Math.min(grid.h - 1, Math.floor(point.y / NAV_CELL)))
  return cy * grid.w + cx
}

function fromCell(index: number, grid: Grid): Vec2 {
  return {
    x: (index % grid.w) * NAV_CELL + NAV_CELL / 2,
    y: Math.floor(index / grid.w) * NAV_CELL + NAV_CELL / 2,
  }
}

function nearestWalkable(start: number, radius: number, map: ShopMap, grid: Grid): number {
  if (!blockedAt(fromCell(start, grid).x, fromCell(start, grid).y, radius, map)) return start
  const startX = start % grid.w
  const startY = Math.floor(start / grid.w)
  const limit = Math.max(grid.w, grid.h)
  for (let ring = 1; ring < limit; ring += 1) {
    for (let dy = -ring; dy <= ring; dy += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue
        const x = startX + dx
        const y = startY + dy
        if (x < 0 || y < 0 || x >= grid.w || y >= grid.h) continue
        const index = y * grid.w + x
        const point = fromCell(index, grid)
        if (!blockedAt(point.x, point.y, radius, map)) return index
      }
    }
  }
  return -1
}
