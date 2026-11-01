import { describe, expect, it } from 'vitest'
import { GaitAnimator, gaitProfile } from './gait'

const profile = gaitProfile('rabbit')

function run(speed: number, stepMs: number, seconds: number): GaitAnimator {
  const gait = new GaitAnimator(profile, 0.5)
  let now = 0
  let x = 0
  gait.update(x, 0, now, 1)
  const frames = Math.round((seconds * 1000) / stepMs)
  for (let index = 0; index < frames; index += 1) {
    now += stepMs
    x += (speed * stepMs) / 1000
    gait.update(x, 0, now, 1)
  }
  return gait
}

function phaseAfter(speed: number, stepMs: number, seconds: number): number {
  const gait = run(speed, stepMs, seconds)
  const now = seconds * 1000
  const x = speed * seconds
  return gait.update(x, 0, now, 1).phase
}

describe('gait phase', () => {
  it('is driven by distance, not by frame rate', () => {
    const fast = phaseAfter(58, 8, 1.28)
    const slow = phaseAfter(58, 32, 1.28)
    expect(Math.abs(fast - slow)).toBeLessThan(1e-9)
  })

  it('tracks the travelled distance modulo the stride', () => {
    const gait = new GaitAnimator(profile, 0)
    let now = 0
    let x = 0
    const start = gait.update(x, 0, now, 1).phase
    for (let index = 0; index < 100; index += 1) {
      now += 16
      x += 1.6
      gait.update(x, 0, now, 1)
    }
    // 160 units over a 44-unit stride moves the phase by 160 / 44.
    const expected = (start + 160 / 44) % 1
    expect(gait.update(x, 0, now, 1).phase).toBeCloseTo(expected, 6)
  })

  it('ignores teleports instead of spinning the phase', () => {
    const gait = new GaitAnimator(profile, 0)
    let now = 0
    gait.update(0, 0, now, 1)
    now += 16
    const frame = gait.update(400, 0, now, 1)
    expect(frame.speed).toBe(0)
    expect(frame.weight).toBe(0)
  })
})

describe('gait settling', () => {
  it('drops the lift when the actor stops moving', () => {
    const gait = new GaitAnimator(profile, 0.2)
    let now = 0
    let x = 0
    gait.update(x, 0, now, 1)
    for (let index = 0; index < 90; index += 1) {
      now += 16
      x += 1.2
      gait.update(x, 0, now, 1)
    }
    expect(gait.update(x, 0, now, 1).weight).toBeGreaterThan(0.9)
    for (let index = 0; index < 40; index += 1) {
      now += 16
      gait.update(x, 0, now, 1)
    }
    const settled = gait.update(x, 0, now, 1)
    expect(settled.weight).toBeLessThan(0.05)
    expect(Math.abs(settled.lift)).toBeLessThan(0.5)
  })

  it('squashes the body on hop contact', () => {
    const gait = new GaitAnimator(profile, 0)
    let now = 0
    let x = 0
    gait.update(x, 0, now, 1)
    let minSquash = 1
    let maxLift = 0
    for (let index = 0; index < 90; index += 1) {
      now += 16
      x += 0.8
      const frame = gait.update(x, 0, now, 1)
      minSquash = Math.min(minSquash, frame.squashY)
      maxLift = Math.max(maxLift, frame.lift)
    }
    expect(maxLift).toBeGreaterThan(6)
    expect(minSquash).toBeLessThan(0.95)
  })
})

describe('gait turn', () => {
  it('pinches the body briefly after a facing change', () => {
    const gait = new GaitAnimator(profile, 0)
    let now = 0
    let x = 0
    gait.update(x, 0, now, 1)
    now += 16
    x += 1
    gait.update(x, 0, now, -1)
    now += 75
    expect(gait.update(x, 0, now, -1).turn).toBeLessThan(1)
    now += 400
    expect(gait.update(x, 0, now, -1).turn).toBe(1)
  })
})
