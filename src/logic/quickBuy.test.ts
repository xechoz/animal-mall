import { createRng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import { COUNTER_RECT, PLOTS, REGISTER_POINT, STAFF } from './config'
import { purchaseStaff, purchaseTree, purchaseTreeAt, removeTree, treeDepositKey } from './purchase'
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
  return { ...initialSave(), coins, trees: [{ kind: 'apple' as const, plot: 0 }] }
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
  it('opens the fruit chooser after standing at an empty plot', () => {
    let state = createShopState(initialSave())
    const plot = PLOTS[0] as Vec2
    state = withPlayer(state, { x: plot.x, y: plot.y + 40 })
    const result = simulate(state, 20)
    expect(result.events.some((event) => event.type === 'quickBuyReady')).toBe(true)
    expect(result.state.trees).toHaveLength(0)
  })

  it('does not open while the player keeps moving', () => {
    let state = createShopState(initialSave())
    const plot = PLOTS[0] as Vec2
    state = withPlayer(state, { x: plot.x, y: plot.y + 40 })
    const result = simulate(state, 20, { input: { moveX: 0.2, moveY: 0 } })
    expect(result.events.some((event) => event.type === 'quickBuyReady')).toBe(false)
  })

  it('never lets the opening fund be trapped in an unaffordable fruit', () => {
    const state = createShopState(initialSave())
    const pear = purchaseTreeAt(state, 'pear', 0, true)
    expect(pear.result).toBe('insufficient')
    expect(pear.state.coins).toBe(100)
    expect(pear.state.deposits).toEqual({})
  })

  it('deposits all coins toward a staff hire and applies them later', () => {
    let state = createShopState(appleSave(100))
    const station = STAFF.cashier.station
    state = withPlayer(state, { x: station.x, y: station.y + 20 })
    const result = simulate(state, 30)
    expect(result.state.coins).toBe(0)
    expect(result.state.deposits['staff:cashier']).toBe(100)
    expect(result.state.staff.cashier).toBe(0)
    expect(result.events.some((event) => event.type === 'deposit')).toBe(true)

    const hired = purchaseStaff({ ...result.state, coins: 220 }, 'cashier', true)
    expect(hired.result).toBe('ok')
    expect(hired.state.staff.cashier).toBe(1)
    expect(hired.state.deposits['staff:cashier']).toBeUndefined()
    expect(hired.state.coins).toBe(0)
  })

  it('uses a tree deposit in the shop and locks other fruit kinds', () => {
    let state = createShopState(appleSave(0))
    state = {
      ...state,
      deposits: { [treeDepositKey('pear')]: 100 },
    }
    const locked = purchaseTree({ ...state, coins: 100 }, 'apple')
    expect(locked.result).toBe('locked')

    const bought = purchaseTree({ ...state, coins: 80 }, 'pear')
    expect(bought.result).toBe('ok')
    expect(bought.state.trees.some((tree) => tree.kind === 'pear')).toBe(true)
    expect(bought.state.deposits[treeDepositKey('pear')]).toBeUndefined()
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
        apple: { ...state.shelves.apple, stock: 4, everStocked: true },
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
    expect(result.state.shelves.apple.stock).toBeGreaterThan(0)
    expect(result.events.some((event) => event.type === 'staffStock')).toBe(true)
  })

  it('caps staff hiring at the configured level', () => {
    let state = createShopState({ ...appleSave(10_000) })
    state = purchaseStaff(state, 'cashier', false).state
    expect(purchaseStaff(state, 'cashier', false).result).toBe('maxed')
  })
})

describe('last tree guard', () => {
  it('blocks removing the last tree when the refund cannot buy a new one', () => {
    const state = createShopState(appleSave(0))
    expect(removeTree(state, 0).result).toBe('lastTree')
  })

  it('allows removing the last tree when the player can replant', () => {
    const state = createShopState(appleSave(100))
    expect(removeTree(state, 0).result).toBe('ok')
  })
})
