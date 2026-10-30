import { describe, expect, it } from 'vitest'
import { blockedAt } from './collision'
import {
  CUSTOMER_RADIUS,
  DOOR_POINT,
  FRUIT_ORDER,
  PLAYER_START,
  PLOTS,
  QUEUE_SLOTS,
  SHELF_ACCESS,
} from './config'
import { findPath, lineWalkable } from './nav'

describe('navigation', () => {
  it('reaches every shelf, queue slot and the door', () => {
    const targets = [...FRUIT_ORDER.map((kind) => SHELF_ACCESS[kind]), ...QUEUE_SLOTS, DOOR_POINT]
    for (const target of targets) {
      const path = findPath(PLAYER_START, target, CUSTOMER_RADIUS)
      expect(path).not.toBeNull()
      expect(path?.length).toBeGreaterThan(0)
      for (const point of path ?? []) {
        expect(blockedAt(point.x, point.y, CUSTOMER_RADIUS)).toBe(false)
      }
    }
  })

  it('walks around tree pots instead of through them', () => {
    const path = findPath({ x: 320, y: 596 }, { x: 112, y: 306 }, CUSTOMER_RADIUS)
    expect(path).not.toBeNull()
    for (const point of path ?? []) {
      expect(blockedAt(point.x, point.y, CUSTOMER_RADIUS)).toBe(false)
    }
  })

  it('has line of sight across the open floor', () => {
    expect(lineWalkable(PLAYER_START, { x: 320, y: 400 }, CUSTOMER_RADIUS)).toBe(true)
  })

  it('does not line-of-sight through a shelf', () => {
    expect(lineWalkable({ x: 131, y: 180 }, { x: 131, y: 60 }, CUSTOMER_RADIUS)).toBe(false)
  })

  it('keeps all plot centers blocked for customers', () => {
    for (const plot of PLOTS) {
      expect(blockedAt(plot.x, plot.y, CUSTOMER_RADIUS)).toBe(true)
    }
  })
})
