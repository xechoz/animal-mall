import { describe, expect, it } from 'vitest'
import { computeUiScale, computeWorldTextScale, computeWorldZoom } from './scale'

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

describe('computeWorldZoom', () => {
  it('zooms phones to a comfortable physical world size', () => {
    expect(computeWorldZoom(1.139, 390)).toBeCloseTo(1.45, 5)
    expect(computeWorldZoom(1.139, 430)).toBeCloseTo(1.32, 1)
  })

  it('never zooms past the cap', () => {
    expect(computeWorldZoom(0.7, 360)).toBe(1.45)
    expect(computeWorldZoom(0.7, 600)).toBe(1.45)
  })

  it('leaves tablets and desktops at 1:1', () => {
    expect(computeWorldZoom(1.14, 600)).toBe(1)
    expect(computeWorldZoom(1.14, 720)).toBe(1)
    expect(computeWorldZoom(1.1, 1280)).toBe(1)
  })

  it('falls back to 1 before the viewport is known', () => {
    expect(computeWorldZoom(0, 390)).toBe(1)
    expect(computeWorldZoom(1.14, 0)).toBe(1)
    expect(computeWorldZoom(1.14, Number.NaN)).toBe(1)
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
