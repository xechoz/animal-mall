import { describe, expect, it } from 'vitest'
import {
  HEADING_MIN_DWELL_MS,
  type Heading,
  HeadingTracker,
  headingDistance,
  headingFromVector,
  mirrorForHeading,
  strideAxisForView,
  turnPath,
  viewForHeading,
} from './heading'

describe('heading sectors', () => {
  it('maps screen vectors to the eight walking directions', () => {
    expect(headingFromVector(0, 1)).toBe(0)
    expect(headingFromVector(1, 1)).toBe(1)
    expect(headingFromVector(1, 0)).toBe(2)
    expect(headingFromVector(1, -1)).toBe(3)
    expect(headingFromVector(0, -1)).toBe(4)
    expect(headingFromVector(-1, -1)).toBe(5)
    expect(headingFromVector(-1, 0)).toBe(6)
    expect(headingFromVector(-1, 1)).toBe(7)
  })

  it('maps the eight headings to three movement views', () => {
    const headings: Heading[] = [0, 1, 2, 3, 4, 5, 6, 7]
    expect(headings.map((heading) => viewForHeading(heading))).toEqual([
      'front',
      'front',
      'frontSide',
      'back',
      'back',
      'back',
      'frontSide',
      'front',
    ])
  })

  it('keeps the foot stride on the facing axis', () => {
    expect(strideAxisForView('front')).toEqual({ x: 0, y: 1 })
    expect(strideAxisForView('back')).toEqual({ x: 0, y: -1 })
    expect(strideAxisForView('frontSide')).toEqual({ x: 1, y: 0 })
    expect(strideAxisForView('side')).toEqual({ x: 1, y: 0 })
    expect(strideAxisForView('backSide')).toEqual({ x: 1, y: 0 })
  })

  it('mirrors only the left half of the base art', () => {
    expect([0, 1, 2, 3, 4].every((heading) => !mirrorForHeading(heading as Heading))).toBe(true)
    expect([5, 6, 7].every((heading) => mirrorForHeading(heading as Heading))).toBe(true)
  })

  it('walks the short way around the compass', () => {
    expect(turnPath(0, 4)).toHaveLength(4)
    expect(turnPath(4, 5)).toEqual([5])
    expect(turnPath(0, 7)).toEqual([7])
    expect(turnPath(7, 1)).toEqual([0, 1])
    expect(headingDistance(1, 7)).toBe(2)
  })
})

describe('heading tracker', () => {
  it('keeps the old heading when the actor stops', () => {
    const tracker = new HeadingTracker()
    tracker.update(0, -4, 0)
    expect(tracker.heading).toBe(4)
    expect(tracker.update(0, 0, 100)).toBe(4)
  })

  it('does not flicker on a sector boundary', () => {
    const tracker = new HeadingTracker(4)
    const now = 1_000
    // 28 degrees away from straight up, still inside the hysteresis margin.
    const angle = -Math.PI / 2 + (28 * Math.PI) / 180
    expect(tracker.update(Math.cos(angle), Math.sin(angle), now)).toBe(4)
  })

  it('flips once the vector leaves the margin', () => {
    const tracker = new HeadingTracker(4)
    const angle = -Math.PI / 2 + (40 * Math.PI) / 180
    expect(tracker.update(Math.cos(angle), Math.sin(angle), 1_000)).toBe(3)
  })

  it('rate limits rapid reversals', () => {
    const tracker = new HeadingTracker(0)
    expect(tracker.update(0, -4, 0)).toBe(4)
    expect(tracker.update(0, 4, HEADING_MIN_DWELL_MS - 1)).toBe(4)
    expect(tracker.update(0, 4, HEADING_MIN_DWELL_MS)).toBe(0)
  })

  it('remembers the last horizontal side for a front or back pose', () => {
    const tracker = new HeadingTracker()
    tracker.update(-3, 0, 0)
    expect(tracker.side).toBe(-1)
    tracker.update(0, -3, 200)
    expect(tracker.side).toBe(-1)
  })
})
