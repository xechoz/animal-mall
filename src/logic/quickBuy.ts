import { distance } from './collision'
import {
  isPlantKind,
  PLANT_ORDER,
  producerCost,
  producerPosition,
  QUICK_BUY,
  STAFF_ORDER,
  ZONE_ORDER,
  ZONE_PRODUCTS,
  ZONES,
  zoneOf,
} from './config'
import {
  activePlantDeposit,
  plantDepositKey,
  purchasePlantAt,
  purchaseProducer,
  purchaseStaff,
  purchaseZone,
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
  readonly requiresChoice: boolean
}

export interface ProducerOffer {
  readonly type: 'producer'
  readonly id: string
  readonly key: string
  readonly product: ProductKind
  readonly cost: number
  readonly deposit: number
  readonly remaining: number
  readonly pos: Vec2
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

export type PurchaseOffer = PlantOffer | ProducerOffer | StaffOffer | ZoneOffer

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

  const active = activePlantDeposit(state)
  if (active !== null && zoneOf(active.kind) !== zone) return null
  if (active !== null) {
    const cost = producerCost(active.kind) as number
    return {
      type: 'plant',
      id: `plant-${zone}-${slot}`,
      key: plantDepositKey(active.kind),
      zone,
      slot,
      product: active.kind,
      cost,
      deposit: active.amount,
      remaining: Math.max(0, cost - active.amount),
      pos: { x: point.x, y: point.y },
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
    requiresChoice: true,
  }
}

export function producerOfferFor(state: ShopState, product: ProductKind): ProducerOffer | null {
  const zone = zoneOf(product)
  if (!state.zones[zone]) return null
  if (isPlantKind(product)) return null
  if (state.producers.some((producer) => producer.product === product)) return null
  const cost = producerCost(product)
  if (cost <= 0 || state.coins < cost) return null
  return {
    type: 'producer',
    id: `producer-${product}`,
    key: `producer:${product}`,
    product,
    cost,
    deposit: 0,
    remaining: cost,
    pos: producerPosition(state.map, product, 0),
  }
}

export function staffOfferFor(state: ShopState, kind: StaffKind): StaffOffer | null {
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
      if (offer !== null) offers.push(offer)
    }
  }
  for (const zone of ZONE_ORDER) {
    if (zone === 'fruit' || zone === 'veg') continue
    for (const product of ZONE_PRODUCTS[zone]) {
      const offer = producerOfferFor(state, product)
      if (offer !== null) offers.push(offer)
    }
    const unlock = zoneOfferFor(state, zone)
    if (unlock !== null) offers.push(unlock)
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
        : distance(pos, offer.pos)
    const radius =
      offer.type === 'staff'
        ? QUICK_BUY.stationRadius
        : offer.type === 'zone'
          ? QUICK_BUY.zoneMargin
          : QUICK_BUY.radius
    if (gap <= radius && gap < bestDistance) {
      best = offer
      bestDistance = gap
    }
  }

  return best
}

/** Zero inside the rectangle; otherwise the distance to its nearest edge. */
function distanceToRect(pos: Vec2, rect: Rect): number {
  const dx = Math.max(rect.x - pos.x, 0, pos.x - (rect.x + rect.w))
  const dy = Math.max(rect.y - pos.y, 0, pos.y - (rect.y + rect.h))
  return Math.hypot(dx, dy)
}

export function quickBuyThreshold(offer: PurchaseOffer): number {
  if (offer.type === 'zone') return QUICK_BUY.zoneMs
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

  const outcome =
    offer.type === 'plant'
      ? purchasePlantAt(state, offer.product, offer.slot, true)
      : offer.type === 'producer'
        ? purchaseProducer(state, offer.product)
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
