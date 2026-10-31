import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { gameColors } from '../colors'
import {
  ANIMALS,
  isAnimalProductKind,
  isPlantKind,
  isProcessedKind,
  PLANTS,
  RECIPES,
  zoneOf,
} from '../logic/config'
import type { ProducerState, ProductKind } from '../logic/types'
import { FRUIT_COLORS } from './fruitArt'
import { productTextureKey } from './productArt'

export class ProducerView extends Phaser.GameObjects.Container {
  /**
   * Soil bed drawn below every actor so the player can stand on it while the
   * crop layer above hides them, giving the feeling of walking through bushes.
   */
  readonly ground: Phaser.GameObjects.Graphics
  private readonly art: Phaser.GameObjects.Graphics
  private readonly ring: Phaser.GameObjects.Graphics
  private readonly badge: Phaser.GameObjects.Text
  private readonly status: Phaser.GameObjects.Text
  private readonly productIcon: Phaser.GameObjects.Image
  private readonly feedIcon: Phaser.GameObjects.Image
  private lastKey = ''

  constructor(scene: Phaser.Scene, theme: Theme, producer: ProducerState) {
    super(scene, producer.pos.x, producer.pos.y)
    this.ground = scene.add.graphics().setPosition(producer.pos.x, producer.pos.y)
    if (producer.kind === 'plant') drawPlantBed(this.ground, producer)
    this.art = scene.add.graphics()
    this.ring = scene.add.graphics()
    this.add([this.art, this.ring])

    this.badge = scene.add
      .text(0, -62, '', textStyle(theme, 14, theme.text, true))
      .setOrigin(0.5)
      .setBackgroundColor('#fff7e8')
      .setPadding(6, 1, 6, 1)
      .setVisible(false)
    this.add(this.badge)

    this.status = scene.add
      .text(0, 38, '', textStyle(theme, 11, theme.text, true))
      .setOrigin(0.5)
      .setVisible(false)
    this.add(this.status)

    this.productIcon = scene.add
      .image(0, -44, productTextureKey(producer.product))
      .setScale(0.5)
      .setVisible(false)
    this.add(this.productIcon)

    this.feedIcon = scene.add
      .image(0, -58, productTextureKey('apple'))
      .setScale(0.38)
      .setVisible(false)
    this.add(this.feedIcon)

    scene.add.existing(this)
  }

  updateProducer(producer: ProducerState): void {
    const key = producerKey(producer)
    if (key === this.lastKey) return
    this.lastKey = key

    this.art.clear()
    this.ring.clear()
    this.badge.setVisible(false)
    this.status.setVisible(false)
    this.productIcon.setVisible(false)
    this.feedIcon.setVisible(false)

    if (producer.kind === 'plant') drawPlantCrop(this.art, producer)
    else if (producer.kind === 'animal') drawAnimal(this.art, producer)
    else drawStation(this.art, producer)

    if (producer.kind === 'plant' && !producer.mature) {
      if (isPlantKind(producer.product)) {
        const config = PLANTS[producer.product]
        drawProgress(this.ring, producer.progressMs / config.growMs, -34)
      }
    } else if (producer.kind === 'animal' && isAnimalProductKind(producer.product)) {
      const config = ANIMALS[producer.product]
      if (producer.progressMs > 0 && producer.ready < config.capacity) {
        drawProgress(this.ring, producer.progressMs / config.cycleMs, 30)
      }
    } else if (producer.kind === 'station' && isProcessedKind(producer.product)) {
      const config = RECIPES[producer.product]
      if (producer.progressMs > 0 && producer.ready < config.capacity) {
        drawProgress(this.ring, producer.progressMs / config.craftMs, 30)
      }
    }

    if (producer.ready > 0) {
      this.badge
        .setPosition(0, producer.hungry ? -80 : -62)
        .setText(String(producer.ready))
        .setVisible(true)
    }

    if (producer.hungry && isAnimalProductKind(producer.product)) {
      const config = ANIMALS[producer.product]
      const feed = config.diet[0]
      if (feed !== undefined) {
        this.feedIcon.setTexture(productTextureKey(feed)).setVisible(true)
      }
      this.status.setText('!').setColor('#e25d5d').setVisible(true)
    } else if (producer.kind !== 'plant') {
      this.productIcon
        .setTexture(productTextureKey(producer.product))
        .setPosition(0, producer.kind === 'station' ? -30 : -34)
        .setVisible(true)
    }
  }
}

