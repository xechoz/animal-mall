import type { Rng } from '@mg/core/rng'
import { distance, distanceSq, moveWithCollision } from './collision'
import {
  CUSTOMER_RADIUS,
  CUSTOMER_SPECIES,
  CUSTOMER_TUNING,
  carryCapacity,
  fertilizerMultiplier,
  INTERACT,
  isPlantKind,
  moveSpeed,
  PLAYER_RADIUS,
  PRODUCT_ORDER,
  PRODUCT_WEIGHT,
  producerPosition,
  productPrice,
  REGISTER_RADIUS,
  scanIntervalMs,
  shelfCapacity,
  zoneOf,
} from './config'
import { findPath } from './nav'
import {
  addStock,
  binReady,
  collectFromProducer,
  createProducer,
  eligibleProducts,
  emptyShelves,
  nearestCollectable,
  refreshShelves,
  stepProduction,
  stockOf,
} from './production'
import { stepQuickBuy } from './quickBuy'
import { createStaffMembers, stepStaff } from './staff'
import type {
  CustomerPhase,
  CustomerState,
  GameEvent,
  ProducerState,
  ProductKind,
  SaveData,
  ShelfState,
  ShopMap,
  ShopState,
  SpeciesId,
  StepInput,
  StepResult,
  TutorialStep,
  UpgradeKind,
  Vec2,
  ZoneId,
} from './types'

interface CustomerMove {
  readonly customer: CustomerState
  readonly arrived: boolean
}

export function createShopState(save: SaveData, map: ShopMap): ShopState {
  const zones = { ...save.zones }
  const shelves = emptyShelves(zones, shelfCapacity(save.upgrades.shelf))
  const producers = save.producers.map((producer, index) =>
    createProducer(producer.product, producer.slot, index + 1, map),
  )
  let nextShelves = refreshShelves(shelves, producers, zones, shelfCapacity(save.upgrades.shelf))
  if (save.served > 0) {
    nextShelves = markExistingStocked(nextShelves, producers)
  }

  const tutorial: TutorialStep =
    save.served > 0
      ? 'done'
      : producers.some((producer) => producer.kind === 'plant')
        ? 'harvest'
        : 'buyTree'

  return {
    map,
    coins: save.coins,
    totalEarned: save.totalEarned,
    served: save.served,
    pendingCoins: save.pendingCoins,
    player: {
      pos: map.playerStart,
      prevPos: map.playerStart,
      facing: 1,
      moving: false,
      carry: null,
      carryCount: 0,
      harvestMs: 0,
      stockMs: 0,
    },
    zones,
    producers,
    shelves: nextShelves,
    customers: [],
    queue: [],
    register: { customerId: null, scanMs: 0 },
    spawnMs: 1_200,
    nextCustomerId: 1,
    nextProducerId: producers.length + 1,
    upgrades: save.upgrades,
    staff: save.staff,
    staffMembers: createStaffMembers(save.staff, map),
    deposits: save.deposits,
    quickBuy: { targetKey: null, dwellMs: 0, armed: true },
    tutorial,
  }
}

/**
 * Moves a running shop onto another floor plan. Progress and carried goods are
 * kept; transient shoppers and staff movement are reset so no path can point
 * at an obstacle from the old map.
 */
export function remapShopState(state: ShopState, map: ShopMap): ShopState {
  if (state.map.id === map.id) return state
  return {
    ...state,
    map,
    player: {
      ...state.player,
      pos: map.playerStart,
      prevPos: map.playerStart,
      moving: false,
      harvestMs: 0,
      stockMs: 0,
    },
    producers: state.producers.map((producer) => ({
      ...producer,
      pos: producerPosition(map, producer.product, producer.slot),
    })),
    customers: [],
    queue: [],
    register: { customerId: null, scanMs: 0 },
    spawnMs: 1_200,
    staffMembers: createStaffMembers(state.staff, map),
    quickBuy: { targetKey: null, dwellMs: 0, armed: true },
  }
}

export function toSave(state: ShopState): SaveData {
  return {
    coins: state.coins,
    totalEarned: state.totalEarned,
    served: state.served,
    pendingCoins: state.pendingCoins,
    producers: [...state.producers]
      .sort((a, b) => zoneOf(a.product).localeCompare(zoneOf(b.product)) || a.slot - b.slot)
      .map((producer) => ({ product: producer.product, slot: producer.slot })),
    zones: state.zones,
    upgrades: state.upgrades,
    staff: state.staff,
    deposits: state.deposits,
  }
}

