import { describe, expect, it } from 'vitest'
import {
  FEED_ORDER,
  FRUIT_ORDER,
  PLANT_ORDER,
  PLANT_SHOP_ORDER,
  PLANTS,
  PROCESSED_ORDER,
  productPrice,
  RECIPES,
  type RecipeInput,
  troughCapacity,
  VEG_ORDER,
} from './config'

describe('plant configuration', () => {
  it('has a complete and unique plant table', () => {
    expect(FRUIT_ORDER).toHaveLength(6)
    expect(VEG_ORDER).toHaveLength(6)
    expect(new Set(PLANT_ORDER).size).toBe(PLANT_ORDER.length)
    expect(Object.keys(PLANTS).sort()).toEqual([...PLANT_ORDER].sort())
  })

  it('orders shop and feed lists by cost and price', () => {
    for (let index = 1; index < PLANT_SHOP_ORDER.length; index += 1) {
      const previous = PLANT_SHOP_ORDER[index - 1] as (typeof PLANT_SHOP_ORDER)[number]
      const current = PLANT_SHOP_ORDER[index] as (typeof PLANT_SHOP_ORDER)[number]
      expect(PLANTS[previous].cost).toBeLessThanOrEqual(PLANTS[current].cost)
    }
    for (let index = 1; index < FEED_ORDER.length; index += 1) {
      const previous = FEED_ORDER[index - 1] as (typeof FEED_ORDER)[number]
      const current = FEED_ORDER[index] as (typeof FEED_ORDER)[number]
      expect(PLANTS[previous].price).toBeLessThanOrEqual(PLANTS[current].price)
    }
  })

  it('uses the animal batch size as trough capacity', () => {
    expect(troughCapacity('egg')).toBe(4)
    expect(troughCapacity('milk')).toBe(3)
    expect(troughCapacity('yarn')).toBe(3)
    expect(troughCapacity('fish')).toBe(4)
  })

  it('keeps every recipe profitable with its most expensive valid inputs', () => {
    for (const product of PROCESSED_ORDER) {
      const cost = RECIPES[product].inputs.reduce((sum, input) => sum + maxInputCost(input), 0)
      expect(cost, product).toBeLessThan(RECIPES[product].price)
    }
  })

  it('makes the salad the all-crop sink', () => {
    expect(RECIPES.salad.handLoad).toBe(false)
    expect(RECIPES.salad.reserve).toBe(0)
    expect(RECIPES.salad.inputs).toHaveLength(PLANT_ORDER.length)
  })
})

function maxInputCost(input: RecipeInput): number {
  if ('product' in input) return productPrice(input.product) * input.count
  const products =
    'pool' in input ? input.pool : input.category === 'fruit' ? FRUIT_ORDER : VEG_ORDER
  const prices = [...new Set(products)].map(productPrice).sort((a, b) => b - a)
  if ('distinct' in input && input.distinct) {
    return prices.slice(0, input.count).reduce((sum, price) => sum + price, 0)
  }
  return (prices[0] ?? 0) * input.count
}
