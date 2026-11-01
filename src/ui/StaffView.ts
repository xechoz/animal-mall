import { type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import type { StaffState } from '../logic/types'
import { AnimalRig } from './AnimalRig'
import { DRINK_CUP_COLORS, drawCup } from './facilitiesArt'
import { productTextureKey } from './productArt'

const BODY_SCALE = 0.78
const APRON = {
  cashier: 0x5fbf9f,
  picker: 0x7fa65a,
  chef: 0xf3ebe0,
} as const

/** Staff carry goods in the hand too, so the pile matches the player's. */
const CARRY_HAND_X = 15
const CARRY_HAND_Y = -22
const CARRY_STEP = 11
const CARRY_LEAN = 1.2
const CARRY_BADGE_X = 10
const CARRY_BADGE_Y = -3

export class StaffView extends AnimalRig {
  readonly hit: Phaser.GameObjects.Zone
  private readonly apron: Phaser.GameObjects.Graphics
  private readonly hat: Phaser.GameObjects.Graphics
  private readonly carrying: Phaser.GameObjects.Image[] = []
  private readonly carryCount: Phaser.GameObjects.Text
  private readonly mood: Phaser.GameObjects.Graphics
  private readonly food: Phaser.GameObjects.Image
  private readonly sleep: Phaser.GameObjects.Text
  private carryKey = ''
  private carryFacing: -1 | 1 = 1
  private lastPhase: StaffState['phase'] | '' = ''
  private hatKind: StaffState['kind'] | '' = ''

  constructor(scene: Phaser.Scene, theme: Theme, member: StaffState, textScale: number) {
    super(scene, {
      species: member.species,
      player: false,
      scale: BODY_SCALE,
      seed: member.id,
      shadow: { width: 40, height: 11, alpha: 0.18 },
    })

    this.apron = scene.add.graphics()
    this.addBodyLayer(this.apron)

    this.hat = scene.add.graphics()
    this.addAbove(this.hat)

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

    this.apron.clear()
    this.apron.fillStyle(APRON[member.kind], 0.9)
    this.apron.fillRoundedRect(-13, -34, 26, 25, 6)
    this.apron.fillStyle(0xffffff, 0.35)
    this.apron.fillRoundedRect(-11, -32, 8, 6, 3)

    if (member.kind === 'chef') {
      if (this.hatKind !== 'chef') {
        this.hatKind = 'chef'
        this.drawChefHat()
      }
      this.hat.setPosition(frame.headX, frame.headY).setVisible(true)
    } else {
      this.hat.setVisible(false)
    }

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

  private drawChefHat(): void {
    this.hat.clear()
    this.hat.fillStyle(0xffffff, 1)
    this.hat.fillRoundedRect(-11, -62, 22, 9, 3)
    this.hat.fillCircle(-9, -64, 5)
    this.hat.fillCircle(0, -67, 6)
    this.hat.fillCircle(9, -64, 5)
    this.hat.lineStyle(1.5, 0xd9cbb5, 0.9)
    this.hat.strokeRoundedRect(-11, -62, 22, 9, 3)
    this.hat.fillStyle(0xe8b04c, 1)
    this.hat.fillRoundedRect(-12, -54, 24, 3, 1.5)
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
