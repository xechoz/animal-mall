import type Phaser from 'phaser'
import { gameColors } from '../colors'
import type { UpgradeKind } from '../logic/types'

export type ToolIconKind = UpgradeKind | 'shelf'

/**
 * Small line-and-paper tool marks. The old icons were coloured blobs that all
 * read as the same rounded rectangle; each of these has a distinct silhouette
 * (basket, shelves, shoe, scanner, sprout) at 20–28 design units.
 */
export function drawToolIcon(
  g: Phaser.GameObjects.Graphics,
  kind: ToolIconKind,
  x: number,
  y: number,
  size: number,
): void {
  g.clear()
  const s = size
  const ink = gameColors.barkDark
  const line = Math.max(1.8, s * 0.1)
  const accent = gameColors.ui.accent
  const hay = gameColors.ui.hay
  const leaf = gameColors.ui.leaf

  g.lineStyle(line, ink, 1)

  if (kind === 'carry') {
    // Wicker basket with a handle and two visible fruits.
    g.fillStyle(hay, 1)
    g.beginPath()
    g.moveTo(x - s * 0.42, y - s * 0.06)
    g.lineTo(x + s * 0.42, y - s * 0.06)
    g.lineTo(x + s * 0.3, y + s * 0.4)
    g.lineTo(x - s * 0.3, y + s * 0.4)
    g.closePath()
    g.fillPath()
    g.strokePath()
    g.lineStyle(line * 0.7, ink, 0.7)
    for (let index = -1; index <= 1; index += 1) {
      g.lineBetween(
        x - s * 0.34,
        y + s * (0.14 + index * 0.1),
        x + s * 0.34,
        y + s * (0.14 + index * 0.1),
      )
    }
    g.lineStyle(line, ink, 1)
    g.beginPath()
    g.arc(x, y - s * 0.06, s * 0.28, Math.PI, Math.PI * 2)
    g.strokePath()
    g.fillStyle(accent, 1)
    g.fillCircle(x - s * 0.2, y - s * 0.08, s * 0.11)
    g.fillStyle(leaf, 1)
    g.fillCircle(x + s * 0.17, y - s * 0.1, s * 0.1)
  } else if (kind === 'shelf') {
    // Two shelves with a few jars and a bag, not a pair of rectangles.
    g.fillStyle(gameColors.woodLight, 1)
    g.fillRect(x - s * 0.45, y - s * 0.48, s * 0.9, s * 0.08)
    g.fillRect(x - s * 0.45, y + s * 0.08, s * 0.9, s * 0.08)
    g.fillStyle(ink, 0.85)
    g.fillRect(x - s * 0.42, y - s * 0.48, s * 0.07, s * 0.62)
    g.fillRect(x + s * 0.35, y - s * 0.48, s * 0.07, s * 0.62)
    g.fillStyle(accent, 1)
    g.fillRoundedRect(x - s * 0.3, y - s * 0.34, s * 0.18, s * 0.24, s * 0.04)
    g.fillStyle(leaf, 1)
    g.fillRoundedRect(x - s * 0.05, y - s * 0.3, s * 0.16, s * 0.2, s * 0.04)
    g.fillStyle(hay, 1)
    g.fillRoundedRect(x + s * 0.16, y - s * 0.32, s * 0.14, s * 0.22, s * 0.04)
    g.fillStyle(accent, 0.9)
    g.fillRoundedRect(x - s * 0.28, y + s * 0.22, s * 0.22, s * 0.2, s * 0.04)
    g.fillStyle(leaf, 0.9)
    g.fillRoundedRect(x + s * 0.02, y + s * 0.22, s * 0.24, s * 0.2, s * 0.04)
  } else if (kind === 'speed') {
    // Running shoe in profile plus two speed strokes.
    g.fillStyle(ink, 1)
    g.fillRoundedRect(x - s * 0.44, y + s * 0.22, s * 0.9, s * 0.12, s * 0.06)
    g.fillStyle(hay, 1)
    g.beginPath()
    g.moveTo(x - s * 0.38, y + s * 0.22)
    g.lineTo(x - s * 0.36, y - s * 0.06)
    g.lineTo(x - s * 0.08, y - s * 0.1)
    g.lineTo(x + s * 0.12, y - s * 0.38)
    g.lineTo(x + s * 0.3, y - s * 0.3)
    g.lineTo(x + s * 0.42, y + s * 0.22)
    g.closePath()
    g.fillPath()
    g.strokePath()
    g.lineStyle(line * 0.75, ink, 0.8)
    for (let index = 0; index < 3; index += 1) {
      g.lineBetween(
        x - s * 0.2 + index * s * 0.12,
        y - s * 0.02,
        x + s * 0.02 + index * s * 0.12,
        y + s * 0.1,
      )
    }
    g.lineStyle(line, accent, 1)
    g.lineBetween(x - s * 0.52, y - s * 0.16, x - s * 0.3, y - s * 0.16)
    g.lineBetween(x - s * 0.58, y + s * 0.04, x - s * 0.36, y + s * 0.04)
  } else if (kind === 'scan') {
    // Hand scanner with a beam and a barcode.
    g.fillStyle(gameColors.ui.paperDeep, 1)
    g.fillRoundedRect(x - s * 0.34, y - s * 0.4, s * 0.58, s * 0.42, s * 0.08)
    g.strokeRoundedRect(x - s * 0.34, y - s * 0.4, s * 0.58, s * 0.42, s * 0.08)
    g.fillStyle(ink, 0.85)
    g.fillRoundedRect(x - s * 0.2, y + s * 0.02, s * 0.24, s * 0.28, s * 0.05)
    g.fillStyle(accent, 1)
    g.fillRoundedRect(x - s * 0.28, y - s * 0.32, s * 0.46, s * 0.18, s * 0.04)
    g.fillStyle(ink, 0.9)
    for (let index = 0; index < 4; index += 1) {
      g.fillRect(x - s * 0.22 + index * s * 0.1, y - s * 0.28, s * 0.03, s * 0.1)
    }
    g.fillStyle(accent, 0.28)
    g.beginPath()
    g.moveTo(x + s * 0.24, y - s * 0.24)
    g.lineTo(x + s * 0.52, y - s * 0.36)
    g.lineTo(x + s * 0.52, y + s * 0.02)
    g.lineTo(x + s * 0.24, y - s * 0.02)
    g.closePath()
    g.fillPath()
  } else {
    // A sprout in a pot: growth boost.
    g.fillStyle(gameColors.ui.paperDeep, 1)
    g.beginPath()
    g.moveTo(x - s * 0.28, y + s * 0.16)
    g.lineTo(x + s * 0.28, y + s * 0.16)
    g.lineTo(x + s * 0.2, y + s * 0.44)
    g.lineTo(x - s * 0.2, y + s * 0.44)
    g.closePath()
    g.fillPath()
    g.strokePath()
    g.lineStyle(line, leaf, 1)
    g.lineBetween(x, y + s * 0.16, x, y - s * 0.28)
    g.fillStyle(leaf, 1)
    g.fillEllipse(x - s * 0.16, y - s * 0.2, s * 0.3, s * 0.16)
    g.fillEllipse(x + s * 0.16, y - s * 0.3, s * 0.3, s * 0.16)
    g.fillStyle(accent, 1)
    g.fillCircle(x + s * 0.38, y - s * 0.36, s * 0.07)
    g.fillCircle(x + s * 0.5, y - s * 0.22, s * 0.045)
  }
}
