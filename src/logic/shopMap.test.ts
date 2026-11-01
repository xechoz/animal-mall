import { createRng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import { blockedAt, distanceToRect } from './collision'
import {
  CUSTOMER_RADIUS,
  INTERACT,
  LANDSCAPE_MAP,
  PLAYER_RADIUS,
  PORTRAIT_MAP,
  producerPosition,
  shopMapFor,
  ZONE_ORDER,
} from './config'
import { initialSave } from './saveData'
import { createShopState, remapShopState, stepShop } from './state'
import type { ShopMap } from './types'

const MAPS: readonly ShopMap[] = [PORTRAIT_MAP, LANDSCAPE_MAP]

function insideMap(map: ShopMap, x: number, y: number): boolean {
  return x >= map.wall && x <= map.room.w - map.wall && y >= map.wall && y <= map.room.h - map.wall
}

for (const map of MAPS) {
  describe(`${map.id} map geometry`, () => {
    it('keeps every access point walkable for the player and customers', () => {
      const points = [
        map.playerStart,
        map.doorPoint,
        ...Object.values(map.shelfAccess),
        ...map.plantAccess.fruit,
        ...map.plantAccess.veg,
        ...Object.values(map.animalAccess),
        ...Object.values(map.stationAccess),
        ...map.queueSlots,
      ]
      for (const point of points) {
        expect(insideMap(map, point.x, point.y)).toBe(true)
        expect(blockedAt(point.x, point.y, PLAYER_RADIUS, map)).toBe(false)
        expect(blockedAt(point.x, point.y, CUSTOMER_RADIUS, map)).toBe(false)
      }
    })

    it('keeps facilities and the counter inside the room', () => {
      for (const rect of Object.values(map.shelves)) {
        expect(insideMap(map, rect.x, rect.y)).toBe(true)
        expect(insideMap(map, rect.x + rect.w, rect.y + rect.h)).toBe(true)
      }
      for (const plot of [...map.plots, ...map.cropPlots, ...Object.values(map.animalPens)]) {
        expect(insideMap(map, plot.x, plot.y)).toBe(true)
      }
      for (const station of Object.values(map.stationSlots)) {
        expect(insideMap(map, station.x, station.y)).toBe(true)
      }
      expect(insideMap(map, map.counter.x, map.counter.y)).toBe(true)
      expect(insideMap(map, map.counter.x + map.counter.w, map.counter.y + map.counter.h)).toBe(
        true,
      )
      for (const rect of [map.facilities.trashRect, map.facilities.vendingRect]) {
        expect(insideMap(map, rect.x, rect.y)).toBe(true)
        expect(insideMap(map, rect.x + rect.w, rect.y + rect.h)).toBe(true)
      }
    })

    it('keeps every zone footprint inside the room and around its shelf', () => {
      for (const zone of ZONE_ORDER) {
        const area = map.zoneAreas[zone]
        expect(insideMap(map, area.x, area.y)).toBe(true)
        expect(insideMap(map, area.x + area.w, area.y + area.h)).toBe(true)

        const shelf = map.shelves[zone]
        expect(area.x).toBeLessThanOrEqual(shelf.x)
        expect(area.x + area.w).toBeGreaterThanOrEqual(shelf.x + shelf.w)
        expect(area.y).toBeLessThanOrEqual(shelf.y)
        expect(area.y + area.h).toBeGreaterThanOrEqual(shelf.y + shelf.h)
      }
    })

    it('keeps every shelf access point inside the stock reach', () => {
      for (const zone of ZONE_ORDER) {
        expect(
          distanceToRect(map.shelfAccess[zone], map.shelves[zone]),
          `${map.id} ${zone}`,
        ).toBeLessThanOrEqual(INTERACT.stockMargin)
      }
    })

    it('keeps shelves, pens, stations and the counter blocked for customers', () => {
      for (const pen of Object.values(map.animalPens)) {
        expect(blockedAt(pen.x, pen.y, CUSTOMER_RADIUS, map)).toBe(true)
      }
      for (const station of Object.values(map.stationSlots)) {
        expect(blockedAt(station.x, station.y, CUSTOMER_RADIUS, map)).toBe(true)
      }
      for (const shelf of Object.values(map.shelves)) {
        expect(blockedAt(shelf.x + shelf.w / 2, shelf.y + shelf.h / 2, CUSTOMER_RADIUS, map)).toBe(
          true,
        )
      }
      expect(
        blockedAt(
          map.counter.x + map.counter.w / 2,
          map.counter.y + map.counter.h / 2,
          CUSTOMER_RADIUS,
          map,
        ),
      ).toBe(true)
    })

    it('lets the player walk through animal pens and stations while customers route around them', () => {
      for (const pen of Object.values(map.animalPens)) {
        expect(blockedAt(pen.x, pen.y, PLAYER_RADIUS, map, map.playerObstacles)).toBe(false)
        expect(blockedAt(pen.x, pen.y, PLAYER_RADIUS, map)).toBe(true)
      }
      for (const station of Object.values(map.stationSlots)) {
        expect(blockedAt(station.x, station.y, PLAYER_RADIUS, map, map.playerObstacles)).toBe(false)
        expect(blockedAt(station.x, station.y, PLAYER_RADIUS, map)).toBe(true)
      }
    })

    it('leaves crop beds walkable for the player and customers', () => {
      for (const plot of [...map.plots, ...map.cropPlots]) {
        expect(blockedAt(plot.x, plot.y, PLAYER_RADIUS, map)).toBe(false)
        expect(blockedAt(plot.x, plot.y, CUSTOMER_RADIUS, map)).toBe(false)
      }
    })
  })
}

describe('shop map selection', () => {
  it('uses the wide plan in landscape and the tall plan in portrait', () => {
    expect(shopMapFor(844, 390).id).toBe('landscape')
    expect(shopMapFor(390, 844).id).toBe('portrait')
  })
})

describe('portrait zone order', () => {
  it('keeps the starting crops closer to the counter than the back row', () => {
    const counter = PORTRAIT_MAP.counter
    const center = { x: counter.x + counter.w / 2, y: counter.y + counter.h / 2 }
    const away = (point: { x: number; y: number }): number =>
      Math.hypot(point.x - center.x, point.y - center.y)
    const crops = [...PORTRAIT_MAP.plantAccess.fruit, ...PORTRAIT_MAP.plantAccess.veg]
    const backRow = [
      ...Object.values(PORTRAIT_MAP.animalAccess),
      ...Object.values(PORTRAIT_MAP.stationAccess),
    ]
    expect(Math.max(...crops.map(away))).toBeLessThan(Math.min(...backRow.map(away)))
  })
})

describe('remapping a run', () => {
  it('keeps progress and moves producers onto the new floor plan', () => {
    const state = createShopState(
      {
        ...initialSave(),
        coins: 500,
        served: 3,
        pendingCoins: 24,
        producers: [
          { product: 'apple', slot: 0 },
          { product: 'milk', slot: 1 },
        ],
        zones: { fruit: true, veg: true, farm: true, kitchen: false },
        staff: { cashier: 1, picker: 1, chef: 0 },
      },
      PORTRAIT_MAP,
    )
    const moved = remapShopState(state, LANDSCAPE_MAP)
    expect(moved.map.id).toBe('landscape')
    expect(moved.coins).toBe(500)
    expect(moved.served).toBe(3)
    expect(moved.pendingCoins).toBe(24)
    expect(moved.producers).toHaveLength(2)
    expect(moved.producers.map((producer) => producer.product)).toEqual(['apple', 'milk'])
    for (const producer of moved.producers) {
      expect(producer.pos).toEqual(producerPosition(LANDSCAPE_MAP, producer.product, producer.slot))
    }
    expect(moved.player.pos).toEqual(LANDSCAPE_MAP.playerStart)
    expect(moved.customers).toHaveLength(0)
    expect(moved.queue).toHaveLength(0)
    expect(moved.staffMembers).toHaveLength(2)
    expect(moved.tutorial).toBe('done')
  })

  it('is a no-op when the map does not change', () => {
    const state = createShopState(initialSave(), PORTRAIT_MAP)
    expect(remapShopState(state, PORTRAIT_MAP)).toBe(state)
  })
})

describe('landscape simulation', () => {
  it('runs customers, the counter and a cashier on the wide plan', () => {
    let state = createShopState(
      {
        ...initialSave(),
        coins: 0,
        served: 3,
        producers: [{ product: 'apple', slot: 0 }],
        staff: { cashier: 1, picker: 0, chef: 0 },
      },
      LANDSCAPE_MAP,
    )
    state = {
      ...state,
      shelves: {
        ...state.shelves,
        fruit: {
          ...state.shelves.fruit,
          stock: { ...state.shelves.fruit.stock, apple: 4 },
          everStocked: { ...state.shelves.fruit.everStocked, apple: true },
        },
      },
      spawnMs: 0,
    }
    const rng = createRng(7)
    for (let tick = 0; tick < 1_200; tick += 1) {
      state = stepShop(state, { moveX: 0, moveY: 0 }, rng, 50).state
    }
    expect(state.served).toBeGreaterThan(3)
    expect(state.pendingCoins).toBeGreaterThan(0)
  })
})