function producerKey(producer: ProducerState): string {
  return [
    producer.kind,
    producer.product,
    producer.mature,
    producer.hungry,
    producer.ready,
    Math.floor(producer.progressMs / 250),
  ].join('-')
}

function drawProgress(g: Phaser.GameObjects.Graphics, ratio: number, y: number): void {
  const width = 46
  g.fillStyle(0x3b2f3a, 0.22)
  g.fillRoundedRect(-width / 2, y, width, 5, 2.5)
  g.fillStyle(0xffd166, 1)
  g.fillRoundedRect(-width / 2, y, width * Math.max(0, Math.min(1, ratio)), 5, 2.5)
}

function drawPlantBed(g: Phaser.GameObjects.Graphics, producer: ProducerState): void {
  if (!isPlantKind(producer.product)) return
  const isFruit = zoneOf(producer.product) === 'fruit'
  const width = 68
  const height = 46

  if (isFruit) {
    g.fillStyle(0x3b2f3a, 0.16)
    g.fillEllipse(0, 24, width + 8, 14)
    g.fillStyle(gameColors.woodDark, 1)
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
    g.fillStyle(gameColors.wood, 1)
    g.fillRoundedRect(-width / 2 + 4, -height / 2 + 2, width - 8, height - 8, 6)
    g.fillStyle(gameColors.dirtDark, 1)
    g.fillEllipse(0, -height / 2 + 5, width - 14, 12)
    g.fillStyle(gameColors.dirt, 1)
    g.fillEllipse(0, -height / 2 + 3, width - 22, 8)
    return
  }

  g.fillStyle(0x3b2f3a, 0.14)
  g.fillEllipse(0, 23, width + 6, 12)
  g.fillStyle(0x8f5734, 1)
  g.fillRoundedRect(-width / 2, -height / 2, width, height, 7)
  g.fillStyle(0xa66b42, 1)
  g.fillRoundedRect(-width / 2 + 4, -height / 2 + 3, width - 8, height - 10, 5)
  g.fillStyle(0x6f4b2e, 0.7)
  for (let row = 0; row < 3; row += 1) {
    g.fillRoundedRect(-width / 2 + 8, -height / 2 + 10 + row * 9, width - 16, 3, 1.5)
  }
}

