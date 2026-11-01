import { type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { distance } from '../logic/collision'
import { INTERACTION, STAFF } from '../logic/config'
import { mapOffers, type PurchaseOffer, quickBuyThreshold } from '../logic/quickBuy'
import type { ShopState } from '../logic/types'
import { animalTextureKey } from './animalArt'
import { coinTextureKey } from './fruitArt'
import { drawSeedPacket } from './groundArt'
import { type GameLayout, worldToScreen } from './layout'
import { productTextureKey } from './productArt'

interface OfferLabel {
  readonly container: Phaser.GameObjects.Container
  readonly bg: Phaser.GameObjects.Graphics
  readonly dwell: Phaser.GameObjects.Graphics
  readonly badge: Phaser.GameObjects.Graphics
  readonly icon: Phaser.GameObjects.Image
  readonly coin: Phaser.GameObjects.Image
  readonly price: Phaser.GameObjects.Text
  readonly paid: Phaser.GameObjects.Graphics
  readonly hit: Phaser.GameObjects.Zone
  action?: () => void
  downX?: number
  downY?: number
}

const WIDTH = 70
const HEIGHT = 30

export class MapOffers {
  private readonly scene: Phaser.Scene
  private readonly layout: GameLayout
  private readonly theme: Theme
  private readonly onBedTap: (zone: 'fruit' | 'veg', slot: number) => void
  private readonly labels = new Map<string, OfferLabel>()

  constructor(
    scene: Phaser.Scene,
    layout: GameLayout,
    theme: Theme,
    onBedTap: (zone: 'fruit' | 'veg', slot: number) => void,
  ) {
    this.scene = scene
    this.layout = layout
    this.theme = theme
    this.onBedTap = onBedTap
  }

  update(state: ShopState): void {
    // Empty beds always advertise their starting price: otherwise a new player
    // sees bare soil and never learns the field is plantable. Everything else
    // stays distance-gated so six beds plus animals and staff do not turn the
    // shop into confetti.
    const offers = mapOffers(state).filter(
      (offer) =>
        offer.type === 'zone' ||
        (offer.type === 'plant' && offer.requiresChoice) ||
        distance(state.player.pos, offer.pos) <= (offer.type === 'staff' ? 210 : 165),
    )
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
    // Offers sit on top of world objects, so they scale far less than HUD chrome:
    // otherwise neighbouring chips overlap the shelves they belong to.
    const ui = Math.min(this.layout.ui, 1.2)
    const container = this.scene.add.container(0, 0).setDepth(5200)
    const bg = this.scene.add.graphics()
    const dwell = this.scene.add.graphics()
    const badge = this.scene.add.graphics()
    const icon = this.scene.add.image(0, 0, productTextureKey('apple')).setScale(0.55 * ui)
    const coin = this.scene.add.image(0, 0, coinTextureKey()).setScale(0.42 * ui)
    const price = this.scene.add
      .text(0, 0, '', textStyle(this.theme, 13 * ui, this.theme.text, true))
      .setOrigin(0, 0.5)
    const paid = this.scene.add.graphics()
    const hit = this.scene.add.zone(0, 0, WIDTH, HEIGHT).setInteractive({ useHandCursor: true })
    const label: OfferLabel = { container, bg, dwell, badge, icon, coin, price, paid, hit }
    // The label is the most obvious thing to tap, so it mirrors the bed tap.
    // A drag across the screen must not open a paid chooser.
    hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      label.downX = pointer.x
      label.downY = pointer.y
    })
    hit.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const startX = label.downX
      const startY = label.downY
      label.downX = undefined
      label.downY = undefined
      if (startX === undefined || startY === undefined) return
      if (Math.hypot(pointer.x - startX, pointer.y - startY) > INTERACTION.tapSlop) return
      label.action?.()
    })
    hit.on('pointerout', () => {
      label.downX = undefined
      label.downY = undefined
    })
    container.add([bg, paid, dwell, badge, icon, coin, price, hit])
    return label
  }

  private apply(label: OfferLabel, offer: PurchaseOffer, state: ShopState): void {
    const point = worldToScreen(this.layout, offer.pos)
    const ui = Math.min(this.layout.ui, 1.2)
    const near = distance(state.player.pos, offer.pos) <= 165
    // Far-away empty beds shrink to a price sticker sitting on the soil, so a
    // new player still sees "plantable" without six full chips fighting the
    // zone header. Selecting one expands it into the normal label.
    const compact = offer.type === 'plant' && offer.requiresChoice && !near
    // Four-digit zone prices need a little more room than product offers.
    const width = (offer.type === 'zone' ? WIDTH + 14 : compact ? 44 : WIDTH) * ui
    const height = (compact ? 20 : HEIGHT) * ui
    // Crop labels sit above the canopy, not inside it. Animal and station
    // labels stay lower so they do not collide with the top HUD.
    const compactLift = offer.type === 'plant' && offer.zone === 'fruit' ? 10 : 4
    const lift =
      (compact
        ? compactLift
        : offer.type === 'swap'
          ? this.layout.portrait
            ? 108
            : 82
          : offer.type === 'plant'
            ? 22
            : this.layout.portrait
              ? 58
              : 24) *
      this.layout.worldScale *
      ui
    const content = this.layout.content
    const x = Math.max(
      content.x + width / 2 + 8 * ui,
      Math.min(content.x + content.w - width / 2 - 8 * ui, point.x),
    )
    const y = Math.max(
      content.y + height / 2 + 8 * ui,
      Math.min(content.y + content.h - height / 2 - 8 * ui, point.y - lift - 16 * ui),
    )
    label.container.setPosition(x, y)
    label.hit.setSize(
      width + INTERACTION.labelHitPadding * 2 * ui,
      height + INTERACTION.labelHitPadding * 2 * ui,
    )
    label.action =
      offer.type === 'swap' || (offer.type === 'plant' && offer.requiresChoice)
        ? () => this.onBedTap(offer.zone, offer.slot)
        : undefined

    const affordable = offer.type === 'swap' ? true : state.coins >= offer.remaining
    label.bg.clear()
    label.bg.fillStyle(this.theme.shadow, 0.16)
    label.bg.fillRoundedRect(-width / 2, -height / 2 + 3 * ui, width, height, 11 * ui)
    label.bg.fillStyle(this.theme.panel, 0.96)
    label.bg.fillRoundedRect(-width / 2, -height / 2, width, height, 11 * ui)
    label.bg.lineStyle(2 * ui, affordable ? this.theme.accent : this.theme.borderSoft, 0.9)
    label.bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 11 * ui)

    label.icon.setVisible(
      (offer.type === 'plant' && !offer.requiresChoice) ||
        offer.type === 'producer' ||
        offer.type === 'staff' ||
        offer.type === 'swap',
    )
    label.badge.setVisible(
      (offer.type === 'plant' && offer.requiresChoice && !compact) ||
        offer.type === 'zone' ||
        offer.type === 'swap',
    )
    label.badge.clear()
    if (offer.type === 'plant' && offer.requiresChoice) {
      drawSeedPacket(label.badge, -22 * ui, 0, ui)
    }
    if (offer.type === 'zone') {
      drawLockBadge(label.badge, -22 * ui, 0, ui)
    }
    if (offer.type === 'swap') {
      drawSwapBadge(label.badge, 20 * ui, 0, ui)
    }
    if (offer.type === 'plant' && !offer.requiresChoice) {
      label.icon
        .setTexture(productTextureKey(offer.product))
        .setPosition(-22 * ui, 0)
        .setScale(0.46 * ui)
    }
    if (offer.type === 'producer') {
      label.icon
        .setVisible(true)
        .setTexture(productTextureKey(offer.product))
        .setPosition(-22 * ui, 0)
        .setScale(0.46 * ui)
    }
    if (offer.type === 'staff') {
      label.icon
        .setVisible(true)
        .setTexture(animalTextureKey(STAFF[offer.kind].species))
        .setPosition(-22 * ui, 1 * ui)
        .setScale(0.21 * ui)
    }
    if (offer.type === 'swap') {
      label.icon
        .setVisible(true)
        .setTexture(productTextureKey(offer.product))
        .setPosition(-18 * ui, 0)
        .setScale(0.58 * ui)
    }

    const showPrice = offer.type !== 'swap'
    label.coin.setVisible(showPrice)
    label.price.setVisible(showPrice)
    if (compact) {
      label.coin.setPosition(-13 * ui, 0).setScale(0.32 * ui)
      label.price.setPosition(-2 * ui, 0).setFontSize(11 * ui)
    } else {
      label.coin.setPosition(-3 * ui, 0).setScale(0.42 * ui)
      label.price.setPosition(7 * ui, 0).setFontSize(13 * ui)
    }
    label.price.setText(offer.type === 'swap' ? '' : String(offer.remaining))
    label.price.setColor(affordable ? this.theme.text : this.theme.textMuted)

    label.paid.clear()
    if (offer.type !== 'swap' && offer.deposit > 0) {
      const ratio = Math.min(1, offer.deposit / Math.max(1, offer.cost))
      label.paid.fillStyle(this.theme.ink, 0.12)
      label.paid.fillRoundedRect(-26 * ui, 10 * ui, 52 * ui, 5 * ui, 2.5 * ui)
      label.paid.fillStyle(this.theme.accentAlt, 1)
      label.paid.fillRoundedRect(-26 * ui, 10 * ui, 52 * ui * ratio, 5 * ui, 2.5 * ui)
    }

    label.dwell.clear()
    if (state.quickBuy.targetKey === offer.id && state.quickBuy.dwellMs > 0) {
      const threshold = quickBuyThreshold(offer)
      const ratio = Math.min(1, state.quickBuy.dwellMs / threshold)
      label.dwell.lineStyle(4 * ui, this.theme.ink, 0.14)
      label.dwell.strokeCircle(-22 * ui, 0, 15 * ui)
      label.dwell.lineStyle(4 * ui, this.theme.accentAlt, 1)
      label.dwell.beginPath()
      label.dwell.arc(-22 * ui, 0, 15 * ui, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio)
      label.dwell.strokePath()
    }
  }
}

