import type Phaser from 'phaser'
import { gameColors } from '../colors'
import { isFruitKind } from '../logic/config'
import type { PlantKind } from '../logic/types'
import { FRUIT_COLORS } from './fruitArt'

const TRUNK = 0x8f5734
const TRUNK_DARK = 0x6f4b2e
const TRUNK_LIGHT = 0xb87545
const LEAF = gameColors.leaf
const LEAF_DARK = gameColors.leafDark
const LEAF_LIGHT = gameColors.leafLight
const SHADOW = 0x3b2f3a

/** Each species gets its own foliage ramp instead of one green for all trees. */
const LEAF_PALETTES = {
  apple: { dark: 0x4f8f5f, base: 0x6fbf78, light: 0xa8e6a0 },
  pear: { dark: 0x7c9e45, base: 0x9dbf58, light: 0xc8df8a },
  peach: { dark: 0x5f9a66, base: 0x82bd7d, light: 0xb8e0a8 },
  cherry: { dark: 0x3f7258, base: 0x5c9a6e, light: 0x8cc48c },
  strawberry: { dark: 0x4f9458, base: 0x74c46a, light: 0xa9e58b },
  grape: { dark: 0x667f3f, base: 0x8aa654, light: 0xb8cc7a },
} as const

const YIELD_TINT: Readonly<Record<PlantKind, number>> = {
  apple: FRUIT_COLORS.apple,
  pear: FRUIT_COLORS.pear,
  peach: FRUIT_COLORS.peach,
  cherry: FRUIT_COLORS.cherry,
  strawberry: FRUIT_COLORS.strawberry,
  grape: FRUIT_COLORS.grape,
  carrot: 0xf08a3c,
  tomato: 0xe25d5d,
  corn: 0xf2c94c,
  pumpkin: 0xe07a2f,
  potato: 0xa9773f,
  eggplant: 0x7a4f9c,
}

type Slots = readonly (readonly [number, number])[]

const APPLE_SLOTS: Slots = [
  [-19, -51],
  [18, -53],
  [-3, -86],
]
const PEAR_SLOTS: Slots = [
  [-15, -57],
  [15, -59],
  [-2, -94],
]
const PEACH_SLOTS: Slots = [
  [-22, -49],
  [21, -52],
  [-2, -78],
  [21, -67],
]
const CHERRY_SLOTS: Slots = [
  [-19, -50],
  [18, -54],
  [-3, -84],
  [19, -70],
]
const STRAWBERRY_SLOTS: Slots = [
  [-21, -1],
  [-7, -4],
  [7, -1],
  [21, -3],
]
const GRAPE_SLOTS: Slots = [
  [-16, -40],
  [15, -38],
  [0, -58],
]
const CARROT_SLOTS: Slots = [
  [-17, -8],
  [0, -8],
  [17, -8],
]
const TOMATO_SLOTS: Slots = [
  [-15, -28],
  [14, -24],
  [0, -43],
]
const CORN_SLOTS: Slots = [
  [11, -48],
  [-11, -34],
  [11, -23],
]
const PUMPKIN_SLOTS: Slots = [
  [-15, -2],
  [15, -3],
]
const POTATO_SLOTS: Slots = [
  [-18, 1],
  [0, 2],
  [18, 1],
]
const EGGPLANT_SLOTS: Slots = [
  [-16, -24],
  [15, -28],
  [0, -46],
]

/** Growth scale for the whole crop, anchored at the soil line. */
export function plantGrowthScale(ratio: number): number {
  return 0.55 + Math.min(1, Math.max(0, ratio)) * 0.45
}

/**
 * Draws one crop at full size: the caller scales the graphics for growth so
 * every plant shares the same shape coordinates. Ripe produce is drawn as
 * single items, one per `ready` count, instead of a number badge.
 */
export function drawPlantCrop(
  g: Phaser.GameObjects.Graphics,
  product: PlantKind,
  ratio: number,
  mature: boolean,
  ready: number,
): void {
  if (!mature && ratio < 0.38) {
    drawSprout(g, product)
    return
  }
  if (isFruitKind(product)) drawFruitPlant(g, product, ready)
  else drawVegetable(g, product, ready)
}

