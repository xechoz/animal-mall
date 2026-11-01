import type Phaser from 'phaser'
import { gameColors } from '../colors'

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
 * A flat, mostly rectangular seedbed. The dark rim, tilled grooves, soil
 * surface and crumbs keep it from reading as a UI card while still matching the
 * rectangular `PLOT_SIZE` footprint.
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

  g.fillStyle(0x3b2f3a, 0.15)
  g.fillRoundedRect(left + 2, top + 5, shape.w, shape.h, radius)
  g.fillStyle(palette.rim, 1)
  g.fillRoundedRect(left, top, shape.w, shape.h, radius)
  g.fillStyle(palette.base, 1)
  g.fillRoundedRect(left + 2, top + 2, shape.w - 4, shape.h - 5, Math.max(1, radius - 1))
  g.fillStyle(palette.top, 0.92)
  g.fillRoundedRect(left + 4, top + 4, shape.w - 8, shape.h - 10, Math.max(1, radius - 2))
  g.fillStyle(palette.light, 0.45)
  g.fillRoundedRect(left + 6, top + 4, shape.w - 12, 3.5, 1.8)
  g.fillStyle(0x3b2f3a, 0.12)
  g.fillRoundedRect(left + 4, top + shape.h - 9, shape.w - 8, 5, 2)

  drawFurrows(g, x, y, shape, palette, zone)
  drawSoilSpecks(g, x, y, shape, palette)

  // A couple of crumbs break the otherwise perfect rectangle.
  g.fillStyle(palette.base, 0.85)
  g.fillEllipse(left - 1.5, top + shape.h * 0.72, 4.5, 3)
  if (zone === 'fruit') {
    g.fillEllipse(left + shape.w + 1, top + shape.h * 0.34, 3.5, 2.6)
  }
}

/**
 * Empty bed: the same tilled soil plus seed holes and a small seed packet. The
 * packet sits to the right so the distant price sticker above the bed does not
 * cover it.
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

  drawSeedPacket(g, x + shape.w * 0.34, y + shape.h * 0.2, zone === 'veg' ? 0.8 : 1)
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
