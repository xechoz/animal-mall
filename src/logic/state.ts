import type { Rng } from '@mg/core/rng'
import { distance, distanceSq, moveWithCollision } from './collision'
import {
  COUNTER_RECT,
  CUSTOMER_RADIUS,
  CUSTOMER_SPECIES,
  CUSTOMER_TUNING,
  carryCapacity,
  DOOR_POINT,
  DOOR_SPAWN,
  FRUIT_ORDER,
  FRUITS,
  fertilizerMultiplier,
  INTERACT,
  moveSpeed,
  PLAYER_RADIUS,
  PLAYER_START,
  PLOTS,
  QUEUE_SLOTS,
  REGISTER_RADIUS,
  SHELF_ACCESS,
  scanIntervalMs,
  shelfCapacity,
} from './config'
import { findPath } from './nav'
import { stepQuickBuy } from './quickBuy'
import { createStaffMembers, stepStaff } from './staff'
import type {
  CustomerPhase,
  CustomerState,
  FruitKind,
  GameEvent,
  SaveData,
  ShelfState,
  ShopState,
  SpeciesId,
  StepInput,
  StepResult,
  TreeState,
  TutorialStep,
  UpgradeKind,
  Vec2,
} from './types'

interface CustomerMove {
  readonly customer: CustomerState
  readonly arrived: boolean
}

export function createShopState(save: SaveData): ShopState {
  const trees = save.trees
    .filter((tree) => PLOTS.some((plot) => plot.index === tree.plot))
    .map((tree, index): TreeState => {
      const plot = PLOTS[tree.plot] as (typeof PLOTS)[number]
      return {
        id: index + 1,
        kind: tree.kind,
        plot: tree.plot,
        pos: { x: plot.x, y: plot.y },
        growthMs: FRUITS[tree.kind].growMs,
        mature: true,
        fruit: 1,
        fruitMs: 0,
      }
    })

  const active = new Set(trees.map((tree) => tree.kind))
  const shelves = Object.fromEntries(
    FRUIT_ORDER.map((kind) => [
      kind,
      {
        kind,
        stock: 0,
        capacity: shelfCapacity(save.upgrades.shelf),
        active: active.has(kind),
        everStocked: save.served > 0 && active.has(kind),
      } satisfies ShelfState,
    ]),
  ) as Record<FruitKind, ShelfState>

  const tutorial: TutorialStep =
    save.served > 0 ? 'done' : trees.length === 0 ? 'buyTree' : 'harvest'

  return {
    coins: save.coins,
    totalEarned: save.totalEarned,
    served: save.served,
    pendingCoins: save.pendingCoins,
    player: {
      pos: PLAYER_START,
      prevPos: PLAYER_START,
      facing: 1,
      moving: false,
      carry: null,
      carryCount: 0,
      harvestMs: 0,
      stockMs: 0,
    },
    trees,
    shelves,
    customers: [],
    queue: [],
    register: { customerId: null, scanMs: 0 },
    spawnMs: 1_200,
    nextCustomerId: 1,
    nextTreeId: trees.length + 1,
    upgrades: save.upgrades,
    staff: save.staff,
    staffMembers: createStaffMembers(save.staff),
    deposits: save.deposits,
    quickBuy: { targetKey: null, dwellMs: 0, armed: true },
    tutorial,
  }
}

export function toSave(state: ShopState): SaveData {
  return {
    coins: state.coins,
    totalEarned: state.totalEarned,
    served: state.served,
    pendingCoins: state.pendingCoins,
    trees: [...state.trees]
      .sort((a, b) => a.plot - b.plot)
      .map((tree) => ({ kind: tree.kind, plot: tree.plot })),
    upgrades: state.upgrades,
    staff: state.staff,
    deposits: state.deposits,
  }
}

