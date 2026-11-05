import { describe, expect, it } from 'vitest'
import { GaitAnimator, gaitProfile } from './gait'

const profile = gaitProfile('rabbit')

function run(speed: number, stepMs: number, seconds: number): GaitAnimator {
  const gait = new GaitAnimator(profile, 0.5)
  let now = 0
  let x = 0
  gait.update(x, 0, now)
  const frames = Math.round((seconds * 1000) / stepMs)
  for (let index = 0; index < frames; index += 1) {
    now += stepMs
    x += (speed * stepMs) / 1000
    gait.update(x, 0, now)
  }
  return gait
}

function phaseAfter(speed: number, stepMs: number, seconds: number): number {
  const gait = run(speed, stepMs, seconds)
  const now = seconds * 1000
  const x = speed * seconds
  return gait.update(x, 0, now).phase
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
    const start = gait.update(x, 0, now).phase
    for (let index = 0; index < 100; index += 1) {
      now += 16
      x += 1.6
      gait.update(x, 0, now)
    }
    // 160 units over a 44-unit stride moves the phase by 160 / 44.
    const expected = (start + 160 / 44) % 1
    expect(gait.update(x, 0, now).phase).toBeCloseTo(expected, 6)
  })

  it('ignores teleports instead of spinning the phase', () => {
    const gait = new GaitAnimator(profile, 0)
    let now = 0
    gait.update(0, 0, now)
    now += 16
    const frame = gait.update(400, 0, now)
    expect(frame.speed).toBe(0)
    expect(frame.weight).toBe(0)
  })
})

describe('gait settling', () => {
  it('drops the lift when the actor stops moving', () => {
    const gait = new GaitAnimator(profile, 0.2)
    let now = 0
    let x = 0
    gait.update(x, 0, now)
    for (let index = 0; index < 90; index += 1) {
      now += 16
      x += 1.2
      gait.update(x, 0, now)
    }
    expect(gait.update(x, 0, now).weight).toBeGreaterThan(0.9)
    for (let index = 0; index < 40; index += 1) {
      now += 16
      gait.update(x, 0, now)
    }
    const settled = gait.update(x, 0, now)
    expect(settled.weight).toBeLessThan(0.05)
    expect(Math.abs(settled.lift)).toBeLessThan(0.5)
  })

  it('squashes the body on hop contact', () => {
    const gait = new GaitAnimator(profile, 0)
    let now = 0
    let x = 0
    gait.update(x, 0, now)
    let minSquash = 1
    let maxLift = 0
    for (let index = 0; index < 90; index += 1) {
      now += 16
      x += 0.8
      const frame = gait.update(x, 0, now)
      minSquash = Math.min(minSquash, frame.squashY)
      maxLift = Math.max(maxLift, frame.lift)
    }
    expect(maxLift).toBeGreaterThan(6)
    expect(minSquash).toBeLessThan(0.95)
  })
})

describe('grounded feet', () => {
  it('marks walkers as grounded so a support foot can stay planted', () => {
    const gait = new GaitAnimator(gaitProfile('bear'), 0.3)
    gait.update(0, 0, 0)
    expect(gait.update(1.5, 0, 16).grounded).toBe(true)
  })

  it('leaves hop gaits airborne instead of pinning the feet', () => {
    const gait = new GaitAnimator(gaitProfile('rabbit'), 0.3)
    gait.update(0, 0, 0)
    expect(gait.update(1.5, 0, 16).grounded).toBe(false)
  })

  it('keeps the player on the walking profile', () => {
    const player = gaitProfile('bear', true)
    expect(player.kind).toBe('waddle')
    expect(player.stepReach).toBeGreaterThan(0)
  })

  it('keeps a walker torso still while the feet step', () => {
    const walker = gaitProfile('bear')
    const gait = new GaitAnimator(walker, 0)
    let now = 0
    let x = 0
    gait.update(0, 0, 0)
    let maxLift = 0
    let maxSway = 0
    let maxRock = 0
    let maxSquash = 0
    let maxHead = 0
    let maxTail = 0
    let maxTurn = 0
    let maxFootX = 0
    let maxFootY = 0
    for (let index = 0; index < 400; index += 1) {
      now += 16
      x += walker.stride / 200
      const frame = gait.update(x, 0, now)
      if (frame.weight < 0.9) continue
      maxLift = Math.max(maxLift, Math.abs(frame.lift))
      maxSway = Math.max(maxSway, Math.abs(frame.sway))
      maxRock = Math.max(maxRock, Math.abs(frame.rock))
      maxSquash = Math.max(maxSquash, Math.abs(frame.squashX - 1), Math.abs(frame.squashY - 1))
      maxHead = Math.max(maxHead, Math.abs(frame.headX), Math.abs(frame.headY))
      maxTail = Math.max(maxTail, Math.abs(frame.tailWag))
      maxTurn = Math.max(maxTurn, Math.abs(frame.turn - 1))
      maxFootX = Math.max(maxFootX, Math.abs(frame.footLeft.x), Math.abs(frame.footRight.x))
      maxFootY = Math.max(maxFootY, frame.footLeft.y, frame.footRight.y)
    }
    expect(maxLift).toBeLessThan(0.001)
    expect(maxSway).toBeLessThan(0.001)
    expect(maxRock).toBeLessThan(0.001)
    expect(maxSquash).toBeLessThan(0.001)
    expect(maxHead).toBeLessThan(0.001)
    expect(maxTail).toBeLessThan(0.001)
    expect(maxTurn).toBeLessThan(0.001)
    expect(maxFootX).toBeGreaterThan(2)
    expect(maxFootY).toBeGreaterThan(1)
  })
})
