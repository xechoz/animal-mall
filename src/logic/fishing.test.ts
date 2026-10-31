import { createRng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import { PEN_SIZE, PORTRAIT_MAP } from './config'
import { initialSave } from './saveData'
import { createShopState, stepShop } from './state'
import type { GameEvent, ShopState } from './types'

function pondState(carry: Record<string, number> = {}): ShopState {
  const state = createShopState(
    {
      ...initialSave(),
      coins: 1_000,
      zones: { fruit: true, veg: true, farm: true, kitchen: true },
      producers: [{ product: 'fish', slot: 3 }],
    },
    PORTRAIT_MAP,
  )
  const pond = state.producers[0]?.pos as ShopState['player']['pos']
  return {
    ...state,
    player: {
      ...state.player,
      pos: pond,
      prevPos: pond,
      carry: { ...state.player.carry, ...carry },
    },
  }
}

function simulate(
  state: ShopState,
  ticks: number,
  input: { moveX: number; moveY: number } = { moveX: 0, moveY: 0 },
): { state: ShopState; events: GameEvent[] } {
  const rng = createRng(11)
  let current = state
  const events: GameEvent[] = []
  for (let tick = 0; tick < ticks; tick += 1) {
    const result = stepShop(current, input, rng, 50)
    current = result.state
    events.push(...result.events)
  }
  return { state: current, events }
}

function eatFish(result: { state: ShopState; events: GameEvent[] }): number {
  return result.state.player.carry.fish ?? 0
}

describe('pond fishing', () => {
  it('casts and catches one fish after two half-second steps', () => {
    const result = simulate(pondState(), 22)
    expect(eatFish(result)).toBe(1)
    expect(result.events.some((event) => event.type === 'fishCast')).toBe(true)
    expect(result.events.some((event) => event.type === 'fishCaught')).toBe(true)
  })

  it('keeps fishing automatically while the player stands still', () => {
    const result = simulate(pondState(), 60)
    expect(eatFish(result)).toBe(2)
    expect(result.events.filter((event) => event.type === 'fishCaught')).toHaveLength(2)
  })

  it('triggers from any side of the pond, not only its access point', () => {
    const state = pondState()
    const pond = state.producers[0]?.pos as ShopState['player']['pos']
    const above = { x: pond.x, y: pond.y - PEN_SIZE.h / 2 - 20 }
    const result = simulate(
      {
        ...state,
        player: { ...state.player, pos: above, prevPos: above },
      },
      22,
    )
    expect(eatFish(result)).toBe(1)
  })

  it('does not fish while the player keeps moving', () => {
    const result = simulate(pondState(), 60, { moveX: 0.2, moveY: 0 })
    expect(result.state.player.carry.fish).toBeUndefined()
    expect(result.state.producers[0]?.hungry).toBe(false)
  })

  it('pauses on a full basket and resumes once there is room', () => {
    const full = simulate(pondState({ apple: 6 }), 40)
    expect(full.state.player.carry.fish).toBeUndefined()
    expect(full.events.filter((event) => event.type === 'fishFull')).toHaveLength(1)

    const freed = simulate(
      {
        ...full.state,
        player: { ...full.state.player, carry: { ...full.state.player.carry, apple: 5 } },
      },
      30,
    )
    expect(eatFish({ state: freed.state, events: freed.events })).toBe(1)
  })
})
