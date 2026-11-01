import {
  FRUIT_ORDER,
  isAnimalProductKind,
  isPlantKind,
  isProcessedKind,
  PLANT_ORDER,
  PLANTS,
  producerCost,
  producerSlotCount,
  STAFF,
  shelfCapacity,
  shelfUpgradeCost,
  shelfUpgradeMax,
  UPGRADE_ORDER,
  UPGRADES,
  ZONES,
  zoneOf,
} from './config'
import { createProducer } from './production'
import {
  addProducerToState,
  refreshStateShelves,
  removeProducerFromState,
  setTutorial,
} from './state'
import type {
  GameEvent,
  PlantKind,
  ProducerState,
  ProductKind,
  ShopState,
  StaffKind,
  UpgradeKind,
  ZoneId,
} from './types'

export type PurchaseResult =
  | 'ok'
  | 'insufficient'
  | 'noSlot'
  | 'maxed'
  | 'missing'
  | 'deposited'
  | 'locked'
  | 'lockedZone'
  | 'lastProducer'

export interface PurchaseOutcome {
  readonly state: ShopState
  readonly result: PurchaseResult
  readonly events: readonly GameEvent[]
}

export function upgradeCost(kind: UpgradeKind, level: number): number | null {
  return UPGRADES[kind].costs[level] ?? null
}

export function upgradeMax(kind: UpgradeKind): number {
  return UPGRADES[kind].costs.length
}

export function shelfUpgradeCostFor(level: number): number | null {
  return shelfUpgradeCost(level)
}

export function shelfUpgradeMaxLevel(): number {
  return shelfUpgradeMax()
}

export function staffCost(kind: StaffKind, level: number): number | null {
  return STAFF[kind].costs[level] ?? null
}

export function staffMax(kind: StaffKind): number {
  return STAFF[kind].costs.length
}

export function plantDepositKey(kind: PlantKind, slot?: number): string {
  return slot === undefined ? `plant:${kind}` : `plant:${kind}:${slot}`
}

export function staffDepositKey(kind: StaffKind): string {
  return `staff:${kind}`
}

/**
 * Deposits belong to one bed. A legacy global `plant:<kind>` deposit is shown
 * only on the first empty bed so old saves stay usable without painting every
 * other bed with the same deposit ring.
 */
export function slotPlantDeposit(
  state: ShopState,
  zone: 'fruit' | 'veg',
  slot: number,
): { readonly kind: PlantKind; readonly amount: number } | null {
  for (const kind of PLANT_ORDER) {
    if (zoneOf(kind) !== zone) continue
    const amount = state.deposits[plantDepositKey(kind, slot)] ?? 0
    if (amount > 0) return { kind, amount }
  }
  if (emptyPlantSlot(state, zone) !== slot) return null
  for (const kind of PLANT_ORDER) {
    if (zoneOf(kind) !== zone) continue
    const amount = state.deposits[plantDepositKey(kind)] ?? 0
    if (amount > 0) return { kind, amount }
  }
  return null
}

export function emptyPlantSlot(state: ShopState, zone: 'fruit' | 'veg'): number | null {
  const used = new Set(
    state.producers
      .filter((producer) => isPlantKind(producer.product) && zoneOf(producer.product) === zone)
      .map((producer) => producer.slot),
  )
  const point = state.map.plantSlots[zone].find((plot) => !used.has(plot.index))
  return point === undefined ? null : point.index
}

export function plantedCount(state: ShopState, product: ProductKind): number {
  return state.producers.filter((producer) => producer.product === product).length
}

export function purchasePlant(state: ShopState, product: PlantKind): PurchaseOutcome {
  const zone = zoneOf(product)
  if (zone !== 'fruit' && zone !== 'veg') return { state, result: 'missing', events: [] }
  const slot = emptyPlantSlot(state, zone)
  if (slot === null) return { state, result: 'noSlot', events: [] }
  return purchasePlantAt(state, product, slot, false)
}

