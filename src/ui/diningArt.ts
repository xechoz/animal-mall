import type Phaser from 'phaser'
import { gameColors } from '../colors'
import type { DiningSeat, Rect } from '../logic/types'

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
}

/** Top-down table with plates, cups and a tiny centrepiece. */
export function drawDiningTable(g: Phaser.GameObjects.Graphics, rect: Rect): void {
  const { x, y, w, h } = rect
  const top = y + 4
  const topH = h - 8

  g.fillStyle(0x1a120c, 0.18)
  g.fillRoundedRect(x + 3, y + 10, w, h, 12)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x, top, w, topH, 11)
  g.fillStyle(gameColors.wood, 1)
  g.fillRoundedRect(x + 4, top + 3, w - 8, topH - 6, 8)
  g.fillStyle(gameColors.woodLight, 0.9)
  g.fillRoundedRect(x + 8, top + 5, w - 16, 5, 3)
  g.lineStyle(2, gameColors.barkDark, 0.5)
  g.lineBetween(x + 9, top + topH - 7, x + w - 9, top + topH - 7)

  const plateY = top + topH * 0.55
  const plates = [x + w * 0.22, x + w * 0.78]
  for (const plateX of plates) {
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
}

/** A chair drawn behind the seated character. */
export function drawDiningChair(g: Phaser.GameObjects.Graphics, seat: DiningSeat): void {
  const backX = seat.seat.x - seat.facing * 9
  g.fillStyle(0x1a120c, 0.14)
  g.fillEllipse(seat.seat.x, seat.seat.y + 5, 34, 10)

  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(backX - 4, seat.seat.y - 28, 8, 31, 3)
  g.fillRoundedRect(seat.seat.x - 12, seat.seat.y - 2, 5, 14, 2)
  g.fillRoundedRect(seat.seat.x + 7, seat.seat.y - 2, 5, 14, 2)
  g.fillStyle(gameColors.wood, 1)
  g.fillRoundedRect(seat.seat.x - 14, seat.seat.y - 8, 28, 12, 6)
  g.fillStyle(gameColors.woodLight, 1)
  g.fillRoundedRect(seat.seat.x - 11, seat.seat.y - 7, 22, 5, 3)
  g.lineStyle(1.5, gameColors.barkDark, 0.6)
  g.lineBetween(backX, seat.seat.y - 24, backX, seat.seat.y - 2)
}
