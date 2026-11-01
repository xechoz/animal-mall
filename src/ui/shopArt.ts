import { displayTextStyle, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { gameColors } from '../colors'
import { PEN_SIZE, ZONE_ORDER } from '../logic/config'
import type { ShopMap, ZoneId } from '../logic/types'
import { drawRestMat } from './facilitiesArt'
import {
  drawAntTrail,
  drawBarrel,
  drawBird,
  drawCanopyBand,
  drawFence,
  drawFern,
  drawLantern,
  drawLeafLitter,
  drawMushroomCluster,
  drawRock,
  drawSunShaft,
  fillPolygon,
  strokePolygon,
} from './forestArt'
import { drawTagFrame } from './frames'
import { drawClover, drawGrassTuft } from './groundArt'
import { drawIndoorScenery } from './scenery'

export const ZONE_TINTS: Readonly<Record<ZoneId, number>> = {
  fruit: 0xd97757,
  veg: 0x7fae63,
  farm: 0xc9a45a,
  kitchen: 0x8a9098,
}

export function createShopBackground(
  scene: Phaser.Scene,
  theme: Theme,
  title: string,
  labels: Readonly<Record<ZoneId, string>>,
  map: ShopMap,
  textScale: number,
): Phaser.GameObjects.Container {
  return map.id === 'landscape'
    ? createLandscapeShopBackground(scene, theme, title, labels, map, textScale)
    : createPortraitShopBackground(scene, theme, title, labels, map, textScale)
}

function createPortraitShopBackground(
  scene: Phaser.Scene,
  theme: Theme,
  title: string,
  labels: Readonly<Record<ZoneId, string>>,
  map: ShopMap,
  textScale: number,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0)
  const g = scene.add.graphics()
  container.add(g)
  const width = map.room.w
  const height = map.room.h

  drawOuterBand(g, width, height)
  drawFloor(g, map)
  drawAisles(g, map, true)
  drawIndoorScenery(g, map)
  drawGhostFacilities(g, map)
  drawRestMat(g, map.facilities.restMat)
  drawTopBand(g, theme, title, width, container, scene, 1)
  drawSideFences(g, map)
  drawCentralRug(g, 282, 520, 108, 52)
  drawQueueMarkers(g, map)
  drawCounter(g, map)
  drawDoorMat(g, 278, 1108)
  drawPlant(g, 60, 110)
  drawPlant(g, 620, 110)
  drawZoneLabels(g, theme, labels, map, true, textScale, container, scene)
  drawDappledLight(g, map)
  drawEdgeFoliage(g, map)

  return container
}

function createLandscapeShopBackground(
  scene: Phaser.Scene,
  theme: Theme,
  title: string,
  labels: Readonly<Record<ZoneId, string>>,
  map: ShopMap,
  textScale: number,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0)
  const g = scene.add.graphics()
  container.add(g)
  const width = map.room.w
  const height = map.room.h

  drawOuterBand(g, width, height)
  drawFloor(g, map)
  drawAisles(g, map, false)
  drawIndoorScenery(g, map)
  drawGhostFacilities(g, map)
  drawRestMat(g, map.facilities.restMat)
  drawTopBand(g, theme, title, width, container, scene, 1.15)
  drawSideFences(g, map)
  drawCentralRug(g, 810, 400, 232, 72)
  drawQueueMarkers(g, map)
  drawCounter(g, map)
  drawDoorMat(g, 278, 596)
  drawPlant(g, 60, 110)
  drawPlant(g, 1140, 110)
  drawZoneLabels(g, theme, labels, map, false, textScale, container, scene)
  drawDappledLight(g, map)
  drawEdgeFoliage(g, map)

  return container
}

function drawOuterBand(g: Phaser.GameObjects.Graphics, width: number, height: number): void {
  g.fillStyle(gameColors.canopy, 1)
  g.fillRect(0, 0, width, height)
  g.fillStyle(gameColors.pine, 0.7)
  g.fillRect(0, 0, width, 64)
}

