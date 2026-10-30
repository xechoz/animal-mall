import { createRng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import { ANIMAL_ACCESS, COUNTER_RECT, PLOTS, REGISTER_POINT, STAFF } from './config'
import { plantDepositKey, purchasePlant, purchaseStaff, removeProducer } from './purchase'
import { initialSave } from './saveData'
import { createShopState, inRegisterZone, stepShop } from './state'
import type { GameEvent, ShopState, Vec2 } from './types'

function withPlayer(state: ShopState, pos: Vec2): ShopState {
  return { ...state, player: { ...state.player, pos, prevPos: pos } }
}

function simulate(
  state: ShopState,
  ticks: number,
  options: { dt?: number; input?: { moveX: number; moveY: number } } = {},
): { state: ShopState; events: GameEvent[] } {
  const rng = createRng(7)
  const dt = options.dt ?? 50
  const input = options.input ?? { moveX: 0, moveY: 0 }
  let current = state
  const events: GameEvent[] = []
  for (let tick = 0; tick < ticks; tick += 1) {
    const result = stepShop(current, input, rng, dt)
    current = result.state
    events.push(...result.events)
  }
  return { state: current, events }
}

function appleSave(coins: number) {
  return { ...initialSave(), coins, producers: [{ product: 'apple' as const, slot: 0 }] }
}

describe('register proximity', () => {
  it('serves from the front, left and right of the counter', () => {
    expect(inRegisterZone(REGISTER_POINT)).toBe(true)
    expect(inRegisterZone({ x: REGISTER_POINT.x, y: REGISTER_POINT.y + 48 })).toBe(true)
    expect(inRegisterZone({ x: COUNTER_RECT.x - 24, y: COUNTER_RECT.y + 20 })).toBe(true)
    expect(
      inRegisterZone({ x: COUNTER_RECT.x + COUNTER_RECT.w + 24, y: COUNTER_RECT.y + 20 }),
    ).toBe(true)
    expect(inRegisterZone({ x: 120, y: 180 })).toBe(false)
  })
})

describe('quick buy', () => {
  it('opens the plant chooser after standing at an empty plot', () => {
    let state = createShopState(initialSave())
    const plot = PLOTS[0] as Vec2
    state = withPlayer(state, { x: plot.x, y: plot.y + 40 })
    const result = simulate(state, 20)
    expect(result.events.some((event) => event.type === 'plantPickerReady')).toBe(true)
    expect(result.state.producers).toHaveLength(0)
  })

  it('does not open while the player keeps moving', () => {
    let state = createShopState(initialSave())
    const plot = PLOTS[0] as Vec2
    state = withPlayer(state, { x: plot.x, y: plot.y + 40 })
    const result = simulate(state, 20, { input: { moveX: 0.2, moveY: 0 } })
    expect(result.events.some((event) => event.type === 'plantPickerReady')).toBe(false)
  })

  it('never lets the opening fund be trapped in an unaffordable plant', () => {
    const state = createShopState(initialSave())
    const pear = purchasePlant(state, 'pear')
    expect(pear.result).toBe('insufficient')
    expect(pear.state.coins).toBe(100)
    expect(pear.state.deposits).toEqual({})
  })

  it('deposits all coins toward a staff hire and applies them later', () => {
    let state = createShopState(appleSave(100))
    const station = STAFF.picker.station
    state = withPlayer(state, { x: station.x, y: station.y + 20 })
    const result = simulate(state, 30)
    expect(result.state.coins).toBe(0)
    expect(result.state.deposits['staff:picker']).toBe(100)
    expect(result.state.staff.picker).toBe(0)
    expect(result.events.some((event) => event.type === 'deposit')).toBe(true)

    const hired = purchaseStaff({ ...result.state, coins: 220 }, 'picker', true)
    expect(hired.result).toBe('ok')
    expect(hired.state.staff.picker).toBe(1)
    expect(hired.state.deposits['staff:picker']).toBeUndefined()
    expect(hired.state.coins).toBe(60)
  })

  it('uses a plant deposit in the shop', () => {
    const state = createShopState({
      ...appleSave(0),
      deposits: { [plantDepositKey('pear')]: 100 },
    })
    const bought = purchasePlant({ ...state, coins: 80 }, 'pear')
    expect(bought.result).toBe('ok')
    expect(bought.state.producers.some((producer) => producer.product === 'pear')).toBe(true)
    expect(bought.state.deposits[plantDepositKey('pear')]).toBeUndefined()
  })

  it('quick-buys an animal when standing at its pen', () => {
    const state = createShopState({
      ...initialSave(),
      coins: 1_000,
      zones: { fruit: true, veg: true, farm: true, kitchen: false },
    })
    const pen = ANIMAL_ACCESS.milk
    const result = simulate(withPlayer(state, { x: pen.x, y: pen.y - 6 }), 30)
    expect(result.state.producers.some((producer) => producer.product === 'milk')).toBe(true)
  })
})

describe('staff', () => {
  it('lets a cashier serve while the player is away and piles coins', () => {
    let state = createShopState({
      ...appleSave(0),
      served: 3,
      staff: { cashier: 1, picker: 0 },
    })
    state = {
      ...state,
      shelves: {
        ...state.shelves,
        fruit: {
          ...state.shelves.fruit,
          stock: { ...state.shelves.fruit.stock, apple: 4 },
          everStocked: { ...state.shelves.fruit.everStocked, apple: true },
        },
      },
      spawnMs: 0,
    } as ShopState
    const result = simulate(state, 1_200)
    expect(result.state.served).toBeGreaterThan(3)
    expect(result.state.pendingCoins).toBeGreaterThan(0)
    expect(result.events.some((event) => event.type === 'coinsPending')).toBe(true)
  })

  it('banks pending coins when the player walks to the counter', () => {
    const state = withPlayer(createShopState(appleSave(0)), {
      x: REGISTER_POINT.x,
      y: REGISTER_POINT.y + 40,
    })
    const result = simulate({ ...state, pendingCoins: 48 }, 1)
    expect(result.state.pendingCoins).toBe(0)
    expect(result.state.coins).toBe(48)
    expect(result.events.some((event) => event.type === 'coinsCollected')).toBe(true)
  })

  it('lets a picker harvest and stock without the player', () => {
    const state = createShopState({
      ...appleSave(0),
      served: 3,
      staff: { cashier: 0, picker: 1 },
    })
    const result = simulate(state, 1_400)
    expect(result.state.shelves.fruit.stock.apple).toBeGreaterThan(0)
    expect(result.events.some((event) => event.type === 'staffStock')).toBe(true)
  })

  it('caps staff hiring at the configured level', () => {
    let state = createShopState({ ...appleSave(10_000) })
    state = purchaseStaff(state, 'cashier', false).state
    expect(purchaseStaff(state, 'cashier', false).result).toBe('maxed')
  })
})

describe('last producer guard', () => {
  it('blocks removing the last producer when the refund cannot buy a new one', () => {
    const state = createShopState(appleSave(0))
    expect(removeProducer(state, state.producers[0]?.id as number).result).toBe('lastProducer')
  })

  it('allows removing the last producer when the player can replant', () => {
    const state = createShopState(appleSave(100))
    expect(removeProducer(state, state.producers[0]?.id as number).result).toBe('ok')
  })
})
