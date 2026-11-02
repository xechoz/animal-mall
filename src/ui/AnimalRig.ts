import Phaser from 'phaser'
import type { SpeciesId } from '../logic/types'
import {
  ANIMAL_FOOT_GAP,
  ANIMAL_ORIGIN_Y,
  ANIMAL_SCALE,
  ANIMAL_TEXTURE_SIZE,
  type AnimalPart,
  animalPartKey,
  blinkEyes,
  eyeCoverColor,
  playerPartKey,
  tailPivot,
} from './animalArt'
import { GaitAnimator, type GaitFrame, gaitProfile } from './gait'

export interface RigShadow {
  readonly width: number
  readonly height: number
  readonly alpha: number
}

export interface RigOptions {
  readonly species: SpeciesId
  readonly player: boolean
  readonly scale: number
  readonly seed: number
  readonly shadow: RigShadow
}

/** Extra pose layered on top of the gait (drink, eat, seated, angry shake). */
export interface RigPose {
  readonly x?: number
  readonly y?: number
  readonly scaleX?: number
  readonly scaleY?: number
  readonly rotation?: number
}

const TEXTURE_ANCHOR_Y = ANIMAL_TEXTURE_SIZE * ANIMAL_ORIGIN_Y
const BASE_SCALE = 0.82

/**
 * Shared walking body: grounded shadow, lifted/squashed rig, alternating paws,
 * a lagging head, a wagging tail and blinking eyelids. Views add their own
 * apron, cargo, cup or mood bubbles on top.
 */
export class AnimalRig extends Phaser.GameObjects.Container {
  protected readonly shadowArt: Phaser.GameObjects.Graphics
  protected readonly lift: Phaser.GameObjects.Container
  protected readonly bodyImage: Phaser.GameObjects.Image
  protected readonly headImage: Phaser.GameObjects.Image
  protected readonly tailImage: Phaser.GameObjects.Image
  private readonly feet: Phaser.GameObjects.Container
  private readonly pawLeft: Phaser.GameObjects.Image
  private readonly pawRight: Phaser.GameObjects.Image
  private readonly blinkArt: Phaser.GameObjects.Graphics
  private readonly motion: GaitAnimator
  private readonly baseScale: number
  private readonly tailLocalX: number
  private readonly tailLocalY: number
  private readonly blinkAnchors: readonly {
    readonly x: number
    readonly y: number
    readonly r: number
  }[]
  private readonly eyeColor: number
  private blinkOn = false
  /** World-space hook so the scene can spawn landing dust. */
  landHandler?: (x: number, y: number) => void

  constructor(scene: Phaser.Scene, options: RigOptions) {
    super(scene, 0, 0)
    const { species, player, scale, seed, shadow } = options
    // Views keep passing the old 96-unit footprint; the larger textures render
    // at a proportionally smaller scale so world positions do not move.
    const displayScale = scale * ANIMAL_SCALE
    this.baseScale = displayScale
    const keyFor = (part: AnimalPart): string =>
      player ? playerPartKey(part) : animalPartKey(species, part)

    this.shadowArt = scene.add.graphics()
    this.shadowArt.fillStyle(0x3b2f3a, shadow.alpha)
    this.shadowArt.fillEllipse(0, 2, shadow.width, shadow.height)
    this.add(this.shadowArt)

    this.lift = scene.add.container(0, 0)
    this.add(this.lift)

    const pivot = tailPivot(species)
    this.tailLocalX = (pivot.x - ANIMAL_TEXTURE_SIZE / 2) * displayScale
    this.tailLocalY = (pivot.y - TEXTURE_ANCHOR_Y) * displayScale
    this.tailImage = scene.add
      .image(this.tailLocalX, this.tailLocalY, keyFor('tail'))
      .setOrigin(pivot.x / ANIMAL_TEXTURE_SIZE, pivot.y / ANIMAL_TEXTURE_SIZE)
      .setScale(displayScale)
    this.lift.add(this.tailImage)

    this.feet = scene.add.container(0, 0)
    this.pawLeft = scene.add.image(0, 0, keyFor('paw')).setOrigin(0.5, 0.9).setScale(displayScale)
    this.pawRight = scene.add
      .image(ANIMAL_FOOT_GAP * displayScale, 0, keyFor('paw'))
      .setOrigin(0.5, 0.9)
      .setScale(displayScale)
    this.feet.add([this.pawLeft, this.pawRight])
    this.lift.add(this.feet)

    this.bodyImage = scene.add
      .image(0, 0, keyFor('body'))
      .setOrigin(0.5, 0.9)
      .setScale(displayScale)
    this.lift.add(this.bodyImage)

    this.headImage = scene.add
      .image(0, 0, keyFor('head'))
      .setOrigin(0.5, 0.9)
      .setScale(displayScale)
    this.lift.add(this.headImage)

    this.blinkArt = scene.add.graphics()
    this.lift.add(this.blinkArt)

    this.blinkAnchors = blinkEyes(species).map((eye) => ({
      x: (eye.x - ANIMAL_TEXTURE_SIZE / 2) * displayScale,
      y: (eye.y - TEXTURE_ANCHOR_Y) * displayScale,
      r: eye.r * displayScale,
    }))
    this.eyeColor = eyeCoverColor(species)
    this.motion = new GaitAnimator(gaitProfile(species, player), seed, scale / BASE_SCALE)
  }

