import type { Theme } from '@mg/core'
import Phaser from 'phaser'
import { STAFF } from '../logic/config'
import type { StaffKind } from '../logic/types'
import { animalTextureKey } from './animalArt'
import { coinTextureKey, fruitTextureKey } from './fruitArt'

export class StaffStationView extends Phaser.GameObjects.Container {
  private readonly kind: StaffKind
  private readonly level: Phaser.GameObjects.Graphics
  private lastLevel = -1

  constructor(scene: Phaser.Scene, theme: Theme, kind: StaffKind) {
    const station = STAFF[kind].station
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
    board.lineStyle(2, 0x8f5734, 0.8)
    board.strokeRoundedRect(-30, -43, 60, 42, 10)
    this.add(board)

    const portrait = scene.add.image(0, -22, animalTextureKey(STAFF[kind].species)).setScale(0.34)
    this.add(portrait)

    const badge = scene.add.image(17, -8, coinTextureKey()).setScale(0.32)
    if (kind === 'picker') badge.setTexture(fruitTextureKey('apple')).setScale(0.42)
    this.add(badge)

    this.level = scene.add.graphics()
    this.add(this.level)

    scene.add.existing(this)
  }

  updateStaffLevel(level: number): void {
    if (level === this.lastLevel) return
    this.lastLevel = level
    this.level.clear()
    if (level <= 0) return
    if (level >= STAFF[this.kind].costs.length) {
      this.level.fillStyle(0x5fbf9f, 1)
      this.level.fillCircle(24, -48, 8)
      this.level.lineStyle(3, 0xffffff, 1)
      this.level.lineBetween(19, -48, 23, -44)
      this.level.lineBetween(23, -44, 30, -53)
      return
    }
    for (let index = 0; index < level; index += 1) {
      this.level.fillStyle(0xffd166, 1)
      this.level.fillCircle(-8 + index * 10, -50, 4)
    }
  }
}
