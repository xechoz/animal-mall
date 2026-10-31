import type { Rng } from '@mg/core/rng'
import { distanceSq } from './collision'
import { producerAccess, REST, STAFF, WANDER, zoneOf } from './config'
import { findPath } from './nav'
import { addStock, binReady, collectFromProducer } from './production'
import type {
  GameEvent,
  ProducerState,
  ShelfState,
  ShopMap,
  ShopState,
  StaffKind,
  StaffState,
  StepResult,
  Vec2,
  ZoneId,
} from './types'
import { wanderPath } from './wander'

interface StaffContext {
  readonly map: ShopMap
  readonly queueLength: number
  readonly registerBusy: boolean
  producers: readonly ProducerState[]
  shelves: Record<ZoneId, ShelfState>
  events: GameEvent[]
}

export function staffMemberId(kind: StaffKind, index: number): number {
  return 1_000 + (kind === 'cashier' ? 0 : 100) + index
}

export function createStaffMembers(
  staff: Readonly<Record<StaffKind, number>>,
  map: ShopMap,
): readonly StaffState[] {
  const members: StaffState[] = []
  for (const kind of ['cashier', 'picker'] as const) {
    for (let index = 0; index < staff[kind]; index += 1) {
      members.push(createStaffMember(kind, index, map))
    }
  }
  return members
}

export function syncStaffMembers(
  members: readonly StaffState[],
  staff: Readonly<Record<StaffKind, number>>,
  map: ShopMap,
): readonly StaffState[] {
  const alive = new Set<number>()
  for (const kind of ['cashier', 'picker'] as const) {
    for (let index = 0; index < staff[kind]; index += 1) alive.add(staffMemberId(kind, index))
  }
  const kept = members.filter((member) => alive.has(member.id))
  for (const kind of ['cashier', 'picker'] as const) {
    for (let index = 0; index < staff[kind]; index += 1) {
      const id = staffMemberId(kind, index)
      if (!kept.some((member) => member.id === id)) {
        kept.push(createStaffMember(kind, index, map))
      }
    }
  }
  return kept
}

export function activeCashier(members: readonly StaffState[]): boolean {
  return members.some((member) => member.kind === 'cashier' && member.phase === 'cashier')
}

export function stepStaff(state: ShopState, dtMs: number, rng: Rng): StepResult {
  const ctx: StaffContext = {
    map: state.map,
    queueLength: state.queue.length,
    registerBusy: state.register.customerId !== null,
    producers: state.producers,
    shelves: { ...state.shelves },
    events: [],
  }
  const dt = Math.max(0, Math.min(dtMs, 50))
  const members = syncStaffMembers(state.staffMembers, state.staff, state.map)
  const nextMembers = members.map((member) => stepMember(member, ctx, dt, rng))

  return {
    state: {
      ...state,
      producers: ctx.producers,
      shelves: ctx.shelves,
      staffMembers: nextMembers,
    },
    events: ctx.events,
  }
}

export function urgeStaff(state: ShopState, staffId: number): StepResult {
  const member = state.staffMembers.find((candidate) => candidate.id === staffId)
  if (member === undefined || member.phase !== 'resting') {
    return { state, events: [] }
  }
  return {
    state: {
      ...state,
      staffMembers: state.staffMembers.map((candidate) =>
        candidate.id === staffId ? startToWork(candidate, state.map) : candidate,
      ),
    },
    events: [{ type: 'staffUrged', staffId }],
  }
}

function createStaffMember(kind: StaffKind, index: number, map: ShopMap): StaffState {
  const config = STAFF[kind]
  const offset = kind === 'picker' ? (index - 0.5) * 34 : 0
  const station = map.staffStations[kind]
  const home = { x: station.home.x + offset, y: station.home.y }
  return {
    id: staffMemberId(kind, index),
    kind,
    species: config.species,
    pos: home,
    prevPos: home,
    home,
    facing: 1,
    moving: false,
    path: [],
    pathIndex: 0,
    phase: kind === 'cashier' ? 'cashier' : 'idle',
    targetProducerId: null,
    targetShelf: null,
    carry: null,
    carryCount: 0,
    timerMs: 0,
    waitMs: kind === 'picker' ? index * 220 : 0,
    workMs: 0,
  }
}

