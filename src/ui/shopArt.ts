import { displayTextStyle, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { gameColors } from '../colors'
import {
  ANIMAL_ORDER,
  PEN_SIZE,
  PLOT_SIZE,
  PROCESSED_ORDER,
  STATION_SIZE,
  ZONE_ORDER,
} from '../logic/config'
import type { ShopMap, ZoneId } from '../logic/types'
import { drawRestMat } from './facilitiesArt'

export const ZONE_TINTS: Readonly<Record<ZoneId, number>> = {
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
  map: ShopMap,
): Phaser.GameObjects.Container {
  return map.id === 'landscape'
    ? createLandscapeShopBackground(scene, theme, title, labels, map)
    : createPortraitShopBackground(scene, theme, title, labels, map)
}

function createPortraitShopBackground(
  scene: Phaser.Scene,
  theme: Theme,
  title: string,
  labels: Readonly<Record<ZoneId, string>>,
  map: ShopMap,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0)
  const g = scene.add.graphics()
  container.add(g)
  const width = map.room.w
  const height = map.room.h

  g.fillStyle(theme.bg, 1)
  g.fillRect(0, 0, width, height)
  g.fillStyle(gameColors.wall, 1)
  g.fillRect(0, 0, width, height)

  // Floor planks.
  g.fillStyle(gameColors.floor, 1)
  g.fillRect(40, 80, width - 80, height - 120)
  for (let row = 0; row < 36; row += 1) {
    const y = 80 + row * 30
    g.fillStyle(row % 2 === 0 ? 0xf6dfba : 0xf0d3a5, 1)
    g.fillRect(40, y, width - 80, 30)
    g.lineStyle(1, gameColors.floorLine, 0.55)
    g.lineBetween(40, y, width - 40, y)
    const seam = row % 2 === 0 ? 40 : 140
    for (let x = seam; x < width - 40; x += 180) g.lineBetween(x, y, x, y + 30)
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
  g.fillRoundedRect(40, 520, width - 80, 60, 18)

  drawGhostFacilities(g, map)
  drawRestMat(g, map.facilities.restMat)

  // Top wall and awning.
  g.fillStyle(gameColors.wall, 1)
  g.fillRect(24, 24, width - 48, 56)
  g.fillStyle(gameColors.wallDark, 1)
  g.fillRect(24, 74, width - 48, 6)
  for (let index = 0; index < 26; index += 1) {
    g.fillStyle(index % 2 === 0 ? gameColors.coral : gameColors.cream, 1)
    g.fillRect(28 + index * 24, 24, 24, 22)
  }
  g.fillStyle(0x3b2f3a, 0.12)
  g.fillRect(40, 46, width - 80, 4)

  // Side and bottom walls.
  g.fillStyle(gameColors.wall, 1)
  g.fillRect(24, 80, 16, height - 120)
  g.fillRect(width - 40, 80, 16, height - 120)
  g.fillStyle(gameColors.wallDark, 1)
  g.fillRect(40, height - 40, 220, 16)
  g.fillRect(340, height - 40, width - 380, 16)
  g.fillStyle(0x3b2f3a, 0.12)
  g.fillRect(40, height - 42, 220, 3)
  g.fillRect(340, height - 42, width - 380, 3)

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
  container.add(
    scene.add
      .text(340, 44, title, displayTextStyle(theme, 20, '#fff7e8', true, 2, 2))
      .setOrigin(0.5),
  )

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

  drawQueueMarkers(g, map)
  drawCounter(g, map)
  drawDoorMat(g, 278, 1108)
  drawPlant(g, 60, 1128)
  drawPlant(g, 60, 110)
  drawPlant(g, 620, 110)

  return container
}

function createLandscapeShopBackground(
  scene: Phaser.Scene,
  theme: Theme,
  title: string,
  labels: Readonly<Record<ZoneId, string>>,
  map: ShopMap,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0)
  const g = scene.add.graphics()
  container.add(g)
  const width = map.room.w
  const height = map.room.h

  g.fillStyle(theme.bg, 1)
  g.fillRect(0, 0, width, height)
  g.fillStyle(gameColors.wall, 1)
  g.fillRect(0, 0, width, height)

  // Floor planks across the wide room.
  g.fillStyle(gameColors.floor, 1)
  g.fillRect(40, 80, width - 80, height - 120)
  for (let y = 80; y < height - 40; y += 30) {
    const row = Math.floor((y - 80) / 30)
    g.fillStyle(row % 2 === 0 ? 0xf6dfba : 0xf0d3a5, 1)
    g.fillRect(40, y, width - 80, 30)
    g.lineStyle(1, gameColors.floorLine, 0.55)
    g.lineBetween(40, y, width - 40, y)
    const seam = row % 2 === 0 ? 40 : 140
    for (let x = seam; x < width - 40; x += 180) g.lineBetween(x, y, x, y + 30)
  }

  // Four zone strips, each with a readable header pill below its shelf.
  for (const zone of ZONE_ORDER) {
    const shelf = map.shelves[zone]
    const left = shelf.x
    const top = 88
    const tint = ZONE_TINTS[zone]
    g.fillStyle(tint, 0.1)
    g.fillRoundedRect(left, top, shelf.w, 300, 18)
    g.lineStyle(2, tint, 0.22)
    g.strokeRoundedRect(left, top, shelf.w, 300, 18)

    const label = scene.add
      .text(left + shelf.w / 2, 158, labels[zone], textStyle(theme, 18, theme.text, true))
      .setOrigin(0.5)
    const pillWidth = Math.max(72, label.width + 34)
    g.fillStyle(tint, 0.2)
    g.fillRoundedRect(left + shelf.w / 2 - pillWidth / 2, 142, pillWidth, 30, 15)
    g.lineStyle(2, tint, 0.55)
    g.strokeRoundedRect(left + shelf.w / 2 - pillWidth / 2, 142, pillWidth, 30, 15)
    g.fillStyle(tint, 1)
    g.fillCircle(left + shelf.w / 2 - pillWidth / 2 + 14, 157, 4.5)
    container.add(label)
  }

  // Aisles between the zones and below them.
  g.fillStyle(0xffffff, 0.16)
  for (const x of [260, 560, 860]) g.fillRoundedRect(x, 88, 80, 300, 18)
  g.fillRoundedRect(40, 400, width - 80, 110, 18)

  drawGhostFacilities(g, map)
  drawKitchenCorner(g, map.stationSlots.sweater.x, map.stationSlots.grilledFish.y)
  drawRestMat(g, map.facilities.restMat)

  // Top wall and awning.
  g.fillStyle(gameColors.wall, 1)
  g.fillRect(24, 24, width - 48, 56)
  g.fillStyle(gameColors.wallDark, 1)
  g.fillRect(24, 74, width - 48, 6)
  for (let x = 28; x + 24 <= width - 28; x += 24) {
    const index = Math.round((x - 28) / 24)
    g.fillStyle(index % 2 === 0 ? gameColors.coral : gameColors.cream, 1)
    g.fillRect(x, 24, 24, 22)
  }
  g.fillStyle(0x3b2f3a, 0.12)
  g.fillRect(40, 46, width - 80, 4)

  // Side and bottom walls.
  g.fillStyle(gameColors.wall, 1)
  g.fillRect(24, 80, 16, height - 120)
  g.fillRect(width - 40, 80, 16, height - 120)
  g.fillStyle(gameColors.wallDark, 1)
  g.fillRect(40, height - 40, 192, 16)
  g.fillRect(328, height - 40, width - 368, 16)
  g.fillStyle(0x3b2f3a, 0.12)
  g.fillRect(40, height - 42, 192, 3)
  g.fillRect(328, height - 42, width - 368, 3)

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
  g.fillRoundedRect(width / 2 - 80, 28, 160, 38, 12)
  g.fillStyle(gameColors.woodDark, 1)
  g.fillRoundedRect(width / 2 - 82, 25, 164, 38, 12)
  g.fillStyle(gameColors.woodLight, 1)
  g.fillRoundedRect(width / 2 - 77, 29, 154, 30, 9)
  container.add(
    scene.add
      .text(width / 2, 44, title, displayTextStyle(theme, 20, '#fff7e8', true, 2, 2))
      .setOrigin(0.5),
  )

  // Pendant lamps.
  for (const x of [180, 450, 750, 1020]) {
    g.lineStyle(2, 0x3b2f3a, 0.3)
    g.lineBetween(x, 54, x, 66)
    g.fillStyle(0xffd166, 1)
    g.fillCircle(x, 70, 8)
    g.fillStyle(0xfff3b0, 0.7)
    g.fillCircle(x - 2, 68, 4)
  }

  // Rug in the open right-hand corner.
  g.fillStyle(0x3b2f3a, 0.08)
  g.fillRoundedRect(814, 404, 232, 72, 24)
  g.fillStyle(0xe9b7a3, 1)
  g.fillRoundedRect(810, 400, 232, 72, 24)
  g.lineStyle(3, 0xf7d6c4, 1)
  g.strokeRoundedRect(820, 410, 212, 52, 18)
  g.lineStyle(2, 0xd99a86, 0.55)
  for (let x = 842; x < 1010; x += 24) g.lineBetween(x, 416, x, 456)

  drawQueueMarkers(g, map)
  drawCounter(g, map)
  drawDoorMat(g, 278, 596)
  drawPlant(g, 60, 620)
  drawPlant(g, 60, 110)
  drawPlant(g, 1140, 110)

  return container
}

