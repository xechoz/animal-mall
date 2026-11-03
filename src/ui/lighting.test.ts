import { describe, expect, it } from 'vitest'
import { DAY } from '../logic/config'
import { dayHour, dayLighting } from './lighting'

function hourMs(hour: number): number {
  return ((hour - DAY.openHour) / (DAY.closeHour - DAY.openHour)) * DAY.lengthMs
}

describe('day lighting curve', () => {
  it('stays bright through the afternoon and starts the golden hour at 17:00', () => {
    expect(dayLighting(0)).toEqual({ night: 0, warm: 0, lights: 0 })
    expect(dayLighting(hourMs(16))).toEqual({ night: 0, warm: 0, lights: 0 })
    expect(dayHour(hourMs(17))).toBeCloseTo(17)
    expect(dayLighting(hourMs(17))).toEqual({ night: 0, warm: 0, lights: 0 })
  })

  it('deepens every hour until closing', () => {
    expect(dayLighting(hourMs(18))).toEqual({ night: 0.25, warm: 1, lights: 0.3 })
    expect(dayLighting(hourMs(19))).toEqual({ night: 0.55, warm: 0.55, lights: 0.6 })
    expect(dayLighting(hourMs(20))).toEqual({ night: 0.86, warm: 0.12, lights: 0.85 })
    expect(dayLighting(hourMs(21))).toEqual({ night: 1, warm: 0, lights: 1 })
    expect(dayLighting(DAY.lengthMs + 60_000)).toEqual({ night: 1, warm: 0, lights: 1 })
  })

  it('rises monotonically and never leaves the 0-1 range', () => {
    let previous = 0
    for (let hour = 17; hour <= 21; hour += 0.125) {
      const lighting = dayLighting(hourMs(hour))
      expect(lighting.night).toBeGreaterThanOrEqual(previous)
      previous = lighting.night
      for (const value of [lighting.night, lighting.warm, lighting.lights]) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    }
  })
})