function stepMember(member: StaffState, ctx: StaffContext, dtMs: number, rng: Rng): StaffState {
  let next: StaffState = {
    ...member,
    prevPos: member.pos,
    timerMs: Math.max(0, member.timerMs - dtMs),
    waitMs: Math.max(0, member.waitMs - dtMs),
  }

  if (next.phase === 'toDrink' || next.phase === 'toWork') {
    const moved = advanceStaff(next, dtMs)
    next = moved.member
    if (!moved.arrived) return next
    if (next.phase === 'toDrink') {
      return {
        ...next,
        phase: 'drinking',
        timerMs: REST.drinkMs,
        moving: false,
        path: [],
        pathIndex: 0,
      }
    }
    return startWorkPhase(next)
  }

  if (next.phase === 'drinking') {
    if (next.timerMs > 0) return next
    if (rng.int(100) < REST.returnPercent) return startToWork(next, ctx.map)
    ctx.events.push({ type: 'staffLazy', staffId: next.id, kind: next.kind })
    return { ...next, phase: 'resting', timerMs: 0, moving: false }
  }

  if (next.phase === 'resting') {
    return { ...next, moving: false }
  }

  const working = { ...next, workMs: next.workMs + dtMs }
  return next.kind === 'cashier' ? stepCashier(working, ctx) : stepPicker(working, ctx, dtMs, rng)
}

function stepCashier(member: StaffState, ctx: StaffContext): StaffState {
  if (member.workMs >= restLimit(member) && ctx.queueLength === 0 && !ctx.registerBusy) {
    return startToDrink(member, ctx.map)
  }
  return {
    ...member,
    pos: member.home,
    prevPos: member.home,
    moving: false,
    path: [],
    pathIndex: 0,
    phase: 'cashier',
  }
}

function stepPicker(member: StaffState, ctx: StaffContext, dtMs: number, rng: Rng): StaffState {
  let next = member

  if (next.phase === 'toProducer' || next.phase === 'toShelf') {
    const moved = advanceStaff(next, dtMs)
    next = moved.member
    if (moved.arrived) {
      next = arrivedAtTarget(next, ctx, rng)
    }
    return next
  }

  if (next.phase === 'harvest') {
    return { ...next, phase: 'idle', targetProducerId: null, waitMs: 240 }
  }

  if (next.phase === 'stock') {
    if (next.timerMs > 0) return next
    return finishStock(next, ctx)
  }

  if (next.waitMs > 0) return next

  if (next.phase === 'idle' && next.carry === null && next.workMs >= restLimit(next)) {
    return startToDrink(next, ctx.map)
  }

  if (next.carry !== null && next.carryCount > 0) {
    const shelf = ctx.shelves[zoneOf(next.carry)]
    if (!binReady(ctx.shelves, next.carry)) {
      return { ...next, carry: null, carryCount: 0, phase: 'idle', waitMs: 300 }
    }
    if (shelf.stock[next.carry] < shelf.capacity) return startToShelf(next, ctx.map, rng)
    return { ...next, waitMs: 500 }
  }

  const producer = pickProducer(ctx.producers, ctx.shelves, next.pos)
  if (producer === null) return { ...next, waitMs: 500 }
  return startToProducer(next, producer, ctx.map, rng)
}

