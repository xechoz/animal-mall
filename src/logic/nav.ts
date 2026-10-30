import { blockedAt } from './collision'
import { NAV_CELL, ROOM_H, ROOM_W } from './config'
import type { Vec2 } from './types'

const GRID_W = Math.max(1, Math.ceil(ROOM_W / NAV_CELL))
const GRID_H = Math.max(1, Math.ceil(ROOM_H / NAV_CELL))
const CELLS = GRID_W * GRID_H
const DIAGONAL = Math.SQRT2

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

export function findPath(start: Vec2, goal: Vec2, radius: number): readonly Vec2[] | null {
  const startCell = nearestWalkable(toCell(start), radius)
  const goalCell = nearestWalkable(toCell(goal), radius)
  if (startCell < 0 || goalCell < 0) return null

  const blocked = new Uint8Array(CELLS)
  for (let index = 0; index < CELLS; index += 1) {
    const point = fromCell(index)
    blocked[index] = blockedAt(point.x, point.y, radius) ? 1 : 0
  }
  blocked[startCell] = 0
  blocked[goalCell] = 0

  const gScore = new Float64Array(CELLS)
  for (let index = 0; index < CELLS; index += 1) gScore[index] = Number.POSITIVE_INFINITY
  const cameFrom = new Int32Array(CELLS)
  cameFrom.fill(-1)
  const closed = new Uint8Array(CELLS)
  const open: Node[] = []
  gScore[startCell] = 0
  open.push({ index: startCell, g: 0, f: heuristic(startCell, goalCell) })

  while (open.length > 0) {
    const current = popLowest(open)
    if (current.index === goalCell) return buildPath(cameFrom, startCell, goalCell, goal, radius)
    if (closed[current.index] === 1) continue
    closed[current.index] = 1
    const cx = current.index % GRID_W
    const cy = Math.floor(current.index / GRID_W)

    for (const step of NEIGHBORS) {
      const nx = cx + step.dx
      const ny = cy + step.dy
      if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= GRID_H) continue
      const next = ny * GRID_W + nx
      if (blocked[next] === 1 || closed[next] === 1) continue
      if (step.dx !== 0 && step.dy !== 0) {
        if (blocked[cy * GRID_W + nx] === 1 || blocked[ny * GRID_W + cx] === 1) continue
      }
      const tentative = current.g + step.cost
      if (tentative >= gScore[next]) continue
      gScore[next] = tentative
      cameFrom[next] = current.index
      open.push({ index: next, g: tentative, f: tentative + heuristic(next, goalCell) })
    }
  }

  return null
}

export function lineWalkable(from: Vec2, to: Vec2, radius: number): boolean {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  const steps = Math.max(1, Math.ceil(length / 6))
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps
    if (blockedAt(from.x + dx * t, from.y + dy * t, radius)) return false
  }
  return true
}

function buildPath(
  cameFrom: Int32Array,
  start: number,
  goal: number,
  exactGoal: Vec2,
  radius: number,
): readonly Vec2[] {
  const reversed: Vec2[] = []
  let current = goal
  while (current !== start) {
    reversed.push(fromCell(current))
    const previous = cameFrom[current]
    if (previous < 0) break
    current = previous
  }
  reversed.push(fromCell(start))
  reversed.reverse()

  if (!blockedAt(exactGoal.x, exactGoal.y, radius)) {
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
      if (lineWalkable(from, to, radius)) farthest = index
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

function heuristic(from: number, to: number): number {
  const fx = from % GRID_W
  const fy = Math.floor(from / GRID_W)
  const tx = to % GRID_W
  const ty = Math.floor(to / GRID_W)
  const dx = Math.abs(fx - tx)
  const dy = Math.abs(fy - ty)
  return dx + dy + (DIAGONAL - 2) * Math.min(dx, dy)
}

function toCell(point: Vec2): number {
  const cx = Math.max(0, Math.min(GRID_W - 1, Math.floor(point.x / NAV_CELL)))
  const cy = Math.max(0, Math.min(GRID_H - 1, Math.floor(point.y / NAV_CELL)))
  return cy * GRID_W + cx
}

function fromCell(index: number): Vec2 {
  return {
    x: (index % GRID_W) * NAV_CELL + NAV_CELL / 2,
    y: Math.floor(index / GRID_W) * NAV_CELL + NAV_CELL / 2,
  }
}

function nearestWalkable(start: number, radius: number): number {
  if (!blockedAt(fromCell(start).x, fromCell(start).y, radius)) return start
  const startX = start % GRID_W
  const startY = Math.floor(start / GRID_W)
  const limit = Math.max(GRID_W, GRID_H)
  for (let ring = 1; ring < limit; ring += 1) {
    for (let dy = -ring; dy <= ring; dy += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue
        const x = startX + dx
        const y = startY + dy
        if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) continue
        const index = y * GRID_W + x
        const point = fromCell(index)
        if (!blockedAt(point.x, point.y, radius)) return index
      }
    }
  }
  return -1
}
