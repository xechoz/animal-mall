import { carryOf, carryTotal, takeCarry } from './carry'
import { distance } from './collision'
import { DINING, FOOD_BUFF, zoneOf } from './config'
import type {
  Carry,
  DiningSeat,
  DiningState,
  GameEvent,
  PlayerState,
  ProductKind,
  ShopMap,
  ShopState,
  StaffState,
  Vec2,
} from './types'

export interface DiningStepResult {
  readonly player: PlayerState
  readonly dining: DiningState
  readonly events: readonly GameEvent[]
}

export type SitResult = 'ok' | 'taken' | 'far' | 'none' | 'seated'

export interface SitOutcome {
  readonly state: ShopState
  readonly result: SitResult
}

export function initialDiningState(): DiningState {
  return { playerSeat: null, dwellMs: 0, targetSeat: null, armed: true }
}

export function seatOccupiedByStaff(
  staffMembers: readonly StaffState[],
  seatIndex: number,
): boolean {
  return staffMembers.some((member) => member.seatIndex === seatIndex)
}

export function freeDiningSeat(
  map: ShopMap,
  playerSeat: number | null,
  claimedSeats: ReadonlySet<number>,
  from: Vec2,
): DiningSeat | null {
  let best: DiningSeat | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const seat of map.dining.seats) {
    if (seat.index === playerSeat || claimedSeats.has(seat.index)) continue
    const gap = distance(from, seat.stand)
    if (gap >= bestDistance) continue
    best = seat
    bestDistance = gap
  }
  return best
}

/** Seats claimed by the player and by staff who are walking to or using them. */
export function claimedDiningSeats(
  playerSeat: number | null,
  staffMembers: readonly StaffState[],
): Set<number> {
  const claimed = new Set<number>()
  if (playerSeat !== null) claimed.add(playerSeat)
  for (const member of staffMembers) {
    if (member.seatIndex !== null) claimed.add(member.seatIndex)
  }
  return claimed
}

export function nearestFreeSeatForPlayer(
  map: ShopMap,
  player: PlayerState,
  dining: DiningState,
  staffMembers: readonly StaffState[],
  radius = DINING.sitRadius,
): DiningSeat | null {
  const claimed = claimedDiningSeats(dining.playerSeat, staffMembers)
  let best: DiningSeat | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const seat of map.dining.seats) {
    if (claimed.has(seat.index)) continue
    const gap = distance(player.pos, seat.stand)
    if (gap > radius || gap >= bestDistance) continue
    best = seat
    bestDistance = gap
  }
  return best
}

export function nearestFreeSeatInState(
  state: ShopState,
  radius = DINING.sitRadius,
): DiningSeat | null {
  return nearestFreeSeatForPlayer(state.map, state.player, state.dining, state.staffMembers, radius)
}

/**
 * Keeps a seated player glued to the chair, and accumulates the half-second
 * dwell that sits the player down automatically. The dwell only arms while the
 * player is carrying something, so standing near a table empty-handed never
 * opens the food panel by accident. `armed` stays false after standing until
 * the player walks away, so sitting does not immediately repeat.
 */