function drawFloor(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  const floorLeft = 24
  const floorTop = 64
  const floorRight = map.room.w - 24
  const floorBottom = map.room.h - 24
  g.fillStyle(gameColors.floor, 1)
  g.fillRect(floorLeft, floorTop, floorRight - floorLeft, floorBottom - floorTop)

  for (let y = floorTop; y < floorBottom; y += 30) {
    const row = Math.floor((y - floorTop) / 30)
    const rowHeight = Math.min(30, floorBottom - y)
    g.fillStyle(row % 2 === 0 ? 0xecd9b2 : 0xe5d0a4, 1)
    g.fillRect(floorLeft, y, floorRight - floorLeft, rowHeight)
    g.lineStyle(1, gameColors.floorLine, 0.45)
    g.lineBetween(floorLeft, y, floorRight, y)
    const seam = row % 2 === 0 ? floorLeft : floorLeft + 100
    for (let x = seam; x < floorRight; x += 180) g.lineBetween(x, y, x, y + rowHeight)
  }

  // Moss creeps in from the fence line without changing the walkable area.
  g.fillStyle(gameColors.moss, 0.14)
  g.fillRect(floorLeft, floorTop, 10, floorBottom - floorTop)
  g.fillRect(floorRight - 10, floorTop, 10, floorBottom - floorTop)
  g.fillRect(floorLeft, floorTop, floorRight - floorLeft, 8)
  g.fillRect(floorLeft, floorBottom - 8, floorRight - floorLeft, 8)
  g.fillStyle(gameColors.moss, 0.1)
  g.fillEllipse(
    floorLeft + (floorRight - floorLeft) * 0.3,
    floorTop + (floorBottom - floorTop) * 0.58,
    150,
    46,
  )
  g.fillEllipse(
    floorLeft + (floorRight - floorLeft) * 0.72,
    floorTop + (floorBottom - floorTop) * 0.8,
    170,
    50,
  )
}

function drawAisles(g: Phaser.GameObjects.Graphics, map: ShopMap, portrait: boolean): void {
  if (portrait) {
    drawDirtPath(g, 300, 144, 80, 956, true, 11)
    drawDirtPath(g, 40, 522, map.room.w - 80, 48, false, 23)
    drawDirtPath(g, 246, 1000, 108, 108, true, 91)
    drawLeafLitter(g, { x: 290, y: 160, w: 100, h: 920 }, 16, 41)
    drawAntTrail(g, 328, 760, 0.9)
  } else {
    for (const x of [260, 560, 860]) drawDirtPath(g, x, 88, 80, 300, true, 51 + x)
    drawDirtPath(g, 40, 408, map.room.w - 80, 76, false, 71)
    drawDirtPath(g, 246, 510, 108, 130, true, 93)
    drawLeafLitter(g, { x: 40, y: 416, w: map.room.w - 80, h: 60 }, 18, 83)
    drawAntTrail(g, 616, 456, 0.9)
  }
}

function drawDirtPath(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  vertical: boolean,
  seed: number,
): void {
  const points: Array<{ x: number; y: number }> = []
  const steps = vertical ? 8 : 10
  const wobble = (index: number): number => ((index * 37 + seed) % 9) - 4
  if (vertical) {
    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps
      points.push({ x: x + wobble(index), y: y + height * t })
    }
    for (let index = steps; index >= 0; index -= 1) {
      const t = index / steps
      points.push({ x: x + width + wobble(index + 3), y: y + height * t })
    }
  } else {
    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps
      points.push({ x: x + width * t, y: y + wobble(index) })
    }
    for (let index = steps; index >= 0; index -= 1) {
      const t = index / steps
      points.push({ x: x + width * t, y: y + height + wobble(index + 5) })
    }
  }
  fillPolygon(g, points, 0xa87a4a, 0.86)
  strokePolygon(g, points, 0x6f4a2c, 0.45, 2)
  for (let index = 0; index < 14; index += 1) {
    const t = (index + 0.5) / 14
    const px = vertical ? x + 8 + ((index * 23 + seed) % Math.max(1, width - 16)) : x + width * t
    const py = vertical ? y + height * t : y + 9 + ((index * 17 + seed) % Math.max(1, height - 18))
    g.fillStyle(index % 2 === 0 ? gameColors.barkLight : gameColors.moss, 0.32)
    g.fillEllipse(px, py, 4, 1.8)
  }

  const stoneCount = vertical ? 5 : 7
  for (let index = 0; index < stoneCount; index += 1) {
    const t = (index + 0.5) / stoneCount
    const cx = vertical ? x + width / 2 : x + width * t
    const cy = vertical ? y + height * t : y + height / 2
    g.fillStyle(0x1a120c, 0.1)
    g.fillEllipse(cx + 1, cy + 3, 24, 9)
    g.fillStyle(0xe0cba4, 0.95)
    g.fillEllipse(cx, cy, 22, 8)
    g.fillStyle(0xf2e3c6, 0.65)
    g.fillEllipse(cx - 2, cy - 1, 14, 4)
  }
}

