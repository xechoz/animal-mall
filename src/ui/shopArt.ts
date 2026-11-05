import { displayTextStyle, type Theme } from '@mg/core'
import type Phaser from 'phaser'
import { gameColors } from '../colors'

import type { ShopMap } from '../logic/types'
import { bakeGraphics } from './bakeArt'
import { drawFloorLight, drawGroundShadows, drawHedgeTop, drawStageBase } from './dioramaArt'
import { drawRestMat } from './facilitiesArt'
import { fenceLanterns } from './fenceLanterns'
import {
  drawAntTrail,
  drawBird,
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
import { drawClover, drawGrassTuft } from './groundArt'
import { drawIndoorScenery } from './scenery'

export interface ShopBackgroundOptions {
  /**
   * Bake the static floor plan into a texture at this pixel scale. The map is
   * drawn once and never changes, so keeping it as a live Graphics would make
   * the renderer re-walk ~190k command entries on every frame.
   */
  readonly bake?: { readonly key: string; readonly scale: number }
}

export function createShopBackground(
  scene: Phaser.Scene,
  theme: Theme,
  title: string,
  map: ShopMap,
  options: ShopBackgroundOptions = {},
): Phaser.GameObjects.Container {
  return map.id === 'landscape'
    ? createLandscapeShopBackground(scene, theme, title, map, options)
    : createPortraitShopBackground(scene, theme, title, map, options)
}

function createPortraitShopBackground(
  scene: Phaser.Scene,
  theme: Theme,
  title: string,
  map: ShopMap,
  options: ShopBackgroundOptions,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0)
  const g = scene.add.graphics()
  container.add(g)
  const width = map.room.w

  drawOuterBand(g, map)
  drawFloor(g, map)
  drawAisles(g, map)
  drawIndoorScenery(g, map)
  drawGhostFacilities(g, map)
  drawTopBand(g, theme, title, width, container, scene, 1)
  drawGroundShadows(g, map)
  drawSideFences(g, map)
  drawFenceLanterns(g, map)
  drawCentralRug(g, 282, 506, 108, 52)
  drawQueueMarkers(g, map)
  drawDoorMat(g, map.doorPoint.x, map.doorPoint.y - 42)
  drawFloorLight(g, map)
  drawDappledLight(g, map)
  drawEdgeFoliage(g, map)
  bakeBackground(scene, container, g, map, options)

  return container
}

function createLandscapeShopBackground(
  scene: Phaser.Scene,
  theme: Theme,
  title: string,
  map: ShopMap,
  options: ShopBackgroundOptions,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0)
  const g = scene.add.graphics()
  container.add(g)
  const width = map.room.w

  drawOuterBand(g, map)
  drawFloor(g, map)
  drawAisles(g, map)
  drawIndoorScenery(g, map)
  drawGhostFacilities(g, map)
  drawRestMat(g, map.facilities.restMat)
  drawTopBand(g, theme, title, width, container, scene, 1.15)
  drawGroundShadows(g, map)
  drawSideFences(g, map)
  drawFenceLanterns(g, map)
  drawQueueMarkers(g, map)
  drawDoorMat(g, map.doorPoint.x, map.doorPoint.y - 42)
  drawFloorLight(g, map)
  drawDappledLight(g, map)
  drawEdgeFoliage(g, map)
  bakeBackground(scene, container, g, map, options)

  return container
}

/**
 * The floor plan never changes after the first draw, so the live Graphics is
 * replaced by a single textured quad. Without this the renderer re-walks the
 * whole command buffer (about 190k entries on the landscape map) every frame.
 */
function bakeBackground(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  graphics: Phaser.GameObjects.Graphics,
  map: ShopMap,
  options: ShopBackgroundOptions,
): void {
  const bake = options.bake
  if (bake === undefined) return
  const image = bakeGraphics(scene, graphics, bake.key, map.room.w, map.room.h, bake.scale)
  container.addAt(image, 0)
  container.remove(graphics)
  graphics.destroy()
}