function arrivedAtTarget(member: StaffState, ctx: StaffContext, rng: Rng): StaffState {
  if (member.phase === 'toProducer') {
    const producer = ctx.producers.find((candidate) => candidate.id === member.targetProducerId)
    if (producer === undefined || producer.ready <= 0) {
      return { ...member, phase: 'idle', targetProducerId: null, waitMs: 240 }
    }
    ctx.events.push({ type: 'staffHarvest', staffId: member.id, product: producer.product })
    ctx.producers = collectFromProducer(ctx.producers, producer.id)
    const carryCount = member.carryCount + 1
    const next: StaffState = {
      ...member,
      phase: 'idle',
      targetProducerId: null,
      carry: producer.product,
      carryCount,
      moving: false,
    }
    if (carryCount >= STAFF.picker.carry) return startToShelf(next, ctx.map, rng)
    const more = pickProducer(ctx.producers, ctx.shelves, next.pos)
    if (more === null) return startToShelf(next, ctx.map, rng)
    return startToProducer(next, more, ctx.map, rng)
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

function finishStock(member: StaffState, ctx: StaffContext): StaffState {
  const product = member.carry
  if (product === null || member.carryCount <= 0) {
    return { ...member, phase: 'idle', targetShelf: null, waitMs: 240 }
  }

  const shelf = ctx.shelves[zoneOf(product)]
  if (!binReady(ctx.shelves, product)) {
    return { ...member, phase: 'idle', carry: null, carryCount: 0, waitMs: 300 }
  }
  if (shelf.stock[product] >= shelf.capacity) {
    return { ...member, phase: 'idle', waitMs: 500 }
  }

  ctx.shelves = addStock(ctx.shelves, product, 1)
  ctx.events.push({ type: 'staffStock', staffId: member.id, product })

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

function startToProducer(
  member: StaffState,
  producer: ProducerState,
  map: ShopMap,
  rng: Rng,
): StaffState {
  return {
    ...member,
    phase: 'toProducer',
    targetProducerId: producer.id,
    targetShelf: null,
    path: wanderPath(
      member.pos,
      producerAccess(map, producer.product, producer.slot),
      12,
      map,
      rng,
      WANDER.staff,
    ),
    pathIndex: 0,
  }
}

function startToShelf(member: StaffState, map: ShopMap, rng: Rng): StaffState {
  const product = member.carry
  if (product === null) return { ...member, phase: 'idle', waitMs: 240 }
  const zone = zoneOf(product)
  return {
    ...member,
    phase: 'toShelf',
    targetShelf: zone,
    targetProducerId: null,
    path: wanderPath(member.pos, map.shelfAccess[zone], 12, map, rng, WANDER.staff),
    pathIndex: 0,
  }
}

function startToDrink(member: StaffState, map: ShopMap): StaffState {
  const spot = restSpotFor(member, map)
  return {
    ...member,
    phase: 'toDrink',
    targetProducerId: null,
    targetShelf: null,
    carry: null,
    carryCount: 0,
    timerMs: 0,
    waitMs: 0,
    path: pathTo(member.pos, spot, map),
    pathIndex: 0,
    moving: false,
  }
}

function startToWork(member: StaffState, map: ShopMap): StaffState {
  return {
    ...member,
    phase: 'toWork',
    targetProducerId: null,
    targetShelf: null,
    carry: null,
    carryCount: 0,
    timerMs: 0,
    waitMs: 0,
    workMs: 0,
    path: pathTo(member.pos, member.home, map),
    pathIndex: 0,
    moving: false,
  }
}

function startWorkPhase(member: StaffState): StaffState {
  if (member.kind === 'cashier') {
    return {
      ...member,
      phase: 'cashier',
      pos: member.home,
      prevPos: member.home,
      moving: false,
      path: [],
      pathIndex: 0,
      workMs: 0,
    }
  }
  return {
    ...member,
    phase: 'idle',
    moving: false,
    path: [],
    pathIndex: 0,
    workMs: 0,
    waitMs: 200,
  }
}

function restLimit(member: StaffState): number {
  const index =
    member.kind === 'cashier' ? 0 : Math.min(2, member.id - staffMemberId('picker', 0) + 1)
  return REST.workMs + index * REST.workStaggerMs
}

function restSpotFor(member: StaffState, map: ShopMap): Vec2 {
  const index =
    member.kind === 'cashier' ? 0 : Math.min(2, member.id - staffMemberId('picker', 0) + 1)
  return map.facilities.restSpots[index] ?? map.facilities.restSpots[0] ?? member.home
}

function pathTo(from: Vec2, to: Vec2, map: ShopMap): readonly Vec2[] {
  return findPath(from, to, 12, map) ?? [to]
}

function pickProducer(
  producers: readonly ProducerState[],
  shelves: Readonly<Record<ZoneId, ShelfState>>,
  pos: Vec2,
): ProducerState | null {
  let best: ProducerState | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const producer of producers) {
    if (producer.kind === 'station') continue
    if (producer.ready <= 0) continue
    if (!binReady(shelves, producer.product)) continue
    const shelf = shelves[zoneOf(producer.product)]
    if (shelf.stock[producer.product] >= shelf.capacity) continue
    const distanceToProducer = distanceSq(pos, producer.pos)
    if (distanceToProducer < bestDistance) {
      best = producer
      bestDistance = distanceToProducer
    }
  }
  return best
}

function advanceStaff(member: StaffState, dtMs: number): { member: StaffState; arrived: boolean } {
  if (member.path.length === 0 || member.pathIndex >= member.path.length) {
    return { member: { ...member, moving: false }, arrived: true }
  }

  const speed = STAFF[member.kind].speed > 0 ? STAFF[member.kind].speed : REST.walkSpeed
  let remaining = (speed * dtMs) / 1000
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
