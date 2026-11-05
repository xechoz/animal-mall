import type Phaser from 'phaser'
import { CUSTOMER_SPECIES } from '../logic/config'
import type { SpeciesId } from '../logic/types'
import type { AnimalView } from './heading'

/**
 * Character art is drawn at 128 px and displayed at the old 96 px footprint.
 * The rig splits every animal into body, head, tail and paw textures so the
 * gait can move the parts independently; the full texture is kept for menus
 * and shop portraits. The rigged parts have five directional views, mirrored to
 * cover the eight walking headings; turned bodies bake the head in so a wide
 * flank can never cover it.
 */
const SIZE = 128
const BASE_SIZE = 96
export const ANIMAL_SCALE = BASE_SIZE / SIZE
export const ANIMAL_TEXTURE_SIZE = SIZE
export const ANIMAL_ORIGIN_Y = 0.9
export const ANIMAL_VIEWS: readonly AnimalView[] = [
  'front',
  'frontSide',
  'side',
  'backSide',
  'back',
]

const FOOT_LEFT = 50.7
const FOOT_RIGHT = 72
export const ANIMAL_FOOT_GAP = FOOT_RIGHT - FOOT_LEFT

const INK = 0x3b2f3a
const WHITE = 0xffffff
const BEAK = 0xf2a93b
const PINK = 0xf2a8b4
const PINK_DARK = 0xd06a7c
const HORN = 0x8f6a3a
const LEAF = 0x6fb36a
const LEAF_DARK = 0x4f8a52
const ORIGIN_Y = SIZE * ANIMAL_ORIGIN_Y

export type AnimalPart = 'body' | 'head' | 'tail' | 'paw'

type Layer = 'shadow' | 'tail' | 'feet' | 'body' | 'head'

const ALL_LAYERS: ReadonlySet<Layer> = new Set(['shadow', 'tail', 'feet', 'body', 'head'])
/** Everything below the head, in drawing order. */
const BODY_LAYERS: ReadonlySet<Layer> = new Set(['shadow', 'tail', 'feet', 'body'])
/** Turned views bake the head into the body so a wide flank cannot cover it. */
const BODY_AND_HEAD: ReadonlySet<Layer> = new Set(['body', 'head'])

const PART_LAYERS: Readonly<Record<Exclude<AnimalPart, 'paw'>, ReadonlySet<Layer>>> = {
  body: new Set(['body']),
  head: new Set(['head']),
  tail: new Set(['tail']),
}

interface AnimalStyle {
  readonly body: number
  readonly bodyDark: number
  readonly bodyLight: number
  readonly face: number
  readonly earInner: number
  readonly nose: number
  readonly accent: number
}

const STYLES: Readonly<Record<SpeciesId, AnimalStyle>> = {
  bear: {
    body: 0xb97a4e,
    bodyDark: 0x8f5734,
    bodyLight: 0xd39a6a,
    face: 0xf0c99b,
    earInner: 0xd9a06a,
    nose: INK,
    accent: 0xf2a1a1,
  },
  cat: {
    body: 0xf0a050,
    bodyDark: 0xc97a32,
    bodyLight: 0xffc27a,
    face: 0xffd9a6,
    earInner: 0xf2a1a1,
    nose: 0xd8868f,
    accent: 0xf07f8d,
  },
  rabbit: {
    body: 0xfff7e9,
    bodyDark: 0xdccbb4,
    bodyLight: WHITE,
    face: 0xf7ddc0,
    earInner: 0xf2a1a1,
    nose: 0xd8868f,
    accent: 0xf5a3b5,
  },
  fox: {
    body: 0xe8732f,
    bodyDark: 0xbf531c,
    bodyLight: 0xf59a5a,
    face: 0xfff0da,
    earInner: INK,
    nose: INK,
    accent: 0xf5b95e,
  },
  panda: {
    body: 0xf5f1e8,
    bodyDark: 0xd4cec2,
    bodyLight: WHITE,
    face: WHITE,
    earInner: INK,
    nose: INK,
    accent: 0xf2a1a1,
  },
  frog: {
    body: 0x7fc68b,
    bodyDark: 0x589e67,
    bodyLight: 0xa8dfa8,
    face: 0xd8f0bd,
    earInner: 0x589e67,
    nose: 0x3f7a4d,
    accent: 0xf2a1a1,
  },
  pig: {
    body: PINK,
    bodyDark: 0xd98090,
    bodyLight: 0xffc4cd,
    face: 0xffd5dc,
    earInner: 0xd98090,
    nose: PINK_DARK,
    accent: 0xf07f8d,
  },
  dog: {
    body: 0xb98a5c,
    bodyDark: 0x916740,
    bodyLight: 0xd9ab7a,
    face: 0xf4d7ad,
    earInner: 0x6f4b2e,
    nose: INK,
    accent: 0xf2a1a1,
  },
  squirrel: {
    body: 0xc4793f,
    bodyDark: 0x9a5728,
    bodyLight: 0xe0a066,
    face: 0xf7ddc0,
    earInner: 0xf0b8a0,
    nose: INK,
    accent: 0xe8b04c,
  },
  hedgehog: {
    body: 0x8a6a4a,
    bodyDark: 0x5f4630,
    bodyLight: 0xb08a62,
    face: 0xf0d6b0,
    earInner: 0xd9a06a,
    nose: INK,
    accent: LEAF,
  },
  raccoon: {
    body: 0x9aa0a8,
    bodyDark: 0x6f757c,
    bodyLight: 0xc4c9cf,
    face: 0xe8e2d8,
    earInner: INK,
    nose: INK,
    accent: INK,
  },
  deer: {
    body: 0xc08a5a,
    bodyDark: 0x8f6038,
    bodyLight: 0xe0b080,
    face: 0xfff0da,
    earInner: 0xf2a1a1,
    nose: INK,
    accent: 0xfff7e9,
  },
  owl: {
    body: 0xa88a6a,
    bodyDark: 0x7a5f45,
    bodyLight: 0xd0b48a,
    face: 0xf7edd8,
    earInner: 0x7a5f45,
    nose: BEAK,
    accent: 0x6f4b2e,
  },
  duck: {
    body: 0xfff3dd,
    bodyDark: 0xe0cfb0,
    bodyLight: WHITE,
    face: 0xfff9ec,
    earInner: 0xf0b8a0,
    nose: BEAK,
    accent: 0x7fc6d9,
  },
}

/**
 * Texture-space anchors used by the render layer for speech bubbles, patience
 * bars and the angry overlay. Keeping them per species means a frog's wide
 * mouth or an owl's huge eyes do not inherit the cat's face coordinates.
 */
interface FaceLayout {
  readonly eyeY: number
  readonly browY: number
  readonly mouthY: number
  readonly blushY: number
  readonly topY: number
}

export interface AnimalFace {
  readonly eyeY: number
  readonly browY: number
  readonly mouthY: number
  readonly blushY: number
  readonly topY: number
  /** Muzzle colour used to mask the resting mouth before an angry frown. */
  readonly mouthColor: number
}

const FACES: Readonly<Record<SpeciesId, FaceLayout>> = {
  bear: { eyeY: 52, browY: 40, mouthY: 74, blushY: 60, topY: 18 },
  cat: { eyeY: 52, browY: 40, mouthY: 75, blushY: 62, topY: 10 },
  rabbit: { eyeY: 52, browY: 38, mouthY: 76, blushY: 64, topY: 6 },
  fox: { eyeY: 52, browY: 38, mouthY: 75, blushY: 62, topY: 8 },
  panda: { eyeY: 52, browY: 36, mouthY: 75, blushY: 62, topY: 16 },
  frog: { eyeY: 48, browY: 32, mouthY: 76, blushY: 80, topY: 32 },
  pig: { eyeY: 50, browY: 38, mouthY: 80, blushY: 64, topY: 22 },
  dog: { eyeY: 52, browY: 40, mouthY: 80, blushY: 62, topY: 22 },
  squirrel: { eyeY: 52, browY: 40, mouthY: 77, blushY: 64, topY: 14 },
  hedgehog: { eyeY: 84, browY: 72, mouthY: 94, blushY: 92, topY: 50 },
  raccoon: { eyeY: 52, browY: 36, mouthY: 76, blushY: 60, topY: 16 },
  deer: { eyeY: 52, browY: 38, mouthY: 76, blushY: 62, topY: 8 },
  owl: { eyeY: 58, browY: 42, mouthY: 82, blushY: 70, topY: 14 },
  duck: { eyeY: 52, browY: 40, mouthY: 78, blushY: 62, topY: 20 },
}

export function animalFace(species: SpeciesId, scale: number): AnimalFace {
  const face = FACES[species]
  const toWorld = (y: number): number => (y - ORIGIN_Y) * scale
  return {
    eyeY: toWorld(face.eyeY),
    browY: toWorld(face.browY),
    mouthY: toWorld(face.mouthY),
    blushY: toWorld(face.blushY),
    topY: toWorld(face.topY),
    mouthColor: STYLES[species].face,
  }
}

export interface TexturePoint {
  readonly x: number
  readonly y: number
}

const TAIL_PIVOTS: Readonly<Record<SpeciesId, TexturePoint>> = {
  bear: { x: 98, y: 96 },
  cat: { x: 91, y: 101 },
  rabbit: { x: 98, y: 98 },
  fox: { x: 91, y: 102 },
  panda: { x: 97, y: 98 },
  frog: { x: 64, y: 100 },
  pig: { x: 95, y: 90 },
  dog: { x: 92, y: 100 },
  squirrel: { x: 98, y: 104 },
  hedgehog: { x: 64, y: 100 },
  raccoon: { x: 94, y: 104 },
  deer: { x: 96, y: 92 },
  owl: { x: 64, y: 100 },
  duck: { x: 92, y: 94 },
}

/** Root of the tail when the body is seen from the side; the art trails left. */
function sideTailPivot(species: SpeciesId): TexturePoint {
  switch (species) {
    case 'pig':
      return { x: 40, y: 90 }
    case 'deer':
      return { x: 40, y: 92 }
    case 'duck':
      return { x: 40, y: 94 }
    default:
      return { x: 40, y: 96 }
  }
}

/** Root of the tail when the body is seen from behind; the art rises behind. */
function backTailPivot(species: SpeciesId): TexturePoint {
  switch (species) {
    case 'bear':
    case 'rabbit':
    case 'panda':
      return { x: 62, y: 106 }
    case 'dog':
      return { x: 62, y: 102 }
    case 'pig':
      return { x: 60, y: 100 }
    case 'deer':
      return { x: 62, y: 104 }
    case 'duck':
      return { x: 62, y: 102 }
    default:
      return { x: 62, y: 98 }
  }
}

export function tailPivot(species: SpeciesId, view: AnimalView = 'front'): TexturePoint {
  if (view === 'front') return TAIL_PIVOTS[species]
  if (view === 'side' || view === 'frontSide') return sideTailPivot(species)
  if (view === 'backSide') return { x: 54, y: sideTailPivot(species).y }
  return backTailPivot(species)
}

export interface BlinkEye {
  readonly x: number
  readonly y: number
  readonly r: number
}

const BLINK_EYES: Readonly<Record<SpeciesId, readonly BlinkEye[]>> = {
  bear: [
    { x: 52, y: 52, r: 4.2 },
    { x: 76, y: 52, r: 4.2 },
  ],
  cat: [
    { x: 52, y: 52, r: 4.3 },
    { x: 76, y: 52, r: 4.3 },
  ],
  rabbit: [
    { x: 52, y: 52, r: 4.4 },
    { x: 76, y: 52, r: 4.4 },
  ],
  fox: [
    { x: 52, y: 52, r: 3.8 },
    { x: 76, y: 52, r: 3.8 },
  ],
  panda: [
    { x: 52, y: 53, r: 4.4 },
    { x: 76, y: 53, r: 4.4 },
  ],
  frog: [
    { x: 46, y: 48, r: 8.5 },
    { x: 82, y: 48, r: 8.5 },
  ],
  pig: [
    { x: 51, y: 50, r: 4 },
    { x: 77, y: 50, r: 4 },
  ],
  dog: [
    { x: 52, y: 52, r: 4.2 },
    { x: 76, y: 52, r: 4.2 },
  ],
  squirrel: [
    { x: 52, y: 53, r: 4.4 },
    { x: 76, y: 53, r: 4.4 },
  ],
  hedgehog: [
    { x: 56, y: 84, r: 3.4 },
    { x: 72, y: 84, r: 3.4 },
  ],
  raccoon: [
    { x: 51, y: 52, r: 3.8 },
    { x: 77, y: 52, r: 3.8 },
  ],
  deer: [
    { x: 52, y: 52, r: 4.3 },
    { x: 76, y: 52, r: 4.3 },
  ],
  owl: [
    { x: 47, y: 58, r: 8 },
    { x: 81, y: 58, r: 8 },
  ],
  duck: [
    { x: 52, y: 52, r: 4 },
    { x: 76, y: 52, r: 4 },
  ],
}

