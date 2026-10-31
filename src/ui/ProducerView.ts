import { type I18n, type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { gameColors } from '../colors'
import {
  ANIMALS,
  isAnimalProductKind,
  isPlantKind,
  isProcessedKind,
  PLANTS,
  RECIPES,
  troughCapacity,
  zoneOf,
} from '../logic/config'
import { feedCount, recipeInputAvailable, recipeInputIcon } from '../logic/production'
import type { ProducerState, ShelfState, ZoneId } from '../logic/types'
import { feedTextureKey } from './fruitArt'
import { drawPlantCrop, plantGrowthScale } from './plantArt'
import { productTextureKey } from './productArt'

export class ProducerView extends Phaser.GameObjects.Container {
  /**
   * Soil bed drawn below every actor so the player can stand on it while the
   * crop layer above hides them, giving the feeling of walking through bushes.
   */
  readonly ground: Phaser.GameObjects.Graphics
  private readonly art: Phaser.GameObjects.Graphics
  private readonly ring: Phaser.GameObjects.Graphics
  private readonly feedRing: Phaser.GameObjects.Graphics
  private readonly loadRing: Phaser.GameObjects.Graphics
  private readonly feedChoices: Phaser.GameObjects.Container
  private readonly badge: Phaser.GameObjects.Text
  private readonly status: Phaser.GameObjects.Text
  private readonly productIcon: Phaser.GameObjects.Image
  private readonly feedIcon: Phaser.GameObjects.Image
  private readonly inputIcons: Phaser.GameObjects.Image[] = []
  private readonly inputCounts: Phaser.GameObjects.Text[] = []
  private readonly i18n: I18n
  private lastKey = ''
  private animalMode: 'idle' | 'walk' | 'rest' = 'idle'
  private animalUntil = 0
  private animalTarget = 0
  private animalX = 0
  private animalFacing: -1 | 1 = 1
  private animalLastTime = 0
  private animalHungrySince = 0
  private animalEmoteUntil = 0
  private animalEmoteNext = 0
  private animalSeed = 1
  private readonly emote: Phaser.GameObjects.Container
  private readonly emoteBg: Phaser.GameObjects.Graphics
  private readonly emoteText: Phaser.GameObjects.Text

  constructor(
    scene: Phaser.Scene,
    theme: Theme,
    producer: ProducerState,
    textScale: number,
    i18n: I18n,
  ) {
    super(scene, producer.pos.x, producer.pos.y)
    this.i18n = i18n
    this.ground = scene.add.graphics().setPosition(producer.pos.x, producer.pos.y)
    if (producer.kind === 'plant') drawPlantBed(this.ground, producer)
    this.art = scene.add.graphics()
    this.ring = scene.add.graphics()
    this.feedRing = scene.add.graphics()
    this.loadRing = scene.add.graphics()
    this.add([this.art, this.ring, this.feedRing, this.loadRing])

    const feedBg = scene.add.graphics()
    feedBg.fillStyle(0xfff7e8, 0.96)
    feedBg.fillRoundedRect(-24, -13, 48, 26, 10)
    feedBg.lineStyle(2, theme.ink, 0.25)
    feedBg.strokeRoundedRect(-24, -13, 48, 26, 10)
    feedBg.fillStyle(0xfff7e8, 0.96)
    feedBg.fillTriangle(-4, 13, 4, 13, 0, 19)
    const apple = scene.add.image(-9, -1, productTextureKey('apple')).setScale(0.42)
    const carrot = scene.add.image(9, -1, productTextureKey('carrot')).setScale(0.42)
    this.feedChoices = scene.add.container(0, -86, [feedBg, apple, carrot]).setVisible(false)
    this.add(this.feedChoices)

    this.badge = scene.add
      .text(0, -62, '', textStyle(theme, 14 * textScale, theme.text, true))
      .setOrigin(0.5)
      .setBackgroundColor('#fff7e8')
      .setPadding(6, 1, 6, 1)
      .setVisible(false)
    this.add(this.badge)

    this.status = scene.add
      .text(0, 38, '', textStyle(theme, 11 * textScale, theme.text, true))
      .setOrigin(0.5)
      .setVisible(false)
    this.add(this.status)

    this.animalSeed = Math.max(1, producer.id * 2654435761)
    this.emote = scene.add.container(0, -76).setVisible(false)
    this.emoteBg = scene.add.graphics()
    this.emoteText = scene.add
      .text(0, 0, '', textStyle(theme, 12 * textScale, theme.text, true))
      .setOrigin(0.5)
    this.emote.add([this.emoteBg, this.emoteText])
    this.add(this.emote)

    this.productIcon = scene.add
      .image(0, -44, productTextureKey(producer.product))
      .setScale(0.5)
      .setVisible(false)
    this.add(this.productIcon)

    this.feedIcon = scene.add.image(0, -58, feedTextureKey()).setScale(0.38).setVisible(false)
    this.add(this.feedIcon)

    for (let index = 0; index < 2; index += 1) {
      const icon = scene.add
        .image(-13 + index * 26, -36, productTextureKey('egg'))
        .setScale(0.34)
        .setVisible(false)
      const count = scene.add
        .text(-3 + index * 26, -27, '', textStyle(theme, 10 * textScale, theme.text, true))
        .setOrigin(0.5)
        .setVisible(false)
      this.inputIcons.push(icon)
      this.inputCounts.push(count)
      this.add([icon, count])
    }

    scene.add.existing(this)
  }

  /** Highlights the trough while the player carries something it accepts. */
  setFeedActive(active: boolean): void {
    this.feedRing.clear()
    if (!active) return
    this.feedRing.lineStyle(3, 0xffd166, 0.95)
    this.feedRing.strokeCircle(28, 20, 17)
    this.feedRing.lineStyle(2, 0xfff7e8, 0.8)
    this.feedRing.strokeCircle(28, 20, 21)
  }

  /** Half-second hand-load ring around a kitchen station. */
  setLoad(ratio: number): void {
    this.loadRing.clear()
    if (ratio <= 0) return
    this.loadRing.lineStyle(4, 0x3b2f3a, 0.18)
    this.loadRing.strokeCircle(0, 0, 36)
    this.loadRing.lineStyle(4, 0xffd166, 0.95)
    this.loadRing.beginPath()
    this.loadRing.arc(0, 0, 36, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio)
    this.loadRing.strokePath()
  }

  updateProducer(producer: ProducerState, shelves: Readonly<Record<ZoneId, ShelfState>>): void {
    const key = producerKey(producer, shelves)
    if (key === this.lastKey) return
    this.lastKey = key

    this.art.clear()
    this.ring.clear()
    this.art.setScale(1)
    this.badge.setVisible(false)
    this.status.setVisible(false)
    this.productIcon.setVisible(false)
    this.feedIcon.setVisible(false)
    this.feedChoices.setVisible(false)
    for (const icon of this.inputIcons) icon.setVisible(false)
    for (const count of this.inputCounts) count.setVisible(false)

    if (producer.kind === 'plant' && isPlantKind(producer.product)) {
      const ratio = producer.mature
        ? 1
        : Math.min(1, producer.progressMs / PLANTS[producer.product].growMs)
      this.art.setScale(plantGrowthScale(ratio))
      drawPlantCrop(this.art, producer.product, ratio, producer.mature, producer.ready)
    } else if (producer.kind === 'animal') {
      // The animal layer is redrawn every frame by updateAnimal so it can walk,
      // rest and react to hunger without touching the simulation.
    } else if (producer.kind === 'station') {
      drawStation(this.art, producer)
      if (isProcessedKind(producer.product)) {
        const config = RECIPES[producer.product]
        const crafting = producer.progressMs > 0
        config.inputs.forEach((input, index) => {
          const icon = this.inputIcons[index]
          const count = this.inputCounts[index]
          if (icon === undefined || count === undefined) return
          const available = recipeInputAvailable(producer, shelves, input)
          icon
            .setTexture(productTextureKey(recipeInputIcon(input)))
            .setVisible(true)
            .setAlpha(crafting ? 0.45 : 1)
          count
            .setText(
              crafting ? `×${input.count}` : `${Math.min(available, input.count)}/${input.count}`,
            )
            .setColor(!crafting && available < input.count ? '#e25d5d' : '#3b2f3a')
            .setVisible(true)
        })
        if (producer.ready >= config.capacity) {
          this.status.setText(this.i18n.t('station.full')).setColor('#e08a2f').setVisible(true)
        }
      }
    }

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

    // Plants show their ripe produce as art on the crop instead of a counter.
    if (producer.ready > 0 && producer.kind !== 'plant') {
      this.badge
        .setPosition(0, producer.hungry ? -80 : -62)
        .setText(String(producer.ready))
        .setVisible(true)
    }

    if (producer.hungry && isAnimalProductKind(producer.product)) {
      this.feedIcon.setTexture(feedTextureKey()).setVisible(true)
      this.status.setText('!').setColor('#e25d5d').setVisible(true)
      this.feedChoices.setVisible(false)
    } else if (producer.kind !== 'plant') {
      this.productIcon
        .setTexture(productTextureKey(producer.product))
        .setPosition(0, producer.kind === 'station' ? -58 : -34)
        .setVisible(true)
    }
  }

  /**
   * Cosmetic animal behaviour: idle breathing, short patrols inside the pen,
   * lying down to rest, and a hungry stomp toward the trough. Simulation
   * coordinates never change.
   */
  updateAnimal(producer: ProducerState, time: number, active: boolean): void {
    if (producer.kind !== 'animal') return
    const dt = this.animalLastTime === 0 ? 0 : Math.min(50, time - this.animalLastTime)
    this.animalLastTime = time

    if (producer.product === 'fish') {
      this.art.clear()
      drawAnimalFrame(this.art, producer, {
        dx: 0,
        dy: 0,
        facing: 1,
        rest: false,
        angry: false,
        time,
      })
      return
    }

    if (producer.hungry) {
      if (this.animalHungrySince === 0) this.animalHungrySince = time
      if (this.animalMode === 'rest') {
        this.animalMode = 'idle'
        this.animalUntil = 0
      }
    } else {
      this.animalHungrySince = 0
      this.animalEmoteUntil = 0
    }

    if (active && time >= this.animalUntil) this.chooseAnimalMode(time, producer.hungry)

    if (active && this.animalMode === 'walk') {
      const distance = this.animalTarget - this.animalX
      const step = (16 * dt) / 1000
      if (Math.abs(distance) <= step) {
        this.animalX = this.animalTarget
        this.animalMode = 'idle'
        this.animalUntil = time + 800 + this.random() * 1_200
      } else {
        this.animalX += Math.sign(distance) * step
        this.animalFacing = distance < 0 ? -1 : 1
      }
    }

    if (active && producer.hungry && time >= this.animalEmoteNext) {
      this.animalEmoteUntil = time + 1_500
      this.animalEmoteNext = time + 4_500 + this.random() * 1_800
    }

    const shake = producer.hungry ? Math.sin(time * 0.035) * 1.6 : 0
    const rest = this.animalMode === 'rest' && !producer.hungry
    const bob = this.animalMode === 'idle' ? Math.sin(time * 0.004) * 0.8 : 0
    this.art.clear()
    drawAnimalFrame(this.art, producer, {
      dx: this.animalX + shake,
      dy: (rest ? 3 : 0) + bob,
      facing: this.animalFacing,
      rest,
      angry: producer.hungry,
      time,
    })
    this.drawEmote(producer, time, rest)
  }

  private chooseAnimalMode(time: number, hungry: boolean): void {
    const roll = this.random()
    if (hungry) {
      if (roll < 0.6) {
        this.animalMode = 'walk'
        this.animalTarget = 18
        this.animalUntil = time + 1_100 + this.random() * 900
      } else {
        this.animalMode = 'idle'
        this.animalUntil = time + 700 + this.random() * 900
      }
      return
    }
    if (roll < 0.45) {
      this.animalMode = 'walk'
      this.animalTarget = -16 + this.random() * 28
      this.animalUntil = time + 900 + this.random() * 1_100
    } else if (roll < 0.67) {
      this.animalMode = 'rest'
      this.animalUntil = time + 3_000 + this.random() * 2_500
    } else {
      this.animalMode = 'idle'
      this.animalUntil = time + 1_200 + this.random() * 1_800
    }
  }

  private drawEmote(producer: ProducerState, time: number, resting: boolean): void {
    const hungry = producer.hungry && time < this.animalEmoteUntil
    if (!hungry && !resting) {
      this.emote.setVisible(false)
      return
    }
    const key =
      producer.product === 'egg'
        ? 'animal.cluck'
        : producer.product === 'milk'
          ? 'animal.moo'
          : producer.product === 'yarn'
            ? 'animal.baa'
            : null
    if (key === null) {
      this.emote.setVisible(false)
      return
    }
    const text = resting ? 'z z' : this.i18n.t(key)
    this.emoteText.setText(text)
    const width = Math.max(42, this.emoteText.width + 18)
    this.emoteBg.clear()
    this.emoteBg.fillStyle(0x3b2f3a, 0.16)
    this.emoteBg.fillRoundedRect(-width / 2, -11, width, 24, 10)
    this.emoteBg.fillStyle(0xfff7e8, 0.97)
    this.emoteBg.fillRoundedRect(-width / 2, -13, width, 24, 10)
    this.emoteBg.lineStyle(2, 0x3b2f3a, 0.28)
    this.emoteBg.strokeRoundedRect(-width / 2, -13, width, 24, 10)
    this.emoteBg.fillTriangle(-4, 11, 4, 11, 0, 17)
    this.emote.setVisible(true).setY(-102 + Math.sin(time * 0.006) * 2)
  }

  private random(): number {
    let x = this.animalSeed
    x ^= x << 13
    x >>>= 0
    x ^= x >>> 17
    x ^= x << 5
    this.animalSeed = x >>> 0 || 1
    return this.animalSeed / 4_294_967_296
  }
}

function producerKey(
  producer: ProducerState,
  shelves: Readonly<Record<ZoneId, ShelfState>>,
): string {
  const station =
    producer.kind === 'station' && isProcessedKind(producer.product)
      ? RECIPES[producer.product].inputs
          .map(
            (input) => `${recipeInputIcon(input)}${recipeInputAvailable(producer, shelves, input)}`,
          )
          .join(',')
      : ''
  return [
    producer.kind,
    producer.product,
    producer.mature,
    producer.hungry,
    producer.ready,
    Math.floor(producer.progressMs / 250),
    feedSignature(producer),
    hopperSignature(producer),
    station,
  ].join('-')
}

function hopperSignature(producer: ProducerState): string {
  return Object.entries(producer.hopper)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([product, amount]) => `${product}${amount}`)
    .join(',')
}

