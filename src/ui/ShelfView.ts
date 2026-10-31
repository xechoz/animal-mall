import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { gameColors } from '../colors'
import { ZONE_PRODUCTS } from '../logic/config'
import type { ProductKind, ShelfState, ShopMap, ZoneId } from '../logic/types'
import { productTextureKey } from './productArt'

export class ShelfView extends Phaser.GameObjects.Container {
  private readonly icons: Phaser.GameObjects.Image[] = []
  private readonly counts: Phaser.GameObjects.Text[] = []
  private readonly lockOverlay: Phaser.GameObjects.Container
  private readonly showLock: boolean
  private readonly countText: Phaser.GameObjects.Text
  private readonly slotCount: number
  private bins: (ProductKind | null)[]
  private lastKey = ''

  constructor(scene: Phaser.Scene, theme: Theme, zone: ZoneId, map: ShopMap) {
    const rect = map.shelves[zone]
    super(scene, rect.x + rect.w / 2, rect.y + rect.h / 2)
    const width = rect.w
    const height = rect.h
    const products = ZONE_PRODUCTS[zone]
    this.slotCount = zone === 'fruit' || zone === 'veg' ? 4 : products.length
    this.bins =
      zone === 'fruit' || zone === 'veg'
        ? Array<ProductKind | null>(this.slotCount).fill(null)
        : [...products]
    this.showLock = map.id !== 'landscape'
    const gap = 5
    const pad = 8
    const binWidth = (width - pad * 2 - gap * (this.slotCount - 1)) / this.slotCount

    const g = scene.add.graphics()
    g.fillStyle(0x3b2f3a, 0.16)
    g.fillRoundedRect(-width / 2, -height / 2 + 7, width, height, 8)
    g.fillStyle(gameColors.woodDark, 1)
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
    g.fillStyle(gameColors.wood, 1)
    g.fillRoundedRect(-width / 2 + 4, -height / 2 + 3, width - 8, height - 8, 5)
    g.fillStyle(0x7b4f33, 1)
    g.fillRoundedRect(-width / 2 + 7, -height / 2 + 24, width - 14, 4, 2)
    this.add(g)

    for (let index = 0; index < this.slotCount; index += 1) {
      const product = this.bins[index]
      const x = -width / 2 + pad + index * (binWidth + gap) + binWidth / 2
      const bin = scene.add.graphics()
      bin.fillStyle(0xfff7e8, 0.18)
      bin.fillRoundedRect(x - binWidth / 2, -height / 2 + 6, binWidth, height - 12, 5)
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
        .text(x + binWidth / 2 - 6, -height / 2 + 15, '', textStyle(theme, 10, '#fff7e8', true))
        .setOrigin(1, 0.5)
      this.add(count)
      this.counts.push(count)
    }

    this.countText = scene.add
      .text(width / 2 - 7, height / 2 - 10, '', textStyle(theme, 9, '#fff7e8', true))
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

    scene.add.existing(this)
  }

  updateShelf(shelf: ShelfState): void {
    if (shelf.zone === 'fruit' || shelf.zone === 'veg') {
      const planted = ZONE_PRODUCTS[shelf.zone].filter((product) => shelf.bins[product])
      this.bins = Array.from({ length: this.slotCount }, (_, index) => planted[index] ?? null)
    }
    const stockKey = this.bins
      .map((product) =>
        product === null
          ? '-'
          : `${product}:${shelf.stock[product]}:${shelf.bins[product] ? 1 : 0}`,
      )
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
      const unlocked = shelf.active && shelf.bins[product]
      icon
        .setTexture(productTextureKey(product))
        .setVisible(true)
        .setAlpha(unlocked ? 1 : 0.35)
      this.counts[index]?.setText(
        unlocked && shelf.stock[product] > 0 ? String(shelf.stock[product]) : '',
      )
    })
    const total = this.bins.reduce(
      (sum, product) => sum + (product === null ? 0 : shelf.stock[product]),
      0,
    )
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
