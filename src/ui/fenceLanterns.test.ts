import { describe, expect, it } from 'vitest'
import { LANDSCAPE_MAP, PORTRAIT_MAP } from '../logic/shopMap'
import { fenceLanterns } from './fenceLanterns'

describe('fence lanterns', () => {
  for (const map of [PORTRAIT_MAP, LANDSCAPE_MAP]) {
    it(`places six unique lanterns inside the ${map.id} fence`, () => {
      const lamps = fenceLanterns(map)
      expect(lamps).toHaveLength(6)

      const seen = new Set<string>()
      for (const lamp of lamps) {
        expect(lamp.x).toBeGreaterThan(0)
        expect(lamp.x).toBeLessThan(map.room.w)
        expect(lamp.y).toBeGreaterThan(0)
        expect(lamp.y).toBeLessThan(map.room.h)
        const key = `${lamp.x}:${lamp.y}`
        expect(seen.has(key)).toBe(false)
        seen.add(key)
      }

      const bottom = lamps.filter((lamp) => lamp.facing === 'bottom')
      expect(bottom).toHaveLength(2)
      for (const lamp of bottom) {
        expect(Math.abs(lamp.x - map.doorPoint.x)).toBeGreaterThan(58)
      }
    })
  }
})
