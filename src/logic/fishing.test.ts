import { createRng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import { PORTRAIT_MAP } from './config'
import { initialSave } from './saveData'
import { createShopState, stepShop } from './state'
import type { GameEvent, ShopState } from './types'

function pondState(): ShopState {
  return createShopState(
    {
      ...initialSave(),
      coins: 1_000,
      zones: { fruit: true, veg: true, farm: true, kitchen: true },
      producers: [{ product: 'fish', slot: 3 }],
    },
    PORTRAIT_MAP,
  )
}

function simulate(state: ShopState, ticks: number): { state: ShopState; events: GameEvent[] } {
  const rng = createRng(11)
  let current = state
  const events: GameEvent[] = []
  for (let tick = 0; tick < ticks; tick += 1) {
    const result = stepShop(current, { moveX: 0, moveY: 0 }, rng, 50)
    current = result.state
    events.push(...result.events)
  }
  return { state: current, events }
}

describe('pond fishing', () => {
  it('casts and catches one fish after two half-second steps', () => {
    const state = pondState()
    const access = state.map.animalAccess.fish
    const result = simulate(
      {
        ...state,
        player: { ...state.player, pos: access, prevPos: access },
      },
      22,
    )
    expect(result.state.player.carry.fish).toBe(1)
    expect(result.events.some((event) => event.type === 'fishCast')).toBe(true)
    expect(result.events.some((event) => event.type === 'fishCaught')).toBe(true)
  })

  it('does not fish while the player keeps moving', () => {
    const state = pondState()
    const access = state.map.animalAccess.fish
    let current: ShopState = {
      ...state,
      player: { ...state.player, pos: access, prevPos: access },
    }
    const rng = createRng(11)
    for (let tick = 0; tick < 22; tick += 1) {
      current = stepShop(current, { moveX: 0.2, moveY: 0 }, rng, 50).state
    }
    expect(current.player.carry.fish).toBeUndefined()
    expect(current.producers[0]?.hungry).toBe(false)
  })
})
