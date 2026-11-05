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
  pawView,
  playerPartKey,
  tailPivot,
} from './animalArt'
import { GaitAnimator, type GaitFrame, gaitProfile } from './gait'
import {
  type AnimalView,
  HEADING_COUNT,
  type Heading,
  HeadingTracker,
  headingAngle,
  mirrorForHeading,
  normaliseHeading,
  strideAxisForView,
  turnPath,
  viewForHeading,
} from './heading'

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
  /** A soft warm pool under the player so they read against the busy floor. */
  readonly marker?: boolean
  /**
   * Role-specific part art, e.g. a staff body already wearing its uniform.
   * Return `undefined` to use the species part for that view.
   */
  readonly partKey?: (part: AnimalPart, view: AnimalView) => string | undefined
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
/** One 45-degree step of the turn animation. */
const TURN_STEP_MS = 48
/** A jump larger than this is a teleport, not a walk. */
const TELEPORT_DISTANCE = 64

/**
 * Turned views read as walking only when the two legs sit fore and aft along
 * the travel axis. The front and back views keep the symmetric stance.
 */
const FOOT_GAP: Readonly<Record<AnimalView, number>> = {
  front: ANIMAL_FOOT_GAP,
  frontSide: ANIMAL_FOOT_GAP,
  side: 8,
  backSide: ANIMAL_FOOT_GAP,
  back: ANIMAL_FOOT_GAP,
}

const FOOT_SHIFT: Readonly<Record<AnimalView, number>> = {
  front: 0,
  frontSide: 0,
  side: -1,
  backSide: 0,
  back: 0,
}

/**
 * The turned stride can be wider than the old 0.5 clamp now that the near foot
 * is lowered and the far foot raised; the legs swing without collapsing into
 * one silhouette. Hop gaits bypass this factor and keep their landing splay.
 */
const FOOT_MOTION: Readonly<Record<AnimalView, number>> = {
  front: 0.85,
  frontSide: 0.45,
  side: 0.6,
  backSide: 0.8,
  back: 0.85,
}

/**
 * Horizontal swing and vertical pickup are separate: multiplying the lift by
 * the turned stride made a three-quarter foot rise barely one pixel and read as
 * a slide. The turned views get a full pickup; the front and back keep the old
 * damping.
 */
const FOOT_LIFT: Readonly<Record<AnimalView, number>> = {
  front: 0.85,
  frontSide: 1.3,
  side: 1,
  backSide: 1.3,
  back: 0.85,
}

const FOOT_ROLL: Readonly<Record<AnimalView, number>> = {
  front: 1,
  frontSide: 0.15,
  side: 0.35,
  backSide: 0.55,
  back: 1,
}

/**
 * Shared walking body: grounded shadow, lifted/squashed rig, alternating paws,
 * a lagging head, a wagging tail and blinking eyelids. Views add their own
 * apron, cargo, cup or mood bubbles on top.
 *
 * The rig receives a stream of screen positions and turns the cast through
 * eight headings. Only the visible heading changes; game logic stays 2D.
 */
export class AnimalRig extends Phaser.GameObjects.Container {
  protected readonly shadowArt: Phaser.GameObjects.Graphics
  protected readonly lift: Phaser.GameObjects.Container
  protected readonly bodyImage: Phaser.GameObjects.Image
  protected readonly headImage: Phaser.GameObjects.Image
  protected readonly tailImage: Phaser.GameObjects.Image
  private readonly feet: Phaser.GameObjects.Container
  private readonly feetNear: Phaser.GameObjects.Container
  private readonly front: Phaser.GameObjects.Container
  private readonly pawLeft: Phaser.GameObjects.Image
  private readonly pawRight: Phaser.GameObjects.Image
  private readonly pawNear: Phaser.GameObjects.Image
  private readonly blinkArt: Phaser.GameObjects.Graphics
  private readonly motion: GaitAnimator
  private readonly baseScale: number
  private readonly species: SpeciesId
  private readonly partKey: (part: AnimalPart, view: AnimalView) => string
  private readonly tracker: HeadingTracker
  private tailLocalX = 0
  private tailLocalY = 0
  protected blinkAnchors: readonly {
    readonly x: number
    readonly y: number
    readonly r: number
  }[] = []
  protected readonly eyeColor: number
  private blinkOn = false
  private viewValue: AnimalView = 'front'
  private headingValue: Heading = 0
  private mirrorValue: -1 | 1 = 1
  private displayHeading: Heading = 0
  private nextTurnAt = 0
  private lastX = Number.NaN
  private lastY = Number.NaN
  /** World-space hook so the scene can spawn landing dust. */
  landHandler?: (x: number, y: number) => void

