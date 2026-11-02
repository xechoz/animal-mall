import { type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { gameColors } from '../colors'
import { distance } from '../logic/collision'
import { INTERACTION, PEN_SIZE, PLOT_SIZE, STAFF, STATION_SIZE } from '../logic/config'
import { mapOffers, type PurchaseOffer, quickBuyThreshold } from '../logic/quickBuy'
import type { ShopState, Vec2, ZoneId } from '../logic/types'
import { ANIMAL_SCALE, animalTextureKey } from './animalArt'
import { coinTextureKey } from './fruitArt'
import { drawSeedPacket } from './groundArt'
import type { GameLayout } from './layout'
import { productTextureKey } from './productArt'
import { type WorldCamera, worldToScreen } from './worldCamera'

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
  interactive?: boolean
}

const WIDTH = 70
const HEIGHT = 30
const SWAP_TAG = 34
const SWAP_HIT = 44
/** Tilt the tool like a working stroke instead of standing straight up. */
const TAG_TILT = Math.PI / 4

function isSwapTag(
  offer: PurchaseOffer,
): offer is Extract<PurchaseOffer, { type: 'swap' | 'producerSwap' }> {
  return offer.type === 'swap' || offer.type === 'producerSwap'
}

function isSlotTag(
  offer: PurchaseOffer,
): offer is Extract<PurchaseOffer, { type: 'producerSlot' | 'producerSwap' }> {
  return offer.type === 'producerSlot' || offer.type === 'producerSwap'
}

export class MapOffers {
  private readonly scene: Phaser.Scene
  private readonly layout: GameLayout
  private readonly camera: WorldCamera
  private readonly theme: Theme
  private readonly onSlotTap: (zone: ZoneId, slot: number) => void
  private readonly labels = new Map<string, OfferLabel>()
  private stillSince = 0
  private tagAlpha = 0

  constructor(
    scene: Phaser.Scene,
    layout: GameLayout,
    camera: WorldCamera,
    theme: Theme,
    onSlotTap: (zone: ZoneId, slot: number) => void,
  ) {
    this.scene = scene
    this.layout = layout
    this.camera = camera
    this.theme = theme
    this.onSlotTap = onSlotTap
  }