export function stepShop(state: ShopState, input: StepInput, rng: Rng, dtMs: number): StepResult {
  const dt = Math.max(0, Math.min(dtMs, 50))
  const events: GameEvent[] = []
  const growth = fertilizerMultiplier(state.upgrades.fertilizer)
  const carryMax = carryCapacity(state.upgrades.carry)
  const speed = moveSpeed(state.upgrades.speed)
  const map = state.map

  let coins = state.coins
  let totalEarned = state.totalEarned
  let served = state.served
  let pendingCoins = state.pendingCoins
  const hasCashier = state.staff.cashier > 0
  let tutorial = state.tutorial
  let spawnMs = state.spawnMs
  let nextCustomerId = state.nextCustomerId
  let queue = [...state.queue]
  let queueChanged = false
  let register = { ...state.register }
  let shelves: Record<ZoneId, ShelfState> = { ...state.shelves }
  let zones = state.zones
  let producers: readonly ProducerState[] = state.producers

  let player = {
    ...state.player,
    prevPos: state.player.pos,
  }

  const magnitude = Math.hypot(input.moveX, input.moveY)
  const normalized = magnitude > 1 ? 1 / magnitude : 1
  const moveX = input.moveX * normalized
  const moveY = input.moveY * normalized
  const moving = Math.hypot(moveX, moveY) > 0.05
  if (moving) {
    const step = (speed * dt) / 1000
    player = {
      ...player,
      pos: moveWithCollision(player.pos, moveX * step, moveY * step, PLAYER_RADIUS, map),
      moving: true,
      facing: moveX < -0.08 ? -1 : moveX > 0.08 ? 1 : player.facing,
    }
  } else {
    player = { ...player, moving: false }
  }

  player = {
    ...player,
    harvestMs: Math.max(0, player.harvestMs - dt),
    stockMs: Math.max(0, player.stockMs - dt),
  }

  const production = stepProduction(producers, shelves, dt, growth)
  producers = production.producers
  shelves = production.shelves
  events.push(...production.events)

  if (player.harvestMs <= 0 && player.carryCount < carryMax) {
    const producer = nearestCollectable(producers, player.pos, player.carry)
    if (producer !== null) {
      producers = collectFromProducer(producers, producer.id)
      player = {
        ...player,
        carry: producer.product,
        carryCount: player.carryCount + 1,
        harvestMs: INTERACT.harvestMs,
      }
      events.push({ type: 'harvest', product: producer.product, amount: 1 })
    }
  }

  if (player.stockMs <= 0 && player.carry !== null && player.carryCount > 0) {
    const product = player.carry
    const zone = zoneOf(product)
    const shelf = shelves[zone]
    if (
      binReady(shelves, product) &&
      shelf.stock[product] < shelf.capacity &&
      distance(player.pos, map.shelfAccess[zone]) <= INTERACT.stockRadius
    ) {
      shelves = addStock(shelves, product, 1)
      const nextCount = player.carryCount - 1
      player = {
        ...player,
        carryCount: nextCount,
        carry: nextCount > 0 ? product : null,
        stockMs: INTERACT.stockMs,
      }
      events.push({ type: 'stock', product, amount: 1 })
    }
  }

  tutorial = advanceTutorial(tutorial, producers, shelves, player, served)
  if (tutorial === 'checkout') spawnMs = Math.min(spawnMs, 1_200)

  const radius = CUSTOMER_RADIUS
  let customers: CustomerState[] = []

  for (const original of state.customers) {
    let customer = { ...original, prevPos: original.pos }

    if (customer.phase === 'leaving') {
      const moved = advanceCustomer(customer, dt)
      customer = moved.customer
      if (moved.arrived || distance(customer.pos, map.doorPoint) < 14) {
        events.push({ type: 'customerLeave', customerId: customer.id, sad: customer.sad })
        continue
      }
      customers.push(customer)
      continue
    }

    const beingServed =
      queue[0] === customer.id &&
      customer.phase === 'inQueue' &&
      (hasCashier || inRegisterZone(player.pos, map))
    if (!beingServed) {
      const factor =
        customer.phase === 'inQueue' && customer.queueIndex > 0
          ? CUSTOMER_TUNING.queuePatienceFactor
          : 1
      customer = { ...customer, patienceMs: customer.patienceMs - dt * factor }
    }

    if (customer.patienceMs <= 0) {
      customer = leaveCustomer(customer, map)
      if (queue.includes(customer.id)) {
        queue = queue.filter((id) => id !== customer.id)
        queueChanged = true
        if (register.customerId === customer.id) register = { customerId: null, scanMs: 0 }
      }
    }

    if (customer.phase !== 'leaving') {
      const moved = advanceCustomer(customer, dt)
      customer = moved.customer
      if (moved.arrived) {
        if (customer.phase === 'toShelf') {
          customer = {
            ...customer,
            phase: 'picking',
            waitMs: CUSTOMER_TUNING.pickMs,
          }
        } else if (customer.phase === 'toQueue') {
          customer = { ...customer, phase: 'inQueue' }
        }
      }

      if (customer.phase === 'picking') {
        customer = { ...customer, waitMs: customer.waitMs - dt }
        if (customer.waitMs <= 0) {
          const target = customer.target
          const available =
            target !== null && binReady(shelves, target) && stockOf(shelves, target) > 0
          if (target !== null && available) {
            const zone = zoneOf(target)
            const shelf = shelves[zone]
            shelves = {
              ...shelves,
              [zone]: {
                ...shelf,
                stock: { ...shelf.stock, [target]: shelf.stock[target] - 1 },
              },
            }
            customer = {
              ...customer,
              basket: [...customer.basket, target],
              wanted: customer.wanted.slice(1),
            }
            events.push({
              type: 'customerPick',
              customerId: customer.id,
              product: target,
            })
          } else if (target !== null) {
            customer = {
              ...customer,
              wanted: customer.wanted.slice(1),
            }
            events.push({
              type: 'customerMissed',
              customerId: customer.id,
              product: target,
            })
          }

          if (customer.wanted.length > 0) {
            const next = customer.wanted[0] as ProductKind
            customer = {
              ...customer,
              target: next,
              phase: 'toShelf',
              path: pathTo(customer.pos, map.shelfAccess[zoneOf(next)], radius, map),
              pathIndex: 0,
            }
          } else if (customer.basket.length > 0) {
            if (queue.length < CUSTOMER_TUNING.maxQueue) {
              const index = queue.length
              queue = [...queue, customer.id]
              queueChanged = true
              customer = {
                ...customer,
                target: null,
                phase: 'toQueue',
                queueIndex: index,
                path: pathTo(customer.pos, map.queueSlots[index] as Vec2, radius, map),
                pathIndex: 0,
              }
            } else {
              customer = leaveCustomer(customer, map)
            }
          } else {
            customer = leaveCustomer(customer, map)
          }
        }
      }
    } else {
      customer = leaveCustomer(customer, map)
    }

    customers.push(customer)
  }

  if (queueChanged) customers = retargetQueue(customers, queue, radius, map)

  const frontId = queue[0]
  if (frontId !== undefined && (hasCashier || inRegisterZone(player.pos, map))) {
    const index = customers.findIndex((customer) => customer.id === frontId)
    const front = index >= 0 ? customers[index] : undefined
    if (front !== undefined && front.phase === 'inQueue') {
      let customer = front
      let scanMs = register.customerId === customer.id ? register.scanMs + dt : dt
      const interval = scanIntervalMs(state.upgrades.scan)
      let basket = customer.basket
      let paid = customer.paid

      while (scanMs >= interval && basket.length > 0) {
        const product = basket[0] as ProductKind
        basket = basket.slice(1)
        const price = productPrice(product)
        paid += price
        if (hasCashier && !inRegisterZone(player.pos, map)) {
          pendingCoins += price
          events.push({ type: 'coinsPending', amount: price })
        } else {
          coins += price
        }
        totalEarned += price
        scanMs -= interval
        events.push({ type: 'scan', product, amount: price })
      }

      customer = { ...customer, basket, paid }
      if (basket.length === 0) {
        served += 1
        events.push({ type: 'sale', amount: paid, customerId: customer.id })
        customer = {
          ...customer,
          phase: 'leaving',
          target: null,
          queueIndex: -1,
          path: pathTo(customer.pos, map.doorPoint, radius, map),
          pathIndex: 0,
        }
        queue = queue.slice(1)
        queueChanged = true
        register = { customerId: null, scanMs: 0 }
      } else {
        register = { customerId: customer.id, scanMs }
      }
      customers[index] = customer
    } else {
      register = { customerId: null, scanMs: 0 }
    }
  } else {
    register = { customerId: null, scanMs: 0 }
  }

  if (queueChanged) customers = retargetQueue(customers, queue, radius, map)

  if (pendingCoins > 0 && inRegisterZone(player.pos, map)) {
    events.push({ type: 'coinsCollected', amount: pendingCoins })
    coins += pendingCoins
    pendingCoins = 0
  }

  if (!zones.veg && served > 0) {
    zones = { ...zones, veg: true }
    shelves = { ...shelves, veg: { ...shelves.veg, active: true } }
    events.push({ type: 'zoneUnlocked', zone: 'veg' })
  }

  tutorial =
    served > 0 && tutorial === 'checkout'
      ? 'done'
      : tutorial === 'stock' &&
          PRODUCT_ORDER.some((product) => shelves[zoneOf(product)].everStocked[product])
        ? 'checkout'
        : tutorial
  if (tutorial === 'checkout' && served > 0) tutorial = 'done'

  spawnMs -= dt
  const eligible = eligibleProducts(shelves)
  const canSpawn =
    spawnMs <= 0 &&
    customers.length < CUSTOMER_TUNING.maxCustomers &&
    queue.length < CUSTOMER_TUNING.maxQueue &&
    eligible.length > 0

  if (canSpawn) {
    if (tutorial === 'checkout' && served === 0 && customers.length === 0) {
      const product = eligible[0] as ProductKind
      customers = [
        ...customers,
        createCustomer(
          nextCustomerId,
          rng,
          [product],
          CUSTOMER_TUNING.tutorialPatienceMs,
          radius,
          map,
        ),
      ]
      nextCustomerId += 1
      spawnMs = 2_500
    } else if (tutorial === 'done') {
      const count = 1 + rng.int(Math.min(4, 1 + eligible.length))
      const wanted = Array.from({ length: count }, () => weightedProduct(rng, eligible))
      customers = [
        ...customers,
        createCustomer(nextCustomerId, rng, wanted, CUSTOMER_TUNING.patienceMs, radius, map),
      ]
      nextCustomerId += 1
      spawnMs = CUSTOMER_TUNING.spawnMs + rng.int(CUSTOMER_TUNING.spawnJitterMs)
    }
  } else if (spawnMs <= 0) {
    spawnMs = 1_000
  }

  let nextState: ShopState = {
    ...state,
    coins,
    totalEarned,
    served,
    pendingCoins,
    player,
    zones,
    producers,
    shelves,
    customers,
    queue,
    register,
    spawnMs,
    nextCustomerId,
    upgrades: state.upgrades,
    staff: state.staff,
    deposits: state.deposits,
    tutorial,
  }

  const quick = stepQuickBuy(nextState, dt, moving)
  nextState = quick.state
  events.push(...quick.events)

  const staff = stepStaff(nextState, dt)
  nextState = staff.state
  events.push(...staff.events)

  if (nextState.tutorial !== state.tutorial) {
    events.push({ type: 'tutorial', step: nextState.tutorial })
  }

  return { state: nextState, events }
}