function drawGhostFacilities(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  // Pens are real split-rail enclosures now; the trough and animals stay on top.
  for (const pen of map.animalPens) {
    const left = pen.x - PEN_SIZE.w / 2
    const right = pen.x + PEN_SIZE.w / 2
    const top = pen.y - PEN_SIZE.h / 2
    const bottom = pen.y + PEN_SIZE.h / 2
    g.fillStyle(gameColors.straw, 0.2)
    g.fillEllipse(pen.x, pen.y + 16, PEN_SIZE.w - 16, 24)
    g.fillStyle(gameColors.hay, 0.5)
    g.fillEllipse(pen.x - 18, pen.y + 12, 14, 6)
    g.fillStyle(gameColors.stoneDark, 0.5)
    g.fillEllipse(pen.x + 20, pen.y + 18, 9, 4)
    drawFence(
      g,
      { x1: left, y1: top + 6, x2: right, y2: top + 6 },
      { height: 12, postGap: 28, moss: false, seed: pen.index + 3 },
    )
    drawFence(
      g,
      { x1: left + 2, y1: top, x2: left + 2, y2: bottom },
      { height: 12, postGap: 28, moss: false, seed: pen.index + 5 },
    )
    drawFence(
      g,
      { x1: right - 2, y1: top, x2: right - 2, y2: bottom },
      { height: 12, postGap: 28, moss: false, seed: pen.index + 7 },
    )
    drawFence(
      g,
      { x1: left, y1: bottom, x2: right, y2: bottom },
      {
        height: 10,
        postGap: 16,
        gapStart: PEN_SIZE.w / 2 - 12,
        gapEnd: PEN_SIZE.w / 2 + 12,
        moss: false,
        seed: pen.index + 9,
      },
    )
  }

  for (const station of map.stationSlots) {
    g.fillStyle(gameColors.stone, 0.18)
    g.fillRoundedRect(station.x - 42, station.y - 30, 84, 62, 12)
    g.lineStyle(2, gameColors.stoneDark, 0.3)
    g.strokeRoundedRect(station.x - 42, station.y - 30, 84, 62, 12)
    g.lineStyle(1, gameColors.stoneDark, 0.18)
    g.lineBetween(station.x - 34, station.y - 18, station.x + 34, station.y - 18)
    g.lineBetween(station.x - 34, station.y + 18, station.x + 34, station.y + 18)
  }
}

