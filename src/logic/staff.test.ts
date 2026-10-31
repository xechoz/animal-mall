import type { Rng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import { PORTRAIT_MAP, REST } from './config'
import { initialSave } from './saveData'
import { activeCashier, staffMemberId, stepStaff, urgeStaff } from './staff'
import { createShopState } from './state'
import type { GameEvent, ShopState, StaffState } from './types'

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

function member(state: ShopState, kind: 'cashier' | 'picker', index = 0): StaffState {
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
      staff: { cashier: 0, picker: count },
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
      staff: { cashier: 0, picker: 1 },
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

  it('finishes carrying goods before taking a break', () => {
    let state = createShopState(
      {
        ...initialSave(),
        producers: [{ product: 'apple', slot: 0 }],
        staff: { cashier: 0, picker: 1 },
      },
      PORTRAIT_MAP,
    )
    const picker = member(state, 'picker')
    state = withStaffState(state, picker.id, {
      workMs: 999_999,
      phase: 'idle',
      carry: 'apple',
      carryCount: 1,
      waitMs: 0,
    })

    const next = stepStaff(state, 50, fixedRng(0)).state
    expect(member(next, 'picker').phase).toBe('toShelf')
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
    state = simulate(state, 300, fixedRng(0)).state
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
        staff: { cashier: 1, picker: 0 },
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
        staff: { cashier: 1, picker: 0 },
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
