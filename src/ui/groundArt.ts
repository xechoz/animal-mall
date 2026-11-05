import type Phaser from 'phaser'
import { gameColors } from '../colors'
import type { AnimalProductKind } from '../logic/types'

export type PlantZone = 'fruit' | 'veg'

interface BedPalette {
  readonly rim: number
  readonly base: number
  readonly top: number
  readonly light: number
  readonly furrow: number
  readonly speckLight: number
  readonly speckDark: number
}

interface BedShape {
  readonly w: number
  readonly h: number
  readonly radius: number
}

/** Beds stay just inside `PLOT_SIZE` so the soil edge and the hit area agree. */
const BED_SHAPES: Readonly<Record<PlantZone, BedShape>> = {
  fruit: { w: 64, h: 40, radius: 5 },
  veg: { w: 66, h: 42, radius: 4 },
}

const BED_PALETTES: Readonly<Record<PlantZone, BedPalette>> = {
  fruit: {
    rim: 0x6b4629,
    base: 0x8a5f3d,
    top: 0x9b6a45,
    light: 0xb98a5c,
    furrow: 0x704a2e,
    speckLight: 0xc9a06a,
    speckDark: 0x5a3a24,
  },
  veg: {
    rim: 0x4a301f,
    base: 0x5f4028,
    top: 0x6a4a30,
    light: 0x8a5f3d,
    furrow: 0x3f2819,
    speckLight: 0x8f6a45,
    speckDark: 0x35220f,
  },
}

export function drawGrassTuft(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale = 1,
): void {
  g.lineStyle(1.6 * scale, gameColors.leafDark, 0.68)
  g.lineBetween(x, y, x - 4 * scale, y - 8 * scale)
  g.lineBetween(x, y, x + 1 * scale, y - 10 * scale)
  g.lineBetween(x, y, x + 5 * scale, y - 6 * scale)
  g.lineBetween(x, y, x - 2 * scale, y - 5 * scale)
  g.lineStyle(1.2 * scale, gameColors.leafLight, 0.58)
  g.lineBetween(x + 1 * scale, y, x + 2 * scale, y - 6 * scale)
}

export function drawClover(g: Phaser.GameObjects.Graphics, x: number, y: number, scale = 1): void {
  g.fillStyle(gameColors.leaf, 0.9)
  g.fillCircle(x - 2 * scale, y, 1.8 * scale)
  g.fillCircle(x + 2 * scale, y, 1.8 * scale)
  g.fillCircle(x, y - 2 * scale, 1.8 * scale)
  g.fillStyle(gameColors.leafLight, 0.8)
  g.fillCircle(x, y - 0.4 * scale, 0.9 * scale)
}

/**
 * A low raised seedbed. The footprint still matches `PLOT_SIZE`, but a short
 * front lip, a shaded side and a soft cast shadow make the soil read as a
 * shallow box instead of a painted rectangle. Crops keep their existing anchor
 * at the bed centre.
 */
export function drawTilledBed(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  zone: PlantZone,
): void {
  const shape = BED_SHAPES[zone]
  const palette = BED_PALETTES[zone]
  const left = x - shape.w / 2
  const top = y - shape.h / 2
  const radius = shape.radius
  const lip = 4
  const soilBottom = top + shape.h - 6

  // Long, soft cast shadow first; the bed body covers most of it.
  g.fillStyle(0x1a120c, 0.12)
  g.fillRoundedRect(left + 3, top + 5, shape.w, shape.h + lip, radius + 2)
  g.fillStyle(0x1a120c, 0.06)
  g.fillRoundedRect(left + 9, top + 11, shape.w + 4, shape.h + lip + 2, radius + 3)

  // Timber/earth rim and its front face.
  g.fillStyle(palette.rim, 1)
  g.fillRoundedRect(left, top, shape.w, shape.h + lip, radius)
  g.fillStyle(palette.base, 1)
  g.fillRoundedRect(left + 2, top + 2, shape.w - 4, shape.h + lip - 4, Math.max(1, radius - 1))

  // Tilled top face. It stops above the lip, which is drawn afterwards.
  g.fillStyle(palette.top, 0.98)
  g.fillRoundedRect(
    left + 3.5,
    top + 3.5,
    shape.w - 7,
    soilBottom - top - 3.5,
    Math.max(1, radius - 2),
  )
  g.fillStyle(palette.light, 0.42)
  g.fillRoundedRect(left + 7, top + 5, shape.w - 14, 3, 1.5)
  g.fillStyle(0x1a120c, 0.12)
  g.fillRoundedRect(left + 4, soilBottom - 3, shape.w - 8, 3.5, 1.8)

  // Front lip catches the light on top and falls into shadow underneath.
  g.fillStyle(palette.rim, 1)
  g.fillRoundedRect(left, soilBottom - 2, shape.w, shape.h + lip - (soilBottom - top) + 2, radius)
  g.fillStyle(palette.light, 0.35)
  g.fillRoundedRect(left + 3, soilBottom - 1, shape.w - 6, 1.5, 0.75)
  g.fillStyle(0x1a120c, 0.2)
  g.fillRoundedRect(left + 3, top + shape.h + lip - 2.5, shape.w - 6, 2.5, 1.2)

  // Side shading: light on the left, a narrow dark plane on the right.
  g.fillStyle(palette.light, 0.18)
  g.fillRoundedRect(left + 2, top + 4, 2, shape.h + lip - 8, 1)
  g.fillStyle(0x1a120c, 0.12)
  g.fillRoundedRect(left + shape.w - 4, top + 4, 2, shape.h + lip - 8, 1)

  drawFurrows(g, x, y, shape, palette, zone)
  drawSoilSpecks(g, x, y, shape, palette)

  // A couple of crumbs break the otherwise perfect rectangle.
  g.fillStyle(palette.base, 0.85)
  g.fillEllipse(left - 1.5, top + shape.h * 0.72, 4.5, 3)
  if (zone === 'fruit') {
    g.fillEllipse(left + shape.w + 1, top + shape.h * 0.34, 3.5, 2.6)
  }
  // Small clods spilling over the front lip.
  g.fillStyle(palette.speckLight, 0.5)
  g.fillEllipse(left + shape.w * 0.2, top + shape.h + lip - 1, 3.4, 2)
  g.fillEllipse(left + shape.w * 0.72, top + shape.h + lip - 0.5, 2.6, 1.6)
}

