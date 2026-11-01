import { describe, expect, it } from 'vitest'
import { STARTING_COINS } from './config'
import { initialSave, migrateSave } from './saveData'

describe('save data', () => {
  it('starts with the shop opening fund and only the fruit zone', () => {
    const save = initialSave()
    expect(save.coins).toBe(STARTING_COINS)
    expect(save.producers).toHaveLength(0)
    expect(save.zones).toEqual({ fruit: true, veg: false, farm: false, kitchen: false })
    expect(save.served).toBe(0)
    expect(save.pendingCoins).toBe(0)
    expect(save.staff).toEqual({ cashier: 0, picker: 0, chef: 0 })
    expect(save.shelfLevels).toEqual({ fruit: 0, veg: 0, farm: 0, kitchen: 0 })
    expect(save.deposits).toEqual({})
  })

  it('adds a zero-level chef when migrating an older save', () => {
    const save = migrateSave({ coins: 40, staff: { cashier: 1, picker: 2 } })
    expect(save.staff).toEqual({ cashier: 1, picker: 2, chef: 0 })
  })

  it('migrates old v2 trees into producers and unlocks vegetables after a sale', () => {
    const save = migrateSave({
      coins: 42.8,
      totalEarned: 70,
      served: 2,
      trees: [
        { kind: 'apple', plot: 0 },
        { kind: 'apple', plot: 0 },
        { kind: 'not-a-fruit', plot: 1 },
        { kind: 'pear', plot: 9 },
      ],
      upgrades: { carry: 2, shelf: 99, scan: -4 },
    })
    expect(save.coins).toBe(42)
    expect(save.producers).toEqual([{ product: 'apple', slot: 0 }])
    expect(save.zones.fruit).toBe(true)
    expect(save.zones.veg).toBe(true)
    expect(save.upgrades.carry).toBe(2)
    expect(save.shelfLevels).toEqual({ fruit: 3, veg: 3, farm: 3, kitchen: 3 })
    expect(save.upgrades.scan).toBe(0)
    expect(save.upgrades.speed).toBe(0)
  })

  it('keeps valid producers in every zone and rejects duplicates', () => {
    const save = migrateSave({
      coins: 100,
      producers: [
        { product: 'apple', slot: 0 },
        { product: 'apple', slot: 0 },
        { product: 'carrot', slot: 1 },
        { product: 'egg', slot: 0 },
        { product: 'egg', slot: 1 },
        { product: 'cake', slot: 0 },
        { product: 'unknown', slot: 0 },
      ],
      zones: { farm: true, kitchen: true },
    })
    expect(save.producers).toEqual([
      { product: 'apple', slot: 0 },
      { product: 'carrot', slot: 1 },
      { product: 'egg', slot: 0 },
      { product: 'cake', slot: 0 },
    ])
    expect(save.zones.fruit).toBe(true)
    expect(save.zones.farm).toBe(true)
    expect(save.zones.kitchen).toBe(true)
    expect(save.zones.veg).toBe(true)
  })

  it('validates planting slots per zone: fruit has 6, vegetables have 12', () => {
    const save = migrateSave({
      coins: 100,
      producers: [
        { product: 'apple', slot: 5 },
        { product: 'carrot', slot: 11 },
        { product: 'pear', slot: 6 },
        { product: 'tomato', slot: 12 },
      ],
      zones: { farm: true },
    })
    expect(save.producers).toEqual([
      { product: 'apple', slot: 5 },
      { product: 'carrot', slot: 11 },
    ])
  })

  it('restores the new animals and machines in their slots', () => {
    const save = migrateSave({
      coins: 100,
      producers: [
        { product: 'cheese', slot: 2 },
        { product: 'honey', slot: 3 },
        { product: 'jam', slot: 1 },
        { product: 'iceCream', slot: 3 },
      ],
      zones: { farm: true, kitchen: true },
    })
    expect(save.producers).toEqual([
      { product: 'cheese', slot: 2 },
      { product: 'honey', slot: 3 },
      { product: 'jam', slot: 1 },
      { product: 'iceCream', slot: 3 },
    ])
  })

  it('validates farm and kitchen slots and moves an occupied duplicate', () => {
    const save = migrateSave({
      coins: 100,
      producers: [
        { product: 'egg', slot: 1 },
        { product: 'milk', slot: 1 },
        { product: 'cheese', slot: 4 },
        { product: 'jam', slot: 4 },
        { product: 'cake', slot: 0 },
      ],
      zones: { farm: true, kitchen: true },
    })
    expect(save.producers).toEqual([
      { product: 'egg', slot: 1 },
      { product: 'milk', slot: 0 },
      { product: 'cake', slot: 0 },
    ])
  })

  it('restores the newer fruit and vegetable kinds', () => {
    const save = migrateSave({
      coins: 100,
      producers: [
        { product: 'strawberry', slot: 2 },
        { product: 'grape', slot: 3 },
        { product: 'potato', slot: 0 },
        { product: 'eggplant', slot: 1 },
      ],
      zones: { farm: true },
    })
    expect(save.producers).toEqual([
      { product: 'strawberry', slot: 2 },
      { product: 'grape', slot: 3 },
      { product: 'potato', slot: 0 },
      { product: 'eggplant', slot: 1 },
    ])
  })

  it('converts old tree deposits to plant deposits', () => {
    const save = migrateSave({
      coins: 0,
      trees: [{ kind: 'apple', plot: 0 }],
      deposits: { 'tree:pear': 90, 'staff:cashier': 40 },
    })
    expect(save.deposits['plant:pear']).toBe(90)
    expect(save.deposits['staff:cashier']).toBe(40)
  })

  it('never strands a save with no producers', () => {
    const save = migrateSave({
      coins: 0,
      trees: [],
      deposits: { 'tree:pear': 90, 'staff:cashier': 40 },
    })
    expect(save.deposits).toEqual({})
    expect(save.coins).toBe(130)
  })

  it('falls back to a fresh save for garbage input', () => {
    expect(migrateSave(null).coins).toBe(STARTING_COINS)
    expect(migrateSave('nope').producers).toHaveLength(0)
  })
})
