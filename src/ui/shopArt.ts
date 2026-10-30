import { displayTextStyle, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { gameColors } from '../colors'
import {
  ANIMAL_ORDER,
  ANIMAL_PENS,
  COUNTER_RECT,
  CROP_PLOTS,
  PEN_SIZE,
  PLOT_SIZE,
  PLOTS,
  PROCESSED_ORDER,
  QUEUE_SLOTS,
  REGISTER_POINT,
  ROOM_H,
  ROOM_W,
  STATION_SIZE,
  STATION_SLOTS,
  ZONE_ORDER,
} from '../logic/config'
import type { ZoneId } from '../logic/types'

const ZONE_TINTS: Readonly<Record<ZoneId, number>> = {
  fruit: 0xf08a6a,
  veg: 0x7fb069,
  farm: 0xe0b45a,
  kitchen: 0x8fa6c9,
}

export function createShopBackground(
  scene: Phaser.Scene,
  theme: Theme,
  title: string,
  labels: Readonly<Record<ZoneId, string>>,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0)
  const g = scene.add.graphics()
  container.add(g)

  g.fillStyle(theme.bg, 1)
  g.fillRect(0, 0, ROOM_W, ROOM_H)
  g.fillStyle(gameColors.wall, 1)
  g.fillRect(0, 0, ROOM_W, ROOM_H)

  // Floor planks.
  g.fillStyle(gameColors.floor, 1)
  g.fillRect(40, 80, 600, 1080)
  for (let row = 0; row < 36; row += 1) {
    const y = 80 + row * 30
    g.fillStyle(row % 2 === 0 ? 0xf6dfba : 0xf0d3a5, 1)
    g.fillRect(40, y, 600, 30)
    g.lineStyle(1, gameColors.floorLine, 0.55)
    g.lineBetween(40, y, 640, y)
    const seam = row % 2 === 0 ? 40 : 140
    for (let x = seam; x < 640; x += 180) g.lineBetween(x, y, x, y + 30)
  }

  // Zone floor tints.
  for (const zone of ZONE_ORDER) {
    const top = zone === 'fruit' || zone === 'veg' ? 90 : 590
    const bottom = zone === 'fruit' || zone === 'veg' ? 510 : 995
    const left = zone === 'fruit' || zone === 'farm' ? 44 : 384
    const right = zone === 'fruit' || zone === 'farm' ? 296 : 636
    g.fillStyle(ZONE_TINTS[zone], 0.1)
    g.fillRoundedRect(left, top, right - left, bottom - top, 18)
    g.lineStyle(2, ZONE_TINTS[zone], 0.22)
    g.strokeRoundedRect(left, top, right - left, bottom - top, 18)
    const labelX = zone === 'fruit' || zone === 'farm' ? 70 : 440
    const labelY = zone === 'fruit' || zone === 'veg' ? 72 : 584
    container.add(
      scene.add
        .text(labelX, labelY, labels[zone], textStyle(theme, 12, theme.textMuted, true))
        .setOrigin(0, 0.5),
    )
  }

  // Central aisles.
  g.fillStyle(0xffffff, 0.16)
  g.fillRoundedRect(300, 144, 80, 856, 18)
  g.fillRoundedRect(40, 520, 600, 60, 18)

  drawGhostFacilities(g)

  // Top wall and awning.
  g.fillStyle(gameColors.wall, 1)
  g.fillRect(24, 24, 632, 56)
  g.fillStyle(gameColors.wallDark, 1)
  g.fillRect(24, 74, 632, 6)
  for (let index = 0; index < 26; index += 1) {
    g.fillStyle(index % 2 === 0 ? gameColors.coral : gameColors.cream, 1)
    g.fillRect(28 + index * 24, 24, 24, 22)
  }
  g.fillStyle(0x3b2f3a, 0.12)
  g.fillRect(40, 46, 600, 4)

  // Side and bottom walls.
  g.fillStyle(gameColors.wall, 1)
  g.fillRect(24, 80, 16, 1080)
  g.fillRect(640, 80, 16, 1080)
  g.fillStyle(gameColors.wallDark, 1)
  g.fillRect(40, 1160, 220, 16)
  g.fillRect(340, 1160, 300, 16)
  g.fillStyle(0x3b2f3a, 0.12)
  g.fillRect(40, 1158, 220, 3)
  g.fillRect(340, 1158, 300, 3)

  // Window on the top wall.
  g.fillStyle(0x3b2f3a, 0.75)
  g.fillRoundedRect(70, 28, 110, 30, 6)
  g.fillStyle(gameColors.sky, 1)
  g.fillRoundedRect(73, 31, 104, 24, 4)
  g.fillStyle(0xffffff, 0.65)
  g.fillEllipse(94, 39, 26, 8)
  g.fillEllipse(140, 35, 22, 7)
  g.lineStyle(3, gameColors.cream, 1)
  g.lineBetween(125, 31, 125, 55)
  g.lineBetween(73, 43, 177, 43)

  // Shop sign.
  g.fillStyle(0x3b2f3a, 0.22)
  g.fillRoundedRect(260, 28, 160, 38, 12)
  g.fillStyle(gameColors.woodDark, 1)
  g.fillRoundedRect(258, 25, 164, 38, 12)
  g.fillStyle(gameColors.woodLight, 1)
  g.fillRoundedRect(263, 29, 154, 30, 9)
  const sign = scene.add
    .text(340, 44, title, displayTextStyle(theme, 20, '#fff7e8', true, 2, 2))
    .setOrigin(0.5)
  container.add(sign)

  // Pendant lamps.
  for (const x of [180, 340, 500]) {
    g.lineStyle(2, 0x3b2f3a, 0.3)
    g.lineBetween(x, 54, x, 66)
    g.fillStyle(0xffd166, 1)
    g.fillCircle(x, 70, 8)
    g.fillStyle(0xfff3b0, 0.7)
    g.fillCircle(x - 2, 68, 4)
  }

  // Central rug.
  g.fillStyle(0x3b2f3a, 0.08)
  g.fillRoundedRect(286, 524, 108, 52, 20)
  g.fillStyle(0xe9b7a3, 1)
  g.fillRoundedRect(282, 520, 108, 52, 20)
  g.lineStyle(3, 0xf7d6c4, 1)
  g.strokeRoundedRect(290, 528, 92, 36, 14)

  // Queue markers.
  for (const slot of QUEUE_SLOTS) {
    g.fillStyle(0xffffff, 0.22)
    g.fillEllipse(slot.x, slot.y + 16, 32, 10)
  }

  drawCounter(g)
  drawDoorMat(g)
  drawPlant(g, 60, 1128)
  drawPlant(g, 620, 1128)
  drawPlant(g, 60, 110)
  drawPlant(g, 620, 110)

  return container
}

