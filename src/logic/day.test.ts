import { describe, expect, it } from 'vitest'
import { DAY } from './config'
import {
  dayAcceptsCustomers,
  dayClockLabel,
  dayGraceOver,
  dayPhase,
  dayProgress,
  dayRating,
  finishDay,
  initialDayState,
  satisfactionScore,
  tipFor,
} from './day'

describe('day clock', () => {
  it('maps the compressed shift onto 09:00–21:00', () => {
    expect(dayClockLabel(0)).toBe('09:00')
    expect(dayClockLabel(DAY.lengthMs / 2)).toBe('15:00')
    expect(dayClockLabel(DAY.lengthMs)).toBe('21:00')
    expect(dayClockLabel(DAY.lengthMs + 30_000)).toBe('21:00')
    expect(dayProgress(-5)).toBe(0)
    expect(dayProgress(DAY.lengthMs + 5)).toBe(1)
  })

  it('splits the day into dawn, day, dusk, night and closing', () => {
    expect(dayPhase(0)).toBe('dawn')
    expect(dayPhase(DAY.dawnEndMs - 1)).toBe('dawn')
    expect(dayPhase(DAY.dawnEndMs)).toBe('day')
    expect(dayPhase(DAY.duskStartMs)).toBe('dusk')
    expect(dayPhase(DAY.nightStartMs)).toBe('night')
    expect(dayPhase(DAY.lengthMs)).toBe('closing')
  })

  it('stops new shoppers before closing and keeps a grace window', () => {
    expect(dayAcceptsCustomers(DAY.lastSpawnMs - 1)).toBe(true)
    expect(dayAcceptsCustomers(DAY.lastSpawnMs)).toBe(false)
    expect(dayGraceOver(DAY.lengthMs)).toBe(false)
    expect(dayGraceOver(DAY.lengthMs + DAY.closeGraceMs)).toBe(true)
  })
})

describe('daily report', () => {
  it('scores out-of-stock items and a near-empty patience bar', () => {
    expect(satisfactionScore(0, 1)).toBe(100)
    expect(satisfactionScore(1, 1)).toBe(80)
    expect(satisfactionScore(0, 0.2)).toBe(80)
    expect(satisfactionScore(3, 0.2)).toBe(20)
    expect(satisfactionScore(9, 0)).toBe(0)
  })

  it('averages over everyone who entered, so a lost shopper counts as zero', () => {
    expect(dayRating(0, 0)).toBeNull()
    expect(dayRating(200, 2)).toBe(100)
    expect(dayRating(200, 4)).toBe(50)
    expect(dayRating(999, 1)).toBe(100)
  })

  it('pays tips only at 75 or better and caps at 8%', () => {
    expect(tipFor(1_000, null)).toEqual({ amount: 0, percent: 0 })
    expect(tipFor(1_000, 74)).toEqual({ amount: 0, percent: 0 })
    expect(tipFor(1_000, 75)).toEqual({ amount: 20, percent: 2 })
    expect(tipFor(1_000, 85)).toEqual({ amount: 50, percent: 5 })
    expect(tipFor(1_000, 95)).toEqual({ amount: 80, percent: 8 })
    expect(tipFor(1, 95)).toEqual({ amount: 1, percent: 8 })
    expect(tipFor(0, 100)).toEqual({ amount: 0, percent: 0 })
  })

  it('resets counters, advances the day and keeps lifetime state out of the report', () => {
    const day = {
      ...initialDayState(3),
      ms: DAY.lengthMs,
      revenue: 250,
      served: 4,
      entered: 5,
      missed: 2,
      scoreSum: 320,
    }
    const closed = finishDay(day)
    expect(closed.report).toEqual({
      day: 3,
      revenue: 250,
      served: 4,
      lost: 1,
      missed: 2,
      rating: 64,
      tip: 0,
      tipPercent: 0,
    })
    expect(closed.day.index).toBe(4)
    expect(closed.day.ms).toBe(0)
    expect(closed.day.revenue).toBe(0)
    expect(closed.day.report).toBeNull()
  })
})
