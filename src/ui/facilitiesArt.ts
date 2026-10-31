import type Phaser from 'phaser'
import { gameColors } from '../colors'
import type { DrinkKind, Rect } from '../logic/types'

export interface CupColors {
  readonly body: number
  readonly liquid: number
}

export const DRINK_CUP_COLORS: Readonly<Record<DrinkKind, CupColors>> = {
  appleSoda: { body: 0xd8f0c0, liquid: 0x7fbf5f },
  milkTea: { body: 0xf0d3a5, liquid: 0xb87545 },
  lemonTea: { body: 0xfff0a8, liquid: 0xffd166 },
}

export function drawCup(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale = 1,
  colors: CupColors = { body: 0xfff7e8, liquid: gameColors.coral },
): void {
  const s = scale
  g.fillStyle(gameColors.theme.shadow, 0.12)
  g.fillEllipse(x, y + 13 * s, 24 * s, 6 * s)
  g.fillStyle(colors.body, 1)
  g.fillRoundedRect(x - 9 * s, y - 12 * s, 18 * s, 22 * s, 5 * s)
  g.fillStyle(colors.liquid, 1)
  g.fillRoundedRect(x - 7 * s, y - 8 * s, 14 * s, 14 * s, 4 * s)
  g.fillStyle(0xffffff, 0.38)
  g.fillRoundedRect(x - 6 * s, y - 10 * s, 4 * s, 10 * s, 2 * s)
  g.fillStyle(0x3b2f3a, 0.22)
  g.fillRoundedRect(x - 10.5 * s, y - 14 * s, 21 * s, 4 * s, 2 * s)
  g.lineStyle(2 * s, 0x3b2f3a, 0.55)
  g.lineBetween(x + 3 * s, y - 13 * s, x + 8 * s, y - 23 * s)
}

export function drawTrashBin(g: Phaser.GameObjects.Graphics, rect: Rect): void {
  const x = rect.x
  const y = rect.y
  const w = rect.w
  const h = rect.h
  const cx = x + w / 2

  g.fillStyle(0x3b2f3a, 0.16)
  g.fillEllipse(cx + 2, y + h - 2, w + 8, 10)
  g.fillStyle(0x6f8c84, 1)
  g.fillRoundedRect(x + 3, y + 8, w - 6, h - 12, 5)
  g.fillStyle(0x9fb8ae, 1)
  g.fillRoundedRect(x + 5, y + 10, w - 10, h - 18, 4)

  g.lineStyle(2, 0x6f8c84, 0.55)
  for (let index = 1; index < 4; index += 1) {
    const lineX = x + 5 + ((w - 10) * index) / 4
    g.lineBetween(lineX, y + 15, lineX, y + h - 12)
  }

  g.fillStyle(0x4f6b64, 1)
  g.fillRoundedRect(x + 1, y + 4, w - 2, 8, 4)
  g.fillStyle(0x7d9b92, 1)
  g.fillRoundedRect(x + 4, y + 5, w - 8, 3, 1.5)
  g.fillStyle(0x3b2f3a, 0.5)
  g.fillRoundedRect(cx - 6, y + 1, 12, 4, 2)

  g.fillStyle(gameColors.theme.panel, 0.9)
  g.fillCircle(x + w - 8, y + h - 7, 3)
}

export function drawVendingMachine(g: Phaser.GameObjects.Graphics, rect: Rect): void {
  const x = rect.x
  const y = rect.y
  const w = rect.w
  const h = rect.h

  g.fillStyle(0x3b2f3a, 0.18)
  g.fillRoundedRect(x + 4, y + 8, w, h, 10)
  g.fillStyle(0x3b2f3a, 1)
  g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 11)
  g.fillStyle(0xfff3dd, 1)
  g.fillRoundedRect(x + 2, y + 2, w - 4, h - 4, 9)

  // Top sign band.
  g.fillStyle(gameColors.coral, 1)
  g.fillRoundedRect(x + 3, y + 3, w - 6, 20, 7)
  g.fillStyle(0xffffff, 0.2)
  g.fillRoundedRect(x + 7, y + 6, w - 14, 6, 3)

  // Glass window.
  g.fillStyle(0x3b2f3a, 0.78)
  g.fillRoundedRect(x + 7, y + 28, w - 14, h - 57, 5)
  g.fillStyle(gameColors.sky, 0.9)
  g.fillRoundedRect(x + 9, y + 30, w - 18, h - 61, 4)
  g.fillStyle(0xffffff, 0.22)
  g.fillRect(x + 12, y + 33, w - 24, 4)

  // Shelves of cans.
  const shelfTop = y + 38
  const shelfGap = Math.max(13, (h - 67) / 3)
  const canColors = [gameColors.coral, gameColors.mint, 0xffd166, 0x8fa6c9]
  for (let row = 0; row < 3; row += 1) {
    const rowY = shelfTop + row * shelfGap
    g.fillStyle(0x6f89b0, 0.5)
    g.fillRect(x + 10, rowY + 9, w - 20, 2)
    for (let column = 0; column < 3; column += 1) {
      const canX = x + 14 + column * ((w - 28) / 3)
      g.fillStyle(canColors[(row + column) % canColors.length] as number, 1)
      g.fillRoundedRect(canX, rowY, 9, 12, 2)
      g.fillStyle(0xffffff, 0.3)
      g.fillRect(canX + 2, rowY + 2, 2, 7)
    }
  }

  // Coin slot and dispenser.
  g.fillStyle(0x3b2f3a, 0.8)
  g.fillRoundedRect(x + w - 13, y + h - 24, 7, 11, 2)
  g.fillStyle(0xffd166, 1)
  g.fillCircle(x + w - 9.5, y + h - 18.5, 2)
  g.fillStyle(0x3b2f3a, 0.72)
  g.fillRoundedRect(x + 8, y + h - 20, w - 28, 10, 4)
  g.fillStyle(0x4b4050, 1)
  g.fillRoundedRect(x + 10, y + h - 18, w - 32, 5, 2)

  g.lineStyle(1, 0xffffff, 0.35)
  g.lineBetween(x + 8, y + 29, x + 8, y + h - 29)
}

export function drawRestMat(g: Phaser.GameObjects.Graphics, rect: Rect): void {
  g.fillStyle(0x3b2f3a, 0.08)
  g.fillRoundedRect(rect.x + 2, rect.y + 4, rect.w, rect.h, 18)
  g.fillStyle(0xe9b7a3, 0.82)
  g.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, 18)
  g.lineStyle(3, 0xfff3dd, 0.55)
  g.strokeRoundedRect(rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12, 13)
}
