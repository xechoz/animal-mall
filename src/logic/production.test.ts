import { describe, expect, it } from 'vitest'
import { PORTRAIT_MAP, shelfCapacity } from './config'
import { addStock, createProducer, emptyShelves, stepProduction } from './production'
import type { ProductKind, ShelfState, ZoneId } from './types'

const ZONES = { fruit: true, veg: true, farm: true, kitchen: true } as const

function shelvesWith(stock: Partial<Record<ProductKind, number>>): Record<ZoneId, ShelfState> {
  let shelves = emptyShelves(ZONES, shelfCapacity(0))
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

function run(
  producerProduct: ProductKind,
  stock: Partial<Record<ProductKind, number>>,
  ticks: number,
) {
  const producer = createProducer(producerProduct, 0, 1, PORTRAIT_MAP)
  let shelves = shelvesWith(stock)
  let state = producer
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

  it('leaves a chicken hungry with no feed', () => {
    const { producer } = run('egg', {}, 2)
    expect(producer.hungry).toBe(true)
    expect(producer.ready).toBe(0)
  })

  it('eats the first available diet item and produces', () => {
    const { producer, shelves } = run('egg', { apple: 0, corn: 5 }, 200)
    expect(producer.hungry).toBe(false)
    expect(producer.ready).toBe(1)
    expect(shelves.veg.stock.corn).toBe(4)
  })

  it('reserves one unit of feed for customers', () => {
    const { producer, shelves } = run('egg', { apple: 1 }, 2)
    expect(producer.hungry).toBe(true)
    expect(shelves.fruit.stock.apple).toBe(1)
  })

  it('turns milk and eggs into cake while keeping one of each', () => {
    const { producer, shelves } = run('cake', { egg: 3, milk: 2 }, 250)
    expect(producer.ready).toBe(1)
    expect(shelves.farm.stock.egg).toBe(1)
    expect(shelves.farm.stock.milk).toBe(1)
  })

  it('does not craft when inputs would leave no customer stock', () => {
    const { producer, shelves } = run('cake', { egg: 2, milk: 1 }, 250)
    expect(producer.ready).toBe(0)
    expect(producer.progressMs).toBe(0)
    expect(shelves.farm.stock.egg).toBe(2)
    expect(shelves.farm.stock.milk).toBe(1)
  })

  it('turns fish into grilled fish', () => {
    const { producer, shelves } = run('grilledFish', { fish: 2 }, 210)
    expect(producer.ready).toBe(1)
    expect(shelves.farm.stock.fish).toBe(1)
  })

  it('turns yarn into a sweater', () => {
    const { producer, shelves } = run('sweater', { yarn: 3 }, 330)
    expect(producer.ready).toBe(1)
    expect(shelves.farm.stock.yarn).toBe(1)
  })
})