function drawSprout(g: Phaser.GameObjects.Graphics, product: PlantKind): void {
  g.fillStyle(SHADOW, 0.12)
  g.fillEllipse(0, -2, 20, 6)
  g.fillStyle(TRUNK_DARK, 1)
  g.fillRoundedRect(-2, -20, 4, 20, 2)
  g.fillStyle(LEAF, 1)
  g.fillEllipse(-7, -20, 13, 8)
  g.fillEllipse(7, -24, 12, 7)
  g.fillStyle(LEAF_LIGHT, 1)
  g.fillEllipse(-8, -22, 7, 4)
  g.fillStyle(YIELD_TINT[product], 0.85)
  g.fillCircle(2, -28, 2.6)
}

function drawFruitPlant(g: Phaser.GameObjects.Graphics, product: PlantKind, ready: number): void {
  switch (product) {
    case 'apple':
      drawAppleTree(g, ready)
      break
    case 'pear':
      drawPearTree(g, ready)
      break
    case 'peach':
      drawPeachTree(g, ready)
      break
    case 'cherry':
      drawCherryTree(g, ready)
      break
    case 'strawberry':
      drawStrawberryBush(g, ready)
      break
    case 'grape':
      drawGrapeVine(g, ready)
      break
    default:
      drawAppleTree(g, ready)
  }
}

function drawVegetable(g: Phaser.GameObjects.Graphics, product: PlantKind, ready: number): void {
  switch (product) {
    case 'carrot':
      drawCarrots(g, ready)
      break
    case 'tomato':
      drawTomatoes(g, ready)
      break
    case 'corn':
      drawCorn(g, ready)
      break
    case 'pumpkin':
      drawPumpkins(g, ready)
      break
    case 'potato':
      drawPotatoes(g, ready)
      break
    case 'eggplant':
      drawEggplants(g, ready)
      break
    default:
      drawCarrots(g, ready)
  }
}

function drawAppleTree(g: Phaser.GameObjects.Graphics, ready: number): void {
  const leaf = LEAF_PALETTES.apple
  g.fillStyle(SHADOW, 0.13)
  g.fillEllipse(0, -3, 26, 8)
  drawTrunk(g, 50, 11)
  g.lineStyle(4, TRUNK, 1)
  g.lineBetween(0, -42, -14, -56)
  g.lineBetween(0, -46, 13, -58)

  blob(g, -17, -61, 18, 16, leaf.dark)
  blob(g, 17, -63, 17, 15, leaf.dark)
  blob(g, 0, -76, 23, 18, leaf.dark)
  blob(g, -17, -64, 14, 12, leaf.base)
  blob(g, 16, -66, 13, 11, leaf.base)
  blob(g, -1, -78, 18, 14, leaf.base)
  blob(g, -19, -72, 6, 5, leaf.light)
  blob(g, 8, -84, 6, 4, leaf.light)

  drawYield(g, ready, APPLE_SLOTS, drawApple)
}

function drawPearTree(g: Phaser.GameObjects.Graphics, ready: number): void {
  const leaf = LEAF_PALETTES.pear
  g.fillStyle(SHADOW, 0.13)
  g.fillEllipse(0, -3, 24, 7)
  drawTrunk(g, 56, 10)
  g.lineStyle(3.5, TRUNK, 1)
  g.lineBetween(0, -48, -11, -60)
  g.lineBetween(0, -44, 12, -58)

  // Upright teardrop crown, unlike the round apple canopy.
  blob(g, 0, -63, 18, 12, leaf.dark)
  blob(g, 0, -77, 15, 14, leaf.dark)
  blob(g, 0, -91, 10, 11, leaf.dark)
  blob(g, 0, -64, 14, 9, leaf.base)
  blob(g, 0, -78, 11, 11, leaf.base)
  blob(g, 0, -91, 7, 8, leaf.base)
  blob(g, -6, -85, 4, 5, leaf.light)
  blob(g, 5, -70, 3, 4, leaf.light)

  drawYield(g, ready, PEAR_SLOTS, drawPear)
}

function drawPeachTree(g: Phaser.GameObjects.Graphics, ready: number): void {
  const leaf = LEAF_PALETTES.peach
  g.fillStyle(SHADOW, 0.13)
  g.fillEllipse(0, -3, 30, 8)
  drawTrunk(g, 44, 12)
  g.lineStyle(4, TRUNK, 1)
  g.lineBetween(0, -36, -22, -50)
  g.lineBetween(0, -40, 22, -54)

  // Low, spreading crown, much wider and flatter than the apple tree.
  blob(g, -23, -57, 16, 11, leaf.dark)
  blob(g, 23, -59, 15, 11, leaf.dark)
  blob(g, 0, -65, 21, 13, leaf.dark)
  blob(g, -23, -60, 12, 8, leaf.base)
  blob(g, 22, -62, 11, 8, leaf.base)
  blob(g, 0, -67, 17, 10, leaf.base)
  blob(g, -25, -67, 5, 3, leaf.light)
  blob(g, 12, -72, 4, 3, leaf.light)

  drawYield(g, ready, PEACH_SLOTS, drawPeach)
}

