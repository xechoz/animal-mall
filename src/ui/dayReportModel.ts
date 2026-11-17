import type { DayReport } from '../logic/types'

export type ReportMode = 'empty' | 'noSales' | 'normal'

/** Three shapes the card can take; each one changes the hero block. */
export function reportMode(report: DayReport): ReportMode {
  if (report.rating === null) return 'empty'
  if (report.revenue <= 0) return 'noSales'
  return 'normal'
}

/**
 * Five-star buckets aligned with the tip tiers: 75 earns the first tip, 85 the
 * second and 95 the third. The old `Math.round(rating / 20)` mapping disagreed
 * with the rating words at 70/85/95, so a 90-point day showed five stars and
 * still read "Good".
 */
export function ratingStars(rating: number | null): number {
  if (rating === null) return 0
  if (rating >= 95) return 5
  if (rating >= 85) return 4
  if (rating >= 75) return 3
  if (rating >= 50) return 2
  return rating > 0 ? 1 : 0
}

/** Fraction of a goal already covered by the wallet, clamped for the bar. */
export function goalProgress(available: number, cost: number): number {
  if (cost <= 0) return 1
  return Math.max(0, Math.min(1, available / cost))
}
