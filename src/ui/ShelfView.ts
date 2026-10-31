import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { gameColors } from '../colors'
import { INTERACTION, ZONE_PRODUCTS } from '../logic/config'
import type { ProductKind, ShelfState, ShopMap, ZoneId } from '../logic/types'
import { productTextureKey } from './productArt'

export class ShelfView extends Phaser.GameObjects.Container {
  private readonly icons: Phaser.GameObjects.Image[] = []
  private readonly counts: Phaser.GameObjects.Text[] = []
  private readonly lockOverlay: Phaser.GameObjects.Container
  private readonly showLock: boolean
  private readonly reachGlow: Phaser.GameObjects.Graphics
  private reachOn = false
  private readonly countText: Phaser.GameObjects.Text
  private readonly slotCount: number
  private readonly upgrade: Phaser.GameObjects.Container
  private readonly upgradePrice: Phaser.GameObjects.Text
  private readonly upgradeHit: Phaser.GameObjects.Zone
  private readonly upgradeBaseY: number
  private readonly onUpgrade: () => void
  private upgradeCost: number | null = null
  private upgradeDownX?: number
  private upgradeDownY?: number
  private bins: (ProductKind | null)[]
  private lastKey = ''

  constructor(
    scene: Phaser.Scene,
    theme: Theme,
    zone: ZoneId,
    map: ShopMap,
    textScale: number,
    onUpgrade: () => void,
  ) {
    const rect = map.shelves[zone]
    super(scene, rect.x + rect.w / 2, rect.y + rect.h / 2)
    const width = rect.w
    const height = rect.h
    const products = ZONE_PRODUCTS[zone]
    this.slotCount = products.length
    this.bins =
      zone === 'fruit' || zone === 'veg'
        ? Array<ProductKind | null>(this.slotCount).fill(null)
        : [...products]
    this.showLock = map.id !== 'landscape'
    const gap = 5
    const pad = 8
    const binWidth = (width - pad * 2 - gap * (this.slotCount - 1)) / this.slotCount

    this.reachGlow = scene.add.graphics()
    this.reachGlow.fillStyle(0xfff3dd, 0.12)
    this.reachGlow.fillRoundedRect(-width / 2 - 8, -height / 2 - 8, width + 16, height + 16, 12)
    this.reachGlow.lineStyle(3, gameColors.cream, 0.5)
    this.reachGlow.strokeRoundedRect(-width / 2 - 8, -height / 2 - 8, width + 16, height + 16, 12)
    this.reachGlow.setAlpha(0).setVisible(false)
    this.add(this.reachGlow)

    const g = scene.add.graphics()
    // Market-stall shelf: dark frame, curved top rail, wood grain and feet.
    g.fillStyle(0x3b2f3a, 0.18)
    g.fillRoundedRect(-width / 2, -height / 2 + 7, width, height, 9)
    g.fillStyle(gameColors.woodDark, 1)
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 9)
    g.fillStyle(gameColors.wood, 1)
    g.fillRoundedRect(-width / 2 + 4, -height / 2 + 3, width - 8, height - 9, 6)
    g.fillStyle(0xb07a4a, 1)
    g.fillRoundedRect(-width / 2 + 7, -height / 2 + 4, width - 14, 7, 4)
    g.fillStyle(0xfff3dd, 0.22)
    g.fillRoundedRect(-width / 2 + 10, -height / 2 + 5, width - 20, 2, 1)
    g.lineStyle(1, 0x7b4f33, 0.22)
    for (let index = 0; index < 3; index += 1) {
      const grainY = -height / 2 + 16 + index * 8
      g.lineBetween(-width / 2 + 12, grainY, width / 2 - 12, grainY)
    }
    // Small corner brackets make it read as a built shelf, not a floating box.
    g.fillStyle(gameColors.woodDark, 1)
    g.fillRoundedRect(-width / 2 + 7, height / 2 - 3, 12, 6, 2)
    g.fillRoundedRect(width / 2 - 19, height / 2 - 3, 12, 6, 2)
    this.add(g)