export function purchasePlantAt(
  state: ShopState,
  product: PlantKind,
  slot: number,
  allowDeposit: boolean,
): PurchaseOutcome {
  const zone = zoneOf(product)
  if (zone !== 'fruit' && zone !== 'veg') return { state, result: 'missing', events: [] }
  if (!state.zones[zone]) return { state, result: 'lockedZone', events: [] }
  const point = state.map.plantSlots[zone][slot]
  if (point === undefined) return { state, result: 'noSlot', events: [] }
  if (
    state.producers.some(
      (producer) =>
        isPlantKind(producer.product) &&
        zoneOf(producer.product) === zone &&
        producer.slot === slot,
    )
  ) {
    return { state, result: 'missing', events: [] }
  }

  const active = slotPlantDeposit(state, zone, slot)
  if (active !== null && active.kind !== product) {
    return { state, result: 'locked', events: [] }
  }

  const cost = PLANTS[product].cost
  const deposit = active?.kind === product ? active.amount : 0
  const remaining = Math.max(0, cost - deposit)

  if (state.coins >= remaining) {
    const producer = createProducer(product, slot, state.nextProducerId, state.map, true)
    const deposits = { ...state.deposits }
    delete deposits[plantDepositKey(product, slot)]
    delete deposits[plantDepositKey(product)]
    let next = addProducerToState(
      {
        ...state,
        coins: state.coins - remaining,
        deposits,
      },
      producer,
    )
    next = setTutorial(next, state.tutorial === 'buyTree' ? 'grow' : state.tutorial)
    return {
      state: next,
      result: 'ok',
      events: [{ type: 'producerBought', product, slot }],
    }
  }

  // A deposit is only safe when the player can still earn coins. With no
  // producers there is no income, so never strand the opening fund.
  if (!allowDeposit || state.producers.length === 0 || state.coins <= 0) {
    return { state, result: 'insufficient', events: [] }
  }

  const amount = state.coins
  const key = plantDepositKey(product, slot)
  const deposits = { ...state.deposits }
  // Move a legacy global deposit onto the bed the player is paying at.
  delete deposits[plantDepositKey(product)]
  deposits[key] = deposit + amount
  return {
    state: { ...state, coins: 0, deposits },
    result: 'deposited',
    events: [
      {
        type: 'deposit',
        target: 'plant',
        product,
        amount,
        remaining: Math.max(0, cost - deposits[key]),
      },
    ],
  }
}

/**
 * Replaces one planted crop without changing how many producers the shop has.
 * The old crop refunds half of its cost, the new crop costs full price, and the
 * player only needs to cover the difference. Empty slots still use
 * `purchasePlantAt`.
 */
export function replacePlantAt(
  state: ShopState,
  product: PlantKind,
  slot: number,
): PurchaseOutcome {
  const zone = zoneOf(product)
  if (zone !== 'fruit' && zone !== 'veg') return { state, result: 'missing', events: [] }
  if (!state.zones[zone]) return { state, result: 'lockedZone', events: [] }
  const current = state.producers.find(
    (producer) =>
      isPlantKind(producer.product) && zoneOf(producer.product) === zone && producer.slot === slot,
  )
  if (current === undefined) return { state, result: 'missing', events: [] }
  if (current.product === product) return { state, result: 'maxed', events: [] }

  const cost = PLANTS[product].cost
  const refund = Math.floor(producerCost(current.product) * 0.5)
  const available = state.coins + refund
  if (available < cost) return { state, result: 'insufficient', events: [] }

  const without = removeProducerFromState(state, current.id)
  const producer = createProducer(product, slot, state.nextProducerId, state.map, true)
  let next = addProducerToState({ ...without, coins: available - cost }, producer)
  next = setTutorial(next, state.tutorial === 'buyTree' ? 'grow' : state.tutorial)
  return {
    state: next,
    result: 'ok',
    events: [
      {
        type: 'producerReplaced',
        product,
        previous: current.product,
        slot,
        refund,
      },
    ],
  }
}