function feedSignature(producer: ProducerState): string {
  return Object.entries(producer.feed)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([product, amount]) => `${product}${amount}`)
    .join(',')
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
  const width = isFruit ? 54 : 60

  // A soft soil mound instead of a wooden planter box. The shadow and a couple
  // of grass tufts sell the depth without adding collision.
  g.fillStyle(0x3b2f3a, 0.14)
  g.fillEllipse(0, 12, width + 8, 16)
  g.fillStyle(gameColors.dirtDark, 1)
  g.fillEllipse(0, 6, width, isFruit ? 22 : 20)
  g.fillStyle(gameColors.dirt, 1)
  g.fillEllipse(-2, 3, width - 8, isFruit ? 17 : 15)
  g.fillStyle(0xb98a5c, 0.55)
  g.fillEllipse(-10, 0, width * 0.34, 5)
  g.fillStyle(0x8a5a2e, 0.5)
  g.fillEllipse(10, 4, width * 0.28, 4)
  g.fillStyle(gameColors.leafDark, 0.8)
  g.fillEllipse(-width / 2 + 5, 8, 8, 4)
  g.fillEllipse(width / 2 - 6, 10, 7, 3.5)

  if (isFruit) {
    g.fillStyle(0xc9a06a, 0.65)
    g.fillCircle(-6, 5, 1.4)
    g.fillCircle(8, 7, 1.1)
    return
  }

  // Vegetable rows: three curved furrows, not a rectangular board.
  g.lineStyle(2, 0x6f4b2e, 0.5)
  for (let row = 0; row < 2; row += 1) {
    g.beginPath()
    g.arc(0, 2 + row * 8, width * 0.34, Math.PI * 0.15, Math.PI * 0.85)
    g.strokePath()
  }
}