function drawQueueMarkers(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  for (const slot of map.queueSlots) {
    g.fillStyle(0xffffff, 0.22)
    g.fillEllipse(slot.x, slot.y + 16, 32, 10)
  }
}

function drawGhostFacilities(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  for (const plot of [...map.plots, ...map.cropPlots]) {
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
    const pen = map.animalPens[product]
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
    const station = map.stationSlots[product]
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

function drawKitchenCorner(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x3b2f3a, 0.06)
  g.fillEllipse(x, y + 18, 78, 16)
  g.fillStyle(0x8fa6c9, 0.16)
  g.fillEllipse(x, y, 82, 52)
  g.lineStyle(2, 0x6f89b0, 0.3)
  g.strokeEllipse(x, y, 72, 42)
  g.lineStyle(1, 0x6f89b0, 0.22)
  g.strokeEllipse(x, y, 52, 28)
  g.fillStyle(0x6f89b0, 0.18)
  g.fillEllipse(x, y, 18, 8)
}

function drawCounter(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  const rect = map.counter
  const register = map.register
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
  g.fillRoundedRect(register.x - 25, register.y - 16, 52, 32, 8)
  g.fillStyle(0x4b4050, 1)
  g.fillRoundedRect(register.x - 26, register.y - 18, 50, 30, 8)
  g.fillStyle(0x9be7d0, 1)
  g.fillRoundedRect(register.x - 17, register.y - 13, 32, 15, 4)
  g.fillStyle(0x3b2f3a, 0.45)
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      g.fillRoundedRect(register.x - 20 + column * 8, register.y + 5 + row * 5, 5, 3, 1)
    }
  }
  g.fillStyle(0xffd166, 1)
  g.fillCircle(register.x + 22, register.y + 10, 4)
}

function drawDoorMat(g: Phaser.GameObjects.Graphics, centerX: number, top: number): void {
  const left = centerX - 46
  g.fillStyle(0x3b2f3a, 0.12)
  g.fillRoundedRect(left + 2, top + 2, 92, 46, 8)
  g.fillStyle(0xf7d6c4, 1)
  g.fillRoundedRect(left, top, 92, 46, 8)
  g.lineStyle(3, gameColors.coral, 0.8)
  g.strokeRoundedRect(left + 6, top + 6, 80, 34, 5)
  g.lineBetween(left + 14, top + 14, left + 78, top + 14)
  g.lineBetween(left + 14, top + 32, left + 78, top + 32)
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