export function blinkEyes(species: SpeciesId, view: AnimalView = 'front'): readonly BlinkEye[] {
  if (view === 'back' || view === 'backSide') return []
  if (view === 'front') return BLINK_EYES[species]
  const turn = view === 'side' ? 1 : 0.55
  const near = turnedEye(species, turn, false)
  if (view === 'side') return [near]
  const far = turnedEye(species, turn, true)
  return far.scale > 0.3 ? [far, near] : [near]
}

/** Colour painted over the eye while blinking (the head colour around it). */
export function eyeCoverColor(species: SpeciesId): number {
  if (species === 'panda' || species === 'raccoon') return INK
  return STYLES[species].body
}

export function animalTextureKey(species: SpeciesId): string {
  return `animal-${species}`
}

export function playerTextureKey(): string {
  return 'animal-player'
}

export function animalPartKey(
  species: SpeciesId,
  part: AnimalPart,
  view: AnimalView = 'front',
): string {
  return view === 'front' ? `animal-${species}-${part}` : `animal-${species}-${view}-${part}`
}

export function playerPartKey(part: AnimalPart, view: AnimalView = 'front'): string {
  return view === 'front' ? `animal-player-${part}` : `animal-player-${view}-${part}`
}

/** Side-on paws read better than the rounded front paw at a quarter turn. */
export function pawView(view: AnimalView): 'front' | 'side' {
  return view === 'side' || view === 'frontSide' ? 'side' : 'front'
}

export function createAnimalTextures(scene: Phaser.Scene): void {
  const speciesList = Array.from(new Set<SpeciesId>(['bear', ...CUSTOMER_SPECIES]))
  for (const species of speciesList) {
    createTexture(scene, animalTextureKey(species), () =>
      drawAnimal(scene, species, false, ALL_LAYERS, 'front'),
    )
    for (const view of ANIMAL_VIEWS) {
      for (const part of ['body', 'head', 'tail'] as const) {
        // Turned bodies bake the head in; only the front needs a separate head.
        if (part === 'head' && view !== 'front') continue
        const layers = part === 'body' && view !== 'front' ? BODY_AND_HEAD : PART_LAYERS[part]
        createTexture(scene, animalPartKey(species, part, view), () =>
          drawAnimal(scene, species, false, layers, view),
        )
      }
    }
    for (const view of ['front', 'side'] as const) {
      createTexture(scene, animalPartKey(species, 'paw', view), () => drawPaw(scene, species, view))
    }
  }
  for (const view of ANIMAL_VIEWS) {
    for (const part of ['body', 'head', 'tail'] as const) {
      const layers = part === 'body' && view !== 'front' ? BODY_AND_HEAD : PART_LAYERS[part]
      createTexture(scene, playerPartKey(part, view), () =>
        drawAnimal(scene, 'bear', true, layers, view),
      )
    }
  }
  createTexture(scene, playerTextureKey(), () =>
    drawAnimal(scene, 'bear', true, ALL_LAYERS, 'front'),
  )
  for (const view of ['front', 'side'] as const) {
    createTexture(scene, playerPartKey('paw', view), () => drawPaw(scene, 'bear', view))
  }
}

function createTexture(scene: Phaser.Scene, key: string, draw: () => Phaser.GameObjects.Graphics) {
  if (scene.textures.exists(key)) return
  const graphics = draw()
  graphics.generateTexture(key, SIZE, SIZE)
  graphics.destroy()
}

function drawPaw(
  scene: Phaser.Scene,
  species: SpeciesId,
  view: 'front' | 'side' = 'front',
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics()
  if (view === 'side') drawSidePawArt(g, species, STYLES[species], FOOT_LEFT, 112)
  else drawPawArt(g, species, STYLES[species], FOOT_LEFT, 112)
  return g
}

function drawAnimal(
  scene: Phaser.Scene,
  species: SpeciesId,
  player: boolean,
  layers: ReadonlySet<Layer>,
  view: AnimalView,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics()
  drawAnimalInto(g, species, player, layers, view)
  return g
}

function drawAnimalInto(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  player: boolean,
  layers: ReadonlySet<Layer>,
  view: AnimalView,
): void {
  const style = STYLES[species]

  if (layers.has('shadow')) {
    g.fillStyle(INK, 0.16)
    g.fillEllipse(64, 119, 62, 12)
  }
  if (layers.has('tail')) drawTail(g, species, style, view)
  if (layers.has('feet')) {
    if (view === 'side') {
      drawSidePawArt(g, species, style, FOOT_LEFT, 112)
      drawSidePawArt(g, species, style, FOOT_RIGHT, 112)
    } else {
      drawPawArt(g, species, style, FOOT_LEFT, 112)
      drawPawArt(g, species, style, FOOT_RIGHT, 112)
    }
  }
  if (layers.has('body')) drawBody(g, species, style, player, view)
  if (layers.has('head')) drawHead(g, species, style, player, view)
}

/**
 * A role's body piece with clothing baked in: the staff rig swaps this texture
 * in for the bare `body` part so the uniform inherits every gait transform.
 */
export function drawClothedBody(
  scene: Phaser.Scene,
  species: SpeciesId,
  dress: (graphics: Phaser.GameObjects.Graphics, view: AnimalView) => void,
  view: AnimalView = 'front',
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics()
  drawAnimalInto(g, species, false, PART_LAYERS.body, view)
  dress(g, view)
  if (view !== 'front') drawAnimalInto(g, species, false, PART_LAYERS.head, view)
  return g
}

/**
 * A full portrait with the clothing slipped underneath the head, so a collar
 * never covers the muzzle. Used by shop cards and staff signs.
 */
export function drawClothedPortrait(
  scene: Phaser.Scene,
  species: SpeciesId,
  dress: (graphics: Phaser.GameObjects.Graphics) => void,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics()
  drawAnimalInto(g, species, false, BODY_LAYERS, 'front')
  dress(g)
  drawAnimalInto(g, species, false, PART_LAYERS.head, 'front')
  return g
}

function drawTail(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  s: AnimalStyle,
  view: AnimalView,
): void {
  if (view === 'front') {
    drawFrontTail(g, species, s)
    return
  }
  if (species === 'frog' || species === 'hedgehog' || species === 'owl') return
  if (view === 'side' || view === 'frontSide') {
    const pivot = sideTailPivot(species)
    g.save()
    g.translateCanvas(pivot.x, pivot.y)
    g.scaleCanvas(-1, 1)
    g.translateCanvas(-96, -98)
    drawFrontTail(g, species, s)
    g.restore()
    return
  }
  const pivot = tailPivot(species, view)
  g.save()
  g.translateCanvas(pivot.x, pivot.y)
  if (view === 'backSide') g.scaleCanvas(-1, 1)
  g.translateCanvas(-96, -98)
  drawFrontTail(g, species, s)
  g.restore()
}

function drawFrontTail(g: Phaser.GameObjects.Graphics, species: SpeciesId, s: AnimalStyle): void {
  switch (species) {
    case 'bear':
      g.fillStyle(s.bodyDark, 1)
      g.fillCircle(98, 96, 9)
      g.fillStyle(s.body, 1)
      g.fillCircle(97, 94, 6)
      break
    case 'cat':
      curveTail(g, { x: 91, y: 101 }, { x: 116, y: 88 }, { x: 108, y: 63 }, 7, s.bodyDark)
      g.fillStyle(s.body, 1)
      g.fillCircle(108, 63, 5)
      g.fillStyle(s.bodyLight, 1)
      g.fillCircle(107, 61, 2)
      break
    case 'rabbit':
      g.fillStyle(s.bodyDark, 1)
      g.fillCircle(98, 98, 9)
      g.fillStyle(s.body, 1)
      g.fillCircle(97, 96, 7)
      break
    case 'fox':
      curveTail(g, { x: 91, y: 102 }, { x: 120, y: 88 }, { x: 113, y: 58 }, 15, s.bodyDark)
      curveTail(g, { x: 93, y: 100 }, { x: 115, y: 88 }, { x: 111, y: 62 }, 10, s.body)
      g.fillStyle(s.face, 1)
      g.fillEllipse(113, 57, 15, 13)
      g.fillStyle(WHITE, 0.6)
      g.fillEllipse(112, 55, 7, 5)
      break
    case 'panda':
      g.fillStyle(s.bodyDark, 1)
      g.fillCircle(97, 98, 9)
      g.fillStyle(s.body, 1)
      g.fillCircle(97, 97, 7)
      break
    case 'pig':
      g.lineStyle(4, s.bodyDark, 1)
      g.beginPath()
      g.arc(100, 88, 7, -0.4, 4.2)
      g.strokePath()
      break
    case 'dog':
      curveTail(g, { x: 92, y: 100 }, { x: 114, y: 84 }, { x: 108, y: 64 }, 8, s.bodyDark)
      g.fillStyle(s.body, 1)
      g.fillCircle(108, 63, 5)
      break
    case 'squirrel': {
      const tail = [
        { x: 98, y: 104, r: 12 },
        { x: 106, y: 92, r: 15 },
        { x: 110, y: 78, r: 15 },
        { x: 107, y: 62, r: 13 },
        { x: 101, y: 48, r: 10 },
      ]
      for (const point of tail) {
        g.fillStyle(s.bodyDark, 1)
        g.fillCircle(point.x, point.y, point.r + 2)
      }
      for (const point of tail) {
        g.fillStyle(s.body, 1)
        g.fillCircle(point.x, point.y, point.r)
      }
      for (const point of tail) {
        g.fillStyle(s.bodyLight, 0.55)
        g.fillCircle(point.x - 4, point.y - 4, point.r * 0.55)
      }
      break
    }
    case 'raccoon': {
      const tail = [
        { x: 94, y: 104, color: s.body },
        { x: 103, y: 96, color: s.bodyDark },
        { x: 109, y: 87, color: s.body },
        { x: 112, y: 77, color: s.bodyDark },
        { x: 110, y: 67, color: s.body },
      ]
      for (const point of tail) {
        g.fillStyle(INK, 1)
        g.fillCircle(point.x, point.y, 12)
        g.fillStyle(point.color, 1)
        g.fillCircle(point.x, point.y, 10)
      }
      break
    }
    case 'deer':
      g.fillStyle(s.bodyDark, 1)
      g.fillCircle(96, 92, 6)
      g.fillStyle(s.face, 1)
      g.fillCircle(96, 91, 4)
      break
    case 'duck':
      g.fillStyle(s.body, 1)
      g.fillTriangle(92, 92, 104, 82, 98, 96)
      g.fillTriangle(92, 98, 106, 92, 99, 102)
      g.fillStyle(s.bodyDark, 1)
      g.fillTriangle(94, 94, 103, 87, 98, 96)
      break
    case 'frog':
    case 'hedgehog':
    case 'owl':
      break
  }
}

type EarShape = 'round' | 'triangle' | 'long' | 'floppy' | 'tuft' | 'none'
type MuzzleShape = 'round' | 'snout' | 'beak' | 'wide' | 'pig' | 'none'

interface TurnHead {
  readonly skullR: number
  readonly skullRY: number
  readonly skullY: number
  readonly ear: EarShape
  readonly earX: number
  readonly earY: number
  readonly earW: number
  readonly earH: number
  readonly earTilt: number
  readonly muzzle: MuzzleShape
  readonly muzzleY: number
  readonly muzzleW: number
  readonly muzzleH: number
  readonly eyeX: number
  readonly eyeY: number
  readonly eyeR: number
  readonly blushX: number
  readonly blushY: number
}

