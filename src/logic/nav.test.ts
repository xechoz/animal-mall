import { describe, expect, it } from 'vitest'
import { blockedAt } from './collision'
import {
  ANIMAL_ACCESS,
  ANIMAL_ORDER,
  ANIMAL_PENS,
  CROP_PLOTS,
  CUSTOMER_RADIUS,
  DOOR_POINT,
  PLANT_ACCESS,
  PLAYER_START,
  PLOTS,
  PROCESSED_ORDER,
  QUEUE_SLOTS,
  SHELF_ACCESS,
  STATION_ACCESS,
  STATION_SLOTS,
  ZONE_ORDER,
} from './config'
import { findPath, lineWalkable } from './nav'

describe('navigation', () => {
  const targets = [
    ...ZONE_ORDER.map((zone) => SHELF_ACCESS[zone]),
    ...QUEUE_SLOTS,
    DOOR_POINT,
    ...PLANT_ACCESS.fruit,
    ...PLANT_ACCESS.veg,
    ...ANIMAL_ORDER.map((product) => ANIMAL_ACCESS[product]),
    ...PROCESSED_ORDER.map((product) => STATION_ACCESS[product]),
  ]

  it('reaches every shelf, producer, queue slot and the door', () => {
    for (const target of targets) {
      const path = findPath(PLAYER_START, target, CUSTOMER_RADIUS)
      expect(path).not.toBeNull()
      expect(path?.length).toBeGreaterThan(0)
      for (const point of path ?? []) {
        expect(blockedAt(point.x, point.y, CUSTOMER_RADIUS)).toBe(false)
      }
    }
  })

  it('walks around shelves and plots instead of through them', () => {
    const path = findPath({ x: 320, y: 1120 }, { x: 115, y: 255 }, CUSTOMER_RADIUS)
    expect(path).not.toBeNull()
    for (const point of path ?? []) {
      expect(blockedAt(point.x, point.y, CUSTOMER_RADIUS)).toBe(false)
    }
  })

  it('has line of sight across the central aisle', () => {
    expect(lineWalkable(PLAYER_START, { x: 320, y: 560 }, CUSTOMER_RADIUS)).toBe(true)
  })

  it('does not line-of-sight through a shelf', () => {
    expect(lineWalkable({ x: 170, y: 170 }, { x: 170, y: 60 }, CUSTOMER_RADIUS)).toBe(false)
  })

  it('keeps all facility centers blocked for customers', () => {
    for (const plot of [...PLOTS, ...CROP_PLOTS]) {
      expect(blockedAt(plot.x, plot.y, CUSTOMER_RADIUS)).toBe(true)
    }
    for (const product of ANIMAL_ORDER) {
      const pen = ANIMAL_PENS[product]
      expect(blockedAt(pen.x, pen.y, CUSTOMER_RADIUS)).toBe(true)
    }
    for (const product of PROCESSED_ORDER) {
      const station = STATION_SLOTS[product]
      expect(blockedAt(station.x, station.y, CUSTOMER_RADIUS)).toBe(true)
    }
  })

  it('reaches the queue and door from every shelf', () => {
    for (const zone of ZONE_ORDER) {
      for (const target of [...QUEUE_SLOTS, DOOR_POINT]) {
        const path = findPath(SHELF_ACCESS[zone], target, CUSTOMER_RADIUS)
        expect(path).not.toBeNull()
      }
    }
  })

  it('reaches its own shelf from every producer', () => {
    for (const product of ANIMAL_ORDER) {
      const path = findPath(ANIMAL_ACCESS[product], SHELF_ACCESS.farm, CUSTOMER_RADIUS)
      expect(path).not.toBeNull()
    }
    for (const product of PROCESSED_ORDER) {
      const path = findPath(STATION_ACCESS[product], SHELF_ACCESS.kitchen, CUSTOMER_RADIUS)
      expect(path).not.toBeNull()
    }
  })
})