/**
 * Empty bed: the same tilled soil plus seed holes and a small seed packet. The
 * packet is the always-on "plantable" cue; it sits to the right so the nearby
 * price chip does not cover it.
 */
export function drawEmptyBed(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  zone: PlantZone,
): void {
  drawTilledBed(g, x, y, zone)
  const shape = BED_SHAPES[zone]
  const palette = BED_PALETTES[zone]

  for (const fx of [-0.22, -0.1, 0.02] as const) {
    const holeX = x + fx * shape.w
    const holeY = y + shape.h * 0.26
    g.fillStyle(palette.speckDark, 0.88)
    g.fillEllipse(holeX, holeY, 3.6, 2.4)
    g.fillStyle(palette.speckLight, 0.55)
    g.fillEllipse(holeX, holeY - 0.7, 1.6, 0.9)
  }

  // The packet sits on the front lip, like a label clipped to the bed edge,
  // instead of floating in the middle of the soil.
  drawSeedPacket(g, x + shape.w * 0.34, y + shape.h * 0.5 + 1, zone === 'veg' ? 0.8 : 1)
}

/** A small seed bag standing in the soil; no text, so it needs no translation. */
export function drawSeedPacket(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale = 1,
): void {
  const w = 20 * scale
  const h = 18 * scale
  const top = y - h / 2

  g.fillStyle(0x3b2f3a, 0.2)
  g.fillEllipse(x, y + h / 2 + 2 * scale, w * 0.8, 4 * scale)

  // Sprout poking out of the bag, drawn first so the bag covers its base.
  g.lineStyle(1.4 * scale, 0x4f8f5f, 1)
  g.lineBetween(x, top + 2 * scale, x + 1 * scale, top - 6 * scale)
  g.fillStyle(0x5aa96f, 1)
  g.fillEllipse(x - 3 * scale, top - 4 * scale, 7 * scale, 4 * scale)
  g.fillEllipse(x + 4 * scale, top - 6 * scale, 6 * scale, 3.5 * scale)
  g.fillStyle(0x8cd08b, 0.9)
  g.fillEllipse(x - 4 * scale, top - 4 * scale, 3 * scale, 2 * scale)

  g.fillStyle(0x8f5734, 1)
  g.fillRoundedRect(x - w / 2, top, w, h, 4 * scale)
  g.fillStyle(0x6f4b2e, 1)
  g.fillRoundedRect(x - w / 2 + 1.5 * scale, top + 1.5 * scale, w - 3 * scale, 4 * scale, 2 * scale)
  g.fillStyle(0xf0c99b, 1)
  g.fillRoundedRect(
    x - w / 2 + 3 * scale,
    top + 6 * scale,
    w - 6 * scale,
    h - 9 * scale,
    2.5 * scale,
  )

  // A tiny plant mark on the paper label.
  g.lineStyle(1.2 * scale, 0x4f8f5f, 1)
  g.lineBetween(x, y + h / 2 - 3 * scale, x, y + 1 * scale)
  g.fillStyle(0x5aa96f, 1)
  g.fillEllipse(x - 2.4 * scale, y + 0.2 * scale, 5 * scale, 3 * scale)
  g.fillEllipse(x + 2.4 * scale, y - 1 * scale, 5 * scale, 3 * scale)
  g.fillStyle(0x8cd08b, 0.9)
  g.fillEllipse(x, y - 1.4 * scale, 3 * scale, 2 * scale)
}