const TURN_HEADS: Readonly<Record<SpeciesId, TurnHead>> = {
  bear: {
    skullR: 27,
    skullRY: 27,
    skullY: 54,
    ear: 'round',
    earX: 25,
    earY: 31,
    earW: 14,
    earH: 14,
    earTilt: 0,
    muzzle: 'round',
    muzzleY: 68,
    muzzleW: 34,
    muzzleH: 23,
    eyeX: 12,
    eyeY: 52,
    eyeR: 4.2,
    blushX: 24,
    blushY: 66,
  },
  cat: {
    skullR: 26,
    skullRY: 26,
    skullY: 54,
    ear: 'triangle',
    earX: 24,
    earY: 11,
    earW: 18,
    earH: 28,
    earTilt: 0.12,
    muzzle: 'round',
    muzzleY: 69,
    muzzleW: 28,
    muzzleH: 19,
    eyeX: 12,
    eyeY: 52,
    eyeR: 4.3,
    blushX: 24,
    blushY: 66,
  },
  rabbit: {
    skullR: 26,
    skullRY: 26,
    skullY: 55,
    ear: 'long',
    earX: 13,
    earY: 29,
    earW: 16,
    earH: 46,
    earTilt: 0.04,
    muzzle: 'round',
    muzzleY: 70,
    muzzleW: 28,
    muzzleH: 20,
    eyeX: 12,
    eyeY: 52,
    eyeR: 4.4,
    blushX: 24,
    blushY: 66,
  },
  fox: {
    skullR: 26,
    skullRY: 26,
    skullY: 55,
    ear: 'triangle',
    earX: 25,
    earY: 9,
    earW: 20,
    earH: 32,
    earTilt: 0.16,
    muzzle: 'snout',
    muzzleY: 69,
    muzzleW: 27,
    muzzleH: 20,
    eyeX: 12,
    eyeY: 52,
    eyeR: 3.8,
    blushX: 24,
    blushY: 67,
  },
  panda: {
    skullR: 27,
    skullRY: 27,
    skullY: 54,
    ear: 'round',
    earX: 25,
    earY: 30,
    earW: 14,
    earH: 14,
    earTilt: 0,
    muzzle: 'round',
    muzzleY: 69,
    muzzleW: 27,
    muzzleH: 19,
    eyeX: 12,
    eyeY: 53,
    eyeR: 4.4,
    blushX: 24,
    blushY: 67,
  },
  frog: {
    skullR: 29,
    skullRY: 24,
    skullY: 60,
    ear: 'none',
    earX: 0,
    earY: 0,
    earW: 0,
    earH: 0,
    earTilt: 0,
    muzzle: 'wide',
    muzzleY: 76,
    muzzleW: 40,
    muzzleH: 15,
    eyeX: 18,
    eyeY: 48,
    eyeR: 8.5,
    blushX: 28,
    blushY: 76,
  },
  pig: {
    skullR: 27,
    skullRY: 27,
    skullY: 54,
    ear: 'floppy',
    earX: 27,
    earY: 44,
    earW: 14,
    earH: 22,
    earTilt: 0.35,
    muzzle: 'pig',
    muzzleY: 68,
    muzzleW: 28,
    muzzleH: 20,
    eyeX: 13,
    eyeY: 50,
    eyeR: 4,
    blushX: 25,
    blushY: 60,
  },
  dog: {
    skullR: 27,
    skullRY: 27,
    skullY: 54,
    ear: 'floppy',
    earX: 29,
    earY: 58,
    earW: 15,
    earH: 31,
    earTilt: 0,
    muzzle: 'snout',
    muzzleY: 69,
    muzzleW: 30,
    muzzleH: 21,
    eyeX: 12,
    eyeY: 52,
    eyeR: 4.2,
    blushX: 24,
    blushY: 65,
  },
  squirrel: {
    skullR: 26,
    skullRY: 26,
    skullY: 56,
    ear: 'tuft',
    earX: 17,
    earY: 15,
    earW: 18,
    earH: 30,
    earTilt: 0.12,
    muzzle: 'round',
    muzzleY: 70,
    muzzleW: 24,
    muzzleH: 18,
    eyeX: 12,
    eyeY: 53,
    eyeR: 4.4,
    blushX: 22,
    blushY: 67,
  },
  hedgehog: {
    skullR: 16,
    skullRY: 14,
    skullY: 86,
    ear: 'round',
    earX: 16,
    earY: 73,
    earW: 6,
    earH: 6,
    earTilt: 0,
    muzzle: 'snout',
    muzzleY: 97,
    muzzleW: 16,
    muzzleH: 11,
    eyeX: 8,
    eyeY: 84,
    eyeR: 3.4,
    blushX: 13,
    blushY: 92,
  },
  raccoon: {
    skullR: 26,
    skullRY: 26,
    skullY: 55,
    ear: 'triangle',
    earX: 23,
    earY: 14,
    earW: 18,
    earH: 26,
    earTilt: 0.12,
    muzzle: 'round',
    muzzleY: 70,
    muzzleW: 26,
    muzzleH: 18,
    eyeX: 12,
    eyeY: 52,
    eyeR: 3.8,
    blushX: 24,
    blushY: 66,
  },
  deer: {
    skullR: 26,
    skullRY: 26,
    skullY: 55,
    ear: 'floppy',
    earX: 28,
    earY: 48,
    earW: 16,
    earH: 24,
    earTilt: 0.4,
    muzzle: 'snout',
    muzzleY: 70,
    muzzleW: 25,
    muzzleH: 18,
    eyeX: 12,
    eyeY: 52,
    eyeR: 4.3,
    blushX: 24,
    blushY: 66,
  },
  owl: {
    skullR: 30,
    skullRY: 25,
    skullY: 58,
    ear: 'tuft',
    earX: 20,
    earY: 15,
    earW: 14,
    earH: 24,
    earTilt: 0.08,
    muzzle: 'beak',
    muzzleY: 65,
    muzzleW: 14,
    muzzleH: 13,
    eyeX: 17,
    eyeY: 58,
    eyeR: 7.5,
    blushX: 23,
    blushY: 68,
  },
  duck: {
    skullR: 26,
    skullRY: 26,
    skullY: 55,
    ear: 'none',
    earX: 0,
    earY: 0,
    earW: 0,
    earH: 0,
    earTilt: 0,
    muzzle: 'beak',
    muzzleY: 68,
    muzzleW: 26,
    muzzleH: 12,
    eyeX: 12,
    eyeY: 52,
    eyeR: 4,
    blushX: 24,
    blushY: 66,
  },
}

interface TurnedEye extends BlinkEye {
  readonly scale: number
}

/** Eye anchor shared by the turn renderer and the blink overlay. */
function turnedEye(species: SpeciesId, turn: number, far: boolean): TurnedEye {
  const head = TURN_HEADS[species]
  if (species === 'frog') {
    const scale = far ? 1 - 0.45 * turn : 1
    return {
      x: far ? 64 - 18 * (1 - 0.25 * turn) : 64 + 18 * (0.95 + 0.05 * turn),
      y: head.eyeY,
      r: head.eyeR * scale,
      scale,
    }
  }
  if (species === 'owl') {
    const scale = far ? 1 - 0.5 * turn : 1
    return {
      x: far ? 64 - 17 * (1 - 0.3 * turn) : 64 + 17 * (0.95 + 0.05 * turn),
      y: head.eyeY,
      r: head.eyeR * scale,
      scale,
    }
  }
  const scale = far ? Math.max(0, 1 - 0.9 * turn) : 1
  return {
    x: far ? 64 - head.eyeX * (1 - 0.35 * turn) : 64 + head.eyeX * (0.65 + 0.25 * turn),
    y: head.eyeY,
    r: head.eyeR * scale,
    scale,
  }
}

function drawTurnedHead(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  s: AnimalStyle,
  player: boolean,
  view: AnimalView,
): void {
  const turn = view === 'side' ? 1 : view === 'back' ? 0 : 0.55
  if (view === 'back' || view === 'backSide') drawTurnedBackHead(g, species, s, player, turn)
  else drawTurnedFaceHead(g, species, s, player, turn)
}

function drawTurnedEar(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  s: AnimalStyle,
  head: TurnHead,
  x: number,
  y: number,
  scale: number,
  sideSign: 1 | -1,
  back: boolean,
  inner: boolean,
): void {
  if (head.ear === 'none') return
  const panda = species === 'panda'
  const outer = panda ? INK : s.bodyDark
  const fill = panda ? 0x4a4045 : s.body
  const w = head.earW * scale
  const h = head.earH * scale
  g.save()
  g.translateCanvas(x, y)
  g.rotateCanvas(head.earTilt * sideSign)
  if (head.ear === 'round') {
    g.fillStyle(INK, 1)
    g.fillCircle(0, 0, w + 1)
    g.fillStyle(outer, 1)
    g.fillCircle(0, 0, w)
    g.fillStyle(fill, 1)
    g.fillCircle(0, 0, w - 2)
    if (inner && !back) {
      g.fillStyle(s.earInner, 1)
      g.fillCircle(0, 1, w * 0.42)
    }
    if (back) {
      g.fillStyle(s.bodyDark, 0.5)
      g.fillCircle(0, 1, w * 0.45)
    }
  } else if (head.ear === 'triangle') {
    g.fillStyle(INK, 1)
    g.fillTriangle(-w, h / 2, w, h / 2, w * 0.55, -h / 2)
    g.fillStyle(outer, 1)
    g.fillTriangle(-w + 2, h / 2 - 1, w - 2, h / 2 - 1, w * 0.55, -h / 2 + 2)
    g.fillStyle(fill, 1)
    g.fillTriangle(-w + 4, h / 2 - 2, w - 4, h / 2 - 2, w * 0.55, -h / 2 + 4)
    if (inner && !back) {
      g.fillStyle(s.earInner, 1)
      g.fillTriangle(-w * 0.45, h / 2 - 3, w * 0.45, h / 2 - 3, w * 0.45, -h / 2 + 8)
    }
    if (back) {
      g.lineStyle(1.4, outer, 0.7)
      g.lineBetween(0, -h / 2 + 4, 0, h / 2 - 3)
    }
  } else if (head.ear === 'long') {
    g.fillStyle(INK, 1)
    g.fillEllipse(0, 0, w + 2, h + 2)
    g.fillStyle(outer, 1)
    g.fillEllipse(0, 0, w, h)
    g.fillStyle(fill, 1)
    g.fillEllipse(0, -1, w - 3, h - 3)
    if (inner && !back) {
      g.fillStyle(s.earInner, 1)
      g.fillEllipse(0, 1, w * 0.5, h * 0.64)
    } else if (back) {
      g.lineStyle(1.4, outer, 0.55)
      g.lineBetween(0, -h * 0.4, 0, h * 0.4)
    }
  } else if (head.ear === 'floppy') {
    g.fillStyle(INK, 1)
    g.fillEllipse(0, 0, w + 2, h + 2)
    g.fillStyle(outer, 1)
    g.fillEllipse(0, 0, w, h)
    g.fillStyle(fill, 1)
    g.fillEllipse(0, -1, w - 3, h - 3)
    if (inner && !back) {
      g.fillStyle(s.earInner, 1)
      g.fillEllipse(0, 2, w * 0.55, h * 0.62)
    } else if (back) {
      g.lineStyle(1.2, outer, 0.45)
      g.lineBetween(0, -h * 0.35, 0, h * 0.35)
    }
  } else if (head.ear === 'tuft') {
    g.fillStyle(INK, 1)
    g.fillTriangle(-w, h / 2, w, h / 2, w * 0.35, -h / 2)
    g.fillStyle(outer, 1)
    g.fillTriangle(-w + 2, h / 2 - 1, w - 2, h / 2 - 1, w * 0.35, -h / 2 + 2)
    g.fillStyle(fill, 1)
    g.fillTriangle(-w + 4, h / 2 - 2, w - 4, h / 2 - 2, w * 0.35, -h / 2 + 4)
    if (inner && !back) {
      g.fillStyle(s.earInner, 1)
      g.fillTriangle(-w * 0.4, h / 2 - 3, w * 0.4, h / 2 - 3, w * 0.35, -h / 2 + 10)
    }
    g.fillStyle(panda ? 0xd4cec2 : s.bodyLight, 1)
    g.fillTriangle(w * 0.35, -h / 2 + 3, w * 0.2, -h / 2 - 7, w * 0.55, -h / 2 + 1)
    g.fillTriangle(w * 0.2, -h / 2 + 3, w * 0.02, -h / 2 - 5, w * 0.4, -h / 2 + 1)
  }
  g.restore()
}

function drawTurnedFaceHead(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  s: AnimalStyle,
  player: boolean,
  turn: number,
): void {
  const head = TURN_HEADS[species]
  const farScale = 1 - 0.18 * turn
  const nearScale = 1

  if (species === 'deer') drawAntlers(g, turn)
  if (head.ear !== 'none') {
    drawTurnedEar(
      g,
      species,
      s,
      head,
      64 - head.earX * (1 - 0.28 * turn),
      head.earY,
      farScale,
      -1,
      false,
      true,
    )
    drawTurnedEar(
      g,
      species,
      s,
      head,
      64 + head.earX * (0.92 + 0.08 * turn),
      head.earY,
      nearScale,
      1,
      false,
      true,
    )
  }

  drawTurnedSkull(g, species, s, head, turn)
  drawTurnedMuzzle(g, s, head, turn)
  drawTurnedFaceExtrasBefore(g, species, s, turn)
  drawTurnedEyes(g, species, s, head, turn)
  drawTurnedNoseAndMouth(g, species, s, head, turn)
  drawTurnedFaceExtrasAfter(g, species, s, head, turn)

  const nearBlush = 64 + head.blushX * (0.9 + 0.1 * turn)
  drawBlush(g, nearBlush, head.blushY, s.accent)
  if (turn < 0.75) {
    drawBlush(g, 64 - head.blushX * (1 - 0.3 * turn), head.blushY, s.accent)
  }

  if (player) drawCapTurned(g, turn)
}

