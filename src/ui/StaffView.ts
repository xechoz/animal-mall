import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import type { StaffState } from '../logic/types'
import { animalTextureKey } from './animalArt'
import { fruitTextureKey } from './fruitArt'

const APRON = {
  cashier: 0x5fbf9f,
  picker: 0x7fa65a,
} as const

export class StaffView extends Phaser.GameObjects.Container {
  private readonly bodyImage: Phaser.GameObjects.Image
  private readonly apron: Phaser.GameObjects.Graphics
  private readonly carrying: Phaser.GameObjects.Image[] = []
  private readonly carryCount: Phaser.GameObjects.Text
  private carryKey = ''

  constructor(scene: Phaser.Scene, theme: Theme, member: StaffState) {
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
        .image(0, -74 - index * 14, fruitTextureKey('apple'))
        .setScale(0.42)
        .setVisible(false)
      this.carrying.push(icon)
      this.add(icon)
    }

    this.carryCount = scene.add
      .text(18, -112, '', textStyle(theme, 12, theme.text, true))
      .setOrigin(0, 0.5)
      .setBackgroundColor('#fff7e8')
      .setPadding(3, 0, 3, 0)
      .setVisible(false)
    this.add(this.carryCount)

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

    const key = `${member.carry}-${member.carryCount}`
    if (key !== this.carryKey) {
      this.carryKey = key
      this.carrying.forEach((icon, index) => {
        const visible = member.carry !== null && index < Math.min(4, member.carryCount)
        icon.setVisible(visible)
        if (visible && member.carry !== null) icon.setTexture(fruitTextureKey(member.carry))
      })
      const overflow = member.carryCount > 4
      this.carryCount
        .setText(overflow ? `×${member.carryCount}` : '')
        .setVisible(overflow && member.carry !== null)
    }
  }
}
