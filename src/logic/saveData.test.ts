import { describe, expect, it } from 'vitest'
import { STARTING_COINS } from './config'
import { initialSave, migrateSave } from './saveData'

describe('save data', () => {
  it('starts with the shop opening fund', () => {
    const save = initialSave()
    expect(save.coins).toBe(STARTING_COINS)
    expect(save.trees).toHaveLength(0)
    expect(save.served).toBe(0)
    expect(save.pendingCoins).toBe(0)
    expect(save.staff).toEqual({ cashier: 0, picker: 0 })
    expect(save.deposits).toEqual({})
  })

  it('normalizes an old or partial payload', () => {
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
    expect(save.trees).toEqual([{ kind: 'apple', plot: 0 }])
    expect(save.upgrades.carry).toBe(2)
    expect(save.upgrades.shelf).toBe(3)
    expect(save.upgrades.scan).toBe(0)
    expect(save.upgrades.speed).toBe(0)
  })

  it('falls back to a fresh save for garbage input', () => {
    expect(migrateSave(null).coins).toBe(STARTING_COINS)
    expect(migrateSave('nope').trees).toHaveLength(0)
  })

  it('migrates a v1 payload with staff, deposits and pending coins defaults', () => {
    const save = migrateSave({
      coins: 120,
      totalEarned: 30,
      served: 4,
      trees: [{ kind: 'apple', plot: 0 }],
      upgrades: { carry: 1 },
    })
    expect(save.staff).toEqual({ cashier: 0, picker: 0 })
    expect(save.deposits).toEqual({})
    expect(save.pendingCoins).toBe(0)
    expect(save.coins).toBe(120)
  })

  it('keeps valid deposits and refunds a no-income save', () => {
    const valid = migrateSave({
      coins: 0,
      trees: [{ kind: 'apple', plot: 0 }],
      deposits: { 'tree:pear': 90 },
    })
    expect(valid.deposits['tree:pear']).toBe(90)
    expect(valid.coins).toBe(0)

    const stranded = migrateSave({
      coins: 0,
      trees: [{ kind: 'apple', plot: 0 }],
      deposits: { 'tree:pear': 90, 'staff:cashier': 40 },
    })
    expect(stranded.deposits['tree:pear']).toBe(90)
    expect(stranded.deposits['staff:cashier']).toBe(40)

    const noTree = migrateSave({
      coins: 0,
      trees: [],
      deposits: { 'tree:pear': 90, 'staff:cashier': 40 },
    })
    expect(noTree.deposits).toEqual({})
    expect(noTree.coins).toBe(130)
  })
})
