import type { Rng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import { PORTRAIT_MAP, REST } from './config'
import { initialSave } from './saveData'
import { activeCashier, staffMemberId, stepStaff, urgeStaff } from './staff'
import { createShopState } from './state'
import type { GameEvent, ProductKind, ShopState, StaffKind, StaffState, ZoneId } from './types'

function fixedRng(value: number): Rng {
  return {
    next: () => value / 100,
    int: () => value,
    pick: <T>(items: readonly T[]): T => items[0] as T,
    shuffle: <T>(items: readonly T[]): T[] => [...items],
  }
}

function withStaffState(state: ShopState, id: number, patch: Partial<StaffState>): ShopState {
  return {
    ...state,
    staffMembers: state.staffMembers.map((member) =>
      member.id === id ? { ...member, ...patch } : member,
    ),
  }
}

function member(state: ShopState, kind: StaffKind, index = 0): StaffState {
  const found = state.staffMembers.find((candidate) => candidate.id === staffMemberId(kind, index))
  if (found === undefined) throw new Error('missing staff member')
  return found
}

function simulate(
  state: ShopState,
  ticks: number,
  rng: Rng,
): { state: ShopState; events: GameEvent[] } {
  let current = state
  const events: GameEvent[] = []
  for (let tick = 0; tick < ticks; tick += 1) {
    const result = stepStaff(current, 50, rng)
    current = result.state
    events.push(...result.events)
  }
  return { state: current, events }
}

function pickerState(count = 1): ShopState {
  return createShopState(
    {
      ...initialSave(),
      staff: { cashier: 0, picker: count, chef: 0 },
    },
    PORTRAIT_MAP,
  )
}

function farmPickerState(): ShopState {
  return createShopState(
    {
      ...initialSave(),
      zones: { fruit: true, veg: true, farm: true, kitchen: true },
      producers: [{ product: 'egg', slot: 0 }],
      staff: { cashier: 0, picker: 1, chef: 0 },
    },
    PORTRAIT_MAP,
  )
}

describe('staff feeding', () => {
  it('carries harvested produce to an empty trough before stocking shelves', () => {
    let state = farmPickerState()
    const picker = member(state, 'picker')
    state = withStaffState(state, picker.id, {
      workMs: 0,
      phase: 'idle',
      carry: 'apple',
      carryCount: 2,
      waitMs: 0,
      pos: PORTRAIT_MAP.staffStations.picker.home,
      prevPos: PORTRAIT_MAP.staffStations.picker.home,
    })

    const result = simulate(state, 320, fixedRng(0))
    expect(result.events.some((event) => event.type === 'staffFeed')).toBe(true)
    expect(result.state.producers[0]?.feed.apple).toBe(2)
  })
})

describe('staff breaks', () => {
  it('sends a picker to the vending machine after working long enough', () => {
    let state = pickerState()
    const picker = member(state, 'picker')
    state = withStaffState(state, picker.id, {
      workMs: REST.workMs + REST.workStaggerMs + 1,
      phase: 'idle',
      carry: null,
      carryCount: 0,
      waitMs: 0,
    })

    const next = stepStaff(state, 50, fixedRng(0)).state
    expect(member(next, 'picker').phase).toBe('toDrink')
    expect(member(next, 'picker').path.length).toBeGreaterThan(0)
  })

  it('carries goods to the shelf while the break timer is still low', () => {
    let state = createShopState(
      {
        ...initialSave(),
        producers: [{ product: 'apple', slot: 0 }],
        staff: { cashier: 0, picker: 1, chef: 0 },
      },
      PORTRAIT_MAP,
    )
    const picker = member(state, 'picker')
    state = withStaffState(state, picker.id, {
      workMs: 0,
      phase: 'idle',
      carry: 'apple',
      carryCount: 1,
      waitMs: 0,
    })

    const next = stepStaff(state, 50, fixedRng(0)).state
    expect(member(next, 'picker').phase).toBe('toShelf')
  })

  it('eats one carried item at the dining table when due for a break', () => {
    let state = createShopState(
      {
        ...initialSave(),
        producers: [{ product: 'apple', slot: 0 }],
        staff: { cashier: 0, picker: 1, chef: 0 },
      },
      PORTRAIT_MAP,
    )
    const picker = member(state, 'picker')
    state = withStaffState(state, picker.id, {
      workMs: 999_999,
      phase: 'idle',
      carry: 'apple',
      carryCount: 2,
      waitMs: 0,
    })

    let current = state
    let meal: GameEvent | undefined
    for (let tick = 0; tick < 800 && meal === undefined; tick += 1) {
      const result = stepStaff(current, 50, fixedRng(0))
      current = result.state
      meal = result.events.find((event) => event.type === 'staffMeal')
    }

    expect(meal?.type).toBe('staffMeal')
    if (meal?.type === 'staffMeal') expect(meal.product).toBe('apple')
    const after = member(current, 'picker')
    expect(after.carry).toBe('apple')
    expect(after.carryCount).toBe(1)
    expect(after.seatIndex).toBeNull()
  })

  it('keeps carrying instead of dropping goods when every seat is taken', () => {
    let state = createShopState(
      {
        ...initialSave(),
        producers: [{ product: 'apple', slot: 0 }],
        staff: { cashier: 0, picker: 2, chef: 0 },
      },
      PORTRAIT_MAP,
    )
    state = {
      ...state,
      dining: { ...state.dining, playerSeat: 0 },
      staffMembers: state.staffMembers.map((candidate, index) =>
        index === 0 ? { ...candidate, seatIndex: 1 } : candidate,
      ),
    }
    const second = member(state, 'picker', 1)
    state = withStaffState(state, second.id, {
      workMs: 999_999,
      phase: 'idle',
      carry: 'apple',
      carryCount: 2,
      waitMs: 0,
    })

    const next = stepStaff(state, 50, fixedRng(0)).state
    const after = member(next, 'picker', 1)
    expect(after.phase).toBe('toShelf')
    expect(after.carry).toBe('apple')
    expect(after.carryCount).toBe(2)
  })

  it('sends a cashier to fetch and eat one shelf item', () => {
    let state = createShopState(
      {
        ...initialSave(),
        producers: [{ product: 'apple', slot: 0 }],
        staff: { cashier: 1, picker: 0, chef: 0 },
      },
      PORTRAIT_MAP,
    )
    state = withShelfStock(state, 'fruit', 'apple', 2)
    const cashier = member(state, 'cashier')
    state = withStaffState(state, cashier.id, {
      workMs: 999_999,
      phase: 'cashier',
      pos: PORTRAIT_MAP.shelfAccess.fruit,
      prevPos: PORTRAIT_MAP.shelfAccess.fruit,
      waitMs: 0,
    })

    let current = state
    let meal: GameEvent | undefined
    for (let tick = 0; tick < 1_200 && meal === undefined; tick += 1) {
      const result = stepStaff(current, 50, fixedRng(0))
      current = result.state
      meal = result.events.find((event) => event.type === 'staffMeal')
    }

    expect(meal?.type).toBe('staffMeal')
    if (meal?.type === 'staffMeal') expect(meal.product).toBe('apple')
    expect(current.shelves.fruit.stock.apple).toBe(1)
    expect(member(current, 'cashier').carry).toBeNull()
  })

  it('staggering lets the second picker work longer', () => {
    let state = pickerState(2)
    const first = member(state, 'picker', 0)
    const second = member(state, 'picker', 1)
    state = withStaffState(state, first.id, {
      workMs: REST.workMs + REST.workStaggerMs + 1,
      phase: 'idle',
      waitMs: 0,
    })
    state = withStaffState(state, second.id, {
      workMs: REST.workMs + REST.workStaggerMs + 1,
      phase: 'idle',
      waitMs: 0,
    })

    const next = stepStaff(state, 50, fixedRng(0)).state
    expect(member(next, 'picker', 0).phase).toBe('toDrink')
    expect(member(next, 'picker', 1).phase).not.toBe('toDrink')
  })

  it('auto-returns after a successful drink roll', () => {
    let state = pickerState()
    const picker = member(state, 'picker')
    state = withStaffState(state, picker.id, {
      workMs: 999_999,
      phase: 'idle',
      carry: null,
      carryCount: 0,
      waitMs: 0,
    })
    const walked = simulate(state, 300, fixedRng(0))
    state = walked.state
    expect(walked.events.some((event) => event.type === 'staffDrink')).toBe(true)
    expect(['toDrink', 'drinking', 'toWork', 'idle']).toContain(member(state, 'picker').phase)
    expect(member(state, 'picker').phase).not.toBe('resting')

    const returned = simulate(state, 400, fixedRng(0)).state
    expect(member(returned, 'picker').phase).not.toBe('resting')
    expect(member(returned, 'picker').workMs).toBeLessThan(REST.workMs)
  })

  it('rests indefinitely on a failed roll until the player nudges', () => {
    let state = pickerState()
    const picker = member(state, 'picker')
    state = withStaffState(state, picker.id, {
      workMs: 999_999,
      phase: 'idle',
      carry: null,
      carryCount: 0,
      waitMs: 0,
    })
    const result = simulate(state, 600, fixedRng(99))
    state = result.state
    expect(result.events.some((event) => event.type === 'staffLazy')).toBe(true)
    expect(member(state, 'picker').phase).toBe('resting')

    const urged = urgeStaff(state, picker.id)
    expect(urged.state.staffMembers.find((candidate) => candidate.id === picker.id)?.phase).toBe(
      'toWork',
    )
    expect(urged.events.some((event) => event.type === 'staffUrged')).toBe(true)

    const back = simulate(urged.state, 400, fixedRng(0)).state
    expect(member(back, 'picker').phase).not.toBe('resting')
    expect(member(back, 'picker').phase).not.toBe('toWork')
  })

  it('does not send a cashier away while someone is queued', () => {
    let state = createShopState(
      {
        ...initialSave(),
        staff: { cashier: 1, picker: 0, chef: 0 },
      },
      PORTRAIT_MAP,
    )
    const cashier = member(state, 'cashier')
    state = withStaffState(state, cashier.id, { workMs: 999_999 })
    const queued: ShopState = { ...state, queue: [999] }
    const busy = stepStaff(queued, 50, fixedRng(0)).state
    expect(member(busy, 'cashier').phase).toBe('cashier')

    const empty = stepStaff(state, 50, fixedRng(0)).state
    expect(member(empty, 'cashier').phase).toBe('toDrink')
    expect(activeCashier(empty.staffMembers)).toBe(false)
  })

  it('does not send a cashier away mid-scan', () => {
    let state = createShopState(
      {
        ...initialSave(),
        staff: { cashier: 1, picker: 0, chef: 0 },
      },
      PORTRAIT_MAP,
    )
    const cashier = member(state, 'cashier')
    state = withStaffState(state, cashier.id, { workMs: 999_999 })
    const busy: ShopState = {
      ...state,
      queue: [999],
      register: { customerId: 999, scanMs: 100 },
    }
    const next = stepStaff(busy, 50, fixedRng(0)).state
    expect(member(next, 'cashier').phase).toBe('cashier')
  })
})

function chefState(chefs = 1): ShopState {
  return createShopState(
    {
      ...initialSave(),
      zones: { fruit: true, veg: true, farm: true, kitchen: true },
      producers: [
        { product: 'cake', slot: 0 },
        { product: 'egg', slot: 0 },
        { product: 'milk', slot: 1 },
      ],
      staff: { cashier: 0, picker: 0, chef: chefs },
    },
    PORTRAIT_MAP,
  )
}

function withStationReady(state: ShopState, ready: number): ShopState {
  return {
    ...state,
    producers: state.producers.map((producer) =>
      producer.product === 'cake' ? { ...producer, ready } : producer,
    ),
  }
}

function withShelfStock(
  state: ShopState,
  zone: ZoneId,
  product: ProductKind,
  amount: number,
): ShopState {
  const shelf = state.shelves[zone]
  return {
    ...state,
    shelves: {
      ...state.shelves,
      [zone]: {
        ...shelf,
        stock: { ...shelf.stock, [product]: amount },
        everStocked: { ...shelf.everStocked, [product]: amount > 0 },
      },
    },
  }
}

describe('chef staff', () => {
  it('carries a finished dish from the station tray to the kitchen shelf', () => {
    let state = withStationReady(chefState(), 1)
    const chef = member(state, 'chef')
    state = withStaffState(state, chef.id, {
      workMs: 0,
      phase: 'idle',
      carry: null,
      carryCount: 0,
      waitMs: 0,
    })

    const result = simulate(state, 140, fixedRng(0))
    expect(
      result.events.some((event) => event.type === 'staffHarvest' && event.product === 'cake'),
    ).toBe(true)
    expect(
      result.events.some((event) => event.type === 'staffStock' && event.product === 'cake'),
    ).toBe(true)
    expect(result.state.shelves.kitchen.stock.cake).toBe(1)
    expect(result.state.producers.find((producer) => producer.product === 'cake')?.ready).toBe(0)
  })

  it('waits instead of collecting when the kitchen shelf is full', () => {
    const base = chefState()
    const full = withShelfStock(base, 'kitchen', 'cake', base.shelves.kitchen.capacity)
    let state = withStationReady(full, 1)
    const chef = member(state, 'chef')
    state = withStaffState(state, chef.id, { phase: 'idle', waitMs: 0 })

    const result = simulate(state, 120, fixedRng(0))
    expect(result.events.some((event) => event.type === 'staffStock')).toBe(false)
    expect(result.state.producers.find((producer) => producer.product === 'cake')?.ready).toBe(1)
  })

  it('fetches shelf ingredients and tops up a station hopper', () => {
    let state = withShelfStock(chefState(), 'farm', 'egg', 6)
    state = withShelfStock(state, 'farm', 'milk', 3)
    const chef = member(state, 'chef')
    state = withStaffState(state, chef.id, { phase: 'idle', waitMs: 0 })

    const result = simulate(state, 220, fixedRng(0))
    const station = result.state.producers.find((producer) => producer.product === 'cake')
    expect(station?.hopper.egg).toBe(6)
    expect(result.state.shelves.farm.stock.egg).toBe(0)
    expect(
      result.events.some((event) => event.type === 'stationLoad' && event.product === 'egg'),
    ).toBe(true)
  })

  it('puts leftover ingredients back when the hopper fills mid-trip', () => {
    let state = withShelfStock(chefState(), 'farm', 'egg', 6)
    state = {
      ...state,
      producers: state.producers.map((producer) =>
        producer.product === 'cake' ? { ...producer, hopper: { egg: 4 } } : producer,
      ),
    }
    const chef = member(state, 'chef')
    state = withStaffState(state, chef.id, { phase: 'idle', waitMs: 0 })

    const result = simulate(state, 300, fixedRng(0))
    const station = result.state.producers.find((producer) => producer.product === 'cake')
    expect(station?.hopper.egg).toBe(6)
    expect(result.state.shelves.farm.stock.egg).toBe(4)
  })

  it('gives two chefs their own ids and home spots', () => {
    const state = chefState(2)
    const first = member(state, 'chef', 0)
    const second = member(state, 'chef', 1)
    expect(first.id).not.toBe(second.id)
    expect(first.home).not.toEqual(second.home)
  })

  it('lets two chefs claim different stations', () => {
    let state = createShopState(
      {
        ...initialSave(),
        zones: { fruit: true, veg: true, farm: true, kitchen: true },
        producers: [
          { product: 'cake', slot: 0 },
          { product: 'juice', slot: 3 },
        ],
        staff: { cashier: 0, picker: 0, chef: 2 },
      },
      PORTRAIT_MAP,
    )
    state = {
      ...state,
      producers: state.producers.map((producer) => ({ ...producer, ready: 1 })),
    }

    const result = simulate(state, 8, fixedRng(0))
    const first = member(result.state, 'chef', 0)
    const second = member(result.state, 'chef', 1)
    expect(first.targetProducerId).not.toBeNull()
    expect(second.targetProducerId).not.toBeNull()
    expect(first.targetProducerId).not.toBe(second.targetProducerId)
  })

  it('sends a chef to the vending machine after working long enough', () => {
    let state = chefState()
    const chef = member(state, 'chef')
    state = withStaffState(state, chef.id, {
      workMs: REST.workMs + REST.workStaggerMs * 3 + 1,
      phase: 'idle',
      carry: null,
      carryCount: 0,
      waitMs: 0,
    })

    const next = stepStaff(state, 50, fixedRng(0)).state
    expect(member(next, 'chef').phase).toBe('toDrink')
  })
})
