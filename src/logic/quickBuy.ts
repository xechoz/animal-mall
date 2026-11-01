import { distance, distanceToRect } from './collision'
import {
  isPlantKind,
  PEN_SIZE,
  PLANT_ORDER,
  PLOT_SIZE,
  producerCost,
  producerSlotCount,
  QUICK_BUY,
  STAFF_ORDER,
  STATION_SIZE,
  ZONE_ORDER,
  ZONE_PRODUCTS,
  ZONES,
  zoneOf,
} from './config'
import {
  plantDepositKey,
  producerAtSlot,
  purchasePlantAt,
  purchaseStaff,
  purchaseZone,
  slotPlantDeposit,
  staffCost,
  staffDepositKey,
} from './purchase'
import type {
  GameEvent,
  PlantKind,
  ProductKind,
  Rect,
  ShopState,
  StaffKind,
  StepResult,
  Vec2,
  ZoneId,
} from './types'

export interface PlantOffer {
  readonly type: 'plant'
  readonly id: string
  readonly key: string
  readonly zone: 'fruit' | 'veg'
  readonly slot: number
  readonly product: PlantKind
  readonly cost: number
  readonly deposit: number
  readonly remaining: number
  readonly pos: Vec2
  /** Area trigger. Standing anywhere near the bed counts, not its centre. */
  readonly rect: Rect
  readonly requiresChoice: boolean
}

export interface StaffOffer {
  readonly type: 'staff'
  readonly id: string
  readonly key: string
  readonly kind: StaffKind
  readonly level: number
  readonly cost: number
  readonly deposit: number
  readonly remaining: number
  readonly pos: Vec2
}

export interface ZoneOffer {
  readonly type: 'zone'
  readonly id: string
  readonly key: string
  readonly zone: ZoneId
  readonly cost: number
  readonly deposit: number
  readonly remaining: number
  readonly pos: Vec2
}

export interface SwapOffer {
  readonly type: 'swap'
  readonly id: string
  readonly key: string
  readonly zone: 'fruit' | 'veg'
  readonly slot: number
  readonly product: PlantKind
  readonly pos: Vec2
  readonly rect: Rect
}

/** An empty pen/station. Standing there opens the animal or machine chooser. */
export interface ProducerSlotOffer {
  readonly type: 'producerSlot'
  readonly id: string
  readonly key: string
  readonly zone: 'farm' | 'kitchen'
  readonly slot: number
  /** Cheapest option that is not installed yet, used for the price chip. */
  readonly product: ProductKind
  readonly cost: number
  readonly deposit: 0
  readonly remaining: number
  readonly pos: Vec2
  readonly rect: Rect
}

/** An occupied pen/station. Only its pitchfork/wrench tag opens the chooser. */
export interface ProducerSwapOffer {
  readonly type: 'producerSwap'
  readonly id: string
  readonly key: string
  readonly zone: 'farm' | 'kitchen'
  readonly slot: number
  readonly product: ProductKind
  readonly cost: number
  readonly deposit: 0
  readonly remaining: 0
  readonly pos: Vec2
  readonly rect: Rect
}

export type PurchaseOffer =
  | PlantOffer
  | StaffOffer
  | ZoneOffer
  | SwapOffer
  | ProducerSlotOffer
  | ProducerSwapOffer

const cheapestPlant: Readonly<Record<'fruit' | 'veg', number>> = {
  fruit: Math.min(
    ...PLANT_ORDER.filter((product) => zoneOf(product) === 'fruit').map((product) =>
      producerCost(product),
    ),
  ),
  veg: Math.min(
    ...PLANT_ORDER.filter((product) => zoneOf(product) === 'veg').map((product) =>
      producerCost(product),
    ),
  ),
}