function drawOuterBand(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  const { w, h } = map.room
  g.fillStyle(gameColors.canopy, 1)
  g.fillRect(0, 0, w, h)
  g.fillStyle(gameColors.pine, 0.8)
  g.fillRect(0, 0, w, 64)
  // The platform is drawn before the floor and wall, so its bands stay outside
  // the walkable rectangle and never change a collision footprint.
  drawStageBase(g, map)
}

function drawFloor(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  const floorLeft = 24
  const floorTop = 64
  const floorRight = map.room.w - 24
  const floorBottom = map.room.h - 24
  const floorWidth = floorRight - floorLeft
  // Slightly deeper than the old cream, so props and characters can carry the
  // highlights while the floor stays the quietest surface in the scene.
  g.fillStyle(0xdfc59a, 1)
  g.fillRect(floorLeft, floorTop, floorWidth, floorBottom - floorTop)

  for (let y = floorTop; y < floorBottom; y += 30) {
    const row = Math.floor((y - floorTop) / 30)
    const rowHeight = Math.min(30, floorBottom - y)
    const tone = row % 3 === 0 ? 0xe6cea3 : row % 3 === 1 ? 0xdcc094 : 0xe2c89c
    g.fillStyle(tone, 1)
    g.fillRect(floorLeft, y, floorWidth, rowHeight)
    g.lineStyle(1, 0xc9a874, 0.28)
    g.lineBetween(floorLeft, y, floorRight, y)
    const seam = row % 2 === 0 ? floorLeft : floorLeft + 100
    g.lineStyle(1, 0xbf9a66, 0.18)
    for (let x = seam; x < floorRight; x += 180) g.lineBetween(x, y, x, y + rowHeight)

    // A few short grain strokes per row break the mechanical grid without
    // adding enough contrast to compete with the goods.
    g.lineStyle(1, 0xb08a5e, 0.12)
    for (let index = 0; index < 3; index += 1) {
      const gx = floorLeft + ((row * 53 + index * 97) % Math.max(1, floorWidth - 30))
      const gy = y + 8 + index * 7
      g.lineBetween(gx, gy, gx + 16 + index * 11, gy)
    }

    if (row % 4 === 1) {
      const knotX = floorLeft + ((row * 137) % Math.max(1, floorWidth - 120)) + 60
      g.fillStyle(0xb08a5e, 0.22)
      g.fillEllipse(knotX, y + 15, 7, 3)
      g.lineStyle(1, 0xa37b4e, 0.18)
      g.strokeEllipse(knotX, y + 15, 13, 6)
    }
  }

  // Soft inner shadow and moss keep the floor from meeting the platform as a
  // flat seam. The shadow is cool and the moss warm, so the edge has depth.
  g.fillStyle(0x1a120c, 0.07)
  g.fillRect(floorLeft, floorTop, floorWidth, 12)
  g.fillRect(floorLeft, floorBottom - 12, floorWidth, 12)
  g.fillRect(floorLeft, floorTop, 12, floorBottom - floorTop)
  g.fillRect(floorRight - 12, floorTop, 12, floorBottom - floorTop)

  g.fillStyle(gameColors.moss, 0.13)
  g.fillRect(floorLeft, floorTop, 8, floorBottom - floorTop)
  g.fillRect(floorRight - 8, floorTop, 8, floorBottom - floorTop)
  g.fillRect(floorLeft, floorTop, floorWidth, 6)
  g.fillRect(floorLeft, floorBottom - 6, floorWidth, 6)
  g.fillStyle(gameColors.moss, 0.09)
  const floorHeight = floorBottom - floorTop
  g.fillEllipse(floorLeft + floorWidth * 0.3, floorTop + floorHeight * 0.58, 150, 46)
  g.fillEllipse(floorLeft + floorWidth * 0.72, floorTop + floorHeight * 0.8, 170, 50)
}

