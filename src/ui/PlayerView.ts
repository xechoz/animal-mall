import { type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { carriedKinds, carryOf, carryTotal } from '../logic/carry'
import type { DrinkKind, PlayerState, ProductKind } from '../logic/types'
import { AnimalRig, type RigPose } from './AnimalRig'
import { DRINK_CUP_COLORS, drawCup } from './facilitiesArt'
import { productTextureKey } from './productArt'

const BODY_SCALE = 0.82
const CUP_SCALE = 0.95
const DRINK_MS = 1350
const RAISE_MS = 140
const LOWER_MS = 1080
const EAT_MS = 650
/** Carried goods sit in the hand, then stack upward from there. */
const CARRY_HAND_X = 18
const CARRY_HAND_Y = -24
const CARRY_STEP = 12
const CARRY_LEAN = 1.5
const CARRY_BADGE_X = 12
const CARRY_BADGE_Y = -4
/** Sip and swallow beats baked into drink-gulp.mp3, in milliseconds. */
const SIP_BEATS: readonly { readonly start: number; readonly duration: number }[] = [
  { start: 185, duration: 355 },
  { start: 825, duration: 228 },
]
/** Fizz beats for the apple soda, spread across the sip and the swallow. */
const FIZZ_DELAYS_MS: readonly number[] = [200, 320, 440, 860]

interface DrinkState {
  readonly start: number
}

interface EatState {
  readonly product: ProductKind
  readonly start: number
}

interface SipFx {
  readonly raise: number
  readonly lower: number
  readonly pulse: number
}

interface ChewFx {
  readonly raise: number
  readonly lower: number
  readonly chew: number
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value)
}

function gulpPulse(elapsed: number): number {
  let pulse = 0
  for (const beat of SIP_BEATS) {
    const local = elapsed - beat.start
    if (local < 0 || local > beat.duration) continue
    pulse = Math.max(pulse, Math.sin((local / beat.duration) * Math.PI))
  }
  return pulse
}

export class PlayerView extends AnimalRig {
  private readonly cup: Phaser.GameObjects.Graphics
  private readonly food: Phaser.GameObjects.Image
  private readonly carrying: Phaser.GameObjects.Image[] = []
  private readonly carryCount: Phaser.GameObjects.Text
  private readonly theme: Theme
  private carryKey = ''
  private carryFacing: -1 | 1 = 1
  private facing: -1 | 1 = 1
  private drink: DrinkState | null = null
  private eat: EatState | null = null

  constructor(scene: Phaser.Scene, theme: Theme) {
    super(scene, {
      species: 'bear',
      player: true,
      scale: BODY_SCALE,
      seed: 0,
      shadow: { width: 42, height: 12, alpha: 0.18 },
    })
    this.theme = theme

    this.cup = scene.add.graphics().setVisible(false)

    for (let index = 0; index < 5; index += 1) {
      const icon = scene.add
        .image(CARRY_HAND_X, CARRY_HAND_Y, productTextureKey('apple'))
        .setScale(0.46)
        .setVisible(false)
      this.carrying.push(icon)
      this.addAbove(icon)
    }
    // The cup sits in front of the carried pile so a sip stays readable.
    this.addAbove(this.cup)
    this.food = scene.add.image(0, 0, productTextureKey('apple')).setScale(0.5).setVisible(false)
    this.addAbove(this.food)

    this.carryCount = scene.add
      .text(
        CARRY_HAND_X + CARRY_BADGE_X,
        CARRY_HAND_Y + CARRY_BADGE_Y,
        '',
        textStyle(theme, 13, theme.text, true),
      )
      .setOrigin(0, 0.5)
      .setBackgroundColor('#fff7e8')
      .setPadding(4, 0, 4, 0)
      .setVisible(false)
    this.addAbove(this.carryCount)
    this.layoutCarry(1)

    scene.add.existing(this)
  }

  /** Plays the sip-and-swallow drinking pose once; the cup follows the body. */
  playDrink(kind: DrinkKind): void {
    this.drink = { start: this.scene.time.now }
    this.cup.clear()
    drawCup(this.cup, 0, 0, CUP_SCALE, DRINK_CUP_COLORS[kind], {
      straw: false,
      shadow: false,
      outline: true,
    })
    this.cup.setVisible(true).setAlpha(0)
    if (kind === 'appleSoda') {
      FIZZ_DELAYS_MS.forEach((delay, index) => {
        this.scene.time.delayedCall(delay, () => this.spawnFizz(index))
      })
    }
  }

  /** A short chew while the food icon rises to the mouth. */
  playEat(product: ProductKind): void {
    this.eat = { product, start: this.scene.time.now }
    this.food.setTexture(productTextureKey(product)).setVisible(true).setAlpha(0).setScale(0.5)
  }

