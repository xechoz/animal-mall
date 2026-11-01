import type Phaser from 'phaser'
import { CUSTOMER_SPECIES } from '../logic/config'
import type { SpeciesId } from '../logic/types'

const SIZE = 96
const INK = 0x3b2f3a

export const ANIMAL_TEXTURE_SIZE = SIZE
export const ANIMAL_ORIGIN_Y = 0.9

export type AnimalPart = 'body' | 'head' | 'tail' | 'paw'

type Layer = 'shadow' | 'tail' | 'feet' | 'body' | 'head'

const ALL_LAYERS: ReadonlySet<Layer> = new Set(['shadow', 'tail', 'feet', 'body', 'head'])
const PART_LAYERS: Readonly<Record<Exclude<AnimalPart, 'paw'>, ReadonlySet<Layer>>> = {
  body: new Set(['body']),
  head: new Set(['head']),
  tail: new Set(['tail']),
}

interface AnimalStyle {
  readonly body: number
  readonly bodyDark: number
  readonly face: number
  readonly earInner: number
  readonly nose: number
  readonly accent: number
}

const STYLES: Readonly<Record<SpeciesId, AnimalStyle>> = {
  bear: {
    body: 0xb97a4e,
    bodyDark: 0x8f5734,
    face: 0xf0c99b,
    earInner: 0xd9a06a,
    nose: 0x3b2f3a,
    accent: 0xf2a1a1,
  },
  cat: {
    body: 0xf0a050,
    bodyDark: 0xc97a32,
    face: 0xffd9a6,
    earInner: 0xf2a1a1,
    nose: 0xd8868f,
    accent: 0xf07f8d,
  },
  rabbit: {
    body: 0xfff7e9,
    bodyDark: 0xdccbb4,
    face: 0xf7ddc0,
    earInner: 0xf2a1a1,
    nose: 0xd8868f,
    accent: 0xf5a3b5,
  },
  fox: {
    body: 0xe8732f,
    bodyDark: 0xbf531c,
    face: 0xfff0da,
    earInner: 0x3b2f3a,
    nose: 0x3b2f3a,
    accent: 0xf5b95e,
  },
  panda: {
    body: 0xf5f1e8,
    bodyDark: 0xd4cec2,
    face: 0xffffff,
    earInner: 0x3b2f3a,
    nose: 0x3b2f3a,
    accent: 0xf2a1a1,
  },
  frog: {
    body: 0x7fc68b,
    bodyDark: 0x589e67,
    face: 0xd8f0bd,
    earInner: 0x589e67,
    nose: 0x3b2f3a,
    accent: 0xf2a1a1,
  },
  pig: {
    body: 0xf2a8b4,
    bodyDark: 0xd98090,
    face: 0xffd5dc,
    earInner: 0xd98090,
    nose: 0xd06a7c,
    accent: 0xf07f8d,
  },
  dog: {
    body: 0xb98a5c,
    bodyDark: 0x916740,
    face: 0xf4d7ad,
    earInner: 0x6f4b2e,
    nose: 0x3b2f3a,
    accent: 0xf2a1a1,
  },
}

export function animalTextureKey(species: SpeciesId): string {
  return `animal-${species}`
}

export function playerTextureKey(): string {
  return 'animal-player'
}

export function animalPartKey(species: SpeciesId, part: AnimalPart): string {
  return `animal-${species}-${part}`
}

export function playerPartKey(part: AnimalPart): string {
  return `animal-player-${part}`
}

export interface TexturePoint {
  readonly x: number
  readonly y: number
}

/**
 * Where the tail attaches to the body, in the shared 96x96 texture space.
 * The split tail texture rotates around this point.
 */
const TAIL_PIVOTS: Readonly<Record<SpeciesId, TexturePoint>> = {
  bear: { x: 77, y: 72 },
  cat: { x: 68, y: 72 },
  rabbit: { x: 78, y: 72 },
  fox: { x: 68, y: 70 },
  panda: { x: 77, y: 72 },
  frog: { x: 77, y: 72 },
  pig: { x: 76, y: 65 },
  dog: { x: 68, y: 72 },
}

