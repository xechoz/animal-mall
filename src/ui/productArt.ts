import type Phaser from 'phaser'
import { ANIMAL_ORDER, isFruitKind, PROCESSED_ORDER, VEG_ORDER } from '../logic/config'
import type { ProductKind } from '../logic/types'
import { createFruitTextures, fruitTextureKey } from './fruitArt'

const SIZE = 40

export function productTextureKey(product: ProductKind): string {
  return isFruitKind(product) ? fruitTextureKey(product) : `product-${product}`
}

export function createProductTextures(scene: Phaser.Scene): void {
  createFruitTextures(scene)
  for (const product of [...VEG_ORDER, ...ANIMAL_ORDER, ...PROCESSED_ORDER]) {
    const key = productTextureKey(product)
    if (scene.textures.exists(key)) continue
    const graphics = scene.add.graphics()
    drawProduct(graphics, product)
    graphics.generateTexture(key, SIZE, SIZE)
    graphics.destroy()
  }
}

function drawProduct(g: Phaser.GameObjects.Graphics, product: ProductKind): void {
  g.fillStyle(0x3b2f3a, 0.16)
  g.fillEllipse(20, 34, 18, 5)
  switch (product) {
    case 'carrot':
      g.fillStyle(0xf08a3c, 1)
      g.fillTriangle(12, 12, 28, 12, 20, 36)
      g.fillStyle(0xffb066, 1)
      g.fillTriangle(16, 14, 20, 14, 20, 30)
      g.lineStyle(1.5, 0xd9702a, 0.8)
      g.lineBetween(15, 19, 25, 19)
      g.lineBetween(17, 25, 23, 25)
      g.fillStyle(0x5aa96f, 1)
      g.fillEllipse(16, 10, 10, 5)
      g.fillEllipse(24, 9, 10, 5)
      g.fillEllipse(20, 7, 7, 5)
      break
    case 'tomato':
      g.fillStyle(0xd94b45, 1)
      g.fillCircle(20, 24, 11)
      g.fillStyle(0xf06a5f, 1)
      g.fillCircle(19, 22, 9)
      g.fillStyle(0xff9b8c, 0.7)
      g.fillEllipse(15, 19, 4, 5)
      g.fillStyle(0x4f9b5f, 1)
      for (let index = 0; index < 5; index += 1) {
        const angle = -Math.PI / 2 + index * ((Math.PI * 2) / 5)
        g.fillTriangle(
          20,
          14,
          20 + Math.cos(angle) * 9,
          14 + Math.sin(angle) * 7,
          20 + Math.cos(angle + 0.5) * 6,
          14 + Math.sin(angle + 0.5) * 6,
        )
      }
      break
    case 'corn':
      g.fillStyle(0x5aa96f, 1)
      g.fillEllipse(20, 22, 26, 24)
      g.fillStyle(0xf2c94c, 1)
      g.fillEllipse(20, 21, 14, 24)
      g.fillStyle(0xffe08a, 1)
      for (let row = 0; row < 5; row += 1) {
        for (let column = 0; column < 2; column += 1) {
          g.fillCircle(16 + column * 8, 12 + row * 4.5, 2)
        }
      }
      g.fillStyle(0x4a8f5d, 1)
      g.fillEllipse(10, 17, 8, 18)
      g.fillEllipse(30, 17, 8, 18)
      break
    case 'pumpkin':
      g.fillStyle(0xe07a2f, 1)
      g.fillEllipse(20, 25, 28, 22)
      g.fillStyle(0xf39a4c, 1)
      g.fillEllipse(20, 24, 22, 20)
      g.lineStyle(1.5, 0xc96520, 0.8)
      g.beginPath()
      g.arc(20, 24, 7, -1.4, 1.4)
      g.strokePath()
      g.beginPath()
      g.arc(20, 24, 11, -1.2, 1.2)
      g.strokePath()
      g.fillStyle(0x5f7a35, 1)
      g.fillRoundedRect(18, 8, 4, 8, 2)
      g.fillStyle(0x6f9a3f, 1)
      g.fillEllipse(24, 11, 8, 4)
      break
    case 'potato':
      g.fillStyle(0xa9773f, 1)
      g.fillEllipse(20, 24, 28, 20)
      g.fillStyle(0xc79a5f, 1)
      g.fillEllipse(20, 22, 24, 17)
      g.fillStyle(0xffe0b0, 0.45)
      g.fillEllipse(15, 18, 7, 5)
      g.fillStyle(0x8a5a2e, 1)
      g.fillCircle(16, 26, 1.4)
      g.fillCircle(24, 20, 1.3)
      g.fillCircle(26, 27, 1.5)
      break
    case 'eggplant':
      g.fillStyle(0x5f3f7a, 1)
      g.fillEllipse(20, 24, 20, 28)
      g.fillStyle(0x7a4f9c, 1)
      g.fillEllipse(20, 23, 16, 24)
      g.fillStyle(0xc9a0e0, 0.55)
      g.fillEllipse(15, 18, 4, 9)
      g.fillStyle(0x5aa96f, 1)
      g.fillTriangle(13, 11, 27, 11, 20, 4)
      g.fillTriangle(20, 8, 30, 7, 24, 13)
      g.fillTriangle(20, 8, 10, 7, 16, 13)
      g.lineStyle(2, 0x4f8f5f, 1)
      g.lineBetween(20, 8, 20, 2)
      break
    case 'egg':
      g.fillStyle(0xfff3dd, 1)
      g.fillEllipse(20, 22, 18, 24)
      g.fillStyle(0xffe0a8, 1)
      g.fillEllipse(20, 26, 12, 14)
      g.fillStyle(0xffffff, 0.7)
      g.fillEllipse(15, 16, 3, 5)
      break
    case 'milk':
      g.fillStyle(0xdfe9f2, 1)
      g.fillRoundedRect(13, 8, 14, 26, 4)
      g.fillStyle(0xffffff, 1)
      g.fillRoundedRect(15, 10, 10, 20, 3)
      g.fillStyle(0x7fb6d9, 1)
      g.fillRoundedRect(15, 16, 10, 5, 2)
      g.fillStyle(0x5f8fb0, 1)
      g.fillRoundedRect(15, 7, 10, 5, 2)
      g.fillStyle(0xffffff, 0.8)
      g.fillEllipse(18, 22, 3, 6)
      break
    case 'yarn':
      g.fillStyle(0xb97a9b, 1)
      g.fillCircle(20, 22, 11)
      g.fillStyle(0xd99ab9, 1)
      g.fillCircle(20, 22, 8)
      g.lineStyle(1.5, 0x9b5f7d, 0.9)
      g.beginPath()
      g.arc(20, 22, 8, 0.2, 2.8)
      g.strokePath()
      g.beginPath()
      g.arc(20, 22, 5, 3.4, 6.0)
      g.strokePath()
      g.lineStyle(2, 0xb97a9b, 1)
      g.lineBetween(28, 24, 35, 28)
      break
    case 'fish':
      g.fillStyle(0x6fa8c9, 1)
      g.fillEllipse(20, 22, 24, 14)
      g.fillStyle(0x9ac9df, 1)
      g.fillEllipse(19, 21, 18, 10)
      g.fillStyle(0x6fa8c9, 1)
      g.fillTriangle(33, 22, 38, 16, 38, 28)
      g.fillStyle(0x3b2f3a, 1)
      g.fillCircle(12, 19, 1.6)
      g.lineStyle(1.5, 0x4f8aa9, 1)
      g.beginPath()
      g.arc(20, 21, 5, -0.8, 0.8)
      g.strokePath()
      break
    case 'cake':
      g.fillStyle(0xf2cf9e, 1)
      g.fillRoundedRect(9, 18, 22, 16, 3)
      g.fillStyle(0xffe0b0, 1)
      g.fillRoundedRect(11, 16, 18, 8, 3)
      g.fillStyle(0xe88a9a, 1)
      g.fillRoundedRect(10, 14, 20, 6, 3)
      g.fillStyle(0xd94b45, 1)
      g.fillCircle(20, 12, 4)
      g.fillStyle(0x5aa96f, 1)
      g.fillEllipse(23, 9, 7, 3)
      g.lineStyle(1.5, 0xc9a06f, 0.8)
      g.lineBetween(12, 24, 28, 24)
      break
    case 'sweater':
      g.fillStyle(0x7fa65a, 1)
      g.fillRoundedRect(9, 14, 22, 18, 4)
      g.fillRoundedRect(5, 15, 7, 10, 3)
      g.fillRoundedRect(28, 15, 7, 10, 3)
      g.fillStyle(0x9bc477, 1)
      g.fillRoundedRect(12, 17, 16, 12, 3)
      g.lineStyle(1.5, 0x5f8442, 0.8)
      for (let index = 0; index < 3; index += 1) {
        g.lineBetween(14 + index * 5, 18, 14 + index * 5, 28)
      }
      g.fillStyle(0x5f8442, 1)
      g.fillRoundedRect(15, 11, 10, 4, 2)
      break
    case 'grilledFish':
      g.fillStyle(0xffffff, 1)
      g.fillEllipse(20, 24, 30, 16)
      g.fillStyle(0x6fa8c9, 1)
      g.fillEllipse(19, 21, 22, 11)
      g.fillStyle(0x9ac9df, 1)
      g.fillEllipse(18, 20, 16, 8)
      g.fillStyle(0x6fa8c9, 1)
      g.fillTriangle(31, 21, 36, 15, 36, 27)
      g.lineStyle(1.5, 0x4f6b3f, 0.8)
      g.lineBetween(13, 17, 22, 25)
      g.lineBetween(17, 16, 26, 24)
      g.lineBetween(21, 16, 28, 22)
      g.fillStyle(0x3b2f3a, 1)
      g.fillCircle(11, 19, 1.5)
      break
  }
}
