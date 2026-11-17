import { describe, expect, it } from 'vitest'
import { DAY } from '../logic/config'
import {
  dayHour,
  dayLighting,
  daySkyTint,
  MUSIC_VOLUME,
  musicVolumeForNight,
  NIGHT_AMBIENCE_PEAK,
  nightAmbienceVolume,
} from './lighting'

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

describe('day sky tint', () => {
  it('starts on the morning mint with a warm sun', () => {
    expect(daySkyTint(0)).toEqual({ band: 0xbfe3d6, icon: 0xf3cf7a })
  })

  it('turns golden at dusk and grey at closing', () => {
    const golden = daySkyTint(hourMs(18))
    expect((golden.band >> 16) & 0xff).toBeGreaterThan(golden.band & 0xff)
    expect((golden.icon >> 16) & 0xff).toBeGreaterThan(golden.icon & 0xff)

    expect(daySkyTint(DAY.lengthMs)).toEqual({ band: 0x6f7783, icon: 0xe8eef2 })
    expect(daySkyTint(DAY.lengthMs + 60_000)).toEqual({ band: 0x6f7783, icon: 0xe8eef2 })
  })

  it('keeps the band brighter at noon than at closing', () => {
    const brightness = (color: number): number =>
      ((color >> 16) & 0xff) + ((color >> 8) & 0xff) + (color & 0xff)
    expect(brightness(daySkyTint(hourMs(12)).band)).toBeGreaterThan(
      brightness(daySkyTint(DAY.lengthMs).band),
    )
  })
})

describe('night ambience audio curves', () => {
  it('stays silent through the daytime and wakes up after 17:00', () => {
    expect(nightAmbienceVolume(0)).toBe(0)
    expect(nightAmbienceVolume(hourMs(17))).toBe(0)
    expect(nightAmbienceVolume(hourMs(18))).toBeCloseTo(0.25 * NIGHT_AMBIENCE_PEAK)
    expect(nightAmbienceVolume(hourMs(21))).toBeCloseTo(NIGHT_AMBIENCE_PEAK)
  })

  it('silences the cricket loop while the end-of-day report is open', () => {
    expect(nightAmbienceVolume(hourMs(20.5), true)).toBe(0)
  })

  it('ducks the daytime music smoothly once evening deepens', () => {
    expect(musicVolumeForNight(0)).toBe(MUSIC_VOLUME)
    expect(musicVolumeForNight(0.35)).toBe(MUSIC_VOLUME)
    expect(musicVolumeForNight(1)).toBeCloseTo(MUSIC_VOLUME * 0.75)
  })
})