function drawTurnedSkull(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  s: AnimalStyle,
  head: TurnHead,
  turn: number,
): void {
  const rx = head.skullR * (1 - 0.04 * turn) * (1 - 0.18 * turn)
  const ry = head.skullRY
  if (species === 'hedgehog') {
    g.fillStyle(INK, 1)
    g.fillEllipse(64, head.skullY, rx * 2 + 2, ry * 2 + 2)
    g.fillStyle(s.bodyDark, 1)
    g.fillEllipse(64, head.skullY, rx * 2, ry * 2)
    g.fillStyle(s.face, 1)
    g.fillEllipse(64, head.skullY, rx * 2 - 3, ry * 2 - 3)
    g.fillStyle(s.bodyLight, 0.65)
    g.fillEllipse(64 - 7, head.skullY - 9, 10, 6)
    return
  }
  g.fillStyle(INK, 1)
  g.fillEllipse(64, head.skullY, rx * 2 + 2, ry * 2 + 2)
  g.fillStyle(s.bodyDark, 1)
  g.fillEllipse(64, head.skullY, rx * 2, ry * 2)
  g.fillStyle(s.body, 1)
  g.fillEllipse(63, head.skullY - 1, rx * 2 - 3, ry * 2 - 3)
  g.fillStyle(WHITE, 0.18)
  g.fillEllipse(64 - rx * 0.4, head.skullY - ry * 0.62, 13, 8)
  if (turn > 0) {
    g.fillStyle(INK, 0.05 + 0.05 * turn)
    g.fillEllipse(64 - rx * 0.55, head.skullY + 2, rx * 0.7, ry * 1.5)
  }
}

function drawTurnedMuzzle(
  g: Phaser.GameObjects.Graphics,
  s: AnimalStyle,
  head: TurnHead,
  turn: number,
): void {
  if (head.muzzle === 'none') return
  const mx = 64 + (1 + head.muzzleW * 0.24) * turn
  const my = head.muzzleY
  if (head.muzzle === 'beak') {
    const tip = mx + head.muzzleW * (0.55 + 0.25 * turn)
    g.fillStyle(BEAK, 1)
    g.fillTriangle(
      mx - head.muzzleW * 0.5,
      my - head.muzzleH * 0.55,
      tip,
      my,
      mx - head.muzzleW * 0.5,
      my + head.muzzleH * 0.55,
    )
    g.fillStyle(0xc98b2f, 1)
    g.fillTriangle(
      mx - head.muzzleW * 0.35,
      my + 1,
      tip - 2,
      my + 1,
      mx - head.muzzleW * 0.3,
      my + head.muzzleH * 0.5,
    )
    return
  }
  if (head.muzzle === 'pig') {
    g.fillStyle(s.nose, 1)
    g.fillEllipse(mx, my, head.muzzleW * (0.9 + 0.2 * turn), head.muzzleH)
    g.fillStyle(0x8f3f52, 0.8)
    g.fillCircle(mx - 5 + 4 * turn, my, 2)
    g.fillCircle(mx + 5 + 4 * turn, my, 2)
    g.fillStyle(WHITE, 0.35)
    g.fillEllipse(mx - 3, my - 5, 8, 3)
    return
  }
  if (head.muzzle === 'wide') {
    g.fillStyle(s.bodyLight, 0.9)
    g.fillEllipse(mx, my, head.muzzleW, head.muzzleH)
    g.lineStyle(2.6, INK, 0.8)
    g.beginPath()
    g.arc(mx, my - 4, head.muzzleW * 0.42, 0.2, Math.PI - 0.2)
    g.strokePath()
    return
  }
  g.fillStyle(s.face, 1)
  g.fillEllipse(mx, my, head.muzzleW * (0.9 + 0.2 * turn), head.muzzleH)
  if (head.muzzle === 'snout') {
    g.fillStyle(WHITE, 0.18)
    g.fillEllipse(mx - 3, my - head.muzzleH * 0.3, head.muzzleW * 0.4, 4)
  }
}

function drawTurnedFaceExtrasBefore(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  s: AnimalStyle,
  turn: number,
): void {
  if (species === 'panda') {
    for (const far of [true, false]) {
      const eye = turnedEye(species, turn, far)
      if (eye.scale < 0.25) continue
      g.save()
      g.translateCanvas(eye.x, eye.y)
      g.rotateCanvas((far ? -1 : 1) * 0.22)
      g.scaleCanvas(eye.scale, eye.scale)
      g.fillStyle(INK, 1)
      g.fillEllipse(0, 0, 21, 17)
      g.restore()
    }
  }
  if (species === 'raccoon') {
    const near = turnedEye(species, turn, false)
    const far = turnedEye(species, turn, true)
    g.fillStyle(s.accent, 1)
    g.fillEllipse(near.x, near.y, 24, 17)
    if (far.scale > 0.3) g.fillEllipse(far.x, far.y, 24 * far.scale, 17 * far.scale)
    g.fillStyle(INK, 0.85)
    g.fillRect(64 - 12, near.y - 5, 24 + 12 * turn, 2)
  }
  if (species === 'owl') {
    for (const far of [true, false]) {
      const eye = turnedEye(species, turn, far)
      g.save()
      g.translateCanvas(eye.x, eye.y)
      g.scaleCanvas(eye.scale, eye.scale)
      g.fillStyle(s.bodyDark, 1)
      g.fillCircle(0, 0, 18)
      g.fillStyle(s.face, 1)
      g.fillCircle(0, 0, 15)
      g.restore()
    }
  }
  if (species === 'frog') {
    for (const far of [true, false]) {
      const eye = turnedEye(species, turn, far)
      g.save()
      g.translateCanvas(eye.x, eye.y - 6)
      g.scaleCanvas(eye.scale, eye.scale)
      g.fillStyle(INK, 1)
      g.fillCircle(0, 0, 16)
      g.fillStyle(s.bodyDark, 1)
      g.fillCircle(0, 0, 14)
      g.fillStyle(WHITE, 1)
      g.fillCircle(0, 0, 9)
      g.fillStyle(INK, 1)
      g.fillCircle(eye.x > 64 ? 1 : -1, 0, 4.4)
      g.fillStyle(WHITE, 0.9)
      g.fillCircle(-2, -2, 1.6)
      g.restore()
    }
  }
  if (species === 'cat') {
    g.lineStyle(1.5, s.bodyDark, 0.8)
    for (let index = -1; index <= 1; index += 1) {
      g.lineBetween(64 - 12 + index * 2, 42 + index * 3, 64 - 22 + index * 2, 40 + index * 5)
    }
  }
}

function drawTurnedEyes(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  _s: AnimalStyle,
  head: TurnHead,
  turn: number,
): void {
  if (species === 'frog') return
  if (species === 'owl') {
    for (const far of [true, false]) {
      const eye = turnedEye(species, turn, far)
      if (eye.scale < 0.3) continue
      g.save()
      g.translateCanvas(eye.x, eye.y)
      g.scaleCanvas(eye.scale, eye.scale)
      drawEye(g, 0, 0, 7)
      g.restore()
    }
    return
  }
  const far = turnedEye(species, turn, true)
  const near = turnedEye(species, turn, false)
  if (far.scale > 0.3) {
    g.save()
    g.translateCanvas(far.x, far.y)
    g.scaleCanvas(far.scale, far.scale)
    drawEye(g, 0, 0, head.eyeR)
    g.restore()
  }
  drawEye(g, near.x, near.y, head.eyeR)
  if (species === 'fox') {
    g.lineStyle(2, _s.bodyDark, 0.8)
    g.lineBetween(near.x - 5, near.y - 6, near.x + 4, near.y - 4)
    if (far.scale > 0.3) g.lineBetween(far.x - 4, far.y - 4, far.x + 5, far.y - 6)
  }
}

function drawTurnedNoseAndMouth(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  s: AnimalStyle,
  head: TurnHead,
  turn: number,
): void {
  const mx = 64 + (1 + head.muzzleW * 0.24) * turn
  const my = head.muzzleY
  if (head.muzzle === 'pig' || head.muzzle === 'wide') return
  if (head.muzzle === 'beak') {
    g.lineStyle(1.6, 0xc98b2f, 0.9)
    g.lineBetween(mx - 2, my + 2, mx + head.muzzleW * 0.55, my + 2)
    return
  }
  if (head.muzzle === 'none') return
  const nx = mx + (head.muzzleW * 0.12 + 2) * turn
  const ny = my - head.muzzleH * 0.14
  if (species === 'cat' || species === 'rabbit' || species === 'squirrel') {
    g.fillStyle(s.nose, 1)
    g.fillTriangle(nx - 4, ny - 2, nx + 4, ny - 2, nx, ny + 4)
  } else {
    g.fillStyle(s.nose, 1)
    g.fillEllipse(nx, ny, 9, 7)
    g.fillStyle(WHITE, 0.35)
    g.fillEllipse(nx - 1, ny - 1, 3, 2)
  }
  drawMouth(g, nx - 1, my + head.muzzleH * 0.22, 4.5)

  if (species === 'rabbit' || species === 'squirrel') {
    g.fillStyle(WHITE, 1)
    g.fillRoundedRect(nx - 4, my + head.muzzleH * 0.28, 3.5, 6, 1.4)
    g.fillRoundedRect(nx + 1, my + head.muzzleH * 0.28, 3.5, 6, 1.4)
  }
  if (species === 'dog') {
    g.fillStyle(0xe87a86, 1)
    g.fillRoundedRect(nx - 4, my + 5, 8, 10, 4)
    g.fillStyle(0xc95b70, 0.7)
    g.lineBetween(nx, my + 8, nx, my + 13)
  }
  if (species === 'deer') {
    g.fillStyle(s.accent, 0.8)
    g.fillCircle(64, 39, 2.2)
    g.fillCircle(57, 42, 1.7)
    g.fillCircle(71, 42, 1.7)
  }
}

function drawTurnedFaceExtrasAfter(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  s: AnimalStyle,
  head: TurnHead,
  turn: number,
): void {
  if (species === 'cat') {
    const near = turnedEye(species, turn, false)
    g.lineStyle(1.2, INK, 0.55)
    for (let index = 0; index < 3; index += 1) {
      g.lineBetween(near.x + 2, near.y + 12 + index * 3, near.x + 20, near.y + 9 + index * 4)
    }
  }
  if (species === 'fox') {
    g.fillStyle(s.face, 1)
    g.fillTriangle(64 + 18, head.muzzleY + 4, 64 + 30, head.muzzleY - 4, 64 + 22, head.muzzleY + 12)
  }
  if (species === 'duck') {
    g.fillStyle(s.bodyDark, 1)
    g.fillTriangle(64 + 2, head.eyeY - 20, 64 + 12, head.eyeY - 34, 64 + 14, head.eyeY - 18)
  }
  if (species === 'hedgehog') {
    g.fillStyle(s.bodyLight, 1)
    g.fillEllipse(64 + 6 * turn, head.muzzleY, 12, 8)
  }
}

function drawTurnedBackHead(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  s: AnimalStyle,
  player: boolean,
  turn: number,
): void {
  const head = TURN_HEADS[species]
  if (species === 'deer') drawAntlers(g, turn)
  if (head.ear !== 'none') {
    const farScale = 1 - 0.15 * turn
    drawTurnedEar(
      g,
      species,
      s,
      head,
      64 - head.earX * (1 - 0.24 * turn),
      head.earY,
      farScale,
      -1,
      true,
      false,
    )
    drawTurnedEar(
      g,
      species,
      s,
      head,
      64 + head.earX * (0.94 + 0.06 * turn),
      head.earY,
      1,
      1,
      true,
      false,
    )
  }

  if (species === 'hedgehog') {
    g.fillStyle(INK, 1)
    g.fillEllipse(64, head.skullY, 33, 29)
    g.fillStyle(s.bodyDark, 1)
    g.fillEllipse(64, head.skullY, 31, 27)
    g.fillStyle(s.face, 1)
    g.fillEllipse(64, head.skullY, 28, 24)
  } else {
    drawTurnedSkull(g, species, s, head, turn)
  }

  g.fillStyle(s.bodyDark, 0.22)
  g.fillEllipse(64, head.skullY + head.skullRY * 0.55, head.skullR * 1.1, head.skullRY * 0.65)
  g.fillStyle(s.bodyLight, 0.28)
  g.fillEllipse(64 - 5, head.skullY + head.skullRY * 0.3, 10, 6)

  if (species === 'frog') {
    for (const far of [true, false]) {
      const eye = turnedEye(species, turn, far)
      g.save()
      g.translateCanvas(eye.x, eye.y - 6)
      g.scaleCanvas(eye.scale, eye.scale)
      g.fillStyle(INK, 1)
      g.fillCircle(0, 0, 16)
      g.fillStyle(s.bodyDark, 1)
      g.fillCircle(0, 0, 14)
      g.fillStyle(s.body, 1)
      g.fillCircle(0, 0, 12)
      g.restore()
    }
  }

  if (turn > 0.15) {
    const mx = 64 + (2 + head.muzzleW * 0.42) * turn
    if (head.muzzle === 'beak') {
      g.fillStyle(BEAK, 1)
      g.fillTriangle(
        mx - 8,
        head.muzzleY - 5,
        mx + 12 * turn,
        head.muzzleY,
        mx - 8,
        head.muzzleY + 5,
      )
    } else if (head.muzzle === 'pig') {
      g.fillStyle(s.nose, 1)
      g.fillEllipse(mx, head.muzzleY, 14 * turn, 12)
    } else if (head.muzzle !== 'none' && head.muzzle !== 'wide') {
      g.fillStyle(s.face, 1)
      g.fillEllipse(mx, head.muzzleY, head.muzzleW * 0.5 * turn, head.muzzleH * 0.6)
    }
  }

  if (player) drawCapBack(g)
}

