import Phaser from 'phaser'
import { PEN_SIZE, STATION_SIZE, ZONE_ORDER } from '../logic/config'
import type { ShopMap, Vec2 } from '../logic/types'
import { drawClover, drawGrassTuft } from './groundArt'

const GRASS = 0x7fb069
const GRASS_DARK = 0x3f8454
const GRASS_LIGHT = 0x8cd08b
const FLOWER_COLORS = [0xf2a8b4, 0xffd166, 0xbfe8ef, 0xe9b7a3] as const

/**
 * Decorative terrain inside the shop. Everything is drawn with Phaser
 * Graphics, stays behind actors and never changes collision or interaction
 * footprints. The aim is a farm-market feel: grass and soil around the beds, a
 * stone kitchen corner and a small garden strip along the bottom wall.
 */
export function drawIndoorScenery(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  for (const zone of ZONE_ORDER) {
    const area = map.zoneAreas[zone]
    if (zone === 'fruit') drawFruitGround(g, map, area)
    else if (zone === 'veg') drawVegGround(g, area)
    else if (zone === 'farm') drawFarmGround(g, map, area)
    else drawKitchenGround(g, map, area)
  }

  drawGardenStrip(g, map)
  drawBenchProps(g, map)

  // A few tiny residents make the floor feel alive without competing with the
  // real animals in their pens.
  const ladybug = { x: map.room.w * 0.17, y: map.room.h * 0.78 }
  drawLadybug(g, ladybug.x, ladybug.y)
  const snail = { x: map.room.w * 0.82, y: map.room.h * 0.72 }
  drawSnail(g, snail.x, snail.y)
}

