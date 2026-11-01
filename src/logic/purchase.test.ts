import { describe, expect, it } from 'vitest'
import { PORTRAIT_MAP, plantSlotCount } from './config'
import {
  emptyPlantSlot,
  installProducerAt,
  plantedCount,
  purchasePlant,
  purchaseProducer,
  purchaseShelfUpgrade,
  purchaseZone,
  removeProducer,
  replacePlantAt,
  shelfUpgradeCostFor,
  shelfUpgradeMaxLevel,
} from './purchase'
import { initialSave } from './saveData'
import { createShopState } from './state'
import type { SaveData } from './types'

function saveWith(coins: number): SaveData {
  return { ...initialSave(), coins }
}

describe('purchases', () => {
  it('spends the starting 100 coins on the first apple tree', () => {
    const state = createShopState(initialSave(), PORTRAIT_MAP)
    expect(state.coins).toBe(100)
    const outcome = purchasePlant(state, 'apple')
    expect(outcome.result).toBe('ok')
    expect(outcome.state.coins).toBe(20)
    expect(outcome.state.producers).toHaveLength(1)
    expect(outcome.state.producers[0]?.slot).toBe(0)
    expect(outcome.state.shelves.fruit.bins.apple).toBe(true)
    expect(outcome.state.tutorial).toBe('grow')
  })

  it('rejects a plant without enough coins or an empty slot', () => {
    const state = createShopState(initialSave(), PORTRAIT_MAP)
    expect(purchasePlant(state, 'pear').result).toBe('insufficient')

    let rich = createShopState(saveWith(10_000), PORTRAIT_MAP)
    for (let index = 0; index < plantSlotCount('fruit'); index += 1) {
      rich = purchasePlant(rich, 'apple').state
    }
    expect(emptyPlantSlot(rich, 'fruit')).toBeNull()
    expect(purchasePlant(rich, 'pear').result).toBe('noSlot')
  })

  it('keeps one bin per planted product', () => {
    let state = createShopState(saveWith(10_000), PORTRAIT_MAP)
    state = purchasePlant(state, 'apple').state
    state = purchasePlant(state, 'pear').state
    expect(plantedCount(state, 'apple')).toBe(1)
    expect(state.shelves.fruit.bins.apple).toBe(true)
    expect(state.shelves.fruit.bins.pear).toBe(true)
    expect(state.shelves.fruit.bins.peach).toBe(false)
  })

  it('upgrades each shelf zone on its own and enforces the cap', () => {
    let state = createShopState(saveWith(10_000), PORTRAIT_MAP)
    for (let level = 0; level < shelfUpgradeMaxLevel(); level += 1) {
      expect(shelfUpgradeCostFor(level)).not.toBeNull()
      const outcome = purchaseShelfUpgrade(state, 'fruit')
      expect(outcome.result).toBe('ok')
      state = outcome.state
    }
    expect(purchaseShelfUpgrade(state, 'fruit').result).toBe('maxed')
    expect(state.shelfLevels.fruit).toBe(3)
    expect(state.shelfLevels.veg).toBe(0)
    expect(state.shelves.fruit.capacity).toBeGreaterThan(state.shelves.veg.capacity)
  })

  it('refunds half a removed plant and locks its bin', () => {
    let state = createShopState(saveWith(1_000), PORTRAIT_MAP)
    state = purchasePlant(state, 'apple').state
    const before = state.coins
    const id = state.producers[0]?.id
    expect(id).toBeDefined()
    const outcome = removeProducer(state, id as number)
    expect(outcome.result).toBe('ok')
    expect(outcome.state.producers).toHaveLength(0)
    expect(outcome.state.coins).toBe(before + 40)
    expect(outcome.state.shelves.fruit.bins.apple).toBe(false)
  })

  it('swaps a planted crop and refunds half of the old one', () => {
    let state = createShopState(saveWith(1_000), PORTRAIT_MAP)
    state = purchasePlant(state, 'apple').state
    const before = state.coins
    const outcome = replacePlantAt(state, 'pear', 0)
    expect(outcome.result).toBe('ok')
    expect(outcome.state.producers).toHaveLength(1)
    expect(outcome.state.producers[0]?.product).toBe('pear')
    expect(outcome.state.coins).toBe(before - 140 + 40)
    expect(
      outcome.events.some(
        (event) => event.type === 'producerReplaced' && event.previous === 'apple',
      ),
    ).toBe(true)
  })

  it('requires the first sale before vegetables unlock', () => {
    const state = createShopState(initialSave(), PORTRAIT_MAP)
    expect(purchaseZone(state, 'veg').result).toBe('locked')
    const served = createShopState({ ...initialSave(), served: 1 }, PORTRAIT_MAP)
    const outcome = purchaseZone(served, 'veg')
    expect(outcome.result).toBe('ok')
    expect(outcome.state.zones.veg).toBe(true)
  })

  it('unlocks the farm with a chicken and the kitchen with an oven', () => {
    const farm = purchaseZone(createShopState(saveWith(600), PORTRAIT_MAP), 'farm')
    expect(farm.result).toBe('ok')
    expect(farm.state.zones.farm).toBe(true)
    expect(farm.state.producers.some((producer) => producer.product === 'egg')).toBe(true)

    const kitchen = purchaseZone(createShopState(saveWith(1_200), PORTRAIT_MAP), 'kitchen')
    expect(kitchen.result).toBe('ok')
    expect(kitchen.state.zones.kitchen).toBe(true)
    expect(kitchen.state.producers.some((producer) => producer.product === 'cake')).toBe(true)
  })

  it('locks animal purchases behind their zone', () => {
    const locked = purchaseProducer(createShopState(saveWith(1_000), PORTRAIT_MAP), 'milk')
    expect(locked.result).toBe('lockedZone')

    const farm = purchaseZone(createShopState(saveWith(1_600), PORTRAIT_MAP), 'farm').state
    const cow = purchaseProducer(farm, 'milk')
    expect(cow.result).toBe('ok')
    expect(cow.state.producers.some((producer) => producer.product === 'milk')).toBe(true)
  })

  it('does not go negative', () => {
    const state = createShopState(initialSave(), PORTRAIT_MAP)
    const outcome = purchasePlant(state, 'cherry')
    expect(outcome.result).toBe('insufficient')
    expect(outcome.state.coins).toBe(100)
  })
})

