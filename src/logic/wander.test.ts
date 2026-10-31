import { createRng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import { blockedAt } from './collision'
import { CUSTOMER_RADIUS, LANDSCAPE_MAP, PORTRAIT_MAP, WANDER, ZONE_ORDER } from './config'
import { findPath } from './nav'
import type { ShopMap, Vec2, WanderTuning } from './types'
import { wanderPath } from './wander'

const MAPS: readonly ShopMap[] = [PORTRAIT_MAP, LANDSCAPE_MAP]

function lengthOf(from: Vec2, path: readonly Vec2[]): number {
  let total = 0
  let previous = from
  for (const point of path) {
    total += Math.hypot(point.x - previous.x, point.y - previous.y)
    previous = point
  }
  return total
}

describe('wander path', () => {
  for (const map of MAPS) {
    describe(map.id, () => {
      it('reaches every shelf with valid points', () => {
        for (const zone of ZONE_ORDER) {
          const goal = map.shelfAccess[zone]
          const path = wanderPath(
            map.doorSpawn,
            goal,
            CUSTOMER_RADIUS,
            map,
            createRng(99),
            WANDER.customer,
          )
          expect(path.length).toBeGreaterThan(0)
          for (const point of path) {
            expect(blockedAt(point.x, point.y, CUSTOMER_RADIUS, map)).toBe(false)
          }
          const last = path[path.length - 1] as Vec2
          expect(Math.hypot(last.x - goal.x, last.y - goal.y)).toBeLessThan(1)
        }
      })

      it('uses the direct path when the chance roll fails', () => {
        const tuning: WanderTuning = { ...WANDER.customer, chance: 0 }
        const direct = findPath(map.doorSpawn, map.shelfAccess.fruit, CUSTOMER_RADIUS, map)
        expect(direct).not.toBeNull()
        const path = wanderPath(
          map.doorSpawn,
          map.shelfAccess.fruit,
          CUSTOMER_RADIUS,
          map,
          createRng(7),
          tuning,
        )
        expect(path).toEqual(direct)
      })

      it('is deterministic for a given seed', () => {
        const first = wanderPath(
          map.doorSpawn,
          map.shelfAccess.kitchen,
          CUSTOMER_RADIUS,
          map,
          createRng(1234),
          WANDER.customer,
        )
        const second = wanderPath(
          map.doorSpawn,
          map.shelfAccess.kitchen,
          CUSTOMER_RADIUS,
          map,
          createRng(1234),
          WANDER.customer,
        )
        expect(first).toEqual(second)
      })

      it('produces varied routes across seeds', () => {
        const tuning: WanderTuning = {
          ...WANDER.customer,
          chance: 1,
          minExtra: 1,
          maxExtra: 1,
        }
        const routes = new Set<string>()
        for (let seed = 1; seed <= 20; seed += 1) {
          const path = wanderPath(
            map.doorSpawn,
            map.shelfAccess.fruit,
            CUSTOMER_RADIUS,
            map,
            createRng(seed),
            tuning,
          )
          routes.add(JSON.stringify(path))
        }
        expect(routes.size).toBeGreaterThan(1)
      })

      it('keeps extra distance inside the configured bound', () => {
        for (let seed = 1; seed <= 20; seed += 1) {
          const goal = map.shelfAccess.farm
          const direct = findPath(map.doorSpawn, goal, CUSTOMER_RADIUS, map)
          expect(direct).not.toBeNull()
          const directLength = lengthOf(map.doorSpawn, direct ?? [])
          const path = wanderPath(
            map.doorSpawn,
            goal,
            CUSTOMER_RADIUS,
            map,
            createRng(seed),
            WANDER.customer,
          )
          expect(lengthOf(map.doorSpawn, path)).toBeLessThanOrEqual(
            directLength * (1 + WANDER.customer.maxExtra) + 0.001,
          )
        }
      })

      it('does not detour on very short legs', () => {
        const from = { x: map.playerStart.x, y: map.playerStart.y }
        const to = { x: map.playerStart.x, y: map.playerStart.y + 60 }
        const tuning: WanderTuning = { ...WANDER.customer, chance: 1 }
        const direct = findPath(from, to, CUSTOMER_RADIUS, map)
        const path = wanderPath(from, to, CUSTOMER_RADIUS, map, createRng(5), tuning)
        expect(path).toEqual(direct)
      })
    })
  }
})
