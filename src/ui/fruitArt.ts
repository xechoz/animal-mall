import type Phaser from 'phaser'
import { FRUIT_ORDER } from '../logic/config'
import type { FruitKind } from '../logic/types'

const SIZE = 40

export const FRUIT_COLORS: Readonly<Record<FruitKind, number>> = {
  apple: 0xe85a4f,
  pear: 0xcddd65,
  peach: 0xff9d8a,
  cherry: 0xb8324a,
}

export function fruitTextureKey(kind: FruitKind): string {
  return `fruit-${kind}`
}

export function coinTextureKey(): string {
  return 'icon-coin'
}

export function createFruitTextures(scene: Phaser.Scene): void {
  for (const kind of FRUIT_ORDER) {
    const key = fruitTextureKey(kind)
    if (scene.textures.exists(key)) continue
    const graphics = scene.add.graphics()
    drawFruit(graphics, kind)
    graphics.generateTexture(key, SIZE, SIZE)
    graphics.destroy()
  }

  if (!scene.textures.exists(coinTextureKey())) {
    const graphics = scene.add.graphics()
    drawCoin(graphics)
    graphics.generateTexture(coinTextureKey(), 32, 32)
    graphics.destroy()
  }
}

function drawFruit(g: Phaser.GameObjects.Graphics, kind: FruitKind): void {
  g.fillStyle(0x3b2f3a, 0.18)
  g.fillEllipse(20, 35, 18, 5)

  switch (kind) {
    case 'apple': {
      g.fillStyle(0x3b2f3a, 1)
      g.fillCircle(20, 24, 12)
      g.fillStyle(FRUIT_COLORS.apple, 1)
      g.fillCircle(20, 23, 10)
      g.fillStyle(0xff9b8c, 0.8)
      g.fillEllipse(16, 19, 4, 6)
      g.fillStyle(0x5aa96f, 1)
      g.fillEllipse(24, 12, 10, 6)
      g.lineStyle(2, 0x6f4b2e, 1)
      g.lineBetween(20, 21, 21, 12)
      break
    }
    case 'pear': {
      g.fillStyle(0x3b2f3a, 1)
      g.fillCircle(20, 27, 10)
      g.fillCircle(20, 19, 7)
      g.fillStyle(FRUIT_COLORS.pear, 1)
      g.fillCircle(20, 26, 8)
      g.fillCircle(20, 19, 5.5)
      g.fillStyle(0xe7ef9a, 0.8)
      g.fillEllipse(17, 23, 3, 6)
      g.lineStyle(2, 0x6f4b2e, 1)
      g.lineBetween(20, 15, 22, 8)
      g.fillStyle(0x5aa96f, 1)
      g.fillEllipse(25, 9, 8, 4)
      break
    }
    case 'peach': {
      g.fillStyle(0x3b2f3a, 1)
      g.fillCircle(20, 24, 12)
      g.fillStyle(FRUIT_COLORS.peach, 1)
      g.fillCircle(20, 23, 10)
      g.fillStyle(0xffc0ae, 0.8)
      g.fillEllipse(16, 19, 4, 6)
      g.lineStyle(1.5, 0xd86f5f, 0.8)
      g.beginPath()
      g.arc(20, 23, 7, -1.2, 1.2)
      g.strokePath()
      g.fillStyle(0x5aa96f, 1)
      g.fillEllipse(24, 11, 9, 5)
      break
    }
    case 'cherry': {
      g.fillStyle(0x3b2f3a, 1)
      g.fillCircle(14, 27, 8)
      g.fillCircle(26, 25, 8)
      g.fillStyle(FRUIT_COLORS.cherry, 1)
      g.fillCircle(14, 27, 6.5)
      g.fillCircle(26, 25, 6.5)
      g.fillStyle(0xffb3b8, 0.7)
      g.fillCircle(12, 25, 1.8)
      g.fillCircle(24, 23, 1.8)
      g.lineStyle(2, 0x6f4b2e, 1)
      g.lineBetween(14, 21, 21, 8)
      g.lineBetween(26, 19, 22, 8)
      g.fillStyle(0x5aa96f, 1)
      g.fillEllipse(23, 8, 10, 5)
      break
    }
  }
}

function drawCoin(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x3b2f3a, 0.18)
  g.fillCircle(16, 18, 10)
  g.fillStyle(0xd89a2b, 1)
  g.fillCircle(16, 16, 10)
  g.fillStyle(0xffd166, 1)
  g.fillCircle(16, 15, 8)
  g.lineStyle(2, 0xd89a2b, 1)
  g.strokeCircle(16, 15, 5)
  g.fillStyle(0xfff3b0, 0.9)
  g.fillEllipse(13, 11, 3, 5)
}
