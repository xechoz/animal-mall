import type Phaser from 'phaser'
import { gameColors } from '../colors'
import type { Rect, ShopMap } from '../logic/types'

/** The decorative band inside `map.room` that becomes the diorama platform. */
const EDGE = 24
/** Floor starts here; everything above is the back wall. */
const FLOOR_TOP = 64

/**
 * The old map ended in a flat 24px colour band. These helpers turn that band
 * into a cutaway wooden platform and add the baked light and contact shadows
 * that make the shop read as a small 3D set instead of a floor plan.
 *
 * Nothing here changes the walkable rectangle: the platform sits outside the
 * floor (`EDGE`), the back wall sits above `FLOOR_TOP`, and every shadow is
 * painted into the already-baked background.
 */
export function drawStageBase(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  const { w, h } = map.room
  const sideBottom = h - EDGE

  // Side faces of the platform. Keep them darker than the floor so the room
  // feels lifted off the forest rather than printed on it.
  for (const side of ['left', 'right'] as const) {
    const x = side === 'left' ? 0 : w - EDGE
    g.fillStyle(gameColors.woodDark, 1)
    g.fillRect(x, FLOOR_TOP, EDGE, sideBottom - FLOOR_TOP)
    g.fillStyle(side === 'left' ? gameColors.bark : gameColors.wood, 1)
    g.fillRect(x + (side === 'left' ? 2 : 0), FLOOR_TOP, EDGE - 2, sideBottom - FLOOR_TOP)
    g.fillStyle(0x1a120c, 0.22)
    g.fillRect(side === 'left' ? EDGE - 4 : w - EDGE, FLOOR_TOP, 4, sideBottom - FLOOR_TOP)
    g.fillStyle(0xfff3dd, 0.08)
    g.fillRect(side === 'left' ? 2 : w - EDGE + 2, FLOOR_TOP, 2, sideBottom - FLOOR_TOP)

    // Horizontal plank seams and two knots: enough to read as cut timber.
    g.lineStyle(1, gameColors.barkDark, 0.32)
    for (let y = FLOOR_TOP + 44; y < sideBottom - 8; y += 46) {
      g.lineBetween(x + 3, y, x + EDGE - 3, y)
    }
    g.fillStyle(gameColors.barkDark, 0.2)
    for (let y = FLOOR_TOP + 86; y < sideBottom - 20; y += 132) {
      g.fillEllipse(x + EDGE * 0.55, y, 5, 3)
    }
  }

  // Front lip: a thick beam with a lit top edge, a grain face and a dark
  // underside. This is the strongest single "the shop is a solid object" cue.
  g.fillStyle(gameColors.woodDark, 1)
  g.fillRect(0, sideBottom, w, EDGE)
  g.fillStyle(gameColors.wood, 1)
  g.fillRect(0, sideBottom, w, 13)
  g.fillStyle(0xc08a55, 1)
  g.fillRect(0, sideBottom, w, 3)
  g.fillStyle(0x1a120c, 0.24)
  g.fillRect(0, sideBottom + 13, w, EDGE - 13)
  g.lineStyle(1.2, gameColors.barkDark, 0.45)
  for (let x = 46; x < w - 20; x += 96) {
    g.lineBetween(x, sideBottom + 3, x, sideBottom + EDGE - 2)
  }
  g.fillStyle(0x1a120c, 0.16)
  g.fillRect(EDGE, sideBottom - 9, w - EDGE * 2, 9)

  // Corner blocks and small iron nails anchor the platform's silhouette.
  for (const x of [2, w - EDGE + 2] as const) {
    g.fillStyle(gameColors.barkDark, 1)
    g.fillRoundedRect(x, sideBottom - 6, EDGE - 4, EDGE + 2, 3)
    g.fillStyle(0xc08a55, 0.5)
    g.fillRect(x + 2, sideBottom - 4, EDGE - 8, 2)
  }
  g.fillStyle(0x3b2f3a, 0.55)
  for (const x of [w * 0.24, w * 0.5, w * 0.76]) {
    g.fillCircle(x, sideBottom + 7, 2)
  }
}

/**
 * A calm, dark hedge across the top edge. The old canopy band was a bright
 * fruit-and-flower strip that competed with the HUD; this version is a quiet
 * green frame that lets the wall and sign carry the top of the screen.
 */
