import type { Theme } from '@mg/core'
import type Phaser from 'phaser'
import { gameColors } from '../colors'

function leafCorner(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  flipX: 1 | -1,
  flipY: 1 | -1,
): void {
  g.fillStyle(gameColors.mossDark, 0.9)
  g.fillEllipse(x + 5 * scale * flipX, y + 2 * scale * flipY, 12 * scale, 5 * scale)
  g.fillStyle(gameColors.fern, 0.95)
  g.fillEllipse(x + 10 * scale * flipX, y + 6 * scale * flipY, 10 * scale, 4.5 * scale)
  g.fillStyle(gameColors.leafLight, 0.9)
  g.fillEllipse(x + 14 * scale * flipX, y + 10 * scale * flipY, 7 * scale, 3.5 * scale)
}

/**
 * Parchment panel with a bark frame and a pair of leaf corners. The geometry is
 * identical to the old rounded card, so callers only swap their fill/stroke
 * block for this helper.
 */
export function drawPanelFrame(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  theme: Theme,
  radius = theme.radiusLarge,
): void {
  g.fillStyle(theme.shadow, 0.22)
  g.fillRoundedRect(x, y + 8, width, height, radius)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x, y, width, height, radius)
  g.fillStyle(theme.panel, 1)
  g.fillRoundedRect(x + 3, y + 3, width - 6, height - 6, Math.max(2, radius - 2))
  g.fillStyle(gameColors.cream, 0.35)
  g.fillRoundedRect(x + 6, y + 6, width - 12, height - 12, Math.max(2, radius - 4))
  g.lineStyle(1.5, theme.borderSoft, 0.9)
  g.strokeRoundedRect(x + 6, y + 6, width - 12, height - 12, Math.max(2, radius - 4))

  const scale = Math.min(1.15, Math.max(0.55, width / 520))
  leafCorner(g, x + 14, y + 14, scale, 1, 1)
  leafCorner(g, x + width - 14, y + height - 14, scale, -1, -1)
}

/** A lighter inner card: parchment, dry-grass edge, no corner ornaments. */
export function drawCardFrame(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  theme: Theme,
  radius = theme.radius,
): void {
  g.fillStyle(theme.shadow, 0.12)
  g.fillRoundedRect(x, y + 4, width, height, radius)
  g.fillStyle(theme.surface, 0.96)
  g.fillRoundedRect(x, y, width, height, radius)
  g.lineStyle(1.5, theme.borderSoft, 0.95)
  g.strokeRoundedRect(x, y, width, height, radius)
}

/** A small wooden tag for zone names and prices. */
export function drawTagFrame(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 7,
): void {
  g.fillStyle(0x1a120c, 0.16)
  g.fillRoundedRect(x + 1, y + 3, width, height, radius)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x, y, width, height, radius)
  g.fillStyle(gameColors.hay, 1)
  g.fillRoundedRect(x + 1.5, y + 1.5, width - 3, height - 3, Math.max(2, radius - 1))
  g.fillStyle(gameColors.cream, 0.7)
  g.fillRoundedRect(x + 4, y + 3, width - 8, 2, 1)
  g.lineStyle(1, gameColors.barkDark, 0.4)
  g.lineBetween(x + 4, y + height - 3, x + width - 4, y + height - 3)
  g.fillStyle(gameColors.barkDark, 0.8)
  g.fillCircle(x + 7, y + height / 2, 1.4)
}

/** Moss-green header ribbon used by the shop panel. */
export function drawHeaderRibbon(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 14,
): void {
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x, y, width, height, radius)
  g.fillStyle(gameColors.mossDark, 1)
  g.fillRoundedRect(x + 2, y + 2, width - 4, height - 4, Math.max(2, radius - 2))
  g.fillStyle(gameColors.moss, 0.55)
  g.fillRoundedRect(x + 5, y + 5, width - 10, Math.max(3, height * 0.28), Math.max(2, radius - 4))
  g.fillStyle(gameColors.leafLight, 0.8)
  leafCorner(g, x + 12, y + height - 9, 0.55, 1, -1)
  leafCorner(g, x + width - 12, y + height - 9, 0.55, -1, -1)
}

/** A low-key vine divider for lists and cards. */
export function drawVineDivider(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
): void {
  g.lineStyle(1.2, gameColors.mossDark, 0.45)
  g.lineBetween(x, y, x + width, y)
  for (let index = 1; index < 5; index += 1) {
    const px = x + (width * index) / 5
    g.fillStyle(gameColors.moss, 0.5)
    g.fillEllipse(px, y - 1, 4, 2)
    g.fillEllipse(px + 3, y + 1, 3.5, 1.8)
  }
}
