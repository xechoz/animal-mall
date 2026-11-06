import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { gameColors } from '../colors'
import { INTERACTION, plantSlotCount, ZONE_PRODUCTS } from '../logic/config'
import type { ProductKind, ShelfState, ShopMap, Vec2, ZoneId } from '../logic/types'
import { bakeLayer } from './bakeArt'
import { productTextureKey } from './productArt'
import {
  addPropShadow,
  type CrateGoods,
  drawAwning,
  drawChalkboard,
  drawCrate,
  drawLeg,
  drawSack,
  PROP_TOP_SCALE,
  SHELF_HEIGHT,
  SHELF_RISER_HEIGHT,
} from './propArt'

/** On-screen size of a shelf basket icon, shared with the stock flight. */
export const SHELF_ICON_SCALE = 0.42

export class ShelfView extends Phaser.GameObjects.Container {
  private readonly icons: Phaser.GameObjects.Image[] = []
  private readonly counts: Phaser.GameObjects.Text[] = []
  private readonly lockOverlay: Phaser.GameObjects.Container
  private readonly showLock: boolean
  private readonly reachGlow: Phaser.GameObjects.Graphics
  private readonly reachRim: Phaser.GameObjects.Graphics
  private reachOn = false
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
    this.reachGlow.fillStyle(0xffd166, 0.08)
    this.reachGlow.fillEllipse(0, height / 2 + 2, width + 28, 30)
    this.reachGlow.lineStyle(2.5, 0xffd166, 0.5)
    this.reachGlow.strokeEllipse(0, height / 2 + 2, width + 28, 30)
    this.reachGlow.lineStyle(1.5, 0xfff3dd, 0.3)
    this.reachGlow.strokeEllipse(0, height / 2 + 2, width + 14, 22)
    this.reachGlow.setAlpha(0).setVisible(false)
    this.add(this.reachGlow)

    const g = scene.add.graphics()
    const riserTop = top - SHELF_RISER_HEIGHT
    const riserX = -width / 2 + 14
    const riserW = width - 28

    // A back riser turns the open stall into a small shop front. It is drawn
    // before the top board, so the baskets stay the front row and the panel
    // reads as the depth behind them.
    g.fillStyle(0x1a120c, 0.16)
    g.fillRoundedRect(riserX + 4, riserTop + 6, riserW, SHELF_RISER_HEIGHT + 4, 6)
    g.fillStyle(gameColors.barkDark, 1)
    g.fillRoundedRect(riserX, riserTop + 2, riserW, SHELF_RISER_HEIGHT + 6, 6)
    g.fillStyle(gameColors.wood, 1)
    g.fillRoundedRect(riserX + 4, riserTop + 6, riserW - 8, SHELF_RISER_HEIGHT - 2, 4)
    g.lineStyle(1, gameColors.bark, 0.3)
    for (let x = riserX + 18; x < riserX + riserW - 8; x += 22) {
      g.lineBetween(x, riserTop + 8, x, riserTop + SHELF_RISER_HEIGHT)
    }
    g.fillStyle(gameColors.barkDark, 1)
    g.fillRoundedRect(riserX + 2, riserTop + 4, 7, SHELF_RISER_HEIGHT + 4, 2)
    g.fillRoundedRect(riserX + riserW - 9, riserTop + 4, 7, SHELF_RISER_HEIGHT + 4, 2)
    const awning: readonly [number, number] =
      zone === 'fruit'
        ? [0x7ac74f, 0xfff3dd]
        : zone === 'veg'
          ? [0x7fae63, 0xfff3dd]
          : zone === 'farm'
            ? [0xd9b25a, 0xfff3dd]
            : [0x8fa6c9, 0xfff3dd]
    drawAwning(g, -width / 2 + 6, riserTop - 4, width - 12, 9, awning)
    drawChalkboard(g, {
      x: -width / 2 + 30,
      y: riserTop + 7,
      w: 48,
      h: 20,
      icon: zone === 'kitchen' ? 'fish' : zone === 'farm' ? 'coin' : 'leaf',
    })
    drawHangingBundle(g, width * 0.16, riserTop + 8, 0.9, 'herb')
    drawHangingBundle(g, width * 0.3, riserTop + 8, 0.72, 'garlic')

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

    // The floor under the counter is used, not empty: a produce crate and a
    // sack make the stall read as a working market stand.
    g.lineStyle(1, gameColors.barkDark, 0.35)
    for (let x = leftLeg + legW + 10; x < rightLeg - 6; x += 26) {
      g.lineBetween(x, floorY - 8, x, floorY - 1)
    }
    const crateGoods: CrateGoods =
      zone === 'fruit' || zone === 'veg' ? 'produce' : zone === 'farm' ? 'bottle' : 'jar'
    drawCrate(g, {
      x: -width / 2 + 48,
      baseY: floorY + 4,
      scale: 0.82,
      goods: crateGoods,
    })
    drawSack(g, width / 2 - 24, floorY + 3, 0.75)
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

    // The stall body never changes after this point, so it is baked into one
    // quad instead of being re-tessellated from ~1600 commands every frame.
    const baked = bakeLayer(
      scene,
      g,
      `shelf-${map.id}-${zone}`,
      { x: -width / 2 - 16, y: riserTop - 16 },
      width + 32,
      floorY + 14 - (riserTop - 16),
      bakeScale,
    )
    const index = this.getIndex(g)
    this.remove(g)
    this.addAt(baked, Math.max(0, index))
    g.destroy()