describe('producer slots', () => {
  function richSave(): SaveData {
    return {
      ...initialSave(),
      coins: 10_000,
      zones: { fruit: true, veg: true, farm: true, kitchen: true },
    }
  }

  it('installs an animal into a chosen pen and rejects duplicates', () => {
    const state = createShopState(richSave(), PORTRAIT_MAP)
    const cow = installProducerAt(state, 'milk', 2)
    expect(cow.result).toBe('ok')
    expect(cow.state.producers.find((producer) => producer.product === 'milk')?.slot).toBe(2)
    expect(installProducerAt(cow.state, 'milk', 3).result).toBe('maxed')
  })

  it('replaces a pen animal and refunds half of the old one', () => {
    let state = createShopState(richSave(), PORTRAIT_MAP)
    state = installProducerAt(state, 'milk', 0).state
    const before = state.coins
    const outcome = installProducerAt(state, 'cheese', 0)
    expect(outcome.result).toBe('ok')
    expect(outcome.state.producers.find((producer) => producer.slot === 0)?.product).toBe('cheese')
    expect(outcome.state.coins).toBe(before - 700 + 175)
    expect(
      outcome.events.some(
        (event) => event.type === 'producerReplaced' && event.previous === 'milk',
      ),
    ).toBe(true)
  })

  it('replaces a kitchen machine with the new recipe', () => {
    let state = createShopState(richSave(), PORTRAIT_MAP)
    state = installProducerAt(state, 'cake', 1).state
    const before = state.coins
    const outcome = installProducerAt(state, 'jam', 1)
    expect(outcome.result).toBe('ok')
    expect(outcome.state.producers.find((producer) => producer.slot === 1)?.product).toBe('jam')
    expect(outcome.state.coins).toBe(before - 380)
    expect(outcome.state.shelves.kitchen.bins.jam).toBe(true)
    expect(outcome.state.shelves.kitchen.bins.cake).toBe(false)
  })

  it('reports no free slot when all four pens are full', () => {
    let state = createShopState(richSave(), PORTRAIT_MAP)
    for (const product of ['egg', 'milk', 'yarn', 'fish'] as const) {
      const outcome = purchaseProducer(state, product)
      expect(outcome.result).toBe('ok')
      state = outcome.state
    }
    expect(purchaseProducer(state, 'cheese').result).toBe('noSlot')
  })

  it('keeps carried goods and shelf stock when a producer is swapped', () => {
    let state = createShopState(richSave(), PORTRAIT_MAP)
    state = installProducerAt(state, 'milk', 0).state
    state = {
      ...state,
      player: { ...state.player, carry: { milk: 2 } },
      shelves: {
        ...state.shelves,
        farm: { ...state.shelves.farm, stock: { ...state.shelves.farm.stock, milk: 3 } },
      },
    }
    const outcome = installProducerAt(state, 'cheese', 0)
    expect(outcome.result).toBe('ok')
    expect(outcome.state.player.carry.milk).toBe(2)
    expect(outcome.state.shelves.farm.stock.milk).toBe(3)
  })
})
