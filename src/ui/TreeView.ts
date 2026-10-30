import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { gameColors } from '../colors'
import { FRUITS, PLOT_SIZE, type PLOTS } from '../logic/config'
import type { TreeState } from '../logic/types'
import { FRUIT_COLORS } from './fruitArt'

export class TreeView extends Phaser.GameObjects.Container {
  private readonly theme: Theme
  private readonly plant: Phaser.GameObjects.Graphics
  private readonly ring: Phaser.GameObjects.Graphics
  private readonly badge: Phaser.GameObjects.Text
  private readonly canopy: Phaser.GameObjects.Container
  private lastKey = ''

  constructor(scene: Phaser.Scene, theme: Theme, plot: (typeof PLOTS)[number]) {
    super(scene, plot.x, plot.y)
    this.theme = theme
    const potWidth = PLOT_SIZE.w
    const potHeight = PLOT_SIZE.h
    const g = scene.add.graphics()

    g.fillStyle(0x3b2f3a, 0.16)
    g.fillEllipse(0, 24, potWidth + 8, 14)
    g.fillStyle(gameColors.woodDark, 1)
    g.fillRoundedRect(-potWidth / 2, -potHeight / 2, potWidth, potHeight, 8)
    g.fillStyle(gameColors.wood, 1)
    g.fillRoundedRect(-potWidth / 2 + 4, -potHeight / 2 + 2, potWidth - 8, potHeight - 8, 6)
    g.fillStyle(gameColors.dirtDark, 1)
    g.fillEllipse(0, -potHeight / 2 + 4, potWidth - 14, 12)
    g.fillStyle(gameColors.dirt, 1)
    g.fillEllipse(0, -potHeight / 2 + 2, potWidth - 22, 8)
    g.lineStyle(2, 0x7b4f33, 0.55)
    g.lineBetween(-potWidth / 2 + 8, 8, potWidth / 2 - 8, 8)
    this.add(g)

    this.canopy = scene.add.container(0, 0)
    this.plant = scene.add.graphics()
    this.canopy.add(this.plant)
    this.add(this.canopy)
    scene.tweens.add({
      targets: this.canopy,
      angle: { from: -1.2, to: 1.2 },
      duration: 1_800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.ring = scene.add.graphics()
    this.add(this.ring)

    this.badge = scene.add
      .text(0, -98, '', textStyle(theme, 14, theme.text, true))
      .setOrigin(0.5)
      .setBackgroundColor('#fff7e8')
      .setPadding(6, 1, 6, 1)
      .setVisible(false)
    this.add(this.badge)

    scene.add.existing(this)
  }

  updateTree(tree: TreeState | null): void {
    const key =
      tree === null
        ? 'empty'
        : `${tree.mature}-${Math.floor(tree.growthMs / 500)}-${tree.fruit}-${tree.kind}`
    if (key === this.lastKey) return
    this.lastKey = key

    if (tree === null) {
      this.plant.clear()
      this.ring.clear()
      this.badge.setVisible(false)
      return
    }

    const config = FRUITS[tree.kind]
    const ratio = tree.mature ? 1 : Math.min(1, tree.growthMs / config.growMs)
    const g = this.plant
    g.clear()

    if (ratio < 0.38) {
      g.fillStyle(0x6f4b2e, 1)
      g.fillRoundedRect(-3, -28, 6, 28, 3)
      g.fillStyle(gameColors.leaf, 1)
      g.fillEllipse(-10, -26, 18, 10)
      g.fillEllipse(10, -30, 16, 9)
      g.fillStyle(gameColors.leafLight, 1)
      g.fillEllipse(-4, -34, 8, 5)
    } else {
      const scale = 0.55 + ratio * 0.45
      g.fillStyle(gameColors.woodDark, 1)
      g.fillRoundedRect(-6 * scale, -50 * scale, 12 * scale, 50 * scale, 5)
      g.fillStyle(0x8f5734, 1)
      g.fillRoundedRect(-4 * scale, -46 * scale, 4 * scale, 36 * scale, 2)

      const canopyY = -66 * scale
      const canopyR = 27 * scale
      g.fillStyle(gameColors.leafDark, 1)
      g.fillCircle(-17 * scale, canopyY + 6, canopyR * 0.72)
      g.fillCircle(17 * scale, canopyY + 4, canopyR * 0.68)
      g.fillCircle(0, canopyY, canopyR)
      g.fillStyle(gameColors.leaf, 1)
      g.fillCircle(-15 * scale, canopyY + 2, canopyR * 0.56)
      g.fillCircle(15 * scale, canopyY - 2, canopyR * 0.52)
      g.fillCircle(-2, canopyY - 6, canopyR * 0.92)
      g.fillStyle(gameColors.leafLight, 1)
      g.fillCircle(-10 * scale, canopyY - 11, canopyR * 0.36)
      g.fillCircle(9 * scale, canopyY - 14, canopyR * 0.24)

      if (tree.mature) {
        for (let index = 0; index < tree.fruit; index += 1) {
          const angle = -2.4 + index * 1.25
          const distance = 16 * scale
          const x = Math.cos(angle) * distance
          const y = canopyY + 4 + Math.sin(angle) * distance * 0.6
          g.fillStyle(0x3b2f3a, 0.2)
          g.fillCircle(x, y + 2, 6)
          g.fillStyle(FRUIT_COLORS[tree.kind], 1)
          g.fillCircle(x, y, 5.5)
          g.fillStyle(0xffffff, 0.55)
          g.fillCircle(x - 1.5, y - 1.5, 1.6)
        }
      }
    }

    this.ring.clear()
    if (!tree.mature) {
      const radius = 33
      this.ring.lineStyle(5, 0xffffff, 0.28)
      this.ring.beginPath()
      this.ring.arc(0, 4, radius, -Math.PI / 2, Math.PI * 1.5)
      this.ring.strokePath()
      this.ring.lineStyle(5, 0xffd166, 1)
      this.ring.beginPath()
      this.ring.arc(0, 4, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio)
      this.ring.strokePath()
    }

    if (tree.mature && tree.fruit > 0) {
      this.badge.setText(String(tree.fruit)).setVisible(true)
      this.badge.setColor(`#${this.theme.text.slice(1)}`)
    } else {
      this.badge.setVisible(false)
    }
  }
}
