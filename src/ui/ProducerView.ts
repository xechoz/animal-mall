import { type I18n, type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import {
  ANIMALS,
  animalNeedsTrough,
  FEED_ORDER,
  isAnimalProductKind,
  isPlantKind,
  isProcessedKind,
  PLANTS,
  RECIPES,
  type RecipeInput,
  troughCapacity,
  zoneOf,
} from '../logic/config'
import { inputCapacity, recipeInputIcon, recipeInputTotal } from '../logic/production'
import type { PlantKind, ProducerState, ShelfState, ZoneId } from '../logic/types'
import { bakeLayer, ensureTexture } from './bakeArt'
import { feedTextureKey } from './fruitArt'
import { drawClover, drawGrassTuft, drawPenDecor, drawTilledBed } from './groundArt'
import { drawPlantCrop, plantGrowthScale } from './plantArt'
import { MIXED_INPUT_TEXTURE, productTextureKey } from './productArt'
import { drawStation, drawStationFx, drawStationPad } from './stationArt'

export class ProducerView extends Phaser.GameObjects.Container {
  /**
   * Soil bed drawn below every actor so the player can stand on it while the
   * crop layer above hides them, giving the feeling of walking through bushes.
   */
  readonly ground: Phaser.GameObjects.Image
  private readonly art: Phaser.GameObjects.Graphics
  private readonly artImage: Phaser.GameObjects.Image
  private readonly bakeScale: number
  private readonly groundKey: string
  private readonly ring: Phaser.GameObjects.Graphics
  private readonly feedRing: Phaser.GameObjects.Graphics
  private readonly hungryRing: Phaser.GameObjects.Graphics
  private readonly stationFx: Phaser.GameObjects.Graphics
  private readonly hungryBubble: Phaser.GameObjects.Container
  private readonly badge: Phaser.GameObjects.Text
  private readonly status: Phaser.GameObjects.Text
  private readonly productIcon: Phaser.GameObjects.Image
  private readonly feedIcon: Phaser.GameObjects.Image
  private readonly feedIcons: Phaser.GameObjects.Image[] = []
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
    bakeScale = 1,
  ) {
    super(scene, producer.pos.x, producer.pos.y)
    this.i18n = i18n
    this.bakeScale = bakeScale

    // Keep the Graphics at the local origin: bakeLayer captures its local
    // coordinates, and the resulting image is moved to producer.pos below.
    const groundArt = scene.add.graphics()
    if (producer.kind === 'plant') drawPlantBed(groundArt, producer)
    if (producer.kind === 'animal' && isAnimalProductKind(producer.product)) {
      drawPenDecor(groundArt, producer.product, producer.slot)
    }
    if (producer.kind === 'station' && isProcessedKind(producer.product)) {
      // The work mat follows the installed machine, so a swapped station never
      // keeps the old oven pad under a jam pot.
      drawStationPad(groundArt, producer.product, 0, 0)
    }
    const groundScale = Math.min(3, bakeScale)
    this.groundKey = `producer-ground-${producer.id}-${producer.kind}-${producer.product}-${producer.slot}-${groundScale}`
    this.ground = bakeLayer(
      scene,
      groundArt,
      this.groundKey,
      { x: -80, y: -70 },
      160,
      140,
      groundScale,
    ).setPosition(producer.pos.x - 80, producer.pos.y - 70)
    groundArt.destroy()

    this.art = scene.add.graphics()
    this.artImage = scene.add.image(0, 0, '__DEFAULT').setVisible(false)
    this.ring = scene.add.graphics()
    this.feedRing = scene.add.graphics()
    this.hungryRing = scene.add.graphics()
    this.stationFx = scene.add.graphics()
    this.add([this.artImage, this.art, this.ring, this.feedRing, this.hungryRing, this.stationFx])

    const bubbleBg = scene.add.graphics()
    bubbleBg.fillStyle(0x3b2f3a, 0.16)
    bubbleBg.fillRoundedRect(-36, -12, 72, 25, 10)
    bubbleBg.fillStyle(0xfff7e8, 0.97)
    bubbleBg.fillRoundedRect(-38, -14, 76, 25, 10)
    bubbleBg.lineStyle(2, theme.ink, 0.28)
    bubbleBg.strokeRoundedRect(-38, -14, 76, 25, 10)
    bubbleBg.fillTriangle(-4, 11, 4, 11, 0, 17)
    const bubbleIcon = scene.add.image(-24, -1, feedTextureKey()).setScale(0.34)
    const bubbleText = scene.add
      .text(3, -1, i18n.t('animal.hungry'), textStyle(theme, 10 * textScale, theme.text, true))
      .setOrigin(0.5)
    this.hungryBubble = scene.add
      .container(0, -92, [bubbleBg, bubbleIcon, bubbleText])
      .setVisible(false)
    this.add(this.hungryBubble)

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

    for (let index = 0; index < 12; index += 1) {
      const icon = scene.add
        .image(0, 19, productTextureKey('apple'))
        .setScale(0.26)
        .setVisible(false)
      this.feedIcons.push(icon)
      this.add(icon)
    }

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

  private setArtTexture(key: string, width: number, height: number, growth: number): void {
    const source = this.scene.textures.get(key).getSourceImage()
    this.artImage
      .setTexture(key)
      .setScale((width / source.width) * growth, (height / source.height) * growth)
      .setVisible(true)
  }

  destroy(fromScene?: boolean): void {
    const textures = this.scene?.textures
    super.destroy(fromScene)
    if (textures?.exists(this.groundKey)) textures.remove(this.groundKey)
  }

  /** Highlights the trough while the player carries something it accepts. */
  setFeedActive(active: boolean): void {
    this.feedRing.clear()
    if (!active) return
    this.feedRing.lineStyle(3, 0xffd166, 0.95)
    this.feedRing.strokeCircle(20, -19, 17)
    this.feedRing.lineStyle(2, 0xfff7e8, 0.8)
    this.feedRing.strokeCircle(20, -19, 21)
  }

  /** Animated oven glow, grill smoke, loom shuttle and juice bubbles. */
  updateStation(producer: ProducerState, time: number, active = true): void {
    drawStationFx(this.stationFx, producer, time, active)
  }

  updateProducer(producer: ProducerState, shelves: Readonly<Record<ZoneId, ShelfState>>): void {
    const key = producerKey(producer, shelves)
    if (key === this.lastKey) return
    this.lastKey = key

    this.art.clear()
    this.art.setVisible(true)
    this.artImage.setVisible(false)
    this.ring.clear()
    this.art.setScale(1)
    this.badge.setVisible(false)
    this.status.setVisible(false)
    this.productIcon.setVisible(false)
    this.feedIcon.setVisible(false)
    this.hungryBubble.setVisible(false)
    for (const icon of this.feedIcons) icon.setVisible(false)
    for (const icon of this.inputIcons) icon.setVisible(false)
    for (const count of this.inputCounts) count.setVisible(false)

    if (producer.kind === 'plant' && isPlantKind(producer.product)) {
      const product = producer.product
      const ratio = producer.mature ? 1 : Math.min(1, producer.progressMs / PLANTS[product].growMs)
      const sprout = !producer.mature && ratio < 0.38
      const textureScale = Math.min(3, this.bakeScale)
      const texture = ensureTexture(
        this.scene,
        `crop-${product}-${sprout ? 'sprout' : 'full'}-${producer.ready}-${textureScale}`,
        { x: -72, y: -120 },
        144,
        150,
        textureScale,
        (g) => drawPlantCrop(g, product, sprout ? 0.2 : 1, !sprout, producer.ready),
      )
      this.art.setVisible(false)
      this.artImage.setOrigin(0.5, 0.8).setPosition(0, 0)
      this.setArtTexture(texture, 144, 150, plantGrowthScale(ratio))
    } else if (producer.kind === 'animal') {
      // The animal layer is redrawn every frame by updateAnimal so it can walk,
      // rest and react to hunger without touching the simulation.
    } else if (producer.kind === 'station') {
      if (isProcessedKind(producer.product)) {
        const textureScale = Math.min(3, this.bakeScale)
        const texture = ensureTexture(
          this.scene,
          `station-${producer.product}-${producer.ready}-${textureScale}`,
          { x: -80, y: -100 },
          160,
          160,
          textureScale,
          (g) => drawStation(g, producer),
        )
        this.art.setVisible(false)
        this.artImage.setOrigin(0.5, 0.625).setPosition(0, 0)
        this.setArtTexture(texture, 160, 160, 1)

        const config = RECIPES[producer.product]
        const crafting = producer.progressMs > 0
        if (config.handLoad === false) {
          // Shelf-fed machines have no hopper chips; their recipe card explains
          // that they pull straight from the shelf.
          for (const icon of this.inputIcons) icon.setVisible(false)
          for (const count of this.inputCounts) count.setVisible(false)
        } else {
          config.inputs.forEach((input, index) => {
            const icon = this.inputIcons[index]
            const count = this.inputCounts[index]
            if (icon === undefined || count === undefined) return
            const available = recipeInputTotal(producer, shelves, input, config.reserve ?? 1)
            const capacity = inputCapacity(input)
            icon
              .setTexture(inputChipTexture(input))
              .setVisible(true)
              .setAlpha(crafting ? 0.45 : 1)
            count
              .setText(
                crafting ? `×${input.count}` : `${Math.min(available, capacity)}/${capacity}`,
              )
              .setColor(!crafting && available < input.count ? '#e25d5d' : '#3b2f3a')
              .setVisible(true)
          })
        }
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

    // Stations carry their own taller art, so their chips sit above the chimney
    // instead of on top of the machine body.
    const stationTop = producer.kind === 'station'
    if (producer.kind === 'station') {
      configStationInputPositions(this.inputIcons, this.inputCounts)
    }

    // Animals show their produce as art in the pen, so only a station keeps a
    // numeric ready badge above its chimney.
    if (producer.ready > 0 && producer.kind === 'station') {
      this.badge.setPosition(0, -94).setText(String(producer.ready)).setVisible(true)
    }

    if (producer.hungry && isAnimalProductKind(producer.product)) {
      this.feedIcon.setPosition(0, -58).setTexture(feedTextureKey()).setVisible(true)
      this.status.setText('!').setColor('#e25d5d').setVisible(true)
      this.hungryBubble.setVisible(producer.product !== 'fish')
    } else if (producer.kind !== 'plant') {
      this.productIcon
        .setTexture(productTextureKey(producer.product))
        .setPosition(0, stationTop ? -76 : -34)
        .setVisible(true)
    }

    if (
      producer.kind === 'animal' &&
      isAnimalProductKind(producer.product) &&
      animalNeedsTrough(producer.product)
    ) {
      const capacity = troughCapacity(producer.product)
      const feeds = feedKinds(producer)
      this.feedIcons.forEach((icon, index) => {
        const kind = feeds[index]
        const visible = index < capacity && kind !== undefined
        icon.setVisible(visible)
        if (!visible) return
        icon
          .setTexture(productTextureKey(kind))
          .setPosition(troughSlotX(index, capacity), troughSlotY(index, capacity))
      })
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
      this.hungryRing.clear()
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

    if (producer.product === 'honey') {
      // The hive is static; only the bees and the honey bubble animate.
      this.art.clear()
      this.hungryRing.clear()
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
    this.drawHungryRing(producer, time)
    if (this.hungryBubble.visible) {
      this.hungryBubble.setY(-92 + Math.sin(time * 0.006) * 2)
    }
  }

  /** Persistent local cue: an empty trough pulses while the animal is hungry. */
  private drawHungryRing(producer: ProducerState, time: number): void {
    this.hungryRing.clear()
    if (!producer.hungry) return
    const pulse = 0.55 + Math.sin(time * 0.006) * 0.3
    this.hungryRing.lineStyle(3, 0xe25d5d, pulse)
    this.hungryRing.strokeEllipse(20, -19, 34, 19)
    this.hungryRing.lineStyle(2, 0xfff7e8, pulse * 0.8)
    this.hungryRing.strokeEllipse(20, -19, 39, 23)
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
    // Hunger uses the persistent "Feed me!" bubble; keep the speech bubble for
    // resting animals only so two prompts never stack over the same pen.
    if (producer.hungry || !resting) {
      this.emote.setVisible(false)
      return
    }
    this.emoteText.setText('z z')
    const width = Math.max(42, this.emoteText.width + 18)
    this.emoteBg.clear()
    this.emoteBg.fillStyle(0x3b2f3a, 0.16)
    this.emoteBg.fillRoundedRect(-width / 2, -11, width, 24, 10)
    this.emoteBg.fillStyle(0xfff7e8, 0.97)
    this.emoteBg.fillRoundedRect(-width / 2, -13, width, 24, 10)
    this.emoteBg.lineStyle(2, 0x3b2f3a, 0.28)
    this.emoteBg.strokeRoundedRect(-width / 2, -13, width, 24, 10)
    this.emoteBg.fillTriangle(-4, 11, 4, 11, 0, 17)
    this.emote.setVisible(true).setY(-78 + Math.sin(time * 0.006) * 2)
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

/** A pool input shows one mixed-food chip instead of a single product icon. */
function inputChipTexture(input: RecipeInput): string {
  return 'pool' in input ? MIXED_INPUT_TEXTURE : productTextureKey(recipeInputIcon(input))
}

function inputKey(input: RecipeInput): string {
  return 'pool' in input ? 'pool' : recipeInputIcon(input)
}

function producerKey(
  producer: ProducerState,
  shelves: Readonly<Record<ZoneId, ShelfState>>,
): string {
  const station =
    producer.kind === 'station' && isProcessedKind(producer.product)
      ? (() => {
          const recipe = RECIPES[producer.product]
          return recipe.inputs
            .map(
              (input) =>
                `${inputKey(input)}${recipeInputTotal(
                  producer,
                  shelves,
                  input,
                  recipe.reserve ?? 1,
                )}`,
            )
            .join(',')
        })()
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
  drawTilledBed(g, 0, 0, isFruit ? 'fruit' : 'veg')

  // Deterministic per-slot offsets keep the field from looking stamped without
  // touching the simulation.
  const wobble = (producer.slot % 3) - 1
  if (isFruit) {
    // Fruit grows out of a lawn: grass spills over the rectangular bed edge.
    const tufts = [
      [-30, 5, 0.8],
      [-27, 15, 0.62],
      [30, 7, 0.72],
      [26, 16, 0.58],
      [-16, 20, 0.55],
      [15, 19, 0.5],
      [1, 23, 0.48],
      [-8, 13, 0.45],
      [9, 12, 0.4],
    ] as const
    for (const [x, y, scale] of tufts) drawGrassTuft(g, x + wobble, y, scale)
    drawClover(g, -23 + wobble, 9, 0.8)
    drawClover(g, 22 - wobble, 12, 0.7)
    drawClover(g, 1, 17, 0.6)
    return
  }

  // Vegetables stay on dark, mostly bare soil: at most one small weed.
  if (producer.slot % 2 === 0) drawGrassTuft(g, 30 + wobble, 10, 0.5)
}

function drawTrough(g: Phaser.GameObjects.Graphics, producer: ProducerState): void {
  if (!isAnimalProductKind(producer.product) || producer.product === 'fish') return
  const capacity = troughCapacity(producer.product)

  // Top-right inside the pen (pen half is 40 x 28): body x 3~37, y -26~-11
  // keeps every rail readable and the front fence can no longer cover it.
  g.fillStyle(0x3b2f3a, 0.16)
  g.fillEllipse(20, -10, 40, 9)

  // Feet, a front face and a hollow top make the trough a small object with
  // height instead of a flat rounded rectangle on the soil.
  g.fillStyle(0x5a3f28, 1)
  g.fillRoundedRect(7, -14, 5, 5, 1.5)
  g.fillRoundedRect(28, -14, 5, 5, 1.5)
  g.fillStyle(0x6f4b2e, 1)
  g.fillRoundedRect(3, -26, 34, 15, 4)
  g.fillStyle(0x8f5734, 0.5)
  g.fillRoundedRect(33, -24, 5, 11, 2)
  g.fillStyle(0xb07a4a, 1)
  g.fillRoundedRect(5, -25, 30, 8, 3)
  g.fillStyle(0x5a3f28, 1)
  g.fillRoundedRect(7, -24, 26, 5, 2.5)
  g.fillStyle(0xd39a65, 0.85)
  g.fillRoundedRect(5, -25, 30, 2, 1)
  g.fillStyle(0x8f5734, 1)
  g.fillRoundedRect(5, -18, 30, 3, 1.5)

  // Empty hollows show where food goes; the icons layer on top of them.
  // Deep troughs (5+ slots) wrap to two rows so a 12-slot duck trough still
  // fits inside the 80-wide pen.
  for (let index = 0; index < capacity; index += 1) {
    const x = troughSlotX(index, capacity)
    const y = troughSlotY(index, capacity)
    g.fillStyle(0x3f2b1c, 0.85)
    g.fillEllipse(x, y - 1, 7, 4.5)
    g.fillStyle(0x2f1e12, 0.5)
    g.fillEllipse(x, y, 4.5, 2)
  }
}

function troughRowCapacity(capacity: number): number {
  return capacity > 6 ? Math.ceil(capacity / 2) : capacity
}

function troughSlotX(index: number, capacity: number): number {
  if (capacity <= 6) return 20 + (index - (capacity - 1) / 2) * 8
  const perRow = troughRowCapacity(capacity)
  const rowIndex = index % perRow
  const rowCount = index < perRow ? perRow : capacity - perRow
  return 20 + (rowIndex - (rowCount - 1) / 2) * 8
}

function troughSlotY(index: number, capacity: number): number {
  if (capacity <= 6) return -20
  return index < troughRowCapacity(capacity) ? -23 : -16
}

/** Actual food currently in the trough, cheapest first, matching `takeFeed`. */
function feedKinds(producer: ProducerState): PlantKind[] {
  const kinds: PlantKind[] = []
  for (const kind of FEED_ORDER) {
    const count = producer.feed[kind] ?? 0
    for (let index = 0; index < count; index += 1) kinds.push(kind)
  }
  return kinds
}

function configStationInputPositions(
  icons: readonly Phaser.GameObjects.Image[],
  counts: readonly Phaser.GameObjects.Text[],
): void {
  icons.forEach((icon, index) => {
    icon.setPosition(-20 + index * 40, -62)
  })
  counts.forEach((count, index) => {
    count.setPosition(-8 + index * 40, -54)
  })
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
  const isHive = producer.product === 'honey'

  g.fillStyle(0x3b2f3a, 0.12)
  g.fillEllipse(7, 27, width + 4, 12)
  g.fillStyle(0x3b2f3a, 0.2)
  g.fillEllipse(0, 25, width + 6, 14)
  if (isPond) {
    g.fillStyle(0x5aa9c9, 1)
    g.fillEllipse(0, 0, width, height)
    g.fillStyle(0x86d0e0, 1)
    g.fillEllipse(-6, -4, width - 18, height - 18)
    g.fillStyle(0x4a8f5d, 1)
    g.fillEllipse(-20, -10, 14, 8)
    g.fillEllipse(20, 8, 12, 7)
    g.fillStyle(0xf5a3b5, 1)
    g.fillCircle(-23, -14, 2.2)
    g.fillStyle(0xfff3dd, 1)
    g.fillCircle(-23, -14, 1)
    const ripple = Math.sin(frame.time * 0.003) * 2
    g.fillStyle(0xffffff, 0.38)
    g.fillEllipse(10, -14 + ripple, 10, 4)
    g.lineStyle(1.4, 0xffffff, 0.35)
    g.strokeEllipse(10, -14 + ripple, 22, 8)

    // A koi jumps out of the pond every few seconds, then splashes back.
    const t = frame.time * 0.001 + producer.id * 0.9
    const jumpPhase = (t % 4.2) / 0.9
    if (jumpPhase < 1) {
      const arc = Math.sin(jumpPhase * Math.PI)
      const jumpX = -4 + jumpPhase * 14
      const jumpY = 2 - arc * 17
      g.save()
      g.translateCanvas(jumpX, jumpY)
      g.rotateCanvas(0.5 - jumpPhase * 1.2)
      g.fillStyle(0xf08a3c, 1)
      g.fillEllipse(0, 0, 14, 7)
      g.fillStyle(0xffb066, 1)
      g.fillEllipse(-1, -1, 9, 4)
      g.fillStyle(0xffffff, 1)
      g.fillEllipse(0, -2, 5, 2)
      g.fillStyle(0xf08a3c, 1)
      g.fillTriangle(7, 0, 12, -4, 12, 4)
      g.restore()
      g.lineStyle(1.6, 0xffffff, 0.55 * (1 - jumpPhase))
      g.strokeEllipse(jumpX, 4, 16 + jumpPhase * 12, 5)
    }

    for (let index = 0; index < Math.max(2, producer.ready); index += 1) {
      const bob = Math.sin(frame.time * 0.004 + index) * 1.5
      g.fillStyle(0xf08a3c, 1)
      g.fillEllipse(-14 + index * 14, 6 + bob, 14, 7)
      g.fillStyle(0xffb066, 1)
      g.fillEllipse(-16 + index * 14, 5 + bob, 8, 4)
    }
    return
  }

  if (isHive) {
    drawBeehive(g, producer.ready, frame.time)
    return
  }

  g.save()
  g.translateCanvas(frame.dx, frame.dy)
  if (frame.facing < 0) g.scaleCanvas(-1, 1)
  if (frame.rest) g.scaleCanvas(1, 0.82)
  if (producer.product === 'egg') drawChicken(g, producer.ready, frame, producer.id)
  else if (producer.product === 'milk') drawCow(g, producer.ready, frame, producer.id)
  else if (producer.product === 'yarn') drawSheep(g, producer.ready, frame, producer.id)
  else if (producer.product === 'cheese') drawGoat(g, producer.ready, frame, producer.id)
  else if (producer.product === 'truffle') drawPig(g, producer.ready, frame, producer.id)
  else if (producer.product === 'duckEgg') drawDuck(g, producer.ready, frame, producer.id)
  else if (producer.product === 'donkeyMilk') drawDonkey(g, producer.ready, frame, producer.id)
  else if (producer.product === 'feather') drawTurkey(g, producer.ready, frame, producer.id)
  else drawGoat(g, producer.ready, frame, producer.id)
  g.restore()

  if (isAnimalProductKind(producer.product) && animalNeedsTrough(producer.product)) {
    drawPenBaby(g, producer, frame)
  }

  if (isAnimalProductKind(producer.product) && animalNeedsTrough(producer.product)) {
    drawTrough(g, producer)
  }
}

function drawChicken(
  g: Phaser.GameObjects.Graphics,
  ready: number,
  frame: AnimalFrame,
  seed: number,
): void {
  const t = frame.time * 0.001 + seed * 1.7
  const peckPhase = (t % 3.6) / 0.75
  const peck = frame.rest || frame.angry ? 0 : peckPhase < 1 ? Math.sin(peckPhase * Math.PI) : 0
  const flap = frame.angry ? Math.abs(Math.sin(frame.time * 0.02 + seed)) : 0
  const bodyX = peck * 2
  const headX = 12 + peck * 5
  const headY = -14 + peck * 9

  // Straw nest and the finished eggs.
  g.fillStyle(0xd9b25a, 0.9)
  g.fillEllipse(-15, 19, 30, 10)
  g.fillStyle(0xf0d08a, 1)
  g.fillEllipse(-16, 17, 24, 7)
  for (let index = 0; index < ready; index += 1) {
    g.fillStyle(0xfff3dd, 1)
    g.fillEllipse(-20 + index * 8, 16, 7, 9)
    g.fillStyle(0xe8d9bd, 1)
    g.fillEllipse(-20 + index * 8, 15, 4, 5)
  }

  // Legs and feet.
  if (!frame.rest) {
    g.fillStyle(0xf2a93b, 1)
    g.fillRoundedRect(-8 + bodyX, 10, 5, 9, 2)
    g.fillRoundedRect(6 + bodyX, 10, 5, 9, 2)
    g.lineStyle(1.6, 0xc98b2f, 1)
    g.lineBetween(-8 + bodyX, 19, -11 + bodyX, 21)
    g.lineBetween(-6 + bodyX, 19, -6 + bodyX, 21)
    g.lineBetween(6 + bodyX, 19, 3 + bodyX, 21)
    g.lineBetween(8 + bodyX, 19, 8 + bodyX, 21)
  }

  // Tail feathers fan out behind the body.
  g.fillStyle(0xf7ead6, 1)
  g.fillTriangle(-15 + bodyX, -2, -25 + bodyX, -10, -14 + bodyX, -10)
  g.fillTriangle(-15 + bodyX, 2, -26 + bodyX, 4, -14 + bodyX, -4)
  g.fillTriangle(-14 + bodyX, 6, -24 + bodyX, 10, -12 + bodyX, 0)

  // Plump body and folded wing.
  g.fillStyle(0xe6dccb, 1)
  g.fillEllipse(bodyX, 2, 34, 27)
  g.fillStyle(0xffffff, 1)
  g.fillEllipse(-1 + bodyX, 0, 30, 23)
  g.fillStyle(0xfff3dd, 1)
  g.fillEllipse(-5 + bodyX, 3, 18, 13)
  g.fillStyle(0xffffff, 0.7)
  g.fillEllipse(-7 + bodyX, 0, 10, 7)
  g.fillStyle(0xf7ead6, 1)
  g.fillEllipse(4 + bodyX + flap * 3, 1, 13, 10)
  g.lineStyle(1.2, 0xdccbb4, 0.8)
  g.beginPath()
  g.arc(4 + bodyX, 2, 5, 0.3, 2.8)
  g.strokePath()

  // Neck and head.
  g.fillStyle(0xffffff, 1)
  g.fillEllipse(8 + bodyX, -7, 14, 13)
  g.fillCircle(headX, headY, 10)
  g.fillStyle(0xfff3dd, 0.7)
  g.fillEllipse(headX - 3, headY + 2, 9, 7)

  // Red comb and wattle.
  g.fillStyle(0xe25d5d, 1)
  g.fillCircle(headX - 4, headY - 11, 3)
  g.fillCircle(headX, headY - 13, 3.4)
  g.fillCircle(headX + 4, headY - 11, 3)
  g.fillTriangle(headX - 4, headY - 12, headX + 2, headY - 12, headX - 1, headY - 19)
  g.fillEllipse(headX + 3, headY + 7, 4, 6)

  // Beak and eye.
  g.fillStyle(0xf2a93b, 1)
  g.fillTriangle(headX + 8, headY - 2, headX + 17, headY + 1, headX + 8, headY + 5)
  g.fillStyle(0xc98b2f, 1)
  g.lineBetween(headX + 9, headY + 1, headX + 16, headY + 1)
  g.fillStyle(0x3b2f3a, 1)
  g.fillCircle(headX + 3, headY - 3, 1.8)
  if (frame.rest) {
    g.lineStyle(1.6, 0x3b2f3a, 0.9)
    g.lineBetween(headX, headY - 3, headX + 6, headY - 3)
  } else if (frame.angry) {
    g.lineStyle(1.8, 0x3b2f3a, 0.95)
    g.lineBetween(headX - 2, headY - 7, headX + 4, headY - 5)
    g.lineBetween(headX + 9, headY - 7, headX + 4, headY - 5)
  }

  if (peck > 0) {
    g.fillStyle(0xffffff, 0.45)
    g.fillCircle(headX + 18, headY + 8, 1.5)
    g.fillCircle(headX + 20, headY + 12, 1.1)
  }
}

function drawCow(
  g: Phaser.GameObjects.Graphics,
  ready: number,
  frame: AnimalFrame,
  seed: number,
): void {
  const t = frame.time * 0.001 + seed
  const chew = frame.rest ? 0 : 0.5 + Math.sin(t * 6.5) * 0.5
  const swish = Math.sin(t * 1.8) * 4
  const headY = -14 + chew * 1.2

  // Tail with a tuft, swishing behind the body.
  g.lineStyle(3, 0x8f5734, 1)
  g.beginPath()
  g.moveTo(21, 4)
  g.lineTo(27 + swish * 0.4, 8)
  g.lineTo(30 + swish, 16)
  g.strokePath()
  g.fillStyle(0x3b2f3a, 1)
  g.fillEllipse(30 + swish, 17, 5, 7)

  // Legs and hooves.
  if (!frame.rest) {
    g.fillStyle(0xf5f1e8, 1)
    g.fillRoundedRect(-14, 12, 6, 10, 2)
    g.fillRoundedRect(-6, 12, 6, 10, 2)
    g.fillRoundedRect(6, 12, 6, 10, 2)
    g.fillRoundedRect(13, 12, 6, 10, 2)
    g.fillStyle(0x3b2f3a, 1)
    g.fillRoundedRect(-14, 20, 6, 4, 2)
    g.fillRoundedRect(-6, 20, 6, 4, 2)
    g.fillRoundedRect(6, 20, 6, 4, 2)
    g.fillRoundedRect(13, 20, 6, 4, 2)
  }

  // Udder and pink teats.
  g.fillStyle(0xf2a8b4, 1)
  g.fillEllipse(0, 14, 16, 8)
  g.fillStyle(0xd06a7c, 1)
  g.fillCircle(-4, 16, 1.6)
  g.fillCircle(3, 16, 1.6)

  // Broad, blocky body with black patches.
  g.fillStyle(0xe9e2d6, 1)
  g.fillEllipse(0, 2, 44, 30)
  g.fillStyle(0xffffff, 1)
  g.fillEllipse(-1, 0, 41, 27)
  g.fillStyle(0x3b2f3a, 1)
  g.fillEllipse(-13, -4, 13, 10)
  g.fillEllipse(9, 2, 11, 9)
  g.fillEllipse(-2, 9, 8, 5)
  g.fillStyle(0xffffff, 0.75)
  g.fillEllipse(-14, -8, 10, 6)

  // Head, ears and horns.
  g.fillStyle(0xffffff, 1)
  g.fillEllipse(16, headY, 20, 18)
  g.fillStyle(0xe9e2d6, 1)
  g.fillEllipse(8, headY - 5, 8, 5)
  g.fillEllipse(24, headY - 5, 8, 5)
  g.fillStyle(0xf2cf9e, 1)
  g.fillTriangle(8, headY - 10, 12, headY - 10, 10, headY - 17)
  g.fillTriangle(22, headY - 10, 26, headY - 10, 24, headY - 17)
  g.fillStyle(0xf2cf9e, 1)
  g.fillEllipse(18, headY + 4, 12, 9)
  g.fillStyle(0xf2a8b4, 1)
  g.fillEllipse(20, headY + 5, 7, 5)
  g.fillStyle(0xc95b70, 0.8)
  g.fillCircle(18, headY + 5, 1.1)
  g.fillCircle(22, headY + 5, 1.1)

  // Eyes and a chewing cheek.
  g.fillStyle(0x3b2f3a, 1)
  g.fillCircle(12, headY - 3, 1.8)
  g.fillCircle(20, headY - 3, 1.8)
  g.fillStyle(0xf2a8b4, 0.45)
  g.fillEllipse(24, headY + 1 + chew, 5, 3)
  if (frame.rest) {
    g.lineStyle(1.6, 0x3b2f3a, 0.9)
    g.lineBetween(10, headY - 3, 15, headY - 3)
    g.lineBetween(19, headY - 3, 24, headY - 3)
  } else if (frame.angry) {
    g.lineStyle(1.8, 0x3b2f3a, 0.95)
    g.lineBetween(8, headY - 7, 14, headY - 5)
    g.lineBetween(26, headY - 7, 20, headY - 5)
  }

  // Milk bottles from the ready batch.
  for (let index = 0; index < ready; index += 1) {
    const x = -20 + index * 9
    g.fillStyle(0xdfe9f2, 1)
    g.fillRoundedRect(x, 16, 7, 11, 2)
    g.fillStyle(0xffffff, 1)
    g.fillRoundedRect(x + 1, 17, 5, 4, 1.5)
    g.fillStyle(0xf2a93b, 1)
    g.fillRect(x + 1, 23, 5, 2)
  }
}

function drawSheep(
  g: Phaser.GameObjects.Graphics,
  ready: number,
  frame: AnimalFrame,
  seed: number,
): void {
  const t = frame.time * 0.001 + seed * 1.3
  const grazePhase = (t % 4.4) / 0.9
  const graze = frame.rest || frame.angry ? 0 : grazePhase < 1 ? Math.sin(grazePhase * Math.PI) : 0
  const headX = 16 + graze * 2
  const headY = -12 + graze * 11
  const wool = 1 + Math.sin(frame.time * 0.004 + seed) * 0.02

  // Cloud-like wool body.
  g.fillStyle(0xf0e6d4, 1)
  g.fillCircle(-12, 1, 15 * wool)
  g.fillCircle(6, -4, 16 * wool)
  g.fillCircle(16, 5, 12 * wool)
  g.fillCircle(-2, 9, 14 * wool)
  g.fillCircle(-20, -7, 10 * wool)
  g.fillStyle(0xfff7e9, 1)
  g.fillCircle(-12, -1, 12 * wool)
  g.fillCircle(6, -6, 13 * wool)
  g.fillCircle(14, 3, 9 * wool)
  g.fillCircle(-2, 7, 11 * wool)
  g.fillCircle(-19, -8, 7.5 * wool)
  g.lineStyle(1.4, 0xe0cfb6, 0.8)
  g.beginPath()
  g.arc(-8, -4, 5, 0.2, 3.6)
  g.strokePath()
  g.beginPath()
  g.arc(8, -3, 4.5, -0.4, 3.0)
  g.strokePath()

  // Small tail tuft.
  g.fillStyle(0xfff7e9, 1)
  g.fillCircle(-25, 2, 5)

  // Dark legs and hooves.
  if (!frame.rest) {
    g.fillStyle(0x4a3f36, 1)
    g.fillRoundedRect(-14, 12, 5, 9, 2)
    g.fillRoundedRect(8, 12, 5, 9, 2)
    g.fillStyle(0x3b2f3a, 1)
    g.fillRoundedRect(-14, 19, 5, 3, 1.5)
    g.fillRoundedRect(8, 19, 5, 3, 1.5)
  }

  // Neck and dark face.
  g.fillStyle(0xf0e6d4, 1)
  g.fillEllipse(12, -6, 13, 12)
  g.fillStyle(0x5a4a3e, 1)
  g.fillCircle(headX, headY, 9)
  g.fillStyle(0xfff7e9, 1)
  g.fillCircle(headX - 2, headY - 7, 5)
  g.fillStyle(0x5a4a3e, 1)
  g.fillEllipse(headX - 8, headY - 1, 7, 4)
  g.fillEllipse(headX + 8, headY - 1, 7, 4)
  g.fillStyle(0xf7ddc0, 1)
  g.fillEllipse(headX + 3, headY + 3, 8, 6)
  g.fillStyle(0x3b2f3a, 1)
  g.fillEllipse(headX + 5, headY + 2, 3, 2)

  // Eyes.
  g.fillStyle(0xffffff, 1)
  g.fillCircle(headX - 1, headY - 2, 2.2)
  g.fillCircle(headX + 5, headY - 2, 2.2)
  g.fillStyle(0x3b2f3a, 1)
  g.fillCircle(headX - 1, headY - 2, 1.1)
  g.fillCircle(headX + 5, headY - 2, 1.1)
  if (frame.rest) {
    g.lineStyle(1.5, 0x3b2f3a, 0.9)
    g.lineBetween(headX - 4, headY - 2, headX + 1, headY - 2)
    g.lineBetween(headX + 3, headY - 2, headX + 8, headY - 2)
  } else if (frame.angry) {
    g.lineStyle(1.7, 0x3b2f3a, 0.95)
    g.lineBetween(headX - 5, headY - 6, headX, headY - 4)
    g.lineBetween(headX + 9, headY - 6, headX + 4, headY - 4)
  }

  // Yarn balls from the ready batch.
  for (let index = 0; index < ready; index += 1) {
    g.fillStyle(0xd99ab9, 1)
    g.fillCircle(-20 + index * 9, 18, 4)
    g.lineStyle(1, 0xa85a72, 0.8)
    g.beginPath()
    g.arc(-20 + index * 9, 18, 3, 0.3, 3.4)
    g.strokePath()
  }
}

function drawGoat(
  g: Phaser.GameObjects.Graphics,
  ready: number,
  frame: AnimalFrame,
  seed: number,
): void {
  const t = frame.time * 0.001 + seed * 1.9
  const pawPhase = (t % 5.2) / 0.55
  const paw = frame.rest || frame.angry || pawPhase >= 1 ? 0 : Math.sin(pawPhase * Math.PI)
  const lean = frame.angry ? 2 : paw * 1.5
  const headX = 16 + lean
  const headY = -12 + paw * 2

  // Upright tail and long legs.
  g.fillStyle(0xf5f0e6, 1)
  g.fillTriangle(-20, 0, -27, -8, -22, 7)
  g.fillStyle(0x3b2f3a, 1)
  g.fillTriangle(-21, 0, -25, -6, -22, 5)

  if (!frame.rest) {
    g.fillStyle(0xf5f0e6, 1)
    g.fillRoundedRect(-13, 12, 5, 10, 2)
    g.fillRoundedRect(8, 12, 5, 10, 2)
    g.fillStyle(0x3b2f3a, 1)
    g.fillRoundedRect(-13, 20, 5, 3, 1.5)
    g.fillRoundedRect(8, 20, 5, 3, 1.5)
    if (paw > 0) {
      g.fillStyle(0xfffbf2, 1)
      g.fillRoundedRect(6, 12 - paw * 5, 5, 9, 2)
      g.lineStyle(1.4, 0xb98a5c, 1)
      g.lineBetween(6, 21 - paw * 5, 2, 22 - paw * 5)
    }
  }

  // Slender body.
  g.fillStyle(0xf5f0e6, 1)
  g.fillEllipse(-2, 2, 38, 24)
  g.fillStyle(0xfffbf2, 1)
  g.fillEllipse(-3, 0, 34, 20)
  g.fillStyle(0xffffff, 0.35)
  g.fillEllipse(-12, -6, 12, 7)

  // Long ears.
  g.fillStyle(0xfffbf2, 1)
  g.fillEllipse(8, headY - 6, 10, 4)
  g.fillEllipse(24, headY - 6, 10, 4)
  g.fillStyle(0xf0e6d4, 1)
  g.fillEllipse(8, headY - 5, 7, 2.5)
  g.fillEllipse(24, headY - 5, 7, 2.5)

  // Curved horns.
  g.lineStyle(2.4, 0xb98a5c, 1)
  g.beginPath()
  g.arc(11, headY - 11, 6, 3.3, 5.9)
  g.strokePath()
  g.beginPath()
  g.arc(21, headY - 11, 6, 3.6, 6.1)
  g.strokePath()

  // Head and beard.
  g.fillStyle(0xfffbf2, 1)
  g.fillEllipse(headX, headY, 17, 15)
  g.fillStyle(0xf0e6d4, 1)
  g.fillTriangle(headX - 3, headY + 6, headX + 3, headY + 6, headX, headY + 14)
  g.fillStyle(0x3b2f3a, 1)
  g.fillCircle(headX - 3, headY - 3, 1.8)
  g.fillCircle(headX + 4, headY - 3, 1.8)
  g.fillEllipse(headX + 1, headY + 4, 7, 4)
  if (frame.rest) {
    g.lineStyle(1.5, 0x3b2f3a, 0.9)
    g.lineBetween(headX - 6, headY - 3, headX - 1, headY - 3)
    g.lineBetween(headX + 2, headY - 3, headX + 7, headY - 3)
  } else if (frame.angry) {
    g.lineStyle(1.7, 0x3b2f3a, 0.95)
    g.lineBetween(headX - 7, headY - 7, headX - 1, headY - 5)
    g.lineBetween(headX + 9, headY - 7, headX + 4, headY - 5)
  }

  // Hoof-scrape dust while pawing.
  if (paw > 0.2) {
    g.fillStyle(0x8f5734, 0.35)
    g.fillCircle(2 - paw * 4, 21, 1.6 + paw * 2)
    g.fillCircle(-1 - paw * 6, 19, 1.2 + paw * 1.5)
  }

  // Cheese wheels from the ready batch.
  for (let index = 0; index < ready; index += 1) {
    const x = -18 + index * 10
    g.fillStyle(0xffd166, 1)
    g.fillCircle(x, 12, 4.5)
    g.fillStyle(0xe0a93d, 1)
    g.fillCircle(x, 11, 2.2)
  }
}

/**
 * A purely cosmetic companion for each land pen. It follows half of the adult
 * patrol offset, bobs on its own rhythm and never touches the simulation.
 */
function drawPig(
  g: Phaser.GameObjects.Graphics,
  ready: number,
  frame: AnimalFrame,
  seed: number,
): void {
  const t = frame.time * 0.001 + seed * 1.1
  const sniff = frame.rest || frame.angry ? 0 : Math.max(0, Math.sin(t * 2.2)) * 1.5
  const wag = Math.sin(t * 7) * (frame.angry ? 3 : 1.5)

  if (!frame.rest) {
    g.fillStyle(0xd98090, 1)
    g.fillRoundedRect(-13, 12, 5, 9, 2)
    g.fillRoundedRect(8, 12, 5, 9, 2)
    g.fillStyle(0x8f3f52, 1)
    g.fillRoundedRect(-13, 19, 5, 3, 1.5)
    g.fillRoundedRect(8, 19, 5, 3, 1.5)
  }

  g.lineStyle(2.6, 0xd98090, 1)
  g.beginPath()
  g.arc(22 + wag * 0.3, 2, 5, -0.9, 2.4)
  g.strokePath()

  g.fillStyle(0xd98090, 1)
  g.fillEllipse(0, 3, 44, 27)
  g.fillStyle(0xf2a8b4, 1)
  g.fillEllipse(-1, 1, 40, 23)
  g.fillStyle(0xffc4cd, 0.8)
  g.fillEllipse(-8, -4, 16, 9)

  g.fillStyle(0xf2a8b4, 1)
  g.fillEllipse(-8, -12, 12, 7)
  g.fillEllipse(10, -12, 12, 7)
  g.fillStyle(0xd98090, 1)
  g.fillEllipse(-8, -11, 7, 4)
  g.fillEllipse(10, -11, 7, 4)

  g.fillStyle(0xf2a8b4, 1)
  g.fillEllipse(2, -4 + sniff, 16, 13)
  g.fillStyle(0xd06a7c, 1)
  g.fillEllipse(2, -2 + sniff, 10, 7)
  g.fillStyle(0x8f3f52, 0.9)
  g.fillCircle(-1, -2 + sniff, 1.4)
  g.fillCircle(5, -2 + sniff, 1.4)

  g.fillStyle(0x3b2f3a, 1)
  g.fillCircle(-8, -8, 1.8)
  g.fillCircle(12, -8, 1.8)
  if (frame.rest) {
    g.lineStyle(1.6, 0x3b2f3a, 0.9)
    g.lineBetween(-10, -8, -6, -8)
    g.lineBetween(10, -8, 14, -8)
  } else if (frame.angry) {
    g.lineStyle(1.8, 0x3b2f3a, 0.95)
    g.lineBetween(-12, -12, -6, -10)
    g.lineBetween(16, -12, 10, -10)
  }

  for (let index = 0; index < ready; index += 1) {
    g.fillStyle(0x5a3a32, 1)
    g.fillCircle(-18 + index * 10, 15, 4.5)
    g.fillStyle(0x8a6a52, 1)
    g.fillCircle(-19 + index * 10, 14, 2)
  }
}

function drawDuck(
  g: Phaser.GameObjects.Graphics,
  ready: number,
  frame: AnimalFrame,
  seed: number,
): void {
  const t = frame.time * 0.001 + seed * 1.4
  const bob = frame.rest ? 0 : Math.sin(t * 3.1) * 1.2
  const flap = frame.angry ? Math.abs(Math.sin(frame.time * 0.02 + seed)) * 3 : 0

  if (!frame.rest) {
    g.fillStyle(0xf2a93b, 1)
    g.fillRoundedRect(-8, 12, 4, 7, 2)
    g.fillRoundedRect(4, 12, 4, 7, 2)
    g.fillStyle(0xc98b2f, 1)
    g.fillTriangle(-8, 19, -11, 21, -5, 21)
    g.fillTriangle(4, 19, 1, 21, 7, 21)
  }

  g.fillStyle(0xd9b25a, 1)
  g.fillEllipse(-14, 2, 16, 11)
  g.fillStyle(0xe8c86a, 1)
  g.fillEllipse(0, 2 + bob * 0.4, 30, 20)
  g.fillStyle(0xf2d98a, 1)
  g.fillEllipse(-2, 0 + bob * 0.4, 24, 15)
  g.fillStyle(0xd9b25a, 1)
  g.fillEllipse(2 + flap, 2, 12, 8)

  g.fillStyle(0xe8c86a, 1)
  g.fillCircle(13, -9 + bob, 9)
  g.fillStyle(0xf2a93b, 1)
  g.fillTriangle(20, -10 + bob, 30, -7 + bob, 20, -4 + bob)
  g.fillStyle(0xc98b2f, 1)
  g.lineBetween(21, -7 + bob, 29, -7 + bob)

  g.fillStyle(0x3b2f3a, 1)
  g.fillCircle(14, -11 + bob, 1.7)
  if (frame.rest) {
    g.lineStyle(1.5, 0x3b2f3a, 0.9)
    g.lineBetween(11, -11 + bob, 17, -11 + bob)
  } else if (frame.angry) {
    g.lineStyle(1.7, 0x3b2f3a, 0.95)
    g.lineBetween(9, -15 + bob, 15, -13 + bob)
  }

  for (let index = 0; index < ready; index += 1) {
    g.fillStyle(0xbfe8ef, 1)
    g.fillEllipse(-18 + index * 9, 16, 7, 9)
    g.fillStyle(0xffffff, 0.6)
    g.fillEllipse(-19 + index * 9, 14, 3, 4)
  }
}

function drawDonkey(
  g: Phaser.GameObjects.Graphics,
  ready: number,
  frame: AnimalFrame,
  seed: number,
): void {
  const t = frame.time * 0.001 + seed
  const earTwitch = frame.rest ? 0 : Math.sin(t * 2.7) * 1.5
  const swish = Math.sin(t * 1.6) * 3

  if (!frame.rest) {
    g.fillStyle(0x6f757c, 1)
    g.fillRoundedRect(-13, 12, 6, 10, 2)
    g.fillRoundedRect(-5, 12, 6, 10, 2)
    g.fillRoundedRect(5, 12, 6, 10, 2)
    g.fillRoundedRect(12, 12, 6, 10, 2)
    g.fillStyle(0x3b2f3a, 1)
    g.fillRoundedRect(-13, 20, 6, 3, 1.5)
    g.fillRoundedRect(-5, 20, 6, 3, 1.5)
    g.fillRoundedRect(5, 20, 6, 3, 1.5)
    g.fillRoundedRect(12, 20, 6, 3, 1.5)
  }

  g.lineStyle(3, 0x6f757c, 1)
  g.beginPath()
  g.moveTo(-20, 2)
  g.lineTo(-25, 8)
  g.lineTo(-25 + swish, 15)
  g.strokePath()
  g.fillStyle(0x3b2f3a, 1)
  g.fillEllipse(-25 + swish, 16, 4, 6)

  g.fillStyle(0x6f757c, 1)
  g.fillEllipse(0, 2, 42, 26)
  g.fillStyle(0x9aa0a8, 1)
  g.fillEllipse(-1, 0, 38, 22)
  g.fillStyle(0xc4c9cf, 0.7)
  g.fillEllipse(-1, -3, 30, 14)
  g.fillStyle(0x4f5a5f, 1)
  for (let index = 0; index < 4; index += 1) {
    g.fillTriangle(-12 + index * 7, -10, -9 + index * 7, -10, -10 + index * 7, -4)
  }

  g.fillStyle(0x9aa0a8, 1)
  g.fillEllipse(-8, -14 + earTwitch * 0.3, 7, 18)
  g.fillEllipse(8, -14 - earTwitch * 0.3, 7, 18)
  g.fillStyle(0x6f757c, 1)
  g.fillEllipse(-8, -13 + earTwitch * 0.3, 4, 13)
  g.fillEllipse(8, -13 - earTwitch * 0.3, 4, 13)

  g.fillStyle(0x9aa0a8, 1)
  g.fillEllipse(14, -8, 17, 15)
  g.fillStyle(0xc4c9cf, 1)
  g.fillEllipse(16, -4, 11, 9)
  g.fillStyle(0x8f9aa3, 1)
  g.fillEllipse(18, -3, 7, 5)
  g.fillStyle(0x3b2f3a, 1)
  g.fillCircle(10, -10, 1.8)
  g.fillCircle(17, -11, 1.8)
  if (frame.rest) {
    g.lineStyle(1.6, 0x3b2f3a, 0.9)
    g.lineBetween(8, -10, 13, -10)
    g.lineBetween(15, -11, 20, -11)
  } else if (frame.angry) {
    g.lineStyle(1.8, 0x3b2f3a, 0.95)
    g.lineBetween(6, -14, 12, -12)
    g.lineBetween(21, -15, 15, -13)
  }

  for (let index = 0; index < ready; index += 1) {
    const x = -20 + index * 9
    g.fillStyle(0xdfe9f2, 1)
    g.fillRoundedRect(x, 16, 7, 11, 2)
    g.fillStyle(0x9aa5aa, 1)
    g.fillRect(x + 1, 23, 5, 2)
  }
}

function drawTurkey(
  g: Phaser.GameObjects.Graphics,
  ready: number,
  frame: AnimalFrame,
  seed: number,
): void {
  const t = frame.time * 0.001 + seed * 1.6
  const strut = frame.rest || frame.angry ? 0 : Math.max(0, Math.sin(t * 1.8)) * 2
  const gobble = frame.angry ? Math.abs(Math.sin(frame.time * 0.015 + seed)) * 2 : 0

  for (let index = 0; index < 5; index += 1) {
    const angle = -Math.PI / 2 + (index - 2) * 0.42
    const fx = -16 + Math.cos(angle) * 18
    const fy = -2 + Math.sin(angle) * 18 - strut
    g.fillStyle(index % 2 === 0 ? 0x6f4b2e : 0x8f5734, 1)
    g.fillEllipse(fx, fy, 9, 16)
    g.fillStyle(0xd9b25a, 0.55)
    g.fillCircle(fx, fy - 5, 1.6)
  }

  if (!frame.rest) {
    g.fillStyle(0xb87545, 1)
    g.fillRoundedRect(-11, 12, 5, 9, 2)
    g.fillRoundedRect(5, 12, 5, 9, 2)
    g.fillStyle(0x8f5734, 1)
    for (const toe of [-11, -9, -6, 5, 7, 10]) {
      g.lineBetween(toe, 21, toe - 1, 23)
    }
  }

  g.fillStyle(0x8f5734, 1)
  g.fillEllipse(-2, 4, 34, 24)
  g.fillStyle(0xa86a3e, 1)
  g.fillEllipse(-2, 2, 30, 20)
  g.fillStyle(0xd9b25a, 0.35)
  g.fillEllipse(-8, -2, 12, 8)

  g.fillStyle(0x5a7a9e, 1)
  g.fillEllipse(12, -8, 13, 14)
  g.fillStyle(0x8fb3c9, 1)
  g.fillCircle(12, -10 + gobble, 6)
  g.fillStyle(0xd94b45, 1)
  g.fillEllipse(15, -2 + gobble, 4, 7)
  g.fillStyle(0xf2a93b, 1)
  g.fillTriangle(18, -9 + gobble, 24, -7 + gobble, 18, -5 + gobble)

  g.fillStyle(0x3b2f3a, 1)
  g.fillCircle(11, -11, 1.7)
  if (frame.rest) {
    g.lineStyle(1.5, 0x3b2f3a, 0.9)
    g.lineBetween(8, -11, 14, -11)
  } else if (frame.angry) {
    g.lineStyle(1.7, 0x3b2f3a, 0.95)
    g.lineBetween(7, -15, 13, -13)
  }

  for (let index = 0; index < ready; index += 1) {
    g.fillStyle(0xfff7e8, 1)
    g.fillEllipse(-18 + index * 10, 16, 8, 12)
    g.fillStyle(0xdccbb4, 1)
    g.lineBetween(-18 + index * 10, 11, -18 + index * 10, 21)
  }
}

function drawPenBaby(
  g: Phaser.GameObjects.Graphics,
  producer: ProducerState,
  frame: AnimalFrame,
): void {
  const x = -25 + frame.dx * 0.4
  const bob = Math.sin(frame.time * 0.005 + producer.id * 1.4) * 1
  const y = 15 + bob
  if (producer.product === 'egg') {
    g.fillStyle(0xf7ead6, 1)
    g.fillEllipse(x, y, 13, 10)
    g.fillStyle(0xfff3dd, 1)
    g.fillEllipse(x, y - 1, 10, 8)
    g.fillStyle(0xf2a93b, 1)
    g.fillTriangle(x + 5, y - 1, x + 10, y + 1, x + 5, y + 3)
    g.fillCircle(x + 1, y + 5, 1.4)
    g.fillCircle(x - 3, y + 5, 1.4)
    g.fillStyle(0x3b2f3a, 1)
    g.fillCircle(x + 3, y - 3, 1.2)
    return
  }
  if (producer.product === 'milk') {
    g.fillStyle(0xffffff, 1)
    g.fillEllipse(x, y, 19, 13)
    g.fillStyle(0x3b2f3a, 1)
    g.fillEllipse(x - 4, y - 1, 5, 4)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(x + 6, y - 5, 5)
    g.fillStyle(0xf2cf9e, 1)
    g.fillEllipse(x + 9, y - 3, 4, 3)
    g.fillStyle(0x3b2f3a, 1)
    g.fillCircle(x + 6, y - 6, 1)
    return
  }
  if (producer.product === 'yarn') {
    g.fillStyle(0xf0e6d4, 1)
    g.fillCircle(x - 3, y, 7)
    g.fillCircle(x + 4, y - 2, 7)
    g.fillCircle(x + 1, y + 4, 6)
    g.fillStyle(0x5a4a3e, 1)
    g.fillCircle(x + 8, y - 1, 4.5)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(x + 7, y - 2, 1.1)
    g.fillCircle(x + 10, y - 2, 1.1)
    return
  }
  if (producer.product === 'truffle') {
    g.fillStyle(0xf2a8b4, 1)
    g.fillEllipse(x, y, 15, 11)
    g.fillStyle(0xffc4cd, 1)
    g.fillEllipse(x, y - 1, 11, 8)
    g.fillStyle(0xd06a7c, 1)
    g.fillEllipse(x + 5, y, 6, 4)
    g.fillStyle(0x3b2f3a, 1)
    g.fillCircle(x + 3, y - 2, 1)
    return
  }
  if (producer.product === 'duckEgg') {
    g.fillStyle(0xe8c86a, 1)
    g.fillEllipse(x, y, 13, 9)
    g.fillStyle(0xf2a93b, 1)
    g.fillTriangle(x + 5, y - 1, x + 9, y + 1, x + 5, y + 3)
    g.fillStyle(0x3b2f3a, 1)
    g.fillCircle(x + 2, y - 2, 1)
    return
  }
  if (producer.product === 'donkeyMilk') {
    g.fillStyle(0x9aa0a8, 1)
    g.fillEllipse(x, y, 17, 11)
    g.fillStyle(0xc4c9cf, 1)
    g.fillEllipse(x, y - 1, 12, 8)
    g.fillStyle(0x6f757c, 1)
    g.fillTriangle(x - 2, y - 4, x, y - 10, x + 2, y - 4)
    g.fillTriangle(x + 4, y - 4, x + 6, y - 10, x + 8, y - 4)
    g.fillStyle(0x3b2f3a, 1)
    g.fillCircle(x + 4, y - 2, 1)
    return
  }
  if (producer.product === 'feather') {
    g.fillStyle(0x8f5734, 1)
    g.fillEllipse(x, y, 13, 10)
    g.fillStyle(0xd94b45, 1)
    g.fillCircle(x + 4, y - 3, 2)
    g.fillStyle(0x3b2f3a, 1)
    g.fillCircle(x + 2, y - 2, 1)
    return
  }
  g.fillStyle(0xfffbf2, 1)
  g.fillEllipse(x, y, 18, 11)
  g.fillStyle(0xfffbf2, 1)
  g.fillEllipse(x + 6, y - 5, 8, 8)
  g.lineStyle(1.4, 0xb98a5c, 1)
  g.lineBetween(x + 3, y - 10, x + 4, y - 13)
  g.lineBetween(x + 9, y - 10, x + 8, y - 13)
  g.fillStyle(0x3b2f3a, 1)
  g.fillCircle(x + 4, y - 5, 1)
  g.fillCircle(x + 8, y - 5, 1)
  g.fillStyle(0xf0e6d4, 1)
  g.fillTriangle(x + 5, y - 1, x + 8, y - 1, x + 6, y + 4)
}

function drawBeehive(g: Phaser.GameObjects.Graphics, ready: number, time: number): void {
  // Flower patch instead of a pen and trough.
  g.fillStyle(0x5aa96f, 0.9)
  g.fillEllipse(-24, 20, 18, 6)
  g.fillEllipse(24, 21, 16, 5)
  g.fillStyle(0xf5a3b5, 1)
  g.fillCircle(-28, 17, 2.4)
  g.fillCircle(-21, 19, 2.2)
  g.fillStyle(0xffd166, 1)
  g.fillCircle(25, 17, 2.4)
  g.fillCircle(30, 19, 2.1)

  // Wooden hive box, lid and landing board.
  g.fillStyle(0x8f5734, 1)
  g.fillRoundedRect(-18, -22, 36, 40, 7)
  g.fillStyle(0xc98b5c, 1)
  g.fillRoundedRect(-16, -20, 32, 36, 6)
  g.fillStyle(0xe0b45a, 1)
  g.fillRoundedRect(-20, -25, 40, 8, 4)
  g.lineStyle(2, 0x8f5734, 0.75)
  for (let row = -10; row <= 10; row += 10) {
    g.lineBetween(-14, row, 14, row)
  }
  g.fillStyle(0x3b2f3a, 1)
  g.fillRoundedRect(-5, 8, 10, 7, 3)
  g.fillStyle(0x6f4b2e, 1)
  g.fillRoundedRect(-8, 15, 16, 3, 1.5)

  // Honey ready: amber drops on the landing board.
  for (let index = 0; index < ready; index += 1) {
    g.fillStyle(0xffb347, 1)
    g.fillCircle(-10 + index * 10, 18, 3.4)
  }

  // A couple of bees orbit the hive, animated from the render clock.
  for (let index = 0; index < 3; index += 1) {
    const phase = time * 0.004 + index * 2.1
    const x = Math.cos(phase) * (24 + index * 3)
    const y = -14 + Math.sin(phase * 1.6) * 8
    g.fillStyle(0xffd166, 1)
    g.fillCircle(x, y, 2.4)
    g.fillStyle(0x3b2f3a, 1)
    g.fillRect(x - 2.2, y - 0.8, 4.4, 1.4)
    g.fillStyle(0xffffff, 0.7)
    g.fillEllipse(x - 2, y - 2.4, 3, 1.4)
  }
}
