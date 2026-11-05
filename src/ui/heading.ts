/**
 * Screen-space walking headings. Eight sectors keep the four cardinal views
 * plus the four three-quarter views, which is what makes a turned animal read
 * correctly on a top-down floor plan.
 *
 * Sector 0 points down (towards the camera), 2 right, 4 up (away from the
 * camera) and 6 left. The odd numbers are the diagonals in between.
 */
export type Heading = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export type AnimalView = 'front' | 'frontSide' | 'side' | 'backSide' | 'back'

export const HEADING_COUNT = 8
export const HALF_SECTOR = Math.PI / 8
/** Extra angle the vector has to travel before the view flips, in radians. */
export const HEADING_HYSTERESIS = (7 * Math.PI) / 180
/** Minimum time between two view changes while walking, in milliseconds. */
export const HEADING_MIN_DWELL_MS = 70

const TAU = Math.PI * 2
const SECTOR = Math.PI / 4

export function normaliseHeading(value: number): Heading {
  return (((Math.round(value) % HEADING_COUNT) + HEADING_COUNT) % HEADING_COUNT) as Heading
}

/** Screen angle of a heading: 0 is right, positive is clockwise. */
export function headingAngle(heading: Heading): number {
  return (2 - heading) * SECTOR
}

export function headingFromAngle(angle: number): Heading {
  return normaliseHeading(2 - angle / SECTOR)
}

export function headingFromVector(dx: number, dy: number): Heading {
  return headingFromAngle(Math.atan2(dy, dx))
}

export function viewForHeading(heading: Heading): AnimalView {
  switch (heading) {
    case 0:
      return 'front'
    case 1:
    case 7:
      return 'frontSide'
    case 2:
    case 6:
      return 'side'
    case 3:
    case 5:
      return 'backSide'
    default:
      return 'back'
  }
}

/** True when the base art (which faces right) has to be mirrored. */
export function mirrorForHeading(heading: Heading): boolean {
  return heading >= 5
}

/** Shortest number of 45-degree steps between two headings. */
export function headingDistance(from: Heading, to: Heading): number {
  const raw = Math.abs(to - from) % HEADING_COUNT
  return Math.min(raw, HEADING_COUNT - raw)
}

/** Headings visited while turning from one direction to another. */
export function turnPath(from: Heading, to: Heading): Heading[] {
  const forward = (to - from + HEADING_COUNT) % HEADING_COUNT
  const backward = (from - to + HEADING_COUNT) % HEADING_COUNT
  const step = forward <= backward ? 1 : -1
  const count = Math.min(forward, backward)
  const path: Heading[] = []
  for (let index = 1; index <= count; index += 1) {
    path.push(normaliseHeading(from + step * index))
  }
  return path
}

function shortestAngle(from: number, to: number): number {
  let delta = (to - from) % TAU
  if (delta > Math.PI) delta -= TAU
  if (delta < -Math.PI) delta += TAU
  return delta
}

/**
 * Turns a stream of small movement vectors into a stable heading. A vector has
 * to leave the current sector by the hysteresis margin before the view flips,
 * so walking along a sector boundary does not make the animal vibrate between
 * two poses.
 */
export class HeadingTracker {
  private headingValue: Heading
  private sideValue: -1 | 1 = 1
  private changedAt = Number.NEGATIVE_INFINITY

  constructor(initial: Heading = 0, side: -1 | 1 = 1) {
    this.headingValue = initial
    this.sideValue = side
  }

  get heading(): Heading {
    return this.headingValue
  }

  /** Last meaningful horizontal direction, retained while walking straight up or down. */
  get side(): -1 | 1 {
    return this.sideValue
  }

  reset(heading: Heading, now: number): void {
    this.headingValue = heading
    this.changedAt = now
  }

  update(dx: number, dy: number, now: number): Heading {
    if (Math.abs(dx) > 0.05) this.sideValue = dx < 0 ? -1 : 1

    const distance = Math.hypot(dx, dy)
    if (distance < 0.2) return this.headingValue

    const angle = Math.atan2(dy, dx)
    const delta = Math.abs(shortestAngle(headingAngle(this.headingValue), angle))
    if (delta <= HALF_SECTOR + HEADING_HYSTERESIS) return this.headingValue
    if (now - this.changedAt < HEADING_MIN_DWELL_MS) return this.headingValue

    this.headingValue = headingFromAngle(angle)
    this.changedAt = now
    return this.headingValue
  }
}
