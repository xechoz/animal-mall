import { describe, expect, it } from 'vitest'
import { UPGRADES } from './config'
import {
  emptyPlantSlot,
  plantedCount,
  purchasePlant,
  purchaseProducer,
  purchaseUpgrade,
  purchaseZone,
  removeProducer,
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
    const outcome = purchasePlant(state, 'apple')
    expect(outcome.result).toBe('ok')
    expect(outcome.state.coins).toBe(0)
    expect(outcome.state.producers).toHaveLength(1)
    expect(outcome.state.producers[0]?.slot).toBe(0)
    expect(outcome.state.shelves.fruit.bins.apple).toBe(true)
    expect(outcome.state.tutorial).toBe('grow')
  })

  it('rejects a plant without enough coins or an empty slot', () => {
    const state = createShopState(initialSave())
    expect(purchasePlant(state, 'pear').result).toBe('insufficient')

    let rich = createShopState(saveWith(10_000))
    for (let index = 0; index < 4; index += 1) {
      rich = purchasePlant(rich, 'apple').state
    }
    expect(emptyPlantSlot(rich, 'fruit')).toBeNull()
    expect(purchasePlant(rich, 'pear').result).toBe('noSlot')
  })

  it('keeps one bin per planted product', () => {
    let state = createShopState(saveWith(10_000))
    state = purchasePlant(state, 'apple').state
    state = purchasePlant(state, 'pear').state
    expect(plantedCount(state, 'apple')).toBe(1)
    expect(state.shelves.fruit.bins.apple).toBe(true)
    expect(state.shelves.fruit.bins.pear).toBe(true)
    expect(state.shelves.fruit.bins.peach).toBe(false)
  })

  it('upgrades once per level and enforces the cap', () => {
    let state = createShopState(saveWith(10_000))
    for (let level = 0; level < UPGRADES.shelf.costs.length; level += 1) {
      const cost = upgradeCost('shelf', level)
      expect(cost).not.toBeNull()
      const outcome = purchaseUpgrade(state, 'shelf')
      expect(outcome.result).toBe('ok')
      state = outcome.state
    }
    expect(purchaseUpgrade(state, 'shelf').result).toBe('maxed')
  })

  it('refunds half a removed plant and locks its bin', () => {
    let state = createShopState(saveWith(1_000))
    state = purchasePlant(state, 'apple').state
    const before = state.coins
    const id = state.producers[0]?.id
    expect(id).toBeDefined()
    const outcome = removeProducer(state, id as number)
    expect(outcome.result).toBe('ok')
    expect(outcome.state.producers).toHaveLength(0)
    expect(outcome.state.coins).toBe(before + 50)
    expect(outcome.state.shelves.fruit.bins.apple).toBe(false)
  })

  it('requires the first sale before vegetables unlock', () => {
    const state = createShopState(initialSave())
    expect(purchaseZone(state, 'veg').result).toBe('locked')
    const served = createShopState({ ...initialSave(), served: 1 })
    const outcome = purchaseZone(served, 'veg')
    expect(outcome.result).toBe('ok')
    expect(outcome.state.zones.veg).toBe(true)
  })

  it('unlocks the farm with a chicken and the kitchen with an oven', () => {
    const farm = purchaseZone(createShopState(saveWith(600)), 'farm')
    expect(farm.result).toBe('ok')
    expect(farm.state.zones.farm).toBe(true)
    expect(farm.state.producers.some((producer) => producer.product === 'egg')).toBe(true)

    const kitchen = purchaseZone(createShopState(saveWith(1_200)), 'kitchen')
    expect(kitchen.result).toBe('ok')
    expect(kitchen.state.zones.kitchen).toBe(true)
    expect(kitchen.state.producers.some((producer) => producer.product === 'cake')).toBe(true)
  })

  it('locks animal purchases behind their zone', () => {
    const locked = purchaseProducer(createShopState(saveWith(1_000)), 'milk')
    expect(locked.result).toBe('lockedZone')

    const farm = purchaseZone(createShopState(saveWith(1_600)), 'farm').state
    const cow = purchaseProducer(farm, 'milk')
    expect(cow.result).toBe('ok')
    expect(cow.state.producers.some((producer) => producer.product === 'milk')).toBe(true)
  })

  it('does not go negative', () => {
    const state = createShopState(initialSave())
    const outcome = purchasePlant(state, 'cherry')
    expect(outcome.result).toBe('insufficient')
    expect(outcome.state.coins).toBe(100)
  })
})