  constructor(scene: Phaser.Scene, options: RigOptions) {
    super(scene, 0, 0)
    const { species, player, scale, seed, shadow } = options
    this.species = species
    // Views keep passing the old 96-unit footprint; the larger textures render
    // at a proportionally smaller scale so world positions do not move.
    const displayScale = scale * ANIMAL_SCALE
    this.baseScale = displayScale
    this.partKey = (part, view) =>
      options.partKey?.(part, view) ??
      (player ? playerPartKey(part, view) : animalPartKey(species, part, view))

    this.tracker = new HeadingTracker()
    this.eyeColor = eyeCoverColor(species)

    this.shadowArt = scene.add.graphics()
    this.shadowArt.fillStyle(0x3b2f3a, shadow.alpha)
    this.shadowArt.fillEllipse(0, 3, shadow.width * 0.66, shadow.height * 0.58)
    this.add(this.shadowArt)

    if (options.marker === true) {
      const marker = scene.add.graphics()
      marker.fillStyle(0xffd9a8, 0.05)
      marker.fillEllipse(0, 3, shadow.width * 1.4, shadow.height * 1.5)
      marker.lineStyle(1.5, 0xfff3dd, 0.12)
      marker.strokeEllipse(0, 3, shadow.width * 1.2, shadow.height * 1.15)
      this.addAt(marker, 0)
    }

    this.lift = scene.add.container(0, 0)
    this.add(this.lift)

    const pivot = tailPivot(species, 'front')
    this.tailLocalX = (pivot.x - ANIMAL_TEXTURE_SIZE / 2) * displayScale
    this.tailLocalY = (pivot.y - TEXTURE_ANCHOR_Y) * displayScale
    this.tailImage = scene.add
      .image(this.tailLocalX, this.tailLocalY, this.partKey('tail', 'front'))
      .setOrigin(pivot.x / ANIMAL_TEXTURE_SIZE, pivot.y / ANIMAL_TEXTURE_SIZE)
      .setScale(displayScale)
    this.lift.add(this.tailImage)

    this.feet = scene.add.container(0, 0)
    this.pawLeft = scene.add
      .image(0, 0, this.partKey('paw', 'front'))
      .setOrigin(0.5, 0.9)
      .setScale(displayScale)
    this.pawRight = scene.add
      .image(ANIMAL_FOOT_GAP * displayScale, 0, this.partKey('paw', 'front'))
      .setOrigin(0.5, 0.9)
      .setScale(displayScale)
    this.feet.add([this.pawLeft, this.pawRight])
    this.lift.add(this.feet)

    this.bodyImage = scene.add
      .image(0, 0, this.partKey('body', 'front'))
      .setOrigin(0.5, 0.9)
      .setScale(displayScale)
    this.lift.add(this.bodyImage)

    // The near-side leg is a second, later-rendered foot so it can sit in front
    // of the body instead of disappearing behind it in the turned views.
    this.feetNear = scene.add.container(0, 0)
    this.pawNear = scene.add
      .image(0, 0, this.partKey('paw', 'front'))
      .setOrigin(0.5, 0.9)
      .setScale(displayScale)
    this.feetNear.add(this.pawNear)
    this.lift.add(this.feetNear)

    this.headImage = scene.add
      .image(0, 0, this.partKey('head', 'front'))
      .setOrigin(0.5, 0.9)
      .setScale(displayScale)
    this.lift.add(this.headImage)

    this.blinkArt = scene.add.graphics()
    this.front = scene.add.container(0, 0)
    this.front.add(this.blinkArt)
    this.lift.add(this.front)

    // Keep the wide side body behind the head and every decoration in front of
    // it. Phaser containers render in list order, so this is the raster order.
    this.tailImage.setDepth(0)
    this.feet.setDepth(1)
    this.bodyImage.setDepth(2)
    this.feetNear.setDepth(2.5)
    this.headImage.setDepth(3)
    this.front.setDepth(4)
    this.lift.bringToTop(this.headImage)
    this.lift.bringToTop(this.front)

    this.refreshView('front')
    this.motion = new GaitAnimator(gaitProfile(species, player), seed, scale / BASE_SCALE)
  }

  /** The view currently drawn, e.g. `side` while walking left or right. */
  get view(): AnimalView {
    return this.viewValue
  }

  get heading(): Heading {
    return this.headingValue
  }

  /** Horizontal mirror of the base art: -1 when the actor faces left. */
  get mirror(): -1 | 1 {
    return this.mirrorValue
  }

  /** Inserts a decoration between the body and the head (aprons, bags). */
  addBodyLayer(object: Phaser.GameObjects.GameObject): void {
    ;(object as Phaser.GameObjects.GameObject & { setDepth: (value: number) => void }).setDepth(2.5)
    const index = this.lift.getIndex(this.headImage)
    this.lift.addAt(object, index < 0 ? this.lift.length : index)
  }