/**
 * Small ground props inside an animal pen. The pen floor itself stays plain;
 * these follow the installed animal so a chicken pen reads as straw and worms,
 * a cow pen as hay and a puddle, and so on.
 */
export function drawPenDecor(
  g: Phaser.GameObjects.Graphics,
  product: AnimalProductKind,
  slot: number,
): void {
  const flip = slot % 2 === 0 ? 1 : -1
  switch (product) {
    case 'egg':
      drawNest(g, -24 * flip, 9)
      drawGrain(g, 12, 14, slot)
      drawWorm(g, 6, 19, 0.9)
      drawStrawTuft(g, 28, -8, 0.8)
      drawStrawTuft(g, -30, -12, 0.7)
      break
    case 'milk':
      drawHayPile(g, -25 * flip, 6)
      drawGrassTuft(g, 22, -12, 0.7)
      drawGrassTuft(g, 30, 9, 0.6)
      drawPuddle(g, -16 * flip, 19, 10, 4)
      drawClover(g, 12, 18, 0.7)
      break
    case 'yarn':
      drawWool(g, -24 * flip, -8)
      drawStone(g, 18, 12, 0.8)
      drawStone(g, 28, -6, 0.6)
      drawGrassTuft(g, -30, 12, 0.7)
      drawClover(g, 10, 18, 0.6)
      break
    case 'fish':
      drawPuddle(g, 0, 8, 20, 9)
      drawLilyPad(g, -6, 6, 0.8)
      drawLilyPad(g, 8, 12, 0.6)
      drawStone(g, -26, 14, 0.7)
      drawStone(g, 24, -12, 0.6)
      break
    case 'cheese':
      drawStone(g, -26, 8, 1)
      drawStone(g, 18, -10, 0.8)
      drawStone(g, 28, 10, 0.7)
      drawGrassTuft(g, -30, -10, 0.7)
      drawClover(g, 8, 18, 0.7)
      break
    case 'honey':
      drawFlower(g, -24 * flip, 8, 0xf2a8b4)
      drawFlower(g, 20, -10, 0xffd166)
      drawFlower(g, 10, 16, 0xbfe8ef)
      drawFlower(g, 28, 2, 0xe9b7a3)
      drawClover(g, -12, 18, 0.7)
      break
  }
}

function drawStrawTuft(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
  g.lineStyle(1.4 * scale, gameColors.hay, 0.9)
  for (let index = -2; index <= 2; index += 1) {
    g.lineBetween(x, y, x + index * 3 * scale, y - 6 * scale + Math.abs(index) * 1.2 * scale)
  }
  g.lineStyle(1 * scale, gameColors.straw, 0.7)
  g.lineBetween(x, y, x + 2 * scale, y - 4 * scale)
}

function drawNest(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x1a120c, 0.12)
  g.fillEllipse(x, y + 2, 18, 6)
  g.fillStyle(0xb07a4a, 0.8)
  g.fillEllipse(x, y, 16, 6)
  g.lineStyle(1.2, gameColors.hay, 0.9)
  for (let index = -3; index <= 3; index += 1) {
    g.lineBetween(x + index * 2.2, y - 1, x + index * 2.8, y + 2)
  }
  g.fillStyle(0xfff3dd, 1)
  g.fillEllipse(x - 3, y - 1, 4, 5)
  g.fillEllipse(x + 3, y, 3.5, 4.5)
}

function drawGrain(g: Phaser.GameObjects.Graphics, x: number, y: number, seed: number): void {
  g.fillStyle(0xffd166, 0.9)
  for (let index = 0; index < 7; index += 1) {
    const px = x + ((index * 13 + seed * 7) % 22) - 11
    const py = y + ((index * 7 + seed * 3) % 12) - 6
    g.fillCircle(px, py, 1)
  }
}

function drawWorm(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
  g.lineStyle(1.4 * scale, 0xd97757, 0.95)
  g.beginPath()
  g.moveTo(x - 4 * scale, y)
  g.lineTo(x - 1 * scale, y - 2 * scale)
  g.lineTo(x + 2 * scale, y + scale)
  g.lineTo(x + 4 * scale, y - scale)
  g.strokePath()
  g.fillStyle(0x2b241d, 0.6)
  g.fillCircle(x - 4 * scale, y, 0.8)
}

