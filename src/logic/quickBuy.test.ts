import { createRng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import { PORTRAIT_MAP } from './config'
import { plantDepositKey, purchasePlant, purchaseStaff, removeProducer } from './purchase'
import { mapOffers } from './quickBuy'
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
    expect(inRegisterZone(PORTRAIT_MAP.register, PORTRAIT_MAP)).toBe(true)
    expect(
      inRegisterZone({ x: PORTRAIT_MAP.register.x, y: PORTRAIT_MAP.register.y + 48 }, PORTRAIT_MAP),
    ).toBe(true)
    expect(
      inRegisterZone(
        { x: PORTRAIT_MAP.counter.x - 24, y: PORTRAIT_MAP.counter.y + 20 },
        PORTRAIT_MAP,
      ),
    ).toBe(true)
    expect(
      inRegisterZone(
        { x: PORTRAIT_MAP.counter.x + PORTRAIT_MAP.counter.w + 24, y: PORTRAIT_MAP.counter.y + 20 },
        PORTRAIT_MAP,
      ),
    ).toBe(true)
    expect(inRegisterZone({ x: 120, y: 180 }, PORTRAIT_MAP)).toBe(false)
  })
})

describe('quick buy', () => {
  it('opens the plant chooser after standing at an empty plot', () => {
    let state = createShopState(initialSave(), PORTRAIT_MAP)
    const plot = PORTRAIT_MAP.plots[0] as Vec2
    state = withPlayer(state, { x: plot.x, y: plot.y + 40 })
    const result = simulate(state, 20)
    expect(result.events.some((event) => event.type === 'plantPickerReady')).toBe(true)
    expect(result.state.producers).toHaveLength(0)
  })

  it('does not open while the player keeps moving', () => {
    let state = createShopState(initialSave(), PORTRAIT_MAP)
    const plot = PORTRAIT_MAP.plots[0] as Vec2
    state = withPlayer(state, { x: plot.x, y: plot.y + 40 })
    const result = simulate(state, 20, { input: { moveX: 0.2, moveY: 0 } })
    expect(result.events.some((event) => event.type === 'plantPickerReady')).toBe(false)
  })

  it('never lets the opening fund be trapped in an unaffordable plant', () => {
    const state = createShopState(initialSave(), PORTRAIT_MAP)
    const pear = purchasePlant(state, 'pear')
    expect(pear.result).toBe('insufficient')
    expect(pear.state.coins).toBe(100)
    expect(pear.state.deposits).toEqual({})
  })

  it('deposits all coins toward a staff hire and applies them later', () => {
    let state = createShopState(appleSave(100), PORTRAIT_MAP)
    const station = PORTRAIT_MAP.staffStations.picker.station
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

  it('hires the cashier from near the counter sign', () => {
    const station = PORTRAIT_MAP.staffStations.cashier.station
    const state = createShopState(appleSave(400), PORTRAIT_MAP)
    const result = simulate(withPlayer(state, { x: station.x - 70, y: station.y }), 30)
    expect(result.state.staff.cashier).toBe(1)
    expect(result.state.coins).toBe(80)
    expect(
      result.events.some((event) => event.type === 'staffBought' && event.kind === 'cashier'),
    ).toBe(true)
  })

  it('deposits coins toward the cashier from near the counter sign', () => {
    const station = PORTRAIT_MAP.staffStations.cashier.station
    const state = createShopState(appleSave(100), PORTRAIT_MAP)
    const result = simulate(withPlayer(state, { x: station.x - 70, y: station.y }), 30)
    expect(result.state.staff.cashier).toBe(0)
    expect(result.state.deposits['staff:cashier']).toBe(100)
  })

  it('stops offering the cashier sign once the cashier is hired', () => {
    const state = createShopState(
      { ...appleSave(0), staff: { cashier: 1, picker: 0 } },
      PORTRAIT_MAP,
    )
    expect(
      mapOffers(state).some((offer) => offer.type === 'staff' && offer.kind === 'cashier'),
    ).toBe(false)
  })

  it('uses a plant deposit in the shop', () => {
    const state = createShopState(
      {
        ...appleSave(0),
        deposits: { [plantDepositKey('pear')]: 100 },
      },
      PORTRAIT_MAP,
    )
    const bought = purchasePlant({ ...state, coins: 80 }, 'pear')
    expect(bought.result).toBe('ok')
    expect(bought.state.producers.some((producer) => producer.product === 'pear')).toBe(true)
    expect(bought.state.deposits[plantDepositKey('pear')]).toBeUndefined()
  })

  it('quick-buys an animal when standing at its pen', () => {
    const state = createShopState(
      {
        ...initialSave(),
        coins: 1_000,
        zones: { fruit: true, veg: true, farm: true, kitchen: false },
      },
      PORTRAIT_MAP,
    )
    const pen = PORTRAIT_MAP.animalAccess.milk
    const result = simulate(withPlayer(state, { x: pen.x, y: pen.y - 6 }), 30)
    expect(result.state.producers.some((producer) => producer.product === 'milk')).toBe(true)
  })

  it('unlocks the farm after standing at its shelf for half a second', () => {
    const state = createShopState({ ...initialSave(), coins: 600 }, PORTRAIT_MAP)
    const access = PORTRAIT_MAP.shelfAccess.farm

    const early = simulate(withPlayer(state, access), 10)
    expect(early.state.zones.farm).toBe(false)

    const result = simulate(withPlayer(state, access), 11)
    expect(result.state.zones.farm).toBe(true)
    expect(result.state.coins).toBe(0)
    expect(
      result.events.some((event) => event.type === 'zoneUnlocked' && event.zone === 'farm'),
    ).toBe(true)
    expect(result.state.producers.some((producer) => producer.product === 'egg')).toBe(true)
  })

  it('unlocks from anywhere inside the zone, not only its shelf access point', () => {
    const state = createShopState({ ...initialSave(), coins: 600 }, PORTRAIT_MAP)
    const result = simulate(withPlayer(state, { x: 170, y: 440 }), 11)
    expect(result.state.zones.farm).toBe(true)
    expect(result.state.coins).toBe(0)
  })

  it('unlocks from just outside the zone footprint', () => {
    const state = createShopState({ ...initialSave(), coins: 600 }, PORTRAIT_MAP)
    const result = simulate(withPlayer(state, { x: 170, y: 540 }), 11)
    expect(result.state.zones.farm).toBe(true)
  })

  it('does not unlock from far outside the zone footprint', () => {
    const state = createShopState({ ...initialSave(), coins: 600 }, PORTRAIT_MAP)
    const result = simulate(withPlayer(state, { x: 170, y: 620 }), 30)
    expect(result.state.zones.farm).toBe(false)
  })

  it('unlocks the kitchen after standing at its shelf', () => {
    const state = createShopState({ ...initialSave(), coins: 1_200 }, PORTRAIT_MAP)
    const result = simulate(withPlayer(state, PORTRAIT_MAP.shelfAccess.kitchen), 11)
    expect(result.state.zones.kitchen).toBe(true)
    expect(result.state.coins).toBe(0)
    expect(result.state.producers.some((producer) => producer.product === 'cake')).toBe(true)
  })

  it('does not unlock a zone while the player keeps moving', () => {
    const state = createShopState({ ...initialSave(), coins: 600 }, PORTRAIT_MAP)
    const result = simulate(withPlayer(state, PORTRAIT_MAP.shelfAccess.farm), 20, {
      input: { moveX: 0.2, moveY: 0 },
    })
    expect(result.state.zones.farm).toBe(false)
  })

  it('does not offer a zone unlock before the player can afford it', () => {
    const state = createShopState({ ...initialSave(), coins: 599 }, PORTRAIT_MAP)
    const result = simulate(withPlayer(state, PORTRAIT_MAP.shelfAccess.farm), 30)
    expect(result.state.zones.farm).toBe(false)
    expect(result.events.some((event) => event.type === 'zoneUnlocked')).toBe(false)
  })
})

describe('staff', () => {
  it('lets a cashier serve while the player is away and piles coins', () => {
    let state = createShopState(
      {
        ...appleSave(0),
        served: 3,
        staff: { cashier: 1, picker: 0 },
      },
      PORTRAIT_MAP,
    )
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
    const state = withPlayer(createShopState(appleSave(0), PORTRAIT_MAP), {
      x: PORTRAIT_MAP.register.x,
      y: PORTRAIT_MAP.register.y + 40,
    })
    const result = simulate({ ...state, pendingCoins: 48 }, 1)
    expect(result.state.pendingCoins).toBe(0)
    expect(result.state.coins).toBe(48)
    expect(result.events.some((event) => event.type === 'coinsCollected')).toBe(true)
  })

  it('lets a picker harvest and stock without the player', () => {
    const state = createShopState(
      {
        ...appleSave(0),
        served: 3,
        staff: { cashier: 0, picker: 1 },
      },
      PORTRAIT_MAP,
    )
    const result = simulate(state, 1_400)
    expect(result.state.shelves.fruit.stock.apple).toBeGreaterThan(0)
    expect(result.events.some((event) => event.type === 'staffStock')).toBe(true)
  })

  it('caps staff hiring at the configured level', () => {
    let state = createShopState({ ...appleSave(10_000) }, PORTRAIT_MAP)
    state = purchaseStaff(state, 'cashier', false).state
    expect(purchaseStaff(state, 'cashier', false).result).toBe('maxed')
  })
})

describe('last producer guard', () => {
  it('blocks removing the last producer when the refund cannot buy a new one', () => {
    const state = createShopState(appleSave(0), PORTRAIT_MAP)
    expect(removeProducer(state, state.producers[0]?.id as number).result).toBe('lastProducer')
  })

  it('allows removing the last producer when the player can replant', () => {
    const state = createShopState(appleSave(100), PORTRAIT_MAP)
    expect(removeProducer(state, state.producers[0]?.id as number).result).toBe('ok')
  })
})