function drawAisles(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  for (const aisle of map.aisles) {
    const rect = aisle.rect
    drawDirtPath(g, rect.x, rect.y, rect.w, rect.h, aisle.vertical, Math.round(rect.x * 3 + rect.y))
  }

  const main = map.aisles.find((aisle) => aisle.vertical)
  if (main !== undefined) {
    const rect = main.rect
    drawLeafLitter(g, { x: rect.x - 4, y: rect.y + 12, w: rect.w + 8, h: rect.h - 24 }, 14, 41)
    drawAntTrail(g, rect.x + rect.w / 2, rect.y + rect.h * 0.72, 0.9)
  }

  const cross = map.aisles.find((aisle) => !aisle.vertical)
  if (cross !== undefined) {
    const rect = cross.rect
    drawLeafLitter(g, { x: rect.x + 4, y: rect.y - 4, w: rect.w - 8, h: rect.h + 8 }, 18, 83)
    drawAntTrail(g, rect.x + rect.w * 0.55, rect.y + rect.h / 2, 0.9)
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
  fillPolygon(g, points, 0xb98a58, 0.78)
  // A lighter, narrower centre band suggests packed earth worn by feet.
  fillPolygon(
    g,
    vertical
      ? points.map((point, index) =>
          index <= steps
            ? { x: point.x + width * 0.22, y: point.y }
            : { x: point.x - width * 0.22, y: point.y },
        )
      : points.map((point, index) =>
          index <= steps
            ? { x: point.x, y: point.y + height * 0.22 }
            : { x: point.x, y: point.y - height * 0.22 },
        ),
    0xc79b68,
    0.28,
  )
  strokePolygon(g, points, 0x6f4a2c, 0.26, 1.5)

  // Wheel ruts run along the path and fade before the ends.
  g.lineStyle(2, 0x8f643c, 0.14)
  if (vertical) {
    g.lineBetween(x + width * 0.32, y + 12, x + width * 0.32, y + height - 12)
    g.lineBetween(x + width * 0.68, y + 12, x + width * 0.68, y + height - 12)
  } else {
    g.lineBetween(x + 12, y + height * 0.32, x + width - 12, y + height * 0.32)
    g.lineBetween(x + 12, y + height * 0.68, x + width - 12, y + height * 0.68)
  }

  for (let index = 0; index < 14; index += 1) {
    const t = (index + 0.5) / 14
    const px = vertical ? x + 8 + ((index * 23 + seed) % Math.max(1, width - 16)) : x + width * t
    const py = vertical ? y + height * t : y + 9 + ((index * 17 + seed) % Math.max(1, height - 18))
    g.fillStyle(index % 2 === 0 ? gameColors.barkLight : gameColors.moss, 0.26)
    g.fillEllipse(px, py, 4, 1.8)
  }

  // Tufts hug the edge but stay outside the walking line, so the path reads
  // organic without suggesting a collision wall.
  for (let index = 0; index < 7; index += 1) {
    const t = (index + 0.5) / 7
    if (vertical) {
      drawGrassTuft(g, x - 5, y + height * t, 0.35)
      drawGrassTuft(g, x + width + 5, y + height * t, 0.32)
      if (index % 2 === 0) drawClover(g, x - 3, y + height * t + 5, 0.4)
    } else {
      drawGrassTuft(g, x + width * t, y - 4, 0.35)
      drawGrassTuft(g, x + width * t, y + height + 4, 0.32)
    }
  }

  const stoneCount = vertical ? 5 : 7
  for (let index = 0; index < stoneCount; index += 1) {
    const t = (index + 0.5) / stoneCount
    const cx = vertical ? x + width / 2 : x + width * t
    const cy = vertical ? y + height * t : y + height / 2
    g.fillStyle(0x1a120c, 0.08)
    g.fillEllipse(cx + 1, cy + 3, 24, 9)
    g.fillStyle(0xdcc6a0, 0.85)
    g.fillEllipse(cx, cy, 22, 8)
    g.fillStyle(0xf2e3c6, 0.55)
    g.fillEllipse(cx - 2, cy - 1, 14, 4)
  }
}

function drawGhostFacilities(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  // Pen floors stay plain; each installed animal adds its own small props in
  // ProducerView.ground. Only the kitchen work pads are part of the floor plan.
  for (const station of map.stationSlots) {
    // A shallow stone plinth instead of a painted round rect: the front face
    // and cast shadow give the work pad a little thickness.
    g.fillStyle(0x1a120c, 0.1)
    g.fillRoundedRect(station.x - 43, station.y - 24, 86, 62, 12)
    g.fillStyle(gameColors.stoneDark, 0.42)
    g.fillRoundedRect(station.x - 42, station.y - 30, 84, 62, 12)
    g.fillStyle(gameColors.stone, 0.3)
    g.fillRoundedRect(station.x - 42, station.y - 32, 84, 54, 11)
    g.fillStyle(0xbfc4c8, 0.2)
    g.fillRoundedRect(station.x - 36, station.y - 28, 72, 4, 2)
    g.lineStyle(1.5, gameColors.stoneDark, 0.32)
    g.strokeRoundedRect(station.x - 42, station.y - 32, 84, 64, 12)
    g.lineStyle(1, gameColors.stoneDark, 0.16)
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
  // A real back wall turns the top strip into a visible vertical plane. The
  // hedge sits above it and the shop sign hangs from the top rail, so the room
  // reads as a cutaway box instead of a fence drawn on a floor plan.
  const left = 24
  const right = width - 24
  const wallTop = 20
  const wallBase = 64
  const wallWidth = right - left

  drawHedgeTop(g, left, 0, wallWidth, 21)

  g.fillStyle(gameColors.barkDark, 1)
  g.fillRect(left, wallTop, wallWidth, wallBase - wallTop)

  const plankWidth = 38
  for (let x = left; x < right; x += plankWidth) {
    const index = Math.round((x - left) / plankWidth)
    const tone = index % 3 === 0 ? 0x84522f : index % 3 === 1 ? 0x7a4a29 : 0x8d5b36
    g.fillStyle(tone, 1)
    g.fillRect(x + 1, wallTop + 3, Math.min(plankWidth - 2, right - x - 1), wallBase - wallTop - 3)
    g.lineStyle(1, gameColors.barkDark, 0.55)
    g.lineBetween(x, wallTop + 3, x, wallBase)
    g.lineStyle(1, 0xb87a4a, 0.18)
    g.lineBetween(x + 3, wallTop + 6, x + 3, wallBase - 4)
    // Sparse vertical grain keeps the wall from reading as a flat brown band.
    if (index % 4 === 0) {
      g.lineStyle(1, 0x5a3a22, 0.28)
      const grainX = x + 12 + (index % 3) * 5
      g.lineBetween(grainX, wallTop + 10, grainX + 4, wallTop + 30)
      g.lineBetween(grainX + 4, wallTop + 30, grainX + 2, wallBase - 8)
    }
  }

  // Top rail and wainscot rail: two horizontal bands make the wall a built
  // object and give the sign and lanterns something to hang from.
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRect(left, wallTop, wallWidth, 5)
  g.fillStyle(0xa06a3d, 1)
  g.fillRect(left, wallTop + 1, wallWidth, 2)
  g.fillStyle(0x5a3a22, 1)
  g.fillRect(left, wallBase - 14, wallWidth, 14)
  g.fillStyle(0xc08a55, 0.85)
  g.fillRect(left, wallBase - 14, wallWidth, 2)
  g.fillStyle(0x3b2f3a, 0.2)
  g.fillRect(left, wallBase - 4, wallWidth, 4)

  const signWidth = 164 * scale
  const signHeight = 38 * scale
  const centerX = width / 2
  const signY = 20
  g.lineStyle(2, gameColors.barkDark, 0.8)
  g.lineBetween(centerX - signWidth / 2 + 18, 16, centerX - signWidth / 2 + 18, signY + 2)
  g.lineBetween(centerX + signWidth / 2 - 18, 16, centerX + signWidth / 2 - 18, signY + 2)
  g.fillStyle(0x1a120c, 0.24)
  g.fillRoundedRect(centerX - signWidth / 2 + 4, signY + 5, signWidth, signHeight, 12)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(centerX - signWidth / 2, signY, signWidth, signHeight, 12)
  g.fillStyle(gameColors.woodLight, 1)
  g.fillRoundedRect(centerX - signWidth / 2 + 5, signY + 4, signWidth - 10, signHeight - 12, 9)
  g.fillStyle(gameColors.hay, 0.55)
  g.fillRoundedRect(centerX - signWidth / 2 + 12, signY + 7, signWidth - 24, 2, 1)
  g.fillStyle(0x1a120c, 0.18)
  g.fillRoundedRect(centerX - signWidth / 2 + 8, signY + signHeight - 7, signWidth - 16, 3, 1.5)
  // Two iron pegs under the sign.
  g.fillStyle(0x3b2f3a, 0.75)
  g.fillCircle(centerX - signWidth / 2 + 22, signY + signHeight - 3, 2)
  g.fillCircle(centerX + signWidth / 2 - 22, signY + signHeight - 3, 2)
  container.add(
    scene.add
      .text(
        centerX,
        signY + signHeight / 2 - 3,
        title,
        displayTextStyle(theme, 20 * scale, '#fff7e8', true, 2, 2),
      )
      .setOrigin(0.5),
  )

  for (const x of [width * 0.15, width * 0.85]) {
    g.lineStyle(1.4, gameColors.barkDark, 0.8)
    g.lineBetween(x, wallTop + 2, x, 44)
    drawLantern(g, x, 52, 0.85)
  }
  drawBird(g, width * 0.31, 55, 0.9, 1)
  drawBird(g, width * 0.7, 55, 0.72, -1)

  // The wall casts a long, cool shade onto the boards behind the shelves.
  g.fillStyle(0x1a120c, 0.12)
  g.fillRect(left, wallBase, wallWidth, 10)
  g.fillStyle(0x1a120c, 0.06)
  g.fillRect(left, wallBase + 10, wallWidth, 12)
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

/**
 * Unlit lanterns on the perimeter fence. The glass stays dim in daylight; the
 * night layer overlays a lit pane and a soft pool at the same anchors.
 */
function drawFenceLanterns(g: Phaser.GameObjects.Graphics, map: ShopMap): void {
  for (const lamp of fenceLanterns(map)) {
    const s = lamp.scale
    g.lineStyle(1.5 * s, gameColors.barkDark, 0.8)
    if (lamp.facing === 'left') {
      g.lineBetween(lamp.x - 8 * s, lamp.y, lamp.x, lamp.y)
    } else if (lamp.facing === 'right') {
      g.lineBetween(lamp.x, lamp.y, lamp.x + 8 * s, lamp.y)
    } else {
      g.lineBetween(lamp.x, lamp.y + 8 * s, lamp.x, lamp.y + 16 * s)
    }

    g.fillStyle(gameColors.barkDark, 1)
    g.fillRoundedRect(lamp.x - 5 * s, lamp.y - 9 * s, 10 * s, 3 * s, 1 * s)
    g.fillStyle(0xe2cfa2, 0.55)
    g.fillRoundedRect(lamp.x - 4 * s, lamp.y - 6 * s, 8 * s, 11 * s, 2.5 * s)
    g.fillStyle(0xfff3c4, 0.22)
    g.fillRoundedRect(lamp.x - 2.4 * s, lamp.y - 4 * s, 2 * s, 6 * s, 1 * s)
    g.fillStyle(gameColors.barkDark, 1)
    g.fillRoundedRect(lamp.x - 5 * s, lamp.y + 5 * s, 10 * s, 2.5 * s, 1 * s)
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
