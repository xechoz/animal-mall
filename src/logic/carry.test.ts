import { describe, expect, it } from 'vitest'
import {
  addCarry,
  carriedKinds,
  carryOf,
  carryTotal,
  EMPTY_CARRY,
  removeCarry,
  takeCarry,
} from './carry'

describe('carry basket', () => {
  it('counts every kind and lists them in product order', () => {
    const carry = { apple: 2, carrot: 3, pear: 1 }
    expect(carryTotal(carry)).toBe(6)
    expect(carriedKinds(carry)).toEqual(['apple', 'pear', 'carrot'])
  })

  it('adds to an existing kind or starts a new one', () => {
    const carried = addCarry({ apple: 2 }, 'pear', 1)
    expect(carried).toEqual({ apple: 2, pear: 1 })
    expect(addCarry(carried, 'apple', 2)).toEqual({ apple: 4, pear: 1 })
    expect(addCarry(EMPTY_CARRY, 'apple', 1)).toEqual({ apple: 1 })
  })

  it('takes a partial or full amount and drops empty kinds', () => {
    const partial = takeCarry({ apple: 3, pear: 1 }, 'apple', 2)
    expect(partial).toEqual({ carry: { apple: 1, pear: 1 }, taken: 2 })

    const full = takeCarry({ apple: 2 }, 'apple', 5)
    expect(full).toEqual({ carry: {}, taken: 2 })
    expect(carryOf(full.carry, 'apple')).toBe(0)
  })

  it('ignores removing a kind that is not carried', () => {
    const carry = { apple: 1 }
    expect(removeCarry(carry, 'apple')).toEqual({})
    expect(removeCarry(carry, 'pear')).toBe(carry)
  })
})
