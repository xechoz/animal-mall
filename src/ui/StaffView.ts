import { type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import type { StaffState } from '../logic/types'
import { AnimalRig } from './AnimalRig'
import { ANIMAL_SCALE } from './animalArt'
import { DRINK_CUP_COLORS, drawCup } from './facilitiesArt'
import { productTextureKey } from './productArt'
import { staffBodyKey, staffHatKey } from './staffArt'

const BODY_SCALE = 0.78
/** The rig shrinks 128-unit part art to the long-standing 96-unit footprint. */
const PART_SCALE = BODY_SCALE * ANIMAL_SCALE

/** Staff carry goods in the hand too, so the pile matches the player's. */
const CARRY_HAND_X = 15
const CARRY_HAND_Y = -22
const CARRY_STEP = 11
const CARRY_LEAN = 1.2
const CARRY_BADGE_X = 10
const CARRY_BADGE_Y = -3

export class StaffView extends AnimalRig {
  readonly hit: Phaser.GameObjects.Zone
  private readonly hatImage: Phaser.GameObjects.Image
  private readonly carrying: Phaser.GameObjects.Image[] = []
  private readonly carryCount: Phaser.GameObjects.Text
  private readonly mood: Phaser.GameObjects.Graphics
  private readonly food: Phaser.GameObjects.Image
  private readonly sleep: Phaser.GameObjects.Text
  private carryKey = ''
  private carryFacing: -1 | 1 = 1
  private lastPhase: StaffState['phase'] | '' = ''

  constructor(scene: Phaser.Scene, theme: Theme, member: StaffState, textScale: number) {
    super(scene, {
      species: member.species,
      player: false,
      scale: BODY_SCALE,
      seed: member.id,
      shadow: { width: 40, height: 11, alpha: 0.18 },
      parts: { body: staffBodyKey(member.kind) },
    })

    // The hat sits under the head so ears stay in front of the brim.
    this.hatImage = scene.add.image(0, 0, staffHatKey(member.kind)).setOrigin(0.5, 0.9)
    this.addBodyLayer(this.hatImage)

    for (let index = 0; index < 4; index += 1) {
      const icon = scene.add
        .image(CARRY_HAND_X, CARRY_HAND_Y, productTextureKey('apple'))
        .setScale(0.42)
        .setVisible(false)
      this.carrying.push(icon)
      this.addAbove(icon)
    }

    this.carryCount = scene.add
      .text(
        CARRY_HAND_X + CARRY_BADGE_X,
        CARRY_HAND_Y + CARRY_BADGE_Y,
        '',
        textStyle(theme, 12 * textScale, theme.text, true),
      )
      .setOrigin(0, 0.5)
      .setBackgroundColor('#fff7e8')
      .setPadding(3, 0, 3, 0)
      .setVisible(false)
    this.addAbove(this.carryCount)
    this.layoutCarry(1)

    this.mood = scene.add.graphics()
    this.addAbove(this.mood)
    this.food = scene.add.image(0, 0, productTextureKey('apple')).setScale(0.42).setVisible(false)
    this.addAbove(this.food)

    this.sleep = scene.add
      .text(18, -96, 'Zzz', textStyle(theme, 14 * textScale, theme.text, true))
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
    const x = member.prevPos.x + (member.pos.x - member.prevPos.x) * alpha
    const y = member.prevPos.y + (member.pos.y - member.prevPos.y) * alpha
    const dining = member.phase === 'dining'
    const seatedScale = dining ? 0.72 / BODY_SCALE : 1
    const load = Math.min(1, member.carryCount / 6)
    const frame = this.updateRig(
      x,
      y,
      member.facing,
      time,
      {
        y: dining ? 4 : 0,
        scaleX: seatedScale,
        scaleY: seatedScale,
      },
      load,
    )

    if (member.facing !== this.carryFacing) {
      this.carryFacing = member.facing
      this.layoutCarry(member.facing)
    }

    if (dining && member.carry !== null) {
      const chew = Math.abs(Math.sin(time * 0.018))
      this.food
        .setTexture(productTextureKey(member.carry))
        .setVisible(true)
        .setPosition(member.facing * 16 + frame.headX, -24 - chew * 2 + frame.headY)
        .setScale(member.facing * 0.42, 0.42)
        .setRotation(-member.facing * 0.2)
    } else {
      this.food.setVisible(false)
    }
    this.mood.setPosition(frame.headX, frame.headY)

    this.hatImage
      .setPosition(frame.headX, frame.headY)
      .setScale(member.facing * PART_SCALE, PART_SCALE)

    if (member.phase !== this.lastPhase) {
      this.lastPhase = member.phase
      this.drawMood(member.phase)
    }
    if (member.phase === 'resting') {
      this.sleep.setAlpha(0.62 + Math.abs(Math.sin(time * 0.004)) * 0.38)
      this.sleep.setPosition(
        18 + frame.headX * 0.5,
        -96 + frame.headY * 0.5 + Math.sin(time * 0.004) * 3,
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
      const overflow = member.carryCount > 4
      this.carryCount
        .setText(overflow ? `×${member.carryCount}` : '')
        .setVisible(overflow && member.carry !== null)
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

  private drawMood(phase: StaffState['phase']): void {
    this.mood.clear()
    this.mood.setVisible(phase === 'drinking')
    this.sleep.setVisible(phase === 'resting')
    if (phase !== 'drinking') return

    drawCup(this.mood, 19, -50, 0.82, DRINK_CUP_COLORS.appleSoda)
    this.mood.fillStyle(0xffffff, 0.62)
    this.mood.fillCircle(23, -72, 3)
    this.mood.fillCircle(28, -81, 2.2)
    this.mood.fillCircle(20, -87, 2)
  }
}