export function tailPivot(species: SpeciesId): TexturePoint {
  return TAIL_PIVOTS[species]
}

export interface BlinkEye {
  readonly x: number
  readonly y: number
  readonly r: number
}

const DEFAULT_EYES: readonly BlinkEye[] = [
  { x: 40, y: 39, r: 3.8 },
  { x: 56, y: 39, r: 3.8 },
]

/**
 * Eyes the eyelid overlay has to cover. The frog's real eyes are the bulges on
 * top of the head; the panda's sit inside the dark patches.
 */
export function blinkEyes(species: SpeciesId): readonly BlinkEye[] {
  if (species === 'frog') {
    return [
      { x: 34, y: 20, r: 7.5 },
      { x: 62, y: 20, r: 7.5 },
    ]
  }
  if (species === 'panda') {
    return [
      { x: 40, y: 39, r: 4.8 },
      { x: 56, y: 39, r: 4.8 },
    ]
  }
  return DEFAULT_EYES
}

/** Colour to paint over the eye while blinking (the head colour around it). */
export function eyeCoverColor(species: SpeciesId): number {
  return STYLES[species].body
}

export function createAnimalTextures(scene: Phaser.Scene): void {
  for (const species of CUSTOMER_SPECIES) {
    createTexture(scene, animalTextureKey(species), () =>
      drawAnimal(scene, species, false, ALL_LAYERS),
    )
    createTexture(scene, animalPartKey(species, 'body'), () =>
      drawAnimal(scene, species, false, PART_LAYERS.body),
    )
    createTexture(scene, animalPartKey(species, 'head'), () =>
      drawAnimal(scene, species, false, PART_LAYERS.head),
    )
    createTexture(scene, animalPartKey(species, 'tail'), () =>
      drawAnimal(scene, species, false, PART_LAYERS.tail),
    )
    createTexture(scene, animalPartKey(species, 'paw'), () => drawPaw(scene, species))
  }

  createTexture(scene, playerTextureKey(), () => drawAnimal(scene, 'bear', true, ALL_LAYERS))
  createTexture(scene, playerPartKey('body'), () =>
    drawAnimal(scene, 'bear', true, PART_LAYERS.body),
  )
  createTexture(scene, playerPartKey('head'), () =>
    drawAnimal(scene, 'bear', true, PART_LAYERS.head),
  )
  createTexture(scene, playerPartKey('tail'), () =>
    drawAnimal(scene, 'bear', true, PART_LAYERS.tail),
  )
  createTexture(scene, playerPartKey('paw'), () => drawPaw(scene, 'bear'))
}

function createTexture(scene: Phaser.Scene, key: string, draw: () => Phaser.GameObjects.Graphics) {
  if (scene.textures.exists(key)) return
  const graphics = draw()
  graphics.generateTexture(key, SIZE, SIZE)
  graphics.destroy()
}

function drawPaw(scene: Phaser.Scene, species: SpeciesId): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics()
  drawFoot(g, STYLES[species], 38)
  return g
}

function drawAnimal(
  scene: Phaser.Scene,
  species: SpeciesId,
  player: boolean,
  layers: ReadonlySet<Layer>,
): Phaser.GameObjects.Graphics {
  const style = STYLES[species]
  const g = scene.add.graphics()

  if (layers.has('shadow')) {
    g.fillStyle(INK, 0.16)
    g.fillEllipse(48, 89, 46, 9)
  }
  if (layers.has('tail')) drawTail(g, species, style)
  if (layers.has('feet')) drawFeet(g, style)
  if (layers.has('body')) drawBody(g, species, style, player, layers.has('shadow'))
  if (layers.has('head')) drawHead(g, species, style, player)

  return g
}