export function inRegisterZone(pos: Vec2, map: ShopMap): boolean {
  const counter = map.counter
  const closestX = Math.max(counter.x, Math.min(pos.x, counter.x + counter.w))
  const closestY = Math.max(counter.y, Math.min(pos.y, counter.y + counter.h))
  return Math.hypot(pos.x - closestX, pos.y - closestY) <= REGISTER_RADIUS
}

export function refreshStateShelves(state: ShopState): ShopState {
  const shelves = refreshShelves(
    { ...state.shelves },
    state.producers,
    state.zones,
    shelfCapacity(state.upgrades.shelf),
  )
  return { ...state, shelves }
}

export function setTutorial(state: ShopState, step: TutorialStep): ShopState {
  return state.tutorial === step ? state : { ...state, tutorial: step }
}

export function addProducerToState(state: ShopState, producer: ProducerState): ShopState {
  const producers = [...state.producers, producer]
  const shelves = refreshShelves(
    { ...state.shelves },
    producers,
    state.zones,
    shelfCapacity(state.upgrades.shelf),
  )
  return {
    ...state,
    producers,
    shelves,
    nextProducerId: Math.max(state.nextProducerId, producer.id + 1),
  }
}

export function removeProducerFromState(state: ShopState, id: number): ShopState {
  const removed = state.producers.find((producer) => producer.id === id)
  if (removed === undefined) return state
  const producers = state.producers.filter((producer) => producer.id !== id)
  const stillHasProduct = producers.some((producer) => producer.product === removed.product)
  let player = state.player
  if (!stillHasProduct && player.carry === removed.product) {
    player = { ...player, carry: null, carryCount: 0 }
  }
  const shelves = refreshShelves(
    { ...state.shelves },
    producers,
    state.zones,
    shelfCapacity(state.upgrades.shelf),
  )
  return { ...state, producers, shelves, player }
}

