import { displayTextStyle, type Theme } from '@mg/core'
import type Phaser from 'phaser'
import { gameColors } from '../colors'
import { COUNTER_RECT, QUEUE_SLOTS, REGISTER_POINT, ROOM } from '../logic/config'

export function createShopBackground(
  scene: Phaser.Scene,
  theme: Theme,
  title: string,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0)
  const g = scene.add.graphics()
  container.add(g)

  g.fillStyle(theme.bg, 1)
  g.fillRect(0, 0, ROOM, ROOM)

  // Floor planks.
  g.fillStyle(gameColors.floor, 1)
  g.fillRect(40, 80, 560, 520)
  for (let row = 0; row < 10; row += 1) {
    const y = 80 + row * 52
    g.fillStyle(row % 2 === 0 ? 0xf6dfba : 0xf0d3a5, 1)
    g.fillRect(40, y, 560, 50)
    g.lineStyle(1, gameColors.floorLine, 0.7)
    g.lineBetween(40, y, 600, y)
    const seam = row % 2 === 0 ? 40 : 120
    for (let x = seam; x < 600; x += 160) g.lineBetween(x, y, x, y + 50)
  }

  // Top wall and awning.
  g.fillStyle(gameColors.wall, 1)
  g.fillRect(24, 24, 592, 62)
  g.fillStyle(gameColors.wallDark, 1)
  g.fillRect(24, 78, 592, 8)
  for (let index = 0; index < 24; index += 1) {
    g.fillStyle(index % 2 === 0 ? gameColors.coral : gameColors.cream, 1)
    g.fillRect(40 + index * 24, 24, 24, 22)
  }
  g.fillStyle(0x3b2f3a, 0.12)
  g.fillRect(40, 46, 560, 4)

  // Side and bottom walls.
  g.fillStyle(gameColors.wall, 1)
  g.fillRect(24, 82, 16, 534)
  g.fillRect(600, 82, 16, 534)
  g.fillStyle(gameColors.wallDark, 1)
  g.fillRect(40, 600, 240, 16)
  g.fillRect(360, 600, 240, 16)
  g.fillStyle(0x3b2f3a, 0.12)
  g.fillRect(40, 598, 240, 3)
  g.fillRect(360, 598, 240, 3)

  // Window on the top wall.
  g.fillStyle(0x3b2f3a, 0.75)
  g.fillRoundedRect(66, 26, 86, 32, 6)
  g.fillStyle(gameColors.sky, 1)
  g.fillRoundedRect(69, 29, 80, 26, 4)
  g.fillStyle(0xffffff, 0.65)
  g.fillEllipse(86, 38, 22, 8)
  g.fillEllipse(126, 34, 18, 7)
  g.lineStyle(3, gameColors.cream, 1)
  g.lineBetween(109, 29, 109, 55)
  g.lineBetween(69, 42, 149, 42)

  // Shop sign.
  g.fillStyle(0x3b2f3a, 0.22)
  g.fillRoundedRect(245, 30, 150, 38, 12)
  g.fillStyle(gameColors.woodDark, 1)
  g.fillRoundedRect(243, 27, 154, 38, 12)
  g.fillStyle(gameColors.woodLight, 1)
  g.fillRoundedRect(248, 31, 144, 30, 9)
  const sign = scene.add
    .text(320, 46, title, displayTextStyle(theme, 20, '#fff7e8', true, 2, 2))
    .setOrigin(0.5)
  container.add(sign)

  // Pendant lamps.
  for (const x of [164, 320, 476]) {
    g.lineStyle(2, 0x3b2f3a, 0.35)
    g.lineBetween(x, 48, x, 62)
    g.fillStyle(0xffd166, 1)
    g.fillCircle(x, 66, 9)
    g.fillStyle(0xfff3b0, 0.7)
    g.fillCircle(x - 2, 64, 4)
  }

  // Rug.
  g.fillStyle(0x3b2f3a, 0.08)
  g.fillRoundedRect(296, 326, 172, 92, 28)
  g.fillStyle(0xe9b7a3, 1)
  g.fillRoundedRect(292, 322, 172, 92, 28)
  g.lineStyle(4, 0xf7d6c4, 1)
  g.strokeRoundedRect(302, 332, 152, 72, 22)
  g.lineStyle(2, 0xc98b78, 0.7)
  g.strokeRoundedRect(310, 340, 136, 56, 16)

  // Queue markers.
  for (const slot of QUEUE_SLOTS) {
    g.fillStyle(0xffffff, 0.22)
    g.fillEllipse(slot.x, slot.y + 18, 34, 12)
  }
  g.lineStyle(2, 0xffffff, 0.3)
  g.beginPath()
  g.moveTo(506, 476)
  g.lineTo(506, 466)
  g.strokePath()

  // Counter.
  drawCounter(g)
  drawPlant(g, 62, 570)
  drawPlant(g, 578, 570)
  drawPlant(g, 62, 180)
  drawDoorMat(g)

  return container
}