function drawTopBand(
  g: Phaser.GameObjects.Graphics,
  theme: Theme,
  title: string,
  width: number,
  container: Phaser.GameObjects.Container,
  scene: Phaser.Scene,
  scale: number,
): void {
  // Canopy and hedge replace the old awning/window wall; the fence closes the
  // room while the forest still shows above it.
  drawCanopyBand(g, 24, 22, width - 48, 36, 17)
  drawFence(g, { x1: 28, y1: 60, x2: width - 28, y2: 60 }, { height: 26, postGap: 38, seed: 19 })

  const signWidth = 164 * scale
  const signHeight = 38 * scale
  const centerX = width / 2
  const signY = 24
  g.lineStyle(2, gameColors.barkDark, 0.8)
  g.lineBetween(centerX - signWidth / 2 + 18, 16, centerX - signWidth / 2 + 18, signY + 2)
  g.lineBetween(centerX + signWidth / 2 - 18, 16, centerX + signWidth / 2 - 18, signY + 2)
  g.fillStyle(0x1a120c, 0.22)
  g.fillRoundedRect(centerX - signWidth / 2 + 4, signY + 4, signWidth, signHeight, 12)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(centerX - signWidth / 2, signY, signWidth, signHeight, 12)
  g.fillStyle(gameColors.woodLight, 1)
  g.fillRoundedRect(centerX - signWidth / 2 + 5, signY + 4, signWidth - 10, signHeight - 12, 9)
  g.fillStyle(gameColors.hay, 0.5)
  g.fillRoundedRect(centerX - signWidth / 2 + 12, signY + 7, signWidth - 24, 2, 1)
  container.add(
    scene.add
      .text(
        centerX,
        signY + signHeight / 2 - 2,
        title,
        displayTextStyle(theme, 20 * scale, '#fff7e8', true, 2, 2),
      )
      .setOrigin(0.5),
  )

  for (const x of [width * 0.15, width * 0.85]) {
    g.lineStyle(1.4, gameColors.barkDark, 0.8)
    g.lineBetween(x, 22, x, 44)
    drawLantern(g, x, 52, 0.85)
  }
  drawBird(g, width * 0.31, 54, 0.9, 1)
  drawBird(g, width * 0.7, 54, 0.72, -1)
}

function drawSideFences(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  const { w, h } = map.room
  drawFence(g, { x1: 28, y1: 64, x2: 28, y2: h - 28 }, { height: 26, postGap: 42, seed: 29 })
  drawFence(
    g,
    { x1: w - 28, y1: 64, x2: w - 28, y2: h - 28 },
    {
      height: 26,
      postGap: 42,
      seed: 31,
    },
  )
  const door = map.doorPoint.x
  drawFence(
    g,
    { x1: 40, y1: h - 28, x2: w - 40, y2: h - 28 },
    {
      height: 24,
      postGap: 44,
      gapStart: door - 58 - 40,
      gapEnd: door + 58 - 40,
      seed: 37,
    },
  )
}

function drawZoneLabels(
  g: Phaser.GameObjects.Graphics,
  theme: Theme,
  labels: Readonly<Record<ZoneId, string>>,
  map: ShopMap,
  portrait: boolean,
  textScale: number,
  container: Phaser.GameObjects.Container,
  scene: Phaser.Scene,
): void {
  for (const zone of ZONE_ORDER) {
    const area = map.zoneAreas[zone]
    if (portrait) {
      const labelX = zone === 'fruit' || zone === 'farm' ? 70 : 440
      const labelY = area.y < 200 ? 74 : 580
      const label = scene.add
        .text(labelX, labelY, labels[zone], textStyle(theme, 12 * textScale, theme.text, true))
        .setOrigin(0, 0.5)
      const tagHeight = Math.max(18, 10 * textScale + 10)
      drawTagFrame(g, labelX - 9, labelY - tagHeight / 2, label.width + 18, tagHeight)
      g.fillStyle(ZONE_TINTS[zone], 0.9)
      g.fillCircle(labelX - 1, labelY, 2.5)
      container.add(label)
      continue
    }

    const shelf = map.shelves[zone]
    const headerScale = Math.min(textScale, 1.3)
    const centerX = shelf.x + shelf.w / 2
    const centerY = 157
    const label = scene.add
      .text(centerX, centerY, labels[zone], textStyle(theme, 18 * headerScale, theme.text, true))
      .setOrigin(0.5)
    const tagWidth = Math.max(78 * headerScale, label.width + 40 * headerScale)
    const tagHeight = 30 * headerScale
    drawTagFrame(
      g,
      centerX - tagWidth / 2,
      centerY - tagHeight / 2,
      tagWidth,
      tagHeight,
      10 * headerScale,
    )
    g.fillStyle(ZONE_TINTS[zone], 0.95)
    g.fillCircle(centerX - tagWidth / 2 + 14 * headerScale, centerY, 4.5 * headerScale)
    g.fillStyle(gameColors.leafLight, 0.9)
    g.fillEllipse(centerX + tagWidth / 2 - 13 * headerScale, centerY - 1, 9, 4)
    container.add(label)
  }
}

