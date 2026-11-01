import Phaser from 'phaser'
import { gameColors } from '../colors'
import { PEN_SIZE, STATION_SIZE, ZONE_ORDER } from '../logic/config'
import type { ShopMap, Vec2 } from '../logic/types'
import {
  drawAntTrail,
  drawBarrel,
  drawBeehive,
  drawFern,
  drawFirefly,
  drawFrog,
  drawHedgehog,
  drawLeafLitter,
  drawLog,
  drawMushroomCluster,
  drawRock,
  drawScarecrow,
  drawSquirrel,
  drawStump,
  drawWell,
  fillPolygon,
  strokePolygon,
  zonePatchPoints,
} from './forestArt'
import { drawClover, drawGrassTuft } from './groundArt'

const FLOWER_COLORS = [0xf2a8b4, 0xffd166, 0xbfe8ef, 0xe9b7a3] as const

/**
 * Decorative terrain inside the shop. Everything is drawn with Phaser
 * Graphics, stays behind actors and never changes collision or interaction
 * footprints. The zones are painted as organic clearings so the floor does not
 * read as four rounded UI cards.
 */
export function drawIndoorScenery(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  for (const zone of ZONE_ORDER) {
    const area = map.zoneAreas[zone]
    if (zone === 'fruit') drawFruitGround(g, map, area)
    else if (zone === 'veg') drawVegGround(g, area)
    else if (zone === 'farm') drawFarmGround(g, map, area)
    else drawKitchenGround(g, map, area)
  }

  drawWildlife(g, map)
  drawGardenStrip(g, map)
  drawBenchProps(g, map)

  // A few tiny residents make the floor feel alive without competing with the
  // real animals in their pens.
  drawLadybug(g, map.room.w * 0.17, map.room.h * 0.78)
  drawSnail(g, map.room.w * 0.82, map.room.h * 0.72)
}

function drawWildlife(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  const fruit = map.zoneAreas.fruit
  const veg = map.zoneAreas.veg
  const farm = map.zoneAreas.farm
  drawSquirrel(g, fruit.x + fruit.w - 28, fruit.y + fruit.h - 26, 0.85, -1)
  drawHedgehog(g, veg.x + 20, veg.y + veg.h - 34, 0.85, 1)
  drawAntTrail(g, farm.x + 24, farm.y + farm.h - 18, 0.8)
  drawFrog(g, map.room.w * 0.18, map.room.h - 34, 0.8)
}

/**
 * Animated butterflies, a bee, a dragonfly and a handful of fireflies. One
 * graphics object is cleared and redrawn per frame; positions follow
 * deterministic sine paths, so no RNG or simulation state is involved.
 */
export class SceneryView extends Phaser.GameObjects.Container {
  private readonly art: Phaser.GameObjects.Graphics
  private readonly anchors: readonly Vec2[]
  private readonly fireflies: readonly Vec2[]

  constructor(scene: Phaser.Scene, map: ShopMap) {
    super(scene, 0, 0)
    this.art = scene.add.graphics()
    this.add(this.art)
    this.anchors = [
      { x: map.zoneAreas.fruit.x + map.zoneAreas.fruit.w - 26, y: map.zoneAreas.fruit.y + 34 },
      { x: map.zoneAreas.veg.x + 24, y: map.zoneAreas.veg.y + map.zoneAreas.veg.h - 26 },
      { x: map.zoneAreas.farm.x + map.zoneAreas.farm.w - 24, y: map.zoneAreas.farm.y + 48 },
      { x: map.room.w * 0.56, y: map.room.h - 42 },
    ]
    this.fireflies = [
      { x: map.zoneAreas.fruit.x + 28, y: map.zoneAreas.fruit.y + 190 },
      { x: map.zoneAreas.veg.x + map.zoneAreas.veg.w - 30, y: map.zoneAreas.veg.y + 210 },
      { x: map.zoneAreas.farm.x + 34, y: map.zoneAreas.farm.y + map.zoneAreas.farm.h - 36 },
      { x: map.room.w * 0.44, y: map.room.h - 66 },
    ]
    scene.add.existing(this)
  }

