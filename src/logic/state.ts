import type { Rng } from '@mg/core/rng'
import { addCarry, carryOf, carryTotal, EMPTY_CARRY, removeCarry, takeCarry } from './carry'
import { distance, distanceSq, distanceToRect, moveWithCollision } from './collision'
import {
  CUSTOMER_RADIUS,
  CUSTOMER_SPECIES,
  CUSTOMER_TUNING,
  carryCapacity,
  DRINK_ORDER,
  DRINKS,
  FEED_ORDER,
  fertilizerMultiplier,
  INTERACT,
  isPlantKind,
  isProcessedKind,
  moveSpeed,
  PLAYER_RADIUS,
  PRODUCT_ORDER,
  PRODUCT_WEIGHT,
  producerPosition,
  productPrice,
  RECIPES,
  REGISTER_RADIUS,
  scanIntervalMs,
  WANDER,
  ZONE_ORDER,
  ZONE_PRODUCTS,
  zeroBuffs,
  zoneOf,
} from './config'
import {
  dayAcceptsCustomers,
  dayGraceOver,
  dayPhase,
  discountClearedCustomers,
  finishDay,
  initialDayState,
  satisfactionScore,
} from './day'
import { initialDiningState, stepDining } from './dining'
import { stepFacilityDwell } from './facilities'
import { stepFishing } from './fishing'
import { findPath } from './nav'
import {
  addFeed,
  addStock,
  binReady,
  clearanceProducts,
  collectFromProducer,
  createProducer,
  eligibleProducts,
  emptyShelves,
  hopperInputTotal,
  inputCapacity,
  nearestCollectable,
  nearestTrough,
  recipeInputProducts,
  refreshShelves,
  stepProduction,
  stockOf,
} from './production'
import { stepQuickBuy } from './quickBuy'
import { activeCashier, createStaffMembers, stepStaff } from './staff'
import type {
  CustomerPhase,
  CustomerState,
  GameEvent,
  PlayerState,
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
import { wanderPath } from './wander'

interface CustomerMove {
  readonly customer: CustomerState
  readonly arrived: boolean
}

export function createShopState(save: SaveData, map: ShopMap): ShopState {
  const zones = { ...save.zones }
  const shelves = emptyShelves(zones, save.shelfLevels)
  const producers = save.producers.map((producer, index) =>
    createProducer(producer.product, producer.slot, index + 1, map),
  )
  let nextShelves = refreshShelves(shelves, producers, zones, save.shelfLevels)
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
      carry: EMPTY_CARRY,
      harvestMs: 0,
      stockMs: 0,
      feedMs: 0,
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
    shelfLevels: save.shelfLevels,
    staff: save.staff,
    staffMembers: createStaffMembers(save.staff, map),
    deposits: save.deposits,
    quickBuy: { targetKey: null, dwellMs: 0, armed: true },
    fishing: { pondId: null, phase: 'idle', timerMs: 0, armed: true },
    facility: {
      trashDwellMs: 0,
      drinkDwellMs: 0,
      drinkArmed: true,
      urgeTargetId: null,
      urgeDwellMs: 0,
    },
    dining: initialDiningState(),
    buffs: zeroBuffs(),
    tutorial,
    day: initialDayState(save.day),
  }
}

/**
 * Moves a running shop onto another floor plan. Progress and carried goods are
 * kept; transient shoppers and staff movement are reset so no path can point
 * at an obstacle from the old map.
 */