function drawPlantCrop(g: Phaser.GameObjects.Graphics, producer: ProducerState): void {
  if (!isPlantKind(producer.product)) return
  const config = PLANTS[producer.product]
  const isFruit = zoneOf(producer.product) === 'fruit'

  const ratio = producer.mature ? 1 : Math.min(1, producer.progressMs / config.growMs)
  if (ratio < 0.38) {
    g.fillStyle(0x6f4b2e, 1)
    g.fillRoundedRect(-2, -20, 4, 20, 2)
    g.fillStyle(gameColors.leaf, 1)
    g.fillEllipse(-8, -20, 14, 8)
    g.fillEllipse(8, -23, 13, 7)
    return
  }

  const scale = isFruit ? 0.55 + ratio * 0.45 : 0.55 + ratio * 0.45
  if (isFruit) {
    g.fillStyle(gameColors.woodDark, 1)
    g.fillRoundedRect(-6 * scale, -50 * scale, 12 * scale, 50 * scale, 5)
    g.fillStyle(0x8f5734, 1)
    g.fillRoundedRect(-4 * scale, -46 * scale, 4 * scale, 36 * scale, 2)
    const canopyY = -66 * scale
    const canopyR = 27 * scale
    g.fillStyle(gameColors.leafDark, 1)
    g.fillCircle(-17 * scale, canopyY + 6, canopyR * 0.72)
    g.fillCircle(17 * scale, canopyY + 4, canopyR * 0.68)
    g.fillCircle(0, canopyY, canopyR)
    g.fillStyle(gameColors.leaf, 1)
    g.fillCircle(-15 * scale, canopyY + 2, canopyR * 0.56)
    g.fillCircle(15 * scale, canopyY - 2, canopyR * 0.52)
    g.fillCircle(-2, canopyY - 6, canopyR * 0.92)
    g.fillStyle(gameColors.leafLight, 1)
    g.fillCircle(-10 * scale, canopyY - 11, canopyR * 0.36)
    g.fillCircle(9 * scale, canopyY - 14, canopyR * 0.24)
    if (producer.mature) {
      for (let index = 0; index < producer.ready; index += 1) {
        const angle = -2.4 + index * 1.25
        const distance = 16 * scale
        const x = Math.cos(angle) * distance
        const y = canopyY + 4 + Math.sin(angle) * distance * 0.6
        g.fillStyle(0x3b2f3a, 0.2)
        g.fillCircle(x, y + 2, 6)
        g.fillStyle(FRUIT_COLORS[producer.product as keyof typeof FRUIT_COLORS], 1)
        g.fillCircle(x, y, 5.5)
        g.fillStyle(0xffffff, 0.55)
        g.fillCircle(x - 1.5, y - 1.5, 1.6)
      }
    }
    return
  }

  drawVegetable(g, producer.product, scale)
  if (producer.mature && producer.ready > 0) {
    for (let index = 0; index < producer.ready; index += 1) {
      const x = -16 + index * 14
      g.fillStyle(0x3b2f3a, 0.18)
      g.fillCircle(x, 10, 7)
      g.fillStyle(0xffffff, 0.8)
      g.fillCircle(x, 8, 6)
      g.fillStyle(0xe25d5d, 1)
      g.fillCircle(x, 8, 4)
    }
  }
}

function drawVegetable(g: Phaser.GameObjects.Graphics, product: ProductKind, scale: number): void {
  if (product === 'carrot') {
    g.fillStyle(0x5aa96f, 1)
    g.fillEllipse(-12, -34, 16, 10)
    g.fillEllipse(12, -38, 16, 10)
    g.fillEllipse(0, -44, 14, 10)
    g.fillStyle(0xf08a3c, 1)
    g.fillTriangle(-7, -18, 7, -18, 0, 8)
    g.fillStyle(0xffb066, 1)
    g.fillTriangle(-3, -16, 2, -16, 0, 4)
  } else if (product === 'tomato') {
    g.fillStyle(0x4f9b5f, 1)
    g.fillRoundedRect(-3, -50 * scale, 6, 50 * scale, 3)
    g.fillEllipse(-16, -34, 24, 16)
    g.fillEllipse(16, -38, 24, 16)
    g.fillEllipse(0, -52, 26, 18)
    g.fillStyle(0xe25d5d, 1)
    for (let index = 0; index < 3; index += 1) {
      g.fillCircle(-16 + index * 16, -34 - (index % 2) * 8, 6)
    }
  } else if (product === 'corn') {
    g.fillStyle(0x5aa96f, 1)
    g.fillRoundedRect(-4, -64, 8, 64, 4)
    g.fillEllipse(-16, -40, 26, 12)
    g.fillEllipse(16, -46, 26, 12)
    g.fillStyle(0xf2c94c, 1)
    g.fillEllipse(0, -48, 12, 26)
    g.fillStyle(0xffe08a, 1)
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 2; column += 1) {
        g.fillCircle(-3 + column * 6, -56 + row * 5, 2)
      }
    }
  } else {
    g.fillStyle(0x5aa96f, 1)
    g.fillEllipse(-20, -26, 24, 12)
    g.fillEllipse(20, -30, 24, 12)
    g.fillEllipse(0, -44, 28, 14)
    g.fillStyle(0xe07a2f, 1)
    g.fillEllipse(0, -16, 30, 20)
    g.fillStyle(0xf39a4c, 1)
    g.fillEllipse(0, -17, 22, 16)
    g.fillStyle(0x5f7a35, 1)
    g.fillRoundedRect(-2, -30, 4, 8, 2)
  }
}