  updateScenery(time: number): void {
    this.art.clear()
    const t = time * 0.001
    this.drawButterfly(t, this.anchors[0], 0, 0xf2a8b4)
    this.drawButterfly(t, this.anchors[1], 1.7, 0xffd166)
    this.drawBee(t, this.anchors[2], 3.1)
    this.drawDragonfly(t, this.anchors[3], 4.4)
    this.fireflies.forEach((anchor, index) => {
      if (anchor === undefined) return
      const x = anchor.x + Math.sin(t * 0.7 + index * 1.9) * 16
      const y = anchor.y + Math.cos(t * 0.9 + index * 2.3) * 10
      drawFirefly(this.art, x, y, t * 2.4 + index * 1.3)
    })
  }

  private drawButterfly(time: number, anchor: Vec2, phase: number, color: number): void {
    if (anchor === undefined) return
    const x = anchor.x + Math.sin(time * 1.25 + phase) * 26
    const y = anchor.y + Math.cos(time * 0.9 + phase) * 15
    const flap = 0.55 + Math.abs(Math.sin(time * 8 + phase)) * 0.45
    this.art.fillStyle(0x1a120c, 0.12)
    this.art.fillEllipse(x, y + 7, 10, 3)
    this.art.fillStyle(color, 0.95)
    this.art.fillEllipse(x - 4 * flap, y - 2, 7 * flap, 5)
    this.art.fillEllipse(x + 4 * flap, y - 2, 7 * flap, 5)
    this.art.fillStyle(0x2b241d, 0.85)
    this.art.fillEllipse(x, y, 2, 6)
  }

  private drawBee(time: number, anchor: Vec2, phase: number): void {
    if (anchor === undefined) return
    const x = anchor.x + Math.sin(time * 0.95 + phase) * 22
    const y = anchor.y + Math.cos(time * 1.35 + phase) * 12
    this.art.fillStyle(0xffffff, 0.35)
    this.art.fillEllipse(x - 2, y - 4, 5, 4)
    this.art.fillEllipse(x + 2, y - 4, 5, 4)
    this.art.fillStyle(gameColors.sunbeam, 1)
    this.art.fillEllipse(x, y, 8, 5)
    this.art.lineStyle(1.4, 0x2b241d, 0.9)
    this.art.lineBetween(x - 2, y - 2, x - 2, y + 2)
    this.art.lineBetween(x + 2, y - 2, x + 2, y + 2)
  }

  private drawDragonfly(time: number, anchor: Vec2, phase: number): void {
    if (anchor === undefined) return
    const x = anchor.x + Math.sin(time * 0.8 + phase) * 30
    const y = anchor.y + Math.cos(time * 1.1 + phase) * 10
    this.art.lineStyle(1.4, 0x4f8f9f, 0.7)
    this.art.lineBetween(x - 6, y - 3, x + 6, y + 3)
    this.art.fillStyle(gameColors.sky, 0.6)
    this.art.fillEllipse(x - 3, y - 4, 9, 4)
    this.art.fillEllipse(x + 3, y - 4, 9, 4)
  }
}