function drawStone(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
  g.fillStyle(0x1a120c, 0.12)
  g.fillEllipse(x, y + 2 * scale, 10 * scale, 4 * scale)
  g.fillStyle(gameColors.stone, 1)
  g.fillEllipse(x, y, 9 * scale, 5 * scale)
  g.fillStyle(0xd9e6df, 0.5)
  g.fillEllipse(x - scale, y - scale, 5 * scale, 2 * scale)
}

function drawFlower(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
  g.fillStyle(color, 0.95)
  for (let index = 0; index < 5; index += 1) {
    const angle = (index * Math.PI * 2) / 5
    g.fillCircle(x + Math.cos(angle) * 2.2, y + Math.sin(angle) * 2.2, 1.6)
  }
  g.fillStyle(0xffd166, 1)
  g.fillCircle(x, y, 1.5)
}

function drawPuddle(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  rx: number,
  ry: number,
): void {
  g.fillStyle(0x1a120c, 0.08)
  g.fillEllipse(x, y + 1, rx + 2, ry + 1)
  g.fillStyle(gameColors.water, 0.75)
  g.fillEllipse(x, y, rx * 2, ry * 2)
  g.fillStyle(0xbfe8ef, 0.55)
  g.fillEllipse(x - rx * 0.25, y - ry * 0.2, rx, ry * 0.7)
  g.lineStyle(1, 0xbfe8ef, 0.6)
  g.strokeEllipse(x, y, rx * 1.5, ry * 1.2)
}

function drawLilyPad(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
  g.fillStyle(gameColors.leaf, 0.95)
  g.fillEllipse(x, y, 8 * scale, 4 * scale)
  g.fillStyle(gameColors.leafLight, 0.7)
  g.fillEllipse(x - scale, y - 0.5, 4 * scale, 2 * scale)
  g.fillStyle(0xf2a8b4, 1)
  g.fillCircle(x + scale, y - scale, 1.2)
}

function drawWool(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0xfff3dd, 0.95)
  g.fillCircle(x - 4, y, 3.2)
  g.fillCircle(x, y - 2, 4)
  g.fillCircle(x + 4, y, 3.2)
  g.fillCircle(x, y + 2, 3.5)
  g.fillStyle(0xe8e1d0, 0.7)
  g.fillCircle(x - 1, y + 1, 2.5)
}

function drawHayPile(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x1a120c, 0.1)
  g.fillEllipse(x, y + 2, 18, 6)
  g.fillStyle(gameColors.hay, 0.9)
  g.fillEllipse(x, y, 16, 6)
  g.lineStyle(1.2, gameColors.straw, 0.9)
  for (let index = -3; index <= 3; index += 1) {
    g.lineBetween(x + index * 2.2, y - 1, x + index * 2.8, y + 2)
  }
}

function drawFurrows(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  shape: BedShape,
  palette: BedPalette,
  zone: PlantZone,
): void {
  const rows = zone === 'veg' ? 3 : 2
  for (let row = 0; row < rows; row += 1) {
    const fy = y - shape.h * 0.13 + (row - (rows - 1) / 2) * shape.h * 0.24
    g.lineStyle(1.2, palette.light, 0.22)
    g.lineBetween(x - shape.w * 0.3, fy - 1.4, x + shape.w * 0.3, fy - 1.4)
    g.lineStyle(zone === 'veg' ? 2.2 : 1.6, palette.furrow, zone === 'veg' ? 0.62 : 0.45)
    if (zone === 'veg') {
      g.lineBetween(x - shape.w * 0.33, fy, x + shape.w * 0.33, fy)
    } else {
      g.beginPath()
      g.moveTo(x - shape.w * 0.33, fy)
      g.lineTo(x - shape.w * 0.05, fy + 1.2)
      g.lineTo(x + shape.w * 0.33, fy)
      g.strokePath()
    }
  }
}

function drawSoilSpecks(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  shape: BedShape,
  palette: BedPalette,
): void {
  const specks = [
    [-0.32, -0.18, 1.3],
    [0.26, -0.26, 1.1],
    [-0.2, 0.24, 1],
    [0.3, 0.2, 1.2],
    [0.04, 0.3, 0.9],
  ] as const
  for (const [fx, fy, radius] of specks) {
    g.fillStyle(palette.speckLight, 0.5)
    g.fillCircle(x + fx * shape.w, y + fy * shape.h, radius)
  }
  g.fillStyle(palette.speckDark, 0.45)
  g.fillCircle(x - shape.w * 0.08, y - shape.h * 0.02, 1.1)
  g.fillCircle(x + shape.w * 0.18, y + shape.h * 0.08, 0.9)
}