export function stepDining(
  player: PlayerState,
  dining: DiningState,
  staffMembers: readonly StaffState[],
  carry: Carry,
  dtMs: number,
  map: ShopMap,
  allowAutoSit = true,
): DiningStepResult {
  if (dining.playerSeat !== null) {
    const seat = map.dining.seats[dining.playerSeat]
    if (seat === undefined) {
      return {
        player,
        dining: { ...dining, playerSeat: null, dwellMs: 0, targetSeat: null, armed: false },
        events: [],
      }
    }
    return {
      player: {
        ...player,
        pos: seat.seat,
        prevPos: seat.seat,
        moving: false,
        facing: seat.facing,
      },
      dining,
      events: [],
    }
  }

  const nearAnySeat = map.dining.seats.some(
    (seat) => distance(player.pos, seat.stand) <= DINING.sitRadius,
  )
  if (!nearAnySeat) {
    return {
      player,
      dining: { ...dining, dwellMs: 0, targetSeat: null, armed: true },
      events: [],
    }
  }

  const target = nearestFreeSeatForPlayer(map, player, dining, staffMembers)

  const canAutoSit = allowAutoSit && dining.armed && !player.moving && carryTotal(carry) > 0
  if (target === null || !canAutoSit) {
    return {
      player,
      dining: {
        ...dining,
        dwellMs: 0,
        targetSeat: canAutoSit ? (target?.index ?? null) : null,
      },
      events: [],
    }
  }

  const dwellMs = dining.targetSeat === target.index ? dining.dwellMs + dtMs : dtMs
  if (dwellMs < DINING.dwellMs) {
    return {
      player,
      dining: { ...dining, dwellMs, targetSeat: target.index },
      events: [],
    }
  }

  const seat = map.dining.seats[target.index]
  if (seat === undefined) {
    return {
      player,
      dining: { ...dining, dwellMs: 0, targetSeat: null, armed: false },
      events: [],
    }
  }

  return {
    player: {
      ...player,
      pos: seat.seat,
      prevPos: seat.seat,
      moving: false,
      facing: seat.facing,
    },
    dining: { ...dining, playerSeat: target.index, dwellMs: 0, targetSeat: null, armed: false },
    events: [{ type: 'diningReady', seat: target.index }],
  }
}

export function sitAtSeat(state: ShopState, seatIndex: number): SitOutcome {
  if (state.dining.playerSeat !== null) return { state, result: 'seated' }
  const seat = state.map.dining.seats[seatIndex]
  if (seat === undefined) return { state, result: 'none' }
  if (seatOccupiedByStaff(state.staffMembers, seat.index)) return { state, result: 'taken' }
  if (distance(state.player.pos, seat.stand) > DINING.sitRadius) {
    return { state, result: 'far' }
  }

  return {
    result: 'ok',
    state: {
      ...state,
      player: {
        ...state.player,
        pos: seat.seat,
        prevPos: seat.seat,
        moving: false,
        facing: seat.facing,
      },
      dining: {
        ...state.dining,
        playerSeat: seat.index,
        dwellMs: 0,
        targetSeat: null,
        armed: false,
      },
    },
  }
}

export function standUp(state: ShopState): ShopState {
  const seatIndex = state.dining.playerSeat
  if (seatIndex === null) return state
  const seat = state.map.dining.seats[seatIndex]
  if (seat === undefined) {
    return { ...state, dining: { ...state.dining, playerSeat: null } }
  }
  return {
    ...state,
    player: {
      ...state.player,
      pos: seat.stand,
      prevPos: seat.stand,
      moving: false,
      facing: seat.facing,
    },
    dining: {
      ...state.dining,
      playerSeat: null,
      dwellMs: 0,
      targetSeat: null,
      // Stay disarmed until the player leaves the table again.
      armed: false,
    },
  }
}

/**
 * Eats one carried item, including cakes, sweaters and yarn. Every product is
 * edible; the zone decides which existing drink timer is extended.
 */
export function eatCarried(
  state: ShopState,
  product: ProductKind,
): { readonly state: ShopState; readonly events: readonly GameEvent[] } {
  if (state.dining.playerSeat === null) return { state, events: [] }
  if (carryOf(state.player.carry, product) <= 0) return { state, events: [] }

  const taken = takeCarry(state.player.carry, product, 1)
  if (taken.taken <= 0) return { state, events: [] }

  const bonus = FOOD_BUFF[zoneOf(product)]
  const buffs = { ...state.buffs }
  for (const entry of bonus) buffs[entry.drink] += entry.ms

  return {
    state: {
      ...state,
      player: { ...state.player, carry: taken.carry },
      buffs,
    },
    events: [
      {
        type: 'ate',
        product,
        buffs: bonus.map((entry) => entry.drink),
      },
    ],
  }
}
