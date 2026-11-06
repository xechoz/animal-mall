import { type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import type { StaffState } from '../logic/types'
import { AnimalRig } from './AnimalRig'
import { ANIMAL_SCALE, animalPartKey } from './animalArt'
import { DRINK_CUP_COLORS, drawCup } from './facilitiesArt'
import type { Heading } from './heading'
import { productTextureKey } from './productArt'
import { staffBodyKey, staffHatKey } from './staffArt'

const BODY_SCALE = 0.84
/** The rig shrinks 128-unit part art to the long-standing 96-unit footprint. */
const PART_SCALE = BODY_SCALE * ANIMAL_SCALE

/** Staff carry goods in the hand too, so the pile matches the player's. */
const CARRY_HAND_X = 15
const CARRY_HAND_Y = -22
const CARRY_STEP = 11
const CARRY_LEAN = 1.2

export class StaffView extends AnimalRig {
  readonly hit: Phaser.GameObjects.Zone
  private readonly hatImage: Phaser.GameObjects.Image
  private readonly carrying: Phaser.GameObjects.Image[] = []
  private readonly mood: Phaser.GameObjects.Graphics
  private readonly food: Phaser.GameObjects.Image
  private readonly sleep: Phaser.GameObjects.Text
  private carryKey = ''
  private carryFacing: -1 | 1 = 1
  private lastPhase: StaffState['phase'] | '' = ''
  private lastMirror: -1 | 1 = 1
  private readonly kind: StaffState['kind']

  constructor(scene: Phaser.Scene, theme: Theme, member: StaffState, textScale: number) {
    super(scene, {
      species: member.species,
      player: false,
      scale: BODY_SCALE,
      seed: member.id,
      shadow: { width: 44, height: 13, alpha: 0.2 },
      partKey: (part, view) =>
        part === 'body'
          ? staffBodyKey(member.kind, view)
          : animalPartKey(member.species, part, view),
    })
    this.kind = member.kind

    // The hat sits under the head so ears stay in front of the brim.
    this.hatImage = scene.add.image(0, 0, staffHatKey(member.kind, 'front')).setOrigin(0.5, 0.9)
    this.addBodyLayer(this.hatImage)

    for (let index = 0; index < 4; index += 1) {
      const icon = scene.add
        .image(CARRY_HAND_X, CARRY_HAND_Y, productTextureKey('apple'))
        .setScale(0.42)
        .setVisible(false)
      this.carrying.push(icon)
      this.addAbove(icon)
    }

    this.layoutCarry(1)

    this.mood = scene.add.graphics()
    this.addAbove(this.mood)
    this.food = scene.add.image(0, 0, productTextureKey('apple')).setScale(0.42).setVisible(false)
    this.addAbove(this.food)

    this.sleep = scene.add
      .text(18, -84, 'Zzz', textStyle(theme, 14 * textScale, theme.text, true))
      .setOrigin(0.5)
      .setBackgroundColor('#fff7e8')
      .setPadding(5, 1, 5, 1)
      .setAngle(-8)
      .setVisible(false)
    this.addAbove(this.sleep)

    this.hit = scene.add.zone(0, -38, 46, 86).setInteractive({ useHandCursor: true })
    this.add(this.hit)

    scene.add.existing(this)
  }

  updateStaff(member: StaffState, alpha: number, time: number): void {
    // Only a resting worker can be nudged. Showing a hand cursor on a working
    // one promised an action that `urgeStaffById` silently rejected.
    if (this.hit.input !== null) this.hit.input.enabled = member.phase === 'resting'
    const x = member.prevPos.x + (member.pos.x - member.prevPos.x) * alpha
    const y = member.prevPos.y + (member.pos.y - member.prevPos.y) * alpha
    const dining = member.phase === 'dining'
    const seatedScale = dining ? 0.72 / BODY_SCALE : 1
    const load = Math.min(1, member.carryCount / 6)
    const frame = this.updateRig(
      x,
      y,
      time,
      {
        y: dining ? 4 : 0,
        scaleX: seatedScale,
        scaleY: seatedScale,
      },
      load,
      this.contextHeading(member),
    )

    if (this.mirror !== this.carryFacing) {
      this.carryFacing = this.mirror
      this.layoutCarry(this.mirror)
    }

    if (dining && member.carry !== null) {
      const chew = Math.abs(Math.sin(time * 0.018))
      this.food
        .setTexture(productTextureKey(member.carry))
        .setVisible(true)
        .setPosition(this.mirror * 16 + frame.headX, -24 - chew * 2 + frame.headY)
        .setScale(this.mirror * 0.42, 0.42)
        .setRotation(-this.mirror * 0.2)
    } else {
      this.food.setVisible(false)
    }
    this.mood.setPosition(frame.headX, frame.headY)

    this.hatImage
      .setTexture(staffHatKey(this.kind, this.view))
      .setPosition(frame.headX, frame.headY)
      .setScale(this.mirror * PART_SCALE, PART_SCALE)

    if (member.phase !== this.lastPhase || this.mirror !== this.lastMirror) {
      this.lastPhase = member.phase
      this.lastMirror = this.mirror
      this.drawMood(member.phase)
    }
    if (member.phase === 'resting') {
      this.sleep.setAlpha(0.62 + Math.abs(Math.sin(time * 0.004)) * 0.38)
      this.sleep.setPosition(
        this.mirror * 18 + frame.headX * 0.5,
        -84 + frame.headY * 0.5 + Math.sin(time * 0.004) * 3,
      )
    }

    const key = `${member.carry}-${member.carryCount}`
    if (key !== this.carryKey) {
      this.carryKey = key
      this.carrying.forEach((icon, index) => {
        const visible = member.carry !== null && index < Math.min(4, member.carryCount)
        icon.setVisible(visible)
        if (visible && member.carry !== null) icon.setTexture(productTextureKey(member.carry))
      })
    }
  }

  /**
   * A worker at a station keeps a readable three-quarter view instead of
   * turning their back to the camera just because the target is north.
   */
  private contextHeading(member: StaffState): Heading | null {
    if (member.moving) return null
    const side = member.facing
    if (
      member.phase === 'dining' ||
      member.phase === 'drinking' ||
      member.phase === 'resting' ||
      member.phase === 'cashier' ||
      member.phase === 'idle' ||
      member.phase === 'harvest' ||
      member.phase === 'stock' ||
      member.phase === 'feed' ||
      member.phase === 'load'
    ) {
      return side > 0 ? 2 : 6
    }
    return null
  }

  /** Anchors the carried pile to the hand and flips it with the body. */
  private layoutCarry(facing: -1 | 1): void {
    this.carrying.forEach((icon, index) => {
      icon.setPosition(
        facing * (CARRY_HAND_X + index * CARRY_LEAN),
        CARRY_HAND_Y - index * CARRY_STEP,
      )
    })
  }

  private drawMood(phase: StaffState['phase']): void {
    this.mood.clear()
    this.mood.setVisible(phase === 'drinking')
    this.sleep.setVisible(phase === 'resting')
    if (phase !== 'drinking') return

    const side = this.mirror
    drawCup(this.mood, side * 19, -50, 0.82, DRINK_CUP_COLORS.appleSoda)
    this.mood.fillStyle(0xffffff, 0.62)
    this.mood.fillCircle(side * 23, -72, 3)
    this.mood.fillCircle(side * 28, -81, 2.2)
    this.mood.fillCircle(side * 20, -87, 2)
  }
}
