import { describe, expect, it } from 'vitest'
import type { DayReport } from '../logic/types'
import { goalProgress, ratingStars, reportMode } from './dayReportModel'

function report(overrides: Partial<DayReport> = {}): DayReport {
  return {
    day: 3,
    revenue: 420,
    served: 7,
    lost: 0,
    missed: 0,
    rating: 88,
    tip: 21,
    tipPercent: 5,
    ...overrides,
  }
}

describe('day report model', () => {
  it('picks the empty, no-sale and normal hero shapes', () => {
    expect(reportMode(report({ rating: null, revenue: 0 }))).toBe('empty')
    expect(reportMode(report({ rating: 0, revenue: 0 }))).toBe('noSales')
    expect(reportMode(report())).toBe('normal')
  })

  it('turns the rating into the same five-star buckets as the tip tiers', () => {
    expect(ratingStars(null)).toBe(0)
    expect(ratingStars(0)).toBe(0)
    expect(ratingStars(49)).toBe(1)
    expect(ratingStars(50)).toBe(2)
    expect(ratingStars(74)).toBe(2)
    expect(ratingStars(75)).toBe(3)
    expect(ratingStars(84)).toBe(3)
    expect(ratingStars(85)).toBe(4)
    expect(ratingStars(94)).toBe(4)
    expect(ratingStars(95)).toBe(5)
    expect(ratingStars(100)).toBe(5)
  })

  it('clamps goal progress between empty and ready', () => {
    expect(goalProgress(0, 500)).toBe(0)
    expect(goalProgress(250, 500)).toBe(0.5)
    expect(goalProgress(500, 500)).toBe(1)
    expect(goalProgress(900, 500)).toBe(1)
    expect(goalProgress(0, 0)).toBe(1)
  })
})
