import type Phaser from 'phaser'
import { CUSTOMER_SPECIES } from '../logic/config'
import type { SpeciesId } from '../logic/types'

const SIZE = 96
const INK = 0x3b2f3a

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

export function createAnimalTextures(scene: Phaser.Scene): void {
  for (const species of CUSTOMER_SPECIES) {
    createTexture(scene, animalTextureKey(species), () => drawAnimal(scene, species, false))
  }
  createTexture(scene, playerTextureKey(), () => drawAnimal(scene, 'bear', true))
}

function createTexture(scene: Phaser.Scene, key: string, draw: () => Phaser.GameObjects.Graphics) {
  if (scene.textures.exists(key)) return
  const graphics = draw()
  graphics.generateTexture(key, SIZE, SIZE)
  graphics.destroy()
}

function drawAnimal(
  scene: Phaser.Scene,
  species: SpeciesId,
  player: boolean,
): Phaser.GameObjects.Graphics {
  const style = STYLES[species]
  const g = scene.add.graphics()

  g.fillStyle(INK, 0.16)
  g.fillEllipse(48, 89, 46, 9)

  drawTail(g, species, style)
  drawFeet(g, style)

  g.fillStyle(INK, 1)
  g.fillEllipse(48, 68, 48, 38)
  g.fillStyle(style.bodyDark, 1)
  g.fillEllipse(48, 68, 45, 35)
  g.fillStyle(style.body, 1)
  g.fillEllipse(47, 66, 42, 32)

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

  const headY = 40
  drawEars(g, species, style, headY)

  g.fillStyle(INK, 1)
  g.fillCircle(48, headY, 25)
  g.fillStyle(style.bodyDark, 1)
  g.fillCircle(48, headY, 23)
  g.fillStyle(style.body, 1)
  g.fillCircle(47, headY - 1, 21)

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
  g.lineStyle(2, style.nose, 0.8)
  g.beginPath()
  g.arc(48, 50, 4, 0.15, Math.PI - 0.15)
  g.strokePath()

  drawEye(g, 40, 39)
  drawEye(g, 56, 39)

  g.fillStyle(0xf07f8d, 0.55)
  g.fillEllipse(31, 51, 7, 4)
  g.fillEllipse(65, 51, 7, 4)

  if (player) {
    g.fillStyle(0x5fbf9f, 1)
    g.fillRoundedRect(34, 78, 28, 12, 5)
    g.fillStyle(0xfff3dd, 1)
    g.fillRoundedRect(39, 81, 18, 6, 3)
  }

  return g
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
    case 'fox':
      g.fillStyle(style.bodyDark, 1)
      g.fillEllipse(78, 68, 20, 10)
      g.fillStyle(style.face, 1)
      g.fillEllipse(84, 66, 9, 7)
      break
    case 'cat':
    case 'dog':
      g.fillStyle(style.bodyDark, 1)
      g.fillEllipse(78, 66, 16, 8)
      break
    case 'pig':
      g.fillStyle(style.bodyDark, 1)
      g.fillCircle(78, 64, 5)
      break
    case 'rabbit':
      g.fillStyle(style.face, 1)
      g.fillCircle(78, 72, 6)
      break
    default:
      g.fillStyle(style.bodyDark, 1)
      g.fillCircle(77, 72, 5)
  }
}

function drawFeet(g: Phaser.GameObjects.Graphics, style: AnimalStyle): void {
  for (const x of [38, 54]) {
    g.fillStyle(INK, 1)
    g.fillRoundedRect(x - 2, 80, 15, 10, 5)
    g.fillStyle(style.bodyDark, 1)
    g.fillRoundedRect(x, 81, 11, 8, 4)
  }
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