export function remapShopState(state: ShopState, map: ShopMap): ShopState {
  if (state.map.id === map.id) return state
  // Rotation clears shoppers whose paths belong to the old floor plan. They
  // never got a chance to shop, so they must not count as lost customers in
  // the daily report. Served shoppers already counted in `served`; those still
  // walking out keep their score.
  const unserved = state.customers.filter(
    (customer) => customer.phase !== 'leaving' || customer.sad,
  ).length
  return {
    ...state,
    map,
    day: discountClearedCustomers(state.day, unserved),
    player: {
      ...state.player,
      pos: map.playerStart,
      prevPos: map.playerStart,
      moving: false,
      harvestMs: 0,
      stockMs: 0,
      feedMs: 0,
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
    fishing: { pondId: null, phase: 'idle', timerMs: 0, armed: true },
    facility: {
      trashDwellMs: 0,
      drinkDwellMs: 0,
      drinkArmed: true,
      urgeTargetId: null,
      urgeDwellMs: 0,
    },
    dining: initialDiningState(),
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
    shelfLevels: state.shelfLevels,
    staff: state.staff,
    deposits: state.deposits,
    day: state.day.index,
  }
}

export function stepShop(state: ShopState, input: StepInput, rng: Rng, dtMs: number): StepResult {
  const dt = Math.max(0, Math.min(dtMs, 50))
  const events: GameEvent[] = []
  const growth = fertilizerMultiplier(state.upgrades.fertilizer)
  const carryMax =
    carryCapacity(state.upgrades.carry) + (state.buffs.milkTea > 0 ? DRINKS.milkTea.carryBonus : 0)
  const speed = Math.round(
    moveSpeed(state.upgrades.speed) *
      (state.buffs.appleSoda > 0 ? 1 + DRINKS.appleSoda.speedBonus : 1),
  )
  const scanInterval = Math.max(
    180,
    Math.round(
      scanIntervalMs(state.upgrades.scan) *
        (state.buffs.lemonTea > 0 ? 1 - DRINKS.lemonTea.scanBonus : 1),
    ),
  )
  const map = state.map

  const buffs = { ...state.buffs }
  for (const kind of DRINK_ORDER) buffs[kind] = Math.max(0, state.buffs[kind] - dt)
  let facility = state.facility
  let dining = state.dining

  let coins = state.coins
  let totalEarned = state.totalEarned
  let served = state.served
  let pendingCoins = state.pendingCoins
  let day = { ...state.day, ms: state.day.ms + dt }
  const hasCashier = activeCashier(state.staffMembers)
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
    feedMs: Math.max(0, player.feedMs - dt),
  }

  const diningStep = stepDining(
    player,
    dining,
    state.staffMembers,
    player.carry,
    dt,
    map,
    input.allowAutoSit ?? true,
  )
  player = diningStep.player
  dining = diningStep.dining
  events.push(...diningStep.events)
  const seated = dining.playerSeat !== null

  const production = stepProduction(producers, shelves, dt, growth)
  producers = production.producers
  shelves = production.shelves
  events.push(...production.events)

  if (!seated) {
    const load = stepStationLoad(producers, player)
    producers = load.producers
    player = load.player
    events.push(...load.events)

    if (player.harvestMs <= 0) {
      const room = carryMax - carryTotal(player.carry)
      if (room > 0) {
        const producer = nearestCollectable(producers, player.pos, map)
        if (producer !== null) {
          const amount = Math.min(producer.ready, room)
          producers = collectFromProducer(producers, producer.id, amount)
          player = {
            ...player,
            carry: addCarry(player.carry, producer.product, amount),
            harvestMs: INTERACT.harvestMs,
          }
          events.push({ type: 'harvest', product: producer.product, amount })
        }
      }
    }

    if (player.stockMs <= 0) {
      const zones = shelvesInReach(player.pos, map)
      if (zones.length > 0) {
        let carry = player.carry
        let stocked = false
        for (const product of PRODUCT_ORDER) {
          const amount = carryOf(carry, product)
          const zone = zoneOf(product)
          if (amount <= 0 || !zones.includes(zone)) continue
          if (!binReady(shelves, product)) continue
          const room = shelves[zone].capacity - shelves[zone].stock[product]
          if (room <= 0) continue
          const moved = Math.min(amount, room)
          shelves = addStock(shelves, product, moved)
          carry = takeCarry(carry, product, moved).carry
          events.push({ type: 'stock', product, amount: moved })
          stocked = true
        }
        if (stocked) player = { ...player, carry, stockMs: INTERACT.stockMs }
      }
    }

    /**
     * Feeding is a contact action like harvesting and stocking: walking past a
     * trough with produce pours it in. Cheapest crops go first so a passing
     * player does not automatically waste the most valuable stock.
     */
    if (player.feedMs <= 0) {
      const trough = nearestTrough(producers, player.pos, map, INTERACT.feedRadius)
      if (trough !== null) {
        let carry = player.carry
        let troughState = trough
        let fedAny = false
        for (const product of FEED_ORDER) {
          const amount = carryOf(carry, product)
          if (amount <= 0) continue
          const fed = addFeed(troughState, product, amount)
          if (fed.accepted <= 0) continue
          troughState = fed.producer
          carry = takeCarry(carry, product, fed.accepted).carry
          events.push({
            type: 'feed',
            producerId: trough.id,
            product,
            amount: fed.accepted,
          })
          fedAny = true
        }
        if (fedAny) {
          producers = producers.map((producer) =>
            producer.id === trough.id ? troughState : producer,
          )
          player = { ...player, carry, feedMs: INTERACT.feedMs }
        }
      }
    }

    const facilityStep = stepFacilityDwell(player, facility, dt, map)
    player = facilityStep.player
    facility = facilityStep.facility
    events.push(...facilityStep.events)
  }

  const fishingStep = seated
    ? { state: { ...state, player, producers, fishing: state.fishing }, events: [] }
    : stepFishing({ ...state, player, producers, fishing: state.fishing }, dt, moving, carryMax)
  player = fishingStep.state.player
  const fishing = fishingStep.state.fishing
  events.push(...fishingStep.events)

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
      const waitingInQueue = customer.phase === 'inQueue'
      const angerMs = waitingInQueue
        ? Math.min(3_000, customer.angerMs + dt * 0.45)
        : Math.max(0, customer.angerMs - dt * 0.6)
      customer = {
        ...customer,
        patienceMs: customer.patienceMs - dt * factor,
        angerMs:
          customer.patienceMs / customer.maxPatienceMs < 0.35 ? Math.max(angerMs, 1_200) : angerMs,
      }
    } else {
      customer = { ...customer, angerMs: Math.max(0, customer.angerMs - dt) }
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
            target !== null && shelves[zoneOf(target)].active && stockOf(shelves, target) > 0
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
              missed: customer.missed + 1,
              angerMs: Math.max(customer.angerMs, 2_400),
            }
            day = { ...day, missed: day.missed + 1 }
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
              path: wanderPath(
                customer.pos,
                map.shelfAccess[zoneOf(next)],
                radius,
                map,
                rng,
                WANDER.customer,
              ),
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
      let basket = customer.basket
      let paid = customer.paid

      while (scanMs >= scanInterval && basket.length > 0) {
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
        day = { ...day, revenue: day.revenue + price }
        scanMs -= scanInterval
        events.push({ type: 'scan', product, amount: price })
      }

      customer = { ...customer, basket, paid }
      if (basket.length === 0) {
        served += 1
        day = {
          ...day,
          served: day.served + 1,
          scoreSum:
            day.scoreSum +
            satisfactionScore(customer.missed, customer.patienceMs / customer.maxPatienceMs),
        }
        events.push({ type: 'sale', amount: paid, customerId: customer.id })
        customer = {
          ...customer,
          phase: 'leaving',
          target: null,
          queueIndex: -1,
          path: wanderPath(customer.pos, map.doorPoint, radius, map, rng, WANDER.customer),
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

  /**
   * Closing is a wind-down, not a cut: new shoppers stop at 21:30, the last
   * queue finishes, and the report appears once the shop is empty. The grace
   * clears a shopper stuck on a broken path so the day can never wedge.
   */
  if (dayGraceOver(day.ms) && customers.length > 0) {
    for (const customer of customers) {
      events.push({
        type: 'customerLeave',
        customerId: customer.id,
        sad: customer.phase !== 'leaving' || customer.sad,
      })
    }
    customers = []
    queue = []
    register = { customerId: null, scanMs: 0 }
  }

  if (dayPhase(day.ms) === 'closing' && customers.length === 0) {
    const closed = finishDay(day)
    day = { ...closed.day, report: closed.report }
    coins += closed.report.tip
    events.push({ type: 'dayEnded', report: closed.report })
    spawnMs = 1_500
  }

  spawnMs -= dt
  const eligible = eligibleProducts(shelves)
  const clearance = clearanceProducts(shelves)
  const canSpawn =
    dayAcceptsCustomers(day.ms) &&
    spawnMs <= 0 &&
    customers.length < CUSTOMER_TUNING.maxCustomers &&
    queue.length < CUSTOMER_TUNING.maxQueue &&
    eligible.length > 0

  // Prefer a species that is not already shopping, so a full queue never looks
  // like the same animal repeated. Once every species is present, fall back to
  // the whole list.
  if (canSpawn) {
    const takenSpecies = new Set(customers.map((customer) => customer.species))
    const freeSpecies = CUSTOMER_SPECIES.filter((species) => !takenSpecies.has(species))
    const speciesPool = freeSpecies.length > 0 ? freeSpecies : CUSTOMER_SPECIES

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
          speciesPool,
        ),
      ]
      nextCustomerId += 1
      day = { ...day, entered: day.entered + 1 }
      spawnMs = 2_500
    } else if (tutorial === 'done') {
      const count = 1 + rng.int(Math.min(4, 1 + eligible.length))
      const wanted = wantList(rng, eligible, clearance, shelves, count)
      customers = [
        ...customers,
        createCustomer(
          nextCustomerId,
          rng,
          wanted,
          CUSTOMER_TUNING.patienceMs,
          radius,
          map,
          speciesPool,
        ),
      ]
      nextCustomerId += 1
      day = { ...day, entered: day.entered + 1 }
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
    shelfLevels: state.shelfLevels,
    staff: state.staff,
    deposits: state.deposits,
    fishing,
    facility,
    dining,
    buffs,
    tutorial,
    day,
  }

  const quick = stepQuickBuy(nextState, dt, moving || seated)
  nextState = quick.state
  events.push(...quick.events)

  const staff = stepStaff(nextState, dt, rng)
  nextState = staff.state
  events.push(...staff.events)

  if (nextState.tutorial !== state.tutorial) {
    events.push({ type: 'tutorial', step: nextState.tutorial })
  }

  return { state: nextState, events }
}