function drawCherryTree(g: Phaser.GameObjects.Graphics, ready: number): void {
  const leaf = LEAF_PALETTES.cherry
  g.fillStyle(SHADOW, 0.13)
  g.fillEllipse(0, -3, 25, 7)
  drawTrunk(g, 56, 9)
  g.lineStyle(3, TRUNK, 1)
  g.lineBetween(0, -48, -16, -62)
  g.lineBetween(0, -44, 16, -58)
  g.lineBetween(-14, -58, -22, -52)
  g.lineBetween(14, -56, 22, -52)

  blob(g, -18, -63, 17, 14, leaf.dark)
  blob(g, 18, -65, 16, 13, leaf.dark)
  blob(g, 0, -75, 21, 16, leaf.dark)
  blob(g, -18, -66, 13, 11, leaf.base)
  blob(g, 17, -68, 12, 10, leaf.base)
  blob(g, -1, -77, 17, 13, leaf.base)
  blob(g, -20, -74, 5, 4, leaf.light)
  blob(g, 7, -83, 5, 4, leaf.light)

  drawYield(g, ready, CHERRY_SLOTS, drawCherryPair)
}

function drawStrawberryBush(g: Phaser.GameObjects.Graphics, ready: number): void {
  const leaf = LEAF_PALETTES.strawberry
  g.fillStyle(SHADOW, 0.12)
  g.fillEllipse(0, -2, 30, 7)
  for (const [x, y] of [
    [-20, -7],
    [-11, -12],
    [-1, -8],
    [9, -13],
    [20, -7],
  ]) {
    blob(g, x, y, 10, 6, leaf.dark)
    blob(g, x - 2, y - 2, 7, 4, leaf.base)
  }
  blob(g, -5, -18, 8, 5, leaf.light)
  blob(g, 13, -19, 7, 4, leaf.light)

  drawFlower(g, -14, -20)
  drawFlower(g, 7, -22)
  drawYield(g, ready, STRAWBERRY_SLOTS, drawStrawberry)
}

function drawGrapeVine(g: Phaser.GameObjects.Graphics, ready: number): void {
  const leafTone = LEAF_PALETTES.grape
  g.fillStyle(SHADOW, 0.12)
  g.fillEllipse(0, -2, 28, 7)
  g.fillStyle(TRUNK_DARK, 1)
  g.fillRoundedRect(-25, -58, 5, 58, 2)
  g.fillRoundedRect(20, -58, 5, 58, 2)
  g.fillStyle(TRUNK, 1)
  g.fillRoundedRect(-25, -60, 50, 5, 2)
  g.lineStyle(1, TRUNK_DARK, 0.5)
  g.lineBetween(-22, -49, 22, -49)

  g.lineStyle(4, 0x7a6238, 1)
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(2, -20)
  g.lineTo(-2, -36)
  g.lineTo(1, -52)
  g.strokePath()

  leaf(g, -15, -48, 22, 14, -0.45, leafTone.dark)
  leaf(g, 15, -45, 21, 13, 0.4, leafTone.dark)
  leaf(g, 0, -58, 17, 11, 0.1, leafTone.base)
  leaf(g, -13, -46, 14, 9, -0.5, leafTone.base)
  leaf(g, 14, -44, 13, 8, 0.45, leafTone.base)

  drawYield(g, ready, GRAPE_SLOTS, drawGrapeCluster)
}