    for (let index = 0; index < this.slotCount; index += 1) {
      const product = this.bins[index]
      const x = -width / 2 + pad + index * (binWidth + gap) + binWidth / 2
      const bin = scene.add.graphics()
      // Wicker produce basket instead of a flat white slot.
      bin.fillStyle(0x3b2f3a, 0.12)
      bin.fillRoundedRect(x - binWidth / 2, -height / 2 + 8, binWidth, height - 12, 5)
      bin.fillStyle(0xe4cfa9, 0.55)
      bin.fillRoundedRect(x - binWidth / 2, -height / 2 + 6, binWidth, height - 13, 5)
      bin.fillStyle(0xf0dcb8, 0.6)
      bin.fillRoundedRect(x - binWidth / 2 + 2, -height / 2 + 7, binWidth - 4, 6, 3)
      bin.lineStyle(1, 0x8f6b45, 0.3)
      for (let row = 1; row < 3; row += 1) {
        bin.lineBetween(
          x - binWidth / 2 + 3,
          -height / 2 + 8 + row * 6,
          x + binWidth / 2 - 3,
          -height / 2 + 8 + row * 6,
        )
      }
      this.add(bin)

      const icon = scene.add
        .image(
          x - binWidth / 2 + 14,
          -height / 2 + 15,
          productTextureKey(product ?? (products[0] as ProductKind)),
        )
        .setScale(0.42)
        .setVisible(product !== null)
      this.add(icon)
      this.icons.push(icon)

      const count = scene.add
        .text(
          x + binWidth / 2 - 6,
          -height / 2 + 15,
          '',
          textStyle(theme, 10 * textScale, '#fff7e8', true),
        )
        .setOrigin(1, 0.5)
      this.add(count)
      this.counts.push(count)
    }

    this.countText = scene.add
      .text(width / 2 - 7, height / 2 - 10, '', textStyle(theme, 9 * textScale, '#fff7e8', true))
      .setOrigin(1, 0.5)
    this.add(this.countText)

    this.lockOverlay = scene.add.container(0, 0)
    const lockBg = scene.add.graphics()
    lockBg.fillStyle(0x2f2433, 0.72)
    lockBg.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
    lockBg.fillStyle(0xfff7e8, 0.14)
    lockBg.fillRoundedRect(-width / 2 + 8, -height / 2 + 9, width - 16, height - 18, 6)
    this.lockOverlay.add(lockBg)
    drawLock(this.lockOverlay, scene)
    this.add(this.lockOverlay)

