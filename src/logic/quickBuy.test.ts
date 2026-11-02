import { createRng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import { PORTRAIT_MAP } from './config'
import {
  plantDepositKey,
  purchasePlant,
  purchasePlantAt,
  purchaseStaff,
  removeProducer,
} from './purchase'
import { mapOffers, type PurchaseOffer } from './quickBuy'
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

  it('keeps every empty slot offered after one crop is planted', () => {
    const state = createShopState(
      {
        ...initialSave(),
        coins: 1_000,
        producers: [{ product: 'apple', slot: 0 }],
      },
      PORTRAIT_MAP,
    )
    const offers = mapOffers(state).filter((offer) => offer.type === 'plant')
    expect(offers).toHaveLength(5)
  })

  it('shows a deposit only on the bed it was paid into', () => {
    const state = createShopState(
      {
        ...initialSave(),
        coins: 100,
        producers: [{ product: 'apple', slot: 0 }],
      },
      PORTRAIT_MAP,
    )
    const deposited = purchasePlantAt(state, 'pear', 1, true)
    expect(deposited.result).toBe('deposited')
    const offers = mapOffers(deposited.state).filter(
      (offer): offer is Extract<PurchaseOffer, { type: 'plant' }> => offer.type === 'plant',
    )
    expect(offers.find((offer) => offer.slot === 1)?.deposit).toBe(100)
    expect(offers.find((offer) => offer.slot === 2)?.deposit).toBe(0)
  })

  it('never opens the swap chooser from proximity, even right after a harvest', () => {
    const state = createShopState(
      {
        ...initialSave(),
        coins: 1_000,
        producers: [{ product: 'apple', slot: 0 }],
      },
      PORTRAIT_MAP,
    )
    const plot = PORTRAIT_MAP.plots[0] as Vec2
    // The pick happens on the first tick, so the bed is already empty while the
    // player keeps standing on it for four seconds.
    const result = simulate(withPlayer(state, plot), 80)
    expect(result.events.some((event) => event.type === 'harvest')).toBe(true)
    expect(result.events.some((event) => event.type === 'plantPickerReady')).toBe(false)
    expect(result.events.some((event) => event.type === 'plantSwapReady')).toBe(false)
    expect(result.events.some((event) => event.type === 'producerReplaced')).toBe(false)
    expect(result.state.coins).toBe(1_000)
  })

  it('shows the swap target while the bed still has fruit', () => {
    const state = createShopState(
      {
        ...initialSave(),
        coins: 1_000,
        producers: [{ product: 'apple', slot: 0 }],
      },
      PORTRAIT_MAP,
    )
    // A plant loaded from a save is already mature and ready to harvest.
    expect(state.producers[0]?.ready).toBeGreaterThan(0)
    const swaps = mapOffers(state).filter(
      (offer): offer is Extract<PurchaseOffer, { type: 'swap' }> => offer.type === 'swap',
    )
    expect(swaps).toHaveLength(1)
    expect(swaps[0]?.slot).toBe(0)
  })

  it('still offers the swap target for its label and long press', () => {
    const state = createShopState(
      {
        ...initialSave(),
        coins: 1_000,
        producers: [{ product: 'apple', slot: 0 }],
      },
      PORTRAIT_MAP,
    )
    const plot = PORTRAIT_MAP.plots[0] as Vec2
    const harvested = simulate(withPlayer(state, plot), 1).state
    const swaps = mapOffers(harvested).filter(
      (offer): offer is Extract<PurchaseOffer, { type: 'swap' }> => offer.type === 'swap',
    )
    expect(swaps).toHaveLength(1)
    expect(swaps[0]?.slot).toBe(0)
  })

  it('opens a bed while standing between two rows, not just at its centre', () => {
    const state = createShopState(initialSave(), PORTRAIT_MAP)
    const first = PORTRAIT_MAP.plots[0] as Vec2
    const below = PORTRAIT_MAP.plots[2] as Vec2
    const gap = (first.y + below.y) / 2
    // Walk into the gap first: a bed that appears under a stationary player
    // (for example after a harvest) must not start a dwell by itself.
    const walked = simulate(withPlayer(state, { x: first.x, y: gap + 40 }), 8, {
      input: { moveX: 0, moveY: -1 },
    })
    const result = simulate(walked.state, 12)
    expect(result.events.some((event) => event.type === 'plantPickerReady')).toBe(true)
  })

  it('does not open the chooser when the cheapest crop is unaffordable', () => {
    const state = createShopState({ ...initialSave(), coins: 0 }, PORTRAIT_MAP)
    const plot = PORTRAIT_MAP.plots[0] as Vec2
    const result = simulate(withPlayer(state, plot), 30)
    expect(result.events.some((event) => event.type === 'plantPickerReady')).toBe(false)
  })

  it('pauses empty-bed dwells while the first-sale tutorial is running', () => {
    const state = createShopState(
      {
        ...initialSave(),
        coins: 1_000,
        producers: [{ product: 'apple', slot: 0 }],
      },
      PORTRAIT_MAP,
    )
    expect(state.tutorial).toBe('harvest')
    const empty = PORTRAIT_MAP.plots[2] as Vec2
    const result = simulate(withPlayer(state, empty), 30)
    expect(result.events.some((event) => event.type === 'plantPickerReady')).toBe(false)
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

  it('reports a blocked dwell when the staff hire is unaffordable', () => {
    const station = PORTRAIT_MAP.staffStations.picker.station
    const state = createShopState({ ...initialSave(), coins: 0 }, PORTRAIT_MAP)
    const result = simulate(withPlayer(state, { x: station.x, y: station.y + 20 }), 30)
    expect(
      result.events.some(
        (event) => event.type === 'purchaseBlocked' && event.result === 'insufficient',
      ),
    ).toBe(true)
  })

  it('hires the cashier from near the sign beside the counter', () => {
    const station = PORTRAIT_MAP.staffStations.cashier.station
    const state = createShopState(appleSave(400), PORTRAIT_MAP)
    const result = simulate(withPlayer(state, { x: station.x - 40, y: station.y + 20 }), 30)
    expect(result.state.staff.cashier).toBe(1)
    expect(result.state.coins).toBe(80)
    expect(
      result.events.some((event) => event.type === 'staffBought' && event.kind === 'cashier'),
    ).toBe(true)
  })

  it('deposits coins toward the cashier from near the counter sign', () => {
    const station = PORTRAIT_MAP.staffStations.cashier.station
    const state = createShopState(appleSave(100), PORTRAIT_MAP)
    const result = simulate(withPlayer(state, { x: station.x - 40, y: station.y + 20 }), 30)
    expect(result.state.staff.cashier).toBe(0)
    expect(result.state.deposits['staff:cashier']).toBe(100)
  })

  it('stops offering the cashier sign once the cashier is hired', () => {
    const state = createShopState(
      { ...appleSave(0), staff: { cashier: 1, picker: 0, chef: 0 } },
      PORTRAIT_MAP,
    )
    expect(
      mapOffers(state).some((offer) => offer.type === 'staff' && offer.kind === 'cashier'),
    ).toBe(false)
  })

  it('only offers the chef once the kitchen is unlocked', () => {
    const locked = createShopState(appleSave(2_000), PORTRAIT_MAP)
    expect(mapOffers(locked).some((offer) => offer.type === 'staff' && offer.kind === 'chef')).toBe(
      false,
    )
    expect(purchaseStaff(locked, 'chef', false).result).toBe('lockedZone')

    const open = createShopState(
      {
        ...appleSave(2_000),
        zones: { fruit: true, veg: true, farm: true, kitchen: true },
      },
      PORTRAIT_MAP,
    )
    expect(mapOffers(open).some((offer) => offer.type === 'staff' && offer.kind === 'chef')).toBe(
      true,
    )
    const hired = purchaseStaff(open, 'chef', false)
    expect(hired.result).toBe('ok')
    expect(hired.state.staff.chef).toBe(1)
    expect(hired.state.coins).toBe(1_200)
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

  it('opens the animal chooser after standing at an empty pen', () => {
    const state = createShopState(
      {
        ...initialSave(),
        coins: 1_000,
        zones: { fruit: true, veg: true, farm: true, kitchen: false },
      },
      PORTRAIT_MAP,
    )
    const pen = PORTRAIT_MAP.animalAccess[1] as Vec2
    const result = simulate(withPlayer(state, { x: pen.x, y: pen.y }), 11)
    expect(
      result.events.some(
        (event) =>
          event.type === 'producerPickerReady' && event.zone === 'farm' && event.slot === 1,
      ),
    ).toBe(true)
    expect(result.state.producers.some((producer) => producer.product === 'milk')).toBe(false)
  })

  it('never opens the animal chooser by standing at an occupied pen', () => {
    const state = createShopState(
      {
        ...initialSave(),
        coins: 1_000,
        zones: { fruit: true, veg: true, farm: true, kitchen: false },
        producers: [{ product: 'milk', slot: 1 }],
      },
      PORTRAIT_MAP,
    )
    const pen = PORTRAIT_MAP.animalAccess[1] as Vec2
    const result = simulate(withPlayer(state, { x: pen.x, y: pen.y }), 30)
    expect(result.events.some((event) => event.type === 'producerPickerReady')).toBe(false)
    expect(result.events.some((event) => event.type === 'producerReplaced')).toBe(false)
  })

  it('unlocks the farm after standing at its shelf for half a second', () => {
    const state = createShopState({ ...initialSave(), coins: 600 }, PORTRAIT_MAP)
    const access = PORTRAIT_MAP.shelfAccess.farm

    const early = simulate(withPlayer(state, access), 10)
    expect(early.state.zones.farm).toBe(false)

    const result = simulate(withPlayer(state, access), 11)
    expect(result.state.zones.farm).toBe(true)
    expect(result.state.coins).toBe(250)
    expect(
      result.events.some((event) => event.type === 'zoneUnlocked' && event.zone === 'farm'),
    ).toBe(true)
    expect(result.state.producers.some((producer) => producer.product === 'egg')).toBe(true)
  })

  it('unlocks from anywhere inside the zone, not only its shelf access point', () => {
    const state = createShopState({ ...initialSave(), coins: 600 }, PORTRAIT_MAP)
    const result = simulate(withPlayer(state, { x: 170, y: 440 }), 11)
    expect(result.state.zones.farm).toBe(true)
    expect(result.state.coins).toBe(250)
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
    expect(result.state.coins).toBe(400)
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
    const state = createShopState({ ...initialSave(), coins: 349 }, PORTRAIT_MAP)
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
        staff: { cashier: 1, picker: 0, chef: 0 },
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
        staff: { cashier: 0, picker: 1, chef: 0 },
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
