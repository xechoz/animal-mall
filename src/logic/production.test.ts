import { describe, expect, it } from 'vitest'
import { PORTRAIT_MAP, troughCapacity } from './config'
import {
  addFeed,
  addStock,
  clearanceProducts,
  createProducer,
  eligibleProducts,
  emptyShelves,
  feedCount,
  refreshShelves,
  stepProduction,
} from './production'
import type { PlantKind, ProductKind, ShelfState, ZoneId } from './types'

const ZONES = { fruit: true, veg: true, farm: true, kitchen: true } as const
const LEVELS = { fruit: 0, veg: 0, farm: 0, kitchen: 0 } as const

function shelvesWith(stock: Partial<Record<ProductKind, number>>): Record<ZoneId, ShelfState> {
  let shelves = emptyShelves(ZONES, LEVELS)
  for (const zone of Object.keys(shelves) as ZoneId[]) {
    shelves[zone] = {
      ...shelves[zone],
      bins: Object.fromEntries(
        Object.keys(shelves[zone].stock).map((product) => [product, true]),
      ) as Record<ProductKind, boolean>,
    }
  }
  for (const [product, amount] of Object.entries(stock)) {
    for (let index = 0; index < (amount ?? 0); index += 1) {
      shelves = addStock(shelves, product as ProductKind, 1)
    }
  }
  return shelves
}

function withFeed(producerProduct: ProductKind, feed: Partial<Record<PlantKind, number>>) {
  let producer = createProducer(producerProduct, 0, 1, PORTRAIT_MAP)
  for (const [product, amount] of Object.entries(feed)) {
    for (let index = 0; index < (amount ?? 0); index += 1) {
      producer = addFeed(producer, product as PlantKind, 1).producer
    }
  }
  return producer
}

function run(
  producerProduct: ProductKind,
  stock: Partial<Record<ProductKind, number>>,
  ticks: number,
  feed: Partial<Record<PlantKind, number>> = {},
) {
  let shelves = shelvesWith(stock)
  let state = withFeed(producerProduct, feed)
  for (let tick = 0; tick < ticks; tick += 1) {
    const result = stepProduction([state], shelves, 50, 1)
    state = result.producers[0] as typeof state
    shelves = result.shelves
  }
  return { producer: state, shelves }
}

describe('production', () => {
  it('grows a plant to maturity and fruit', () => {
    const fresh = createProducer('apple', 0, 1, PORTRAIT_MAP, true)
    let shelves = shelvesWith({})
    let state = fresh
    for (let tick = 0; tick < 200; tick += 1) {
      const result = stepProduction([state], shelves, 50, 1)
      state = result.producers[0] as typeof state
      shelves = result.shelves
    }
    expect(state.mature).toBe(true)
    expect(state.ready).toBeGreaterThanOrEqual(1)
  })

  it('leaves a chicken hungry with an empty trough and never eats shelf stock', () => {
    const { producer, shelves } = run('egg', { apple: 5 }, 2)
    expect(producer.hungry).toBe(true)
    expect(producer.ready).toBe(0)
    expect(shelves.fruit.stock.apple).toBe(5)
  })

  it('eats a whole item from the trough and produces', () => {
    const { producer } = run('egg', {}, 200, { apple: 1 })
    expect(producer.hungry).toBe(false)
    expect(producer.ready).toBe(1)
    expect(feedCount(producer)).toBe(0)
  })

  it('eats the cheapest trough item first', () => {
    const { producer } = run('egg', {}, 2, { pear: 1, pumpkin: 2 })
    expect(producer.hungry).toBe(false)
    expect(producer.feed.pear ?? 0).toBe(0)
    expect(producer.feed.pumpkin ?? 0).toBe(2)
  })

  it('consumes the whole item even when it is worth more than the product', () => {
    const { producer } = run('egg', {}, 2, { eggplant: 1 })
    expect(producer.hungry).toBe(false)
    expect(producer.feed.eggplant ?? 0).toBe(0)
  })

  it('caps the trough at the animal capacity', () => {
    const producer = withFeed('egg', { apple: 5 })
    expect(feedCount(producer)).toBe(troughCapacity('egg'))
  })

  it('turns milk and eggs into cake while keeping one of each', () => {
    const { producer, shelves } = run('cake', { egg: 3, milk: 2 }, 250)
    expect(producer.ready).toBe(1)
    expect(shelves.farm.stock.egg).toBe(1)
    expect(shelves.farm.stock.milk).toBe(1)
  })

  it('crafts a cake with exactly one batch of inputs', () => {
    const { producer, shelves } = run('cake', { egg: 2, milk: 1 }, 250)
    expect(producer.ready).toBe(1)
    expect(shelves.farm.stock.egg).toBe(0)
    expect(shelves.farm.stock.milk).toBe(0)
  })

  it('juices any fruit and any vegetable', () => {
    const { producer, shelves } = run('juice', { pear: 1, tomato: 1 }, 200)
    expect(producer.ready).toBe(1)
    expect(shelves.fruit.stock.pear).toBe(0)
    expect(shelves.veg.stock.tomato).toBe(0)
  })

  it('turns fish into grilled fish and immediately starts the next batch', () => {
    const { producer, shelves } = run('grilledFish', { fish: 2 }, 210)
    expect(producer.ready).toBe(1)
    expect(shelves.farm.stock.fish).toBe(0)
  })

  it('turns yarn into a sweater', () => {
    const { producer, shelves } = run('sweater', { yarn: 3 }, 330)
    expect(producer.ready).toBe(1)
    expect(shelves.farm.stock.yarn).toBe(1)
  })

  it('turns two fruits into jam', () => {
    const { producer, shelves } = run('jam', { apple: 2 }, 200)
    expect(producer.ready).toBe(1)
    expect(shelves.fruit.stock.apple).toBe(0)
  })

  it('turns milk and a fruit into ice cream', () => {
    const { producer, shelves } = run('iceCream', { milk: 1, pear: 1 }, 260)
    expect(producer.ready).toBe(1)
    expect(shelves.farm.stock.milk).toBe(0)
    expect(shelves.fruit.stock.pear).toBe(0)
  })

  it('makes honey without a trough', () => {
    const { producer } = run('honey', {}, 600)
    expect(producer.ready).toBe(1)
    expect(producer.hungry).toBe(false)
    expect(feedCount(producer)).toBe(0)
  })

  it('makes a goat wait for trough feed like the other land animals', () => {
    const { producer } = run('cheese', {}, 4)
    expect(producer.ready).toBe(0)
    expect(producer.hungry).toBe(true)
  })

  it('keeps leftover stock when its producer is replaced', () => {
    let shelves = emptyShelves(ZONES, LEVELS)
    shelves = {
      ...shelves,
      fruit: { ...shelves.fruit, bins: { ...shelves.fruit.bins, apple: true } },
    }
    shelves = addStock(shelves, 'apple', 3)
    const pear = createProducer('pear', 0, 1, PORTRAIT_MAP, true)
    const next = refreshShelves(shelves, [pear], ZONES, LEVELS)
    expect(next.fruit.stock.apple).toBe(3)
    expect(next.fruit.bins.apple).toBe(false)
    expect(eligibleProducts(next)).toContain('apple')
    expect(clearanceProducts(next)).toContain('apple')
    expect(clearanceProducts(next)).not.toContain('pear')
  })
})