export function purchaseProducer(state: ShopState, product: ProductKind): PurchaseOutcome {
  const zone = zoneOf(product)
  if (!state.zones[zone]) return { state, result: 'lockedZone', events: [] }
  if (isPlantKind(product)) return purchasePlant(state, product)
  if (isAnimalProductKind(product) || isProcessedKind(product)) {
    if (zone !== 'farm' && zone !== 'kitchen') return { state, result: 'missing', events: [] }
    if (state.producers.some((producer) => producer.product === product)) {
      return { state, result: 'maxed', events: [] }
    }
    const slot = firstFreeProducerSlot(state, zone)
    if (slot === null) return { state, result: 'noSlot', events: [] }
    return installProducerAt(state, product, slot)
  }
  return { state, result: 'missing', events: [] }
}

/**
 * Installs one animal or machine into a specific farm/kitchen slot. Replacing
 * an existing producer refunds half of its cost in the same transaction and
 * never clears the player's carried goods: those are already harvested stock.
 * A product can only be installed once, so every pen/station has a purpose.
 */
export function installProducerAt(
  state: ShopState,
  product: ProductKind,
  slot: number,
): PurchaseOutcome {
  const zone = zoneOf(product)
  if (zone !== 'farm' && zone !== 'kitchen') return { state, result: 'missing', events: [] }
  if (!state.zones[zone]) return { state, result: 'lockedZone', events: [] }
  if (!Number.isInteger(slot) || slot < 0 || slot >= producerSlotCount(zone)) {
    return { state, result: 'missing', events: [] }
  }

  const current = producerAtSlot(state, zone, slot)
  if (current !== undefined && current.product === product) {
    return { state, result: 'maxed', events: [] }
  }
  if (
    state.producers.some((producer) => producer.product === product && producer.id !== current?.id)
  ) {
    return { state, result: 'maxed', events: [] }
  }

  const cost = producerCost(product)
  const refund = current === undefined ? 0 : Math.floor(producerCost(current.product) * 0.5)
  const available = state.coins + refund
  if (available < cost) return { state, result: 'insufficient', events: [] }

  const without = current === undefined ? state : removeProducerFromState(state, current.id, false)
  const producer = createProducer(product, slot, without.nextProducerId, state.map, true)
  const next = addProducerToState({ ...without, coins: available - cost }, producer)
  return {
    state: next,
    result: 'ok',
    events:
      current === undefined
        ? [{ type: 'producerBought', product, slot }]
        : [
            {
              type: 'producerReplaced',
              product,
              previous: current.product,
              slot,
              refund,
            },
          ],
  }
}

export function producerAtSlot(
  state: ShopState,
  zone: 'farm' | 'kitchen',
  slot: number,
): ProducerState | undefined {
  return state.producers.find(
    (producer) => producer.slot === slot && zoneOf(producer.product) === zone,
  )
}

export function firstFreeProducerSlot(state: ShopState, zone: 'farm' | 'kitchen'): number | null {
  for (let slot = 0; slot < producerSlotCount(zone); slot += 1) {
    if (producerAtSlot(state, zone, slot) === undefined) return slot
  }
  return null
}

export function purchaseZone(state: ShopState, zone: ZoneId): PurchaseOutcome {
  if (state.zones[zone]) return { state, result: 'maxed', events: [] }
  if (zone === 'veg' && state.served === 0) return { state, result: 'locked', events: [] }
  const config = ZONES[zone]
  if (state.coins < config.unlockCost) return { state, result: 'insufficient', events: [] }

  const events: GameEvent[] = [{ type: 'zoneUnlocked', zone }]
  let next: ShopState = {
    ...state,
    coins: state.coins - config.unlockCost,
    zones: { ...state.zones, [zone]: true },
  }

  const includes = config.includes
  if (includes !== null && !state.producers.some((producer) => producer.product === includes)) {
    const includesZone = zoneOf(includes)
    if (includesZone === 'farm' || includesZone === 'kitchen') {
      const slot = firstFreeProducerSlot(next, includesZone)
      if (slot !== null) {
        const producer = createProducer(includes, slot, next.nextProducerId, next.map, true)
        next = addProducerToState(next, producer)
      }
    }
  }

  return { state: refreshStateShelves(next), result: 'ok', events }
}

