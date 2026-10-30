import { distance } from './collision'
import { FRUIT_ORDER, FRUITS, PLOTS, QUICK_BUY, STAFF, STAFF_ORDER } from './config'
import {
  activeTreeDeposit,
  purchaseStaff,
  purchaseTreeAt,
  staffCost,
  staffDepositKey,
  treeCost,
  treeDepositKey,
} from './purchase'
import type { FruitKind, GameEvent, ShopState, StaffKind, StepResult, Vec2 } from './types'

export interface TreeOffer {
  readonly type: 'tree'
  readonly id: string
  readonly key: string
  readonly plot: number
  readonly kind: FruitKind
  readonly cost: number
  readonly deposit: number
  readonly remaining: number
  readonly pos: Vec2
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

export type PurchaseOffer = TreeOffer | StaffOffer

const cheapestTree = Math.min(...FRUIT_ORDER.map((kind) => FRUITS[kind].cost))

export function treeOfferForPlot(state: ShopState, plot: number): TreeOffer | null {
  if (state.trees.some((tree) => tree.plot === plot)) return null
  const point = PLOTS[plot]
  if (point === undefined) return null

  const active = activeTreeDeposit(state)
  if (active !== null) {
    return {
      type: 'tree',
      id: `tree-${plot}`,
      key: treeDepositKey(active.kind),
      plot,
      kind: active.kind,
      cost: treeCost(active.kind),
      deposit: active.amount,
      remaining: Math.max(0, treeCost(active.kind) - active.amount),
      pos: { x: point.x, y: point.y },
      requiresChoice: false,
    }
  }

  return {
    type: 'tree',
    id: `tree-${plot}`,
    key: 'tree:choice',
    plot,
    kind: FRUIT_ORDER[0] as FruitKind,
    cost: cheapestTree,
    deposit: 0,
    remaining: cheapestTree,
    pos: { x: point.x, y: point.y },
    requiresChoice: true,
  }
}

export function staffOfferFor(state: ShopState, kind: StaffKind): StaffOffer | null {
  const level = state.staff[kind]
  const cost = staffCost(kind, level)
  if (cost === null) return null
  const deposit = state.deposits[staffDepositKey(kind)] ?? 0
  const station = STAFF[kind].station
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

export function mapOffers(state: ShopState): readonly PurchaseOffer[] {
  const offers: PurchaseOffer[] = []
  for (const plot of PLOTS) {
    const offer = treeOfferForPlot(state, plot.index)
    if (offer !== null) offers.push(offer)
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

  for (const plot of PLOTS) {
    const offer = treeOfferForPlot(state, plot.index)
    if (offer === null) continue
    const distanceToOffer = distance(pos, offer.pos)
    if (distanceToOffer <= QUICK_BUY.radius && distanceToOffer < bestDistance) {
      best = offer
      bestDistance = distanceToOffer
    }
  }

  for (const kind of STAFF_ORDER) {
    const offer = staffOfferFor(state, kind)
    if (offer === null) continue
    const distanceToOffer = distance(pos, offer.pos)
    if (distanceToOffer <= QUICK_BUY.stationRadius && distanceToOffer < bestDistance) {
      best = offer
      bestDistance = distanceToOffer
    }
  }

  return best
}

export function quickBuyThreshold(offer: PurchaseOffer): number {
  return offer.type === 'tree' && offer.requiresChoice ? QUICK_BUY.openMs : QUICK_BUY.buyMs
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

  if (offer.type === 'tree' && offer.requiresChoice) {
    return {
      state: {
        ...state,
        quickBuy: { ...current, dwellMs: 0, armed: false },
      },
      events: [{ type: 'quickBuyReady', plot: offer.plot }],
    }
  }

  const outcome =
    offer.type === 'tree'
      ? purchaseTreeAt(state, offer.kind, offer.plot, true)
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
