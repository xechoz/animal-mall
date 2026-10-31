import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import type { ShopMap } from '../logic/types'
import { coinTextureKey } from './fruitArt'

const COIN_CAP = 14

export class CoinPileView extends Phaser.GameObjects.Container {
  private readonly theme: Theme
  private readonly pile: Phaser.GameObjects.Graphics
  private readonly coin: Phaser.GameObjects.Image
  private readonly amount: Phaser.GameObjects.Text
  private lastAmount = -1

  constructor(scene: Phaser.Scene, theme: Theme, map: ShopMap) {
    super(scene, map.counter.x + map.counter.w - 15, map.counter.y + 22)
    this.theme = theme
    this.setDepth(map.counter.y + map.counter.h - 2)

    this.pile = scene.add.graphics()
    this.add(this.pile)

    this.coin = scene.add.image(14, -38, coinTextureKey()).setScale(0.5)
    this.add(this.coin)

    this.amount = scene.add
      .text(24, -38, '', textStyle(theme, 18, theme.text, true))
      .setOrigin(0, 0.5)
      .setBackgroundColor('#fff7e8')
      .setPadding(5, 1, 5, 1)
    this.add(this.amount)

    this.setVisible(false)
    scene.add.existing(this)
  }

  updatePile(amount: number): void {
    if (amount === this.lastAmount) return
    const previous = this.lastAmount
    this.lastAmount = amount
    this.setVisible(amount > 0)
    if (amount <= 0) {
      this.pile.clear()
      this.amount.setText('')
      return
    }

    const coins = Math.min(COIN_CAP, amount)
    this.pile.clear()
    for (let index = 0; index < coins; index += 1) {
      const stack = index % 3
      const level = Math.floor(index / 3)
      const x = (stack - 1) * 15 + (level % 2) * 2
      const y = 6 - level * 4
      this.pile.fillStyle(0x3b2f3a, 0.16)
      this.pile.fillEllipse(x + 1, y + 3, 16, 6)
      this.pile.fillStyle(0xd89a2b, 1)
      this.pile.fillEllipse(x, y, 16, 7)
      this.pile.fillStyle(0xffd166, 1)
      this.pile.fillEllipse(x, y - 1, 14, 5)
      this.pile.lineStyle(1, 0xd89a2b, 1)
      this.pile.strokeEllipse(x, y - 1, 9, 3)
    }

    this.coin.setVisible(amount > 0)
    this.amount.setText(String(amount)).setColor(`#${this.theme.text.slice(1)}`)
    if (previous >= 0 && amount > previous) {
      this.scene.tweens.add({
        targets: this,
        scaleX: { from: 1.08, to: 1 },
        scaleY: { from: 1.08, to: 1 },
        duration: 160,
        ease: 'Quad.easeOut',
      })
    }
  }
}
