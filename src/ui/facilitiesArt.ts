import type Phaser from 'phaser'
import { gameColors } from '../colors'
import type { DrinkKind, Rect } from '../logic/types'
import { drawExtrudedSlab, PROP_TOP_SCALE, TRASH_HEIGHT, VENDING_HEIGHT } from './propArt'

export interface CupColors {
  readonly body: number
  readonly liquid: number
}

export const DRINK_CUP_COLORS: Readonly<Record<DrinkKind, CupColors>> = {
  appleSoda: { body: 0xd8f0c0, liquid: 0x7fbf5f },
  milkTea: { body: 0xf0d3a5, liquid: 0xb87545 },
  lemonTea: { body: 0xfff0a8, liquid: 0xffd166 },
}

export interface CupDrawOptions {
  readonly straw?: boolean
  readonly shadow?: boolean
  readonly outline?: boolean
}

export function drawCup(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale = 1,
  colors: CupColors = { body: 0xfff7e8, liquid: gameColors.coral },
  options: CupDrawOptions = {},
): void {
  const s = scale
  const { straw = true, shadow = true, outline = false } = options
  if (shadow) {
    g.fillStyle(gameColors.theme.shadow, 0.12)
    g.fillEllipse(x, y + 13 * s, 24 * s, 6 * s)
  }
  g.fillStyle(colors.body, 1)
  g.fillRoundedRect(x - 9 * s, y - 12 * s, 18 * s, 22 * s, 5 * s)
  g.fillStyle(colors.liquid, 1)
  g.fillRoundedRect(x - 7 * s, y - 8 * s, 14 * s, 14 * s, 4 * s)
  g.fillStyle(0xffffff, 0.38)
  g.fillRoundedRect(x - 6 * s, y - 10 * s, 4 * s, 10 * s, 2 * s)
  g.fillStyle(0x3b2f3a, 0.22)
  g.fillRoundedRect(x - 10.5 * s, y - 14 * s, 21 * s, 4 * s, 2 * s)
  if (outline) {
    g.lineStyle(1.5 * s, 0x3b2f3a, 0.55)
    g.strokeRoundedRect(x - 9 * s, y - 12 * s, 18 * s, 22 * s, 5 * s)
  }
  if (straw) {
    g.lineStyle(2 * s, 0x3b2f3a, 0.55)
    g.lineBetween(x + 3 * s, y - 13 * s, x + 8 * s, y - 23 * s)
  }
}

export function drawTrashBin(g: Phaser.GameObjects.Graphics, rect: Rect): void {
  const x = rect.x
  const y = rect.y
  const w = rect.w
  const h = rect.h
  const cx = x + w / 2
  const bodyX = x + 4
  const bodyY = y + 8
  const bodyW = w - 8
  const bodyD = h - 12
  const visualD = 24
  const baseY = bodyY + bodyD - visualD

  drawExtrudedSlab(g, {
    x: bodyX,
    y: baseY,
    w: bodyW,
    d: visualD,
    h: TRASH_HEIGHT,
    radius: 5,
    palette: {
      top: 0x9fb8ae,
      front: 0x6f8c84,
      side: 0x4f6b64,
      edge: 0xd9e6df,
    },
  })

  const frontTop = baseY + visualD - TRASH_HEIGHT
  const topDepth = visualD * PROP_TOP_SCALE
  const top = frontTop - topDepth

  // Foreshortened lid with a dark opening and a hinge.
  g.fillStyle(0x4f6b64, 1)
  g.fillRoundedRect(bodyX + 1, top + 2, bodyW - 2, topDepth - 3, 4)
  g.fillStyle(0x7d9b92, 1)
  g.fillRoundedRect(bodyX + 4, top + 3, bodyW - 8, topDepth - 7, 3)
  g.fillStyle(0x3b2f3a, 0.45)
  g.fillRoundedRect(cx - 6, top + 1, 12, 3, 1.5)
  g.fillStyle(0x2b241d, 0.55)
  g.fillRoundedRect(cx - 8, frontTop - 4, 16, 3, 1.5)

  // Side ribs keep the body from reading as a flat card.
  g.lineStyle(1.5, 0x4f6b64, 0.4)
  g.lineBetween(bodyX + 4, frontTop + 4, bodyX + 4, baseY + visualD - 5)
  g.lineBetween(bodyX + bodyW - 4, frontTop + 4, bodyX + bodyW - 4, baseY + visualD - 5)

  // A real three-arrow recycle mark, large enough to read on a phone.
  drawRecycleIcon(g, cx, frontTop + 14, 15, 0xfff3dd)

  // Foot pedal pokes out at the base.
  g.fillStyle(0x4f6b64, 1)
  g.fillRoundedRect(cx - 8, bodyY + bodyD - 4, 16, 5, 2.5)
  g.fillStyle(0x3b2f3a, 0.28)
  g.fillRoundedRect(cx - 8, bodyY + bodyD - 1, 16, 2, 1)
}

function drawRecycleIcon(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
  color: number,
): void {
  const radius = size / 2
  const points = [-Math.PI / 2, Math.PI / 6, (Math.PI * 5) / 6].map((angle) => ({
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  }))
  g.lineStyle(Math.max(1.2, size * 0.11), color, 0.95)
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index] as { x: number; y: number }
    const end = points[(index + 1) % points.length] as { x: number; y: number }
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy)
    const ux = dx / length
    const uy = dy / length
    const head = size * 0.24
    g.lineBetween(start.x, start.y, end.x - ux * head * 0.6, end.y - uy * head * 0.6)
    g.fillStyle(color, 0.95)
    g.fillTriangle(
      end.x,
      end.y,
      end.x - ux * head - uy * head * 0.6,
      end.y - uy * head + ux * head * 0.6,
      end.x - ux * head + uy * head * 0.6,
      end.y - uy * head - ux * head * 0.6,
    )
  }
}