function drawBody(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  style: AnimalStyle,
  player: boolean,
  pocket: boolean,
): void {
  g.fillStyle(INK, 1)
  g.fillEllipse(48, 68, 48, 38)
  g.fillStyle(style.bodyDark, 1)
  g.fillEllipse(48, 68, 45, 35)
  g.fillStyle(style.body, 1)
  g.fillEllipse(47, 66, 42, 32)
  // Soft top-left highlight and a darker underside give the flat ellipse volume.
  g.fillStyle(0xffffff, 0.16)
  g.fillEllipse(38, 56, 17, 10)
  g.fillStyle(style.bodyDark, 0.3)
  g.fillEllipse(53, 79, 30, 11)
  g.fillStyle(style.face, 0.35)
  g.fillEllipse(48, 73, 21, 12)

  g.fillStyle(style.face, 0.92)
  g.fillEllipse(48, 74, 24, 15)

  if (player) {
    drawApron(g)
  }

  g.fillStyle(style.bodyDark, 1)
  g.fillRoundedRect(24, 62, 10, 18, 5)
  g.fillRoundedRect(62, 62, 10, 18, 5)
  g.fillStyle(style.body, 1)
  g.fillRoundedRect(26, 63, 7, 14, 3)
  g.fillRoundedRect(63, 63, 7, 14, 3)

  if (species === 'frog') {
    g.fillStyle(0x3f7a4d, 0.45)
    g.fillEllipse(33, 74, 7, 4)
    g.fillEllipse(61, 78, 6, 3)
    g.fillEllipse(48, 83, 5, 3)
  }

  // The portrait texture keeps the apron pocket. The walking body drops it so
  // the split paws stay visible below the apron hem.
  if (player && pocket) {
    g.fillStyle(0x5fbf9f, 1)
    g.fillRoundedRect(34, 78, 28, 12, 5)
    g.fillStyle(0xfff3dd, 1)
    g.fillRoundedRect(39, 81, 18, 6, 3)
  }
}

function drawHead(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  style: AnimalStyle,
  player: boolean,
): void {
  const headY = 40
  drawEars(g, species, style, headY)

  g.fillStyle(INK, 1)
  g.fillCircle(48, headY, 25)
  g.fillStyle(style.bodyDark, 1)
  g.fillCircle(48, headY, 23)
  g.fillStyle(style.body, 1)
  g.fillCircle(47, headY - 1, 21)
  g.fillStyle(0xffffff, 0.2)
  g.fillEllipse(39, headY - 12, 11, 7)
  g.fillStyle(style.bodyDark, 0.18)
  g.fillEllipse(57, headY + 9, 18, 10)

  if (species === 'cat') {
    g.lineStyle(1.2, style.bodyDark, 0.8)
    for (const side of [-1, 1]) {
      for (let index = -1; index <= 1; index += 1) {
        g.lineBetween(48 + side * 14, 47 + index * 2, 48 + side * 27, 45 + index * 4)
      }
    }
  }

  if (species === 'rabbit') {
    g.fillStyle(0xffffff, 1)
    g.fillRoundedRect(45, 54, 3, 5, 1)
    g.fillRoundedRect(49, 54, 3, 5, 1)
  }

  if (species === 'panda') {
    g.fillStyle(INK, 1)
    g.fillEllipse(38, 38, 14, 12)
    g.fillEllipse(58, 38, 14, 12)
    g.fillStyle(style.body, 1)
    g.fillCircle(38, 39, 4.5)
    g.fillCircle(58, 39, 4.5)
  }

  if (player) {
    drawCap(g)
  }

  g.fillStyle(style.face, 1)
  g.fillEllipse(48, 50, 22, 14)
  g.fillStyle(style.nose, 1)
  g.fillEllipse(48, 48, 5, 4)
  g.fillStyle(0xffffff, 0.35)
  g.fillEllipse(47, 47, 2, 1.4)
  g.lineStyle(2, style.nose, 0.8)
  g.beginPath()
  g.arc(48, 50, 4, 0.15, Math.PI - 0.15)
  g.strokePath()

  if (species === 'pig') {
    g.fillStyle(0xc95b70, 0.8)
    g.fillCircle(46, 48, 1)
    g.fillCircle(50, 48, 1)
  }

  drawEye(g, 40, 39)
  drawEye(g, 56, 39)
  g.lineStyle(1.4, style.bodyDark, 0.8)
  g.beginPath()
  g.arc(40, 34, 5, 3.45, 5.75)
  g.strokePath()
  g.beginPath()
  g.arc(56, 34, 5, 3.45, 5.75)
  g.strokePath()

  g.fillStyle(0xf07f8d, 0.55)
  g.fillEllipse(31, 51, 7, 4)
  g.fillEllipse(65, 51, 7, 4)
  g.fillStyle(0xffffff, 0.5)
  g.fillCircle(32, 49, 1)
  g.fillCircle(64, 49, 1)
}