function drawSwapBadge(g: Phaser.GameObjects.Graphics, x: number, y: number, ui: number): void {
  const s = 0.7 * ui
  g.lineStyle(2.4 * s, 0x5fbf9f, 1)
  g.beginPath()
  g.arc(x, y, 7 * s, -Math.PI * 0.15, Math.PI * 0.85)
  g.strokePath()
  g.beginPath()
  g.arc(x, y, 7 * s, Math.PI * 0.85, Math.PI * 1.85)
  g.strokePath()
  g.fillStyle(0x5fbf9f, 1)
  g.fillTriangle(x + 5 * s, y - 8 * s, x + 10 * s, y - 3 * s, x + 3 * s, y - 2 * s)
  g.fillTriangle(x - 5 * s, y + 8 * s, x - 10 * s, y + 3 * s, x - 3 * s, y + 2 * s)
}

function drawLockBadge(g: Phaser.GameObjects.Graphics, x: number, y: number, ui: number): void {
  const s = 0.55 * ui
  g.fillStyle(0x2f2433, 0.16)
  g.fillRoundedRect(x - 17 * s, y - 12 * s, 34 * s, 30 * s, 6 * s)
  g.fillStyle(0xffd166, 1)
  g.fillRoundedRect(x - 16 * s, y - 10 * s, 32 * s, 26 * s, 6 * s)
  g.lineStyle(5 * s, 0xffd166, 1)
  g.beginPath()
  g.arc(x, y - 10 * s, 12 * s, Math.PI, Math.PI * 2)
  g.strokePath()
  g.fillStyle(0x2f2433, 1)
  g.fillCircle(x, y + 2 * s, 4 * s)
  g.fillRect(x - 2 * s, y + 2 * s, 4 * s, 8 * s)
}