function drawTrough(g: Phaser.GameObjects.Graphics, producer: ProducerState): void {
  if (!isAnimalProductKind(producer.product) || producer.product === 'fish') return
  const capacity = troughCapacity(producer.product)
  const count = feedCount(producer)
  const spacing = 6
  const centerX = 28
  const left = centerX - ((capacity - 1) * spacing) / 2

  g.fillStyle(0x3b2f3a, 0.16)
  g.fillEllipse(centerX, 26, 28, 5)
  g.fillStyle(0x6f4b2e, 1)
  g.fillRoundedRect(centerX - 12, 15, 24, 10, 3)
  g.fillStyle(0x9c6b42, 1)
  g.fillRoundedRect(centerX - 10, 17, 20, 6, 2)

  for (let index = 0; index < capacity; index += 1) {
    const x = left + index * spacing
    const filled = index < count
    g.fillStyle(filled ? 0xffd166 : 0x5a3f28, 1)
    g.fillCircle(x, 20, 3.2)
    if (filled) {
      g.fillStyle(0xfff3b0, 0.85)
      g.fillCircle(x - 1, 19, 1.1)
    }
  }
}

interface AnimalFrame {
  readonly dx: number
  readonly dy: number
  readonly facing: -1 | 1
  readonly rest: boolean
  readonly angry: boolean
  readonly time: number
}

