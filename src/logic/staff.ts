import { distanceSq } from './collision'
import { PLOT_ACCESS, SHELF_ACCESS, STAFF } from './config'
import { findPath } from './nav'
import type {
  FruitKind,
  GameEvent,
  ShelfState,
  ShopState,
  StaffKind,
  StaffState,
  StepResult,
  TreeState,
  Vec2,
} from './types'

interface StaffContext {
  trees: readonly TreeState[]
  shelves: Readonly<Record<FruitKind, ShelfState>>
  events: GameEvent[]
}

export function staffMemberId(kind: StaffKind, index: number): number {
  return 1_000 + (kind === 'cashier' ? 0 : 100) + index
}

export function createStaffMembers(
  staff: Readonly<Record<StaffKind, number>>,
): readonly StaffState[] {
  const members: StaffState[] = []
  for (const kind of ['cashier', 'picker'] as const) {
    for (let index = 0; index < staff[kind]; index += 1) {
      members.push(createStaffMember(kind, index))
    }
  }
  return members
}

export function syncStaffMembers(
  members: readonly StaffState[],
  staff: Readonly<Record<StaffKind, number>>,
): readonly StaffState[] {
  const alive = new Set<number>()
  for (const kind of ['cashier', 'picker'] as const) {
    for (let index = 0; index < staff[kind]; index += 1) alive.add(staffMemberId(kind, index))
  }
  const kept = members.filter((member) => alive.has(member.id))
  for (const kind of ['cashier', 'picker'] as const) {
    for (let index = 0; index < staff[kind]; index += 1) {
      const id = staffMemberId(kind, index)
      if (!kept.some((member) => member.id === id)) kept.push(createStaffMember(kind, index))
    }
  }
  return kept
}

export function stepStaff(state: ShopState, dtMs: number): StepResult {
  const ctx: StaffContext = {
    trees: state.trees,
    shelves: state.shelves,
    events: [],
  }
  const members = syncStaffMembers(state.staffMembers, state.staff)
  const nextMembers = members.map((member) =>
    member.kind === 'cashier'
      ? stepCashier(member)
      : stepPicker(member, ctx, Math.max(0, Math.min(dtMs, 50))),
  )

  return {
    state: {
      ...state,
      trees: ctx.trees,
      shelves: ctx.shelves,
      staffMembers: nextMembers,
    },
    events: ctx.events,
  }
}

function createStaffMember(kind: StaffKind, index: number): StaffState {
  const config = STAFF[kind]
  const offset = kind === 'picker' ? (index - 0.5) * 34 : 0
  const home = { x: config.home.x + offset, y: config.home.y }
  return {
    id: staffMemberId(kind, index),
    kind,
    species: config.species,
    pos: home,
    prevPos: home,
    facing: 1,
    moving: false,
    path: [],
    pathIndex: 0,
    phase: kind === 'cashier' ? 'cashier' : 'idle',
    targetTreeId: null,
    targetShelf: null,
    carry: null,
    carryCount: 0,
    timerMs: 0,
    waitMs: kind === 'picker' ? index * 220 : 0,
  }
}

function stepCashier(member: StaffState): StaffState {
  const pos = STAFF.cashier.home
  return {
    ...member,
    pos,
    prevPos: pos,
    moving: false,
    path: [],
    pathIndex: 0,
    phase: 'cashier',
  }
}

function stepPicker(member: StaffState, ctx: StaffContext, dtMs: number): StaffState {
  let next: StaffState = {
    ...member,
    prevPos: member.pos,
    timerMs: Math.max(0, member.timerMs - dtMs),
    waitMs: Math.max(0, member.waitMs - dtMs),
  }

  if (next.phase === 'toTree' || next.phase === 'toShelf') {
    const moved = advanceStaff(next, dtMs)
    next = moved.member
    if (moved.arrived) {
      next = arrivedAtTarget(next, ctx)
    }
    return next
  }

  if (next.phase === 'harvest') {
    if (next.timerMs > 0) return next
    return finishHarvest(next, ctx)
  }

  if (next.phase === 'stock') {
    if (next.timerMs > 0) return next
    return finishStock(next, ctx)
  }

  if (next.waitMs > 0) return next

  if (next.carry !== null && next.carryCount > 0) {
    const shelf = ctx.shelves[next.carry]
    if (!shelf.active) {
      return { ...next, carry: null, carryCount: 0, phase: 'idle', waitMs: 300 }
    }
    if (shelf.stock < shelf.capacity) return startToShelf(next)
    return { ...next, waitMs: 500 }
  }

  const tree = pickTree(ctx.trees, ctx.shelves, next.pos)
  if (tree === null) return { ...next, waitMs: 500 }
  return startToTree(next, tree)
}

function arrivedAtTarget(member: StaffState, ctx: StaffContext): StaffState {
  if (member.phase === 'toTree') {
    const tree = ctx.trees.find((candidate) => candidate.id === member.targetTreeId)
    if (tree === undefined || !tree.mature || tree.fruit <= 0) {
      return { ...member, phase: 'idle', targetTreeId: null, waitMs: 240 }
    }
    return {
      ...member,
      phase: 'harvest',
      timerMs: STAFF.picker.harvestMs,
      moving: false,
    }
  }

  if (member.phase === 'toShelf') {
    if (member.carry === null || member.carryCount <= 0) {
      return { ...member, phase: 'idle', targetShelf: null, waitMs: 240 }
    }
    return {
      ...member,
      phase: 'stock',
      timerMs: STAFF.picker.stockMs,
      moving: false,
    }
  }

  return member
}