function drawGhostFacilities(g: Phaser.GameObjects.Graphics): void {
  for (const plot of [...PLOTS, ...CROP_PLOTS]) {
    const left = plot.x - PLOT_SIZE.w / 2
    const top = plot.y - PLOT_SIZE.h / 2
    g.fillStyle(0x8f5734, 0.12)
    g.fillRoundedRect(left, top, PLOT_SIZE.w, PLOT_SIZE.h, 7)
    g.lineStyle(2, 0x8f5734, 0.22)
    g.strokeRoundedRect(left, top, PLOT_SIZE.w, PLOT_SIZE.h, 7)
    g.lineStyle(1, 0x6f4b2e, 0.18)
    for (let row = 0; row < 2; row += 1) {
      g.lineBetween(left + 9, top + 16 + row * 13, left + PLOT_SIZE.w - 9, top + 16 + row * 13)
    }
  }

  for (const product of ANIMAL_ORDER) {
    const pen = ANIMAL_PENS[product]
    const left = pen.x - PEN_SIZE.w / 2
    const top = pen.y - PEN_SIZE.h / 2
    g.fillStyle(0xe0c080, 0.14)
    g.fillRoundedRect(left, top, PEN_SIZE.w, PEN_SIZE.h, 9)
    g.lineStyle(2, 0xb98a5c, 0.3)
    g.strokeRoundedRect(left, top, PEN_SIZE.w, PEN_SIZE.h, 9)
    g.lineStyle(2, 0xb98a5c, 0.24)
    g.lineBetween(left + 8, top + 10, left + PEN_SIZE.w - 8, top + 10)
    g.lineBetween(left + 8, top + PEN_SIZE.h - 10, left + PEN_SIZE.w - 8, top + PEN_SIZE.h - 10)
    for (let x = left + 8; x <= left + PEN_SIZE.w - 8; x += 16) {
      g.lineBetween(x, top + 6, x, top + PEN_SIZE.h - 6)
    }
  }

  for (const product of PROCESSED_ORDER) {
    const station = STATION_SLOTS[product]
    const left = station.x - STATION_SIZE.w / 2
    const top = station.y - STATION_SIZE.h / 2
    g.fillStyle(0x8fa6c9, 0.14)
    g.fillRoundedRect(left, top, STATION_SIZE.w, STATION_SIZE.h, 9)
    g.lineStyle(2, 0x6f89b0, 0.28)
    g.strokeRoundedRect(left, top, STATION_SIZE.w, STATION_SIZE.h, 9)
    g.lineStyle(1, 0x6f89b0, 0.2)
    g.lineBetween(left + 10, top + 14, left + STATION_SIZE.w - 10, top + 14)
  }
}

function drawCounter(g: Phaser.GameObjects.Graphics): void {
  const rect = COUNTER_RECT
  g.fillStyle(0x3b2f3a, 0.18)
  g.fillRoundedRect(rect.x, rect.y + 8, rect.w, rect.h, 12)
  g.fillStyle(gameColors.woodDark, 1)
  g.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, 12)
  g.fillStyle(gameColors.wood, 1)
  g.fillRoundedRect(rect.x + 4, rect.y + 3, rect.w - 8, rect.h - 10, 10)
  g.fillStyle(gameColors.woodLight, 1)
  g.fillRoundedRect(rect.x + 8, rect.y + 6, rect.w - 16, 12, 6)
  g.lineStyle(2, 0x7b4f33, 0.6)
  g.lineBetween(rect.x + 14, rect.y + 30, rect.x + rect.w - 14, rect.y + 30)
  g.lineBetween(rect.x + 14, rect.y + 42, rect.x + rect.w - 14, rect.y + 42)

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
  g.fillRoundedRect(234, 1110, 92, 46, 8)
  g.fillStyle(0xf7d6c4, 1)
  g.fillRoundedRect(232, 1108, 92, 46, 8)
  g.lineStyle(3, gameColors.coral, 0.8)
  g.strokeRoundedRect(238, 1114, 80, 34, 5)
  g.lineBetween(246, 1122, 310, 1122)
  g.lineBetween(246, 1140, 310, 1140)
}