/**
 * Walking next to a kitchen station pours every matching ingredient into its
 * hopper until the per-input buffer is full. There is no dwell: the same contact
 * rule that harvests and stocks also loads machines. Shelf stock stays the
 * automated source; the hopper is the hand-fed buffer.
 */
function stepStationLoad(
  producers: readonly ProducerState[],
  player: PlayerState,
): {
  producers: readonly ProducerState[]
  player: PlayerState
  events: GameEvent[]
} {
  const events: GameEvent[] = []
  const station = nearestStationForCarry(producers, player, player.carry)
  if (station === null) return { producers, player, events }

  let carry = player.carry
  let hopper = { ...station.hopper }
  for (const input of RECIPES[station.product as ProcessedProduct].inputs) {
    let room = inputCapacity(input) - hopperInputTotal({ ...station, hopper }, input)
    if (room <= 0) continue
    for (const product of recipeInputProducts(input)) {
      if (room <= 0) break
      const carried = carryOf(carry, product)
      if (carried <= 0) continue
      const taken = takeCarry(carry, product, Math.min(carried, room))
      carry = taken.carry
      if (taken.taken <= 0) continue
      hopper = { ...hopper, [product]: (hopper[product] ?? 0) + taken.taken }
      room -= taken.taken
      events.push({
        type: 'stationLoad',
        producerId: station.id,
        product,
        amount: taken.taken,
      })
    }
  }

  const loaded = events.length > 0
  const nextProducers = loaded
    ? producers.map((producer) => (producer.id === station.id ? { ...producer, hopper } : producer))
    : producers

  return {
    producers: nextProducers,
    player: loaded ? { ...player, carry } : player,
    events,
  }
}