function drawCarrots(g: Phaser.GameObjects.Graphics, ready: number): void {
  g.fillStyle(SHADOW, 0.1)
  g.fillEllipse(0, -3, 24, 6)
  blade(g, 0, -8, -23, -33, 5, LEAF)
  blade(g, 0, -8, -13, -42, 5, LEAF)
  blade(g, 0, -8, -2, -46, 5, LEAF)
  blade(g, 0, -8, 11, -42, 5, LEAF)
  blade(g, 0, -8, 22, -33, 5, LEAF)
  blade(g, -2, -10, -26, -27, 3, LEAF_LIGHT)
  blade(g, 3, -10, 20, -25, 3, LEAF_LIGHT)

  for (let index = 0; index < Math.min(ready, CARROT_SLOTS.length); index += 1) {
    const [x, y] = CARROT_SLOTS[index]
    g.fillStyle(0xf08a3c, 1)
    g.fillTriangle(x - 6, y, x + 6, y, x, y + 12)
    g.fillStyle(0xffb066, 1)
    g.fillTriangle(x - 3, y + 1, x + 1, y + 1, x, y + 8)
    g.lineStyle(1, 0xd9702a, 0.8)
    g.lineBetween(x - 4, y + 5, x + 3, y + 5)
    g.fillStyle(LEAF, 1)
    blade(g, x, y, x - 6, y - 13, 3.5, LEAF)
    blade(g, x, y, x + 5, y - 14, 3.5, LEAF)
  }
}

function drawTomatoes(g: Phaser.GameObjects.Graphics, ready: number): void {
  g.fillStyle(SHADOW, 0.1)
  g.fillEllipse(0, -3, 22, 6)
  g.fillStyle(TRUNK_LIGHT, 1)
  g.fillRoundedRect(7, -46, 3, 44, 1.5)
  g.fillStyle(LEAF_DARK, 1)
  g.fillRoundedRect(-3, -50, 6, 50, 3)
  g.fillStyle(LEAF, 1)
  g.fillRoundedRect(-2, -48, 3, 46, 1.5)
  leaf(g, -13, -39, 18, 11, -0.35, LEAF)
  leaf(g, 13, -35, 17, 10, 0.35, LEAF)
  leaf(g, -14, -25, 17, 10, -0.2, LEAF)
  leaf(g, 13, -20, 16, 9, 0.25, LEAF)
  blob(g, 0, -50, 9, 6, LEAF_DARK)
  blob(g, -1, -51, 6, 4, LEAF_LIGHT)

  drawYield(g, ready, TOMATO_SLOTS, drawTomato)
}

function drawCorn(g: Phaser.GameObjects.Graphics, ready: number): void {
  g.fillStyle(SHADOW, 0.1)
  g.fillEllipse(0, -3, 24, 6)
  g.fillStyle(LEAF_DARK, 1)
  g.fillRoundedRect(-5, -68, 10, 68, 4)
  g.fillStyle(LEAF, 1)
  g.fillRoundedRect(-3, -66, 5, 64, 2.5)
  g.fillStyle(LEAF_LIGHT, 0.75)
  g.fillRoundedRect(-2, -62, 2, 56, 1)

  blade(g, -4, -20, -24, -33, 7, LEAF)
  blade(g, 4, -29, 24, -40, 7, LEAF)
  blade(g, -4, -40, -22, -52, 6, LEAF)
  blade(g, 4, -49, 20, -58, 6, LEAF)
  blade(g, -3, -56, -12, -66, 5, LEAF)

  g.lineStyle(1.5, 0xd9b25a, 1)
  g.lineBetween(0, -68, -5, -78)
  g.lineBetween(0, -68, 0, -80)
  g.lineBetween(0, -68, 5, -78)

  for (let index = 0; index < Math.min(ready, CORN_SLOTS.length); index += 1) {
    const [x, y] = CORN_SLOTS[index]
    drawCornEar(g, x, y, x < 0 ? -0.35 : 0.3)
  }
}

