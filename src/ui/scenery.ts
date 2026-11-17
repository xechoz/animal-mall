import Phaser from 'phaser'
import { gameColors } from '../colors'
import { PEN_SIZE, STATION_SIZE, ZONE_ORDER } from '../logic/config'
import type { ShopMap, Vec2 } from '../logic/types'
import {
  drawAntTrail,
  drawBarrel,
  drawBeehive,
  drawFern,
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
    else drawFactoryGround(g, map, area)
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
 * Animated daytime butterflies, a bee and a dragonfly. One graphics object is
 * cleared and redrawn per frame; positions follow deterministic sine paths, so
 * no RNG or simulation state is involved.
 */
export class SceneryView extends Phaser.GameObjects.Container {
  private readonly art: Phaser.GameObjects.Graphics
  private readonly anchors: readonly Vec2[]

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
    scene.add.existing(this)
  }

  updateScenery(time: number, night: boolean): void {
    this.art.clear()
    // NightLife draws the glowing fireflies above the darkness layer, and the
    // daytime insects are gone after dark.
    if (night) return
    const t = time * 0.001
    this.drawButterfly(t, this.anchors[0], 0, 0xf2a8b4)
    this.drawButterfly(t, this.anchors[1], 1.7, 0xffd166)
    this.drawBee(t, this.anchors[2], 3.1)
    this.drawDragonfly(t, this.anchors[3], 4.4)
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
  // Layered, low-contrast lawn: the zone still has to lose to the goods and the
  // characters, but it now has a light centre and a shaded rim instead of one
  // flat green polygon.
  fillPolygon(g, patch, 0x7fae63, 0.52)
  g.fillStyle(0xa6d489, 0.1)
  g.fillEllipse(area.x + area.w * 0.46, area.y + area.h * 0.42, area.w * 0.72, area.h * 0.52)
  fillPolygon(g, patch, 0x5f9552, 0.1)
  strokePolygon(g, patch, 0x5f9552, 0.22, 1.5)

  // Broad mowing bands suggest a tended orchard lawn.
  g.fillStyle(0x5f9552, 0.09)
  for (let y = area.y + 32; y < area.y + area.h - 22; y += 42) {
    g.fillRect(area.x + 18, y, area.w - 36, 14)
    g.lineStyle(1, 0x4f8a52, 0.12)
    g.lineBetween(area.x + 20, y + 14, area.x + area.w - 20, y + 14)
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
  drawCrate(g, area.x + area.w - 34, area.y + area.h - 14, 0.82, 'apple')
  drawSack(g, area.x + 30, area.y + area.h - 96, 0.85)
  drawPatchEdge(g, area, 'fruit')
}

function drawVegGround(
  g: Phaser.GameObjects.Graphics,
  area: { x: number; y: number; w: number; h: number },
): void {
  const patch = zonePatchPoints(area)
  // Lighter, warmer soil than the old near-black patch; the furrows and clods
  // carry the texture so the zone does not read as a tinted UI card.
  fillPolygon(g, patch, 0x6a4a30, 0.62)
  g.fillStyle(0x8a5f3d, 0.1)
  g.fillEllipse(area.x + area.w * 0.5, area.y + area.h * 0.46, area.w * 0.74, area.h * 0.5)
  fillPolygon(g, patch, 0x3f2819, 0.08)
  strokePolygon(g, patch, 0x3f2819, 0.22, 1.5)

  // Long furrow bands make the plot read as a field rather than a row of pads.
  for (let y = area.y + 60; y < area.y + area.h - 12; y += 16) {
    g.lineStyle(1, 0x8a5f3d, 0.2)
    g.lineBetween(area.x + 14, y - 2, area.x + area.w - 14, y - 2)
    g.lineStyle(1.5, 0x3f2819, 0.24)
    g.lineBetween(area.x + 14, y + 1, area.x + area.w - 14, y + 1)
    for (let index = 0; index < 3; index += 1) {
      const px = area.x + 24 + ((index * 67 + y * 3) % Math.max(1, area.w - 48))
      g.fillStyle(index % 2 === 0 ? 0x8a5f3d : 0x3f2819, 0.35)
      g.fillEllipse(px, y + 2, 3.2, 1.6)
    }
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
  drawCrate(g, area.x + area.w - 34, area.y + area.h - 10, 0.8, 'veg')
  drawSack(g, area.x + area.w - 26, area.y + 78, 0.8)
  drawPatchEdge(g, area, 'veg')
}

function drawFarmGround(
  g: Phaser.GameObjects.Graphics,
  map: ShopMap,
  area: { x: number; y: number; w: number; h: number },
): void {
  const patch = zonePatchPoints(area)
  fillPolygon(g, patch, 0xd9b25a, 0.24)
  g.fillStyle(0xf0d08a, 0.08)
  g.fillEllipse(area.x + area.w * 0.5, area.y + area.h * 0.48, area.w * 0.72, area.h * 0.54)
  fillPolygon(g, patch, 0x8fae63, 0.14)
  strokePolygon(g, patch, 0xb99a4a, 0.22, 1.5)

  // Straw and worn dirt between the pens; the pens themselves get their own
  // decor from the installed animal.
  for (let index = 0; index < 18; index += 1) {
    const px = area.x + 22 + ((index * 61 + 17) % Math.max(1, area.w - 44))
    const py = area.y + 34 + ((index * 43 + 11) % Math.max(1, area.h - 68))
    if (index % 3 === 0) drawStrawTuft(g, px, py, 0.7)
    else {
      g.fillStyle(gameColors.straw, 0.22)
      g.fillEllipse(px, py, 7, 2)
    }
  }
  for (const pen of Object.values(map.animalPens)) {
    g.fillStyle(0xc9a477, 0.1)
    g.fillEllipse(pen.x, pen.y + PEN_SIZE.h / 2 + 12, PEN_SIZE.w * 0.9, 16)
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
  drawBucket(g, area.x + 34, area.y + 64, 0.9)
  drawSack(g, area.x + area.w - 44, area.y + area.h - 104, 0.85)
  drawPatchEdge(g, area, 'farm')
}

function drawFactoryGround(
  g: Phaser.GameObjects.Graphics,
  map: ShopMap,
  area: { x: number; y: number; w: number; h: number },
): void {
  const patch = zonePatchPoints(area)
  fillPolygon(g, patch, gameColors.stone, 0.24)
  g.fillStyle(0xcfd5d9, 0.08)
  g.fillEllipse(area.x + area.w * 0.48, area.y + area.h * 0.46, area.w * 0.7, area.h * 0.5)
  fillPolygon(g, patch, gameColors.stoneDark, 0.08)
  strokePolygon(g, patch, gameColors.stoneDark, 0.26, 1.5)

  // Checker tiles with a thin grout: more like a scullery floor than a grid of
  // UI lines.
  const tileW = 34
  const tileH = 30
  let row = 0
  for (let y = area.y + 12; y < area.y + area.h - 8; y += tileH) {
    let column = 0
    for (let x = area.x + 12; x < area.x + area.w - 8; x += tileW) {
      if ((row + column) % 2 === 0) {
        g.fillStyle(0xb8bec2, 0.08)
        g.fillRect(x + 1, y + 1, tileW - 2, tileH - 2)
      }
      column += 1
    }
    row += 1
  }
  g.lineStyle(1, gameColors.stoneDark, 0.2)
  for (let x = area.x + 12; x < area.x + area.w - 8; x += tileW) {
    g.lineBetween(x, area.y + 10, x, area.y + area.h - 10)
  }
  for (let y = area.y + 16; y < area.y + area.h - 8; y += tileH) {
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
  drawBucket(g, area.x + 30, area.y + 58, 0.9)
  drawCrate(g, area.x + area.w - 30, area.y + area.h - 10, 0.78, 'jar')
  drawPatchEdge(g, area, 'factory')
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

/**
 * A low wooden crate. It is drawn from its base centre so every zone can drop
 * one against a patch edge without bookkeeping a bounding box. The top face is
 * foreshortened like the market shelves; a few goods sit on it.
 */
function drawCrate(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  kind: 'apple' | 'veg' | 'jar' = 'apple',
): void {
  const s = scale
  const w = 24 * s
  const d = 10 * s
  const h = 13 * s
  const frontTop = y - h
  g.fillStyle(0x1a120c, 0.14)
  g.fillEllipse(x, y + 2 * s, w * 1.05, 4.5 * s)

  const topFace = [
    { x: x - w / 2, y: frontTop },
    { x: x + w / 2, y: frontTop },
    { x: x + w / 2 - 4 * s, y: frontTop - d },
    { x: x - w / 2 + 4 * s, y: frontTop - d },
  ]
  fillPolygon(g, topFace, gameColors.woodLight, 1)
  g.lineStyle(1 * s, 0x6f4a2c, 0.4)
  g.lineBetween(x - w / 2 + 4 * s, frontTop - d * 0.5, x + w / 2 - 4 * s, frontTop - d * 0.5)

  g.fillStyle(gameColors.woodDark, 1)
  g.fillRoundedRect(x - w / 2, frontTop, w, h, 2 * s)
  g.fillStyle(gameColors.wood, 1)
  g.fillRoundedRect(x - w / 2 + 1.5 * s, frontTop + 1.5 * s, w - 3 * s, h - 3 * s, 1.5 * s)
  g.fillStyle(0x1a120c, 0.16)
  g.fillRoundedRect(x - w / 2 + 2 * s, y - 2.5 * s, w - 4 * s, 2.5 * s, 1 * s)
  g.lineStyle(1 * s, 0x6f4a2c, 0.55)
  for (let offset = -w / 2 + 5 * s; offset < w / 2 - 2 * s; offset += 5 * s) {
    g.lineBetween(x + offset, frontTop + 2 * s, x + offset, y - 2 * s)
  }
  g.fillStyle(0xfff3dd, 0.18)
  g.fillRoundedRect(x - w / 2 + 2 * s, frontTop + 1.5 * s, w - 4 * s, 1.5 * s, 0.75 * s)

  const goodsY = frontTop - d * 0.55
  if (kind === 'apple') {
    for (const [dx, dy] of [
      [-4, 0],
      [3, -1],
      [0, 2],
    ] as const) {
      g.fillStyle(gameColors.berry, 1)
      g.fillCircle(x + dx * s, goodsY + dy * s, 2.6 * s)
      g.fillStyle(0xfff3dd, 0.45)
      g.fillCircle(x + dx * s - 0.8 * s, goodsY + dy * s - 0.8 * s, 0.9 * s)
    }
    g.fillStyle(gameColors.leaf, 1)
    g.fillEllipse(x + 4 * s, goodsY - 3 * s, 4 * s, 2 * s)
  } else if (kind === 'veg') {
    for (const [dx, dy] of [
      [-4, 0],
      [2, -1],
      [4, 2],
    ] as const) {
      g.fillStyle(gameColors.leafDark, 1)
      g.fillEllipse(x + dx * s, goodsY + dy * s, 7 * s, 4 * s)
      g.fillStyle(gameColors.leafLight, 0.65)
      g.fillEllipse(x + dx * s - 1 * s, goodsY + dy * s - 1 * s, 4 * s, 2 * s)
    }
  } else {
    for (const dx of [-5, 3]) {
      g.fillStyle(0xdce8df, 1)
      g.fillRoundedRect(x + dx * s, goodsY - 3 * s, 5 * s, 7 * s, 1.5 * s)
      g.fillStyle(0x8f6b45, 1)
      g.fillRect(x + dx * s, goodsY - 3 * s, 5 * s, 1.5 * s)
    }
  }
}

/** A tied burlap sack, used as a ground prop beside the fields. */
function drawSack(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
  const s = scale
  const w = 18 * s
  const h = 22 * s
  g.fillStyle(0x1a120c, 0.13)
  g.fillEllipse(x, y + 2 * s, w * 0.95, 4.5 * s)
  g.fillStyle(0xb08a5e, 1)
  g.fillEllipse(x, y - h * 0.48, w, h * 0.8)
  g.fillStyle(0xd8b98c, 1)
  g.fillEllipse(x - 1 * s, y - h * 0.54, w * 0.72, h * 0.56)
  g.fillStyle(0x8f6b45, 1)
  g.fillRoundedRect(x - 3 * s, y - h - 1 * s, 6 * s, 6 * s, 2 * s)
  g.lineStyle(1.6 * s, 0x6f4a2c, 1)
  g.lineBetween(x - 4 * s, y - h + 2 * s, x + 4 * s, y - h + 2 * s)
  g.fillStyle(0xfff3dd, 0.5)
  g.fillRoundedRect(x - w * 0.24, y - h * 0.58, w * 0.48, h * 0.22, 2 * s)
  g.lineStyle(1 * s, 0x4f8f5f, 0.8)
  g.lineBetween(x, y - h * 0.5, x, y - h * 0.36)
  g.fillStyle(gameColors.leaf, 0.9)
  g.fillEllipse(x - 2 * s, y - h * 0.5, 4 * s, 2 * s)
}

/** A small metal bucket; cheaper than a barrel and reads clearly at a glance. */
function drawBucket(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
  const s = scale
  const w = 14 * s
  const h = 13 * s
  g.fillStyle(0x1a120c, 0.13)
  g.fillEllipse(x, y + 2 * s, w * 0.9, 4 * s)
  const body = [
    { x: x - w / 2, y: y - h },
    { x: x + w / 2, y: y - h },
    { x: x + w / 2 - 2 * s, y },
    { x: x - w / 2 + 2 * s, y },
  ]
  fillPolygon(g, body, gameColors.stoneDark, 1)
  fillPolygon(
    g,
    [
      { x: x - w / 2 + 3 * s, y: y - h + 2 * s },
      { x: x + w / 2 - 3 * s, y: y - h + 2 * s },
      { x: x + w / 2 - 4 * s, y: y - 2 * s },
      { x: x - w / 2 + 4 * s, y: y - 2 * s },
    ],
    gameColors.stone,
    0.9,
  )
  g.fillStyle(0xbfc4c8, 1)
  g.fillEllipse(x, y - h, w, 4 * s)
  g.fillStyle(0x6f757c, 1)
  g.fillEllipse(x, y - h + 0.5 * s, w * 0.8, 2.4 * s)
  g.lineStyle(1.4 * s, gameColors.stoneDark, 0.9)
  g.beginPath()
  g.arc(x, y - h, w * 0.42, Math.PI, Math.PI * 2)
  g.strokePath()
}

/** Short straw strokes, warmer and flatter than a green grass tuft. */
function drawStrawTuft(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
  const s = scale
  g.fillStyle(0x1a120c, 0.08)
  g.fillEllipse(x, y + 1 * s, 9 * s, 3 * s)
  g.lineStyle(1.1 * s, gameColors.hay, 0.85)
  for (const [dx, dy] of [
    [-3, -5],
    [0, -7],
    [3, -4],
    [4, -6],
  ] as const) {
    g.lineBetween(x, y, x + dx * s, y + dy * s)
  }
  g.fillStyle(gameColors.straw, 0.6)
  g.fillEllipse(x + 1 * s, y, 6 * s, 2 * s)
}

/**
 * Softens the hard polygon edge with the material of each zone: grass for the
 * orchard, small stones for the field and scullery, straw for the farm.
 */
function drawPatchEdge(
  g: Phaser.GameObjects.Graphics,
  area: { x: number; y: number; w: number; h: number },
  zone: 'fruit' | 'veg' | 'farm' | 'factory',
): void {
  const points = zonePatchPoints(area)
  for (let index = 0; index < points.length; index += 2) {
    const point = points[index]
    if (point === undefined) continue
    if (zone === 'fruit') {
      drawGrassTuft(g, point.x, point.y - 1, 0.32)
      if (index % 4 === 0) drawClover(g, point.x + 4, point.y - 3, 0.5)
    } else if (zone === 'farm') {
      drawStrawTuft(g, point.x, point.y, 0.65)
      if (index % 4 === 0) drawGrassTuft(g, point.x + 5, point.y - 1, 0.28)
    } else {
      g.fillStyle(gameColors.stoneDark, 0.24)
      g.fillEllipse(point.x, point.y, 7, 3)
      if (index % 4 === 0) drawGrassTuft(g, point.x + 5, point.y - 1, 0.28)
    }
  }
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