type ProcessedProduct = keyof typeof RECIPES

function nearestStationForCarry(
  producers: readonly ProducerState[],
  player: PlayerState,
  carry: PlayerState['carry'],
): ProducerState | null {
  let best: ProducerState | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const producer of producers) {
    if (producer.kind !== 'station' || !isProcessedKind(producer.product)) continue
    if (producer.ready >= RECIPES[producer.product].capacity) continue
    const gap = distance(player.pos, producer.pos)
    if (gap > INTERACT.loadRadius || gap >= bestDistance) continue
    if (!stationNeedsCarry(producer, carry)) continue
    best = producer
    bestDistance = gap
  }
  return best
}

function stationNeedsCarry(producer: ProducerState, carry: PlayerState['carry']): boolean {
  if (!isProcessedKind(producer.product)) return false
  for (const input of RECIPES[producer.product].inputs) {
    if (hopperInputTotal(producer, input) >= inputCapacity(input)) continue
    if (recipeInputProducts(input).some((product) => carryOf(carry, product) > 0)) return true
  }
  return false
}

export function inRegisterZone(pos: Vec2, map: ShopMap): boolean {
  const counter = map.counter
  const closestX = Math.max(counter.x, Math.min(pos.x, counter.x + counter.w))
  const closestY = Math.max(counter.y, Math.min(pos.y, counter.y + counter.h))
  return Math.hypot(pos.x - closestX, pos.y - closestY) <= REGISTER_RADIUS
}

