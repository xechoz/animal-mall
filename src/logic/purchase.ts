import {
  ANIMAL_PENS,
  FRUIT_ORDER,
  isAnimalProductKind,
  isPlantKind,
  isProcessedKind,
  PLANT_ORDER,
  PLANT_SLOTS,
  PLANTS,
  producerCost,
  STAFF,
  STATION_SLOTS,
  shelfCapacity,
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

export function staffCost(kind: StaffKind, level: number): number | null {
  return STAFF[kind].costs[level] ?? null
}

export function staffMax(kind: StaffKind): number {
  return STAFF[kind].costs.length
}

export function plantDepositKey(kind: PlantKind): string {
  return `plant:${kind}`
}

export function staffDepositKey(kind: StaffKind): string {
  return `staff:${kind}`
}

export function activePlantDeposit(
  state: ShopState,
): { readonly kind: PlantKind; readonly amount: number } | null {
  for (const kind of PLANT_ORDER) {
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
  const point = PLANT_SLOTS[zone].find((plot) => !used.has(plot.index))
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
  const point = PLANT_SLOTS[zone][slot]
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

  const active = activePlantDeposit(state)
  if (active !== null && active.kind !== product) {
    return { state, result: 'locked', events: [] }
  }

  const cost = PLANTS[product].cost
  const deposit = active?.kind === product ? active.amount : 0
  const remaining = Math.max(0, cost - deposit)

  if (state.coins >= remaining) {
    const producer = createProducer(product, slot, state.nextProducerId, true)
    const key = plantDepositKey(product)
    const deposits = { ...state.deposits }
    delete deposits[key]
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
  const key = plantDepositKey(product)
  const deposits = {
    ...state.deposits,
    [key]: deposit + amount,
  }
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

export function purchaseProducer(state: ShopState, product: ProductKind): PurchaseOutcome {
  const zone = zoneOf(product)
  if (!state.zones[zone]) return { state, result: 'lockedZone', events: [] }
  if (isPlantKind(product)) return purchasePlant(state, product)
  if (isAnimalProductKind(product) || isProcessedKind(product)) {
    if (state.producers.some((producer) => producer.product === product)) {
      return { state, result: 'maxed', events: [] }
    }
    const cost = producerCost(product)
    if (state.coins < cost) return { state, result: 'insufficient', events: [] }
    const producer = createProducer(product, fixedSlot(product), state.nextProducerId, true)
    const next = addProducerToState({ ...state, coins: state.coins - cost }, producer)
    return {
      state: next,
      result: 'ok',
      events: [{ type: 'producerBought', product, slot: producer.slot }],
    }
  }
  return { state, result: 'missing', events: [] }
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
    const producer = createProducer(includes, fixedSlot(includes), next.nextProducerId, true)
    next = addProducerToState(next, producer)
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
  const capacity = shelfCapacity(upgrades.shelf)
  const shelves = { ...state.shelves }
  for (const zone of Object.keys(shelves) as ZoneId[]) {
    const stock = Object.fromEntries(
      Object.entries(shelves[zone].stock).map(([product, amount]) => [
        product,
        Math.min(amount, capacity),
      ]),
    ) as Record<ProductKind, number>
    shelves[zone] = {
      ...shelves[zone],
      capacity,
      stock,
    }
  }

  return {
    state: { ...state, coins: state.coins - cost, upgrades, shelves },
    result: 'ok',
    events: [{ type: 'upgradeBought', kind, level: level + 1 }],
  }
}

export function purchaseStaff(
  state: ShopState,
  kind: StaffKind,
  allowDeposit: boolean,
): PurchaseOutcome {
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

function fixedSlot(product: ProductKind): number {
  if (isPlantKind(product)) return 0
  if (isAnimalProductKind(product)) return ANIMAL_PENS[product].index
  if (isProcessedKind(product)) return STATION_SLOTS[product].index
  return 0
}

export type { ProducerState }
