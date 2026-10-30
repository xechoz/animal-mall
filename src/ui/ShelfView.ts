import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { gameColors } from '../colors'
import { SHELF_RECTS } from '../logic/config'
import type { FruitKind, ShelfState } from '../logic/types'
import { fruitTextureKey } from './fruitArt'

export class ShelfView extends Phaser.GameObjects.Container {
  private readonly icons: Phaser.GameObjects.Image[] = []
  private readonly countText: Phaser.GameObjects.Text
  private readonly kindIcon: Phaser.GameObjects.Image
  private readonly lockOverlay: Phaser.GameObjects.Container
  private lastKey = ''

  constructor(scene: Phaser.Scene, theme: Theme, kind: FruitKind) {
    const rect = SHELF_RECTS[kind]
    super(scene, rect.x + rect.w / 2, rect.y + rect.h / 2)
    const width = rect.w
    const height = rect.h
    const g = scene.add.graphics()

    g.fillStyle(0x3b2f3a, 0.16)
    g.fillRoundedRect(-width / 2, -height / 2 + 7, width, height, 8)
    g.fillStyle(gameColors.woodDark, 1)
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
    g.fillStyle(gameColors.wood, 1)
    g.fillRoundedRect(-width / 2 + 4, -height / 2 + 3, width - 8, height - 8, 5)
    g.fillStyle(0x7b4f33, 1)
    g.fillRoundedRect(-width / 2 + 7, -height / 2 + 19, width - 14, 5, 2)
    g.fillRoundedRect(-width / 2 + 7, -height / 2 + 38, width - 14, 5, 2)
    g.fillStyle(gameColors.woodLight, 1)
    g.fillRoundedRect(-width / 2 + 7, -height / 2 + 15, width - 14, 4, 2)
    g.fillRoundedRect(-width / 2 + 7, -height / 2 + 34, width - 14, 4, 2)
    this.add(g)

    for (let index = 0; index < 6; index += 1) {
      const column = index % 3
      const row = Math.floor(index / 3)
      const icon = scene.add
        .image(-width / 2 + 21 + column * 29, -height / 2 + 13 + row * 19, fruitTextureKey(kind))
        .setScale(0.52)
      icon.setVisible(false)
      this.icons.push(icon)
      this.add(icon)
    }

    this.countText = scene.add
      .text(width / 2 - 7, height / 2 - 10, '', textStyle(theme, 10, '#fff7e8', true))
      .setOrigin(1, 0.5)
    this.add(this.countText)

    const namePlate = scene.add.graphics()
    namePlate.fillStyle(gameColors.cream, 0.96)
    namePlate.fillRoundedRect(-16, height / 2 - 16, 32, 14, 7)
    this.add(namePlate)

    this.lockOverlay = scene.add.container(0, 0)
    const lockBg = scene.add.graphics()
    lockBg.fillStyle(0x2f2433, 0.72)
    lockBg.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
    lockBg.fillStyle(0xfff7e8, 0.14)
    lockBg.fillRoundedRect(-width / 2 + 8, -height / 2 + 9, width - 16, height - 18, 6)
    this.lockOverlay.add(lockBg)
    drawLock(this.lockOverlay, scene)
    this.add(this.lockOverlay)

    this.kindIcon = scene.add.image(0, height / 2 - 9, fruitTextureKey(kind)).setScale(0.5)
    this.add(this.kindIcon)

    scene.add.existing(this)
  }

  updateShelf(shelf: ShelfState): void {
    const key = `${shelf.active}-${shelf.stock}-${shelf.capacity}`
    if (key === this.lastKey) return
    this.lastKey = key

    const wasVisible = this.lockOverlay.visible
    this.lockOverlay.setVisible(!shelf.active)
    this.icons.forEach((icon, index) => {
      icon.setVisible(shelf.active && shelf.stock > index)
    })
    const shown = Math.min(6, shelf.stock)
    this.countText.setText(
      shelf.active && shelf.stock > 0
        ? shelf.stock > shown
          ? `×${shelf.stock}`
          : `${shelf.stock}`
        : '',
    )
    this.kindIcon.setAlpha(shelf.active ? 1 : 0.55)
    if (!shelf.active) return

    if (wasVisible) {
      this.scene.tweens.add({
        targets: this,
        scale: { from: 1.08, to: 1 },
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
