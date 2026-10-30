import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import type { PlayerState } from '../logic/types'
import { playerTextureKey } from './animalArt'
import { productTextureKey } from './productArt'

export class PlayerView extends Phaser.GameObjects.Container {
  private readonly bodyImage: Phaser.GameObjects.Image
  private readonly carrying: Phaser.GameObjects.Image[] = []
  private readonly carryCount: Phaser.GameObjects.Text
  private readonly theme: Theme
  private carryKey = ''

  constructor(scene: Phaser.Scene, theme: Theme) {
    super(scene, 0, 0)
    this.theme = theme

    const shadow = scene.add.graphics()
    shadow.fillStyle(0x3b2f3a, 0.18)
    shadow.fillEllipse(0, 2, 42, 12)
    this.add(shadow)

    this.bodyImage = scene.add.image(0, 0, playerTextureKey()).setOrigin(0.5, 0.9).setScale(0.82)
    this.add(this.bodyImage)

    for (let index = 0; index < 5; index += 1) {
      const icon = scene.add
        .image(0, -80 - index * 15, productTextureKey('apple'))
        .setScale(0.46)
        .setVisible(false)
      this.carrying.push(icon)
      this.add(icon)
    }

    this.carryCount = scene.add
      .text(20, -120, '', textStyle(theme, 13, theme.text, true))
      .setOrigin(0, 0.5)
      .setBackgroundColor('#fff7e8')
      .setPadding(4, 0, 4, 0)
      .setVisible(false)
    this.add(this.carryCount)

    scene.add.existing(this)
  }

  updatePlayer(player: PlayerState, alpha: number, time: number): void {
    const x = player.prevPos.x + (player.pos.x - player.prevPos.x) * alpha
    const y = player.prevPos.y + (player.pos.y - player.prevPos.y) * alpha
    const bob = player.moving ? Math.abs(Math.sin(time * 0.012)) * 3 : Math.sin(time * 0.003) * 1
    this.setPosition(x, y - bob)
    this.bodyImage.setScale(player.facing * 0.82, 0.82)

    const key = `${player.carry}-${player.carryCount}`
    if (key !== this.carryKey) {
      this.carryKey = key
      this.carrying.forEach((icon, index) => {
        const visible = player.carry !== null && index < Math.min(5, player.carryCount)
        icon.setVisible(visible)
        if (visible && player.carry !== null) icon.setTexture(productTextureKey(player.carry))
      })
      const overflow = player.carryCount > 5
      this.carryCount
        .setText(overflow ? `×${player.carryCount}` : '')
        .setVisible(overflow && player.carry !== null)
    }
    this.carryCount.setColor(this.theme.text)
  }
}