export function stepShop(state: ShopState, input: StepInput, rng: Rng, dtMs: number): StepResult {
  const dt = Math.max(0, Math.min(dtMs, 50))
  const events: GameEvent[] = []
  const fruits = fertilizerMultiplier(state.upgrades.fertilizer)
  const carryMax = carryCapacity(state.upgrades.carry)
  const speed = moveSpeed(state.upgrades.speed)

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
  let shelves = { ...state.shelves }

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
      pos: moveWithCollision(player.pos, moveX * step, moveY * step, PLAYER_RADIUS),
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

  const trees = state.trees.map((tree) => advanceTree(tree, dt, fruits, events))

  if (player.harvestMs <= 0 && player.carryCount < carryMax) {
    const tree = nearestTree(trees, player.pos, player.carry)
    if (tree !== null) {
      const nextTrees = trees.map((candidate) =>
        candidate.id === tree.id ? { ...candidate, fruit: candidate.fruit - 1 } : candidate,
      )
      trees.splice(0, trees.length, ...nextTrees)
      player = {
        ...player,
        carry: tree.kind,
        carryCount: player.carryCount + 1,
        harvestMs: INTERACT.harvestMs,
      }
      events.push({ type: 'harvest', kind: tree.kind, amount: 1 })
    }
  }

  if (player.stockMs <= 0 && player.carry !== null && player.carryCount > 0) {
    const target = nearestShelf(shelves, player.pos, player.carry)
    if (target !== null) {
      const shelf = shelves[target]
      if (shelf.stock < shelf.capacity) {
        shelves = {
          ...shelves,
          [target]: {
            ...shelf,
            stock: shelf.stock + 1,
            everStocked: true,
          },
        }
        const nextCount = player.carryCount - 1
        player = {
          ...player,
          carryCount: nextCount,
          carry: nextCount > 0 ? player.carry : null,
          stockMs: INTERACT.stockMs,
        }
        events.push({ type: 'stock', kind: target, amount: 1 })
      }
    }
  }

  tutorial = advanceTutorial(tutorial, trees, shelves, player, served)
  if (tutorial === 'checkout') spawnMs = Math.min(spawnMs, 1_200)

  const radius = CUSTOMER_RADIUS
  let customers: CustomerState[] = []

  for (const original of state.customers) {
    let customer = { ...original, prevPos: original.pos }

    if (customer.phase === 'leaving') {
      const moved = advanceCustomer(customer, dt)
      customer = moved.customer
      if (moved.arrived || distance(customer.pos, DOOR_POINT) < 14) {
        events.push({ type: 'customerLeave', customerId: customer.id, sad: customer.sad })
        continue
      }
      customers.push(customer)
      continue
    }

    const beingServed =
      queue[0] === customer.id &&
      customer.phase === 'inQueue' &&
      (hasCashier || inRegisterZone(player.pos))
    if (!beingServed) {
      const factor =
        customer.phase === 'inQueue' && customer.queueIndex > 0
          ? CUSTOMER_TUNING.queuePatienceFactor
          : 1
      customer = { ...customer, patienceMs: customer.patienceMs - dt * factor }
    }

    if (customer.patienceMs <= 0) {
      customer = leaveCustomer(customer)
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
          const shelf = target === null ? null : shelves[target]
          if (target !== null && shelf?.active === true && shelf.stock > 0) {
            shelves = {
              ...shelves,
              [target]: { ...shelf, stock: shelf.stock - 1 },
            }
            customer = {
              ...customer,
              basket: [...customer.basket, target],
              wanted: customer.wanted.slice(1),
            }
            events.push({
              type: 'customerPick',
              customerId: customer.id,
              kind: target,
            })
          } else if (target !== null) {
            customer = {
              ...customer,
              wanted: customer.wanted.slice(1),
            }
            events.push({
              type: 'customerMissed',
              customerId: customer.id,
              kind: target,
            })
          }

          if (customer.wanted.length > 0) {
            const next = customer.wanted[0] as FruitKind
            customer = {
              ...customer,
              target: next,
              phase: 'toShelf',
              path: pathTo(customer.pos, SHELF_ACCESS[next], radius),
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
                path: pathTo(customer.pos, QUEUE_SLOTS[index], radius),
                pathIndex: 0,
              }
            } else {
              customer = leaveCustomer(customer)
            }
          } else {
            customer = leaveCustomer(customer)
          }
        }
      }
    } else {
      customer = leaveCustomer(customer)
    }

    customers.push(customer)
  }

  if (queueChanged) customers = retargetQueue(customers, queue, radius)

  const frontId = queue[0]
  if (frontId !== undefined && (hasCashier || inRegisterZone(player.pos))) {
    const index = customers.findIndex((customer) => customer.id === frontId)
    const front = index >= 0 ? customers[index] : undefined
    if (front !== undefined && front.phase === 'inQueue') {
      let customer = front
      let scanMs = register.customerId === customer.id ? register.scanMs + dt : dt
      const interval = scanIntervalMs(state.upgrades.scan)
      let basket = customer.basket
      let paid = customer.paid

      while (scanMs >= interval && basket.length > 0) {
        const kind = basket[0] as FruitKind
        basket = basket.slice(1)
        const price = FRUITS[kind].price
        paid += price
        if (hasCashier && !inRegisterZone(player.pos)) {
          pendingCoins += price
          events.push({ type: 'coinsPending', amount: price })
        } else {
          coins += price
        }
        totalEarned += price
        scanMs -= interval
        events.push({ type: 'scan', kind, amount: price })
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
          path: pathTo(customer.pos, DOOR_POINT, radius),
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

  if (queueChanged) customers = retargetQueue(customers, queue, radius)

  if (pendingCoins > 0 && inRegisterZone(player.pos)) {
    events.push({ type: 'coinsCollected', amount: pendingCoins })
    coins += pendingCoins
    pendingCoins = 0
  }

  tutorial =
    served > 0 && tutorial === 'checkout'
      ? 'done'
      : tutorial === 'stock' && FRUIT_ORDER.some((kind) => shelves[kind].everStocked)
        ? 'checkout'
        : tutorial
  if (tutorial === 'checkout' && served > 0) tutorial = 'done'

  spawnMs -= dt
  const eligible = FRUIT_ORDER.filter((kind) => shelves[kind].active && shelves[kind].everStocked)
  const canSpawn =
    spawnMs <= 0 &&
    customers.length < CUSTOMER_TUNING.maxCustomers &&
    queue.length < CUSTOMER_TUNING.maxQueue &&
    eligible.length > 0

  if (canSpawn) {
    if (tutorial === 'checkout' && served === 0 && customers.length === 0) {
      const kind = eligible[0] as FruitKind
      customers = [
        ...customers,
        createCustomer(nextCustomerId, rng, [kind], CUSTOMER_TUNING.tutorialPatienceMs, radius),
      ]
      nextCustomerId += 1
      spawnMs = 2_500
    } else if (tutorial === 'done') {
      const count = 1 + rng.int(Math.min(4, 1 + eligible.length))
      const wanted = Array.from({ length: count }, () => rng.pick(eligible) as FruitKind)
      customers = [
        ...customers,
        createCustomer(nextCustomerId, rng, wanted, CUSTOMER_TUNING.patienceMs, radius),
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
    trees,
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

export function inRegisterZone(pos: Vec2): boolean {
  const closestX = Math.max(COUNTER_RECT.x, Math.min(pos.x, COUNTER_RECT.x + COUNTER_RECT.w))
  const closestY = Math.max(COUNTER_RECT.y, Math.min(pos.y, COUNTER_RECT.y + COUNTER_RECT.h))
  return Math.hypot(pos.x - closestX, pos.y - closestY) <= REGISTER_RADIUS
}

export function refreshShelves(state: ShopState): ShopState {
  const active = new Set(state.trees.map((tree) => tree.kind))
  const capacity = shelfCapacity(state.upgrades.shelf)
  const shelves = { ...state.shelves }
  for (const kind of FRUIT_ORDER) {
    const current = shelves[kind]
    const exists = active.has(kind)
    shelves[kind] = {
      ...current,
      capacity,
      active: exists,
      stock: exists ? Math.min(current.stock, capacity) : 0,
      everStocked: exists ? current.everStocked : false,
    }
  }
  return { ...state, shelves }
}

export function setTutorial(state: ShopState, step: TutorialStep): ShopState {
  return state.tutorial === step ? state : { ...state, tutorial: step }
}

export function addTreeToState(state: ShopState, tree: TreeState): ShopState {
  const next = {
    ...state,
    trees: [...state.trees, tree],
    nextTreeId: Math.max(state.nextTreeId, tree.id + 1),
  }
  return refreshShelves(next)
}

export function removeTreeFromState(state: ShopState, plot: number): ShopState {
  const removed = state.trees.find((tree) => tree.plot === plot)
  if (removed === undefined) return state
  const trees = state.trees.filter((tree) => tree.plot !== plot)
  const stillHasKind = trees.some((tree) => tree.kind === removed.kind)
  let player = state.player
  if (!stillHasKind && player.carry === removed.kind) {
    player = { ...player, carry: null, carryCount: 0 }
  }
  const next = { ...state, trees, player }
  return refreshShelves(next)
}

export function fruitTreePosition(plot: number): Vec2 {
  const target = PLOTS[plot]
  return target === undefined ? PLAYER_START : { x: target.x, y: target.y }
}

function advanceTree(
  tree: TreeState,
  dt: number,
  fruitSpeed: number,
  events: GameEvent[],
): TreeState {
  const config = FRUITS[tree.kind]
  if (!tree.mature) {
    const growthMs = tree.growthMs + dt * fruitSpeed
    if (growthMs >= config.growMs) {
      events.push({ type: 'treeMature', treeId: tree.id, plot: tree.plot })
      return {
        ...tree,
        growthMs: config.growMs,
        mature: true,
        fruit: 1,
        fruitMs: 0,
      }
    }
    return { ...tree, growthMs }
  }

  if (tree.fruit >= config.maxFruit) {
    return tree.fruitMs === 0 ? tree : { ...tree, fruitMs: 0 }
  }

  let fruit = tree.fruit
  let fruitMs = tree.fruitMs + dt * fruitSpeed
  while (fruitMs >= config.fruitMs && fruit < config.maxFruit) {
    fruit += 1
    fruitMs -= config.fruitMs
    events.push({ type: 'fruitReady', treeId: tree.id, plot: tree.plot })
  }
  if (fruit >= config.maxFruit) fruitMs = 0
  return { ...tree, fruit, fruitMs }
}

function nearestTree(
  trees: readonly TreeState[],
  pos: Vec2,
  carry: FruitKind | null,
): TreeState | null {
  let best: TreeState | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const tree of trees) {
    if (!tree.mature || tree.fruit <= 0) continue
    if (carry !== null && carry !== tree.kind) continue
    const distanceToTree = distance(pos, tree.pos)
    if (distanceToTree <= INTERACT.harvestRadius && distanceToTree < bestDistance) {
      best = tree
      bestDistance = distanceToTree
    }
  }
  return best
}

function nearestShelf(
  shelves: Readonly<Record<FruitKind, ShelfState>>,
  pos: Vec2,
  kind: FruitKind,
): FruitKind | null {
  const shelf = shelves[kind]
  if (!shelf.active || shelf.stock >= shelf.capacity) return null
  const access = SHELF_ACCESS[kind]
  return distance(pos, access) <= INTERACT.stockRadius ? kind : null
}

function advanceTutorial(
  current: TutorialStep,
  trees: readonly TreeState[],
  shelves: Readonly<Record<FruitKind, ShelfState>>,
  player: ShopState['player'],
  served: number,
): TutorialStep {
  if (current === 'buyTree' && trees.length > 0) return 'grow'
  if (current === 'grow' && trees.some((tree) => tree.mature)) return 'harvest'
  if (current === 'harvest' && player.carryCount > 0) return 'stock'
  if (current === 'stock' && FRUIT_ORDER.some((kind) => shelves[kind].everStocked))
    return 'checkout'
  if (current === 'checkout' && served > 0) return 'done'
  return current
}

function createCustomer(
  id: number,
  rng: Rng,
  wanted: readonly FruitKind[],
  patienceMs: number,
  radius: number,
): CustomerState {
  const species = rng.pick(CUSTOMER_SPECIES) as SpeciesId
  const first = wanted[0] as FruitKind
  return {
    id,
    species,
    pos: DOOR_SPAWN,
    prevPos: DOOR_SPAWN,
    path: pathTo(DOOR_SPAWN, SHELF_ACCESS[first], radius),
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

function leaveCustomer(customer: CustomerState): CustomerState {
  if (customer.phase === 'leaving') return customer
  return {
    ...customer,
    phase: 'leaving',
    sad: true,
    target: null,
    queueIndex: -1,
    path: pathTo(customer.pos, DOOR_POINT, CUSTOMER_RADIUS),
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
): CustomerState[] {
  const indexes = new Map<number, number>()
  for (const [index, id] of queue.entries()) indexes.set(id, index)
  return customers.map((customer) => {
    const index = indexes.get(customer.id)
    if (index === undefined || customer.phase === 'leaving') return customer
    if (customer.phase !== 'inQueue' && customer.phase !== 'toQueue') return customer
    const slot = QUEUE_SLOTS[index] as Vec2
    const atSlot = distanceSq(customer.pos, slot) < 9
    if (atSlot && customer.phase === 'inQueue' && customer.queueIndex === index) return customer
    return {
      ...customer,
      queueIndex: index,
      phase: atSlot ? 'inQueue' : 'toQueue',
      path: atSlot ? [] : pathTo(customer.pos, slot, radius),
      pathIndex: 0,
    }
  })
}

function pathTo(from: Vec2, to: Vec2, radius: number): readonly Vec2[] {
  return findPath(from, to, radius) ?? [to]
}

export type { CustomerPhase, UpgradeKind }
