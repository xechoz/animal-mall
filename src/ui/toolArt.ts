import type Phaser from 'phaser'
import { gameColors } from '../colors'
import type { UpgradeKind } from '../logic/types'

export type ToolIconKind = UpgradeKind | 'shelf'

export function drawToolIcon(
  g: Phaser.GameObjects.Graphics,
  kind: ToolIconKind,
  x: number,
  y: number,
  size: number,
): void {
  g.clear()
  g.lineStyle(3, gameColors.woodDark, 1)
  g.fillStyle(gameColors.woodLight, 1)
  if (kind === 'carry') {
    g.fillRoundedRect(x - size / 2, y - size / 4, size, size / 2, 4)
    g.strokeRoundedRect(x - size / 2, y - size / 4, size, size / 2, 4)
    g.beginPath()
    g.arc(x, y - size / 4, size / 4, Math.PI, Math.PI * 2)
    g.strokePath()
  } else if (kind === 'shelf') {
    g.lineBetween(x - size / 2, y - size / 3, x + size / 2, y - size / 3)
    g.lineBetween(x - size / 2, y + size / 3, x + size / 2, y + size / 3)
    g.fillRect(x - size / 2, y - size / 3, 4, size / 2)
    g.fillRect(x + size / 2 - 4, y - size / 3, 4, size / 2)
  } else if (kind === 'speed') {
    g.fillStyle(gameColors.coral, 1)
    g.fillRoundedRect(x - size / 2, y - size / 5, size, size / 2, 6)
    g.fillStyle(0xf7d6c4, 1)
    g.fillRoundedRect(x - size / 2 + 4, y + size / 5, size - 8, 4, 2)
  } else if (kind === 'scan') {
    g.fillRoundedRect(x - size / 2, y - size / 3, size, size * 0.66, 5)
    g.strokeRoundedRect(x - size / 2, y - size / 3, size, size * 0.66, 5)
    g.fillStyle(0x5fbf9f, 1)
    g.fillRect(x - size / 3, y - size / 8, size * 0.66, 3)
  } else {
    g.fillStyle(gameColors.leafDark, 1)
    g.fillEllipse(x, y - size / 6, size, size / 2)
    g.fillStyle(gameColors.leaf, 1)
    g.fillEllipse(x - size / 6, y - size / 3, size / 2, size / 3)
    g.fillStyle(0xffd166, 1)
    g.fillCircle(x + size / 4, y + size / 6, size / 8)
  }
}
