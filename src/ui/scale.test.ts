import { describe, expect, it } from 'vitest'
import { computeUiScale, computeWorldTextScale } from './scale'

describe('computeUiScale', () => {
  it('leaves tablets and desktops alone', () => {
    expect(computeUiScale(720)).toBe(1)
    expect(computeUiScale(768)).toBe(1)
    expect(computeUiScale(1920)).toBe(1)
  })

  it('scales phones up without exceeding the cap', () => {
    expect(computeUiScale(390)).toBeCloseTo(1.55, 5)
    expect(computeUiScale(430)).toBeCloseTo(1.55, 5)
    expect(computeUiScale(600)).toBeCloseTo(1.2, 5)
  })

  it('falls back to 1 before the viewport is known', () => {
    expect(computeUiScale(0)).toBe(1)
    expect(computeUiScale(Number.NaN)).toBe(1)
  })
})

describe('computeWorldTextScale', () => {
  it('keeps desktop labels untouched', () => {
    expect(computeWorldTextScale(1.1, 1280)).toBe(1)
    expect(computeWorldTextScale(0.8, 720)).toBe(1)
  })

  it('enlarges world labels on phones', () => {
    expect(computeWorldTextScale(1.14, 390)).toBeCloseTo(1.7, 1)
  })

  it('never shrinks labels', () => {
    expect(computeWorldTextScale(3, 390)).toBe(1)
  })
})