function drawAnimalFrame(
  g: Phaser.GameObjects.Graphics,
  producer: ProducerState,
  frame: AnimalFrame,
): void {
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
    const ripple = Math.sin(frame.time * 0.003) * 2
    g.fillStyle(0xffffff, 0.38)
    g.fillEllipse(10, -14 + ripple, 10, 4)
    for (let index = 0; index < Math.max(2, producer.ready); index += 1) {
      const bob = Math.sin(frame.time * 0.004 + index) * 1.5
      g.fillStyle(0xf08a3c, 1)
      g.fillEllipse(-14 + index * 14, 6 + bob, 14, 7)
      g.fillStyle(0xffb066, 1)
      g.fillEllipse(-16 + index * 14, 5 + bob, 8, 4)
    }
    return
  }

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

  g.save()
  g.translateCanvas(frame.dx, frame.dy)
  if (frame.facing < 0) g.scaleCanvas(-1, 1)
  if (frame.rest) g.scaleCanvas(1, 0.82)
  if (producer.product === 'egg') drawChicken(g, producer.ready, frame.rest, frame.angry)
  else if (producer.product === 'milk') drawCow(g, producer.ready, frame.rest, frame.angry)
  else drawSheep(g, producer.ready, frame.rest, frame.angry)
  g.restore()

  drawTrough(g, producer)
}

