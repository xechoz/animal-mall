import { describe, expect, it, vi } from 'vitest'
import { gameColors } from '../colors'
import { type ButtonSkinVariant, buttonFaceColor, buttonSkinMetrics } from './buttonSkin'

// The skin only needs `mixColor`; mocking the barrel keeps Phaser out of the
// node test environment. Geometry and colour decisions stay the real code.
vi.mock('@mg/core', () => ({
  mixColor: (from: number, to: number, t: number): number => {
    const clamped = Math.min(1, Math.max(0, t))
    const channel = (shift: number): number => {
      const start = (from >> shift) & 0xff
      const end = (to >> shift) & 0xff
      return Math.round(start + (end - start) * clamped)
    }
    return (channel(16) << 16) | (channel(8) << 8) | channel(0)
  },
}))

const VARIANTS: readonly ButtonSkinVariant[] = ['primary', 'soft', 'ghost', 'danger']
const HEIGHTS = [32, 36, 44, 50, 62, 68]

describe('button skin geometry', () => {
  for (const variant of VARIANTS) {
    for (const height of HEIGHTS) {
      it(`${variant} key stays inside ${height}`, () => {
        const metrics = buttonSkinMetrics(220, height, variant)
        expect(metrics.rim).toBeGreaterThan(0)
        expect(metrics.faceHeight).toBeGreaterThan(0)
        expect(metrics.faceWidth).toBeGreaterThan(0)
        expect(metrics.faceX).toBeCloseTo(-110 + metrics.rim)
        expect(metrics.rim + metrics.lip).toBeLessThan(height)
        expect(metrics.pressOffset).toBeLessThan(height / 2)
        expect(metrics.shadowOffset).toBeLessThan(height / 2)
      })
    }
  }

  it('ghost keys keep only the hairline', () => {
    const metrics = buttonSkinMetrics(180, 50, 'ghost')
    expect(metrics.lip).toBe(0)
    expect(metrics.pressOffset).toBe(0)
    expect(metrics.shadowOffset).toBe(0)
  })
})

describe('button face colours', () => {
  const theme = gameColors.theme

  it('muted buttons use paper while the label keeps full contrast', () => {
    for (const variant of ['primary', 'soft', 'danger'] as const) {
      expect(buttonFaceColor(theme, variant, false, true)).toBe(theme.surfaceAlt)
    }
  })

  it('hover lifts the face without changing the variant', () => {
    expect(buttonFaceColor(theme, 'primary', true)).not.toBe(theme.accent)
    expect(buttonFaceColor(theme, 'soft', true)).not.toBe(theme.surface)
    expect(buttonFaceColor(theme, 'danger', true)).not.toBe(theme.danger)
  })

  it('label pairs stay readable', () => {
    expect(contrast(theme.onAccent, theme.accent)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(theme.ink, theme.surface)).toBeGreaterThanOrEqual(4.5)
    // Large bold danger labels: WCAG asks for 3:1.
    expect(contrast(theme.onDanger, theme.danger)).toBeGreaterThanOrEqual(3)
  })
})

function contrast(a: number, b: number): number {
  const first = luminance(a)
  const second = luminance(b)
  const light = Math.max(first, second)
  const dark = Math.min(first, second)
  return (light + 0.05) / (dark + 0.05)
}

function luminance(color: number): number {
  const channel = (shift: number): number => {
    const value = ((color >> shift) & 0xff) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0)
}