function drawAnimal(g: Phaser.GameObjects.Graphics, producer: ProducerState): void {
  const width = 80
  const height = 56
  const isPond = producer.product === 'fish'

  g.fillStyle(0x3b2f3a, 0.15)
  g.fillEllipse(0, 25, width + 6, 14)
  if (isPond) {
    g.fillStyle(0x5aa9c9, 1)
    g.fillEllipse(0, 0, width, height)
    g.fillStyle(0x86d0e0, 1)
    g.fillEllipse(-6, -4, width - 18, height - 18)
    g.fillStyle(0x4a8f5d, 1)
    g.fillEllipse(-20, -10, 14, 8)
    g.fillEllipse(20, 8, 12, 7)
    g.fillStyle(0xffffff, 0.45)
    g.fillEllipse(10, -14, 10, 4)
    for (let index = 0; index < producer.ready; index += 1) {
      g.fillStyle(0xf08a3c, 1)
      g.fillEllipse(-14 + index * 14, 6, 14, 7)
      g.fillStyle(0xffb066, 1)
      g.fillEllipse(-16 + index * 14, 5, 8, 4)
    }
  } else {
    g.fillStyle(0x8f5734, 1)
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 10)
    g.fillStyle(0xc98b5c, 1)
    g.fillRoundedRect(-width / 2 + 5, -height / 2 + 5, width - 10, height - 10, 8)
    g.lineStyle(3, 0x8f5734, 1)
    g.lineBetween(-width / 2 + 8, -10, width / 2 - 8, -10)
    g.lineBetween(-width / 2 + 8, 12, width / 2 - 8, 12)
    for (let x = -width / 2 + 8; x < width / 2 - 4; x += 16) {
      g.lineBetween(x, -height / 2 + 5, x, height / 2 - 5)
    }

    if (producer.product === 'egg') drawChicken(g, producer.ready)
    else if (producer.product === 'milk') drawCow(g, producer.ready)
    else drawSheep(g, producer.ready)
  }
}

function drawChicken(g: Phaser.GameObjects.Graphics, ready: number): void {
  g.fillStyle(0xffffff, 1)
  g.fillEllipse(0, 0, 34, 26)
  g.fillStyle(0xfff3dd, 1)
  g.fillEllipse(0, -2, 28, 20)
  g.fillStyle(0xffffff, 1)
  g.fillCircle(14, -14, 10)
  g.fillStyle(0xe25d5d, 1)
  g.fillTriangle(10, -24, 16, -24, 13, -31)
  g.fillStyle(0xf2a93b, 1)
  g.fillTriangle(23, -13, 31, -10, 23, -7)
  g.fillStyle(0x3b2f3a, 1)
  g.fillCircle(17, -17, 1.8)
  g.fillStyle(0xf2a93b, 1)
  g.fillRoundedRect(-8, 10, 5, 8, 2)
  g.fillRoundedRect(6, 10, 5, 8, 2)
  for (let index = 0; index < ready; index += 1) {
    g.fillStyle(0xfff3dd, 1)
    g.fillEllipse(-20 + index * 8, 18, 7, 9)
  }
}

function drawCow(g: Phaser.GameObjects.Graphics, ready: number): void {
  g.fillStyle(0xffffff, 1)
  g.fillEllipse(0, 0, 42, 28)
  g.fillStyle(0x3b2f3a, 1)
  g.fillEllipse(-10, -2, 12, 10)
  g.fillEllipse(12, 4, 10, 8)
  g.fillStyle(0xffffff, 1)
  g.fillCircle(18, -14, 11)
  g.fillStyle(0xf2a8b4, 1)
  g.fillEllipse(22, -10, 10, 7)
  g.fillStyle(0x3b2f3a, 1)
  g.fillCircle(15, -17, 1.8)
  g.fillCircle(21, -17, 1.8)
  g.fillStyle(0xf2cf9e, 1)
  g.fillTriangle(9, -24, 13, -24, 11, -30)
  g.fillTriangle(23, -24, 27, -24, 25, -30)
  g.fillStyle(0xf2a93b, 1)
  g.fillCircle(26, 10, 5)
  g.fillStyle(0xffffff, 1)
  g.fillRoundedRect(-14, 10, 6, 9, 2)
  g.fillRoundedRect(8, 10, 6, 9, 2)
  for (let index = 0; index < ready; index += 1) {
    g.fillStyle(0xdfe9f2, 1)
    g.fillRoundedRect(-20 + index * 9, 16, 6, 10, 2)
  }
}