function drawChicken(
  g: Phaser.GameObjects.Graphics,
  ready: number,
  rest: boolean,
  angry: boolean,
): void {
  g.fillStyle(0xe6dccb, 1)
  g.fillEllipse(0, 1, 34, 26)
  g.fillStyle(0xffffff, 1)
  g.fillEllipse(-1, -1, 30, 22)
  g.fillStyle(0xfff3dd, 1)
  g.fillEllipse(-4, 2, 18, 13)
  g.fillStyle(0xffffff, 0.7)
  g.fillEllipse(-6, 0, 10, 7)
  // Tail feathers.
  g.fillStyle(0xf7ead6, 1)
  g.fillTriangle(-15, -2, -24, -10, -14, -10)
  g.fillTriangle(-15, 2, -25, 4, -14, -4)
  g.fillStyle(0xffffff, 1)
  g.fillCircle(14, -14, 10)
  g.fillStyle(0xe25d5d, 1)
  g.fillCircle(10, -23, 3)
  g.fillCircle(14, -25, 3.4)
  g.fillCircle(18, -23, 3)
  g.fillTriangle(10, -24, 16, -24, 13, -31)
  g.fillEllipse(17, -7, 4, 6)
  g.fillStyle(0xf2a93b, 1)
  g.fillTriangle(23, -13, 31, -10, 23, -7)
  g.fillStyle(0x3b2f3a, 1)
  g.fillCircle(17, -17, 1.8)
  if (rest) {
    g.lineStyle(1.6, 0x3b2f3a, 0.9)
    g.lineBetween(14, -17, 20, -17)
  } else if (angry) {
    g.lineStyle(1.8, 0x3b2f3a, 0.95)
    g.lineBetween(12, -21, 18, -19)
    g.lineBetween(22, -21, 17, -19)
  }
  g.fillStyle(0xf2a93b, 1)
  g.fillRoundedRect(-8, 10, 5, 8, 2)
  g.fillRoundedRect(6, 10, 5, 8, 2)
  for (let index = 0; index < ready; index += 1) {
    g.fillStyle(0xfff3dd, 1)
    g.fillEllipse(-20 + index * 8, 18, 7, 9)
  }
}