export function plantOfferForSlot(
  state: ShopState,
  zone: 'fruit' | 'veg',
  slot: number,
): PlantOffer | null {
  if (!state.zones[zone]) return null
  const point = state.map.plantSlots[zone][slot]
  if (point === undefined) return null
  if (
    state.producers.some(
      (producer) =>
        isPlantKind(producer.product) &&
        zoneOf(producer.product) === zone &&
        producer.slot === slot,
    )
  ) {
    return null
  }

  const active = slotPlantDeposit(state, zone, slot)
  if (active !== null) {
    const cost = producerCost(active.kind) as number
    return {
      type: 'plant',
      id: `plant-${zone}-${slot}`,
      key: plantDepositKey(active.kind, slot),
      zone,
      slot,
      product: active.kind,
      cost,
      deposit: active.amount,
      remaining: Math.max(0, cost - active.amount),
      pos: { x: point.x, y: point.y },
      rect: plotRect(point),
      requiresChoice: false,
    }
  }

  const product = (PLANT_ORDER.find((candidate) => zoneOf(candidate) === zone) ??
    'apple') as PlantKind
  const cost = cheapestPlant[zone]
  return {
    type: 'plant',
    id: `plant-${zone}-${slot}`,
    key: `plant:${zone}:choice`,
    zone,
    slot,
    product,
    cost,
    deposit: 0,
    remaining: cost,
    pos: { x: point.x, y: point.y },
    rect: plotRect(point),
    requiresChoice: true,
  }
}

function plotRect(point: Vec2): Rect {
  return {
    x: point.x - PLOT_SIZE.w / 2,
    y: point.y - PLOT_SIZE.h / 2,
    w: PLOT_SIZE.w,
    h: PLOT_SIZE.h,
  }
}

export function swapOfferForSlot(
  state: ShopState,
  zone: 'fruit' | 'veg',
  slot: number,
): SwapOffer | null {
  if (!state.zones[zone]) return null
  const point = state.map.plantSlots[zone][slot]
  if (point === undefined) return null
  const producer = state.producers.find(
    (candidate) =>
      isPlantKind(candidate.product) &&
      zoneOf(candidate.product) === zone &&
      candidate.slot === slot,
  )
  if (producer === undefined || !isPlantKind(producer.product)) return null
  // The tag is shown on every planted bed. Opening it is explicit (tap or long
  // press), never a dwell, so it no longer has to wait for an empty bed before
  // it can advertise the swap; the automatic harvest keeps running regardless.
  return {
    type: 'swap',
    id: `swap-${zone}-${slot}`,
    key: `swap:${zone}:${slot}`,
    zone,
    slot,
    product: producer.product,
    pos: { x: point.x, y: point.y },
    rect: plotRect(point),
  }
}

export function producerSlotOffer(
  state: ShopState,
  zone: 'farm' | 'kitchen',
  slot: number,
): ProducerSlotOffer | null {
  if (!state.zones[zone]) return null
  const layout = slotLayout(state, zone, slot)
  if (layout === null) return null
  if (producerAtSlot(state, zone, slot) !== undefined) return null

  const installed = new Set(state.producers.map((producer) => producer.product))
  const available = ZONE_PRODUCTS[zone].filter((product) => !installed.has(product))
  const product = [...available].sort((a, b) => producerCost(a) - producerCost(b))[0]
  if (product === undefined) return null
  const cost = producerCost(product)
  return {
    type: 'producerSlot',
    id: `slot-${zone}-${slot}`,
    key: `slot:${zone}:${slot}`,
    zone,
    slot,
    product,
    cost,
    deposit: 0,
    remaining: cost,
    pos: layout.point,
    rect: layout.rect,
  }
}

export function producerSwapOffer(
  state: ShopState,
  zone: 'farm' | 'kitchen',
  slot: number,
): ProducerSwapOffer | null {
  if (!state.zones[zone]) return null
  const layout = slotLayout(state, zone, slot)
  if (layout === null) return null
  const producer = producerAtSlot(state, zone, slot)
  if (producer === undefined) return null
  return {
    type: 'producerSwap',
    id: `swap-${zone}-${slot}`,
    key: `swap:${zone}:${slot}`,
    zone,
    slot,
    product: producer.product,
    cost: producerCost(producer.product),
    deposit: 0,
    remaining: 0,
    pos: layout.point,
    rect: layout.rect,
  }
}