function drawPumpkins(g: Phaser.GameObjects.Graphics, ready: number): void {
  g.fillStyle(SHADOW, 0.1)
  g.fillEllipse(0, -2, 30, 6)
  g.lineStyle(3, LEAF_DARK, 1)
  g.beginPath()
  g.moveTo(-24, -6)
  g.lineTo(-10, -9)
  g.lineTo(5, -5)
  g.lineTo(24, -8)
  g.strokePath()
  g.lineStyle(1.5, LEAF, 1)
  g.beginPath()
  g.arc(-20, -12, 5, 0.4, 3.6)
  g.strokePath()
  g.beginPath()
  g.arc(20, -13, 4, 0.6, 3.8)
  g.strokePath()
  leaf(g, -20, -16, 22, 14, -0.5, LEAF_DARK)
  leaf(g, 20, -18, 22, 14, 0.5, LEAF_DARK)
  leaf(g, -19, -18, 15, 9, -0.55, LEAF)
  leaf(g, 19, -20, 15, 9, 0.55, LEAF)

  for (let index = 0; index < Math.min(ready, PUMPKIN_SLOTS.length); index += 1) {
    const [x, y] = PUMPKIN_SLOTS[index]
    g.fillStyle(SHADOW, 0.16)
    g.fillEllipse(x + 1, y + 6, 26, 7)
    g.fillStyle(0xe07a2f, 1)
    g.fillEllipse(x, y, 26, 18)
    g.fillStyle(0xf39a4c, 1)
    g.fillEllipse(x, y - 1, 22, 15)
    g.lineStyle(1.2, 0xc96520, 0.6)
    g.beginPath()
    g.arc(x - 5, y, 6, -1.2, 1.2)
    g.strokePath()
    g.beginPath()
    g.arc(x + 5, y, 6, -1.2, 1.2)
    g.strokePath()
    g.fillStyle(0x5f7a35, 1)
    g.fillRoundedRect(x - 2, y - 12, 4, 8, 2)
  }
}

function drawPotatoes(g: Phaser.GameObjects.Graphics, ready: number): void {
  g.fillStyle(SHADOW, 0.1)
  g.fillEllipse(0, -3, 22, 6)
  g.lineStyle(2.5, LEAF_DARK, 1)
  g.lineBetween(0, 0, -10, -20)
  g.lineBetween(0, 0, 10, -22)
  g.lineBetween(0, 0, 0, -26)
  for (const [x, y] of [
    [-12, -22],
    [0, -28],
    [12, -24],
    [-2, -14],
  ]) {
    blob(g, x, y, 9, 6, LEAF)
    blob(g, x - 2, y - 1, 6, 4, LEAF_LIGHT)
  }

  for (let index = 0; index < Math.min(ready, POTATO_SLOTS.length); index += 1) {
    const [x, y] = POTATO_SLOTS[index]
    g.fillStyle(0xa9773f, 1)
    g.fillEllipse(x, y, 15, 10)
    g.fillStyle(0xc79a5f, 1)
    g.fillEllipse(x, y - 1, 12, 7)
    g.fillStyle(0xffe0b0, 0.45)
    g.fillEllipse(x - 3, y - 2, 4, 2.5)
    g.fillStyle(0x8a5a2e, 1)
    g.fillCircle(x + 3, y, 1.1)
    g.fillCircle(x - 1, y + 2, 1)
  }
}

function drawEggplants(g: Phaser.GameObjects.Graphics, ready: number): void {
  g.fillStyle(SHADOW, 0.1)
  g.fillEllipse(0, -3, 22, 6)
  g.fillStyle(LEAF_DARK, 1)
  g.fillRoundedRect(-3, -52, 6, 52, 3)
  g.fillStyle(LEAF, 1)
  g.fillRoundedRect(-2, -50, 3, 48, 1.5)
  leaf(g, -14, -40, 24, 15, -0.4, LEAF_DARK)
  leaf(g, 14, -36, 23, 14, 0.4, LEAF_DARK)
  leaf(g, 0, -52, 20, 12, 0.05, LEAF)
  leaf(g, -13, -38, 16, 9, -0.45, LEAF)
  leaf(g, 13, -34, 15, 9, 0.45, LEAF)

  drawYield(g, ready, EGGPLANT_SLOTS, drawEggplant)
}

function drawYield(
  g: Phaser.GameObjects.Graphics,
  ready: number,
  slots: Slots,
  draw: (g: Phaser.GameObjects.Graphics, x: number, y: number) => void,
): void {
  for (let index = 0; index < Math.min(ready, slots.length); index += 1) {
    const [x, y] = slots[index]
    draw(g, x, y)
  }
}

function drawApple(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(SHADOW, 0.2)
  g.fillCircle(x + 1, y + 2, 6)
  g.fillStyle(FRUIT_COLORS.apple, 1)
  g.fillCircle(x, y, 5.8)
  g.fillStyle(0xff9b8c, 0.8)
  g.fillEllipse(x - 2, y - 2, 3.2, 4.4)
  g.lineStyle(1.4, TRUNK_DARK, 1)
  g.lineBetween(x, y - 4, x + 1, y - 8)
  g.fillStyle(LEAF, 1)
  g.fillEllipse(x + 4, y - 9, 6, 3)
}