export function drawHedgeTop(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  g.fillStyle(gameColors.pine, 1)
  g.fillRoundedRect(x, y, width, height, 10)
  g.fillStyle(gameColors.canopy, 0.7)
  g.fillRoundedRect(x + 3, y + 3, width - 6, height - 6, 8)

  const count = Math.max(6, Math.round(width / 44))
  for (let index = 0; index < count; index += 1) {
    const px = x + 10 + (index * (width - 20)) / Math.max(1, count - 1)
    const py = y + height - 4 + (index % 3)
    const scale = 0.5 + (index % 4) * 0.06
    g.fillStyle(index % 2 === 0 ? gameColors.mossDark : gameColors.pine, 0.9)
    g.fillEllipse(px, py, 22 * scale, 12 * scale)
    g.fillStyle(index % 3 === 0 ? gameColors.moss : gameColors.leafDark, 0.8)
    g.fillEllipse(px - 3 * scale, py - 3 * scale, 13 * scale, 8 * scale)
    g.fillStyle(gameColors.leafLight, 0.28)
    g.fillEllipse(px - 4 * scale, py - 5 * scale, 6 * scale, 3 * scale)
  }

  // Vines hang a little into the wall so the hedge has a front edge.
  for (let index = 0; index < 7; index += 1) {
    const px = x + 24 + (index * (width - 48)) / 6
    g.lineStyle(1.2, gameColors.mossDark, 0.55)
    g.lineBetween(px, y + height - 2, px + (index % 2 === 0 ? 2 : -2), y + height + 7)
    g.fillStyle(gameColors.fern, 0.6)
    g.fillEllipse(px + 2, y + height + 7, 6, 3)
  }

  g.fillStyle(0x1a120c, 0.16)
  g.fillRoundedRect(x + 4, y + height - 4, width - 8, 7, 3)
}

/**
 * Warm key light from the upper left, cool shade in the lower right. Painted
 * over the baked floor and zone patches, under every prop.
 */
export function drawFloorLight(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  const x = EDGE
  const y = FLOOR_TOP
  const w = map.room.w - EDGE * 2
  const h = map.room.h - FLOOR_TOP - EDGE

  g.fillStyle(0xffe2a8, 0.09)
  g.fillEllipse(x + w * 0.2, y + h * 0.18, w * 0.95, h * 1.1)
  g.fillStyle(0xfff0c8, 0.06)
  g.fillEllipse(x + w * 0.1, y + h * 0.08, w * 0.58, h * 0.7)
  g.fillStyle(0x3f6b55, 0.075)
  g.fillEllipse(x + w * 0.84, y + h * 0.88, w * 0.9, h * 0.85)

  // Soft edge vignette on the floor itself. The screen-space vignette lives in
  // DaylightView; this one only darkens the seam against the platform.
  g.fillStyle(0x1a120c, 0.06)
  g.fillRect(x, y, w, 10)
  g.fillRect(x, y + h - 10, w, 10)
  g.fillRect(x, y, 10, h)
  g.fillRect(x + w - 10, y, 10, h)
}

/**
 * Baked contact and cast shadows under the fixed furniture. These sit on the
 * floor before the props are drawn, so the props appear to press into the
 * boards instead of hovering over a flat texture.
 */
export function drawGroundShadows(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  const rects: Rect[] = [
    ...Object.values(map.shelves),
    map.counter,
    map.facilities.trashRect,
    map.facilities.vendingRect,
    map.dining.table,
  ]

  for (const rect of rects) {
    g.fillStyle(0x1a120c, 0.07)
    g.fillRoundedRect(rect.x + 9, rect.y + 11, rect.w + 4, rect.h + 4, 12)
    g.fillStyle(0x1a120c, 0.05)
    g.fillRoundedRect(rect.x + 16, rect.y + 18, rect.w + 8, rect.h + 6, 14)
    g.fillStyle(0x1a120c, 0.12)
    g.fillRoundedRect(rect.x + 4, rect.y + rect.h - 2, rect.w - 8, 3, 1.5)
    // A longer cast shadow on the floor, not just a contact line. It falls
    // down-right with the same light that PROP_SHADOW_OFFSET uses.
    g.fillStyle(0x1a120c, 0.075)
    g.fillRoundedRect(rect.x + 12, rect.y + rect.h + 2, rect.w, 16, 8)
    g.fillStyle(0x1a120c, 0.04)
    g.fillRoundedRect(rect.x + 20, rect.y + rect.h + 16, rect.w, 16, 8)
  }

  // Long shadow cast by the back wall onto the floor, fading as it travels.
  const wallWidth = map.room.w - EDGE * 2
  for (let index = 0; index < 5; index += 1) {
    g.fillStyle(0x1a120c, 0.045 - index * 0.006)
    g.fillRect(EDGE, FLOOR_TOP + index * 7, wallWidth, 9)
  }
}
