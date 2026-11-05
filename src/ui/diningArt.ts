import type Phaser from 'phaser'
import { gameColors } from '../colors'
import type { DiningSeat, Rect } from '../logic/types'
import { drawFloorLamp, drawLeg, PROP_TOP_SCALE, TABLE_HEIGHT } from './propArt'

/** A warm woven rug that ties the table and chairs together. */
export function drawDiningRug(g: Phaser.GameObjects.Graphics, rect: Rect): void {
  g.fillStyle(0x1a120c, 0.1)
  g.fillRoundedRect(rect.x + 3, rect.y + 5, rect.w, rect.h, 24)
  g.fillStyle(0x8f6038, 0.92)
  g.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, 24)
  g.fillStyle(0xb98a5c, 0.9)
  g.fillRoundedRect(rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 10, 20)
  g.lineStyle(2, 0xfff3dd, 0.5)
  g.strokeRoundedRect(rect.x + 11, rect.y + 11, rect.w - 22, rect.h - 22, 15)
  g.lineStyle(1.2, 0x7a4f2e, 0.3)
  for (let x = rect.x + 20; x < rect.x + rect.w - 14; x += 24) {
    g.lineBetween(x, rect.y + 16, x, rect.y + rect.h - 16)
  }

  // The landscape nook gets a floor lamp: a readable vertical accent beside
  // the low table and the light source for the evening dining pool.
  if (rect.w >= 240) {
    const lampX = rect.x + rect.w - 16
    const lampBase = rect.y + 34
    g.fillStyle(0xffd9a8, 0.12)
    g.fillEllipse(lampX - 6, lampBase + 4, 82, 50)
    drawFloorLamp(g, lampX, lampBase, 0.9)
  }
}