function drawEye(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(INK, 1)
  g.fillCircle(x, y, 3.2)
  g.fillStyle(0xffffff, 0.9)
  g.fillCircle(x - 1, y - 1, 1.1)
}

function drawEars(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  style: AnimalStyle,
  headY: number,
): void {
  switch (species) {
    case 'rabbit': {
      for (const sign of [-1, 1]) {
        const x = 48 + sign * 11
        g.fillStyle(INK, 1)
        g.fillEllipse(x, headY - 24, 12, 30)
        g.fillStyle(style.bodyDark, 1)
        g.fillEllipse(x, headY - 24, 10, 27)
        g.fillStyle(style.earInner, 1)
        g.fillEllipse(x, headY - 23, 5, 19)
      }
      break
    }
    case 'cat':
    case 'fox': {
      const tall = species === 'fox' ? 1.2 : 1
      for (const sign of [-1, 1]) {
        const baseX = 48 + sign * 14
        const tipX = 48 + sign * (species === 'fox' ? 25 : 22)
        const tipY = headY - 27 * tall
        g.fillStyle(INK, 1)
        g.fillTriangle(baseX - 9, headY - 13, baseX + 9, headY - 13, tipX, tipY)
        g.fillStyle(style.bodyDark, 1)
        g.fillTriangle(baseX - 6, headY - 14, baseX + 6, headY - 14, tipX, tipY + 3)
        g.fillStyle(style.earInner, 1)
        g.fillTriangle(baseX - 3, headY - 13, baseX + 3, headY - 13, tipX, tipY + 8)
      }
      break
    }
    case 'panda': {
      for (const sign of [-1, 1]) {
        g.fillStyle(INK, 1)
        g.fillCircle(48 + sign * 18, headY - 18, 9)
        g.fillStyle(style.body, 1)
        g.fillCircle(48 + sign * 18, headY - 18, 6)
      }
      break
    }
    case 'frog': {
      for (const sign of [-1, 1]) {
        g.fillStyle(INK, 1)
        g.fillCircle(48 + sign * 14, headY - 20, 10)
        g.fillStyle(style.body, 1)
        g.fillCircle(48 + sign * 14, headY - 20, 8)
        g.fillStyle(INK, 1)
        g.fillCircle(48 + sign * 14, headY - 21, 3.5)
      }
      break
    }
    case 'pig': {
      for (const sign of [-1, 1]) {
        g.fillStyle(INK, 1)
        g.fillEllipse(48 + sign * 23, headY - 6, 10, 16)
        g.fillStyle(style.body, 1)
        g.fillEllipse(48 + sign * 23, headY - 6, 7, 13)
      }
      break
    }
    case 'dog': {
      for (const sign of [-1, 1]) {
        g.fillStyle(INK, 1)
        g.fillEllipse(48 + sign * 23, headY - 2, 11, 22)
        g.fillStyle(style.bodyDark, 1)
        g.fillEllipse(48 + sign * 23, headY - 2, 8, 19)
      }
      break
    }
    case 'bear': {
      for (const sign of [-1, 1]) {
        g.fillStyle(INK, 1)
        g.fillCircle(48 + sign * 18, headY - 18, 10)
        g.fillStyle(style.bodyDark, 1)
        g.fillCircle(48 + sign * 18, headY - 18, 8)
        g.fillStyle(style.earInner, 1)
        g.fillCircle(48 + sign * 18, headY - 17, 4)
      }
      break
    }
  }
}

