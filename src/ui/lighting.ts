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