  update(state: ShopState): void {
    // Swap tags are a low-frequency action, so they only appear after the
    // player has stopped: walking through the fields never flashes a chip.
    const now = this.scene.time.now
    if (state.player.moving) this.stillSince = 0
    else if (this.stillSince === 0) this.stillSince = now
    const stillFor = this.stillSince === 0 ? 0 : now - this.stillSince
    this.tagAlpha = Math.max(0, Math.min(1, (stillFor - 250) / 150))
    // Empty beds always advertise their starting price: otherwise a new player
    // sees bare soil and never learns the field is plantable. Everything else
    // stays distance-gated so the shop does not turn into confetti.
    const offers = mapOffers(state)
      .filter((offer) => {
        if (offer.type === 'zone') return true
        if (offer.type === 'plant' && offer.requiresChoice) return true
        const range = offer.type === 'staff' ? 210 : isSwapTag(offer) ? 130 : 165
        return distance(state.player.pos, offer.pos) <= range
      })
      .filter((offer) => this.onScreen(offer.pos))
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

  /**
   * The zoomed camera can push a zone or bed label past the screen edge.
   * Clamping those chips to the border leaves ghost prices floating over the
   * world, so only offers whose anchor is near the viewport are drawn.
   */
  private onScreen(point: Vec2): boolean {
    const screen = worldToScreen(this.camera, point)
    const content = this.layout.content
    const margin = 48 * this.layout.ui
    return (
      screen.x >= content.x - margin &&
      screen.x <= content.x + content.w + margin &&
      screen.y >= content.y - margin &&
      screen.y <= content.y + content.h + margin
    )
  }

  destroy(): void {
    for (const label of this.labels.values()) label.container.destroy(true)
    this.labels.clear()
  }

  private createLabel(): OfferLabel {
    // Offers are screen-space chips anchored to world points, so they follow
    // the camera zoom. Without that, price tags would shrink relative to the
    // enlarged beds and become too small to tap.
    const ui = this.layout.worldUi
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
    // The label is the most obvious thing to tap, so it mirrors the slot tap.
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
    const point = worldToScreen(this.camera, offer.pos)
    const ui = this.layout.worldUi
    const gap = distance(state.player.pos, offer.pos)
    const near = gap <= 165
    const tag = isSwapTag(offer)
    // Swap tags fade over the last 35 units instead of popping over the crop
    // or machine when the player walks past. The list filter stops at 130.
    const distanceFade = tag ? Math.max(0, Math.min(1, (130 - gap) / 35)) : 1
    const fade = tag ? distanceFade * this.tagAlpha : 1
    // Far-away empty beds shrink to a price sticker sitting on the soil, so a
    // new player still sees "plantable" without six full chips fighting the
    // zone header. Selecting one expands it into the normal label.
    const compact = offer.type === 'plant' && offer.requiresChoice && !near
    // Four-digit zone prices need a little more room than product offers.
    const width = (tag ? SWAP_TAG : offer.type === 'zone' ? WIDTH + 14 : compact ? 44 : WIDTH) * ui
    const height = (tag ? SWAP_TAG : compact ? 20 : HEIGHT) * ui
    // Crop labels sit above the canopy, not inside it. Animal/station labels
    // hug the fixture base so they do not cover the animal or machine.
    const compactLift = offer.type === 'plant' && offer.zone === 'fruit' ? 10 : 4
    const lift =
      (compact
        ? compactLift
        : tag
          ? offer.type === 'swap'
            ? PLOT_SIZE.h / 2 + 6
            : -((offer.zone === 'farm' ? PEN_SIZE.h : STATION_SIZE.h) / 2 + 34)
          : isSlotTag(offer)
            ? -((offer.zone === 'farm' ? PEN_SIZE.h : STATION_SIZE.h) / 2 + 34)
            : offer.type === 'plant'
              ? 22
              : this.layout.portrait
                ? 58
                : 24) * this.camera.scale
    const content = this.layout.content
    const tagX = isSlotTag(offer)
      ? ((offer.zone === 'farm' ? PEN_SIZE.w : STATION_SIZE.w) / 2 - 10) * this.camera.scale
      : 0
    const x = Math.max(
      content.x + width / 2 + 8 * ui,
      Math.min(content.x + content.w - width / 2 - 8 * ui, point.x + tagX),
    )
    const y = Math.max(
      content.y + height / 2 + 8 * ui,
      Math.min(content.y + content.h - height / 2 - 8 * ui, point.y - lift - 16 * ui),
    )
    label.container.setPosition(x, y)
    label.container.setAlpha(fade)
    // Only the tool badge is a target on an occupied slot, never the whole
    // card; the chip body sits over the crop and a stray tap there must not
    // open a paid chooser.
    if (tag) {
      label.hit.setSize(SWAP_HIT * ui, SWAP_HIT * ui)
    } else {
      label.hit.setSize(
        width + INTERACTION.labelHitPadding * 2 * ui,
        height + INTERACTION.labelHitPadding * 2 * ui,
      )
    }
    if (tag) {
      const interactive = fade >= 0.35
      if (label.interactive !== interactive) {
        label.interactive = interactive
        if (interactive) label.hit.setInteractive({ useHandCursor: true })
        else label.hit.disableInteractive()
      }
    }
    label.action =
      isSwapTag(offer) ||
      (offer.type === 'plant' && offer.requiresChoice) ||
      offer.type === 'producerSlot'
        ? () => this.onSlotTap(offer.zone, offer.slot)
        : undefined

    const affordable = isSwapTag(offer) ? true : state.coins >= offer.remaining
    label.bg.clear()
    if (tag) {
      // A single round badge: the crop or machine is already visible on the
      // slot, so a full chip would only repeat it.
      label.bg.fillStyle(this.theme.shadow, 0.16)
      label.bg.fillCircle(0, 3 * ui, (SWAP_TAG / 2) * ui)
      label.bg.fillStyle(this.theme.panel, 0.96)
      label.bg.fillCircle(0, 0, (SWAP_TAG / 2) * ui)
      label.bg.lineStyle(2 * ui, gameColors.barkDark, 0.8)
      label.bg.strokeCircle(0, 0, (SWAP_TAG / 2) * ui)
    } else {
      label.bg.fillStyle(this.theme.shadow, 0.16)
      label.bg.fillRoundedRect(-width / 2, -height / 2 + 3 * ui, width, height, 11 * ui)
      label.bg.fillStyle(this.theme.panel, 0.96)
      label.bg.fillRoundedRect(-width / 2, -height / 2, width, height, 11 * ui)
      label.bg.lineStyle(2 * ui, affordable ? this.theme.accent : this.theme.borderSoft, 0.9)
      label.bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 11 * ui)
    }

    label.icon.setVisible(
      (offer.type === 'plant' && !offer.requiresChoice) || offer.type === 'staff',
    )
    label.badge.setVisible(
      (offer.type === 'plant' && offer.requiresChoice && !compact) ||
        offer.type === 'zone' ||
        tag ||
        offer.type === 'producerSlot',
    )
    label.badge.clear()
    label.badge.setRotation(tag ? TAG_TILT : 0)
    if (offer.type === 'plant' && offer.requiresChoice) {
      drawSeedPacket(label.badge, -22 * ui, 0, ui)
    }
    if (offer.type === 'zone') {
      drawLockBadge(label.badge, -22 * ui, 0, ui)
    }
    if (offer.type === 'swap') {
      drawShovelBadge(label.badge, 0, 0, 1 * ui)
    }
    if (offer.type === 'producerSwap') {
      if (offer.zone === 'farm') drawPitchforkBadge(label.badge, 0, 0, 1 * ui)
      else drawWrenchBadge(label.badge, 0, 0, 1 * ui)
    }
    if (offer.type === 'producerSlot') {
      drawPlusBadge(label.badge, -22 * ui, 0, ui)
    }
    // A soft pulse marks the tool badge as the actionable part of an occupied
    // slot, without adding another text label over the art.
    const pulse = tag && near ? 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(this.scene.time.now / 240)) : 1
    label.badge.setAlpha(pulse)
    if (offer.type === 'plant' && !offer.requiresChoice) {
      label.icon
        .setTexture(productTextureKey(offer.product))
        .setPosition(-22 * ui, 0)
        .setScale(0.46 * ui)
    }
    if (offer.type === 'staff') {
      label.icon
        .setVisible(true)
        .setTexture(animalTextureKey(STAFF[offer.kind].species))
        .setPosition(-22 * ui, 1 * ui)
        .setScale(0.21 * ui * ANIMAL_SCALE)
    }

