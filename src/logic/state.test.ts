import { createRng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import { INTERACT, PLOTS, REGISTER_POINT, SHELF_ACCESS } from './config'
import { purchasePlant, purchaseUpgrade } from './purchase'
import { initialSave } from './saveData'
import { createShopState, inRegisterZone, stepShop, toSave } from './state'
import type { GameEvent, SaveData, ShopState, Vec2 } from './types'

function withPlayer(state: ShopState, pos: Vec2): ShopState {
  return { ...state, player: { ...state.player, pos, prevPos: pos } }
}

function simulate(
  state: ShopState,
  ticks: number,
  options: {
    rng?: ReturnType<typeof createRng>
    input?: { moveX: number; moveY: number }
    dt?: number
  } = {},
): { state: ShopState; events: GameEvent[] } {
  const rng = options.rng ?? createRng(7)
  const input = options.input ?? { moveX: 0, moveY: 0 }
  const dt = options.dt ?? 50
  let current = state
  const events: GameEvent[] = []
  for (let tick = 0; tick < ticks; tick += 1) {
    const result = stepShop(current, input, rng, dt)
    current = result.state
    events.push(...result.events)
  }
  return { state: current, events }
}

function appleSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    ...initialSave(),
    producers: [{ product: 'apple', slot: 0 }],
    ...overrides,
  }
}

describe('shop simulation', () => {
  it('grows a newly bought plant and unlocks the harvest tutorial', () => {
    let state = createShopState(initialSave())
    state = purchasePlant(state, 'apple').state
    expect(state.producers[0]?.mature).toBe(false)
    const result = simulate(state, 200)
    expect(result.state.producers[0]?.mature).toBe(true)
    expect(result.state.tutorial).toBe('harvest')
  })

  it('harvests, stocks and serves the first customer end to end', () => {
    let state = createShopState(appleSave({ coins: 0 }))
    expect(state.tutorial).toBe('harvest')
    expect(state.producers[0]?.ready).toBe(1)

    state = withPlayer(state, state.producers[0]?.pos ?? PLOTS[0] ?? { x: 115, y: 255 })
    let result = simulate(state, 1)
    state = result.state
    expect(state.player.carry).toBe('apple')
    expect(state.player.carryCount).toBe(1)
    expect(state.tutorial).toBe('stock')

    state = withPlayer(state, SHELF_ACCESS.fruit)
    result = simulate(state, 2)
    state = result.state
    expect(state.shelves.fruit.stock.apple).toBe(1)
    expect(state.shelves.fruit.everStocked.apple).toBe(true)
    expect(state.tutorial).toBe('checkout')

    result = simulate(state, 900)
    state = result.state
    expect(state.queue.length).toBeGreaterThan(0)

    state = withPlayer(state, { x: REGISTER_POINT.x, y: REGISTER_POINT.y + 48 })
    expect(inRegisterZone(state.player.pos)).toBe(true)
    result = simulate(state, 120)
    state = result.state
    expect(state.served).toBe(1)
    expect(state.coins).toBe(4)
    expect(state.zones.veg).toBe(true)
    expect(state.tutorial).toBe('done')
    expect(result.events.some((event) => event.type === 'sale')).toBe(true)
  })

  it('does not spawn customers before the first shelf is stocked', () => {
    const state = createShopState(appleSave({ coins: 0 }))
    const result = simulate(state, 600)
    expect(result.state.customers).toHaveLength(0)
    expect(result.state.tutorial).toBe('harvest')
  })

  it('lets an empty shelf lose the sale without ending anything', () => {
    const state = createShopState(appleSave({ coins: 50, served: 3 }))
    expect(state.shelves.fruit.everStocked.apple).toBe(true)
    const result = simulate(state, 900)
    expect(result.state.coins).toBe(50)
    expect(result.state.served).toBe(3)
    expect(result.events.some((event) => event.type === 'sale')).toBe(false)
  })

  it('moves at any angle without snapping to an axis', () => {
    const state = withPlayer(createShopState(initialSave()), { x: 320, y: 560 })
    const result = simulate(state, 1, { input: { moveX: 0.7, moveY: 0.7 } })
    const dx = result.state.player.pos.x - 320
    const dy = result.state.player.pos.y - 560
    expect(dx).toBeGreaterThan(0)
    expect(dy).toBeGreaterThan(0)
    expect(Math.abs(dx - dy)).toBeLessThan(0.01)
  })

  it('does not let diagonal input move faster than straight input', () => {
    const straight = simulate(withPlayer(createShopState(initialSave()), { x: 320, y: 560 }), 1, {
      input: { moveX: 1, moveY: 0 },
    })
    const diagonal = simulate(withPlayer(createShopState(initialSave()), { x: 320, y: 560 }), 1, {
      input: { moveX: 1, moveY: 1 },
    })
    const straightDistance = Math.hypot(
      straight.state.player.pos.x - 320,
      straight.state.player.pos.y - 560,
    )
    const diagonalDistance = Math.hypot(
      diagonal.state.player.pos.x - 320,
      diagonal.state.player.pos.y - 560,
    )
    expect(Math.abs(straightDistance - diagonalDistance)).toBeLessThan(0.01)
  })

  it('stops harvesting at carry capacity and respects fertilizer speed', () => {
    let state = createShopState(appleSave({ coins: 1_000, served: 3 }))
    state = purchaseUpgrade(state, 'fertilizer').state
    state = withPlayer(state, state.producers[0]?.pos ?? PLOTS[0] ?? { x: 115, y: 255 })
    state = simulate(state, 1).state
    expect(state.player.carryCount).toBe(1)
    expect(INTERACT.harvestMs).toBeGreaterThan(0)
  })

  it('is deterministic for a seed and input sequence', () => {
    const start = createShopState(appleSave({ coins: 50, served: 3 }))
    const a = simulate(start, 400, { rng: createRng(1234) })
    const b = simulate(start, 400, { rng: createRng(1234) })
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state))
  })

  it('persists producers, coins and upgrades through a save projection', () => {
    let state = createShopState(appleSave({ coins: 500, served: 2 }))
    state = purchaseUpgrade(state, 'carry').state
    const reloaded = createShopState(toSave(state))
    expect(reloaded.coins).toBe(state.coins)
    expect(reloaded.upgrades.carry).toBe(1)
    expect(reloaded.producers).toHaveLength(1)
    expect(reloaded.producers[0]?.mature).toBe(true)
    expect(reloaded.producers[0]?.ready).toBe(1)
    expect(reloaded.tutorial).toBe('done')
  })
})