function finishHarvest(member: StaffState, ctx: StaffContext): StaffState {
  const tree = ctx.trees.find((candidate) => candidate.id === member.targetTreeId)
  if (tree === undefined || !tree.mature || tree.fruit <= 0) {
    return { ...member, phase: 'idle', targetTreeId: null, waitMs: 240 }
  }

  ctx.trees = ctx.trees.map((candidate) =>
    candidate.id === tree.id ? { ...candidate, fruit: candidate.fruit - 1 } : candidate,
  )
  ctx.events.push({ type: 'staffHarvest', staffId: member.id, kind: tree.kind })

  const carryCount = member.carryCount + 1
  const next: StaffState = {
    ...member,
    phase: 'idle',
    targetTreeId: null,
    carry: tree.kind,
    carryCount,
    timerMs: 0,
  }

  if (carryCount >= STAFF.picker.carry) return startToShelf(next)

  const more = pickTree(ctx.trees, ctx.shelves, next.pos)
  if (more === null) return startToShelf(next)
  return next
}

function finishStock(member: StaffState, ctx: StaffContext): StaffState {
  const kind = member.carry
  if (kind === null || member.carryCount <= 0) {
    return { ...member, phase: 'idle', targetShelf: null, waitMs: 240 }
  }

  const shelf = ctx.shelves[kind]
  if (!shelf.active) {
    return { ...member, phase: 'idle', carry: null, carryCount: 0, waitMs: 300 }
  }
  if (shelf.stock >= shelf.capacity) {
    return { ...member, phase: 'idle', waitMs: 500 }
  }

  ctx.shelves = {
    ...ctx.shelves,
    [kind]: { ...shelf, stock: shelf.stock + 1, everStocked: true },
  }
  ctx.events.push({ type: 'staffStock', staffId: member.id, kind })

  const carryCount = member.carryCount - 1
  if (carryCount > 0) {
    return {
      ...member,
      phase: 'stock',
      carryCount,
      timerMs: STAFF.picker.stockMs,
    }
  }

  return {
    ...member,
    phase: 'idle',
    targetShelf: null,
    carry: null,
    carryCount: 0,
    timerMs: 0,
    waitMs: 180,
  }
}

function startToTree(member: StaffState, tree: TreeState): StaffState {
  const goal = PLOT_ACCESS[tree.plot] ?? tree.pos
  const path = pathTo(member.pos, goal)
  return {
    ...member,
    phase: 'toTree',
    targetTreeId: tree.id,
    targetShelf: null,
    path,
    pathIndex: 0,
  }
}

function startToShelf(member: StaffState): StaffState {
  const kind = member.carry
  if (kind === null) return { ...member, phase: 'idle', waitMs: 240 }
  return {
    ...member,
    phase: 'toShelf',
    targetShelf: kind,
    targetTreeId: null,
    path: pathTo(member.pos, SHELF_ACCESS[kind]),
    pathIndex: 0,
  }
}

function pickTree(
  trees: readonly TreeState[],
  shelves: Readonly<Record<FruitKind, ShelfState>>,
  pos: Vec2,
): TreeState | null {
  let best: TreeState | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const tree of trees) {
    if (!tree.mature || tree.fruit <= 0) continue
    const shelf = shelves[tree.kind]
    if (!shelf.active || shelf.stock >= shelf.capacity) continue
    const distanceToTree = distanceSq(pos, tree.pos)
    if (distanceToTree < bestDistance) {
      best = tree
      bestDistance = distanceToTree
    }
  }
  return best
}

function advanceStaff(member: StaffState, dtMs: number): { member: StaffState; arrived: boolean } {
  if (member.path.length === 0 || member.pathIndex >= member.path.length) {
    return { member: { ...member, moving: false }, arrived: true }
  }

  let remaining = (STAFF.picker.speed * dtMs) / 1000
  let position = member.pos
  let index = member.pathIndex
  let facing = member.facing
  let guard = 0

  while (remaining > 0 && index < member.path.length && guard < 12) {
    guard += 1
    const target = member.path[index] as Vec2
    const dx = target.x - position.x
    const dy = target.y - position.y
    const length = Math.hypot(dx, dy)
    if (Math.abs(dx) > 0.1) facing = dx < 0 ? -1 : 1
    if (length <= remaining) {
      position = target
      remaining -= length
      index += 1
    } else {
      const ratio = remaining / length
      position = { x: position.x + dx * ratio, y: position.y + dy * ratio }
      remaining = 0
    }
  }

  return {
    member: {
      ...member,
      pos: position,
      facing,
      moving: true,
      pathIndex: index,
    },
    arrived: index >= member.path.length,
  }
}

function pathTo(from: Vec2, to: Vec2): readonly Vec2[] {
  return findPath(from, to, 12) ?? [to]
}
