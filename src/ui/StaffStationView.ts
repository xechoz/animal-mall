import type { Theme } from '@mg/core'
import Phaser from 'phaser'
import { INTERACTION, STAFF } from '../logic/config'
import type { ShopMap, StaffKind } from '../logic/types'
import { ANIMAL_SCALE } from './animalArt'
import { coinTextureKey } from './fruitArt'
import { JOYSTICK_PASS } from './Joystick'
import { productTextureKey } from './productArt'
import { staffPortraitKey } from './staffArt'

export class StaffStationView extends Phaser.GameObjects.Container {
  private readonly kind: StaffKind
  private readonly level: Phaser.GameObjects.Graphics
  private readonly hit: Phaser.GameObjects.Zone
  private lastLevel = -1
  private lastAvailable = true

  constructor(scene: Phaser.Scene, theme: Theme, kind: StaffKind, map: ShopMap, onTap: () => void) {
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

    const portrait = scene.add.image(0, -22, staffPortraitKey(kind)).setScale(0.34 * ANIMAL_SCALE)
    this.add(portrait)

    const badge = scene.add.image(17, -8, coinTextureKey()).setScale(0.32)
    if (kind === 'picker') badge.setTexture(productTextureKey('apple')).setScale(0.42)
    if (kind === 'chef') badge.setTexture(productTextureKey('cake')).setScale(0.42)
    this.add(badge)

    // The sign is the visible hiring affordance. It stays tappable so a player
    // who cannot afford the hire gets the reason instead of a dead click.
    this.hit = scene.add.zone(0, -22, 68, 50).setInteractive({ useHandCursor: true })
    this.hit.setData(JOYSTICK_PASS, true)
    let downX: number | undefined
    let downY: number | undefined
    this.hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      downX = pointer.x
      downY = pointer.y
    })
    this.hit.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const startX = downX
      const startY = downY
      downX = undefined
      downY = undefined
      if (startX === undefined || startY === undefined) return
      if (Math.hypot(pointer.x - startX, pointer.y - startY) > INTERACTION.tapSlop) return
      onTap()
    })
    this.hit.on('pointerout', () => {
      downX = undefined
      downY = undefined
    })
    this.add(this.hit)

    this.level = scene.add.graphics()
    this.add(this.level)

    scene.add.existing(this)
  }

  updateStaffLevel(level: number, available = true): void {
    if (level === this.lastLevel && available === this.lastAvailable) return
    this.lastLevel = level
    this.lastAvailable = available
    const maxed = level >= STAFF[this.kind].costs.length
    const visible = available && !maxed
    this.setVisible(visible)
    if (visible) this.hit.setInteractive({ useHandCursor: true })
    else this.hit.disableInteractive()
    this.level.clear()
    if (!available || level <= 0) return
    for (let index = 0; index < level; index += 1) {
      this.level.fillStyle(0xffd166, 1)
      this.level.fillCircle(-8 + index * 10, -50, 4)
    }
  }
}