function drawCentralRug(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  g.fillStyle(0x1a120c, 0.12)
  g.fillRoundedRect(x + 4, y + 4, width, height, 20)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x, y, width, height, 20)
  g.fillStyle(gameColors.mossDark, 1)
  g.fillRoundedRect(x + 4, y + 4, width - 8, height - 8, 17)
  g.lineStyle(2.5, gameColors.hay, 0.75)
  g.strokeRoundedRect(x + 10, y + 10, width - 20, height - 20, 13)
  g.lineStyle(1.5, gameColors.moss, 0.7)
  for (let px = x + 18; px < x + width - 14; px += 18) {
    g.lineBetween(px, y + 14, px, y + height - 14)
  }
}

function drawQueueMarkers(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  for (const slot of map.queueSlots) {
    g.fillStyle(0x1a120c, 0.1)
    g.fillEllipse(slot.x + 1, slot.y + 18, 32, 10)
    g.fillStyle(0xcbb28a, 0.8)
    g.fillEllipse(slot.x, slot.y + 16, 30, 9)
    g.fillStyle(0xead6b4, 0.45)
    g.fillEllipse(slot.x - 2, slot.y + 15, 18, 4)
  }
}

function drawCounter(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  const rect = map.counter
  const register = map.register
  g.fillStyle(0x1a120c, 0.2)
  g.fillRoundedRect(rect.x, rect.y + 8, rect.w, rect.h, 12)
  g.fillStyle(gameColors.woodDark, 1)
  g.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, 12)
  g.fillStyle(gameColors.wood, 1)
  g.fillRoundedRect(rect.x + 4, rect.y + 3, rect.w - 8, rect.h - 10, 10)
  g.fillStyle(gameColors.woodLight, 1)
  g.fillRoundedRect(rect.x + 8, rect.y + 6, rect.w - 16, 12, 6)
  g.fillStyle(0xfff3dd, 0.28)
  g.fillRoundedRect(rect.x + 12, rect.y + 8, rect.w - 24, 3, 1.5)
  g.fillStyle(0x5a3a22, 0.3)
  g.fillRoundedRect(rect.x + 10, rect.y + 24, rect.w - 20, rect.h - 32, 6)
  g.lineStyle(2, gameColors.barkDark, 0.6)
  g.lineBetween(rect.x + 14, rect.y + 30, rect.x + rect.w - 14, rect.y + 30)
  g.lineBetween(rect.x + 14, rect.y + 42, rect.x + rect.w - 14, rect.y + 42)
  g.fillStyle(gameColors.moss, 0.6)
  g.fillEllipse(rect.x + 26, rect.y + rect.h - 4, 18, 5)
  g.fillEllipse(rect.x + rect.w - 30, rect.y + rect.h - 4, 16, 5)

  // Register: a brass-and-wood cash box instead of a grey office machine.
  g.fillStyle(0x1a120c, 0.2)
  g.fillRoundedRect(register.x - 25, register.y - 16, 52, 32, 8)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(register.x - 26, register.y - 18, 50, 30, 8)
  g.fillStyle(gameColors.woodLight, 1)
  g.fillRoundedRect(register.x - 22, register.y - 14, 42, 20, 5)
  g.fillStyle(0x9be7d0, 1)
  g.fillRoundedRect(register.x - 17, register.y - 13, 32, 15, 4)
  g.fillStyle(0xffffff, 0.35)
  g.fillRoundedRect(register.x - 14, register.y - 11, 12, 3, 1.5)
  g.fillStyle(0x2b241d, 0.45)
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      g.fillRoundedRect(register.x - 20 + column * 8, register.y + 3 + row * 5, 5, 3, 1)
    }
  }
  g.fillStyle(gameColors.sunbeam, 1)
  g.fillCircle(register.x + 22, register.y + 8, 4)
  drawBarrel(g, rect.x - 26, rect.y + 26, 0.9)
}