  /** Appends above the head (carried goods, moods, hats, bubbles). */
  addAbove(object: Phaser.GameObjects.GameObject): void {
    this.front.add(object)
  }

  setTint(color: number | null): void {
    const parts: Phaser.GameObjects.Image[] = [
      this.bodyImage,
      this.headImage,
      this.tailImage,
      this.pawLeft,
      this.pawRight,
      this.pawNear,
    ]
    for (const part of parts) {
      if (color === null) part.clearTint()
      else part.setTint(color)
    }
  }

  /**
   * Drives the whole body from the interpolated ground position. Returns the
   * frame so the view can anchor mouth/head decorations.
   *
   * `heading` overrides the movement-derived facing for contextual poses such
   * as a seated worker or a cashier serving the queue.
   */
  updateRig(
    x: number,
    y: number,
    now: number,
    pose: RigPose = {},
    load = 0,
    heading: Heading | null = null,
  ): GaitFrame {
    this.advanceHeading(x, y, now, heading)
    const frame = this.motion.update(x, y, now, load)

    this.setPosition(x, y)
    this.lift.setPosition(frame.sway + (pose.x ?? 0), -frame.lift + (pose.y ?? 0))
    this.lift.setScale(
      frame.squashX * frame.turn * (pose.scaleX ?? 1),
      frame.squashY * (pose.scaleY ?? 1),
    )
    // Only the three-quarter view leans across the screen; the front and back
    // poses stay upright even while the input vector is diagonal.
    const leanX =
      this.viewValue === 'frontSide' || this.viewValue === 'side' || this.viewValue === 'backSide'
        ? Math.cos(headingAngle(this.headingValue))
        : 0
    this.lift.setRotation(frame.rock + frame.lean * leanX + (pose.rotation ?? 0))

    const gap = FOOT_GAP[this.viewValue] * this.baseScale
    const shift = FOOT_SHIFT[this.viewValue] * this.baseScale
    const sideLeg =
      this.viewValue === 'side' || this.viewValue === 'frontSide' || this.viewValue === 'backSide'
    // Hop feet keep their full landing splay; walkers use the tuned stride.
    const motion = frame.grounded ? FOOT_MOTION[this.viewValue] : 1
    const pickup = frame.grounded ? FOOT_LIFT[this.viewValue] : 1
    const roll = FOOT_ROLL[this.viewValue]
    // A turned stance needs depth: the near foot is lower and the far foot is
    // smaller and higher, so the pair reads as fore/aft instead of side by side.
    const shallow = this.viewValue === 'frontSide'
    const farY = shallow ? 0 : sideLeg ? -2 : 0
    const nearY = shallow ? 0 : sideLeg ? 3 : 0
    const farScale = shallow ? 1 : sideLeg ? 0.9 : 1
    const axis = strideAxisForView(this.viewValue)
    const liftScaleY = frame.squashY * (pose.scaleY ?? 1)
    // The body bobs on the planted leg instead of carrying both feet with it.
    const footY = frame.grounded ? (frame.lift - (pose.y ?? 0)) / liftScaleY : 0
    this.feet.setScale(this.mirrorValue, 1).setY(footY)
    this.feetNear.setScale(this.mirrorValue, 1).setY(footY)
    if (sideLeg && !shallow) {
      this.pawRight.setVisible(false)
      this.pawNear.setVisible(true)
      this.placeFoot(
        this.pawLeft,
        shift,
        farY,
        frame.footLeft,
        motion,
        pickup,
        roll,
        farScale,
        axis.x,
        axis.y,
      )
      this.placeFoot(
        this.pawNear,
        shift + gap,
        nearY,
        frame.footRight,
        motion,
        pickup,
        roll,
        1,
        axis.x,
        axis.y,
      )
    } else {
      this.pawRight.setVisible(true)
      this.pawNear.setVisible(false)
      this.placeFoot(
        this.pawLeft,
        shift,
        0,
        frame.footLeft,
        motion,
        pickup,
        roll,
        1,
        axis.x,
        axis.y,
      )
      this.placeFoot(
        this.pawRight,
        shift + gap,
        0,
        frame.footRight,
        motion,
        pickup,
        roll,
        1,
        axis.x,
        axis.y,
      )
    }

    this.bodyImage.setScale(this.mirrorValue * this.baseScale, this.baseScale)
    this.headImage
      .setPosition(frame.headX, frame.headY)
      .setScale(this.mirrorValue * this.baseScale, this.baseScale)
    this.tailImage
      .setPosition(this.mirrorValue * this.tailLocalX, this.tailLocalY)
      .setRotation(frame.tailWag)
      .setScale(this.mirrorValue * this.baseScale, this.baseScale)

    this.shadowArt.setScale(frame.shadowScale).setAlpha(frame.shadowAlpha)
    this.updateBlink(frame)

    if (frame.landed && this.landHandler !== undefined) this.landHandler(x, y)
    return frame
  }