function drawAntlers(g: Phaser.GameObjects.Graphics, turn: number): void {
  g.lineStyle(4, HORN, 1)
  g.lineBetween(55, 42, 46, 22)
  g.lineBetween(46, 22, 39, 14)
  g.lineBetween(48, 30, 39, 28)
  g.lineBetween(73, 42, 82 - 4 * turn, 22)
  g.lineBetween(82 - 4 * turn, 22, 89 - 6 * turn, 14)
  g.lineBetween(80 - 4 * turn, 30, 89 - 6 * turn, 28)
}

function drawCapTurned(g: Phaser.GameObjects.Graphics, turn: number): void {
  g.fillStyle(0xf28b5b, 1)
  g.fillEllipse(64 + 4 * turn, 28, 42, 16)
  g.fillStyle(0xe5724a, 1)
  g.fillRoundedRect(42 + 8 * turn, 31, 46, 8, 4)
  g.fillStyle(0xfff3dd, 1)
  g.fillCircle(64 + 2 * turn, 23, 3.4)
}

function drawCapBack(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x8f4b2f, 0.45)
  g.fillEllipse(64, 30, 44, 18)
  g.fillStyle(0xf28b5b, 1)
  g.fillEllipse(64, 28, 42, 17)
  g.fillStyle(0xe5724a, 1)
  g.fillRoundedRect(50, 32, 28, 7, 3.5)
  g.fillStyle(0xfff3dd, 1)
  g.fillCircle(64, 23, 3.4)
  g.lineStyle(2, 0xe5724a, 0.8)
  g.lineBetween(50, 30, 44, 34)
  g.lineBetween(78, 30, 84, 34)
}

function drawTurnedBody(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  s: AnimalStyle,
  player: boolean,
  view: AnimalView,
): void {
  const turn = view === 'side' ? 1 : view === 'back' ? 0 : 0.55
  const isOwl = species === 'owl'
  const isFrog = species === 'frog'
  const isHedgehog = species === 'hedgehog'
  const rx = isOwl
    ? 28
    : isFrog
      ? 31
      : isHedgehog
        ? 23
        : view === 'side'
          ? 26
          : view === 'backSide'
            ? 27
            : 29
  const ry = isOwl ? 26 : isFrog ? 24 : isHedgehog ? 17 : 22
  const y = isHedgehog ? 96 : 92

  if (isHedgehog) drawHedgehogSpines(g, s, view)
  if (isFrog) {
    g.fillStyle(s.bodyDark, 0.45)
    for (const [sx, sy, r] of [
      [43, 86, 5],
      [54, 98, 4],
      [80, 88, 4.5],
      [88, 102, 3.5],
    ] as const) {
      g.fillCircle(sx, sy, r)
    }
  }

  g.fillStyle(INK, 1)
  g.fillEllipse(64, y, rx * 2 + 2, ry * 2 + 2)
  g.fillStyle(s.bodyDark, 1)
  g.fillEllipse(64, y, rx * 2, ry * 2)
  g.fillStyle(s.body, 1)
  g.fillEllipse(63, y - 1, rx * 2 - 4, ry * 2 - 4)
  g.fillStyle(WHITE, 0.15)
  g.fillEllipse(64 - rx * 0.35, y - ry * 0.55, 18, 10)

  if (species === 'deer') {
    g.fillStyle(s.accent, 0.8)
    for (const [sx, sy] of [
      [48, 88],
      [58, 82],
      [76, 88],
      [84, 82],
      [65, 94],
    ] as const) {
      g.fillCircle(sx, sy, 2.4)
    }
  }

  if (view === 'side' || view === 'frontSide') {
    g.fillStyle(s.face, 0.8)
    g.fillEllipse(64 + 8 * turn, y + 10, 28, 18)
  }

  if (species === 'panda') {
    g.fillStyle(INK, 1)
    g.fillRoundedRect(28, y - 10, 13, 28, 6)
    g.fillRoundedRect(87, y - 10, 13, 28, 6)
  } else if (view === 'side') {
    g.fillStyle(s.bodyDark, 0.55)
    g.fillRoundedRect(31, y - 7, 10, 20, 5)
    g.fillStyle(s.bodyDark, 1)
    g.fillRoundedRect(83, y - 9, 13, 22, 6)
    g.fillStyle(s.body, 1)
    g.fillRoundedRect(85, y - 7, 9, 17, 4)
  } else {
    g.fillStyle(s.bodyDark, 1)
    g.fillRoundedRect(29, y - 9, 12, 22, 6)
    g.fillRoundedRect(87, y - 9, 12, 22, 6)
    g.fillStyle(s.body, 1)
    g.fillRoundedRect(31, y - 7, 8, 17, 4)
    g.fillRoundedRect(89, y - 7, 8, 17, 4)
  }

  if (species === 'duck') {
    g.fillStyle(s.bodyLight, 1)
    g.fillEllipse(62 + 6 * turn, y - 2, 16, 22)
    g.fillStyle(s.accent, 0.85)
    g.fillRoundedRect(60 + 6 * turn, y + 1, 8, 5, 2.5)
  }
  if (isOwl) {
    g.lineStyle(1.6, s.bodyDark, 0.6)
    for (let index = 0; index < 3; index += 1) {
      g.beginPath()
      g.arc(64 - 6 + 4 * turn, y - 8 + index * 8, 10, 0.25, Math.PI - 0.25)
      g.strokePath()
    }
  }
  if (species === 'dog') {
    if (view === 'side' || view === 'frontSide') {
      g.lineStyle(5, 0xd9574f, 1)
      g.lineBetween(48, y - 10, 80, y - 10)
      g.fillStyle(0xffd166, 1)
      g.fillCircle(64, y - 5, 5)
      g.fillStyle(0xc98b2f, 1)
      g.fillCircle(64, y - 5, 2.4)
    } else {
      g.lineStyle(4, 0xd9574f, 0.9)
      g.lineBetween(50, y - 13, 78, y - 13)
    }
  }

  if (turn > 0) {
    g.fillStyle(INK, 0.05 + 0.05 * turn)
    g.fillEllipse(64 - rx * 0.55, y, rx * 0.7, ry * 1.5)
  }
  if (view === 'back' || view === 'backSide') {
    g.lineStyle(1.5, s.bodyDark, 0.35)
    g.lineBetween(64, y - ry * 0.8, 64, y + ry * 0.6)
  }

  if (player) drawApronTurned(g, view, turn)
}

function drawHedgehogSpines(
  g: Phaser.GameObjects.Graphics,
  s: AnimalStyle,
  view: AnimalView,
): void {
  const turn = view === 'side' ? 1 : view === 'back' ? 0 : 0.55
  for (let index = 0; index < 13; index += 1) {
    const x = 26 + index * 6.3
    const tipY = 50 + Math.abs(6 - index) * 3
    g.fillStyle(index % 2 === 0 ? s.bodyDark : s.body, 1)
    g.fillTriangle(x - 6, 89, x + 6, 89, x, tipY)
  }
  const sideOffset = 18 * turn
  for (const side of [-1, 1]) {
    for (const offset of [-8, 4, 16]) {
      const baseX = 64 + side * 20 - sideOffset
      const baseY = 78 + offset
      g.fillStyle(s.bodyDark, 1)
      g.fillTriangle(baseX, baseY - 6, baseX, baseY + 6, baseX + side * 18, baseY)
    }
  }
}

function drawApronTurned(g: Phaser.GameObjects.Graphics, view: AnimalView, turn: number): void {
  if (view === 'side' || view === 'backSide') {
    const x = 64 + 18 * turn
    g.fillStyle(0x5fbf9f, 1)
    g.fillRoundedRect(x, 80, 10, 30, 4)
    g.fillStyle(0x4aa98a, 1)
    g.fillRoundedRect(x + 2, 92, 6, 10, 2)
    g.lineStyle(3, 0x4aa98a, 1)
    g.lineBetween(x + 2, 84, x - 10, 78)
    return
  }
  g.lineStyle(4, 0x4aa98a, 1)
  g.lineBetween(50, 88, 57, 72)
  g.lineBetween(78, 88, 71, 72)
  g.lineBetween(50, 88, 78, 104)
  g.lineBetween(78, 88, 50, 104)
  g.fillStyle(0x5fbf9f, 1)
  g.fillRoundedRect(50, 100, 28, 9, 4)
  g.fillStyle(0x4aa98a, 1)
  g.fillCircle(64, 104, 4)
}

function drawSidePawArt(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  s: AnimalStyle,
  x: number,
  y: number,
): void {
  const width = species === 'rabbit' ? 20 : species === 'hedgehog' ? 12 : 17
  const color = species === 'panda' ? INK : s.bodyDark
  g.fillStyle(INK, 1)
  g.fillEllipse(x, y, width + 2, 10)
  g.fillStyle(color, 1)
  g.fillEllipse(x, y - 1, width, 8)
  g.lineStyle(1, INK, 0.3)
  g.lineBetween(x - 2, y, x - 2, y + 4)
  g.lineBetween(x + 2, y, x + 2, y + 4)
}

function drawPawArt(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  s: AnimalStyle,
  x: number,
  y: number,
): void {
  switch (species) {
    case 'frog': {
      g.fillStyle(INK, 1)
      g.fillEllipse(x, y, 19, 10)
      g.fillStyle(s.bodyDark, 1)
      g.fillEllipse(x, y - 1, 16, 8)
      g.lineStyle(1.6, s.bodyDark, 1)
      for (const offset of [-5, 0, 5]) {
        g.lineBetween(x + offset, y, x + offset * 1.5, y + 5)
      }
      break
    }
    case 'owl': {
      g.fillStyle(INK, 1)
      g.fillEllipse(x, y, 13, 9)
      g.fillStyle(BEAK, 1)
      g.fillEllipse(x, y - 1, 10, 6)
      g.lineStyle(1.8, BEAK, 1)
      for (const offset of [-4, 0, 4]) {
        g.lineBetween(x + offset, y + 1, x + offset * 1.4, y + 5)
      }
      break
    }
    case 'duck': {
      g.fillStyle(BEAK, 1)
      g.fillEllipse(x, y, 16, 9)
      g.fillTriangle(x - 7, y, x + 7, y, x, y + 6)
      break
    }
    case 'deer': {
      g.fillStyle(INK, 1)
      g.fillRoundedRect(x - 5, y - 4, 10, 8, 3)
      g.fillStyle(s.bodyDark, 1)
      g.fillRoundedRect(x - 4, y - 3, 8, 6, 2.5)
      break
    }
    default: {
      const width =
        species === 'rabbit' ? 21 : species === 'hedgehog' ? 12 : species === 'squirrel' ? 14 : 17
      const height = species === 'hedgehog' ? 9 : species === 'squirrel' ? 11 : 12
      const color = species === 'panda' ? INK : s.bodyDark
      g.fillStyle(INK, 1)
      g.fillRoundedRect(
        x - width / 2 - 1,
        y - height / 2 - 1,
        width + 2,
        height + 2,
        height / 2 + 1,
      )
      g.fillStyle(color, 1)
      g.fillRoundedRect(x - width / 2, y - height / 2, width, height, height / 2)
      g.lineStyle(1, INK, 0.3)
      g.lineBetween(x - 2, y - 1, x - 2, y + height / 2 - 1)
      g.lineBetween(x + 2, y - 1, x + 2, y + height / 2 - 1)
      break
    }
  }
}

function drawBody(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  s: AnimalStyle,
  player: boolean,
  view: AnimalView,
): void {
  if (view === 'front') {
    drawFrontBody(g, species, s, player)
    return
  }
  if (view === 'frontSide') {
    drawFrontBody(g, species, s, player)
    return
  }
  drawTurnedBody(g, species, s, player, view)
}

function drawFrontBody(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  s: AnimalStyle,
  player: boolean,
): void {
  switch (species) {
    case 'bear':
      drawBearBody(g, s, player)
      break
    case 'cat':
      drawCatBody(g, s)
      break
    case 'rabbit':
      drawRabbitBody(g, s)
      break
    case 'fox':
      drawFoxBody(g, s)
      break
    case 'panda':
      drawPandaBody(g, s)
      break
    case 'frog':
      drawFrogBody(g, s)
      break
    case 'pig':
      drawPigBody(g, s)
      break
    case 'dog':
      drawDogBody(g, s)
      break
    case 'squirrel':
      drawSquirrelBody(g, s)
      break
    case 'hedgehog':
      drawHedgehogBody(g, s)
      break
    case 'raccoon':
      drawRaccoonBody(g, s)
      break
    case 'deer':
      drawDeerBody(g, s)
      break
    case 'owl':
      drawOwlBody(g, s)
      break
    case 'duck':
      drawDuckBody(g, s)
      break
  }
}

function drawHead(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  s: AnimalStyle,
  player: boolean,
  view: AnimalView,
): void {
  if (view === 'front') {
    drawFrontHead(g, species, s, player)
    return
  }
  drawTurnedHead(g, species, s, player, view)
}

