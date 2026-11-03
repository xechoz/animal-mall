import { DAY, SATISFACTION } from './config'
import type { DayPhase, DayReport, DayState } from './types'

/** A fresh morning with no daily counters. */
export function initialDayState(index: number): DayState {
  return {
    index: Math.max(1, Math.floor(index)),
    ms: 0,
    revenue: 0,
    served: 0,
    entered: 0,
    missed: 0,
    scoreSum: 0,
    report: null,
  }
}

export function dayPhase(ms: number): DayPhase {
  if (ms >= DAY.lengthMs) return 'closing'
  if (ms < DAY.dawnEndMs) return 'dawn'
  if (ms < DAY.duskStartMs) return 'day'
  if (ms < DAY.nightStartMs) return 'dusk'
  return 'night'
}

/** Night and its closing wind-down share the nocturnal shop mix. */
export function isNightPhase(phase: DayPhase): boolean {
  return phase === 'night' || phase === 'closing'
}

/** 0 at 09:00, 1 at 21:00. Closing time stays pinned at 1. */
export function dayProgress(ms: number): number {
  return Math.max(0, Math.min(1, ms / DAY.lengthMs))
}

/** The shop clock, compressed from the configured opening hours. */
export function dayClockLabel(ms: number): string {
  const progress = dayProgress(ms)
  const minutes = Math.round(DAY.openHour * 60 + progress * (DAY.closeHour - DAY.openHour) * 60)
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** New shoppers stop before the door closes, but the queue may finish. */
export function dayAcceptsCustomers(ms: number): boolean {
  return ms < DAY.lastSpawnMs
}

/** Safety net for a shopper stuck on a broken path after closing. */
export function dayGraceOver(ms: number): boolean {
  return ms >= DAY.lengthMs + DAY.closeGraceMs
}

/**
 * Shopper score at the till. A customer who never reaches the till contributes
 * zero through the `entered` denominator, so missed sales hurt the average.
 */
export function satisfactionScore(missed: number, patienceRatio: number): number {
  const patiencePenalty =
    patienceRatio < SATISFACTION.lowPatience ? SATISFACTION.patiencePenalty : 0
  const score = 100 - Math.max(0, missed) * SATISFACTION.missedPenalty - patiencePenalty
  return Math.max(0, Math.min(100, score))
}

export function dayRating(scoreSum: number, entered: number): number | null {
  if (entered <= 0) return null
  return Math.max(0, Math.min(100, Math.round(scoreSum / entered)))
}

export function tipFor(
  revenue: number,
  rating: number | null,
): { readonly amount: number; readonly percent: number } {
  if (rating === null || rating < SATISFACTION.tipMinRating || revenue <= 0) {
    return { amount: 0, percent: 0 }
  }
  const tier = SATISFACTION.tipTiers.find((entry) => rating >= entry.min)
  if (tier === undefined) return { amount: 0, percent: 0 }
  const amount = Math.round((revenue * tier.percent) / 100)
  return { amount: amount > 0 ? amount : 1, percent: tier.percent }
}

/**
 * Closes the books and opens the next morning. The caller adds `report.tip` to
 * the coin balance and emits `dayEnded`; counters never leak across days.
 */
export function finishDay(day: DayState): { readonly day: DayState; readonly report: DayReport } {
  const rating = dayRating(day.scoreSum, day.entered)
  const tip = tipFor(day.revenue, rating)
  const report: DayReport = {
    day: day.index,
    revenue: day.revenue,
    served: day.served,
    lost: Math.max(0, day.entered - day.served),
    missed: day.missed,
    rating,
    tip: tip.amount,
    tipPercent: tip.percent,
  }
  return { day: initialDayState(day.index + 1), report }
}

/** Defensive copy used by `remapShopState` when a rotation clears shoppers. */
export function discountClearedCustomers(day: DayState, unserved: number): DayState {
  if (unserved <= 0) return day
  return { ...day, entered: Math.max(0, day.entered - unserved) }
}