function drawDoorMat(g: Phaser.GameObjects.Graphics, centerX: number, top: number): void {
  const left = centerX - 46
  g.fillStyle(0x1a120c, 0.14)
  g.fillRoundedRect(left + 2, top + 2, 92, 46, 8)
  g.fillStyle(gameColors.woodLight, 1)
  g.fillRoundedRect(left, top, 92, 46, 8)
  g.lineStyle(3, gameColors.berry, 0.75)
  g.strokeRoundedRect(left + 6, top + 6, 80, 34, 5)
  g.lineStyle(1.5, gameColors.hay, 0.8)
  g.lineBetween(left + 14, top + 14, left + 78, top + 14)
  g.lineBetween(left + 14, top + 32, left + 78, top + 32)
  g.fillStyle(gameColors.moss, 0.8)
  g.fillEllipse(left + 20, top + 23, 10, 5)
  g.fillEllipse(left + 72, top + 23, 10, 5)
}

function drawPlant(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x1a120c, 0.12)
  g.fillEllipse(x, y + 14, 30, 8)
  g.fillStyle(gameColors.woodDark, 1)
  g.fillRoundedRect(x - 13, y, 26, 16, 5)
  g.fillStyle(gameColors.dirt, 1)
  g.fillEllipse(x, y + 2, 20, 6)
  g.fillStyle(gameColors.leafDark, 1)
  g.fillEllipse(x - 8, y - 10, 16, 9)
  g.fillEllipse(x + 8, y - 12, 15, 9)
  g.fillStyle(gameColors.moss, 1)
  g.fillEllipse(x, y - 18, 17, 10)
  g.fillEllipse(x - 11, y - 14, 13, 8)
  g.fillStyle(gameColors.leafLight, 1)
  g.fillEllipse(x + 2, y - 20, 8, 5)
}

function drawDappledLight(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  const { w, h } = map.room
  const spots = [
    { x: w * 0.22, y: h * 0.24, rx: 110, ry: 46 },
    { x: w * 0.72, y: h * 0.42, rx: 130, ry: 52 },
    { x: w * 0.38, y: h * 0.68, rx: 150, ry: 58 },
    { x: w * 0.82, y: h * 0.84, rx: 100, ry: 40 },
  ] as const
  for (const spot of spots) {
    g.fillStyle(gameColors.sunbeam, 0.055)
    g.fillEllipse(spot.x, spot.y, spot.rx, spot.ry)
  }
  drawSunShaft(g, w * 0.08, 64, 70, h - 88, 0.035)
  drawSunShaft(g, w * 0.62, 64, 52, h - 88, 0.03)
}

function drawEdgeFoliage(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  const { w, h } = map.room
  for (let y = 90; y < h - 40; y += 96) {
    drawGrassTuft(g, 36, y, 0.6)
    drawGrassTuft(g, w - 36, y + 18, 0.6)
  }
  drawFern(g, 42, 88, 0.7, 1)
  drawFern(g, w - 42, h - 96, 0.7, -1)
  drawMushroomCluster(g, w - 44, 84, 0.7)
  drawRock(g, 44, h - 110, 0.65)

  const bottomY = h - 42
  for (let x = 90; x < w - 70; x += 74) {
    if (Math.abs(x - map.doorPoint.x) < 70) continue
    drawGrassTuft(g, x, bottomY, 0.65)
    if (x % 148 < 74) drawClover(g, x + 9, bottomY - 5, 0.5)
  }
  drawMushroomCluster(g, 96, h - 52, 0.8)
  drawMushroomCluster(g, w - 96, h - 52, 0.7)
  drawFern(g, w * 0.32, h - 44, 0.7, 1)
  drawFern(g, w * 0.68, h - 44, 0.7, -1)
  drawLeafLitter(g, { x: 40, y: h - 130, w: w - 80, h: 96 }, 12, 151)
}