  private advanceHeading(x: number, y: number, now: number, heading: Heading | null): void {
    let target: Heading
    if (Number.isNaN(this.lastX)) {
      target = heading ?? this.tracker.heading
      this.displayHeading = target
      this.nextTurnAt = now
    } else {
      const dx = x - this.lastX
      const dy = y - this.lastY
      if (Math.hypot(dx, dy) > TELEPORT_DISTANCE) {
        target = heading ?? this.tracker.heading
        this.tracker.reset(target, now)
        this.displayHeading = target
        this.nextTurnAt = now
      } else {
        target = heading ?? this.tracker.update(dx, dy, now)
      }
    }
    this.lastX = x
    this.lastY = y

    if (target !== this.displayHeading && now >= this.nextTurnAt) {
      const path = turnPath(this.displayHeading, target)
      const next = path[0] ?? target
      this.displayHeading = normaliseHeading(next)
      this.nextTurnAt = now + TURN_STEP_MS
    }

    this.headingValue = this.displayHeading
    this.mirrorValue =
      this.displayHeading % (HEADING_COUNT / 2) === 0
        ? this.tracker.side
        : mirrorForHeading(this.displayHeading)
          ? -1
          : 1
    const view = viewForHeading(this.displayHeading)
    if (view !== this.viewValue) this.refreshView(view)
  }

  private refreshView(view: AnimalView): void {
    this.viewValue = view
    this.bodyImage.setTexture(this.partKey('body', view))
    this.tailImage.setTexture(this.partKey('tail', view))
    // Every view keeps the head as its own image so the gait can lag and bob it
    // and the blink overlay stays glued to the eyes.
    this.headImage.setVisible(true).setTexture(this.partKey('head', view))
    const paw = pawView(view)
    const pawKey = this.partKey('paw', paw)
    this.pawLeft.setTexture(pawKey)
    this.pawRight.setTexture(pawKey)
    this.pawNear.setTexture(pawKey)
    const sideLeg = view === 'side' || view === 'backSide'
    this.pawNear.setVisible(sideLeg)
    this.pawRight.setVisible(!sideLeg)
    // The shallow horizontal view keeps both feet in the front layer so they
    // read as one left and one right paw instead of a near foot hiding the far
    // one behind the body.
    this.feet.setDepth(view === 'frontSide' ? 2.5 : 1)

    // From behind the tail sits on the back, not behind the silhouette, but it
    // still belongs under the head so a squirrel tail cannot cover the ears.
    const tailOnTop = view === 'back'
    this.tailImage.setDepth(tailOnTop ? 2.5 : 0)
    if (tailOnTop) this.lift.moveAbove(this.tailImage, this.bodyImage)
    else this.lift.moveBelow(this.tailImage, this.bodyImage)

    const pivot = tailPivot(this.species, view)
    this.tailLocalX = (pivot.x - ANIMAL_TEXTURE_SIZE / 2) * this.baseScale
    this.tailLocalY = (pivot.y - TEXTURE_ANCHOR_Y) * this.baseScale
    this.tailImage.setOrigin(pivot.x / ANIMAL_TEXTURE_SIZE, pivot.y / ANIMAL_TEXTURE_SIZE)
    this.blinkAnchors = blinkEyes(this.species, view).map((eye) => ({
      x: (eye.x - ANIMAL_TEXTURE_SIZE / 2) * this.baseScale,
      y: (eye.y - TEXTURE_ANCHOR_Y) * this.baseScale,
      r: eye.r * this.baseScale,
    }))
    this.blinkOn = false
    this.blinkArt.setVisible(false).clear()
  }

  private placeFoot(
    paw: Phaser.GameObjects.Image,
    baseX: number,
    baseY: number,
    foot: GaitFrame['footLeft'],
    motion: number,
    pickup: number,
    roll: number,
    scale: number,
    strideX: number,
    strideY: number,
  ): void {
    paw.setPosition(
      baseX + foot.x * motion * strideX,
      baseY + foot.x * motion * strideY - foot.y * pickup,
    )
    paw.setRotation(foot.rotation * roll)
    paw.setScale(this.baseScale * scale, this.baseScale * foot.scaleY * scale)
  }

  private updateBlink(frame: GaitFrame): void {
    this.blinkArt.setPosition(frame.headX, frame.headY)
    if (this.blinkAnchors.length === 0) {
      this.blinkArt.setVisible(false)
      return
    }
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