function drawFruitGround(
  g: Phaser.GameObjects.Graphics,
  map: ShopMap,
  area: { x: number; y: number; w: number; h: number },
): void {
  const patch = zonePatchPoints(area)
  fillPolygon(g, patch, 0x7fae63, 0.58)
  fillPolygon(g, patch, 0x9fd07f, 0.16)
  strokePolygon(g, patch, 0x5f9552, 0.38, 2)

  // Broad mowing bands suggest a tended orchard lawn.
  g.fillStyle(0x5f9552, 0.1)
  for (let y = area.y + 32; y < area.y + area.h - 22; y += 42) {
    g.fillRect(area.x + 18, y, area.w - 36, 14)
  }

  const topBand = area.y + 54
  const bottomBand = area.y + area.h - 18
  for (let index = 0; index < 5; index += 1) {
    drawGrassTuft(g, area.x + 30 + (index * (area.w - 60)) / 4, topBand + (index % 2) * 5, 0.75)
  }
  for (let index = 0; index < 4; index += 1) {
    drawGrassTuft(g, area.x + 34 + (index * (area.w - 68)) / 3, bottomBand + (index % 2) * 4, 0.65)
  }

  const leftBed = map.plots[0]
  const rightBed = map.plots[1]
  if (leftBed !== undefined && rightBed !== undefined) {
    const between = (leftBed.x + rightBed.x) / 2
    for (const plot of map.plots) {
      drawGrassTuft(g, between - 4, plot.y + 12, 0.55)
      drawClover(g, between + 5, plot.y + 6, 0.65)
    }
  }

  drawFlowers(g, area.x + 18, area.y + 58, 3)
  drawFlowers(g, area.x + area.w - 36, area.y + area.h - 18, 3)
  drawPebbles(g, area.x + area.w - 24, area.y + 60, 2)
  drawFern(g, area.x + 20, area.y + area.h - 34, 1.1, 1)
  drawFern(g, area.x + area.w - 22, area.y + 46, 0.9, -1)
  drawMushroomCluster(g, area.x + area.w - 30, area.y + area.h - 30, 1)
  drawRock(g, area.x + 26, area.y + area.h - 62, 0.8)
  drawBeehive(g, area.x + 20, area.y + 82, 1)
  drawLeafLitter(g, area, 10, 31)
}

function drawVegGround(
  g: Phaser.GameObjects.Graphics,
  area: { x: number; y: number; w: number; h: number },
): void {
  const patch = zonePatchPoints(area)
  fillPolygon(g, patch, 0x5f4028, 0.58)
  fillPolygon(g, patch, 0x6f4b2e, 0.2)
  strokePolygon(g, patch, 0x3f2819, 0.38, 2)

  // Long furrow bands make the plot read as a field rather than a row of pads.
  g.lineStyle(2, 0x3f2819, 0.22)
  for (let y = area.y + 60; y < area.y + area.h - 12; y += 14) {
    g.lineBetween(area.x + 14, y, area.x + area.w - 14, y)
  }

  drawGrassTuft(g, area.x + 16, area.y + area.h - 16, 0.8)
  drawGrassTuft(g, area.x + area.w - 18, area.y + area.h - 15, 0.7)
  drawGrassTuft(g, area.x + 36, area.y + area.h - 14, 0.55)
  drawPebbles(g, area.x + area.w - 30, area.y + 58, 2)
  drawFern(g, area.x + 18, area.y + 86, 0.75, 1)
  drawRock(g, area.x + area.w - 24, area.y + area.h - 48, 0.7)
  drawLeafLitter(g, area, 8, 67)
  drawWateringCan(g, area.x + area.w - 30, area.y + 48)
  drawScarecrow(g, area.x + 20, area.y + 84, 1)
}

