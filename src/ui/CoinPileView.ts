import Phaser from 'phaser'
import type { ShopMap } from '../logic/types'
import { ensureTexture } from './bakeArt'
import { coinTextureKey } from './fruitArt'

const COIN_CAP = 14
const PILE_BOX = { x: -30, y: -24, w: 60, h: 44 } as const
const PILE_SCALE = 3

export class CoinPileView extends Phaser.GameObjects.Container {
  private readonly pile: Phaser.GameObjects.Image
  private readonly coin: Phaser.GameObjects.Image
  private lastAmount = -1

  constructor(scene: Phaser.Scene, map: ShopMap) {
    super(scene, map.counter.x + map.counter.w - 15, map.counter.y + 22)
    // The counter is its own depth-sorted view now, so the coins have to sit
    // just above its footprint or the raised top board hides them.
    this.setDepth(map.counter.y + map.counter.h + 1)

    this.pile = scene.add
      .image(0, 0, '__DEFAULT')
      .setOrigin(0.5, -PILE_BOX.y / PILE_BOX.h)
      .setVisible(false)
    this.add(this.pile)

    // The coin is the "walk over here to collect" cue; the exact amount stays
    // out of the world and only appears in the HUD purse once collected.
    this.coin = scene.add.image(0, -38, coinTextureKey()).setScale(0.5)
    this.add(this.coin)

    this.setVisible(false)
    scene.add.existing(this)
  }

  updatePile(amount: number): void {
    if (amount === this.lastAmount) return
    const previous = this.lastAmount
    this.lastAmount = amount
    this.setVisible(amount > 0)
    if (amount <= 0) {
      this.pile.setVisible(false)
      return
    }

    const coins = Math.min(COIN_CAP, amount)
    const key = ensureTexture(
      this.scene,
      `coin-pile-${coins}-${PILE_SCALE}`,
      { x: PILE_BOX.x, y: PILE_BOX.y },
      PILE_BOX.w,
      PILE_BOX.h,
      PILE_SCALE,
      (g) => {
        for (let index = 0; index < coins; index += 1) {
          const stack = index % 3
          const level = Math.floor(index / 3)
          const x = (stack - 1) * 15 + (level % 2) * 2
          const y = 6 - level * 4
          g.fillStyle(0x3b2f3a, 0.16)
          g.fillEllipse(x + 1, y + 3, 16, 6)
          g.fillStyle(0xd89a2b, 1)
          g.fillEllipse(x, y, 16, 7)
          g.fillStyle(0xffd166, 1)
          g.fillEllipse(x, y - 1, 14, 5)
          g.lineStyle(1, 0xd89a2b, 1)
          g.strokeEllipse(x, y - 1, 9, 3)
        }
      },
    )
    const source = this.scene.textures.get(key).getSourceImage()
    this.pile
      .setTexture(key)
      .setScale(PILE_BOX.w / source.width, PILE_BOX.h / source.height)
      .setVisible(true)

    this.coin.setVisible(true)
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