function drawFrontHead(
  g: Phaser.GameObjects.Graphics,
  species: SpeciesId,
  s: AnimalStyle,
  player: boolean,
): void {
  switch (species) {
    case 'bear':
      drawBearHead(g, s, player)
      break
    case 'cat':
      drawCatHead(g, s)
      break
    case 'rabbit':
      drawRabbitHead(g, s)
      break
    case 'fox':
      drawFoxHead(g, s)
      break
    case 'panda':
      drawPandaHead(g, s)
      break
    case 'frog':
      drawFrogHead(g, s)
      break
    case 'pig':
      drawPigHead(g, s)
      break
    case 'dog':
      drawDogHead(g, s)
      break
    case 'squirrel':
      drawSquirrelHead(g, s)
      break
    case 'hedgehog':
      drawHedgehogHead(g, s)
      break
    case 'raccoon':
      drawRaccoonHead(g, s)
      break
    case 'deer':
      drawDeerHead(g, s)
      break
    case 'owl':
      drawOwlHead(g, s)
      break
    case 'duck':
      drawDuckHead(g, s)
      break
  }
}

function drawBearBody(g: Phaser.GameObjects.Graphics, s: AnimalStyle, player: boolean): void {
  g.fillStyle(INK, 1)
  g.fillEllipse(64, 90, 66, 48)
  g.fillStyle(s.bodyDark, 1)
  g.fillEllipse(64, 90, 63, 45)
  g.fillStyle(s.body, 1)
  g.fillEllipse(63, 88, 59, 41)
  g.fillStyle(WHITE, 0.16)
  g.fillEllipse(49, 78, 20, 12)
  g.fillStyle(s.bodyLight, 0.55)
  g.fillEllipse(64, 101, 34, 18)

  g.fillStyle(s.bodyDark, 1)
  g.fillRoundedRect(30, 82, 13, 25, 6)
  g.fillRoundedRect(85, 82, 13, 25, 6)
  g.fillStyle(s.body, 1)
  g.fillRoundedRect(32, 84, 9, 20, 4)
  g.fillRoundedRect(87, 84, 9, 20, 4)

  if (player) drawApron(g)
}

function drawBearHead(g: Phaser.GameObjects.Graphics, s: AnimalStyle, player: boolean): void {
  for (const sign of [-1, 1]) {
    g.fillStyle(INK, 1)
    g.fillCircle(64 + sign * 25, 31, 14)
    g.fillStyle(s.bodyDark, 1)
    g.fillCircle(64 + sign * 25, 31, 12)
    g.fillStyle(s.earInner, 1)
    g.fillCircle(64 + sign * 25, 32, 6)
  }

  g.fillStyle(INK, 1)
  g.fillCircle(64, 54, 31)
  g.fillStyle(s.bodyDark, 1)
  g.fillCircle(64, 54, 29)
  g.fillStyle(s.body, 1)
  g.fillCircle(63, 53, 27)
  g.fillStyle(WHITE, 0.2)
  g.fillEllipse(52, 37, 13, 8)

  g.fillStyle(s.face, 0.92)
  g.fillEllipse(64, 68, 34, 23)

  drawEye(g, 52, 52, 4.2)
  drawEye(g, 76, 52, 4.2)
  g.fillStyle(s.nose, 1)
  g.fillEllipse(64, 64, 9, 7)
  g.fillStyle(WHITE, 0.35)
  g.fillEllipse(63, 63, 3, 2)
  drawMouth(g, 64, 69, 6)

  drawBlush(g, 39, 66, s.accent)
  drawBlush(g, 89, 66, s.accent)
  if (player) drawCap(g)
}

function drawCatBody(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  g.fillStyle(INK, 1)
  g.fillEllipse(64, 92, 56, 44)
  g.fillStyle(s.bodyDark, 1)
  g.fillEllipse(64, 92, 53, 41)
  g.fillStyle(s.body, 1)
  g.fillEllipse(63, 90, 50, 38)
  g.fillStyle(WHITE, 0.15)
  g.fillEllipse(50, 82, 17, 10)
  g.fillStyle(s.face, 0.85)
  g.fillEllipse(64, 103, 28, 19)

  g.fillStyle(s.bodyDark, 1)
  g.fillRoundedRect(32, 84, 12, 22, 5)
  g.fillRoundedRect(84, 84, 12, 22, 5)
  g.fillStyle(s.body, 1)
  g.fillRoundedRect(34, 86, 8, 17, 4)
  g.fillRoundedRect(86, 86, 8, 17, 4)
}

function drawCatHead(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  for (const sign of [-1, 1]) {
    g.fillStyle(INK, 1)
    g.fillTriangle(64 + sign * 22, 39, 64 + sign * 6, 39, 64 + sign * 26, 11)
    g.fillStyle(s.bodyDark, 1)
    g.fillTriangle(64 + sign * 20, 38, 64 + sign * 8, 38, 64 + sign * 24, 15)
    g.fillStyle(s.earInner, 1)
    g.fillTriangle(64 + sign * 17, 36, 64 + sign * 11, 36, 64 + sign * 22, 21)
  }

  g.fillStyle(INK, 1)
  g.fillCircle(64, 54, 30)
  g.fillStyle(s.bodyDark, 1)
  g.fillCircle(64, 54, 28)
  g.fillStyle(s.body, 1)
  g.fillCircle(63, 53, 26)
  g.fillStyle(WHITE, 0.18)
  g.fillEllipse(53, 38, 12, 8)

  g.lineStyle(1.5, s.bodyDark, 0.85)
  for (const side of [-1, 1]) {
    for (let index = -1; index <= 1; index += 1) {
      g.lineBetween(64 + side * 12, 43 + index * 3, 64 + side * 22, 41 + index * 5)
    }
  }

  g.fillStyle(s.face, 1)
  g.fillEllipse(64, 69, 28, 19)
  g.fillStyle(s.nose, 1)
  g.fillTriangle(60, 64, 68, 64, 64, 70)
  g.fillStyle(WHITE, 0.4)
  g.fillEllipse(63, 65, 2.4, 1.6)
  drawMouth(g, 64, 71, 5)

  g.lineStyle(1.2, INK, 0.55)
  for (const side of [-1, 1]) {
    for (let index = 0; index < 3; index += 1) {
      g.lineBetween(64 + side * 18, 65 + index * 3, 64 + side * 36, 62 + index * 4)
    }
  }

  drawEye(g, 52, 52, 4.3)
  drawEye(g, 76, 52, 4.3)
  drawBlush(g, 39, 66, s.accent)
  drawBlush(g, 89, 66, s.accent)
}

function drawRabbitBody(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  g.fillStyle(INK, 1)
  g.fillEllipse(64, 93, 54, 46)
  g.fillStyle(s.bodyDark, 1)
  g.fillEllipse(64, 93, 51, 43)
  g.fillStyle(s.body, 1)
  g.fillEllipse(63, 91, 48, 40)
  g.fillStyle(WHITE, 0.35)
  g.fillEllipse(50, 82, 18, 11)
  g.fillStyle(s.face, 0.8)
  g.fillEllipse(64, 104, 30, 20)

  g.fillStyle(s.bodyDark, 1)
  g.fillRoundedRect(33, 86, 12, 20, 6)
  g.fillRoundedRect(83, 86, 12, 20, 6)
  g.fillStyle(s.body, 1)
  g.fillRoundedRect(35, 88, 8, 15, 4)
  g.fillRoundedRect(85, 88, 8, 15, 4)
}

function drawRabbitHead(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  for (const sign of [-1, 1]) {
    const x = 64 + sign * 13
    const y = 29
    g.fillStyle(INK, 1)
    g.fillEllipse(x, y, 16, 46)
    g.fillStyle(s.bodyDark, 1)
    g.fillEllipse(x, y, 13, 43)
    g.fillStyle(s.body, 1)
    g.fillEllipse(x, y - 1, 11, 40)
    g.fillStyle(s.earInner, 1)
    g.fillEllipse(x, y + 1, 6, 29)
  }

  g.fillStyle(INK, 1)
  g.fillCircle(64, 55, 30)
  g.fillStyle(s.bodyDark, 1)
  g.fillCircle(64, 55, 28)
  g.fillStyle(s.body, 1)
  g.fillCircle(63, 54, 26)
  g.fillStyle(WHITE, 0.3)
  g.fillEllipse(53, 40, 12, 8)

  g.fillStyle(s.face, 1)
  g.fillEllipse(64, 70, 28, 20)
  g.fillStyle(s.nose, 1)
  g.fillTriangle(60, 64, 68, 64, 64, 70)
  g.fillStyle(WHITE, 1)
  g.fillRoundedRect(59, 71, 4, 6, 1.5)
  g.fillRoundedRect(65, 71, 4, 6, 1.5)
  drawMouth(g, 64, 72, 5)

  drawEye(g, 52, 52, 4.4)
  drawEye(g, 76, 52, 4.4)
  drawBlush(g, 39, 66, s.accent)
  drawBlush(g, 89, 66, s.accent)
}

function drawFoxBody(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  g.fillStyle(INK, 1)
  g.fillEllipse(64, 93, 54, 42)
  g.fillStyle(s.bodyDark, 1)
  g.fillEllipse(64, 93, 51, 39)
  g.fillStyle(s.body, 1)
  g.fillEllipse(63, 91, 48, 36)
  g.fillStyle(WHITE, 0.15)
  g.fillEllipse(50, 83, 17, 10)
  g.fillStyle(s.face, 0.95)
  g.fillEllipse(64, 103, 28, 21)

  g.fillStyle(s.bodyDark, 1)
  g.fillRoundedRect(32, 86, 12, 20, 5)
  g.fillRoundedRect(84, 86, 12, 20, 5)
  g.fillStyle(s.body, 1)
  g.fillRoundedRect(34, 88, 8, 15, 4)
  g.fillRoundedRect(86, 88, 8, 15, 4)
}

function drawFoxHead(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  for (const sign of [-1, 1]) {
    g.fillStyle(INK, 1)
    g.fillTriangle(64 + sign * 23, 40, 64 + sign * 5, 36, 64 + sign * 28, 8)
    g.fillStyle(s.bodyDark, 1)
    g.fillTriangle(64 + sign * 21, 39, 64 + sign * 7, 36, 64 + sign * 26, 12)
    g.fillStyle(s.earInner, 1)
    g.fillTriangle(64 + sign * 20, 36, 64 + sign * 11, 33, 64 + sign * 24, 15)
  }

  g.fillStyle(s.face, 1)
  g.fillTriangle(40, 64, 48, 57, 47, 74)
  g.fillTriangle(88, 64, 80, 57, 81, 74)

  g.fillStyle(INK, 1)
  g.fillCircle(64, 55, 30)
  g.fillStyle(s.bodyDark, 1)
  g.fillCircle(64, 55, 28)
  g.fillStyle(s.body, 1)
  g.fillCircle(63, 54, 26)
  g.fillStyle(WHITE, 0.18)
  g.fillEllipse(53, 40, 12, 8)

  g.fillStyle(s.face, 1)
  g.fillEllipse(64, 69, 27, 20)
  g.fillStyle(s.nose, 1)
  g.fillEllipse(64, 65, 8, 6)
  drawMouth(g, 64, 71, 5)

  drawEye(g, 52, 52, 3.8)
  drawEye(g, 76, 52, 3.8)
  g.lineStyle(2, s.bodyDark, 0.8)
  g.lineBetween(47, 47, 55, 49)
  g.lineBetween(81, 47, 73, 49)
  drawBlush(g, 39, 67, s.accent)
  drawBlush(g, 89, 67, s.accent)
}

function drawPandaBody(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  g.fillStyle(INK, 1)
  g.fillEllipse(64, 92, 64, 50)
  g.fillStyle(s.bodyDark, 1)
  g.fillEllipse(64, 92, 61, 47)
  g.fillStyle(s.body, 1)
  g.fillEllipse(63, 90, 58, 44)
  g.fillStyle(WHITE, 0.4)
  g.fillEllipse(49, 80, 20, 12)

  g.fillStyle(INK, 1)
  g.fillRoundedRect(28, 82, 15, 30, 7)
  g.fillRoundedRect(85, 82, 15, 30, 7)

  g.lineStyle(3, LEAF_DARK, 1)
  g.lineBetween(92, 102, 96, 82)
  g.fillStyle(LEAF, 1)
  g.fillEllipse(100, 86, 12, 6)
  g.fillEllipse(91, 92, 11, 5)
  g.fillStyle(LEAF_DARK, 1)
  g.lineBetween(96, 88, 104, 85)
  g.lineBetween(94, 94, 87, 92)
}