function drawTail(g: Phaser.GameObjects.Graphics, species: SpeciesId, style: AnimalStyle): void {
  switch (species) {
    case 'fox': {
      curveTail(g, { x: 68, y: 70 }, { x: 84, y: 76 }, { x: 88, y: 58 }, 8, style.bodyDark)
      g.fillStyle(style.face, 1)
      g.fillEllipse(88, 57, 10, 8)
      g.fillStyle(0xffffff, 0.55)
      g.fillEllipse(87, 55, 5, 3)
      break
    }
    case 'cat':
    case 'dog':
      curveTail(g, { x: 68, y: 72 }, { x: 82, y: 70 }, { x: 84, y: 60 }, 6, style.bodyDark)
      g.fillStyle(style.body, 1)
      g.fillCircle(84, 60, 3.4)
      break
    case 'pig':
      g.lineStyle(3.5, style.bodyDark, 1)
      g.beginPath()
      g.arc(76, 65, 5, -0.4, 4.2)
      g.strokePath()
      break
    case 'rabbit':
      g.fillStyle(style.face, 1)
      g.fillCircle(78, 72, 6)
      g.fillStyle(0xffffff, 0.55)
      g.fillCircle(77, 70, 2.4)
      break
    default:
      g.fillStyle(style.bodyDark, 1)
      g.fillCircle(77, 72, 5)
      g.fillStyle(0xffffff, 0.25)
      g.fillCircle(76, 70, 1.8)
  }
}

function curveTail(
  g: Phaser.GameObjects.Graphics,
  from: { x: number; y: number },
  control: { x: number; y: number },
  to: { x: number; y: number },
  width: number,
  color: number,
): void {
  const steps = 10
  let previous = from
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps
    const inverse = 1 - t
    const point = {
      x: inverse * inverse * from.x + 2 * inverse * t * control.x + t * t * to.x,
      y: inverse * inverse * from.y + 2 * inverse * t * control.y + t * t * to.y,
    }
    g.lineStyle(width, color, 1)
    g.lineBetween(previous.x, previous.y, point.x, point.y)
    previous = point
  }
}

function drawFeet(g: Phaser.GameObjects.Graphics, style: AnimalStyle): void {
  for (const x of [38, 54]) {
    drawFoot(g, style, x)
  }
}

function drawFoot(g: Phaser.GameObjects.Graphics, style: AnimalStyle, x: number): void {
  g.fillStyle(INK, 1)
  g.fillRoundedRect(x - 2, 80, 15, 10, 5)
  g.fillStyle(style.bodyDark, 1)
  g.fillRoundedRect(x, 81, 11, 8, 4)
  g.lineStyle(1, INK, 0.35)
  g.lineBetween(x + 4, 83, x + 4, 88)
  g.lineBetween(x + 7, 83, x + 7, 88)
}

function drawApron(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x5fbf9f, 1)
  g.fillRoundedRect(35, 58, 26, 25, 8)
  g.fillStyle(0x4aa98a, 1)
  g.fillRoundedRect(40, 66, 16, 9, 3)
  g.lineStyle(3, 0x4aa98a, 1)
  g.lineBetween(38, 58, 44, 49)
  g.lineBetween(58, 58, 52, 49)
}

function drawCap(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0xf28b5b, 1)
  g.fillEllipse(48, 22, 30, 12)
  g.fillStyle(0xe5724a, 1)
  g.fillRoundedRect(31, 24, 34, 6, 3)
  g.fillStyle(0xfff3dd, 1)
  g.fillCircle(48, 18, 2.5)
}