function drawFarmGround(
  g: Phaser.GameObjects.Graphics,
  map: ShopMap,
  area: { x: number; y: number; w: number; h: number },
): void {
  const patch = zonePatchPoints(area)
  fillPolygon(g, patch, 0xd9b25a, 0.24)
  fillPolygon(g, patch, 0x8fae63, 0.12)
  strokePolygon(g, patch, 0xb99a4a, 0.32, 2)

  for (const pen of Object.values(map.animalPens)) {
    drawGrassTuft(g, pen.x - PEN_SIZE.w / 2 - 2, pen.y + PEN_SIZE.h / 2 + 6, 0.75)
    drawGrassTuft(g, pen.x + PEN_SIZE.w / 2 + 2, pen.y + PEN_SIZE.h / 2 + 6, 0.75)
  }

  // Hay bale in the open farm corner.
  const hay = { x: area.x + area.w - 24, y: area.y + area.h - 30 }
  g.fillStyle(0x1a120c, 0.12)
  g.fillEllipse(hay.x, hay.y + 8, 22, 6)
  g.fillStyle(gameColors.straw, 1)
  g.fillRoundedRect(hay.x - 11, hay.y - 4, 22, 12, 4)
  g.fillStyle(gameColors.hay, 1)
  g.fillRoundedRect(hay.x - 9, hay.y - 2, 18, 5, 2)
  g.lineStyle(1, 0xb98a3c, 0.7)
  g.lineBetween(hay.x - 6, hay.y - 3, hay.x - 6, hay.y + 7)
  g.lineBetween(hay.x + 1, hay.y - 3, hay.x + 1, hay.y + 7)
  g.lineBetween(hay.x + 7, hay.y - 3, hay.x + 7, hay.y + 7)

  // Keep the well in the clearing between the two pen rows instead of on the
  // centreline of the whole zone, which moves when the floor plan grows.
  const penRows = map.animalPens.map((pen) => pen.y)
  const wellY =
    penRows.length > 0 ? (Math.min(...penRows) + Math.max(...penRows)) / 2 : area.y + area.h / 2
  drawWell(g, area.x + area.w / 2, wellY, 0.75)
  drawFern(g, area.x + 22, area.y + area.h - 42, 1.05, 1)
  drawFern(g, area.x + area.w - 26, area.y + 54, 0.85, -1)
  drawMushroomCluster(g, area.x + 30, area.y + area.h - 62, 0.9)
  drawRock(g, area.x + area.w - 34, area.y + area.h - 74, 0.85)
  drawBarrel(g, area.x + 22, area.y + area.h - 78, 0.8)
  drawLeafLitter(g, area, 9, 97)
}

function drawKitchenGround(
  g: Phaser.GameObjects.Graphics,
  map: ShopMap,
  area: { x: number; y: number; w: number; h: number },
): void {
  const patch = zonePatchPoints(area)
  fillPolygon(g, patch, gameColors.stone, 0.28)
  fillPolygon(g, patch, 0xb8bec2, 0.12)
  strokePolygon(g, patch, gameColors.stoneDark, 0.4, 2)

  g.lineStyle(1, gameColors.stoneDark, 0.28)
  for (let x = area.x + 12; x < area.x + area.w - 8; x += 34) {
    g.lineBetween(x, area.y + 10, x, area.y + area.h - 10)
  }
  for (let y = area.y + 16; y < area.y + area.h - 8; y += 30) {
    g.lineBetween(area.x + 10, y, area.x + area.w - 10, y)
  }
  for (const station of Object.values(map.stationSlots)) {
    drawPebbles(g, station.x + STATION_SIZE.w / 2 + 4, station.y + 18, 2)
  }
  drawFlowers(g, area.x + 18, area.y + 18, 2, 0xbfe8ef)
  drawFern(g, area.x + 20, area.y + area.h - 30, 0.8, 1)
  drawRock(g, area.x + area.w - 26, area.y + area.h - 46, 0.75)
  drawLeafLitter(g, area, 6, 131)
  for (const x of [area.x + area.w * 0.3, area.x + area.w * 0.5, area.x + area.w * 0.7]) {
    drawHerbPot(g, x, area.y + area.h - 16, 0.7)
  }
  drawBarrel(g, area.x + 22, area.y + area.h - 34, 0.8)
}