export function purchaseUpgrade(state: ShopState, kind: UpgradeKind): PurchaseOutcome {
  const level = state.upgrades[kind]
  const cost = upgradeCost(kind, level)
  if (cost === null) return { state, result: 'maxed', events: [] }
  if (state.coins < cost) return { state, result: 'insufficient', events: [] }

  const upgrades = {
    ...state.upgrades,
    [kind]: level + 1,
  }

  return {
    state: { ...state, coins: state.coins - cost, upgrades },
    result: 'ok',
    events: [{ type: 'upgradeBought', kind, level: level + 1 }],
  }
}

/** Each zone's shelf has its own level and capacity. */
export function purchaseShelfUpgrade(state: ShopState, zone: ZoneId): PurchaseOutcome {
  if (!state.zones[zone]) return { state, result: 'lockedZone', events: [] }
  const level = state.shelfLevels[zone]
  const cost = shelfUpgradeCost(level)
  if (cost === null) return { state, result: 'maxed', events: [] }
  if (state.coins < cost) return { state, result: 'insufficient', events: [] }

  const capacity = shelfCapacity(level + 1)
  const shelf = state.shelves[zone]
  const stock = Object.fromEntries(
    Object.entries(shelf.stock).map(([product, amount]) => [product, Math.min(amount, capacity)]),
  ) as Record<ProductKind, number>

  return {
    state: {
      ...state,
      coins: state.coins - cost,
      shelfLevels: { ...state.shelfLevels, [zone]: level + 1 },
      shelves: {
        ...state.shelves,
        [zone]: { ...shelf, capacity, stock },
      },
    },
    result: 'ok',
    events: [{ type: 'shelfUpgraded', zone, level: level + 1 }],
  }
}

export function purchaseStaff(
  state: ShopState,
  kind: StaffKind,
  allowDeposit: boolean,
): PurchaseOutcome {
  if (kind === 'chef' && !state.zones.kitchen) {
    return { state, result: 'lockedZone', events: [] }
  }
  const level = state.staff[kind]
  const cost = staffCost(kind, level)
  if (cost === null) return { state, result: 'maxed', events: [] }

  const key = staffDepositKey(kind)
  const deposit = state.deposits[key] ?? 0
  const remaining = Math.max(0, cost - deposit)

  if (state.coins >= remaining) {
    const staff = { ...state.staff, [kind]: level + 1 }
    const deposits = { ...state.deposits }
    delete deposits[key]
    return {
      state: { ...state, coins: state.coins - remaining, staff, deposits },
      result: 'ok',
      events: [{ type: 'staffBought', kind, level: level + 1 }],
    }
  }

  if (!allowDeposit || state.producers.length === 0 || state.coins <= 0) {
    return { state, result: 'insufficient', events: [] }
  }

  const amount = state.coins
  const deposits = { ...state.deposits, [key]: deposit + amount }
  return {
    state: { ...state, coins: 0, deposits },
    result: 'deposited',
    events: [
      {
        type: 'deposit',
        target: 'staff',
        kind,
        amount,
        remaining: Math.max(0, cost - deposits[key]),
      },
    ],
  }
}

export function removeProducer(state: ShopState, id: number): PurchaseOutcome {
  const producer = state.producers.find((candidate) => candidate.id === id)
  if (producer === undefined) return { state, result: 'missing', events: [] }
  const refund = Math.floor(producerCost(producer.product) * 0.5)
  const cheapest = Math.min(...FRUIT_ORDER.map((kind) => PLANTS[kind].cost))
  if (state.producers.length === 1 && state.coins + refund < cheapest) {
    return { state, result: 'lastProducer', events: [] }
  }
  const next = {
    ...removeProducerFromState(state, id),
    coins: state.coins + refund,
  }
  return {
    state: next,
    result: 'ok',
    events: [{ type: 'producerRemoved', product: producer.product, slot: producer.slot }],
  }
}

export function nextUpgradeKind(state: ShopState): UpgradeKind | null {
  const kind = UPGRADE_ORDER.find((candidate) => state.upgrades[candidate] < upgradeMax(candidate))
  return kind ?? null
}

export type { ProducerState }
