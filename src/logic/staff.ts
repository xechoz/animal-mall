import type { Rng } from '@mg/core/rng'
import { distanceSq } from './collision'
import {
  FACILITY_DWELL_MS,
  isAnimalProductKind,
  isPlantKind,
  isProcessedKind,
  producerAccess,
  RECIPES,
  REST,
  STAFF,
  STAFF_ORDER,
  WANDER,
  zoneOf,
} from './config'
import { findPath } from './nav'
import {
  addFeed,
  addStock,
  binReady,
  collectFromProducer,
  feedSpace,
  hopperInputTotal,
  inputCapacity,
  recipeInputProducts,
  takeStock,
} from './production'
import type {
  GameEvent,
  ProducerState,
  ProductKind,
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
  /** Stations a chef already committed to this tick, shared by every chef. */
  readonly claims: Set<number>
  events: GameEvent[]
}

const STAFF_ID_BASE: Readonly<Record<StaffKind, number>> = {
  cashier: 0,
  picker: 100,
  chef: 200,
}

/** Cashier, pickers and chefs each get their own break slot. */
const REST_SLOT_BASE: Readonly<Record<StaffKind, number>> = {
  cashier: 0,
  picker: 1,
  chef: 3,
}

export function staffMemberId(kind: StaffKind, index: number): number {
  return 1_000 + STAFF_ID_BASE[kind] + index
}