function drawPear(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(SHADOW, 0.16)
  g.fillEllipse(x + 1, y + 5, 10, 4)
  g.fillStyle(FRUIT_COLORS.pear, 1)
  g.fillCircle(x, y + 3, 5.2)
  g.fillCircle(x, y - 3, 4)
  g.fillStyle(0xe7ef9a, 0.8)
  g.fillEllipse(x - 2, y + 2, 2.5, 4)
  g.lineStyle(1.4, TRUNK_DARK, 1)
  g.lineBetween(x, y - 6, x + 1, y - 10)
  g.fillStyle(LEAF, 1)
  g.fillEllipse(x + 4, y - 10, 5, 2.5)
}

function drawPeach(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(SHADOW, 0.16)
  g.fillEllipse(x + 1, y + 5, 11, 4)
  g.fillStyle(FRUIT_COLORS.peach, 1)
  g.fillCircle(x, y, 6.2)
  g.fillStyle(0xffc0ae, 0.8)
  g.fillEllipse(x - 2, y - 2, 3, 4)
  g.lineStyle(1.2, 0xd86f5f, 0.8)
  g.beginPath()
  g.arc(x - 1, y, 5, -1.1, 1.1)
  g.strokePath()
  g.fillStyle(LEAF, 1)
  g.fillEllipse(x + 3, y - 7, 6, 3)
}

function drawCherryPair(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.lineStyle(1.3, TRUNK_DARK, 1)
  g.lineBetween(x, y - 11, x - 4, y - 3)
  g.lineBetween(x, y - 11, x + 4, y - 3)
  g.fillStyle(LEAF, 1)
  g.fillEllipse(x - 2, y - 11, 6, 3)
  for (const dx of [-4, 4]) {
    g.fillStyle(SHADOW, 0.2)
    g.fillCircle(x + dx + 1, y + 2, 4.2)
    g.fillStyle(FRUIT_COLORS.cherry, 1)
    g.fillCircle(x + dx, y, 3.8)
    g.fillStyle(0xffb3b8, 0.7)
    g.fillCircle(x + dx - 1, y - 1, 1.2)
  }
}

function drawStrawberry(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(SHADOW, 0.16)
  g.fillEllipse(x + 1, y + 5, 11, 4)
  g.fillStyle(FRUIT_COLORS.strawberry, 1)
  g.fillCircle(x, y - 2, 4.8)
  g.fillTriangle(x - 4.8, y - 1, x + 4.8, y - 1, x, y + 6)
  g.fillStyle(0xff9b9b, 0.6)
  g.fillEllipse(x - 2, y - 3, 2.4, 3.6)
  g.fillStyle(0x5aa96f, 1)
  g.fillTriangle(x - 4, y - 6, x + 4, y - 6, x, y - 10)
  g.fillTriangle(x, y - 7, x + 6, y - 9, x + 2, y - 5)
  g.fillTriangle(x, y - 7, x - 6, y - 9, x - 2, y - 5)
  g.fillStyle(0xfff3b0, 1)
  g.fillCircle(x - 1.5, y - 1, 0.9)
  g.fillCircle(x + 2, y, 0.9)
  g.fillCircle(x + 0.5, y + 3, 0.9)
}

function drawGrapeCluster(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.lineStyle(1.4, TRUNK_DARK, 1)
  g.lineBetween(x, y - 14, x, y - 8)
  g.fillStyle(LEAF, 1)
  g.fillEllipse(x + 2, y - 13, 7, 3)
  for (const [dx, dy] of [
    [0, -4],
    [-4, 0],
    [4, 0],
    [-8, 4],
    [0, 4],
    [8, 4],
    [-4, 8],
    [4, 8],
    [0, 12],
  ]) {
    g.fillStyle(SHADOW, 0.18)
    g.fillCircle(x + dx + 0.6, y + dy + 0.8, 3.3)
    g.fillStyle(FRUIT_COLORS.grape, 1)
    g.fillCircle(x + dx, y + dy, 3)
  }
  g.fillStyle(0xd9b8ef, 0.8)
  g.fillCircle(x - 1, y - 5, 0.9)
  g.fillCircle(x + 3, y + 3, 0.9)
}