  /** Inserts a decoration between the body and the head (aprons, bags). */
  addBodyLayer(object: Phaser.GameObjects.GameObject): void {
    const index = this.lift.getIndex(this.headImage)
    this.lift.addAt(object, index < 0 ? this.lift.length : index)
  }

  /** Appends above the head (carried goods, moods, hats, bubbles). */
  addAbove(object: Phaser.GameObjects.GameObject): void {
    this.lift.add(object)
  }

  setTint(color: number | null): void {
    const parts: Phaser.GameObjects.Image[] = [
      this.bodyImage,
      this.headImage,
      this.tailImage,
      this.pawLeft,
      this.pawRight,
    ]
    for (const part of parts) {
      if (color === null) part.clearTint()
      else part.setTint(color)
    }
  }

  /**
   * Drives the whole body from the interpolated ground position. Returns the
   * frame so the view can anchor mouth/head decorations.
   */
  updateRig(
    x: number,
    y: number,
    facing: -1 | 1,
    now: number,
    pose: RigPose = {},
    load = 0,
  ): GaitFrame {
    const frame = this.motion.update(x, y, now, facing, load)

    this.setPosition(x, y)
    this.lift.setPosition(frame.sway + (pose.x ?? 0), -frame.lift + (pose.y ?? 0))
    this.lift.setScale(
      frame.squashX * frame.turn * (pose.scaleX ?? 1),
      frame.squashY * (pose.scaleY ?? 1),
    )
    this.lift.setRotation(frame.rock + frame.lean * facing + (pose.rotation ?? 0))

    this.feet.setScale(facing, 1)
    this.placeFoot(this.pawLeft, 0, frame.footLeft)
    this.placeFoot(this.pawRight, ANIMAL_FOOT_GAP * this.baseScale, frame.footRight)

    this.bodyImage.setScale(facing * this.baseScale, this.baseScale)
    this.headImage
      .setPosition(frame.headX, frame.headY)
      .setScale(facing * this.baseScale, this.baseScale)
    this.tailImage
      .setPosition(facing * this.tailLocalX, this.tailLocalY)
      .setRotation(frame.tailWag)
      .setScale(facing * this.baseScale, this.baseScale)

    this.shadowArt.setScale(frame.shadowScale).setAlpha(frame.shadowAlpha)
    this.updateBlink(frame)

    if (frame.landed && this.landHandler !== undefined) this.landHandler(x, y)
    return frame
  }

  private placeFoot(
    paw: Phaser.GameObjects.Image,
    baseX: number,
    foot: GaitFrame['footLeft'],
  ): void {
    paw.setPosition(baseX + foot.x, foot.y)
    paw.setRotation(foot.rotation)
    paw.setScale(this.baseScale, this.baseScale * foot.scaleY)
  }

  private updateBlink(frame: GaitFrame): void {
    this.blinkArt.setPosition(frame.headX, frame.headY)
    if (frame.blink === this.blinkOn) return
    this.blinkOn = frame.blink
    this.blinkArt.clear()
    this.blinkArt.setVisible(frame.blink)
    if (!frame.blink) return
    for (const eye of this.blinkAnchors) {
      this.blinkArt.fillStyle(this.eyeColor, 1)
      this.blinkArt.fillEllipse(eye.x, eye.y, eye.r * 2.2, eye.r * 1.6)
      this.blinkArt.lineStyle(Math.max(1, eye.r * 0.32), 0x3b2f3a, 0.85)
      this.blinkArt.lineBetween(eye.x - eye.r, eye.y, eye.x + eye.r, eye.y)
    }
  }
}