    const showPrice = !tag
    label.coin.setVisible(showPrice)
    label.price.setVisible(showPrice)
    if (compact) {
      label.coin.setPosition(-13 * ui, 0).setScale(0.32 * ui)
      label.price.setPosition(-2 * ui, 0).setFontSize(11 * ui)
    } else {
      label.coin.setPosition(-3 * ui, 0).setScale(0.42 * ui)
      label.price.setPosition(7 * ui, 0).setFontSize(13 * ui)
    }
    label.price.setText(isSwapTag(offer) ? '' : String(offer.remaining))
    label.price.setColor(affordable ? this.theme.text : this.theme.textMuted)

    label.paid.clear()
    if (offer.type !== 'swap' && offer.type !== 'producerSwap' && offer.deposit > 0) {
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

function drawShovelBadge(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
): void {
  const s = scale
  const ink = 0x3b2f3a
  const blade = 0x5fbf9f
  // Handle and T-grip.
  g.lineStyle(3 * s, ink, 1)
  g.beginPath()
  g.moveTo(x, y - 11 * s)
  g.lineTo(x, y + s)
  g.strokePath()
  g.beginPath()
  g.moveTo(x - 5 * s, y - 11 * s)
  g.lineTo(x + 5 * s, y - 11 * s)
  g.strokePath()
  // Spade blade: a flat top with a rounded point, so it reads as a shovel and
  // not as an arrow at 34 px.
  g.fillStyle(blade, 1)
  g.beginPath()
  g.moveTo(x - 5.5 * s, y + 1 * s)
  g.lineTo(x + 5.5 * s, y + 1 * s)
  g.lineTo(x + 4.5 * s, y + 7 * s)
  g.lineTo(x, y + 11.5 * s)
  g.lineTo(x - 4.5 * s, y + 7 * s)
  g.closePath()
  g.fillPath()
  g.lineStyle(1.4 * s, ink, 0.85)
  g.beginPath()
  g.moveTo(x - 5.5 * s, y + 1 * s)
  g.lineTo(x + 5.5 * s, y + 1 * s)
  g.strokePath()
}

function drawPitchforkBadge(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
): void {
  const s = scale
  const ink = 0x3b2f3a
  const metal = 0x4f5a5f
  // Wooden handle, deliberately thicker than the tines so the tool reads at
  // 34 px instead of collapsing into a thin line.
  g.lineStyle(4.2 * s, 0x8f5734, 1)
  g.beginPath()
  g.moveTo(x, y + 12 * s)
  g.lineTo(x, y + 1 * s)
  g.strokePath()
  g.lineStyle(1.4 * s, ink, 0.65)
  g.beginPath()
  g.moveTo(x, y + 12 * s)
  g.lineTo(x, y + 1 * s)
  g.strokePath()
  // Crossbar and three tines.
  g.lineStyle(3.4 * s, metal, 1)
  g.beginPath()
  g.moveTo(x - 9 * s, y)
  g.lineTo(x + 9 * s, y)
  g.strokePath()
  for (const offset of [-8, 0, 8]) {
    g.lineStyle(3.2 * s, metal, 1)
    g.beginPath()
    g.moveTo(x + offset * s, y)
    g.lineTo(x + offset * s, y - 13 * s)
    g.strokePath()
  }
  // Dark tips keep the fork silhouette crisp against the cream badge.
  g.fillStyle(ink, 1)
  for (const offset of [-8, 0, 8]) {
    g.fillTriangle(
      x + (offset - 2) * s,
      y - 13 * s,
      x + (offset + 2) * s,
      y - 13 * s,
      x + offset * s,
      y - 16 * s,
    )
  }
}

function drawWrenchBadge(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
): void {
  const s = scale
  const ink = 0x3b2f3a
  // Handle from the lower left to the jaw at the upper right.
  g.lineStyle(4 * s, ink, 1)
  g.beginPath()
  g.moveTo(x - 8 * s, y + 9 * s)
  g.lineTo(x + 5 * s, y - 5 * s)
  g.strokePath()
  // Open-end jaw: an arc with a deliberate gap so it still reads as a wrench.
  g.lineStyle(4 * s, ink, 1)
  g.beginPath()
  g.arc(x + 6 * s, y - 7 * s, 5.5 * s, -0.7, 3.7)
  g.strokePath()
  g.lineStyle(2 * s, 0xfff7e8, 0.9)
  g.beginPath()
  g.moveTo(x - 7 * s, y + 8 * s)
  g.lineTo(x + 4 * s, y - 4 * s)
  g.strokePath()
}

function drawPlusBadge(g: Phaser.GameObjects.Graphics, x: number, y: number, ui: number): void {
  g.lineStyle(3.2 * ui, 0x5fbf9f, 1)
  g.beginPath()
  g.moveTo(x - 7 * ui, y)
  g.lineTo(x + 7 * ui, y)
  g.strokePath()
  g.beginPath()
  g.moveTo(x, y - 7 * ui)
  g.lineTo(x, y + 7 * ui)
  g.strokePath()
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
