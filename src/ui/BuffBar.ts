import { type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { DRINK_ORDER } from '../logic/config'
import type { BuffTimers, DrinkKind } from '../logic/types'
import { DRINK_CUP_COLORS, drawCup } from './facilitiesArt'
import type { GameLayout } from './layout'

const CHIP_WIDTH = 100
const CHIP_HEIGHT = 24
const CHIP_GAP = 28

const BUFF_LABEL: Readonly<Record<DrinkKind, string>> = {
  appleSoda: 'buff.speed',
  milkTea: 'buff.carry',
  lemonTea: 'buff.scan',
}

interface Chip {
  readonly container: Phaser.GameObjects.Container
  readonly bg: Phaser.GameObjects.Graphics
  readonly cup: Phaser.GameObjects.Graphics
  readonly label: Phaser.GameObjects.Text
  lastText: string
}

export class BuffBar {
  private readonly theme: Theme
  private readonly i18n: I18n
  private readonly chips: Readonly<Record<DrinkKind, Chip>>
  private layout: GameLayout
  private active: readonly DrinkKind[] = []

  constructor(scene: Phaser.Scene, layout: GameLayout, theme: Theme, i18n: I18n) {
    this.theme = theme
    this.i18n = i18n
    this.layout = layout
    this.chips = Object.fromEntries(
      DRINK_ORDER.map((kind) => {
        const container = scene.add.container(0, 0).setDepth(6004).setVisible(false)
        const bg = scene.add.graphics()
        const cup = scene.add.graphics()
        drawCup(cup, -38, 0, 0.5, DRINK_CUP_COLORS[kind])
        const label = scene.add
          .text(-24, 0, '', textStyle(theme, 12, theme.text, true))
          .setOrigin(0, 0.5)
        container.add([bg, cup, label])
        return [kind, { container, bg, cup, label, lastText: '' }]
      }),
    ) as Record<DrinkKind, Chip>
    this.layoutChips()
  }

  relayout(layout: GameLayout): void {
    this.layout = layout
    this.layoutChips()
  }

  update(buffs: BuffTimers): void {
    const active = DRINK_ORDER.filter((kind) => buffs[kind] > 0)
    const changed = active.join('|') !== this.active.join('|')
    if (changed) {
      this.active = active
      this.layoutChips()
    }

    for (const kind of active) {
      const chip = this.chips[kind]
      const seconds = Math.ceil(buffs[kind] / 1000)
      const text = this.i18n.t('buff.chip', {
        name: this.i18n.t(BUFF_LABEL[kind]),
        seconds,
      })
      if (text !== chip.lastText) {
        chip.lastText = text
        chip.label.setText(text)
      }
      chip.container.setVisible(true)
    }
    for (const kind of DRINK_ORDER) {
      if (!active.includes(kind)) this.chips[kind].container.setVisible(false)
    }
  }

  destroy(): void {
    for (const kind of DRINK_ORDER) this.chips[kind].container.destroy(true)
  }

  private layoutChips(): void {
    const bar = this.layout.hud.bar
    const x = this.layout.hud.vertical ? bar.x + bar.w / 2 : bar.x + 8 + CHIP_WIDTH / 2
    const baseY = this.layout.hud.vertical ? this.layout.hud.goal.y + 40 : bar.y + bar.h + 12

    for (const [index, kind] of this.active.entries()) {
      const chip = this.chips[kind]
      chip.container.setPosition(x, baseY + index * CHIP_GAP)
      this.drawChip(chip)
    }
  }

  private drawChip(chip: Chip): void {
    const halfWidth = CHIP_WIDTH / 2
    const halfHeight = CHIP_HEIGHT / 2
    chip.bg.clear()
    chip.bg.fillStyle(this.theme.shadow, 0.12)
    chip.bg.fillRoundedRect(-halfWidth, -halfHeight + 2, CHIP_WIDTH, CHIP_HEIGHT, 10)
    chip.bg.fillStyle(this.theme.panel, 0.95)
    chip.bg.fillRoundedRect(-halfWidth, -halfHeight, CHIP_WIDTH, CHIP_HEIGHT, 10)
    chip.bg.lineStyle(1, this.theme.accentAlt, 0.75)
    chip.bg.strokeRoundedRect(-halfWidth, -halfHeight, CHIP_WIDTH, CHIP_HEIGHT, 10)
  }
}
