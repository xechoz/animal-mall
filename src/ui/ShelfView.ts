import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { gameColors } from '../colors'
import { INTERACTION, plantSlotCount, ZONE_PRODUCTS } from '../logic/config'
import type { ProductKind, ShelfState, ShopMap, Vec2, ZoneId } from '../logic/types'
import { bakeLayer } from './bakeArt'
import { productTextureKey } from './productArt'
import { addPropShadow, drawLeg, PROP_TOP_SCALE, SHELF_HEIGHT } from './propArt'

/** On-screen size of a shelf basket icon, shared with the stock flight. */
export const SHELF_ICON_SCALE = 0.42

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
  private upgradeAffordable = true
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
    bakeScale: number,
    onUpgrade: () => void,
  ) {
    const rect = map.shelves[zone]
    super(scene, rect.x + rect.w / 2, rect.y + rect.h / 2)
    const width = rect.w
    const height = rect.h
    const products = ZONE_PRODUCTS[zone]
    this.slotCount =
      zone === 'fruit' || zone === 'veg'
        ? plantSlotCount(zone)
        : zone === 'farm'
          ? map.animalPens.length
          : map.stationSlots.length
    this.bins = Array<ProductKind | null>(this.slotCount).fill(null)
    this.showLock = map.id !== 'landscape'
    const gap = 5
    const pad = 8
    const binWidth = (width - pad * 2 - gap * (this.slotCount - 1)) / this.slotCount
    const floorY = height / 2
    const frontFaceTop = floorY - SHELF_HEIGHT
    const topDepth = height * PROP_TOP_SCALE
    const top = frontFaceTop - topDepth

    addPropShadow(scene, this, { width: width + 18, height: height + 14, alpha: 0.14 })

    this.reachGlow = scene.add.graphics()
    this.reachGlow.fillStyle(0xfff3dd, 0.14)
    this.reachGlow.fillRoundedRect(-width / 2 - 12, -height / 2 - 12, width + 24, height + 24, 14)
    this.reachGlow.lineStyle(3, gameColors.cream, 0.55)
    this.reachGlow.strokeRoundedRect(-width / 2 - 12, -height / 2 - 12, width + 24, height + 24, 14)
    this.reachGlow.setAlpha(0).setVisible(false)
    this.add(this.reachGlow)

    const g = scene.add.graphics()
    // Market stall: a thin top board on two front legs and an apron. The open
    // space between the legs is what keeps it from reading as a solid block.
    const legTop = frontFaceTop - 6
    const legW = 8
    const leftLeg = -width / 2 + 10
    const rightLeg = width / 2 - 10 - legW
    drawLeg(g, {
      x: leftLeg,
      y: legTop,
      w: legW,
      h: floorY - legTop,
      color: gameColors.woodLight,
      edge: 0xd9a066,
    })
    drawLeg(g, {
      x: rightLeg,
      y: legTop,
      w: legW,
      h: floorY - legTop,
      color: gameColors.woodLight,
      edge: 0xd9a066,
    })
    g.fillStyle(gameColors.wood, 1)
    g.fillRoundedRect(leftLeg + legW, floorY - 9, rightLeg - leftLeg - legW, 9, 2)
    g.fillStyle(0xb07a4a, 1)
    g.fillRoundedRect(leftLeg + legW + 2, floorY - 8, rightLeg - leftLeg - legW - 4, 2, 1)
    g.fillStyle(0x3b2f3a, 0.85)
    g.fillRoundedRect(leftLeg - 1, floorY - 2, legW + 2, 3, 1)
    g.fillRoundedRect(rightLeg - 1, floorY - 2, legW + 2, 3, 1)

    // Foreshortened top board, its front edge and a shaded right side.
    g.fillStyle(gameColors.wood, 1)
    g.fillRoundedRect(-width / 2, top, width, topDepth, 9)
    g.fillStyle(gameColors.woodLight, 0.75)
    g.fillRoundedRect(-width / 2 + 4, top + 4, width - 8, 5, 3)
    g.fillStyle(0x1a120c, 0.14)
    g.fillRect(width / 2 - 5, top + 5, 5, topDepth - 10)
    g.fillStyle(gameColors.woodDark, 1)
    g.fillRoundedRect(-width / 2, frontFaceTop - 6, width, 6, 3)
    g.fillStyle(0xb07a4a, 1)
    g.fillRoundedRect(-width / 2 + 2, frontFaceTop - 5, width - 4, 2, 1)

    // Moss and a short vine keep the stall tied to the forest clearing.
    g.fillStyle(gameColors.moss, 0.7)
    g.fillEllipse(-width / 2 + 16, top + 1, 16, 5)
    g.fillEllipse(width / 2 - 18, top + 2, 14, 5)
    g.lineStyle(1.4, gameColors.mossDark, 0.65)
    for (let x = -width / 2 + 14; x < width / 2 - 12; x += 22) {
      g.lineBetween(x, top + 9, x + 8, top + 7)
      g.fillStyle(gameColors.fern, 0.7)
      g.fillEllipse(x + 8, top + 7, 5, 2.4)
    }
    this.add(g)

    for (let index = 0; index < this.slotCount; index += 1) {
      const product = this.bins[index]
      const x = -width / 2 + pad + index * (binWidth + gap) + binWidth / 2
      // Wicker produce basket instead of a flat white slot. It shares the shelf
      // body's Graphics so the whole stall bakes into one texture.
      const basketTop = top + 5
      const basketH = topDepth - 10
      g.fillStyle(0x3b2f3a, 0.12)
      g.fillRoundedRect(x - binWidth / 2, basketTop + 2, binWidth, basketH, 5)
      g.fillStyle(0xe4cfa9, 0.55)
      g.fillRoundedRect(x - binWidth / 2, basketTop, binWidth, basketH, 5)
      g.fillStyle(0xf0dcb8, 0.6)
      g.fillRoundedRect(x - binWidth / 2 + 2, basketTop + 1, binWidth - 4, 5, 3)
      g.lineStyle(1, 0x8f6b45, 0.3)
      for (let row = 1; row < 3; row += 1) {
        g.lineBetween(
          x - binWidth / 2 + 3,
          basketTop + row * 5,
          x + binWidth / 2 - 3,
          basketTop + row * 5,
        )
      }

      const iconY = top + topDepth * 0.42
      const icon = scene.add
        .image(
          x - binWidth / 2 + 14,
          iconY,
          productTextureKey(product ?? (products[0] as ProductKind)),
        )
        .setScale(SHELF_ICON_SCALE)
        .setVisible(product !== null)
      this.add(icon)
      this.icons.push(icon)

      const count = scene.add
        .text(x + binWidth / 2 - 6, iconY, '', textStyle(theme, 10 * textScale, '#fff7e8', true))
        .setOrigin(1, 0.5)
      this.add(count)
      this.counts.push(count)
    }

    this.countText = scene.add
      .text(
        width / 2 - 7,
        top + topDepth - 10,
        '',
        textStyle(theme, 9 * textScale, '#fff7e8', true),
      )
      .setOrigin(1, 0.5)
    this.add(this.countText)

    // The stall body never changes after this point, so it is baked into one
    // quad instead of being re-tessellated from ~1600 commands every frame.
    const baked = bakeLayer(
      scene,
      g,
      `shelf-${map.id}-${zone}`,
      { x: -width / 2 - 10, y: top - 10 },
      width + 20,
      floorY + 10 - (top - 10),
      bakeScale,
    )
    const index = this.getIndex(g)
    this.remove(g)
    this.addAt(baked, Math.max(0, index))
    g.destroy()

    this.lockOverlay = scene.add.container(0, 0)
    const lockBg = scene.add.graphics()
    lockBg.fillStyle(0x2f2433, 0.72)
    lockBg.fillRoundedRect(-width / 2, top, width, topDepth, 8)
    lockBg.fillStyle(0xfff7e8, 0.14)
    lockBg.fillRoundedRect(-width / 2 + 8, top + 6, width - 16, topDepth - 12, 6)
    this.lockOverlay.add(lockBg)
    drawLock(this.lockOverlay, scene, top + topDepth / 2)
    this.add(this.lockOverlay)

    this.onUpgrade = onUpgrade
    this.upgradeBaseY = top - 16
    this.upgrade = scene.add.container(width / 2 - 42, this.upgradeBaseY)
    const upgradeBg = scene.add.graphics()
    // A wooden price tag instead of a bright yellow UI capsule. The paper face
    // keeps the number readable; the bark rim ties it to the market signs.
    upgradeBg.fillStyle(0x1a120c, 0.22)
    upgradeBg.fillRoundedRect(-42, -10, 84, 27, 10)
    upgradeBg.fillStyle(gameColors.barkDark, 1)
    upgradeBg.fillRoundedRect(-42, -13, 84, 27, 10)
    upgradeBg.fillStyle(0xf0d08a, 1)
    upgradeBg.fillRoundedRect(-39, -10, 78, 21, 7)
    upgradeBg.lineStyle(1.5, 0x8f6b45, 0.55)
    upgradeBg.strokeRoundedRect(-39, -10, 78, 21, 7)
    upgradeBg.fillStyle(0xfff3dd, 0.55)
    upgradeBg.fillRoundedRect(-33, -8, 66, 2, 1)
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
  setUpgrade(cost: number | null, affordable = true): void {
    if (cost === this.upgradeCost && affordable === this.upgradeAffordable) return
    this.upgradeCost = cost
    this.upgradeAffordable = affordable
    this.scene.tweens.killTweensOf(this.upgrade)
    if (cost === null) {
      this.upgrade.setVisible(false)
      this.upgradeHit.disableInteractive()
      return
    }
    this.upgradePrice.setText(String(cost))
    // Keep the price visible when the player cannot pay yet: hiding it removed
    // the only clue that the shelf can be upgraded at all.
    this.upgrade
      .setVisible(true)
      .setY(this.upgradeBaseY)
      .setAlpha(affordable ? 1 : 0.62)
    this.upgradeHit.setInteractive({ useHandCursor: true })
    if (!affordable) {
      this.upgrade.setY(this.upgradeBaseY)
      return
    }
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

  /** World position of a product's basket icon, or null when it has no bin. */
  binPoint(product: ProductKind): Vec2 | null {
    const index = this.bins.indexOf(product)
    const icon = this.icons[index]
    if (icon === undefined) return null
    return { x: this.x + icon.x, y: this.y + icon.y }
  }

  /** A short hop so the basket acknowledges the goods that just landed in it. */
  popBin(product: ProductKind): void {
    const index = this.bins.indexOf(product)
    const icon = this.icons[index]
    if (index < 0 || icon === undefined) return
    const count = this.counts[index]
    this.scene.tweens.killTweensOf(icon)
    icon.setScale(SHELF_ICON_SCALE * 1.5)
    this.scene.tweens.add({
      targets: icon,
      scale: SHELF_ICON_SCALE,
      duration: 200,
      ease: 'Back.easeOut',
    })
    if (count === undefined) return
    this.scene.tweens.killTweensOf(count)
    count.setScale(1.4)
    this.scene.tweens.add({ targets: count, scale: 1, duration: 220, ease: 'Back.easeOut' })
  }

  updateShelf(shelf: ShelfState): void {
    const products = ZONE_PRODUCTS[shelf.zone]
    const installed = products.filter((product) => shelf.bins[product])
    // Clearance stock from a swapped crop, animal or machine still gets a
    // visible basket until it sells out.
    const leftover = products.filter((product) => !shelf.bins[product] && shelf.stock[product] > 0)
    const shown = [...installed, ...leftover]
    this.bins = Array.from({ length: this.slotCount }, (_, index) => shown[index] ?? null)
    const stockKey = products
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

function drawLock(container: Phaser.GameObjects.Container, scene: Phaser.Scene, y = 0): void {
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
  lock.setY(y)
  container.add(lock)
}
