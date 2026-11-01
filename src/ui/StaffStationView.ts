import type { Theme } from '@mg/core'
import Phaser from 'phaser'
import { STAFF } from '../logic/config'
import type { ShopMap, StaffKind } from '../logic/types'
import { animalTextureKey } from './animalArt'
import { coinTextureKey } from './fruitArt'
import { productTextureKey } from './productArt'

export class StaffStationView extends Phaser.GameObjects.Container {
  private readonly kind: StaffKind
  private readonly level: Phaser.GameObjects.Graphics
  private lastLevel = -1
  private lastAvailable = true

  constructor(scene: Phaser.Scene, theme: Theme, kind: StaffKind, map: ShopMap) {
    const station = map.staffStations[kind].station
    super(scene, station.x, station.y)
    this.kind = kind

    const shadow = scene.add.graphics()
    shadow.fillStyle(0x3b2f3a, 0.14)
    shadow.fillEllipse(0, 18, 54, 12)
    this.add(shadow)

    const post = scene.add.graphics()
    post.fillStyle(0x6f4b2e, 1)
    post.fillRoundedRect(-4, -4, 8, 26, 3)
    post.fillStyle(0x8f5734, 1)
    post.fillRoundedRect(-2, -2, 4, 22, 2)
    this.add(post)

    const board = scene.add.graphics()
    board.fillStyle(theme.shadow, 0.18)
    board.fillRoundedRect(-30, -40, 60, 42, 10)
    board.fillStyle(0xf0c99b, 1)
    board.fillRoundedRect(-30, -43, 60, 42, 10)
    // Scalloped awning edge, like a tiny market sign.
    board.fillStyle(0xf0c99b, 1)
    for (let index = 0; index < 5; index += 1) {
      board.fillCircle(-22 + index * 11, -42, 5)
    }
    board.fillStyle(0xfff3dd, 0.35)
    board.fillRoundedRect(-24, -38, 48, 3, 1.5)
    board.lineStyle(2, 0x8f5734, 0.8)
    board.strokeRoundedRect(-30, -43, 60, 42, 10)
    this.add(board)

    const portrait = scene.add.image(0, -22, animalTextureKey(STAFF[kind].species)).setScale(0.34)
    this.add(portrait)

    const badge = scene.add.image(17, -8, coinTextureKey()).setScale(0.32)
    if (kind === 'picker') badge.setTexture(productTextureKey('apple')).setScale(0.42)
    if (kind === 'chef') badge.setTexture(productTextureKey('cake')).setScale(0.42)
    this.add(badge)

    this.level = scene.add.graphics()
    this.add(this.level)

    scene.add.existing(this)
  }

  updateStaffLevel(level: number, available = true): void {
    if (level === this.lastLevel && available === this.lastAvailable) return
    this.lastLevel = level
    this.lastAvailable = available
    const maxed = level >= STAFF[this.kind].costs.length
    this.setVisible(available && !maxed)
    this.level.clear()
    if (!available || level <= 0) return
    for (let index = 0; index < level; index += 1) {
      this.level.fillStyle(0xffd166, 1)
      this.level.fillCircle(-8 + index * 10, -50, 4)
    }
  }
}