function slotLayout(
  state: ShopState,
  zone: 'farm' | 'kitchen',
  slot: number,
): { point: Vec2; rect: Rect } | null {
  const point = zone === 'farm' ? state.map.animalPens[slot] : state.map.stationSlots[slot]
  const size = zone === 'farm' ? PEN_SIZE : STATION_SIZE
  if (point === undefined) return null
  return {
    point: { x: point.x, y: point.y },
    rect: {
      x: point.x - size.w / 2,
      y: point.y - size.h / 2,
      w: size.w,
      h: size.h,
    },
  }
}

export function staffOfferFor(state: ShopState, kind: StaffKind): StaffOffer | null {
  // A chef has nothing to do until the kitchen floor exists.
  if (kind === 'chef' && !state.zones.kitchen) return null
  const level = state.staff[kind]
  const cost = staffCost(kind, level)
  if (cost === null) return null
  const deposit = state.deposits[staffDepositKey(kind)] ?? 0
  const station = state.map.staffStations[kind].station
  return {
    type: 'staff',
    id: `staff-${kind}`,
    key: staffDepositKey(kind),
    kind,
    level,
    cost,
    deposit,
    remaining: Math.max(0, cost - deposit),
    pos: { x: station.x, y: station.y },
  }
}

/**
 * Zone unlocks are area based: standing anywhere in the zone footprint (or a
 * short way outside it) counts, never a single access point. The visible zone
 * tint, the locked overlay and this offer all read `map.zoneAreas`, so the
 * trigger area cannot drift away from what the player sees.
 */
export function zoneOfferFor(state: ShopState, zone: ZoneId): ZoneOffer | null {
  if (state.zones[zone]) return null
  const cost = ZONES[zone].unlockCost
  if (cost <= 0 || state.coins < cost) return null
  return {
    type: 'zone',
    id: `zone-${zone}`,
    key: `zone:${zone}`,
    zone,
    cost,
    deposit: 0,
    remaining: cost,
    pos: state.map.shelfAccess[zone],
  }
}

export function mapOffers(state: ShopState): readonly PurchaseOffer[] {
  const offers: PurchaseOffer[] = []
  for (const zone of ZONE_ORDER) {
    if (zone !== 'fruit' && zone !== 'veg') continue
    for (const plot of state.map.plantSlots[zone]) {
      const offer = plantOfferForSlot(state, zone, plot.index)
      if (offer !== null) {
        offers.push(offer)
        continue
      }
      const swap = swapOfferForSlot(state, zone, plot.index)
      if (swap !== null) offers.push(swap)
    }
  }
  for (const zone of ZONE_ORDER) {
    if (zone !== 'farm' && zone !== 'kitchen') continue
    if (!state.zones[zone]) {
      const unlock = zoneOfferFor(state, zone)
      if (unlock !== null) offers.push(unlock)
      continue
    }
    for (let slot = 0; slot < producerSlotCount(zone); slot += 1) {
      const swap = producerSwapOffer(state, zone, slot)
      if (swap !== null) {
        offers.push(swap)
        continue
      }
      const offer = producerSlotOffer(state, zone, slot)
      if (offer !== null) offers.push(offer)
    }
  }
  for (const kind of STAFF_ORDER) {
    const offer = staffOfferFor(state, kind)
    if (offer !== null) offers.push(offer)
  }
  return offers
}

