import { createRng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import {
  DEV_TUNING,
  DRINK_ORDER,
  DRINKS,
  defaultDrinkPrice,
  defaultProductPrice,
  drinkPrice,
  FACILITY_DWELL_MS,
  PORTRAIT_MAP,
  productPrice,
} from './config'
import { type FacilityDwellResult, purchaseDrink, stepFacilityDwell } from './facilities'
import { initialSave } from './saveData'
import { createShopState, inRegisterZone, stepShop } from './state'
import type { CustomerState, FacilityState, GameEvent, ShopState, Vec2 } from './types'

function withPlayer(state: ShopState, pos: Vec2): ShopState {
  return { ...state, player: { ...state.player, pos, prevPos: pos } }
}

function dwell(
  state: ShopState,
  ticks: number,
  dt = 50,
  move?: (state: ShopState) => ShopState,
): { state: ShopState; events: GameEvent[] } {
  let current = state
  const events: GameEvent[] = []
  for (let tick = 0; tick < ticks; tick += 1) {
    if (move !== undefined) current = move(current)
    const result: FacilityDwellResult = stepFacilityDwell(
      current.player,
      current.facility,
      dt,
      current.map,
    )
    current = {
      ...current,
      player: result.player,
      facility: result.facility,
    }
    events.push(...result.events)
  }
  return { state: current, events }
}

function carrying(state: ShopState, product: 'apple', count: number): ShopState {
  return { ...state, player: { ...state.player, carry: product, carryCount: count } }
}

function emptyFacility(): FacilityState {
  return { trashDwellMs: 0, drinkDwellMs: 0, drinkArmed: true }
}

function customerAtRegister(): CustomerState {
  const slot = PORTRAIT_MAP.queueSlots[0] as Vec2
  return {
    id: 1,
    species: 'cat',
    pos: slot,
    prevPos: slot,
    path: [],
    pathIndex: 0,
    phase: 'inQueue',
    wanted: [],
    basket: ['apple'],
    target: null,
    patienceMs: 60_000,
    maxPatienceMs: 60_000,
    waitMs: 0,
    queueIndex: 0,
    speed: 58,
    sad: false,
    paid: 0,
  }
}

describe('facility dwell', () => {
  it('empties the carried stack only after half a second by the bin', () => {
    let state = createShopState(initialSave(), PORTRAIT_MAP)
    state = carrying(withPlayer(state, PORTRAIT_MAP.facilities.trashPoint), 'apple', 3)
    state = { ...state, facility: emptyFacility() }

    const early = dwell(state, 9)
    expect(early.events).toHaveLength(0)
    expect(early.state.player.carry).toBe('apple')
    expect(early.state.player.carryCount).toBe(3)

    const done = dwell(state, 10)
    expect(done.state.player.carry).toBeNull()
    expect(done.state.player.carryCount).toBe(0)
    expect(done.events.some((event) => event.type === 'discard')).toBe(true)
  })

  it('resets the bin timer when the player steps away', () => {
    let state = createShopState(initialSave(), PORTRAIT_MAP)
    state = carrying(withPlayer(state, PORTRAIT_MAP.facilities.trashPoint), 'apple', 2)
    state = { ...state, facility: emptyFacility() }
    const partial = dwell(state, 9).state
    const away = withPlayer(partial, {
      x: PORTRAIT_MAP.facilities.trashPoint.x,
      y: PORTRAIT_MAP.facilities.trashPoint.y - 200,
    })
    const reset = dwell(away, 1).state
    expect(reset.facility.trashDwellMs).toBe(0)

    const back = withPlayer(reset, PORTRAIT_MAP.facilities.trashPoint)
    const result = dwell(back, 9)
    expect(result.state.player.carryCount).toBe(2)
  })

  it('does not tick the bin while the player is empty-handed', () => {
    const state = createShopState(initialSave(), PORTRAIT_MAP)
    const result = dwell(withPlayer(state, PORTRAIT_MAP.facilities.trashPoint), 20)
    expect(result.state.facility.trashDwellMs).toBe(0)
    expect(result.events).toHaveLength(0)
  })

  it('opens the vending menu once per approach and re-arms after leaving', () => {
    const state = createShopState(initialSave(), PORTRAIT_MAP)
    const atMachine = withPlayer(state, PORTRAIT_MAP.facilities.vendingUse)

    const early = dwell(atMachine, 9)
    expect(early.events).toHaveLength(0)

    const opened = dwell(atMachine, 10)
    expect(opened.events.filter((event) => event.type === 'drinkMenuReady')).toHaveLength(1)
    expect(opened.state.facility.drinkArmed).toBe(false)

    const again = dwell(opened.state, 20)
    expect(again.events.some((event) => event.type === 'drinkMenuReady')).toBe(false)

    const away = withPlayer(again.state, {
      x: 320,
      y: PORTRAIT_MAP.facilities.vendingUse.y,
    })
    const left = dwell(away, 1).state
    expect(left.facility.drinkArmed).toBe(true)

    const back = withPlayer(left, PORTRAIT_MAP.facilities.vendingUse)
    const reopened = dwell(back, 10)
    expect(reopened.events.some((event) => event.type === 'drinkMenuReady')).toBe(true)
  })
})

describe('drinks', () => {
  it('charges coins and applies each drink timer', () => {
    const state: ShopState = { ...createShopState(initialSave(), PORTRAIT_MAP), coins: 200 }
    let current = state
    for (const kind of DRINK_ORDER) {
      const outcome = purchaseDrink(current, kind)
      expect(outcome.result).toBe('ok')
      expect(outcome.state.coins).toBe(current.coins - DRINKS[kind].price)
      expect(outcome.state.buffs[kind]).toBe(DRINKS[kind].durationMs)
      current = outcome.state
    }
  })

  it('refuses a drink that costs more than the current coins', () => {
    const state: ShopState = { ...createShopState(initialSave(), PORTRAIT_MAP), coins: 5 }
    const outcome = purchaseDrink(state, 'milkTea')
    expect(outcome.result).toBe('insufficient')
    expect(outcome.state).toBe(state)
  })

  it('refreshes the same buff and keeps different buffs side by side', () => {
    let state: ShopState = { ...createShopState(initialSave(), PORTRAIT_MAP), coins: 200 }
    state = {
      ...state,
      buffs: { ...state.buffs, appleSoda: 10_000 },
    }
    const refreshed = purchaseDrink(state, 'appleSoda')
    expect(refreshed.state.buffs.appleSoda).toBe(DRINKS.appleSoda.durationMs)
    const stacked = purchaseDrink(refreshed.state, 'milkTea')
    expect(stacked.state.buffs.appleSoda).toBe(DRINKS.appleSoda.durationMs)
    expect(stacked.state.buffs.milkTea).toBe(DRINKS.milkTea.durationMs)
  })

  it('counts buffs down and applies speed, carry and scan effects', () => {
    const base = createShopState(initialSave(), PORTRAIT_MAP)
    const rng = createRng(7)

    const plain = withPlayer(base, { x: 320, y: 560 })
    const plainStep = stepShop(plain, { moveX: 1, moveY: 0 }, rng, 50)
    const plainDistance = plainStep.state.player.pos.x - plain.player.pos.x

    const fast = withPlayer(
      {
        ...base,
        buffs: { ...base.buffs, appleSoda: 45_000 },
      },
      { x: 320, y: 560 },
    )
    const fastStep = stepShop(fast, { moveX: 1, moveY: 0 }, rng, 50)
    expect(fastStep.state.player.pos.x - fast.player.pos.x).toBeGreaterThan(plainDistance)
    expect(fastStep.state.buffs.appleSoda).toBe(45_000 - 50)

    const apple = createShopState(
      {
        ...initialSave(),
        producers: [{ product: 'apple', slot: 0 }],
      },
      PORTRAIT_MAP,
    )
    const stocked = carrying(
      withPlayer(apple, apple.producers[0]?.pos ?? { x: 115, y: 255 }),
      'apple',
      6,
    )
    const noBuff = stepShop(stocked, { moveX: 0, moveY: 0 }, rng, 50)
    expect(noBuff.state.player.carryCount).toBe(6)
    const withTea = stepShop(
      {
        ...stocked,
        buffs: { ...stocked.buffs, milkTea: 45_000 },
      },
      { moveX: 0, moveY: 0 },
      rng,
      50,
    )
    expect(withTea.state.player.carryCount).toBe(7)

    const queueState = createShopState(
      {
        ...initialSave(),
        served: 3,
        producers: [{ product: 'apple', slot: 0 }],
      },
      PORTRAIT_MAP,
    )
    const customer = customerAtRegister()
    const registerPos = {
      x: PORTRAIT_MAP.register.x,
      y: PORTRAIT_MAP.register.y + 40,
    }
    expect(inRegisterZone(registerPos, PORTRAIT_MAP)).toBe(true)
    const queued = withPlayer(
      {
        ...queueState,
        customers: [customer],
        queue: [customer.id],
        register: { customerId: null, scanMs: 0 },
      },
      registerPos,
    )
    let slow = queued
    for (let tick = 0; tick < 8; tick += 1) {
      slow = stepShop(slow, { moveX: 0, moveY: 0 }, rng, 50).state
    }
    expect(slow.coins).toBe(queueState.coins)
    let quick = {
      ...queued,
      buffs: { ...queued.buffs, lemonTea: 45_000 },
    }
    for (let tick = 0; tick < 8; tick += 1) {
      quick = stepShop(quick, { moveX: 0, moveY: 0 }, rng, 50).state
    }
    expect(quick.coins).toBeGreaterThan(queueState.coins)
  })

  it('expires a buff after its remaining time', () => {
    const state: ShopState = {
      ...createShopState(initialSave(), PORTRAIT_MAP),
      buffs: {
        appleSoda: 20,
        milkTea: 0,
        lemonTea: 0,
      },
    }
    const result = stepShop(state, { moveX: 0, moveY: 0 }, createRng(7), FACILITY_DWELL_MS)
    expect(result.state.buffs.appleSoda).toBe(0)
  })

  it('applies dev price overrides and falls back to defaults', () => {
    try {
      DEV_TUNING.prices.apple = 99
      DEV_TUNING.drinkPrices.appleSoda = 5
      expect(productPrice('apple')).toBe(99)
      expect(drinkPrice('appleSoda')).toBe(5)

      delete DEV_TUNING.prices.apple
      delete DEV_TUNING.drinkPrices.appleSoda
      expect(productPrice('apple')).toBe(defaultProductPrice('apple'))
      expect(drinkPrice('appleSoda')).toBe(defaultDrinkPrice('appleSoda'))
    } finally {
      delete DEV_TUNING.prices.apple
      delete DEV_TUNING.drinkPrices.appleSoda
    }
  })
})
