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
    expect(save.staff).toEqual({ cashier: 0, picker: 0 })
    expect(save.deposits).toEqual({})
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
    expect(save.upgrades.shelf).toBe(3)
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

  it('accepts the sixth planting slot and rejects a seventh', () => {
    const save = migrateSave({
      coins: 100,
      producers: [
        { product: 'apple', slot: 5 },
        { product: 'carrot', slot: 5 },
        { product: 'pear', slot: 6 },
      ],
      zones: { farm: true },
    })
    expect(save.producers).toEqual([
      { product: 'apple', slot: 5 },
      { product: 'carrot', slot: 5 },
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