function markExistingStocked(
  shelves: Record<ZoneId, ShelfState>,
  producers: readonly ProducerState[],
): Record<ZoneId, ShelfState> {
  let next = shelves
  for (const producer of producers) {
    const zone = zoneOf(producer.product)
    const shelf = next[zone]
    next = {
      ...next,
      [zone]: {
        ...shelf,
        everStocked: { ...shelf.everStocked, [producer.product]: true },
      },
    }
  }
  return next
}

function advanceTutorial(
  current: TutorialStep,
  producers: readonly ProducerState[],
  shelves: Readonly<Record<ZoneId, ShelfState>>,
  player: ShopState['player'],
  served: number,
): TutorialStep {
  if (current === 'buyTree' && producers.some((producer) => isPlantKind(producer.product))) {
    return 'grow'
  }
  if (
    current === 'grow' &&
    producers.some((producer) => isPlantKind(producer.product) && producer.mature)
  ) {
    return 'harvest'
  }
  if (current === 'harvest' && player.carryCount > 0) return 'stock'
  if (
    current === 'stock' &&
    PRODUCT_ORDER.some((product) => shelves[zoneOf(product)].everStocked[product])
  ) {
    return 'checkout'
  }
  if (current === 'checkout' && served > 0) return 'done'
  return current
}

