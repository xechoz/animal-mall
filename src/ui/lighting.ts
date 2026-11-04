import { DAY } from '../logic/config'
import { dayProgress } from '../logic/day'

export interface DayLighting {
  /** 0 at 17:00, 1 at 21:00. Drives the grey night wash and the vignette. */
  readonly night: number
  /** Golden-hour warmth; peaks at 18:00 and fades into the grey night. */
  readonly warm: number
  /** How strongly the lanterns and other practical lights are lit. */
  readonly lights: number
}

interface LightingStop extends DayLighting {
  readonly hour: number
}

/**
 * A shop day is five minutes, so one in-game hour is only 25 seconds. Sampling
 * these hourly stops continuously keeps the dusk natural; hard steps would pop
 * every 25 seconds.
 */
const STOPS: readonly LightingStop[] = [
  { hour: 17, night: 0, warm: 0, lights: 0 },
  { hour: 18, night: 0.25, warm: 1, lights: 0.3 },
  { hour: 19, night: 0.55, warm: 0.55, lights: 0.6 },
  { hour: 20, night: 0.86, warm: 0.12, lights: 0.85 },
  { hour: 21, night: 1, warm: 0, lights: 1 },
]

/** The compressed shop clock as a decimal hour (09.0–21.0). */
export function dayHour(ms: number): number {
  return DAY.openHour + dayProgress(ms) * (DAY.closeHour - DAY.openHour)
}

export interface DaySkyTint {
  /** Ambient tint for the clock rim, from morning mint to grey night. */
  readonly band: number
  /** The sun or moon disc, warming into the golden hour and cooling after dusk. */
  readonly icon: number
}

const DAY_BAND = 0xbfe3d6
const DUSK_BAND = 0xf6c98a
const NIGHT_BAND = 0x6f7783
const DAY_ICON = 0xf3cf7a
const DUSK_ICON = 0xf0a35c
const MOON_ICON = 0xe8eef2

/**
 * HUD colours for the same curve the world uses, so the clock and the shop
 * cannot disagree about the time of day. The tint stays on the rim and the
 * arc, keeping the cream pill and its dark time text untouched.
 */
export function daySkyTint(ms: number): DaySkyTint {
  const { night, warm } = dayLighting(ms)
  const base = mixColor(DAY_BAND, NIGHT_BAND, night)
  const band = mixColor(base, DUSK_BAND, warm * 0.5)
  const icon = mixColor(mixColor(DAY_ICON, DUSK_ICON, warm), MOON_ICON, night)
  return { band, icon }
}

function mixColor(from: number, to: number, t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  const channel = (shift: number): number => {
    const start = (from >> shift) & 0xff
    const end = (to >> shift) & 0xff
    return Math.round(start + (end - start) * clamped)
  }
  return (channel(16) << 16) | (channel(8) << 8) | channel(0)
}

/** Interpolated lighting for the current frame; constant time, no allocation beyond the result. */
export function dayLighting(ms: number): DayLighting {
  const hour = dayHour(ms)
  const first = STOPS[0]
  const last = STOPS[STOPS.length - 1]
  if (first === undefined || last === undefined) throw new Error('Lighting stops are missing')

  if (hour <= first.hour) return { night: first.night, warm: first.warm, lights: first.lights }
  if (hour >= last.hour) return { night: last.night, warm: last.warm, lights: last.lights }

  let index = 0
  while (index < STOPS.length - 2) {
    const next = STOPS[index + 1]
    if (next === undefined || hour < next.hour) break
    index += 1
  }

  const from = STOPS[index]
  const to = STOPS[index + 1]
  if (from === undefined || to === undefined) throw new Error('Lighting stops are missing')
  const span = to.hour - from.hour
  const t = smoothstep(span <= 0 ? 0 : (hour - from.hour) / span)

  return {
    night: lerp(from.night, to.night, t),
    warm: lerp(from.warm, to.warm, t),
    lights: lerp(from.lights, to.lights, t),
  }
}

function smoothstep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  return clamped * clamped * (3 - 2 * clamped)
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}