export function nearestOffer(state: ShopState, pos: Vec2): PurchaseOffer | null {
  let best: PurchaseOffer | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const offer of mapOffers(state)) {
    const gap =
      offer.type === 'zone'
        ? distanceToRect(pos, state.map.zoneAreas[offer.zone])
        : offer.type === 'plant' ||
            offer.type === 'swap' ||
            offer.type === 'producerSlot' ||
            offer.type === 'producerSwap'
          ? distanceToRect(pos, offer.rect)
          : distance(pos, offer.pos)
    const radius =
      offer.type === 'staff'
        ? QUICK_BUY.stationRadius
        : offer.type === 'zone'
          ? QUICK_BUY.zoneMargin
          : offer.type === 'plant' || offer.type === 'swap'
            ? QUICK_BUY.plotMargin
            : offer.type === 'producerSlot' || offer.type === 'producerSwap'
              ? QUICK_BUY.slotMargin
              : QUICK_BUY.radius
    if (gap <= radius && gap < bestDistance) {
      best = offer
      bestDistance = gap
    }
  }

  return best
}

export function quickBuyThreshold(offer: PurchaseOffer): number {
  if (offer.type === 'zone') return QUICK_BUY.zoneMs
  // Swapping never arms from proximity: a long press or the slot tag owns it,
  // so there is no dwell to complete. See `stepQuickBuy`.
  if (offer.type === 'swap' || offer.type === 'producerSwap') return Number.POSITIVE_INFINITY
  if (offer.type === 'producerSlot') return QUICK_BUY.openMs
  return offer.type === 'plant' && offer.requiresChoice ? QUICK_BUY.openMs : QUICK_BUY.buyMs
}

export function stepQuickBuy(state: ShopState, dtMs: number, moving: boolean): StepResult {
  const offer = nearestOffer(state, state.player.pos)
  const current = state.quickBuy
  const events: GameEvent[] = []

  if (offer === null || offer.id !== current.targetKey) {
    return {
      state: {
        ...state,
        quickBuy: {
          targetKey: offer?.id ?? null,
          dwellMs: 0,
          armed: true,
        },
      },
      events,
    }
  }

  if (!current.armed) {
    return { state, events }
  }

  // Replacing a crop or a producer is destructive and paid, so proximity only
  // advertises it: the chooser opens from a long press or a tap on the slot
  // tag, never from standing still. Keeping the swap as the active offer also
  // stops an empty neighbour from starting a purchase while the player stands
  // at an occupied one.
  if (offer.type === 'swap' || offer.type === 'producerSwap') {
    return {
      state: { ...state, quickBuy: { ...current, dwellMs: 0, armed: false } },
      events,
    }
  }

  if (moving) {
    return {
      state: { ...state, quickBuy: { ...current, dwellMs: 0 } },
      events,
    }
  }

  const dwellMs = current.dwellMs + dtMs
  const threshold = quickBuyThreshold(offer)
  if (dwellMs < threshold) {
    return {
      state: { ...state, quickBuy: { ...current, dwellMs } },
      events,
    }
  }

  if (offer.type === 'plant' && offer.requiresChoice) {
    return {
      state: {
        ...state,
        quickBuy: { ...current, dwellMs: 0, armed: false },
      },
      events: [{ type: 'plantPickerReady', zone: offer.zone, slot: offer.slot }],
    }
  }

  if (offer.type === 'producerSlot') {
    return {
      state: {
        ...state,
        quickBuy: { ...current, dwellMs: 0, armed: false },
      },
      events: [{ type: 'producerPickerReady', zone: offer.zone, slot: offer.slot }],
    }
  }

  const outcome =
    offer.type === 'plant'
      ? purchasePlantAt(state, offer.product, offer.slot, true)
      : offer.type === 'zone'
        ? purchaseZone(state, offer.zone)
        : purchaseStaff(state, offer.kind, true)

  return {
    state: {
      ...outcome.state,
      quickBuy: {
        targetKey: offer.id,
        dwellMs: 0,
        armed: false,
      },
    },
    events: [...events, ...outcome.events],
  }
}