function drawPandaHead(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  for (const sign of [-1, 1]) {
    g.fillStyle(INK, 1)
    g.fillCircle(64 + sign * 25, 30, 14)
    g.fillStyle(0x4a4045, 1)
    g.fillCircle(64 + sign * 25, 31, 9)
  }

  g.fillStyle(INK, 1)
  g.fillCircle(64, 54, 31)
  g.fillStyle(s.bodyDark, 1)
  g.fillCircle(64, 54, 29)
  g.fillStyle(s.body, 1)
  g.fillCircle(63, 53, 27)
  g.fillStyle(WHITE, 0.6)
  g.fillEllipse(52, 36, 13, 8)

  for (const sign of [-1, 1]) {
    g.save()
    g.translateCanvas(64 + sign * 13, 52)
    g.rotateCanvas(sign * 0.22)
    g.fillStyle(INK, 1)
    g.fillEllipse(0, 0, 21, 17)
    g.restore()
    g.fillStyle(WHITE, 1)
    g.fillCircle(64 + sign * 12, 53, 4)
    g.fillStyle(INK, 1)
    g.fillCircle(64 + sign * 12, 53, 2)
  }

  g.fillStyle(s.face, 1)
  g.fillEllipse(64, 69, 27, 19)
  g.fillStyle(s.nose, 1)
  g.fillEllipse(64, 65, 8, 6)
  drawMouth(g, 64, 71, 5)

  drawBlush(g, 38, 67, s.accent)
  drawBlush(g, 90, 67, s.accent)
}

function drawFrogBody(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  g.fillStyle(INK, 1)
  g.fillEllipse(64, 92, 68, 54)
  g.fillStyle(s.bodyDark, 1)
  g.fillEllipse(64, 92, 65, 51)
  g.fillStyle(s.body, 1)
  g.fillEllipse(63, 90, 62, 48)
  g.fillStyle(s.bodyLight, 0.7)
  g.fillEllipse(64, 102, 38, 28)
  g.fillStyle(s.bodyDark, 0.45)
  g.fillEllipse(43, 96, 10, 7)
  g.fillEllipse(52, 108, 8, 5)
  g.fillEllipse(86, 98, 9, 6)

  g.fillStyle(s.bodyDark, 1)
  g.fillRoundedRect(28, 86, 12, 20, 6)
  g.fillRoundedRect(88, 86, 12, 20, 6)
  g.fillStyle(s.body, 1)
  g.fillRoundedRect(30, 88, 8, 15, 4)
  g.fillRoundedRect(90, 88, 8, 15, 4)

  g.fillStyle(s.face, 0.9)
  g.fillEllipse(64, 86, 20, 10)
}

function drawFrogHead(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  for (const sign of [-1, 1]) {
    g.fillStyle(INK, 1)
    g.fillCircle(64 + sign * 18, 48, 16)
    g.fillStyle(s.bodyDark, 1)
    g.fillCircle(64 + sign * 18, 48, 14)
    g.fillStyle(WHITE, 1)
    g.fillCircle(64 + sign * 18, 48, 9)
    g.fillStyle(INK, 1)
    g.fillCircle(64 + sign * 18, 48, 4.4)
    g.fillStyle(WHITE, 0.9)
    g.fillCircle(64 + sign * 18 - 2, 46, 1.6)
  }

  g.lineStyle(2.6, INK, 0.85)
  g.beginPath()
  g.arc(64, 76, 19, 0.2, Math.PI - 0.2)
  g.strokePath()
  g.fillStyle(s.nose, 0.9)
  g.fillCircle(57, 69, 1.4)
  g.fillCircle(71, 69, 1.4)
  drawBlush(g, 36, 76, s.accent)
  drawBlush(g, 92, 76, s.accent)
}

function drawPigBody(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  g.fillStyle(INK, 1)
  g.fillEllipse(64, 92, 64, 48)
  g.fillStyle(s.bodyDark, 1)
  g.fillEllipse(64, 92, 61, 45)
  g.fillStyle(s.body, 1)
  g.fillEllipse(63, 90, 58, 42)
  g.fillStyle(WHITE, 0.2)
  g.fillEllipse(49, 80, 19, 11)
  g.fillStyle(s.bodyLight, 0.8)
  g.fillEllipse(64, 102, 32, 20)

  g.fillStyle(s.bodyDark, 1)
  g.fillRoundedRect(30, 84, 12, 22, 6)
  g.fillRoundedRect(86, 84, 12, 22, 6)
  g.fillStyle(s.body, 1)
  g.fillRoundedRect(32, 86, 8, 17, 4)
  g.fillRoundedRect(88, 86, 8, 17, 4)
}

function drawPigHead(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  for (const sign of [-1, 1]) {
    g.save()
    g.translateCanvas(64 + sign * 27, 42)
    g.rotateCanvas(sign * 0.35)
    g.fillStyle(INK, 1)
    g.fillEllipse(0, 0, 14, 22)
    g.fillStyle(s.bodyDark, 1)
    g.fillEllipse(0, 0, 11, 19)
    g.fillStyle(s.earInner, 1)
    g.fillEllipse(0, 2, 6, 12)
    g.restore()
  }

  g.fillStyle(INK, 1)
  g.fillCircle(64, 54, 31)
  g.fillStyle(s.bodyDark, 1)
  g.fillCircle(64, 54, 29)
  g.fillStyle(s.body, 1)
  g.fillCircle(63, 53, 27)
  g.fillStyle(WHITE, 0.22)
  g.fillEllipse(52, 37, 13, 8)

  g.fillStyle(s.nose, 1)
  g.fillEllipse(64, 68, 28, 20)
  g.fillStyle(0x8f3f52, 0.8)
  g.fillCircle(58, 68, 2)
  g.fillCircle(70, 68, 2)
  g.fillStyle(WHITE, 0.35)
  g.fillEllipse(62, 63, 8, 3)

  drawEye(g, 51, 50, 4)
  drawEye(g, 77, 50, 4)
  drawMouth(g, 64, 79, 5)
  drawBlush(g, 38, 60, s.accent)
  drawBlush(g, 90, 60, s.accent)
}

function drawDogBody(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  g.fillStyle(INK, 1)
  g.fillEllipse(64, 92, 58, 44)
  g.fillStyle(s.bodyDark, 1)
  g.fillEllipse(64, 92, 55, 41)
  g.fillStyle(s.body, 1)
  g.fillEllipse(63, 90, 52, 38)
  g.fillStyle(WHITE, 0.16)
  g.fillEllipse(50, 82, 18, 11)
  g.fillStyle(s.face, 0.9)
  g.fillEllipse(64, 103, 30, 20)

  g.fillStyle(s.bodyDark, 1)
  g.fillRoundedRect(31, 86, 12, 22, 5)
  g.fillRoundedRect(85, 86, 12, 22, 5)
  g.fillStyle(s.body, 1)
  g.fillRoundedRect(33, 88, 8, 17, 4)
  g.fillRoundedRect(87, 88, 8, 17, 4)

  g.lineStyle(5, 0xd9574f, 1)
  g.lineBetween(48, 83, 80, 83)
  g.fillStyle(0xffd166, 1)
  g.fillCircle(64, 88, 5)
  g.fillStyle(0xc98b2f, 1)
  g.fillCircle(64, 88, 2.4)
}

function drawDogHead(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  g.fillStyle(INK, 1)
  g.fillCircle(64, 54, 31)
  g.fillStyle(s.bodyDark, 1)
  g.fillCircle(64, 54, 29)
  g.fillStyle(s.body, 1)
  g.fillCircle(63, 53, 27)
  g.fillStyle(WHITE, 0.18)
  g.fillEllipse(52, 37, 13, 8)

  for (const sign of [-1, 1]) {
    g.fillStyle(INK, 1)
    g.fillEllipse(64 + sign * 29, 57, 15, 31)
    g.fillStyle(s.earInner, 1)
    g.fillEllipse(64 + sign * 29, 59, 10, 24)
  }

  g.fillStyle(s.face, 1)
  g.fillEllipse(64, 69, 30, 21)
  g.fillStyle(s.nose, 1)
  g.fillEllipse(64, 65, 9, 7)
  drawMouth(g, 64, 73, 5)

  g.fillStyle(0xe87a86, 1)
  g.fillRoundedRect(60, 74, 8, 10, 4)
  g.fillStyle(0xc95b70, 0.7)
  g.lineBetween(64, 77, 64, 82)

  drawEye(g, 52, 52, 4.2)
  drawEye(g, 76, 52, 4.2)
  drawBlush(g, 37, 65, s.accent)
  drawBlush(g, 91, 65, s.accent)
}

function drawSquirrelBody(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  g.fillStyle(INK, 1)
  g.fillEllipse(64, 95, 48, 50)
  g.fillStyle(s.bodyDark, 1)
  g.fillEllipse(64, 95, 45, 47)
  g.fillStyle(s.body, 1)
  g.fillEllipse(63, 93, 42, 44)
  g.fillStyle(WHITE, 0.18)
  g.fillEllipse(51, 84, 15, 10)
  g.fillStyle(s.face, 0.9)
  g.fillEllipse(64, 102, 26, 32)

  g.fillStyle(s.bodyDark, 1)
  g.fillRoundedRect(36, 88, 10, 18, 5)
  g.fillRoundedRect(82, 88, 10, 18, 5)
  g.fillStyle(s.body, 1)
  g.fillRoundedRect(38, 90, 6, 14, 3)
  g.fillRoundedRect(84, 90, 6, 14, 3)

  g.fillStyle(0x8f5734, 1)
  g.fillEllipse(84, 92, 11, 14)
  g.fillStyle(0x6f4b2e, 1)
  g.fillEllipse(84, 87, 14, 6)
  g.lineStyle(2, 0x6f4b2e, 1)
  g.lineBetween(84, 84, 87, 80)
}

function drawSquirrelHead(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  for (const sign of [-1, 1]) {
    g.fillStyle(INK, 1)
    g.fillTriangle(64 + sign * 17, 38, 64 + sign * 4, 36, 64 + sign * 19, 15)
    g.fillStyle(s.bodyDark, 1)
    g.fillTriangle(64 + sign * 15, 37, 64 + sign * 6, 35, 64 + sign * 17, 19)
    g.fillStyle(s.earInner, 1)
    g.fillTriangle(64 + sign * 13, 34, 64 + sign * 8, 33, 64 + sign * 15, 23)
    g.fillStyle(s.bodyLight, 1)
    g.fillTriangle(64 + sign * 18, 17, 64 + sign * 21, 9, 64 + sign * 22, 19)
  }

  g.fillStyle(INK, 1)
  g.fillCircle(64, 56, 30)
  g.fillStyle(s.bodyDark, 1)
  g.fillCircle(64, 56, 28)
  g.fillStyle(s.body, 1)
  g.fillCircle(63, 55, 26)
  g.fillStyle(WHITE, 0.2)
  g.fillEllipse(53, 41, 12, 8)

  g.fillStyle(s.face, 1)
  g.fillEllipse(64, 70, 24, 18)
  g.fillStyle(s.nose, 1)
  g.fillTriangle(61, 65, 67, 65, 64, 70)
  g.fillStyle(WHITE, 1)
  g.fillRoundedRect(60, 72, 3.5, 5, 1.4)
  g.fillRoundedRect(65, 72, 3.5, 5, 1.4)
  drawMouth(g, 64, 73, 4.5)

  drawEye(g, 52, 53, 4.4)
  drawEye(g, 76, 53, 4.4)
  drawBlush(g, 40, 67, s.accent)
  drawBlush(g, 88, 67, s.accent)
}

function drawHedgehogBody(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  for (let index = 0; index < 13; index += 1) {
    const x = 26 + index * 6.3
    const tipY = 50 + Math.abs(6 - index) * 3
    g.fillStyle(index % 2 === 0 ? s.bodyDark : s.body, 1)
    g.fillTriangle(x - 6, 89, x + 6, 89, x, tipY)
  }
  for (const side of [-1, 1]) {
    for (const offset of [-8, 4, 16]) {
      const baseX = 64 + side * 20
      const baseY = 78 + offset
      g.fillStyle(s.bodyDark, 1)
      g.fillTriangle(baseX, baseY - 6, baseX, baseY + 6, baseX + side * 18, baseY)
    }
  }

  g.fillStyle(INK, 1)
  g.fillEllipse(64, 96, 52, 40)
  g.fillStyle(s.bodyDark, 1)
  g.fillEllipse(64, 96, 49, 37)
  g.fillStyle(s.body, 1)
  g.fillEllipse(63, 94, 46, 34)

  g.lineStyle(2, LEAF_DARK, 1)
  g.lineBetween(44, 64, 35, 54)
  g.fillStyle(LEAF, 1)
  g.fillEllipse(32, 50, 14, 7)
  g.fillStyle(LEAF_DARK, 1)
  g.lineBetween(30, 50, 38, 47)
}

function drawHedgehogHead(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  g.fillStyle(s.face, 1)
  g.fillEllipse(64, 86, 31, 27)
  g.fillStyle(s.bodyLight, 0.65)
  g.fillEllipse(57, 77, 10, 6)

  g.fillStyle(s.bodyDark, 1)
  g.fillCircle(48, 73, 6)
  g.fillCircle(80, 73, 6)
  g.fillStyle(s.earInner, 1)
  g.fillCircle(48, 73, 3.2)
  g.fillCircle(80, 73, 3.2)

  g.fillStyle(s.bodyLight, 1)
  g.fillEllipse(64, 97, 16, 11)
  g.fillStyle(INK, 1)
  g.fillEllipse(64, 102, 6, 4)
  drawMouth(g, 64, 99, 4)

  drawEye(g, 56, 84, 3.4)
  drawEye(g, 72, 84, 3.4)
  drawBlush(g, 51, 92, s.accent)
  drawBlush(g, 77, 92, s.accent)
}