function drawHerbPot(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
  g.fillStyle(0x1a120c, 0.14)
  g.fillEllipse(x, y + 4 * scale, 16 * scale, 4 * scale)
  g.fillStyle(gameColors.woodDark, 1)
  g.fillRoundedRect(x - 6 * scale, y - 2 * scale, 12 * scale, 8 * scale, 2 * scale)
  g.fillStyle(gameColors.dirt, 1)
  g.fillEllipse(x, y - 2 * scale, 10 * scale, 3 * scale)
  g.fillStyle(gameColors.leafDark, 1)
  g.fillEllipse(x - 3 * scale, y - 7 * scale, 6 * scale, 3 * scale)
  g.fillEllipse(x + 3 * scale, y - 8 * scale, 6 * scale, 3 * scale)
  g.fillStyle(gameColors.leafLight, 1)
  g.fillEllipse(x, y - 10 * scale, 5 * scale, 2.5 * scale)
}

function drawGardenStrip(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  const y = map.room.h - 44
  g.fillStyle(gameColors.moss, 0.22)
  g.fillRoundedRect(34, y, map.room.w - 68, 22, 9)
  for (let x = 56; x < map.room.w - 50; x += 54) {
    if (Math.abs(x - map.doorPoint.x) < 58) continue
    drawGrassTuft(g, x, y + 14, 0.55 + (x % 3) * 0.08)
    if (x % 2 === 0) {
      drawFlower(g, x + 10, y + 8, FLOWER_COLORS[x % FLOWER_COLORS.length] ?? gameColors.leafLight)
    }
  }
  drawFern(g, 48, y + 8, 0.7, 1)
  drawFern(g, map.room.w - 48, y + 8, 0.7, -1)
}

function drawBenchProps(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  const cornerY = map.room.h - 76
  drawMushroomCluster(g, 52, cornerY, 0.85)
  drawPebbles(g, map.room.w - 48, cornerY, 3)
  drawRock(g, map.room.w - 62, cornerY + 12, 0.7)
  drawPottedTree(g, 54, map.room.h - 52, 0.9)
  drawPottedTree(g, map.room.w - 40, map.room.h - 52, 0.9)
  drawFern(g, 74, map.room.h - 44, 0.65, 1)
  drawFern(g, map.room.w - 62, map.room.h - 44, 0.65, -1)
  drawStump(g, 40, map.room.h - 120, 0.8)
  drawLog(g, map.room.w - 60, map.room.h - 140, 0.8)
}

function drawPottedTree(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
  g.fillStyle(0x1a120c, 0.12)
  g.fillEllipse(x, y + 14 * scale, 30 * scale, 8 * scale)
  g.fillStyle(gameColors.woodDark, 1)
  g.fillRoundedRect(x - 8 * scale, y - 2 * scale, 16 * scale, 16 * scale, 4 * scale)
  g.fillStyle(gameColors.woodLight, 1)
  g.fillEllipse(x, y - 2 * scale, 15 * scale, 6 * scale)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x - 2 * scale, y - 18 * scale, 4 * scale, 18 * scale, 1.5 * scale)
  const palettes = [
    {
      dark: gameColors.leafDark,
      mid: gameColors.moss,
      light: gameColors.leafLight,
      fruit: gameColors.berry,
    },
    { dark: 0x6f8f3a, mid: 0x8fae4a, light: 0xb8d070, fruit: 0xf0c94a },
    { dark: 0x7a3f52, mid: 0xa85a72, light: 0xd98aa2, fruit: 0x8f5aa8 },
    { dark: 0x3f7d6a, mid: 0x5f9e8a, light: 0x8fc9b0, fruit: 0x5f9ec9 },
  ] as const
  const palette = palettes[Math.abs(Math.round(x + y)) % palettes.length] ?? palettes[0]
  g.fillStyle(palette.dark, 1)
  g.fillCircle(x - 8 * scale, y - 20 * scale, 11 * scale)
  g.fillCircle(x + 8 * scale, y - 19 * scale, 12 * scale)
  g.fillStyle(palette.mid, 1)
  g.fillCircle(x, y - 29 * scale, 14 * scale)
  g.fillCircle(x - 9 * scale, y - 24 * scale, 9 * scale)
  g.fillStyle(palette.light, 0.85)
  g.fillCircle(x + 3 * scale, y - 33 * scale, 6 * scale)
  g.fillStyle(palette.fruit, 0.9)
  g.fillCircle(x - 8 * scale, y - 27 * scale, 2.2 * scale)
  g.fillCircle(x + 9 * scale, y - 24 * scale, 2 * scale)
}

