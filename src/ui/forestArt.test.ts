import { describe, expect, it } from 'vitest'
import { fenceLayout, scatterPoints, zonePatchPoints } from './forestArt'

describe('fenceLayout', () => {
  it('splits the rails around a gate and keeps gate posts', () => {
    const layout = fenceLayout(
      { x1: 0, y1: 0, x2: 300, y2: 0 },
      { gapStart: 120, gapEnd: 180, postGap: 50, height: 20 },
    )
    expect(layout.rails).toHaveLength(4)
    for (const rail of layout.rails) {
      expect(rail.x1 < 120 && rail.x2 > 180).toBe(false)
    }
    const gatePosts = layout.posts.filter(
      (post) => Math.abs(post.x - 120) < 1 || Math.abs(post.x - 180) < 1,
    )
    expect(gatePosts).toHaveLength(2)
    expect(gatePosts.every((post) => post.height === 28)).toBe(true)
  })
})

describe('zonePatchPoints', () => {
  it('stays inside the rectangular gameplay trigger', () => {
    const area = { x: 40, y: 90, w: 220, h: 300 }
    const points = zonePatchPoints(area)
    expect(points.length).toBeGreaterThanOrEqual(12)
    for (const point of points) {
      expect(point.x).toBeGreaterThanOrEqual(area.x)
      expect(point.x).toBeLessThanOrEqual(area.x + area.w)
      expect(point.y).toBeGreaterThanOrEqual(area.y)
      expect(point.y).toBeLessThanOrEqual(area.y + area.h)
    }
  })
})

describe('scatterPoints', () => {
  it('is deterministic and stays inside its rect', () => {
    const area = { x: 10, y: 20, w: 100, h: 60 }
    const first = scatterPoints(area, 8, 7)
    const second = scatterPoints(area, 8, 7)
    expect(first).toEqual(second)
    for (const point of first) {
      expect(point.x).toBeGreaterThanOrEqual(area.x)
      expect(point.x).toBeLessThanOrEqual(area.x + area.w)
      expect(point.y).toBeGreaterThanOrEqual(area.y)
      expect(point.y).toBeLessThanOrEqual(area.y + area.h)
    }
  })
})