    // Warm rim along the stall's front lip, shown together with the ground ring.
    this.reachRim = scene.add.graphics()
    const rimY = frontFaceTop - 2
    this.reachRim.lineStyle(2, 0xffd166, 0.5)
    this.reachRim.lineBetween(-width / 2 + 10, rimY, width / 2 - 10, rimY)
    this.reachRim.lineStyle(1.5, 0xfff3dd, 0.32)
    for (const side of [-1, 1]) {
      const x = side * (width / 2 - 12)
      this.reachRim.lineBetween(x, rimY - 6, x, rimY + 2)
    }
    this.reachRim.lineStyle(2, 0xffd166, 0.35)
    this.reachRim.strokeEllipse(0, height / 2 + 8, width * 0.9, 12)
    this.reachRim.setAlpha(0).setVisible(false)
    this.add(this.reachRim)

    this.lockOverlay = scene.add.container(0, 0)
    const lockBg = scene.add.graphics()
    const lockTop = riserTop - 6
    lockBg.fillStyle(0x2f2433, 0.62)
    lockBg.fillRoundedRect(-width / 2 - 2, lockTop, width + 4, top + topDepth - lockTop + 2, 10)
    lockBg.fillStyle(0xfff7e8, 0.1)
    lockBg.fillRoundedRect(
      -width / 2 + 8,
      lockTop + 6,
      width - 16,
      top + topDepth - lockTop - 12,
      8,
    )
    this.lockOverlay.add(lockBg)
    drawLock(this.lockOverlay, scene, top + topDepth / 2)
    this.add(this.lockOverlay)

    this.onUpgrade = onUpgrade
    this.upgradeBaseY = riserTop - 18
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
    if (cost === null) {
      this.scene.tweens.killTweensOf(this.upgrade)
      this.upgrade.setVisible(false)
      this.upgradeHit.disableInteractive()
      return
    }
    this.upgradePrice.setText(String(cost))
    this.applyUpgradeVisibility()
  }

  /**
   * The upgrade tag only advertises the interaction while the player is at the
   * shelf. Far away it is just another floating price chip, so it stays hidden
   * until the same proximity check that enables stocking lights it up.
   */
  private applyUpgradeVisibility(): void {
    const show = this.reachOn && this.upgradeCost !== null
    if (!show) {
      if (this.upgrade.visible) {
        this.scene.tweens.killTweensOf(this.upgrade)
        this.upgrade.setVisible(false)
        this.upgrade.setY(this.upgradeBaseY)
        this.upgradeHit.disableInteractive()
      }
      return
    }
    if (!this.upgrade.visible) {
      this.upgrade.setVisible(true).setY(this.upgradeBaseY)
      this.scene.tweens.killTweensOf(this.upgrade)
      if (this.upgradeAffordable) {
        this.scene.tweens.add({
          targets: this.upgrade,
          y: this.upgradeBaseY - 3,
          duration: 680,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
      }
    }
    // Keep the price visible when the player cannot pay yet: hiding it removed
    // the only clue that the shelf can be upgraded at all.
    this.upgrade.setAlpha(this.upgradeAffordable ? 1 : 0.62)
    this.upgradeHit.setInteractive({ useHandCursor: true })
  }

  /** Soft outline while the player can stock here. Kept faint on purpose. */
  setReach(on: boolean): void {
    if (on === this.reachOn) return
    this.reachOn = on
    this.applyUpgradeVisibility()
    const targets = [this.reachGlow, this.reachRim]
    this.scene.tweens.killTweensOf(targets)
    if (on) {
      this.reachGlow.setVisible(true)
      this.reachRim.setVisible(true)
    }
    this.scene.tweens.add({
      targets,
      alpha: on ? 1 : 0,
      duration: on ? 140 : 80,
      onComplete: () => {
        if (this.reachOn) return
        this.reachGlow.setVisible(false)
        this.reachRim.setVisible(false)
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

/** A small dried bundle hanging from the shelf canopy. */
function drawHangingBundle(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  kind: 'herb' | 'garlic',
): void {
  const s = scale
  g.lineStyle(1.2, 0x6f4b2e, 0.85)
  g.lineBetween(x, y - 8, x, y + 2)
  g.fillStyle(0x8f5734, 1)
  g.fillCircle(x, y - 8, 2)
  if (kind === 'garlic') {
    g.fillStyle(0xf0e6d4, 1)
    g.fillEllipse(x, y + 8 * s, 10 * s, 13 * s)
    g.fillStyle(0xd9c39a, 1)
    g.fillEllipse(x - 2 * s, y + 9 * s, 4 * s, 5 * s)
    g.lineStyle(1, 0xcdb68b, 0.7)
    for (let index = -1; index <= 1; index += 1) {
      g.lineBetween(x + index * 3 * s, y + 4 * s, x + index * 3 * s, y + 13 * s)
    }
    return
  }
  g.lineStyle(1.4, 0x7fae63, 0.8)
  for (let index = -2; index <= 2; index += 1) {
    g.lineBetween(x, y + 2, x + index * 3 * s, y + 12 * s)
    g.fillStyle(0x8fae63, 0.9)
    g.fillEllipse(x + index * 3 * s, y + 12 * s, 4 * s, 3 * s)
  }
  g.fillStyle(0xa6d489, 0.9)
  g.fillEllipse(x, y + 4 * s, 7 * s, 5 * s)
}
