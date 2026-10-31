import { describe, expect, it } from 'vitest'
import {
  FEED_ORDER,
  FRUIT_ORDER,
  PLANT_ORDER,
  PLANT_SHOP_ORDER,
  PLANTS,
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
    expect(troughCapacity('egg')).toBe(3)
    expect(troughCapacity('milk')).toBe(2)
    expect(troughCapacity('yarn')).toBe(2)
    expect(troughCapacity('fish')).toBe(3)
  })
})