function drawFlowers(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  count: number,
  color: number = gameColors.leafLight,
): void {
  for (let index = 0; index < count; index += 1) {
    const px = x + index * 9
    const py = y + (index % 2) * 4
    g.lineStyle(1.2, gameColors.leafDark, 0.55)
    g.lineBetween(px, py + 4, px, py)
    drawFlower(
      g,
      px,
      py - 2,
      index === 1 ? color : (FLOWER_COLORS[index % FLOWER_COLORS.length] ?? color),
    )
  }
}

function drawFlower(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
  g.fillStyle(color, 0.85)
  g.fillCircle(x - 2, y, 2)
  g.fillCircle(x + 2, y, 2)
  g.fillCircle(x, y - 2, 2)
  g.fillCircle(x, y + 2, 2)
  g.fillStyle(gameColors.sunbeam, 0.95)
  g.fillCircle(x, y, 1.2)
}

function drawPebbles(g: Phaser.GameObjects.Graphics, x: number, y: number, count: number): void {
  for (let index = 0; index < count; index += 1) {
    const px = x + index * 7
    const py = y + (index % 2) * 4
    g.fillStyle(gameColors.stoneDark, 0.38)
    g.fillEllipse(px, py, 6, 4)
    g.fillStyle(0xbfc4c8, 0.3)
    g.fillEllipse(px - 1, py - 1, 3, 2)
  }
}

function drawWateringCan(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x1a120c, 0.12)
  g.fillEllipse(x, y + 6, 16, 4)
  g.fillStyle(gameColors.mossDark, 1)
  g.fillRoundedRect(x - 7, y - 4, 12, 10, 3)
  g.fillStyle(gameColors.moss, 1)
  g.fillRoundedRect(x - 6, y - 3, 10, 6, 2)
  g.lineStyle(2, gameColors.mossDark, 1)
  g.lineBetween(x + 5, y, x + 11, y - 5)
  g.lineBetween(x + 11, y - 5, x + 12, y - 1)
  g.lineStyle(1.6, gameColors.mossDark, 1)
  g.beginPath()
  g.arc(x - 1, y - 4, 5, Math.PI, Math.PI * 1.8)
  g.strokePath()
}

function drawLadybug(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x1a120c, 0.14)
  g.fillEllipse(x, y + 4, 12, 4)
  g.fillStyle(gameColors.berry, 0.9)
  g.fillEllipse(x, y, 9, 7)
  g.fillStyle(0x2b241d, 1)
  g.fillCircle(x - 2.5, y - 1, 1.4)
  g.fillCircle(x + 2.5, y + 1, 1.4)
  g.lineStyle(1, 0x2b241d, 0.8)
  g.lineBetween(x, y - 3, x, y + 3)
}

function drawSnail(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x1a120c, 0.12)
  g.fillEllipse(x, y + 5, 14, 4)
  g.fillStyle(gameColors.hay, 0.95)
  g.fillEllipse(x + 1, y + 2, 11, 6)
  g.fillStyle(gameColors.bark, 1)
  g.fillCircle(x, y, 5)
  g.lineStyle(1, gameColors.barkDark, 0.8)
  g.beginPath()
  g.arc(x, y, 2.8, 0.2, 4.4)
  g.strokePath()
  g.lineStyle(1, gameColors.barkDark, 0.8)
  g.lineBetween(x + 5, y + 2, x + 7, y - 2)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillCircle(x + 7, y - 3, 1)
}
