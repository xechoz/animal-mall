import { addCarry, carryTotal } from './carry'
import { distance } from './collision'
import { FISHING } from './config'
import type { FishingState, GameEvent, ShopState, StepResult } from './types'

const IDLE: FishingState = { pondId: null, phase: 'idle', timerMs: 0, armed: true }

/**
 * The pond is an active fishing spot, not an animal pen. Stand in front of it
 * without moving: the first half second casts the line, the second half second
 * catches one fish. Walking away, moving or a full basket cancels the attempt.
 */
export function stepFishing(
  state: ShopState,
  dtMs: number,
  moving: boolean,
  carryMax: number,
): StepResult {
  const pond = state.producers.find((producer) => producer.product === 'fish')
  if (pond === undefined) {
    return { state: { ...state, fishing: IDLE }, events: [] }
  }

  const access = state.map.animalAccess.fish
  const inRange = !moving && distance(state.player.pos, access) <= FISHING.radius
  if (!inRange) {
    return { state: { ...state, fishing: IDLE }, events: [] }
  }

  const current = state.fishing
  if (!current.armed && current.pondId === pond.id) {
    return { state, events: [] }
  }

  const events: GameEvent[] = []
  if (current.phase === 'idle') {
    const timerMs = current.timerMs + dtMs
    if (timerMs < FISHING.castMs) {
      return {
        state: {
          ...state,
          fishing: { pondId: pond.id, phase: 'idle', timerMs, armed: true },
        },
        events,
      }
    }
    events.push({ type: 'fishCast', pondId: pond.id })
    return {
      state: {
        ...state,
        fishing: { pondId: pond.id, phase: 'waiting', timerMs: 0, armed: true },
      },
      events,
    }
  }

  const timerMs = current.timerMs + dtMs
  if (timerMs < FISHING.catchMs) {
    return {
      state: {
        ...state,
        fishing: { pondId: pond.id, phase: 'waiting', timerMs, armed: true },
      },
      events,
    }
  }

  if (carryTotal(state.player.carry) >= carryMax) {
    events.push({ type: 'fishFull', pondId: pond.id })
    return {
      state: {
        ...state,
        fishing: { pondId: pond.id, phase: 'idle', timerMs: 0, armed: false },
      },
      events,
    }
  }

  events.push({ type: 'fishCaught', pondId: pond.id })
  return {
    state: {
      ...state,
      player: {
        ...state.player,
        carry: addCarry(state.player.carry, 'fish', 1),
      },
      fishing: { pondId: pond.id, phase: 'idle', timerMs: 0, armed: false },
    },
    events,
  }
}
