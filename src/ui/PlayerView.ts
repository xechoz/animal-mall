import { type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { carriedKinds, carryOf, carryTotal } from '../logic/carry'
import type { DrinkKind, PlayerState, ProductKind, Vec2 } from '../logic/types'
import { AnimalRig, type RigPose } from './AnimalRig'
import { ANIMAL_SCALE, type AnimalFace, animalFace } from './animalArt'
import { DRINK_CUP_COLORS, drawCup } from './facilitiesArt'
import { productTextureKey } from './productArt'

const BODY_SCALE = 0.9
const CUP_SCALE = 0.95
/** On-screen size of one carried item, shared with the stock flight. */
export const CARRY_ICON_SCALE = 0.46
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
/** Delighted face after a catch; longer than the line pull so it reads. */
const CATCH_FACE_MS = 1_100
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
  private readonly moodArt: Phaser.GameObjects.Graphics
  private readonly face: AnimalFace
  private readonly carrying: Phaser.GameObjects.Image[] = []
  private readonly carryCount: Phaser.GameObjects.Text
  private readonly theme: Theme
  private carryKey = ''
  private carryFacing: -1 | 1 = 1
  private facing: -1 | 1 = 1
  private drink: DrinkState | null = null
  private eat: EatState | null = null
  private catchFaceStart = Number.NEGATIVE_INFINITY

  constructor(scene: Phaser.Scene, theme: Theme) {
    super(scene, {
      species: 'bear',
      player: true,
      scale: BODY_SCALE,
      seed: 0,
      shadow: { width: 48, height: 14, alpha: 0.22 },
      marker: true,
    })
    this.theme = theme
    this.face = animalFace('bear', BODY_SCALE * ANIMAL_SCALE)
    this.moodArt = scene.add.graphics()

    this.cup = scene.add.graphics().setVisible(false)

    for (let index = 0; index < 5; index += 1) {
      const icon = scene.add
        .image(CARRY_HAND_X, CARRY_HAND_Y, productTextureKey('apple'))
        .setScale(CARRY_ICON_SCALE)
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
    this.addAbove(this.moodArt)
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

  /** A delighted face for a moment after landing a fish. */
  playCatchFace(time: number): void {
    this.catchFaceStart = time
  }

  /**
   * World point of the top carried item. Stocking happens before the next
   * render, so this still points at the item that just left the hand.
   */
  handPoint(): Vec2 {
    let top = 0
    this.carrying.forEach((icon, index) => {
      if (icon.visible) top = index
    })
    return {
      x: this.x + this.facing * (CARRY_HAND_X + top * CARRY_LEAN),
      y: this.y + CARRY_HAND_Y - top * CARRY_STEP,
    }
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
    this.moodArt.setPosition(frame.headX, frame.headY)
    this.drawCatchFace(time)

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

  /**
   * Draws a delighted face over the baked one: closed happy eyes, rosier cheeks
   * and an open smile. The rig's eye anchors keep it aligned during the gait.
   */
  private drawCatchFace(time: number): void {
    const elapsed = time - this.catchFaceStart
    this.moodArt.clear()
    if (elapsed < 0 || elapsed >= CATCH_FACE_MS) return

    const fadeIn = smoothstep(clamp01(elapsed / 70))
    const fadeOut = 1 - smoothstep(clamp01((elapsed - (CATCH_FACE_MS - 240)) / 240))
    this.moodArt.setAlpha(fadeIn * fadeOut)

    const g = this.moodArt
    for (const eye of this.blinkAnchors) {
      g.fillStyle(this.eyeColor, 1)
      g.fillEllipse(eye.x, eye.y, eye.r * 3, eye.r * 2.8)
      g.lineStyle(Math.max(1.8, eye.r * 0.65), 0x3b2f3a, 0.95)
      g.beginPath()
      g.arc(eye.x, eye.y + eye.r * 0.2, eye.r * 1.2, Math.PI * 1.12, Math.PI * 1.88)
      g.strokePath()
    }

    // The muzzle hides the resting mouth before the open smile goes on top.
    const mouthY = this.face.mouthY - 3
    g.fillStyle(0xe25d5d, 0.38)
    g.fillEllipse(-13.5, this.face.blushY + 3, 9.5, 5)
    g.fillEllipse(13.5, this.face.blushY + 3, 9.5, 5)
    g.fillStyle(this.face.mouthColor, 1)
    g.fillEllipse(0, mouthY, 15, 7.5)
    g.lineStyle(2.2, 0x3b2f3a, 0.95)
    g.beginPath()
    g.arc(0, mouthY - 1.5, 5.5, Math.PI * 0.18, Math.PI * 0.82)
    g.strokePath()
    g.fillStyle(0xe88a9a, 0.9)
    g.fillEllipse(0, mouthY + 2.2, 4.5, 2.4)

    const beat = 1 + Math.sin(elapsed * 0.02) * 0.1
    const heartY = this.face.topY - 7
    g.fillStyle(0xe25d5d, 0.92)
    g.fillCircle(-2.1 * beat, heartY, 2.7 * beat)
    g.fillCircle(2.1 * beat, heartY, 2.7 * beat)
    g.fillTriangle(-4.7 * beat, heartY + 1.2, 4.7 * beat, heartY + 1.2, 0, heartY + 6 * beat)
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