function drawCow(
  g: Phaser.GameObjects.Graphics,
  ready: number,
  rest: boolean,
  angry: boolean,
): void {
  g.fillStyle(0xe9e2d6, 1)
  g.fillEllipse(0, 1, 42, 28)
  g.fillStyle(0xffffff, 1)
  g.fillEllipse(-1, -1, 40, 25)
  g.fillStyle(0xffffff, 0.7)
  g.fillEllipse(-12, -7, 14, 8)
  g.fillStyle(0x3b2f3a, 1)
  g.fillEllipse(-10, -2, 12, 10)
  g.fillEllipse(12, 4, 10, 8)
  g.fillStyle(0xffffff, 1)
  g.fillCircle(18, -14, 11)
  g.fillStyle(0xf2cf9e, 1)
  g.fillEllipse(8, -13, 7, 5)
  g.fillEllipse(28, -13, 7, 5)
  g.fillStyle(0xf2a8b4, 1)
  g.fillEllipse(22, -10, 10, 7)
  g.fillStyle(0xc95b70, 0.75)
  g.fillCircle(20, -9, 1.1)
  g.fillCircle(24, -9, 1.1)
  g.fillStyle(0x3b2f3a, 1)
  g.fillCircle(15, -17, 1.8)
  g.fillCircle(21, -17, 1.8)
  if (rest) {
    g.lineStyle(1.6, 0x3b2f3a, 0.9)
    g.lineBetween(12, -17, 18, -17)
    g.lineBetween(18, -17, 24, -17)
  } else if (angry) {
    g.lineStyle(1.8, 0x3b2f3a, 0.95)
    g.lineBetween(10, -21, 16, -19)
    g.lineBetween(26, -21, 20, -19)
  }
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

function drawSheep(
  g: Phaser.GameObjects.Graphics,
  ready: number,
  rest: boolean,
  angry: boolean,
): void {
  g.fillStyle(0xf0e6d4, 1)
  g.fillCircle(-10, -1, 15)
  g.fillCircle(8, -5, 16)
  g.fillCircle(16, 5, 12)
  g.fillCircle(-2, 9, 14)
  g.fillStyle(0xfff7e9, 1)
  g.fillCircle(-11, -3, 12)
  g.fillCircle(7, -7, 13)
  g.fillCircle(14, 3, 9)
  g.fillCircle(-2, 7, 11)
  g.lineStyle(1.4, 0xe0cfb6, 0.8)
  g.beginPath()
  g.arc(-8, -4, 5, 0.2, 3.6)
  g.strokePath()
  g.beginPath()
  g.arc(8, -3, 4.5, -0.4, 3.0)
  g.strokePath()
  g.fillStyle(0xf7ddc0, 1)
  g.fillCircle(18, -12, 9)
  g.fillStyle(0xf7ddc0, 1)
  g.fillEllipse(10, -13, 6, 4)
  g.fillEllipse(26, -13, 6, 4)
  g.fillStyle(0x3b2f3a, 1)
  g.fillCircle(15, -15, 1.7)
  g.fillCircle(21, -15, 1.7)
  if (rest) {
    g.lineStyle(1.5, 0x3b2f3a, 0.9)
    g.lineBetween(12, -15, 18, -15)
    g.lineBetween(18, -15, 24, -15)
  } else if (angry) {
    g.lineStyle(1.7, 0x3b2f3a, 0.95)
    g.lineBetween(10, -19, 16, -17)
    g.lineBetween(26, -19, 20, -17)
  }
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
  g.fillStyle(0xb07a4a, 1)
  g.fillRoundedRect(-width / 2 + 8, -height / 2 + 6, width - 16, 5, 2.5)
  g.fillStyle(0x3b2f3a, 0.18)
  g.fillRoundedRect(-width / 2 + 8, height / 2 - 6, 12, 4, 2)
  g.fillRoundedRect(width / 2 - 20, height / 2 - 6, 12, 4, 2)

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
  } else if (producer.product === 'juice') {
    g.fillStyle(0x5a4a4a, 1)
    g.fillRoundedRect(-24, -14, 48, 30, 6)
    g.fillStyle(0x7a6666, 1)
    g.fillRoundedRect(-20, -10, 40, 22, 5)
    g.fillStyle(0xdff3ef, 1)
    g.fillRoundedRect(-10, -12, 20, 22, 5)
    g.fillStyle(0xffa94d, 1)
    g.fillRoundedRect(-7, -3, 14, 11, 3)
    g.fillStyle(0xffd08a, 0.8)
    g.fillEllipse(-3, -1, 6, 2)
    g.fillStyle(0x5aa96f, 1)
    g.fillEllipse(-15, -16, 12, 5)
    g.fillStyle(0xf2a93b, 1)
    g.fillCircle(-18, -16, 4)
    g.lineStyle(2, 0x9aa5aa, 1)
    g.lineBetween(14, -12, 14, 10)
    g.fillStyle(0x4f5a5f, 1)
    g.fillCircle(14, 12, 5)
    g.fillStyle(0xffd166, 1)
    g.fillCircle(14, 12, 2)
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
