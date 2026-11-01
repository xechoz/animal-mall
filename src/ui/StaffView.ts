import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import type { StaffState } from '../logic/types'
import { animalTextureKey } from './animalArt'
import { DRINK_CUP_COLORS, drawCup } from './facilitiesArt'
import { productTextureKey } from './productArt'

const APRON = {
  cashier: 0x5fbf9f,
  picker: 0x7fa65a,
  chef: 0xf3ebe0,
} as const

export class StaffView extends Phaser.GameObjects.Container {
  readonly hit: Phaser.GameObjects.Zone
  private readonly bodyImage: Phaser.GameObjects.Image
  private readonly apron: Phaser.GameObjects.Graphics
  private readonly carrying: Phaser.GameObjects.Image[] = []
  private readonly carryCount: Phaser.GameObjects.Text
  private readonly mood: Phaser.GameObjects.Graphics
  private readonly sleep: Phaser.GameObjects.Text
  private carryKey = ''
  private lastPhase: StaffState['phase'] | '' = ''

  constructor(scene: Phaser.Scene, theme: Theme, member: StaffState, textScale: number) {
    super(scene, member.pos.x, member.pos.y)
    const shadow = scene.add.graphics()
    shadow.fillStyle(0x3b2f3a, 0.18)
    shadow.fillEllipse(0, 2, 40, 11)
    this.add(shadow)

    this.bodyImage = scene.add
      .image(0, 0, animalTextureKey(member.species))
      .setOrigin(0.5, 0.9)
      .setScale(0.78)
    this.add(this.bodyImage)

    this.apron = scene.add.graphics()
    this.add(this.apron)

    for (let index = 0; index < 4; index += 1) {
      const icon = scene.add
        .image(0, -74 - index * 14, productTextureKey('apple'))
        .setScale(0.42)
        .setVisible(false)
      this.carrying.push(icon)
      this.add(icon)
    }

    this.carryCount = scene.add
      .text(18, -112, '', textStyle(theme, 12 * textScale, theme.text, true))
      .setOrigin(0, 0.5)
      .setBackgroundColor('#fff7e8')
      .setPadding(3, 0, 3, 0)
      .setVisible(false)
    this.add(this.carryCount)

    this.mood = scene.add.graphics()
    this.add(this.mood)

    this.sleep = scene.add
      .text(18, -96, 'Zzz', textStyle(theme, 14 * textScale, theme.text, true))
      .setOrigin(0.5)
      .setBackgroundColor('#fff7e8')
      .setPadding(5, 1, 5, 1)
      .setAngle(-8)
      .setVisible(false)
    this.add(this.sleep)

    this.hit = scene.add.zone(0, -38, 46, 86).setInteractive({ useHandCursor: true })
    this.add(this.hit)

    scene.add.existing(this)
  }

  updateStaff(member: StaffState, alpha: number, time: number): void {
    const x = member.prevPos.x + (member.pos.x - member.prevPos.x) * alpha
    const y = member.prevPos.y + (member.pos.y - member.prevPos.y) * alpha
    const bob = member.moving ? Math.abs(Math.sin(time * 0.012)) * 3 : Math.sin(time * 0.003) * 1
    this.setPosition(x, y - bob)
    this.bodyImage.setScale(member.facing * 0.78, 0.78)

    this.apron.clear()
    this.apron.fillStyle(APRON[member.kind], 0.9)
    this.apron.fillRoundedRect(-13, -34, 26, 25, 6)
    this.apron.fillStyle(0xffffff, 0.35)
    this.apron.fillRoundedRect(-11, -32, 8, 6, 3)
    if (member.kind === 'chef') this.drawChefHat()

    if (member.phase !== this.lastPhase) {
      this.lastPhase = member.phase
      this.drawMood(member.phase)
    }
    if (member.phase === 'resting') {
      this.sleep.setAlpha(0.62 + Math.abs(Math.sin(time * 0.004)) * 0.38)
      this.sleep.setY(-96 + Math.sin(time * 0.004) * 3)
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

  private drawChefHat(): void {
    this.apron.fillStyle(0xffffff, 1)
    this.apron.fillRoundedRect(-11, -62, 22, 9, 3)
    this.apron.fillCircle(-9, -64, 5)
    this.apron.fillCircle(0, -67, 6)
    this.apron.fillCircle(9, -64, 5)
    this.apron.lineStyle(1.5, 0xd9cbb5, 0.9)
    this.apron.strokeRoundedRect(-11, -62, 22, 9, 3)
    this.apron.fillStyle(0xe8b04c, 1)
    this.apron.fillRoundedRect(-12, -54, 24, 3, 1.5)
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
