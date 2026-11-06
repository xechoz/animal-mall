import { describe, expect, it } from 'vitest'
import { feedPerCycle, PLANT_ORDER, PORTRAIT_MAP, troughCapacity, zoneOf } from './config'
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

const ZONES = { fruit: true, veg: true, farm: true, factory: true } as const
const LEVELS = { fruit: 0, veg: 0, farm: 0, factory: 0 } as const

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

  it('eats whole items from the trough and produces', () => {
    const { producer } = run('egg', {}, 200, { apple: 2 })
    expect(producer.hungry).toBe(false)
    expect(producer.ready).toBe(1)
    expect(feedCount(producer)).toBe(0)
  })

  it('eats the cheapest trough items first', () => {
    const { producer } = run('egg', {}, 2, { pear: 2, pumpkin: 2 })
    expect(producer.hungry).toBe(false)
    expect(producer.feed.pear ?? 0).toBe(0)
    expect(producer.feed.pumpkin ?? 0).toBe(2)
  })

  it('consumes the whole items even when one is worth more than the product', () => {
    const { producer } = run('egg', {}, 2, { eggplant: 2 })
    expect(producer.hungry).toBe(false)
    expect(producer.feed.eggplant ?? 0).toBe(0)
  })

  it('stays hungry on a partial trough instead of burning it', () => {
    const { producer } = run('egg', {}, 2, { apple: 1 })
    expect(producer.hungry).toBe(true)
    expect(producer.ready).toBe(0)
    expect(producer.feed.apple ?? 0).toBe(1)
  })

  it('a pig needs four items per cycle', () => {
    const full = run('truffle', {}, 600, { apple: 4, carrot: 4 })
    expect(full.producer.hungry).toBe(false)
    expect(full.producer.ready).toBe(1)
    const partial = run('truffle', {}, 2, { apple: 3 })
    expect(partial.producer.hungry).toBe(true)
    expect(partial.producer.feed.apple ?? 0).toBe(3)
  })

  it('every trough animal eats every fruit and vegetable', () => {
    const troughAnimals = [
      'egg',
      'milk',
      'yarn',
      'cheese',
      'truffle',
      'duckEgg',
      'donkeyMilk',
      'feather',
    ] as const
    for (const animal of troughAnimals) {
      const perCycle = feedPerCycle(animal)
      expect(perCycle).toBeGreaterThan(0)
      for (const crop of PLANT_ORDER) {
        const feed = { [crop]: perCycle } as Partial<Record<PlantKind, number>>
        const { producer } = run(animal, {}, 2, feed)
        expect(producer.hungry, `${animal} eats ${crop}`).toBe(false)
        expect(producer.feed[crop] ?? 0, `${animal} ate ${crop}`).toBe(0)
      }
    }
  })

  it('caps the trough at cycles times feed per cycle', () => {
    const producer = withFeed('egg', { apple: 10 })
    expect(feedCount(producer)).toBe(troughCapacity('egg'))
  })

  it('turns milk and eggs into cake while keeping one of each', () => {
    const { producer, shelves } = run('cake', { egg: 3, milk: 2 }, 250)
    expect(producer.ready).toBe(1)
    expect(shelves.farm.stock.egg).toBe(1)
    expect(shelves.farm.stock.milk).toBe(1)
  })

  it('keeps one of each ingredient on the shelf for customers', () => {
    const { producer, shelves } = run('cake', { egg: 2, milk: 1 }, 250)
    expect(producer.ready).toBe(0)
    expect(shelves.farm.stock.egg).toBe(2)
    expect(shelves.farm.stock.milk).toBe(1)
  })

  it('juices any fruit and any vegetable while leaving one of each', () => {
    const { producer, shelves } = run('juice', { pear: 2, tomato: 2 }, 200)
    expect(producer.ready).toBe(1)
    expect(shelves.fruit.stock.pear).toBe(1)
    expect(shelves.veg.stock.tomato).toBe(1)
  })

  it('grills a mixed skewer from any two pool ingredients while leaving one', () => {
    const { producer, shelves } = run('skewer', { fish: 2, tomato: 2 }, 210)
    expect(producer.ready).toBe(1)
    expect(shelves.farm.stock.fish).toBe(1)
    expect(shelves.veg.stock.tomato).toBe(1)
  })

  it('waits for a second ingredient before grilling a skewer', () => {
    const { producer, shelves } = run('skewer', { fish: 1 }, 210)
    expect(producer.ready).toBe(0)
    expect(shelves.farm.stock.fish).toBe(1)
  })

  it('spends hopper ingredients before shelf stock for a pooled recipe', () => {
    let shelves = shelvesWith({ tomato: 4 })
    let producer = {
      ...createProducer('skewer', 0, 1, PORTRAIT_MAP),
      hopper: { fish: 2 },
    }
    for (let tick = 0; tick < 140; tick += 1) {
      const result = stepProduction([producer], shelves, 50, 1)
      producer = result.producers[0] as typeof producer
      shelves = result.shelves
    }
    expect(producer.ready).toBe(1)
    expect(producer.hopper.fish ?? 0).toBe(0)
    expect(shelves.veg.stock.tomato).toBe(4)
  })

  it('turns yarn into a sweater', () => {
    const { producer, shelves } = run('sweater', { yarn: 3 }, 330)
    expect(producer.ready).toBe(1)
    expect(shelves.farm.stock.yarn).toBe(1)
  })

  it('turns two fruits into jam while leaving one', () => {
    const { producer, shelves } = run('jam', { apple: 3 }, 200)
    expect(producer.ready).toBe(1)
    expect(shelves.fruit.stock.apple).toBe(1)
  })

  it('turns milk and a fruit into ice cream while leaving one', () => {
    const { producer, shelves } = run('iceCream', { milk: 2, pear: 2 }, 260)
    expect(producer.ready).toBe(1)
    expect(shelves.farm.stock.milk).toBe(1)
    expect(shelves.fruit.stock.pear).toBe(1)
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

  it('grills a fish dish with three different crops', () => {
    const { producer, shelves } = run('fishDish', { fish: 2, carrot: 2, pear: 2, apple: 2 }, 240)
    expect(producer.ready).toBe(1)
    expect(shelves.farm.stock.fish).toBe(1)
    expect(shelves.veg.stock.carrot).toBe(1)
    expect(shelves.fruit.stock.pear).toBe(1)
    expect(shelves.fruit.stock.apple).toBe(1)
  })

  it('will not make a fish dish from three carrots', () => {
    const { producer, shelves } = run('fishDish', { fish: 2, carrot: 4 }, 240)
    expect(producer.ready).toBe(0)
    expect(shelves.farm.stock.fish).toBe(2)
    expect(shelves.veg.stock.carrot).toBe(4)
  })

  it('makes a salad from every crop type', () => {
    const stock = Object.fromEntries(PLANT_ORDER.map((product) => [product, 2]))
    const { producer, shelves } = run('salad', stock, 480)
    expect(producer.ready).toBe(1)
    for (const product of PLANT_ORDER) {
      expect(shelves[zoneOf(product)].stock[product]).toBe(1)
    }
  })

  it('lets the salad spend the last unit of each crop', () => {
    const stock = Object.fromEntries(PLANT_ORDER.map((product) => [product, 1]))
    const { producer, shelves } = run('salad', stock, 480)
    expect(producer.ready).toBe(1)
    for (const product of PLANT_ORDER) {
      expect(shelves[zoneOf(product)].stock[product]).toBe(0)
    }
  })

  it('spends the cheapest pool ingredient first', () => {
    const { producer, shelves } = run('skewer', { carrot: 3, cheese: 2 }, 140)
    expect(producer.ready).toBe(1)
    expect(shelves.veg.stock.carrot).toBe(1)
    expect(shelves.farm.stock.cheese).toBe(2)
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