export function createStaffMembers(
  staff: Readonly<Record<StaffKind, number>>,
  map: ShopMap,
): readonly StaffState[] {
  const members: StaffState[] = []
  for (const kind of STAFF_ORDER) {
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
  for (const kind of STAFF_ORDER) {
    for (let index = 0; index < staff[kind]; index += 1) alive.add(staffMemberId(kind, index))
  }
  const kept = members.filter((member) => alive.has(member.id))
  for (const kind of STAFF_ORDER) {
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
    claims: new Set<number>(),
    events: [],
  }
  const dt = Math.max(0, Math.min(dtMs, 50))
  const members = syncStaffMembers(state.staffMembers, state.staff, state.map)
  const nextMembers = members.map((member) => stepMember(member, ctx, dt, rng))
  const urged = stepUrgeDwell(state, nextMembers, dt, ctx.events)

  return {
    state: {
      ...state,
      producers: ctx.producers,
      shelves: ctx.shelves,
      staffMembers: urged.members,
      facility: urged.facility,
    },
    events: ctx.events,
  }
}

/**
 * A resting staff member can be woken by standing next to them for the same
 * half second used by every other world interaction. Clicking the character is
 * handled by the scene and calls `urgeStaff` directly.
 */
function stepUrgeDwell(
  state: ShopState,
  members: readonly StaffState[],
  dtMs: number,
  events: GameEvent[],
): { members: readonly StaffState[]; facility: ShopState['facility'] } {
  const player = state.player
  const still = !player.moving && distanceSq(player.pos, player.prevPos) <= 0.25
  let target: StaffState | null = null
  let best = Number.POSITIVE_INFINITY
  if (still) {
    for (const member of members) {
      if (member.phase !== 'resting') continue
      const range = distanceSq(player.pos, member.pos)
      if (range <= REST.urgeRadius * REST.urgeRadius && range < best) {
        target = member
        best = range
      }
    }
  }

  if (target === null) {
    return {
      members,
      facility: { ...state.facility, urgeTargetId: null, urgeDwellMs: 0 },
    }
  }

  const dwellMs =
    state.facility.urgeTargetId === target.id ? state.facility.urgeDwellMs + dtMs : dtMs
  if (dwellMs < FACILITY_DWELL_MS) {
    return {
      members,
      facility: { ...state.facility, urgeTargetId: target.id, urgeDwellMs: dwellMs },
    }
  }

  events.push({ type: 'staffUrged', staffId: target.id })
  return {
    members: members.map((member) =>
      member.id === target.id ? startToWork(member, state.map) : member,
    ),
    facility: { ...state.facility, urgeTargetId: null, urgeDwellMs: 0 },
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
  const offset = kind === 'cashier' ? 0 : (index - 0.5) * 34
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
    targetTroughId: null,
    fetchProduct: null,
    carry: null,
    carryCount: 0,
    timerMs: 0,
    waitMs: kind === 'cashier' ? 0 : index * 220,
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
  if (next.kind === 'cashier') return stepCashier(working, ctx)
  if (next.kind === 'picker') return stepPicker(working, ctx, dtMs, rng)
  return stepChef(working, ctx, dtMs, rng)
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

  if (next.phase === 'toProducer' || next.phase === 'toShelf' || next.phase === 'toTrough') {
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

  if (next.phase === 'feed') {
    if (next.timerMs > 0) return next
    return finishFeed(next, ctx, rng)
  }

  if (next.waitMs > 0) return next

  if (next.phase === 'idle' && next.carry === null && next.workMs >= restLimit(next)) {
    return startToDrink(next, ctx.map)
  }

  if (next.carry !== null && next.carryCount > 0) {
    if (isPlantKind(next.carry)) {
      const trough = pickTrough(ctx.producers, next.pos)
      if (trough !== null) return startToTrough(next, trough, ctx.map, rng)
    }
    const shelf = ctx.shelves[zoneOf(next.carry)]
    if (!binReady(ctx.shelves, next.carry)) {
      return { ...next, carry: null, carryCount: 0, phase: 'idle', waitMs: 300 }
    }
    if (shelf.stock[next.carry] < shelf.capacity) return startToShelf(next, ctx.map, rng)
    return { ...next, waitMs: 500 }
  }

  const producer = pickProducer(ctx.producers, ctx.shelves, next.pos, hasTroughSpace(ctx.producers))
  if (producer === null) return { ...next, waitMs: 500 }
  return startToProducer(next, producer, ctx.map, rng)
}

/**
 * Chefs run the kitchen. They carry finished dishes from station output trays
 * to the kitchen shelf, and top up station hoppers with shelf ingredients while
 * no dish is waiting. The stations already draw from shelf stock by themselves,
 * so the hopper run is a buffer, not the only supply path.
 */
function stepChef(member: StaffState, ctx: StaffContext, dtMs: number, rng: Rng): StaffState {
  if (
    member.targetProducerId !== null &&
    (member.phase === 'toProducer' ||
      member.phase === 'toFetch' ||
      member.phase === 'toLoad' ||
      member.phase === 'load')
  ) {
    ctx.claims.add(member.targetProducerId)
  }

  if (
    member.phase === 'toProducer' ||
    member.phase === 'toLoad' ||
    member.phase === 'toShelf' ||
    member.phase === 'toFetch'
  ) {
    const moved = advanceStaff(member, dtMs)
    if (!moved.arrived) return moved.member
    return arrivedChef(moved.member, ctx, rng)
  }

  if (member.phase === 'load') {
    if (member.timerMs > 0) return member
    return finishChefLoad(member, ctx, rng)
  }

  if (member.phase === 'stock') {
    if (member.timerMs > 0) return member
    return finishStock(member, ctx)
  }

  if (member.waitMs > 0) return member

  if (member.phase === 'idle' && member.carry === null && member.workMs >= restLimit(member)) {
    return startToDrink(member, ctx.map)
  }

  if (member.carry !== null && member.carryCount > 0) {
    return startToShelf(member, ctx.map, rng)
  }

  const ready = pickChefStation(member, ctx)
  if (ready !== null) {
    ctx.claims.add(ready.id)
    return startToStation(member, ready, ctx.map, rng)
  }

  const fetch = pickChefFetchTarget(member, ctx)
  if (fetch !== null) {
    ctx.claims.add(fetch.station.id)
    return startToFetch(member, fetch.station, fetch.product, ctx.map, rng)
  }

  return { ...member, phase: 'idle', waitMs: 400 }
}

function arrivedChef(member: StaffState, ctx: StaffContext, rng: Rng): StaffState {
  if (member.phase === 'toFetch') return arriveAtFetch(member, ctx, rng)
  if (member.phase === 'toLoad') return arriveAtLoad(member, ctx, rng)
  if (member.phase === 'toShelf') {
    if (member.carry !== null && !isProcessedKind(member.carry)) {
      return returnChefCarry(member, ctx)
    }
    if (member.carry === null || member.carryCount <= 0) return chefIdle(member, 240)
    return { ...member, phase: 'stock', timerMs: STAFF.chef.stockMs, moving: false }
  }
  return arriveAtStation(member, ctx, rng)
}

function arriveAtStation(member: StaffState, ctx: StaffContext, rng: Rng): StaffState {
  const station =
    member.targetProducerId === null
      ? undefined
      : ctx.producers.find((candidate) => candidate.id === member.targetProducerId)
  if (station === undefined || !isProcessedKind(station.product) || station.ready <= 0) {
    return chefIdle({ ...member, targetProducerId: null }, 240)
  }

  const product = station.product
  if (member.carry !== null && member.carryCount > 0 && member.carry !== product) {
    return startToShelf(member, ctx.map, rng)
  }
  if (!dishShelfRoom(ctx.shelves, product)) {
    return chefIdle({ ...member, targetProducerId: null }, 300)
  }

  ctx.events.push({ type: 'staffHarvest', staffId: member.id, product })
  ctx.producers = collectFromProducer(ctx.producers, station.id)
  const carryCount = member.carryCount + 1
  const next: StaffState = {
    ...member,
    phase: 'idle',
    targetProducerId: null,
    carry: product,
    carryCount,
    moving: false,
  }
  if (carryCount >= STAFF.chef.carry) return startToShelf(next, ctx.map, rng)
  const more = pickChefStation(next, ctx)
  if (more === null) return startToShelf(next, ctx.map, rng)
  ctx.claims.add(more.id)
  return startToStation(next, more, ctx.map, rng)
}

function arriveAtFetch(member: StaffState, ctx: StaffContext, rng: Rng): StaffState {
  const product = member.fetchProduct
  const station =
    member.targetProducerId === null
      ? undefined
      : ctx.producers.find((candidate) => candidate.id === member.targetProducerId)
  if (product === null || station === undefined || !isProcessedKind(station.product)) {
    return chefIdle({ ...member, fetchProduct: null, targetProducerId: null }, 240)
  }

  const taken = takeStock(ctx.shelves, product, STAFF.chef.carry)
  if (taken.taken <= 0) {
    return chefIdle({ ...member, fetchProduct: null, targetProducerId: null }, 500)
  }
  ctx.shelves = taken.shelves
  return {
    ...member,
    phase: 'toLoad',
    fetchProduct: null,
    carry: product,
    carryCount: taken.taken,
    path: wanderPath(
      member.pos,
      producerAccess(ctx.map, station.product, station.slot),
      12,
      ctx.map,
      rng,
      WANDER.staff,
    ),
    pathIndex: 0,
  }
}

function arriveAtLoad(member: StaffState, ctx: StaffContext, rng: Rng): StaffState {
  const station =
    member.targetProducerId === null
      ? undefined
      : ctx.producers.find((candidate) => candidate.id === member.targetProducerId)
  if (station === undefined || !isProcessedKind(station.product) || member.carry === null) {
    return startToShelf({ ...member, targetProducerId: null }, ctx.map, rng)
  }
  return {
    ...member,
    phase: 'load',
    timerMs: STAFF.chef.loadMs,
    moving: false,
    path: [],
    pathIndex: 0,
  }
}

function finishChefLoad(member: StaffState, ctx: StaffContext, rng: Rng): StaffState {
  const station =
    member.targetProducerId === null
      ? undefined
      : ctx.producers.find((candidate) => candidate.id === member.targetProducerId)
  const product = member.carry
  if (station === undefined || !isProcessedKind(station.product)) {
    // The station vanished while the chef was pouring: put the goods back.
    if (product !== null && member.carryCount > 0) {
      return startToShelf({ ...member, targetProducerId: null }, ctx.map, rng)
    }
    return chefIdle({ ...member, targetProducerId: null }, 240)
  }
  if (product === null || member.carryCount <= 0) {
    return chefIdle({ ...member, targetProducerId: null, carry: null, carryCount: 0 }, 240)
  }

  let hopper = { ...station.hopper }
  let remaining = member.carryCount
  for (const input of RECIPES[station.product].inputs) {
    if (!recipeInputProducts(input).includes(product)) continue
    const room = inputCapacity(input) - hopperInputTotal({ ...station, hopper }, input)
    const amount = Math.min(room, remaining)
    if (amount <= 0) continue
    hopper = { ...hopper, [product]: (hopper[product] ?? 0) + amount }
    remaining -= amount
    ctx.events.push({ type: 'stationLoad', producerId: station.id, product, amount })
  }

  if (remaining < member.carryCount) {
    ctx.producers = ctx.producers.map((candidate) =>
      candidate.id === station.id ? { ...candidate, hopper } : candidate,
    )
  }

  if (remaining > 0) {
    // The hopper filled up mid-trip: put the rest back on its shelf.
    return startToShelf(
      { ...member, phase: 'idle', targetProducerId: null, carryCount: remaining },
      ctx.map,
      rng,
    )
  }
  return chefIdle({ ...member, targetProducerId: null, carry: null, carryCount: 0 }, 300)
}

function returnChefCarry(member: StaffState, ctx: StaffContext): StaffState {
  const product = member.carry
  if (product === null || member.carryCount <= 0) {
    return chefIdle({ ...member, carry: null, carryCount: 0 }, 240)
  }
  const shelf = ctx.shelves[zoneOf(product)]
  const room = Math.max(0, shelf.capacity - shelf.stock[product])
  const amount = Math.min(room, member.carryCount)
  if (amount <= 0) return { ...member, phase: 'idle', moving: false, waitMs: 500 }

  ctx.shelves = addStock(ctx.shelves, product, amount)
  const left = member.carryCount - amount
  if (left > 0) {
    return { ...member, phase: 'idle', carryCount: left, moving: false, waitMs: 400 }
  }
  return chefIdle({ ...member, targetProducerId: null, carry: null, carryCount: 0 }, 300)
}

function pickChefStation(member: StaffState, ctx: StaffContext): ProducerState | null {
  let best: ProducerState | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const producer of ctx.producers) {
    if (producer.kind !== 'station') continue
    if (!isProcessedKind(producer.product)) continue
    if (producer.ready <= 0) continue
    if (ctx.claims.has(producer.id)) continue
    if (member.carry !== null && member.carryCount > 0 && member.carry !== producer.product) {
      continue
    }
    if (!dishShelfRoom(ctx.shelves, producer.product)) continue
    const gap = distanceSq(member.pos, producer.pos)
    if (gap < bestDistance) {
      best = producer
      bestDistance = gap
    }
  }
  return best
}

function pickChefFetchTarget(
  member: StaffState,
  ctx: StaffContext,
): { station: ProducerState; product: ProductKind } | null {
  let best: { station: ProducerState; product: ProductKind } | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const producer of ctx.producers) {
    if (producer.kind !== 'station') continue
    if (!isProcessedKind(producer.product)) continue
    if (ctx.claims.has(producer.id)) continue
    // A full output tray means this station would not consume any ingredients.
    if (producer.ready >= RECIPES[producer.product].capacity) continue
    const product = missingInputProduct(producer, ctx)
    if (product === null) continue
    const gap = distanceSq(member.pos, producer.pos)
    if (gap < bestDistance) {
      best = { station: producer, product }
      bestDistance = gap
    }
  }
  return best
}

/** The ingredient a station hopper needs next, chosen from what the shelves hold. */
function missingInputProduct(station: ProducerState, ctx: StaffContext): ProductKind | null {
  if (!isProcessedKind(station.product)) return null
  for (const input of RECIPES[station.product].inputs) {
    if (hopperInputTotal(station, input) >= inputCapacity(input)) continue
    let best: ProductKind | null = null
    let bestStock = 0
    for (const product of recipeInputProducts(input)) {
      if (!binReady(ctx.shelves, product)) continue
      const stock = ctx.shelves[zoneOf(product)].stock[product]
      if (stock > bestStock) {
        best = product
        bestStock = stock
      }
    }
    if (best !== null) return best
  }
  return null
}

function dishShelfRoom(
  shelves: Readonly<Record<ZoneId, ShelfState>>,
  product: ProductKind,
): boolean {
  const shelf = shelves[zoneOf(product)]
  return binReady(shelves, product) && shelf.stock[product] < shelf.capacity
}

function chefIdle(member: StaffState, waitMs: number): StaffState {
  return {
    ...member,
    phase: 'idle',
    moving: false,
    path: [],
    pathIndex: 0,
    timerMs: 0,
    waitMs,
  }
}

function startToStation(
  member: StaffState,
  station: ProducerState,
  map: ShopMap,
  rng: Rng,
): StaffState {
  return {
    ...member,
    phase: 'toProducer',
    targetProducerId: station.id,
    targetShelf: null,
    targetTroughId: null,
    fetchProduct: null,
    path: wanderPath(
      member.pos,
      producerAccess(map, station.product, station.slot),
      12,
      map,
      rng,
      WANDER.staff,
    ),
    pathIndex: 0,
  }
}

function startToFetch(
  member: StaffState,
  station: ProducerState,
  product: ProductKind,
  map: ShopMap,
  rng: Rng,
): StaffState {
  return {
    ...member,
    phase: 'toFetch',
    targetProducerId: station.id,
    targetShelf: null,
    targetTroughId: null,
    fetchProduct: product,
    path: wanderPath(member.pos, map.shelfAccess[zoneOf(product)], 12, map, rng, WANDER.staff),
    pathIndex: 0,
  }
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
    if (carryCount >= STAFF.picker.carry) return startToCarryDestination(next, ctx, rng)
    const more = pickProducer(ctx.producers, ctx.shelves, next.pos, hasTroughSpace(ctx.producers))
    if (more === null) return startToCarryDestination(next, ctx, rng)
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

  if (member.phase === 'toTrough') {
    const trough = ctx.producers.find((producer) => producer.id === member.targetTroughId)
    if (trough === undefined || feedSpace(trough) <= 0) {
      return startToCarryDestination({ ...member, phase: 'idle', targetTroughId: null }, ctx, rng)
    }
    return {
      ...member,
      phase: 'feed',
      timerMs: STAFF[member.kind].feedMs,
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
    // A chef never throws a dish away: wait for the kitchen bin to come back.
    if (member.kind === 'chef') return { ...member, phase: 'idle', waitMs: 400 }
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
      timerMs: STAFF[member.kind].stockMs,
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

function finishFeed(member: StaffState, ctx: StaffContext, rng: Rng): StaffState {
  const product = member.carry
  if (product === null || member.carryCount <= 0 || !isPlantKind(product)) {
    return { ...member, phase: 'idle', targetTroughId: null, waitMs: 240 }
  }

  const trough = ctx.producers.find((producer) => producer.id === member.targetTroughId)
  if (trough === undefined || feedSpace(trough) <= 0) {
    return startToCarryDestination({ ...member, phase: 'idle', targetTroughId: null }, ctx, rng)
  }

  const fed = addFeed(trough, product, 1)
  if (fed.accepted <= 0) {
    return startToCarryDestination({ ...member, phase: 'idle', targetTroughId: null }, ctx, rng)
  }

  ctx.producers = ctx.producers.map((producer) =>
    producer.id === trough.id ? fed.producer : producer,
  )
  ctx.events.push({ type: 'staffFeed', staffId: member.id, product })

  const carryCount = member.carryCount - 1
  if (carryCount <= 0) {
    return {
      ...member,
      phase: 'idle',
      targetTroughId: null,
      carry: null,
      carryCount: 0,
      timerMs: 0,
      waitMs: 180,
    }
  }

  const next: StaffState = {
    ...member,
    phase: 'feed',
    carryCount,
    timerMs: STAFF[member.kind].feedMs,
  }
  if (feedSpace(fed.producer) > 0) return next
  return startToCarryDestination({ ...next, phase: 'idle', targetTroughId: null }, ctx, rng)
}

function startToCarryDestination(member: StaffState, ctx: StaffContext, rng: Rng): StaffState {
  if (member.carry !== null && isPlantKind(member.carry)) {
    const trough = pickTrough(ctx.producers, member.pos)
    if (trough !== null) return startToTrough(member, trough, ctx.map, rng)
  }
  return startToShelf(member, ctx.map, rng)
}

function startToTrough(
  member: StaffState,
  trough: ProducerState,
  map: ShopMap,
  rng: Rng,
): StaffState {
  return {
    ...member,
    phase: 'toTrough',
    targetTroughId: trough.id,
    targetProducerId: null,
    targetShelf: null,
    path: wanderPath(
      member.pos,
      producerAccess(map, trough.product, trough.slot),
      12,
      map,
      rng,
      WANDER.staff,
    ),
    pathIndex: 0,
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
    targetTroughId: null,
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
    targetTroughId: null,
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
    targetTroughId: null,
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
    targetTroughId: null,
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

function restSlot(member: StaffState): number {
  const index = member.id - 1_000 - STAFF_ID_BASE[member.kind]
  return REST_SLOT_BASE[member.kind] + (member.kind === 'cashier' ? 0 : index)
}

function restLimit(member: StaffState): number {
  return REST.workMs + restSlot(member) * REST.workStaggerMs
}

function restSpotFor(member: StaffState, map: ShopMap): Vec2 {
  const spots = map.facilities.restSpots
  return spots[restSlot(member) % spots.length] ?? spots[0] ?? member.home
}

function pathTo(from: Vec2, to: Vec2, map: ShopMap): readonly Vec2[] {
  return findPath(from, to, 12, map) ?? [to]
}

function pickTrough(producers: readonly ProducerState[], pos: Vec2): ProducerState | null {
  let best: ProducerState | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const producer of producers) {
    if (!isAnimalProductKind(producer.product) || producer.product === 'fish') continue
    if (feedSpace(producer) <= 0) continue
    const distanceToTrough = distanceSq(pos, producer.pos)
    if (distanceToTrough < bestDistance) {
      best = producer
      bestDistance = distanceToTrough
    }
  }
  return best
}

function hasTroughSpace(producers: readonly ProducerState[]): boolean {
  return producers.some(
    (producer) =>
      isAnimalProductKind(producer.product) &&
      producer.product !== 'fish' &&
      feedSpace(producer) > 0,
  )
}

function pickProducer(
  producers: readonly ProducerState[],
  shelves: Readonly<Record<ZoneId, ShelfState>>,
  pos: Vec2,
  feedNeeded: boolean,
): ProducerState | null {
  let best: ProducerState | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const producer of producers) {
    if (producer.kind === 'station') continue
    if (producer.ready <= 0) continue
    if (!binReady(shelves, producer.product)) continue
    const shelf = shelves[zoneOf(producer.product)]
    const shelfFull = shelf.stock[producer.product] >= shelf.capacity
    if (shelfFull && !(feedNeeded && isPlantKind(producer.product))) continue
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
