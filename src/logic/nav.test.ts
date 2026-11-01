import { describe, expect, it } from 'vitest'
import { blockedAt } from './collision'
import { CUSTOMER_RADIUS, LANDSCAPE_MAP, PORTRAIT_MAP, ZONE_ORDER } from './config'
import { findPath, lineWalkable } from './nav'
import type { ShopMap } from './types'

const MAPS: readonly ShopMap[] = [PORTRAIT_MAP, LANDSCAPE_MAP]

for (const map of MAPS) {
  describe(`${map.id} navigation`, () => {
    const targets = [
      ...ZONE_ORDER.map((zone) => map.shelfAccess[zone]),
      ...map.queueSlots,
      map.doorPoint,
      ...map.plantAccess.fruit,
      ...map.plantAccess.veg,
      ...map.animalAccess,
      ...map.stationAccess,
      map.facilities.trashAccess,
      map.facilities.vendingUse,
      ...map.facilities.restSpots,
    ]

    it('reaches every shelf, producer, queue slot and the door', () => {
      for (const target of targets) {
        const path = findPath(map.playerStart, target, CUSTOMER_RADIUS, map)
        expect(path).not.toBeNull()
        expect(path?.length).toBeGreaterThan(0)
        for (const point of path ?? []) {
          expect(blockedAt(point.x, point.y, CUSTOMER_RADIUS, map)).toBe(false)
        }
      }
    })

    it('walks across crop beds instead of treating them as walls', () => {
      const plot = map.plots[0]
      expect(plot).toBeDefined()
      expect(blockedAt(plot.x, plot.y, CUSTOMER_RADIUS, map)).toBe(false)
      const path = findPath(map.playerStart, plot, CUSTOMER_RADIUS, map)
      expect(path).not.toBeNull()
      for (const point of path ?? []) {
        expect(blockedAt(point.x, point.y, CUSTOMER_RADIUS, map)).toBe(false)
      }
    })

    it('has line of sight across the main aisle', () => {
      const from = map.id === 'portrait' ? { x: 320, y: 1120 } : { x: 300, y: 620 }
      const to = map.id === 'portrait' ? { x: 320, y: 560 } : { x: 1000, y: 620 }
      expect(lineWalkable(from, to, CUSTOMER_RADIUS, map)).toBe(true)
    })

    it('does not line-of-sight through a shelf', () => {
      const shelf = map.shelves.fruit
      const center = { x: shelf.x + shelf.w / 2, y: shelf.y + shelf.h / 2 }
      expect(lineWalkable(center, { x: center.x, y: shelf.y - 30 }, CUSTOMER_RADIUS, map)).toBe(
        false,
      )
    })

    it('keeps shelves, pens, stations and the counter blocked for customers', () => {
      for (const shelf of Object.values(map.shelves)) {
        expect(blockedAt(shelf.x + shelf.w / 2, shelf.y + shelf.h / 2, CUSTOMER_RADIUS, map)).toBe(
          true,
        )
      }
      for (const pen of map.animalPens) {
        expect(blockedAt(pen.x, pen.y, CUSTOMER_RADIUS, map)).toBe(true)
      }
      for (const station of map.stationSlots) {
        expect(blockedAt(station.x, station.y, CUSTOMER_RADIUS, map)).toBe(true)
      }
      expect(
        blockedAt(
          map.counter.x + map.counter.w / 2,
          map.counter.y + map.counter.h / 2,
          CUSTOMER_RADIUS,
          map,
        ),
      ).toBe(true)
      for (const rect of [map.facilities.trashRect, map.facilities.vendingRect]) {
        expect(blockedAt(rect.x + rect.w / 2, rect.y + rect.h / 2, CUSTOMER_RADIUS, map)).toBe(true)
      }
    })
  })
}
