import { carriedKinds, carryOf, EMPTY_CARRY } from './carry'
import { distance } from './collision'
import { DRINK_RADIUS, DRINKS, drinkPrice, FACILITY_DWELL_MS, REST, TRASH_RADIUS } from './config'
import type {
  DrinkKind,
  FacilityState,
  GameEvent,
  PlayerState,
  ShopMap,
  ShopState,
  StaffState,
} from './types'

export type DrinkPurchaseResult = 'ok' | 'insufficient'

export interface DrinkOutcome {
  readonly state: ShopState
  readonly result: DrinkPurchaseResult
  readonly events: readonly GameEvent[]
}

export interface FacilityDwellResult {
  readonly player: PlayerState
  readonly facility: FacilityState
  readonly events: readonly GameEvent[]
}

/**
 * Accumulates the automatic facility timers. The trash empties the player's
 * whole hand after half a second; the vending machine opens its menu once per
 * approach, and only re-arms after the player walks away.
 */
export function stepFacilityDwell(
  player: PlayerState,
  facility: FacilityState,
  dtMs: number,
  map: ShopMap,
): FacilityDwellResult {
  const events: GameEvent[] = []
  let nextPlayer = player
  let trashDwellMs = facility.trashDwellMs
  let drinkDwellMs = facility.drinkDwellMs
  let drinkArmed = facility.drinkArmed

  const carried = carriedKinds(player.carry)
  if (carried.length > 0) {
    if (distance(player.pos, map.facilities.trashPoint) <= TRASH_RADIUS) {
      trashDwellMs += dtMs
      if (trashDwellMs >= FACILITY_DWELL_MS) {
        for (const product of carried) {
          events.push({
            type: 'discard',
            product,
            amount: carryOf(player.carry, product),
          })
        }
        nextPlayer = { ...player, carry: EMPTY_CARRY }
        trashDwellMs = 0
      }
    } else {
      trashDwellMs = 0
    }
  } else {
    trashDwellMs = 0
  }

  const nearVending = distance(player.pos, map.facilities.vendingUse) <= DRINK_RADIUS
  if (!nearVending) {
    drinkArmed = true
    drinkDwellMs = 0
  } else if (drinkArmed) {
    drinkDwellMs += dtMs
    if (drinkDwellMs >= FACILITY_DWELL_MS) {
      events.push({ type: 'drinkMenuReady' })
      drinkArmed = false
      drinkDwellMs = 0
    }
  } else {
    drinkDwellMs = 0
  }

  return {
    player: nextPlayer,
    facility: {
      ...facility,
      trashDwellMs,
      drinkDwellMs,
      drinkArmed,
    },
    events,
  }
}

export function purchaseDrink(state: ShopState, drink: DrinkKind): DrinkOutcome {
  const price = drinkPrice(drink)
  const config = DRINKS[drink]
  if (state.coins < price) {
    return { state, result: 'insufficient', events: [] }
  }

  const buffs = {
    ...state.buffs,
    [drink]: Math.max(state.buffs[drink], config.durationMs),
  }
  return {
    state: {
      ...state,
      coins: state.coins - price,
      buffs,
    },
    result: 'ok',
    events: [{ type: 'drinkBought', drink, price }],
  }
}

export function nearestRestingStaff(state: ShopState): StaffState | null {
  let best: StaffState | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const member of state.staffMembers) {
    if (member.phase !== 'resting') continue
    const range = distance(state.player.pos, member.pos)
    if (range <= REST.urgeRadius && range < bestDistance) {
      best = member
      bestDistance = range
    }
  }
  return best
}