  updatePlayer(player: PlayerState, alpha: number, time: number, seated = false): void {
    const x = player.prevPos.x + (player.pos.x - player.prevPos.x) * alpha
    const y = player.prevPos.y + (player.pos.y - player.prevPos.y) * alpha
    this.facing = player.facing
    if (player.facing !== this.carryFacing) {
      this.carryFacing = player.facing
      this.layoutCarry(player.facing)
    }

    const drinkFx = this.drinkFx(time)
    const chewFx = this.eatFx(time)

    let poseY = 0
    let poseScaleX = 1
    let poseScaleY = 1
    let poseRotation = 0
    if (seated) {
      poseY = 4
      poseScaleX *= 0.92
      poseScaleY *= 0.9
    }
    if (drinkFx !== null) {
      poseScaleX *= 1 + 0.035 * drinkFx.pulse
      poseScaleY *= 1 - 0.05 * drinkFx.pulse
      poseRotation += -player.facing * 0.04 * drinkFx.raise * (1 - drinkFx.lower)
    }
    if (chewFx !== null) poseScaleY *= 1 - 0.035 * chewFx.chew

    const pose: RigPose = {
      y: poseY,
      scaleX: poseScaleX,
      scaleY: poseScaleY,
      rotation: poseRotation,
    }
    const load = Math.min(1, carryTotal(player.carry) / 8)
    const frame = this.updateRig(x, y, player.facing, time, pose, load)

    if (drinkFx !== null) {
      const { raise, lower, pulse } = drinkFx
      this.cup.setPosition(
        player.facing * (8 + 2 * raise) + frame.headX,
        -22 - 5 * raise + 4 * lower - 2 * pulse + frame.headY,
      )
      this.cup.setScale(
        player.facing * CUP_SCALE * (0.8 + 0.2 * raise),
        CUP_SCALE * (0.8 + 0.2 * raise),
      )
      this.cup.setRotation(-player.facing * (0.2 + 0.9 * raise) * (1 - 0.1 * pulse))
      this.cup.setAlpha(raise * (1 - lower))
    }
    if (chewFx !== null) {
      const { raise, lower, chew } = chewFx
      this.food.setPosition(
        player.facing * (8 + 2 * raise) + frame.headX,
        -27 - 4 * raise + 5 * lower - 2 * chew + frame.headY,
      )
      this.food.setScale(player.facing * (0.5 + 0.08 * raise), 0.5 + 0.08 * raise)
      this.food.setRotation(-player.facing * 0.18 * raise * (1 - lower))
      this.food.setAlpha(raise * (1 - lower))
    }

    const kinds = carriedKinds(player.carry)
    const key = kinds.map((product) => `${product}:${carryOf(player.carry, product)}`).join('|')
    if (key !== this.carryKey) {
      this.carryKey = key
      const stack: ProductKind[] = []
      for (const product of kinds) {
        const count = carryOf(player.carry, product)
        for (let index = 0; index < count && stack.length < 5; index += 1) {
          stack.push(product)
        }
      }
      this.carrying.forEach((icon, index) => {
        const product = stack[index]
        icon.setVisible(product !== undefined)
        if (product !== undefined) icon.setTexture(productTextureKey(product))
      })
      const total = carryTotal(player.carry)
      const overflow = total > 5
      this.carryCount.setText(overflow ? `×${total}` : '').setVisible(overflow)
    }
    this.carryCount.setColor(this.theme.text)
  }

  private drinkFx(time: number): SipFx | null {
    const drink = this.drink
    if (drink === null) return null
    const elapsed = time - drink.start
    if (elapsed >= DRINK_MS) {
      this.drink = null
      this.cup.setVisible(false)
      return null
    }
    return {
      raise: smoothstep(clamp01(elapsed / RAISE_MS)),
      lower: smoothstep(clamp01((elapsed - LOWER_MS) / (DRINK_MS - LOWER_MS))),
      pulse: gulpPulse(elapsed),
    }
  }

  private eatFx(time: number): ChewFx | null {
    const eat = this.eat
    if (eat === null) return null
    const elapsed = time - eat.start
    if (elapsed >= EAT_MS) {
      this.eat = null
      this.food.setVisible(false)
      return null
    }
    return {
      raise: smoothstep(clamp01(elapsed / 120)),
      lower: smoothstep(clamp01((elapsed - 450) / (EAT_MS - 450))),
      chew: Math.abs(Math.sin(elapsed * 0.045)),
    }
  }

  /** Anchors the carried pile to the hand and flips it with the body. */
  private layoutCarry(facing: -1 | 1): void {
    this.carrying.forEach((icon, index) => {
      icon.setPosition(
        facing * (CARRY_HAND_X + index * CARRY_LEAN),
        CARRY_HAND_Y - index * CARRY_STEP,
      )
    })
    this.carryCount
      .setOrigin(facing > 0 ? 0 : 1, 0.5)
      .setPosition(facing * (CARRY_HAND_X + CARRY_BADGE_X), CARRY_HAND_Y + CARRY_BADGE_Y)
  }

  private spawnFizz(index: number): void {
    const side = index % 2 === 0 ? -1 : 1
    const cupX = this.facing * 10
    const bubble = this.scene.add
      .circle(cupX, -36, index === 0 ? 2.4 : 1.7, 0xffffff, 0.8)
      .setAlpha(0.9)
    this.addAbove(bubble)
    this.scene.tweens.add({
      targets: bubble,
      x: cupX + side * (6 + index * 1.5),
      y: -54 - index * 4,
      alpha: 0,
      scale: 1.5,
      duration: 380 + index * 40,
      ease: 'Quad.easeOut',
      onComplete: () => bubble.destroy(),
    })
  }
}