/**
 * Shelves are area triggers, exactly like zone unlocks: any spot along the
 * shelf edge (within `INTERACT.stockMargin`) counts, never a single access
 * point. Customers and staff still path to `map.shelfAccess`.
 */
function shelvesInReach(pos: Vec2, map: ShopMap): readonly ZoneId[] {
  return ZONE_ORDER.filter((zone) => distanceToRect(pos, map.shelves[zone]) <= INTERACT.stockMargin)
}

/**
 * Zones the player can stock right now: in reach, unlocked, carrying a matching
 * product and with room left on the shelf. The shelf hint reads this, so it
 * never lights up when the goods would not actually move.
 */
export function stockReach(state: ShopState): readonly ZoneId[] {
  return shelvesInReach(state.player.pos, state.map).filter((zone) => {
    const shelf = state.shelves[zone]
    if (!shelf.active) return false
    return ZONE_PRODUCTS[zone].some(
      (product) =>
        carryOf(state.player.carry, product) > 0 &&
        binReady(state.shelves, product) &&
        shelf.capacity - shelf.stock[product] > 0,
    )
  })
}

export function refreshStateShelves(state: ShopState): ShopState {
  const shelves = refreshShelves(
    { ...state.shelves },
    state.producers,
    state.zones,
    state.shelfLevels,
  )
  return { ...state, shelves }
}

export function setTutorial(state: ShopState, step: TutorialStep): ShopState {
  return state.tutorial === step ? state : { ...state, tutorial: step }
}

export function addProducerToState(state: ShopState, producer: ProducerState): ShopState {
  const producers = [...state.producers, producer]
  const shelves = refreshShelves({ ...state.shelves }, producers, state.zones, state.shelfLevels)
  return {
    ...state,
    producers,
    shelves,
    nextProducerId: Math.max(state.nextProducerId, producer.id + 1),
  }
}

export function removeProducerFromState(
  state: ShopState,
  id: number,
  clearCarry = true,
): ShopState {
  const removed = state.producers.find((producer) => producer.id === id)
  if (removed === undefined) return state
  const producers = state.producers.filter((producer) => producer.id !== id)
  const stillHasProduct = producers.some((producer) => producer.product === removed.product)
  let player = state.player
  if (clearCarry && !stillHasProduct) {
    player = { ...player, carry: removeCarry(player.carry, removed.product) }
  }
  const shelves = refreshShelves({ ...state.shelves }, producers, state.zones, state.shelfLevels)
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
  if (current === 'harvest' && carryTotal(player.carry) > 0) return 'stock'
  if (
    current === 'stock' &&
    PRODUCT_ORDER.some((product) => shelves[zoneOf(product)].everStocked[product])
  ) {
    return 'checkout'
  }
  if (current === 'checkout' && served > 0) return 'done'
  return current
}

function wantList(
  rng: Rng,
  eligible: readonly ProductKind[],
  clearance: readonly ProductKind[],
  shelves: Readonly<Record<ZoneId, ShelfState>>,
  count: number,
): ProductKind[] {
  const wanted: ProductKind[] = []
  // Old stock from a swapped crop or machine must not sit forever: every
  // customer considers at least one clearance item while any remains.
  if (clearance.length > 0) {
    wanted.push(weightedProduct(rng, clearance, shelves))
  }
  while (wanted.length < count) {
    wanted.push(weightedProduct(rng, eligible, shelves))
  }
  return wanted
}

function weightedProduct(
  rng: Rng,
  eligible: readonly ProductKind[],
  shelves: Readonly<Record<ZoneId, ShelfState>>,
): ProductKind {
  const weight = (product: ProductKind): number =>
    PRODUCT_WEIGHT[zoneOf(product)] * (1 + Math.min(6, shelves[zoneOf(product)].stock[product]))
  const total = eligible.reduce((sum, product) => sum + weight(product), 0)
  let roll = rng.int(Math.max(1, total))
  for (const product of eligible) {
    roll -= weight(product)
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
  speciesPool: readonly SpeciesId[],
): CustomerState {
  const species = rng.pick(speciesPool)
  const first = wanted[0] as ProductKind
  return {
    id,
    species,
    pos: map.doorSpawn,
    prevPos: map.doorSpawn,
    path: wanderPath(
      map.doorSpawn,
      map.shelfAccess[zoneOf(first)],
      radius,
      map,
      rng,
      WANDER.customer,
    ),
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
    angerMs: 0,
    paid: 0,
    missed: 0,
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