function drawSheep(g: Phaser.GameObjects.Graphics, ready: number): void {
  g.fillStyle(0xfff7e9, 1)
  g.fillCircle(-10, -2, 15)
  g.fillCircle(8, -6, 16)
  g.fillCircle(16, 4, 12)
  g.fillCircle(-2, 8, 14)
  g.fillStyle(0xf7ddc0, 1)
  g.fillCircle(18, -12, 9)
  g.fillStyle(0x3b2f3a, 1)
  g.fillCircle(15, -15, 1.7)
  g.fillCircle(21, -15, 1.7)
  g.fillStyle(0xf2a8b4, 1)
  g.fillEllipse(24, -9, 5, 4)
  g.fillStyle(0x3b2f3a, 1)
  g.fillRoundedRect(-14, 12, 5, 8, 2)
  g.fillRoundedRect(8, 12, 5, 8, 2)
  for (let index = 0; index < ready; index += 1) {
    g.fillStyle(0xd99ab9, 1)
    g.fillCircle(-20 + index * 9, 18, 4)
  }
}

function drawStation(g: Phaser.GameObjects.Graphics, producer: ProducerState): void {
  const width = 80
  const height = 56
  g.fillStyle(0x3b2f3a, 0.15)
  g.fillEllipse(0, 25, width + 6, 14)
  g.fillStyle(0x6f4b2e, 1)
  g.fillRoundedRect(-width / 2, -height / 2, width, height, 10)
  g.fillStyle(0x9c6b42, 1)
  g.fillRoundedRect(-width / 2 + 5, -height / 2 + 5, width - 10, height - 10, 8)

  if (producer.product === 'cake') {
    g.fillStyle(0x5a4a4a, 1)
    g.fillRoundedRect(-22, -18, 44, 34, 8)
    g.fillStyle(0x7a6666, 1)
    g.fillRoundedRect(-18, -14, 36, 26, 6)
    g.fillStyle(0x2f2433, 1)
    g.fillRoundedRect(-12, 0, 24, 12, 4)
    g.fillStyle(0xffd166, 1)
    g.fillCircle(-6, 6, 4)
    g.fillCircle(6, 6, 4)
    g.fillStyle(0xe88a9a, 1)
    g.fillRoundedRect(-12, -12, 24, 6, 3)
  } else if (producer.product === 'sweater') {
    g.fillStyle(0x8f5734, 1)
    g.fillRoundedRect(-26, -18, 52, 34, 6)
    g.fillStyle(0xd39a65, 1)
    g.fillRoundedRect(-22, -14, 44, 26, 4)
    g.lineStyle(2, 0x7fa65a, 1)
    for (let index = 0; index < 5; index += 1) {
      g.lineBetween(-18 + index * 9, -12, -18 + index * 9, 10)
    }
    g.fillStyle(0x9bc477, 1)
    g.fillRoundedRect(-10, -4, 20, 12, 3)
  } else {
    g.fillStyle(0x4f5a5f, 1)
    g.fillRoundedRect(-24, -16, 48, 30, 6)
    g.fillStyle(0x2f3a3f, 1)
    g.fillRoundedRect(-20, -12, 40, 22, 4)
    g.lineStyle(2, 0x9aa5aa, 1)
    for (let index = 0; index < 4; index += 1)
      g.lineBetween(-16 + index * 11, -10, -16 + index * 11, 8)
    g.fillStyle(0xf08a3c, 1)
    g.fillEllipse(0, 8, 18, 6)
    g.fillStyle(0xf2c94c, 1)
    g.fillCircle(-8, 8, 3)
    g.fillCircle(0, 8, 3)
    g.fillCircle(8, 8, 3)
  }

  for (let index = 0; index < producer.ready; index += 1) {
    g.fillStyle(0xffffff, 0.9)
    g.fillCircle(22 + (index % 2) * 8, -20 - Math.floor(index / 2) * 8, 5)
  }
}