/**
 * Animated butterflies and a dragonfly. One graphics object is cleared and
 * redrawn per frame; positions follow deterministic sine paths, so no RNG or
 * simulation state is involved.
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

  updateScenery(time: number): void {
    this.art.clear()
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
    this.art.fillStyle(0x3b2f3a, 0.12)
    this.art.fillEllipse(x, y + 7, 10, 3)
    this.art.fillStyle(color, 0.95)
    this.art.fillEllipse(x - 4 * flap, y - 2, 7 * flap, 5)
    this.art.fillEllipse(x + 4 * flap, y - 2, 7 * flap, 5)
    this.art.fillStyle(0x3b2f3a, 0.85)
    this.art.fillEllipse(x, y, 2, 6)
  }

  private drawBee(time: number, anchor: Vec2, phase: number): void {
    if (anchor === undefined) return
    const x = anchor.x + Math.sin(time * 0.95 + phase) * 22
    const y = anchor.y + Math.cos(time * 1.35 + phase) * 12
    this.art.fillStyle(0xffffff, 0.35)
    this.art.fillEllipse(x - 2, y - 4, 5, 4)
    this.art.fillEllipse(x + 2, y - 4, 5, 4)
    this.art.fillStyle(0xffd166, 1)
    this.art.fillEllipse(x, y, 8, 5)
    this.art.lineStyle(1.4, 0x3b2f3a, 0.9)
    this.art.lineBetween(x - 2, y - 2, x - 2, y + 2)
    this.art.lineBetween(x + 2, y - 2, x + 2, y + 2)
  }

  private drawDragonfly(time: number, anchor: Vec2, phase: number): void {
    if (anchor === undefined) return
    const x = anchor.x + Math.sin(time * 0.8 + phase) * 30
    const y = anchor.y + Math.cos(time * 1.1 + phase) * 10
    this.art.lineStyle(1.4, 0x4f8f9f, 0.7)
    this.art.lineBetween(x - 6, y - 3, x + 6, y + 3)
    this.art.fillStyle(0xbfe8ef, 0.55)
    this.art.fillEllipse(x - 3, y - 4, 9, 4)
    this.art.fillEllipse(x + 3, y - 4, 9, 4)
  }
}

function drawFruitGround(
  g: Phaser.GameObjects.Graphics,
  map: ShopMap,
  area: { x: number; y: number; w: number; h: number },
): void {
  const left = area.x + 6
  const top = area.y + 6
  const width = area.w - 12
  const height = area.h - 12

  // A proper lawn, not a green wash over the wooden floor.
  g.fillStyle(0x7fae63, 0.5)
  g.fillRoundedRect(left, top, width, height, 18)
  g.fillStyle(0x9fd07f, 0.26)
  g.fillRoundedRect(left + 8, top + 8, width - 16, height - 16, 14)
  g.lineStyle(2, 0x5f9552, 0.32)
  g.strokeRoundedRect(left, top, width, height, 18)

  // Broad mowing bands suggest a tended orchard lawn.
  g.fillStyle(0x5f9552, 0.1)
  for (let y = top + 22; y < top + height - 20; y += 42) {
    g.fillRect(left + 12, y, width - 24, 14)
  }

  // Grass lives in the strips clear of the rectangular seedbeds.
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
}

function drawVegGround(
  g: Phaser.GameObjects.Graphics,
  area: { x: number; y: number; w: number; h: number },
): void {
  const left = area.x + 6
  const top = area.y + 6
  const width = area.w - 12
  const height = area.h - 12

  // Deep tilled earth over the whole vegetable field; the individual beds are
  // drawn on top by PlantBedView so empty and planted rows stay in sync.
  g.fillStyle(0x5f4028, 0.44)
  g.fillRoundedRect(left, top, width, height, 14)
  g.fillStyle(0x6f4b2e, 0.18)
  g.fillRoundedRect(left + 6, top + 6, width - 12, height - 12, 10)
  g.lineStyle(2, 0x3f2819, 0.3)
  g.strokeRoundedRect(left, top, width, height, 14)

  // Long furrow bands make the plot read as a field rather than a row of pads.
  g.lineStyle(2, 0x3f2819, 0.2)
  for (let y = area.y + 60; y < area.y + area.h - 12; y += 14) {
    g.lineBetween(area.x + 14, y, area.x + area.w - 14, y)
  }

  // Grass is deliberately sparse here: a few tufts at the outer corners only.
  drawGrassTuft(g, area.x + 16, area.y + area.h - 16, 0.8)
  drawGrassTuft(g, area.x + area.w - 18, area.y + area.h - 15, 0.7)
  drawGrassTuft(g, area.x + 36, area.y + area.h - 14, 0.55)
  drawPebbles(g, area.x + area.w - 30, area.y + 58, 2)
}

function drawFarmGround(
  g: Phaser.GameObjects.Graphics,
  map: ShopMap,
  area: { x: number; y: number; w: number; h: number },
): void {
  g.fillStyle(0xe0c080, 0.22)
  g.fillRoundedRect(area.x + 6, area.y + 6, area.w - 12, area.h - 12, 16)
  g.fillStyle(GRASS, 0.1)
  g.fillRoundedRect(area.x + 14, area.y + 14, area.w - 28, area.h - 28, 12)
  for (const pen of Object.values(map.animalPens)) {
    drawGrassTuft(g, pen.x - PEN_SIZE.w / 2 - 2, pen.y + PEN_SIZE.h / 2 + 6, 0.75)
    drawGrassTuft(g, pen.x + PEN_SIZE.w / 2 + 2, pen.y + PEN_SIZE.h / 2 + 6, 0.75)
  }
  // Hay bale in the open farm corner.
  const hay = { x: area.x + area.w - 24, y: area.y + area.h - 30 }
  g.fillStyle(0x3b2f3a, 0.1)
  g.fillEllipse(hay.x, hay.y + 8, 22, 6)
  g.fillStyle(0xd9b25a, 1)
  g.fillRoundedRect(hay.x - 11, hay.y - 4, 22, 12, 4)
  g.fillStyle(0xf0d08a, 1)
  g.fillRoundedRect(hay.x - 9, hay.y - 2, 18, 5, 2)
  g.lineStyle(1, 0xb98a3c, 0.7)
  g.lineBetween(hay.x - 6, hay.y - 3, hay.x - 6, hay.y + 7)
  g.lineBetween(hay.x + 1, hay.y - 3, hay.x + 1, hay.y + 7)
  g.lineBetween(hay.x + 7, hay.y - 3, hay.x + 7, hay.y + 7)
}

function drawKitchenGround(
  g: Phaser.GameObjects.Graphics,
  map: ShopMap,
  area: { x: number; y: number; w: number; h: number },
): void {
  g.fillStyle(0x8a9098, 0.2)
  g.fillRoundedRect(area.x + 6, area.y + 6, area.w - 12, area.h - 12, 16)
  g.lineStyle(1, 0x6f757c, 0.28)
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
}

function drawGardenStrip(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  const y = map.room.h - 44
  g.fillStyle(GRASS, 0.24)
  g.fillRoundedRect(34, y, map.room.w - 68, 22, 9)
  for (let x = 56; x < map.room.w - 50; x += 54) {
    if (Math.abs(x - map.doorPoint.x) < 58) continue
    drawGrassTuft(g, x, y + 14, 0.55 + (x % 3) * 0.08)
    if (x % 2 === 0)
      drawFlower(g, x + 10, y + 8, FLOWER_COLORS[x % FLOWER_COLORS.length] ?? GRASS_LIGHT)
  }
}

function drawBenchProps(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  // Tiny mushroom and pebble clusters in the open corners.
  const cornerY = map.room.h - 76
  drawMushroom(g, 42, cornerY, 0.85)
  drawMushroom(g, 56, cornerY + 6, 0.6)
  drawPebbles(g, map.room.w - 48, cornerY, 3)
  drawPottedTree(g, 54, map.room.h - 52, 0.9)
  drawPottedTree(g, map.room.w - 40, map.room.h - 52, 0.9)
}

function drawPottedTree(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
  g.fillStyle(0x3b2f3a, 0.12)
  g.fillEllipse(x, y + 14 * scale, 30 * scale, 8 * scale)
  g.fillStyle(0x8f5734, 1)
  g.fillRoundedRect(x - 8 * scale, y - 2 * scale, 16 * scale, 16 * scale, 4 * scale)
  g.fillStyle(0x9c6b42, 1)
  g.fillEllipse(x, y - 2 * scale, 15 * scale, 6 * scale)
  g.fillStyle(0x6f4b2e, 1)
  g.fillRoundedRect(x - 2 * scale, y - 18 * scale, 4 * scale, 18 * scale, 1.5 * scale)
  g.fillStyle(0x3f8454, 1)
  g.fillCircle(x - 8 * scale, y - 20 * scale, 11 * scale)
  g.fillCircle(x + 8 * scale, y - 19 * scale, 12 * scale)
  g.fillStyle(0x5aa96f, 1)
  g.fillCircle(x, y - 29 * scale, 14 * scale)
  g.fillCircle(x - 9 * scale, y - 24 * scale, 9 * scale)
  g.fillStyle(0x8cd08b, 0.8)
  g.fillCircle(x + 3 * scale, y - 33 * scale, 6 * scale)
  g.fillStyle(0xe25d5d, 0.9)
  g.fillCircle(x - 8 * scale, y - 27 * scale, 2.2 * scale)
  g.fillCircle(x + 9 * scale, y - 24 * scale, 2 * scale)
}

function drawFlowers(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  count: number,
  color = GRASS_LIGHT,
): void {
  for (let index = 0; index < count; index += 1) {
    const px = x + index * 9
    const py = y + (index % 2) * 4
    g.lineStyle(1.2, GRASS_DARK, 0.55)
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
  g.fillStyle(0xffd166, 0.95)
  g.fillCircle(x, y, 1.2)
}

function drawPebbles(g: Phaser.GameObjects.Graphics, x: number, y: number, count: number): void {
  for (let index = 0; index < count; index += 1) {
    const px = x + index * 7
    const py = y + (index % 2) * 4
    g.fillStyle(0x8a9098, 0.35)
    g.fillEllipse(px, py, 6, 4)
    g.fillStyle(0xbfc4c8, 0.3)
    g.fillEllipse(px - 1, py - 1, 3, 2)
  }
}

function drawMushroom(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
  g.fillStyle(0xfff3dd, 1)
  g.fillRoundedRect(x - 1.4 * scale, y, 2.8 * scale, 7 * scale, 1.2 * scale)
  g.fillStyle(0xe25d5d, 0.85)
  g.fillEllipse(x, y, 9 * scale, 5 * scale)
  g.fillStyle(0xffffff, 0.8)
  g.fillCircle(x - 2 * scale, y - 1 * scale, 1.1 * scale)
  g.fillCircle(x + 2 * scale, y - 1 * scale, 1 * scale)
}

function drawLadybug(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x3b2f3a, 0.14)
  g.fillEllipse(x, y + 4, 12, 4)
  g.fillStyle(0xe25d5d, 0.9)
  g.fillEllipse(x, y, 9, 7)
  g.fillStyle(0x3b2f3a, 1)
  g.fillCircle(x - 2.5, y - 1, 1.4)
  g.fillCircle(x + 2.5, y + 1, 1.4)
  g.lineStyle(1, 0x3b2f3a, 0.8)
  g.lineBetween(x, y - 3, x, y + 3)
}

function drawSnail(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x3b2f3a, 0.12)
  g.fillEllipse(x, y + 5, 14, 4)
  g.fillStyle(0xd9b25a, 0.9)
  g.fillEllipse(x + 1, y + 2, 11, 6)
  g.fillStyle(0xb87545, 1)
  g.fillCircle(x, y, 5)
  g.lineStyle(1, 0x8f5734, 0.8)
  g.beginPath()
  g.arc(x, y, 2.8, 0.2, 4.4)
  g.strokePath()
  g.lineStyle(1, 0x8f5734, 0.8)
  g.lineBetween(x + 5, y + 2, x + 7, y - 2)
  g.fillStyle(0x8f5734, 1)
  g.fillCircle(x + 7, y - 3, 1)
}
