import type { Theme } from '@mg/core'
import type Phaser from 'phaser'

export interface HudGlassRect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/**
 * One frosted parchment plate for every HUD surface that floats over the world.
 * The coin purse, the day clock and the round actions used to carry three
 * slightly different shadows, borders and creams, which read as three separate
 * stickers. Sharing this material makes the top row one system while still
 * letting the canopy show through. Text readouts pass a slightly denser alpha
 * than icon-only actions so a world label sliding under the bar cannot compete
 * with the clock or the purse; the surface, border and top light stay identical.
 */
export function drawHudGlass(
  g: Phaser.GameObjects.Graphics,
  rect: HudGlassRect,
  theme: Theme,
  scale = 1,
  alpha = 0.76,
): void {
  const radius = rect.h / 2
  g.fillStyle(theme.shadow, 0.18)
  g.fillRoundedRect(rect.x, rect.y + 3 * scale, rect.w, rect.h, radius)
  g.fillStyle(theme.surface, alpha)
  g.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, radius)
  g.lineStyle(scale, theme.borderSoft, 0.55)
  g.strokeRoundedRect(
    rect.x + 0.5 * scale,
    rect.y + 0.5 * scale,
    rect.w - scale,
    rect.h - scale,
    Math.max(1, radius - 0.5 * scale),
  )
  // A soft top light, not a second border: it sells the plate as glass without
  // adding another high-contrast line to the top row.
  g.fillStyle(theme.highlight, 0.18)
  g.fillEllipse(rect.x + rect.w / 2, rect.y + rect.h * 0.16, rect.w * 0.7, rect.h * 0.16)
}
