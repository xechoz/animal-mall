import { describe, expect, it } from 'vitest'
import { UPGRADES } from './config'
import {
  emptyPlot,
  plantedCount,
  purchaseTree,
  purchaseUpgrade,
  removeTree,
  treeCost,
  upgradeCost,
} from './purchase'
import { initialSave } from './saveData'
import { createShopState } from './state'
import type { SaveData } from './types'

function saveWith(coins: number): SaveData {
  return { ...initialSave(), coins }
}

describe('purchases', () => {
  it('spends the starting 100 coins on the first apple tree', () => {
    const state = createShopState(initialSave())
    expect(state.coins).toBe(100)
    const outcome = purchaseTree(state, 'apple')
    expect(outcome.result).toBe('ok')
    expect(outcome.state.coins).toBe(0)
    expect(outcome.state.trees).toHaveLength(1)
    expect(outcome.state.trees[0]?.plot).toBe(0)
    expect(outcome.state.shelves.apple.active).toBe(true)
    expect(outcome.state.tutorial).toBe('grow')
  })

  it('rejects a tree without enough coins or an empty plot', () => {
    const state = createShopState(initialSave())
    expect(purchaseTree(state, 'pear').result).toBe('insufficient')

    let rich = createShopState(saveWith(10_000))
    for (const kind of ['apple', 'apple', 'apple', 'apple'] as const) {
      rich = purchaseTree(rich, kind).state
    }
    expect(emptyPlot(rich)).toBeNull()
    expect(purchaseTree(rich, 'pear').result).toBe('noPlot')
  })

  it('keeps track of one shelf per planted fruit type', () => {
    let state = createShopState(saveWith(10_000))
    state = purchaseTree(state, 'apple').state
    state = purchaseTree(state, 'pear').state
    expect(plantedCount(state, 'apple')).toBe(1)
    expect(state.shelves.apple.active).toBe(true)
    expect(state.shelves.pear.active).toBe(true)
    expect(state.shelves.peach.active).toBe(false)
  })

  it('upgrades once per level and enforces the cap', () => {
    let state = createShopState(saveWith(10_000))
    for (let level = 0; level < UPGRADES.shelf.costs.length; level += 1) {
      const cost = upgradeCost('shelf', level)
      expect(cost).not.toBeNull()
      const outcome = purchaseUpgrade(state, 'shelf')
      expect(outcome.result).toBe('ok')
      state = outcome.state
      expect(state.coins).toBe(10_000 - sum(UPGRADES.shelf.costs.slice(0, level + 1)))
    }
    expect(purchaseUpgrade(state, 'shelf').result).toBe('maxed')
  })

  it('refunds half a removed tree and locks the shelf', () => {
    let state = createShopState(saveWith(1_000))
    state = purchaseTree(state, 'apple').state
    const before = state.coins
    const outcome = removeTree(state, 0)
    expect(outcome.result).toBe('ok')
    expect(outcome.state.trees).toHaveLength(0)
    expect(outcome.state.coins).toBe(before + Math.floor(treeCost('apple') / 2))
    expect(outcome.state.shelves.apple.active).toBe(false)
  })

  it('does not go negative', () => {
    const state = createShopState(initialSave())
    const outcome = purchaseTree(state, 'cherry')
    expect(outcome.result).toBe('insufficient')
    expect(outcome.state.coins).toBe(100)
  })
})

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0)
}
