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
  /** Panels with a title on the top-left drop the upper leaves to clear it. */
  topCorners = true,
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
  if (topCorners) leafCorner(g, x + 14, y + 14, scale, 1, 1)
  leafCorner(g, x + width - 14, y + height - 14, scale, -1, -1)
}

/**
 * A light popover shell for slot pickers. It shares the parchment face and
 * bark edge with the big dialogs but skips the leaf corners and the heavy
 * accent rim, so an anchored chooser does not shout over the world.
 */
export function drawPopoverFrame(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  theme: Theme,
  radius = theme.radiusLarge,
): void {
  g.fillStyle(theme.shadow, 0.22)
  g.fillRoundedRect(x, y + 6, width, height, radius)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x, y, width, height, radius)
  g.fillStyle(theme.panel, 1)
  g.fillRoundedRect(x + 2.5, y + 2.5, width - 5, height - 5, Math.max(2, radius - 2))
  g.lineStyle(1.5, theme.borderSoft, 0.95)
  g.strokeRoundedRect(x + 2.5, y + 2.5, width - 5, height - 5, Math.max(2, radius - 2))
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