/** Raised table with legs, plates, cups and a tiny centrepiece. */
export function drawDiningTable(g: Phaser.GameObjects.Graphics, rect: Rect): void {
  const { x, y, w, h } = rect
  const frontEdge = y + h - TABLE_HEIGHT
  const topDepth = h * PROP_TOP_SCALE
  const boardTop = frontEdge - topDepth
  const top = boardTop + 4
  const topH = topDepth - 8
  const floorY = y + h
  const legW = 9
  const legTop = frontEdge - 6

  g.fillStyle(0x1a120c, 0.18)
  g.fillRoundedRect(x + 3, y + 10, w, h, 12)

  // Front legs and a low stretcher: the table has to read as furniture, not a
  // solid chest.
  drawLeg(g, {
    x: x + 14,
    y: legTop,
    w: legW,
    h: floorY - legTop,
    color: gameColors.woodLight,
    edge: 0xd9a066,
  })
  drawLeg(g, {
    x: x + w - 14 - legW,
    y: legTop,
    w: legW,
    h: floorY - legTop,
    color: gameColors.woodLight,
    edge: 0xd9a066,
  })
  g.fillStyle(gameColors.barkDark, 0.9)
  g.fillRoundedRect(x + 14 + legW, floorY - 8, w - 28 - legW * 2, 5, 2)

  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x, boardTop, w, topDepth, 11)
  g.fillStyle(gameColors.wood, 1)
  g.fillRoundedRect(x + 4, boardTop + 3, w - 8, topDepth - 9, 8)
  g.fillStyle(gameColors.woodLight, 0.9)
  g.fillRoundedRect(x + 8, boardTop + 5, w - 16, 5, 3)
  g.lineStyle(2, gameColors.barkDark, 0.5)
  g.lineBetween(x + 9, top + topH - 7, x + w - 9, top + topH - 7)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x, frontEdge - 6, w, 6, 3)
  g.fillStyle(0xb07a4a, 1)
  g.fillRoundedRect(x + 2, frontEdge - 5, w - 4, 2, 1)
  g.fillStyle(0x1a120c, 0.14)
  g.fillRect(x + 10, frontEdge, w - 20, 4)
  g.fillStyle(0x1a120c, 0.12)
  g.fillRect(x + w - 5, boardTop + 6, 5, topDepth - 12)

  // A woven runner and place mats break up the large top face before the
  // tableware goes on, so the table reads as a set meal rather than a slab.
  g.fillStyle(0x4f6b64, 0.78)
  g.fillRoundedRect(x + 10, top + topH * 0.42, w - 20, topH * 0.34, 3)
  g.fillStyle(0x8fae63, 0.45)
  g.fillRect(x + 10, top + topH * 0.42, w - 20, 2)
  g.lineStyle(1, 0xfff3dd, 0.22)
  g.lineBetween(x + 12, top + topH * 0.76, x + w - 12, top + topH * 0.76)

  const plateY = top + topH * 0.55
  const plates = [x + w * 0.22, x + w * 0.78]
  for (const plateX of plates) {
    g.fillStyle(0x2f3b35, 0.25)
    g.fillEllipse(plateX, plateY + 1, 30, 14)
    g.fillStyle(0xfff3dd, 0.95)
    g.fillEllipse(plateX, plateY, 24, 10)
    g.fillStyle(0xd97757, 0.8)
    g.fillEllipse(plateX, plateY - 1, 13, 5)
    g.fillStyle(0xffd166, 0.9)
    g.fillCircle(plateX, plateY - 2, 3)
  }

  // A small vase and two cups make the table read as a shared meal spot.
  g.fillStyle(0x6fae5e, 1)
  g.fillEllipse(x + w / 2, top + topH * 0.38, 13, 7)
  g.fillStyle(0xf2a8b4, 1)
  g.fillCircle(x + w / 2 - 4, top + topH * 0.34, 2.5)
  g.fillCircle(x + w / 2 + 4, top + topH * 0.3, 2)
  g.fillStyle(0x7a4f2e, 1)
  g.fillRoundedRect(x + w / 2 - 4, top + topH * 0.38, 8, 7, 2)

  for (const cupX of [x + w * 0.34, x + w * 0.66]) {
    g.fillStyle(0xfff3dd, 0.9)
    g.fillRoundedRect(cupX - 4, top + 7, 8, 8, 2)
    g.fillStyle(0x9be7d0, 0.8)
    g.fillRoundedRect(cupX - 2.5, top + 9, 5, 4, 1)
  }

  // A folded menu card at the near edge of the runner.
  const cardX = x + w / 2
  const cardY = top + topH * 0.74
  g.fillStyle(0x1a120c, 0.12)
  g.fillRoundedRect(cardX - 9, cardY - 4, 18, 14, 2)
  g.fillStyle(0xfff3dd, 1)
  g.fillRoundedRect(cardX - 9, cardY - 6, 18, 13, 2)
  g.fillStyle(0xb07a4a, 1)
  g.fillRect(cardX - 9, cardY + 5, 18, 2)
  g.lineStyle(1, 0x8f6b45, 0.7)
  g.lineBetween(cardX - 5, cardY - 2, cardX + 5, cardY - 2)
  g.lineBetween(cardX - 5, cardY + 1, cardX + 3, cardY + 1)
}

/** A chair drawn behind the seated character. */
export function drawDiningChair(g: Phaser.GameObjects.Graphics, seat: DiningSeat): void {
  const backX = seat.seat.x - seat.facing * 9
  g.fillStyle(0x1a120c, 0.14)
  g.fillEllipse(seat.seat.x, seat.seat.y + 5, 34, 10)

  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(backX - 4, seat.seat.y - 28, 8, 31, 3)
  g.fillStyle(gameColors.wood, 1)
  g.fillRoundedRect(backX - 9, seat.seat.y - 30, 18, 4, 2)
  for (const offset of [-5, 0, 5]) {
    g.fillStyle(gameColors.wood, 0.9)
    g.fillRect(backX + offset - 1, seat.seat.y - 26, 2, 19)
  }
  g.fillRoundedRect(seat.seat.x - 12, seat.seat.y - 2, 5, 14, 2)
  g.fillRoundedRect(seat.seat.x + 7, seat.seat.y - 2, 5, 14, 2)
  g.fillStyle(gameColors.wood, 1)
  g.fillRoundedRect(seat.seat.x - 14, seat.seat.y - 8, 28, 12, 6)
  g.fillStyle(0xe9b7a3, 0.9)
  g.fillRoundedRect(seat.seat.x - 10, seat.seat.y - 8, 20, 5, 2.5)
  g.fillStyle(gameColors.woodLight, 1)
  g.fillRoundedRect(seat.seat.x - 11, seat.seat.y - 7, 22, 2, 1)
  g.lineStyle(1.5, gameColors.barkDark, 0.6)
  g.lineBetween(backX, seat.seat.y - 24, backX, seat.seat.y - 2)
}