function weightedProduct(rng: Rng, eligible: readonly ProductKind[]): ProductKind {
  const total = eligible.reduce((sum, product) => sum + PRODUCT_WEIGHT[zoneOf(product)], 0)
  let roll = rng.int(total)
  for (const product of eligible) {
    roll -= PRODUCT_WEIGHT[zoneOf(product)]
    if (roll < 0) return product
  }
  return eligible[0] as ProductKind
}

function createCustomer(
  id: number,
  rng: Rng,
  wanted: readonly ProductKind[],
  patienceMs: number,
  radius: number,
  map: ShopMap,
): CustomerState {
  const species = rng.pick(CUSTOMER_SPECIES) as SpeciesId
  const first = wanted[0] as ProductKind
  return {
    id,
    species,
    pos: map.doorSpawn,
    prevPos: map.doorSpawn,
    path: pathTo(map.doorSpawn, map.shelfAccess[zoneOf(first)], radius, map),
    pathIndex: 0,
    phase: 'toShelf',
    wanted,
    basket: [],
    target: first,
    patienceMs,
    maxPatienceMs: patienceMs,
    waitMs: 0,
    queueIndex: -1,
    speed: CUSTOMER_TUNING.speed,
    sad: false,
    paid: 0,
  }
}

function leaveCustomer(customer: CustomerState, map: ShopMap): CustomerState {
  if (customer.phase === 'leaving') return customer
  return {
    ...customer,
    phase: 'leaving',
    sad: true,
    target: null,
    queueIndex: -1,
    path: pathTo(customer.pos, map.doorPoint, CUSTOMER_RADIUS, map),
    pathIndex: 0,
  }
}

function advanceCustomer(customer: CustomerState, dt: number): CustomerMove {
  if (customer.path.length === 0 || customer.pathIndex >= customer.path.length) {
    return { customer, arrived: true }
  }
  let remaining = (customer.speed * dt) / 1000
  let position = customer.pos
  let index = customer.pathIndex
  let guard = 0

  while (remaining > 0 && index < customer.path.length && guard < 12) {
    guard += 1
    const target = customer.path[index] as Vec2
    const dx = target.x - position.x
    const dy = target.y - position.y
    const length = Math.hypot(dx, dy)
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
    customer: { ...customer, pos: position, pathIndex: index },
    arrived: index >= customer.path.length,
  }
}

function retargetQueue(
  customers: readonly CustomerState[],
  queue: readonly number[],
  radius: number,
  map: ShopMap,
): CustomerState[] {
  const indexes = new Map<number, number>()
  for (const [index, id] of queue.entries()) indexes.set(id, index)
  return customers.map((customer) => {
    const index = indexes.get(customer.id)
    if (index === undefined || customer.phase === 'leaving') return customer
    if (customer.phase !== 'inQueue' && customer.phase !== 'toQueue') return customer
    const slot = map.queueSlots[index] as Vec2
    const atSlot = distanceSq(customer.pos, slot) < 9
    if (atSlot && customer.phase === 'inQueue' && customer.queueIndex === index) return customer
    return {
      ...customer,
      queueIndex: index,
      phase: atSlot ? 'inQueue' : 'toQueue',
      path: atSlot ? [] : pathTo(customer.pos, slot, radius, map),
      pathIndex: 0,
    }
  })
}

function pathTo(from: Vec2, to: Vec2, radius: number, map: ShopMap): readonly Vec2[] {
  return findPath(from, to, radius, map) ?? [to]
}

export type { CustomerPhase, UpgradeKind }