function drawTomato(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(SHADOW, 0.16)
  g.fillCircle(x + 1, y + 2, 6.2)
  g.fillStyle(0xd94b45, 1)
  g.fillCircle(x, y, 6)
  g.fillStyle(0xf06a5f, 1)
  g.fillCircle(x - 1, y - 1, 4.8)
  g.fillStyle(0xff9b8c, 0.7)
  g.fillEllipse(x - 2, y - 3, 2.4, 3)
  g.fillStyle(0x4f9b5f, 1)
  for (let index = 0; index < 5; index += 1) {
    const angle = -Math.PI / 2 + index * ((Math.PI * 2) / 5)
    g.fillTriangle(
      x,
      y - 4,
      x + Math.cos(angle) * 5.5,
      y - 4 + Math.sin(angle) * 4,
      x + Math.cos(angle + 0.6) * 3.6,
      y - 4 + Math.sin(angle + 0.6) * 2.8,
    )
  }
}

function drawCornEar(g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number): void {
  g.save()
  g.translateCanvas(x, y)
  g.rotateCanvas(angle)
  g.fillStyle(LEAF_DARK, 1)
  g.fillEllipse(0, 0, 16, 30)
  g.fillStyle(LEAF, 1)
  g.fillEllipse(0, -1, 12, 27)
  g.fillStyle(0xf2c94c, 1)
  g.fillEllipse(0, 0, 10, 24)
  g.fillStyle(0xffe08a, 1)
  for (let row = 0; row < 5; row += 1) {
    for (let column = -1; column <= 1; column += 1) {
      g.fillCircle(column * 3, -8 + row * 4, 1.6)
    }
  }
  g.fillStyle(0x4a8f5d, 1)
  g.fillTriangle(-7, 12, 7, 12, 0, 20)
  g.restore()
}

function drawEggplant(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.save()
  g.translateCanvas(x, y)
  g.rotateCanvas(x < 0 ? -0.2 : 0.2)
  g.fillStyle(SHADOW, 0.18)
  g.fillEllipse(1, 2, 14, 21)
  g.fillStyle(0x5f3f7a, 1)
  g.fillEllipse(0, 0, 13, 20)
  g.fillStyle(0x7a4f9c, 1)
  g.fillEllipse(0, -1, 10, 17)
  g.fillStyle(0xc9a0e0, 0.55)
  g.fillEllipse(-3, -4, 2.4, 6)
  g.fillStyle(0x5aa96f, 1)
  g.fillTriangle(-5, -10, 5, -10, 0, -16)
  g.fillTriangle(0, -12, 7, -13, 3, -9)
  g.fillTriangle(0, -12, -7, -13, -3, -9)
  g.lineStyle(1.5, 0x4f8f5f, 1)
  g.lineBetween(0, -16, 0, -19)
  g.restore()
}

function drawTrunk(g: Phaser.GameObjects.Graphics, height: number, width: number): void {
  g.fillStyle(TRUNK_DARK, 1)
  g.fillRoundedRect(-width / 2, -height, width, height, width / 2)
  g.fillStyle(TRUNK, 1)
  g.fillRoundedRect(-width / 2 + 2.5, -height + 4, width * 0.34, height - 6, width * 0.17)
  g.fillStyle(TRUNK_LIGHT, 0.68)
  g.fillRoundedRect(-width / 2 + 3.5, -height + 6, 1.8, height - 12, 1)
}

function blob(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: number,
): void {
  g.fillStyle(color, 1)
  g.fillEllipse(x, y, rx * 2, ry * 2)
}

function leaf(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  angle: number,
  color: number,
): void {
  g.save()
  g.translateCanvas(x, y)
  g.rotateCanvas(angle)
  g.fillStyle(color, 1)
  g.fillEllipse(0, 0, width, height)
  g.restore()
}

function blade(
  g: Phaser.GameObjects.Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  color: number,
): void {
  const dx = x1 - x0
  const dy = y1 - y0
  const length = Math.hypot(dx, dy) || 1
  const nx = (-dy / length) * (width / 2)
  const ny = (dx / length) * (width / 2)
  g.fillStyle(color, 1)
  g.fillTriangle(x0 + nx, y0 + ny, x0 - nx, y0 - ny, x1, y1)
}

function drawFlower(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0xfffaf0, 1)
  for (let index = 0; index < 5; index += 1) {
    const angle = -Math.PI / 2 + index * ((Math.PI * 2) / 5)
    g.fillCircle(x + Math.cos(angle) * 3.2, y + Math.sin(angle) * 3.2, 2.2)
  }
  g.fillStyle(0xffd166, 1)
  g.fillCircle(x, y, 1.6)
}