function drawRaccoonBody(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  g.fillStyle(INK, 1)
  g.fillEllipse(64, 92, 56, 44)
  g.fillStyle(s.bodyDark, 1)
  g.fillEllipse(64, 92, 53, 41)
  g.fillStyle(s.body, 1)
  g.fillEllipse(63, 90, 50, 38)
  g.fillStyle(WHITE, 0.16)
  g.fillEllipse(50, 82, 17, 10)
  g.fillStyle(s.bodyLight, 0.9)
  g.fillEllipse(64, 102, 26, 20)

  g.fillStyle(s.bodyDark, 1)
  g.fillRoundedRect(32, 86, 12, 20, 5)
  g.fillRoundedRect(84, 86, 12, 20, 5)
  g.fillStyle(s.body, 1)
  g.fillRoundedRect(34, 88, 8, 15, 4)
  g.fillRoundedRect(86, 88, 8, 15, 4)
}

function drawRaccoonHead(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  for (const sign of [-1, 1]) {
    g.fillStyle(INK, 1)
    g.fillTriangle(64 + sign * 20, 38, 64 + sign * 6, 34, 64 + sign * 23, 14)
    g.fillStyle(s.body, 1)
    g.fillTriangle(64 + sign * 18, 37, 64 + sign * 8, 34, 64 + sign * 21, 18)
    g.fillStyle(s.earInner, 1)
    g.fillTriangle(64 + sign * 16, 34, 64 + sign * 10, 32, 64 + sign * 19, 21)
  }

  g.fillStyle(INK, 1)
  g.fillCircle(64, 55, 30)
  g.fillStyle(s.bodyDark, 1)
  g.fillCircle(64, 55, 28)
  g.fillStyle(s.body, 1)
  g.fillCircle(63, 54, 26)
  g.fillStyle(WHITE, 0.18)
  g.fillEllipse(53, 40, 12, 8)

  g.fillStyle(s.accent, 1)
  g.fillRect(52, 48, 24, 10)
  g.fillEllipse(50, 52, 24, 17)
  g.fillEllipse(78, 52, 24, 17)

  g.fillStyle(s.face, 1)
  g.fillEllipse(64, 70, 26, 18)
  g.fillStyle(s.nose, 1)
  g.fillEllipse(64, 66, 8, 6)
  drawMouth(g, 64, 72, 5)
  g.lineStyle(2, INK, 0.75)
  g.lineBetween(64, 38, 64, 46)

  drawEye(g, 51, 52, 3.8)
  drawEye(g, 77, 52, 3.8)
  drawBlush(g, 40, 66, 0xf2a1a1)
  drawBlush(g, 88, 66, 0xf2a1a1)
}

function drawDeerBody(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  g.fillStyle(s.body, 1)
  g.fillRoundedRect(58, 66, 12, 28, 6)

  g.fillStyle(INK, 1)
  g.fillRoundedRect(45, 104, 12, 16, 5)
  g.fillRoundedRect(66, 104, 12, 16, 5)
  g.fillStyle(s.bodyDark, 1)
  g.fillRoundedRect(47, 104, 8, 14, 4)
  g.fillRoundedRect(68, 104, 8, 14, 4)

  g.fillStyle(INK, 1)
  g.fillEllipse(64, 92, 54, 40)
  g.fillStyle(s.bodyDark, 1)
  g.fillEllipse(64, 92, 51, 37)
  g.fillStyle(s.body, 1)
  g.fillEllipse(63, 90, 48, 34)
  g.fillStyle(WHITE, 0.16)
  g.fillEllipse(50, 82, 17, 10)
  g.fillStyle(s.face, 0.9)
  g.fillEllipse(64, 102, 26, 18)
  g.fillStyle(s.accent, 0.85)
  for (const [x, y] of [
    [48, 88],
    [58, 82],
    [76, 88],
    [84, 82],
    [65, 94],
  ] as const) {
    g.fillCircle(x, y, 2.6)
  }

  g.fillStyle(s.bodyDark, 1)
  g.fillRoundedRect(33, 84, 11, 20, 5)
  g.fillRoundedRect(84, 84, 11, 20, 5)
  g.fillStyle(s.body, 1)
  g.fillRoundedRect(35, 86, 7, 15, 3)
  g.fillRoundedRect(86, 86, 7, 15, 3)
}

function drawDeerHead(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  g.lineStyle(4, HORN, 1)
  g.lineBetween(55, 42, 46, 22)
  g.lineBetween(46, 22, 39, 14)
  g.lineBetween(48, 30, 39, 28)
  g.lineBetween(73, 42, 82, 22)
  g.lineBetween(82, 22, 89, 14)
  g.lineBetween(80, 30, 89, 28)

  for (const sign of [-1, 1]) {
    g.save()
    g.translateCanvas(64 + sign * 28, 48)
    g.rotateCanvas(sign * 0.4)
    g.fillStyle(INK, 1)
    g.fillEllipse(0, 0, 16, 24)
    g.fillStyle(s.bodyDark, 1)
    g.fillEllipse(0, 0, 13, 21)
    g.fillStyle(s.body, 1)
    g.fillEllipse(0, -1, 11, 18)
    g.fillStyle(s.earInner, 1)
    g.fillEllipse(0, 1, 6, 13)
    g.restore()
  }

  g.fillStyle(INK, 1)
  g.fillCircle(64, 55, 30)
  g.fillStyle(s.bodyDark, 1)
  g.fillCircle(64, 55, 28)
  g.fillStyle(s.body, 1)
  g.fillCircle(63, 54, 26)
  g.fillStyle(WHITE, 0.2)
  g.fillEllipse(53, 40, 12, 8)

  g.fillStyle(s.face, 1)
  g.fillEllipse(64, 70, 25, 18)
  g.fillStyle(s.nose, 1)
  g.fillEllipse(64, 66, 8, 6)
  drawMouth(g, 64, 72, 5)
  g.fillStyle(s.accent, 0.8)
  g.fillCircle(64, 39, 2.2)
  g.fillCircle(57, 42, 1.7)
  g.fillCircle(71, 42, 1.7)

  drawEye(g, 52, 52, 4.3)
  drawEye(g, 76, 52, 4.3)
  drawBlush(g, 39, 66, s.accent)
  drawBlush(g, 89, 66, s.accent)
}

function drawOwlBody(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  g.fillStyle(INK, 1)
  g.fillEllipse(64, 90, 62, 58)
  g.fillStyle(s.bodyDark, 1)
  g.fillEllipse(64, 90, 59, 55)
  g.fillStyle(s.body, 1)
  g.fillEllipse(63, 88, 56, 52)
  g.fillStyle(s.face, 0.85)
  g.fillEllipse(64, 96, 34, 38)

  g.fillStyle(s.bodyDark, 1)
  g.fillRoundedRect(26, 74, 15, 38, 8)
  g.fillRoundedRect(87, 74, 15, 38, 8)
  g.lineStyle(1.4, INK, 0.25)
  for (let index = 0; index < 3; index += 1) {
    g.lineBetween(30, 82 + index * 8, 38, 86 + index * 8)
    g.lineBetween(98, 82 + index * 8, 90, 86 + index * 8)
  }

  g.lineStyle(1.6, s.bodyDark, 0.65)
  for (let index = 0; index < 3; index += 1) {
    g.beginPath()
    g.arc(64, 92 + index * 8, 10, 0.25, Math.PI - 0.25)
    g.strokePath()
  }
}

function drawOwlHead(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  for (const sign of [-1, 1]) {
    g.fillStyle(INK, 1)
    g.fillTriangle(64 + sign * 20, 38, 64 + sign * 6, 30, 64 + sign * 17, 14)
    g.fillStyle(s.bodyDark, 1)
    g.fillTriangle(64 + sign * 18, 36, 64 + sign * 8, 30, 64 + sign * 16, 17)
  }

  g.fillStyle(INK, 1)
  g.fillEllipse(64, 58, 60, 50)
  g.fillStyle(s.bodyDark, 1)
  g.fillEllipse(64, 58, 57, 47)
  g.fillStyle(s.body, 1)
  g.fillEllipse(63, 57, 54, 44)
  g.fillStyle(WHITE, 0.16)
  g.fillEllipse(53, 38, 14, 8)

  for (const sign of [-1, 1]) {
    g.fillStyle(s.bodyDark, 1)
    g.fillCircle(64 + sign * 17, 58, 18)
    g.fillStyle(s.face, 1)
    g.fillCircle(64 + sign * 17, 58, 15)
    g.fillStyle(INK, 1)
    g.fillCircle(64 + sign * 17, 58, 7)
    g.fillStyle(WHITE, 0.9)
    g.fillCircle(64 + sign * 17 - 2.4, 55, 2.4)
  }

  g.fillStyle(BEAK, 1)
  g.fillTriangle(57, 65, 71, 65, 64, 78)
  g.fillStyle(0xc98b2f, 1)
  g.fillTriangle(60, 68, 68, 68, 64, 75)

  drawBlush(g, 38, 68, 0xf2a1a1)
  drawBlush(g, 90, 68, 0xf2a1a1)
}

function drawDuckBody(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  g.fillStyle(INK, 1)
  g.fillEllipse(64, 94, 58, 44)
  g.fillStyle(s.bodyDark, 1)
  g.fillEllipse(64, 94, 55, 41)
  g.fillStyle(s.body, 1)
  g.fillEllipse(63, 92, 52, 38)
  g.fillStyle(WHITE, 0.45)
  g.fillEllipse(50, 84, 18, 11)

  g.fillStyle(s.bodyDark, 1)
  g.fillEllipse(42, 92, 18, 26)
  g.fillEllipse(86, 92, 18, 26)
  g.fillStyle(s.bodyLight, 1)
  g.fillEllipse(42, 92, 13, 21)
  g.fillEllipse(86, 92, 13, 21)
  g.fillStyle(s.accent, 0.85)
  g.fillRoundedRect(38, 94, 8, 5, 2.5)
  g.fillRoundedRect(82, 94, 8, 5, 2.5)
}

function drawDuckHead(g: Phaser.GameObjects.Graphics, s: AnimalStyle): void {
  g.fillStyle(INK, 1)
  g.fillCircle(64, 56, 30)
  g.fillStyle(s.bodyDark, 1)
  g.fillCircle(64, 56, 28)
  g.fillStyle(s.body, 1)
  g.fillCircle(63, 55, 26)
  g.fillStyle(WHITE, 0.4)
  g.fillEllipse(53, 41, 12, 8)

  g.fillStyle(s.bodyDark, 1)
  g.fillTriangle(58, 32, 64, 20, 66, 34)
  g.fillTriangle(66, 33, 72, 24, 73, 36)

  g.fillStyle(BEAK, 1)
  g.fillRoundedRect(51, 63, 26, 12, 6)
  g.fillStyle(0xc98b2f, 1)
  g.fillRoundedRect(53, 71, 22, 5, 2.5)
  g.lineStyle(1.6, 0xc98b2f, 0.9)
  g.lineBetween(54, 69, 74, 69)
  g.fillStyle(0x8f6a3a, 0.8)
  g.fillCircle(57, 66, 1.2)
  g.fillCircle(70, 66, 1.2)

  drawEye(g, 52, 52, 4)
  drawEye(g, 76, 52, 4)
  drawBlush(g, 40, 66, s.accent)
  drawBlush(g, 88, 66, s.accent)
}

function drawEye(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number): void {
  g.fillStyle(INK, 1)
  g.fillCircle(x, y, radius)
  g.fillStyle(WHITE, 0.92)
  g.fillCircle(x - radius * 0.32, y - radius * 0.32, radius * 0.36)
}

function drawMouth(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number): void {
  g.lineStyle(2, INK, 0.75)
  g.beginPath()
  g.arc(x, y, radius, 0.15, Math.PI - 0.15)
  g.strokePath()
}

function drawBlush(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
  g.fillStyle(color, 0.5)
  g.fillEllipse(x, y, 9, 5)
  g.fillStyle(WHITE, 0.45)
  g.fillCircle(x + 1, y - 1, 1.2)
}

function drawApron(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x5fbf9f, 1)
  g.fillRoundedRect(45, 77, 38, 36, 10)
  g.fillStyle(0x4aa98a, 1)
  g.fillRoundedRect(54, 90, 21, 12, 4)
  g.lineStyle(4, 0x4aa98a, 1)
  g.lineBetween(49, 78, 58, 64)
  g.lineBetween(79, 78, 70, 64)
}

function drawCap(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0xf28b5b, 1)
  g.fillEllipse(64, 28, 42, 16)
  g.fillStyle(0xe5724a, 1)
  g.fillRoundedRect(42, 31, 46, 8, 4)
  g.fillStyle(0xfff3dd, 1)
  g.fillCircle(64, 23, 3.4)
}

function curveTail(
  g: Phaser.GameObjects.Graphics,
  from: TexturePoint,
  control: TexturePoint,
  to: TexturePoint,
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