    this.onUpgrade = onUpgrade
    this.upgradeBaseY = -height / 2 - 16
    this.upgrade = scene.add.container(width / 2 - 42, this.upgradeBaseY)
    const upgradeBg = scene.add.graphics()
    upgradeBg.fillStyle(0x2f2433, 0.18)
    upgradeBg.fillRoundedRect(-42, -11, 84, 26, 13)
    upgradeBg.fillStyle(0xffd166, 1)
    upgradeBg.fillRoundedRect(-42, -13, 84, 26, 13)
    upgradeBg.lineStyle(2, 0xfff7e8, 0.85)
    upgradeBg.strokeRoundedRect(-42, -13, 84, 26, 13)
    upgradeBg.fillStyle(0x5a3f28, 0.9)
    upgradeBg.fillTriangle(-25, -6, -17, -6, -21, 1)
    upgradeBg.fillRoundedRect(-23, -1, 5, 9, 2)
    this.upgrade.add(upgradeBg)
    this.upgradePrice = scene.add
      .text(8, 0, '', textStyle(theme, 12 * textScale, '#4b3828', true))
      .setOrigin(0.5)
    this.upgrade.add(this.upgradePrice)
    this.upgradeHit = scene.add.zone(0, 0, 96, 34)
    this.upgradeHit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.upgradeDownX = pointer.x
      this.upgradeDownY = pointer.y
    })
    this.upgradeHit.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const startX = this.upgradeDownX
      const startY = this.upgradeDownY
      this.upgradeDownX = undefined
      this.upgradeDownY = undefined
      if (startX === undefined || startY === undefined) return
      if (Math.hypot(pointer.x - startX, pointer.y - startY) > INTERACTION.tapSlop) return
      this.onUpgrade()
    })
    this.upgradeHit.on('pointerout', () => {
      this.upgradeDownX = undefined
      this.upgradeDownY = undefined
    })
    this.upgrade.add(this.upgradeHit)
    this.upgrade.setVisible(false)
    this.add(this.upgrade)

    scene.add.existing(this)
  }

  /**
   * Shows a tap-to-buy arrow above this shelf while the next level is
   * affordable. Each zone owns its own shelf level.
   */
  setUpgrade(cost: number | null): void {
    if (cost === this.upgradeCost) return
    this.upgradeCost = cost
    this.scene.tweens.killTweensOf(this.upgrade)
    if (cost === null) {
      this.upgrade.setVisible(false)
      this.upgradeHit.disableInteractive()
      return
    }
    this.upgradePrice.setText(String(cost))
    this.upgrade.setVisible(true).setY(this.upgradeBaseY)
    this.upgradeHit.setInteractive({ useHandCursor: true })
    this.scene.tweens.add({
      targets: this.upgrade,
      y: this.upgradeBaseY - 3,
      duration: 680,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  /** Soft outline while the player can stock here. Kept faint on purpose. */
  setReach(on: boolean): void {
    if (on === this.reachOn) return
    this.reachOn = on
    this.scene.tweens.killTweensOf(this.reachGlow)
    if (on) this.reachGlow.setVisible(true)
    this.scene.tweens.add({
      targets: this.reachGlow,
      alpha: on ? 1 : 0,
      duration: on ? 140 : 80,
      onComplete: () => {
        if (!this.reachOn) this.reachGlow.setVisible(false)
      },
    })
  }

  updateShelf(shelf: ShelfState): void {
    if (shelf.zone === 'fruit' || shelf.zone === 'veg') {
      const products = ZONE_PRODUCTS[shelf.zone]
      const planted = products.filter((product) => shelf.bins[product])
      // Clearance stock from a swapped crop still gets a visible basket.
      const leftover = products.filter(
        (product) => !shelf.bins[product] && shelf.stock[product] > 0,
      )
      const shown = [...planted, ...leftover]
      this.bins = Array.from({ length: this.slotCount }, (_, index) => shown[index] ?? null)
    }
    const stockKey = ZONE_PRODUCTS[shelf.zone]
      .map((product) => `${product}:${shelf.stock[product]}:${shelf.bins[product] ? 1 : 0}`)
      .join('|')
    const key = `${shelf.active}-${shelf.capacity}-${stockKey}`
    if (key === this.lastKey) return
    this.lastKey = key

    const wasVisible = this.lockOverlay.visible
    this.lockOverlay.setVisible(this.showLock && !shelf.active)
    this.icons.forEach((icon, index) => {
      const product = this.bins[index]
      if (product === null || product === undefined) {
        icon.setVisible(false)
        this.counts[index]?.setText('')
        return
      }
      const unlocked = shelf.active && (shelf.bins[product] || shelf.stock[product] > 0)
      icon
        .setTexture(productTextureKey(product))
        .setVisible(true)
        .setAlpha(unlocked ? 1 : 0.35)
      this.counts[index]?.setText(
        unlocked && shelf.stock[product] > 0 ? String(shelf.stock[product]) : '',
      )
    })
    const total = ZONE_PRODUCTS[shelf.zone].reduce((sum, product) => sum + shelf.stock[product], 0)
    const capacity = this.slotCount * shelf.capacity
    this.countText.setText(shelf.active && total > 0 ? `${total}/${capacity}` : '')
    if (!shelf.active) return

    if (wasVisible) {
      this.scene.tweens.add({
        targets: this,
        scale: { from: 1.06, to: 1 },
        duration: 220,
        ease: 'Back.easeOut',
      })
    }
  }
}

function drawLock(container: Phaser.GameObjects.Container, scene: Phaser.Scene): void {
  const lock = scene.add.graphics()
  lock.fillStyle(0xffd166, 1)
  lock.fillRoundedRect(-11, -4, 22, 18, 4)
  lock.lineStyle(3, 0xffd166, 1)
  lock.beginPath()
  lock.arc(0, -4, 8, Math.PI, Math.PI * 2)
  lock.strokePath()
  lock.fillStyle(0x2f2433, 1)
  lock.fillCircle(0, 5, 2.5)
  lock.fillRect(-1.5, 5, 3, 5)
  container.add(lock)
}
