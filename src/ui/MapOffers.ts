import { type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { STAFF } from '../logic/config'
import { mapOffers, type PurchaseOffer, quickBuyThreshold } from '../logic/quickBuy'
import type { ShopState } from '../logic/types'
import { animalTextureKey } from './animalArt'
import { coinTextureKey, fruitTextureKey } from './fruitArt'
import { type GameLayout, worldToScreen } from './layout'

interface OfferLabel {
  readonly container: Phaser.GameObjects.Container
  readonly bg: Phaser.GameObjects.Graphics
  readonly dwell: Phaser.GameObjects.Graphics
  readonly seed: Phaser.GameObjects.Graphics
  readonly icon: Phaser.GameObjects.Image
  readonly coin: Phaser.GameObjects.Image
  readonly price: Phaser.GameObjects.Text
  readonly paid: Phaser.GameObjects.Graphics
}

const WIDTH = 70
const HEIGHT = 28

export class MapOffers {
  private readonly scene: Phaser.Scene
  private readonly layout: GameLayout
  private readonly theme: Theme
  private readonly labels = new Map<string, OfferLabel>()

  constructor(scene: Phaser.Scene, layout: GameLayout, theme: Theme) {
    this.scene = scene
    this.layout = layout
    this.theme = theme
  }

  update(state: ShopState): void {
    const offers = mapOffers(state)
    const alive = new Set<string>()
    for (const offer of offers) {
      alive.add(offer.id)
      let label = this.labels.get(offer.id)
      if (label === undefined) {
        label = this.createLabel()
        this.labels.set(offer.id, label)
      }
      this.apply(label, offer, state)
    }
    for (const [id, label] of this.labels) {
      if (alive.has(id)) continue
      label.container.destroy(true)
      this.labels.delete(id)
    }
  }

  destroy(): void {
    for (const label of this.labels.values()) label.container.destroy(true)
    this.labels.clear()
  }

  private createLabel(): OfferLabel {
    const container = this.scene.add.container(0, 0).setDepth(5200)
    const bg = this.scene.add.graphics()
    const dwell = this.scene.add.graphics()
    const seed = this.scene.add.graphics()
    const icon = this.scene.add.image(0, 0, fruitTextureKey('apple')).setScale(0.55)
    const coin = this.scene.add.image(0, 0, coinTextureKey()).setScale(0.42)
    const price = this.scene.add
      .text(0, 0, '', textStyle(this.theme, 13, this.theme.text, true))
      .setOrigin(0, 0.5)
    const paid = this.scene.add.graphics()
    container.add([bg, paid, dwell, seed, icon, coin, price])
    return { container, bg, dwell, seed, icon, coin, price, paid }
  }

  private apply(label: OfferLabel, offer: PurchaseOffer, state: ShopState): void {
    const point = worldToScreen(this.layout, offer.pos)
    const lift = 58
    const x = Math.max(WIDTH / 2 + 8, Math.min(this.layout.width - WIDTH / 2 - 8, point.x))
    const y = Math.max(
      86,
      Math.min(this.layout.height - 44, point.y - lift * this.layout.worldScale - 16),
    )
    label.container.setPosition(x, y)

    const affordable = state.coins >= offer.remaining
    label.bg.clear()
    label.bg.fillStyle(this.theme.shadow, 0.16)
    label.bg.fillRoundedRect(-WIDTH / 2, -HEIGHT / 2 + 3, WIDTH, HEIGHT, 11)
    label.bg.fillStyle(this.theme.panel, 0.96)
    label.bg.fillRoundedRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT, 11)
    label.bg.lineStyle(2, affordable ? this.theme.accent : this.theme.borderSoft, 0.9)
    label.bg.strokeRoundedRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT, 11)

    label.icon.setVisible(offer.type === 'tree' && !offer.requiresChoice)
    label.seed.setVisible(offer.type === 'tree' && offer.requiresChoice)
    label.seed.clear()
    if (offer.type === 'tree' && offer.requiresChoice) {
      drawSeedPacket(label.seed, -22, 0)
    }
    if (offer.type === 'tree' && !offer.requiresChoice) {
      label.icon.setTexture(fruitTextureKey(offer.kind)).setPosition(-22, 0).setScale(0.46)
    }
    if (offer.type === 'staff') {
      label.icon
        .setTexture(animalTextureKey(STAFF[offer.kind].species))
        .setPosition(-22, 1)
        .setScale(0.21)
    }

    label.coin.setPosition(-3, 0)
    label.price.setPosition(7, 0).setText(String(offer.remaining))
    label.price.setColor(affordable ? this.theme.text : this.theme.textMuted)

    label.paid.clear()
    if (offer.deposit > 0) {
      const ratio = Math.min(1, offer.deposit / Math.max(1, offer.cost))
      label.paid.fillStyle(this.theme.ink, 0.12)
      label.paid.fillRoundedRect(-26, 9, 52, 5, 2.5)
      label.paid.fillStyle(this.theme.accentAlt, 1)
      label.paid.fillRoundedRect(-26, 9, 52 * ratio, 5, 2.5)
    }

    label.dwell.clear()
    if (state.quickBuy.targetKey === offer.id && state.quickBuy.dwellMs > 0) {
      const threshold = quickBuyThreshold(offer)
      const ratio = Math.min(1, state.quickBuy.dwellMs / threshold)
      label.dwell.lineStyle(4, this.theme.ink, 0.14)
      label.dwell.strokeCircle(-22, 0, 15)
      label.dwell.lineStyle(4, this.theme.accentAlt, 1)
      label.dwell.beginPath()
      label.dwell.arc(-22, 0, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio)
      label.dwell.strokePath()
    }
  }
}

function drawSeedPacket(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x8f5734, 1)
  g.fillRoundedRect(x - 10, y - 12, 20, 24, 4)
  g.fillStyle(0xf0c99b, 1)
  g.fillRoundedRect(x - 7, y - 9, 14, 18, 3)
  g.fillStyle(0x6f4b2e, 1)
  g.fillEllipse(x, y - 2, 6, 8)
  g.fillStyle(0x5aa96f, 1)
  g.fillEllipse(x + 3, y - 10, 8, 4)
}