function drawCounter(g: Phaser.GameObjects.Graphics): void {
  const rect = COUNTER_RECT
  g.fillStyle(0x3b2f3a, 0.18)
  g.fillRoundedRect(rect.x, rect.y + 8, rect.w, rect.h, 10)
  g.fillStyle(gameColors.woodDark, 1)
  g.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, 10)
  g.fillStyle(gameColors.wood, 1)
  g.fillRoundedRect(rect.x + 4, rect.y + 3, rect.w - 8, rect.h - 10, 8)
  g.fillStyle(gameColors.woodLight, 1)
  g.fillRoundedRect(rect.x + 8, rect.y + 6, rect.w - 16, 12, 6)
  g.lineStyle(2, 0x7b4f33, 0.6)
  g.lineBetween(rect.x + 14, rect.y + 28, rect.x + rect.w - 14, rect.y + 28)
  g.lineBetween(rect.x + 14, rect.y + 38, rect.x + rect.w - 14, rect.y + 38)

  // Register.
  g.fillStyle(0x3b2f3a, 0.2)
  g.fillRoundedRect(REGISTER_POINT.x - 25, REGISTER_POINT.y - 16, 52, 32, 8)
  g.fillStyle(0x4b4050, 1)
  g.fillRoundedRect(REGISTER_POINT.x - 26, REGISTER_POINT.y - 18, 50, 30, 8)
  g.fillStyle(0x9be7d0, 1)
  g.fillRoundedRect(REGISTER_POINT.x - 17, REGISTER_POINT.y - 13, 32, 15, 4)
  g.fillStyle(0x3b2f3a, 0.45)
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      g.fillRoundedRect(REGISTER_POINT.x - 20 + column * 8, REGISTER_POINT.y + 5 + row * 5, 5, 3, 1)
    }
  }
  g.fillStyle(0xffd166, 1)
  g.fillCircle(REGISTER_POINT.x + 22, REGISTER_POINT.y + 10, 4)
}

function drawPlant(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x3b2f3a, 0.12)
  g.fillEllipse(x, y + 14, 30, 8)
  g.fillStyle(gameColors.woodDark, 1)
  g.fillRoundedRect(x - 13, y, 26, 16, 5)
  g.fillStyle(gameColors.dirt, 1)
  g.fillEllipse(x, y + 2, 20, 6)
  g.fillStyle(gameColors.leafDark, 1)
  g.fillEllipse(x - 8, y - 10, 16, 9)
  g.fillEllipse(x + 8, y - 12, 15, 9)
  g.fillStyle(gameColors.leaf, 1)
  g.fillEllipse(x, y - 18, 17, 10)
  g.fillEllipse(x - 11, y - 14, 13, 8)
  g.fillStyle(gameColors.leafLight, 1)
  g.fillEllipse(x + 2, y - 20, 8, 5)
}

function drawDoorMat(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x3b2f3a, 0.12)
  g.fillRoundedRect(274, 568, 92, 30, 8)
  g.fillStyle(0xf7d6c4, 1)
  g.fillRoundedRect(272, 566, 92, 30, 8)
  g.lineStyle(3, gameColors.coral, 0.8)
  g.strokeRoundedRect(278, 572, 80, 18, 5)
  g.lineBetween(286, 578, 350, 578)
}
