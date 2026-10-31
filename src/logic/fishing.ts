import { addCarry, carryTotal } from './carry'
import { distanceToRect } from './collision'
import { FISHING, PEN_SIZE } from './config'
import type { FishingState, GameEvent, ProducerState, Rect, ShopState, StepResult } from './types'

const IDLE: FishingState = { pondId: null, phase: 'idle', timerMs: 0, armed: true }

/**
 * The pond is an active fishing spot, not an animal pen. Standing anywhere
 * around its footprint without moving casts the line; the first half second
 * casts and the second half second catches one fish. The cycle repeats while
 * the player keeps standing there, and only stops on movement, leaving range
 * or a full basket.
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

  const inRange = !moving && distanceToRect(state.player.pos, pondRect(pond)) <= FISHING.margin
  if (!inRange) {
    return { state: { ...state, fishing: IDLE }, events: [] }
  }

  const current = state.fishing
  const events: GameEvent[] = []

  // A full basket pauses the loop, but the pause re-arms itself as soon as
  // there is room again instead of requiring the player to walk away.
  if (carryTotal(state.player.carry) >= carryMax) {
    if (current.armed) events.push({ type: 'fishFull', pondId: pond.id })
    return {
      state: {
        ...state,
        fishing: { pondId: pond.id, phase: 'rest', timerMs: 0, armed: false },
      },
      events,
    }
  }

  // Keep timers only for the same pond while armed; a new pond or a basket
  // that just gained space starts a fresh cast.
  const fishing: FishingState =
    current.armed && current.pondId === pond.id
      ? current
      : { pondId: pond.id, phase: 'idle', timerMs: 0, armed: true }

  if (fishing.phase === 'rest') {
    const timerMs = fishing.timerMs - dtMs
    if (timerMs > 0) {
      return {
        state: { ...state, fishing: { ...fishing, timerMs } },
        events,
      }
    }
    return {
      state: {
        ...state,
        fishing: { pondId: pond.id, phase: 'idle', timerMs: 0, armed: true },
      },
      events,
    }
  }

  if (fishing.phase === 'idle') {
    const timerMs = fishing.timerMs + dtMs
    if (timerMs < FISHING.castMs) {
      return {
        state: { ...state, fishing: { ...fishing, timerMs } },
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

  const timerMs = fishing.timerMs + dtMs
  if (timerMs < FISHING.catchMs) {
    return {
      state: { ...state, fishing: { ...fishing, timerMs } },
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
      fishing: {
        pondId: pond.id,
        phase: 'rest',
        timerMs: FISHING.repeatMs,
        armed: true,
      },
    },
    events,
  }
}

export function pondRect(pond: ProducerState): Rect {
  return {
    x: pond.pos.x - PEN_SIZE.w / 2,
    y: pond.pos.y - PEN_SIZE.h / 2,
    w: PEN_SIZE.w,
    h: PEN_SIZE.h,
  }
}
