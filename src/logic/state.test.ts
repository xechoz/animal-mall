import { createRng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import { INTERACT, PORTRAIT_MAP } from './config'
import { feedCount } from './production'
import { purchasePlant, purchaseUpgrade } from './purchase'
import { initialSave } from './saveData'
import {
  createShopState,
  inRegisterZone,
  removeProducerFromState,
  stepShop,
  stockReach,
  toSave,
} from './state'
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

function eggSave(): SaveData {
  return {
    ...initialSave(),
    zones: { fruit: true, veg: true, farm: true, kitchen: true },
    producers: [{ product: 'egg', slot: 0 }],
  }
}

describe('shop simulation', () => {
  it('grows a newly bought plant and unlocks the harvest tutorial', () => {
    let state = createShopState(initialSave(), PORTRAIT_MAP)
    state = purchasePlant(state, 'apple').state
    expect(state.producers[0]?.mature).toBe(false)
    const result = simulate(state, 200)
    expect(result.state.producers[0]?.mature).toBe(true)
    expect(result.state.tutorial).toBe('harvest')
  })

  it('harvests, stocks and serves the first customer end to end', () => {
    let state = createShopState(appleSave({ coins: 0 }), PORTRAIT_MAP)
    expect(state.tutorial).toBe('harvest')
    expect(state.producers[0]?.ready).toBe(1)

    state = withPlayer(
      state,
      state.producers[0]?.pos ?? PORTRAIT_MAP.plots[0] ?? { x: 115, y: 255 },
    )
    let result = simulate(state, 1)
    state = result.state
    expect(state.player.carry).toEqual({ apple: 1 })
    expect(state.tutorial).toBe('stock')

    state = withPlayer(state, PORTRAIT_MAP.shelfAccess.fruit)
    result = simulate(state, 2)
    state = result.state
    expect(state.shelves.fruit.stock.apple).toBe(1)
    expect(state.shelves.fruit.everStocked.apple).toBe(true)
    expect(state.tutorial).toBe('checkout')

    result = simulate(state, 900)
    state = result.state
    expect(state.queue.length).toBeGreaterThan(0)

    state = withPlayer(state, { x: PORTRAIT_MAP.register.x, y: PORTRAIT_MAP.register.y + 48 })
    expect(inRegisterZone(state.player.pos, PORTRAIT_MAP)).toBe(true)
    result = simulate(state, 120)
    state = result.state
    expect(state.served).toBe(1)
    // The cashier hire sign sits beside the counter now, so checking out no
    // longer sweeps the earnings into the cashier deposit.
    expect(state.deposits['staff:cashier']).toBeUndefined()
    expect(state.coins).toBe(6)
    expect(state.zones.veg).toBe(true)
    expect(state.tutorial).toBe('done')
    expect(result.events.some((event) => event.type === 'sale')).toBe(true)
  })

  it('does not spawn customers before the first shelf is stocked', () => {
    const state = createShopState(appleSave({ coins: 0 }), PORTRAIT_MAP)
    const result = simulate(state, 600)
    expect(result.state.customers).toHaveLength(0)
    expect(result.state.tutorial).toBe('harvest')
  })

  it('lets an empty shelf lose the sale without ending anything', () => {
    const state = createShopState(appleSave({ coins: 50, served: 3 }), PORTRAIT_MAP)
    expect(state.shelves.fruit.everStocked.apple).toBe(true)
    const result = simulate(state, 900)
    expect(result.state.coins).toBe(50)
    expect(result.state.served).toBe(3)
    expect(result.events.some((event) => event.type === 'sale')).toBe(false)
  })

  it('moves at any angle without snapping to an axis', () => {
    const state = withPlayer(createShopState(initialSave(), PORTRAIT_MAP), { x: 320, y: 560 })
    const result = simulate(state, 1, { input: { moveX: 0.7, moveY: 0.7 } })
    const dx = result.state.player.pos.x - 320
    const dy = result.state.player.pos.y - 560
    expect(dx).toBeGreaterThan(0)
    expect(dy).toBeGreaterThan(0)
    expect(Math.abs(dx - dy)).toBeLessThan(0.01)
  })

  it('does not let diagonal input move faster than straight input', () => {
    const straight = simulate(
      withPlayer(createShopState(initialSave(), PORTRAIT_MAP), { x: 320, y: 560 }),
      1,
      {
        input: { moveX: 1, moveY: 0 },
      },
    )
    const diagonal = simulate(
      withPlayer(createShopState(initialSave(), PORTRAIT_MAP), { x: 320, y: 560 }),
      1,
      {
        input: { moveX: 1, moveY: 1 },
      },
    )
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
    let state = createShopState(appleSave({ coins: 1_000, served: 3 }), PORTRAIT_MAP)
    state = purchaseUpgrade(state, 'fertilizer').state
    state = withPlayer(
      state,
      state.producers[0]?.pos ?? PORTRAIT_MAP.plots[0] ?? { x: 115, y: 255 },
    )
    state = simulate(state, 1).state
    expect(state.player.carry).toEqual({ apple: 1 })
    expect(INTERACT.harvestMs).toBeGreaterThan(0)
  })

  it('harvests a whole producer in one pick and mixes kinds in the basket', () => {
    const save: SaveData = {
      ...initialSave(),
      producers: [
        { product: 'apple', slot: 0 },
        { product: 'pear', slot: 1 },
      ],
    }
    let state = createShopState(save, PORTRAIT_MAP)
    state = {
      ...state,
      producers: state.producers.map((producer) => ({
        ...producer,
        ready: producer.product === 'apple' ? 3 : 2,
      })),
    }
    const apple = state.producers[0] as NonNullable<ShopState['producers'][number]>
    state = simulate(withPlayer(state, apple.pos), 1).state
    expect(state.player.carry).toEqual({ apple: 3 })

    const pear = state.producers[1] as NonNullable<ShopState['producers'][number]>
    state = simulate(withPlayer(state, pear.pos), 5).state
    expect(state.player.carry).toEqual({ apple: 3, pear: 2 })
  })

  it('stops a mixed harvest at the shared carry capacity', () => {
    const save: SaveData = {
      ...initialSave(),
      producers: [
        { product: 'apple', slot: 0 },
        { product: 'pear', slot: 1 },
      ],
    }
    let state = createShopState(save, PORTRAIT_MAP)
    state = {
      ...state,
      producers: state.producers.map((producer) => ({ ...producer, ready: 5 })),
    }
    const apple = state.producers[0] as NonNullable<ShopState['producers'][number]>
    state = simulate(withPlayer(state, apple.pos), 1).state
    expect(state.player.carry).toEqual({ apple: 5 })

    const pear = state.producers[1] as NonNullable<ShopState['producers'][number]>
    state = simulate(withPlayer(state, pear.pos), 5).state
    expect(state.player.carry).toEqual({ apple: 5, pear: 1 })
  })

  it('stocks every carried product of the shelf zone in one action', () => {
    const save: SaveData = {
      ...initialSave(),
      producers: [
        { product: 'apple', slot: 0 },
        { product: 'pear', slot: 1 },
      ],
    }
    let state = createShopState(save, PORTRAIT_MAP)
    state = {
      ...state,
      player: { ...state.player, carry: { apple: 2, pear: 1, carrot: 3 } },
    }
    state = simulate(withPlayer(state, PORTRAIT_MAP.shelfAccess.fruit), 1).state
    expect(state.shelves.fruit.stock.apple).toBe(2)
    expect(state.shelves.fruit.stock.pear).toBe(1)
    expect(state.shelves.fruit.stock.carrot).toBe(0)
    expect(state.player.carry).toEqual({ carrot: 3 })
  })

  it('stocks from anywhere along the shelf, not from one access point', () => {
    const save: SaveData = {
      ...initialSave(),
      producers: [
        { product: 'apple', slot: 0 },
        { product: 'pear', slot: 1 },
      ],
    }
    const base = createShopState(save, PORTRAIT_MAP)
    const spots = [
      { x: 75, y: 660 },
      { x: 265, y: 660 },
      { x: 170, y: 660 },
    ]
    for (const pos of spots) {
      const state = withPlayer(
        { ...base, player: { ...base.player, carry: { apple: 2, pear: 1 } } },
        pos,
      )
      const next = simulate(state, 1).state
      expect(next.shelves.fruit.stock.apple, `apple at ${pos.x},${pos.y}`).toBe(2)
      expect(next.shelves.fruit.stock.pear, `pear at ${pos.x},${pos.y}`).toBe(1)
    }
  })

  it('does not stock from the far end of the same zone', () => {
    const save: SaveData = {
      ...initialSave(),
      producers: [{ product: 'apple', slot: 0 }],
    }
    const base = createShopState(save, PORTRAIT_MAP)
    const state = withPlayer(
      { ...base, player: { ...base.player, carry: { apple: 2 } } },
      { x: 170, y: 900 },
    )
    const next = simulate(state, 1).state
    expect(next.shelves.fruit.stock.apple).toBe(0)
    expect(next.player.carry).toEqual({ apple: 2 })
  })

  it('stocks both shelves when standing between them', () => {
    const save: SaveData = {
      ...initialSave(),
      zones: { fruit: true, veg: true, farm: false, kitchen: false },
      producers: [
        { product: 'apple', slot: 0 },
        { product: 'carrot', slot: 0 },
      ],
    }
    const base = createShopState(save, PORTRAIT_MAP)
    const state = withPlayer(
      { ...base, player: { ...base.player, carry: { apple: 1, carrot: 1 } } },
      { x: 340, y: 660 },
    )
    const next = simulate(state, 1).state
    expect(next.shelves.fruit.stock.apple).toBe(1)
    expect(next.shelves.veg.stock.carrot).toBe(1)
    expect(next.player.carry).toEqual({})
  })

  it('reports only the shelves the player can actually stock', () => {
    const save: SaveData = {
      ...initialSave(),
      producers: [{ product: 'apple', slot: 0 }],
    }
    const base = createShopState(save, PORTRAIT_MAP)
    let state = withPlayer(
      { ...base, player: { ...base.player, carry: { apple: 1 } } },
      { x: 90, y: 665 },
    )
    expect(stockReach(state)).toEqual(['fruit'])

    const full: ShopState = {
      ...state,
      shelves: {
        ...state.shelves,
        fruit: {
          ...state.shelves.fruit,
          stock: { ...state.shelves.fruit.stock, apple: state.shelves.fruit.capacity },
        },
      },
    }
    expect(stockReach(full)).toEqual([])

    state = withPlayer(state, { x: 170, y: 900 })
    expect(stockReach(state)).toEqual([])
  })

  it('removes only the discarded producer from a mixed basket', () => {
    const save: SaveData = {
      ...initialSave(),
      producers: [
        { product: 'apple', slot: 0 },
        { product: 'pear', slot: 1 },
      ],
    }
    let state = createShopState(save, PORTRAIT_MAP)
    state = {
      ...state,
      player: { ...state.player, carry: { apple: 2, pear: 1 } },
    }
    const pear = state.producers[1] as NonNullable<ShopState['producers'][number]>
    state = removeProducerFromState(state, pear.id)
    expect(state.player.carry).toEqual({ apple: 2 })
  })

  it('is deterministic for a seed and input sequence', () => {
    const start = createShopState(appleSave({ coins: 50, served: 3 }), PORTRAIT_MAP)
    const a = simulate(start, 400, { rng: createRng(1234) })
    const b = simulate(start, 400, { rng: createRng(1234) })
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state))
  })

  it('pours every carried plant into a trough and leaves other goods alone', () => {
    const base = createShopState(eggSave(), PORTRAIT_MAP)
    let state = withPlayer(base, PORTRAIT_MAP.animalAccess.egg)
    state = {
      ...state,
      player: { ...state.player, carry: { apple: 2, carrot: 1, milk: 2 } },
    }

    const result = simulate(state, 1)
    expect(result.state.producers[0]?.feed.apple).toBe(2)
    expect(result.state.producers[0]?.feed.carrot).toBe(1)
    expect(result.state.player.carry).toEqual({ milk: 2 })
    expect(result.events.some((event) => event.type === 'feed')).toBe(true)
  })

  it('does not feed while walking past a trough', () => {
    const base = createShopState(eggSave(), PORTRAIT_MAP)
    let state = withPlayer(base, PORTRAIT_MAP.animalAccess.egg)
    state = {
      ...state,
      player: { ...state.player, carry: { apple: 3 } },
    }

    const result = simulate(state, 1, { input: { moveX: 1, moveY: 0 } })
    expect(result.state.producers[0]?.feed.apple ?? 0).toBe(0)
    expect(result.state.player.carry).toEqual({ apple: 3 })
  })

  it('does not put a non-plant product in a trough', () => {
    const base = createShopState(eggSave(), PORTRAIT_MAP)
    let state = withPlayer(base, PORTRAIT_MAP.animalAccess.egg)
    state = {
      ...state,
      player: { ...state.player, carry: { milk: 2 } },
    }

    const result = simulate(state, 1)
    expect(
      feedCount(result.state.producers[0] as NonNullable<ShopState['producers'][number]>),
    ).toBe(0)
    expect(result.state.player.carry).toEqual({ milk: 2 })
  })

  it('persists producers, coins and upgrades through a save projection', () => {
    let state = createShopState(appleSave({ coins: 500, served: 2 }), PORTRAIT_MAP)
    state = purchaseUpgrade(state, 'carry').state
    const reloaded = createShopState(toSave(state), PORTRAIT_MAP)
    expect(reloaded.coins).toBe(state.coins)
    expect(reloaded.upgrades.carry).toBe(1)
    expect(reloaded.producers).toHaveLength(1)
    expect(reloaded.producers[0]?.mature).toBe(true)
    expect(reloaded.producers[0]?.ready).toBe(1)
    expect(reloaded.tutorial).toBe('done')
  })

  it('keeps swapped-out stock sellable and puts it in customer demand', () => {
    let state = createShopState(appleSave({ served: 3 }), PORTRAIT_MAP)
    state = {
      ...state,
      shelves: {
        ...state.shelves,
        fruit: {
          ...state.shelves.fruit,
          stock: { ...state.shelves.fruit.stock, apple: 3 },
          everStocked: { ...state.shelves.fruit.everStocked, apple: true },
        },
      },
    }
    state = removeProducerFromState(state, state.producers[0]?.id as number)
    expect(state.shelves.fruit.stock.apple).toBe(3)
    expect(state.shelves.fruit.bins.apple).toBe(false)

    const result = simulate(state, 40)
    expect(result.state.customers.length).toBeGreaterThan(0)
    expect(result.state.customers[0]?.wanted).toContain('apple')
  })

  it('loads a carried batch into a kitchen station by hand', () => {
    const save: SaveData = {
      ...initialSave(),
      zones: { fruit: true, veg: true, farm: true, kitchen: true },
      producers: [{ product: 'cake', slot: 0 }],
    }
    let state = createShopState(save, PORTRAIT_MAP)
    state = withPlayer(state, PORTRAIT_MAP.stationAccess.cake)
    state = { ...state, player: { ...state.player, carry: { egg: 2, milk: 1 } } }

    const result = simulate(state, 270)
    expect(result.events.some((event) => event.type === 'stationLoad')).toBe(true)
    expect(result.events.some((event) => event.type === 'producerProduce')).toBe(true)
    expect(result.state.player.carry.egg).toBeUndefined()
    expect(result.state.player.carry.milk).toBeUndefined()
    expect(
      (result.state.producers[0]?.ready ?? 0) + (result.state.player.carry.cake ?? 0),
    ).toBeGreaterThanOrEqual(1)
  })
})