export function drawVendingMachine(g: Phaser.GameObjects.Graphics, rect: Rect): void {
  const x = rect.x
  const y = rect.y
  const w = rect.w
  const h = rect.h
  const bodyX = x + 2
  const bodyY = y + 4
  const bodyW = w - 4
  const bodyD = h - 8
  const visualD = 30
  const baseY = bodyY + bodyD - visualD
  const frontTop = baseY + visualD - VENDING_HEIGHT

  // A light cabinet top instead of a black lid. The thin dark rim and vent
  // read as a machine roof without turning the top face into a second object.
  drawExtrudedSlab(g, {
    x: bodyX,
    y: baseY,
    w: bodyW,
    d: visualD,
    h: VENDING_HEIGHT,
    radius: 9,
    palette: {
      top: 0xe8e1d0,
      front: 0xfff3dd,
      side: 0x3b2f3a,
      edge: 0xffffff,
    },
  })
  // Keep the top plain: no black lip, vents or loose objects on the roof.
  // Coral header band; the localized label is added by FacilityView.
  g.fillStyle(gameColors.coral, 1)
  g.fillRoundedRect(x + 4, frontTop + 1, w - 8, 12, 4)
  g.fillStyle(0xffffff, 0.22)
  g.fillRoundedRect(x + 7, frontTop + 3, w - 14, 2, 1)

  // Glass window with three rows of cans.
  const glassX = x + 6
  const glassY = frontTop + 16
  const glassW = w - 22
  const glassH = 32
  g.fillStyle(0x3b2f3a, 0.85)
  g.fillRoundedRect(glassX, glassY, glassW, glassH, 4)
  g.fillStyle(gameColors.sky, 0.9)
  g.fillRoundedRect(glassX + 2, glassY + 2, glassW - 4, glassH - 4, 3)
  g.fillStyle(0xffffff, 0.25)
  g.fillRoundedRect(glassX + 4, glassY + 4, glassW - 8, 2, 1)
  const canColors = [gameColors.coral, gameColors.mint, 0xffd166, 0x8fa6c9]
  for (let row = 0; row < 3; row += 1) {
    const rowY = glassY + 5 + row * 9
    g.fillStyle(0x6f89b0, 0.35)
    g.fillRect(glassX + 4, rowY + 7, glassW - 8, 1)
    for (let column = 0; column < 3; column += 1) {
      const canX = glassX + 5 + column * ((glassW - 10) / 3)
      g.fillStyle(canColors[(row + column) % canColors.length] as number, 1)
      g.fillRoundedRect(canX, rowY, 6, 7, 1.5)
      g.fillStyle(0xffffff, 0.3)
      g.fillRect(canX + 1.2, rowY + 1, 1.2, 3.5)
    }
  }

  // Right selection panel, coin slot and buttons.
  const panelX = x + w - 15
  g.fillStyle(0x3b2f3a, 0.9)
  g.fillRoundedRect(panelX, frontTop + 16, 9, 32, 3)
  g.fillStyle(0xffd166, 1)
  g.fillCircle(panelX + 4.5, frontTop + 20, 1.6)
  const buttonColors = [gameColors.coral, gameColors.mint, 0xffd166] as const
  for (let index = 0; index < 3; index += 1) {
    g.fillStyle(buttonColors[index] as number, 1)
    g.fillRoundedRect(panelX + 2, frontTop + 25 + index * 5, 5, 3, 1)
  }

  // Dispenser slot and dark base, both inside the front face.
  g.fillStyle(0x3b2f3a, 0.8)
  g.fillRoundedRect(x + 7, frontTop + 51, w - 22, 6, 2)
  g.fillStyle(0x4b4050, 1)
  g.fillRoundedRect(x + 9, frontTop + 53, w - 26, 2, 1)
  g.fillStyle(0x3b2f3a, 1)
  g.fillRoundedRect(x + 4, frontTop + 57, w - 8, 4, 2)
}

export function drawRestMat(g: Phaser.GameObjects.Graphics, rect: Rect): void {
  g.fillStyle(0x3b2f3a, 0.08)
  g.fillRoundedRect(rect.x + 2, rect.y + 4, rect.w, rect.h, 18)
  g.fillStyle(0xe9b7a3, 0.82)
  g.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, 18)
  g.lineStyle(3, 0xfff3dd, 0.55)
  g.strokeRoundedRect(rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12, 13)

  // Three little stools make the break corner read as a place to sit.
  for (let index = 0; index < 3; index += 1) {
    const x = rect.x + 20 + index * ((rect.w - 40) / 2)
    const y = rect.y + rect.h - 15
    g.fillStyle(0x3b2f3a, 0.12)
    g.fillEllipse(x, y + 8, 22, 5)
    g.fillStyle(0x6f4b2e, 1)
    g.fillRoundedRect(x - 7, y + 1, 3, 9, 1.5)
    g.fillRoundedRect(x + 4, y + 1, 3, 9, 1.5)
    g.fillStyle(0xd39a65, 1)
    g.fillEllipse(x, y - 2, 21, 10)
    g.fillStyle(0xf0c99b, 1)
    g.fillEllipse(x, y - 4, 17, 7)
  }
}
