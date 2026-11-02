import { cssColor, type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { carriedKinds, carryOf, carryTotal } from '../logic/carry'
import { FOOD_BUFF, zoneOf } from '../logic/config'
import type { DrinkKind, ProductKind, ShopState } from '../logic/types'
import type { GameLayout } from './layout'
import { productTextureKey } from './productArt'

export interface FoodPickerOptions {
  readonly scene: Phaser.Scene
  readonly layout: GameLayout
  readonly theme: Theme
  readonly i18n: I18n
  readonly state: ShopState
  readonly onEat: (product: ProductKind) => void
  readonly onClose: () => void
}

interface Cell {
  readonly container: Phaser.GameObjects.Container
  readonly bg: Phaser.GameObjects.Graphics
  readonly icon: Phaser.GameObjects.Image
  readonly name: Phaser.GameObjects.Text
  readonly count: Phaser.GameObjects.Text
  readonly bonus: Phaser.GameObjects.Text
  kind: ProductKind | null
}

const PANEL_W = 460
const CELL_W = 132
const CELL_H = 62
const COLUMNS = 3
const MAX_CELLS = 15

const BUFF_LABEL: Readonly<Record<DrinkKind, string>> = {
  appleSoda: 'buff.speed',
  milkTea: 'buff.carry',
  lemonTea: 'buff.scan',
}

export class FoodPicker {
  private readonly options: FoodPickerOptions
  private readonly root: Phaser.GameObjects.Container
  private readonly subtitle: Phaser.GameObjects.Text
  private readonly empty: Phaser.GameObjects.Text
  private readonly cells: readonly Cell[]
  private state: ShopState
  private destroyed = false
  private lastKey = '__init__'

  constructor(options: FoodPickerOptions) {
    this.options = options
    this.state = options.state
    const { scene, layout, theme, i18n } = options
    const ui = layout.ui
    const font = layout.text
    const panelW = PANEL_W * ui
    const rows = Math.min(
      5,
      Math.max(1, Math.ceil(carriedKinds(options.state.player.carry).length / COLUMNS)),
    )
    // Only the rows that are actually needed: a two-item meal should not open
    // a screen-sized empty card.
    const panelUnits = 200 + rows * 70
    const panelH = panelUnits * ui
    const centerX = layout.room.x + layout.room.w / 2
    const centerY = layout.room.y + layout.room.h / 2

    this.root = scene.add.container(0, 0).setDepth(6900)
    const blocker = scene.add
      .rectangle(0, 0, layout.width, layout.height, theme.overlay, 0.16)
      .setOrigin(0)
      .setInteractive()
    blocker.on('pointerdown', () => options.onClose())
    this.root.add(blocker)

    const panel = scene.add.container(centerX, centerY)
    this.root.add(panel)

    const panelBg = scene.add.graphics()
    panelBg.fillStyle(theme.shadow, 0.22)
    panelBg.fillRoundedRect(-panelW / 2, -panelH / 2 + 6 * ui, panelW, panelH, 22 * ui)
    panelBg.fillStyle(theme.panel, 0.98)
    panelBg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 22 * ui)
    panelBg.lineStyle(3 * ui, theme.accentAlt, 0.85)
    panelBg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 22 * ui)
    panel.add(panelBg)

    const swallow = scene.add.zone(0, 0, panelW, panelH).setInteractive()
    panel.add(swallow)

    panel.add(
      scene.add
        .text(
          0,
          -panelH / 2 + 30 * ui,
          i18n.t('dining.title'),
          textStyle(theme, font.title, theme.text, true),
        )
        .setOrigin(0.5),
    )
    this.subtitle = scene.add
      .text(0, -panelH / 2 + 60 * ui, '', textStyle(theme, font.body, theme.textMuted, true))
      .setOrigin(0.5)
    panel.add(this.subtitle)

    const close = scene.add
      .text(
        panelW / 2 - 22 * ui,
        -panelH / 2 + 24 * ui,
        '×',
        textStyle(theme, font.title, theme.textMuted, true),
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    close.on('pointerdown', () => options.onClose())
    panel.add(close)

    this.empty = scene.add
      .text(
        0,
        -20 * ui,
        i18n.t('dining.empty'),
        textStyle(theme, font.label, theme.textMuted, true),
      )
      .setOrigin(0.5)
      .setVisible(false)
    panel.add(this.empty)

    const gridTop = (-panelUnits / 2 + 92) * ui
    const gridLeft = -((CELL_W * COLUMNS + 8 * (COLUMNS - 1)) / 2) * ui
    this.cells = Array.from({ length: MAX_CELLS }, (_, index) => {
      const column = index % COLUMNS
      const row = Math.floor(index / COLUMNS)
      const cell = this.createCell(
        gridLeft + column * (CELL_W + 8) * ui + (CELL_W / 2) * ui,
        gridTop + row * (CELL_H + 8) * ui + (CELL_H / 2) * ui,
        index,
      )
      panel.add(cell.container)
      return cell
    })

    const stand = scene.add
      .text(
        0,
        panelH / 2 - 36 * ui,
        i18n.t('dining.stand'),
        textStyle(theme, font.label, theme.text, true),
      )
      .setOrigin(0.5)
      .setBackgroundColor(cssColor(theme.accentAlt))
      .setPadding(18 * ui, 6 * ui, 18 * ui, 6 * ui)
      .setInteractive({ useHandCursor: true })
    stand.on('pointerdown', () => options.onClose())
    panel.add(stand)

    this.update(this.state)
  }

  update(state: ShopState): void {
    this.state = state
    const kinds = carriedKinds(state.player.carry)
    const key = kinds
      .map((product) => `${product}:${carryOf(state.player.carry, product)}`)
      .join('|')
    if (key === this.lastKey) return
    this.lastKey = key

    this.cells.forEach((cell, index) => {
      const kind = kinds[index]
      if (kind === undefined) {
        cell.kind = null
        cell.container.setVisible(false)
        return
      }
      cell.kind = kind
      cell.container.setVisible(true)
      cell.icon.setTexture(productTextureKey(kind))
      cell.name.setText(this.options.i18n.t(`product.${kind}`))
      cell.count.setText(`×${carryOf(state.player.carry, kind)}`)
      cell.bonus.setText(this.bonusText(kind))
    })

    const total = carryTotal(state.player.carry)
    this.subtitle.setText(
      total > 0
        ? this.options.i18n.t('dining.holding', { count: total })
        : this.options.i18n.t('dining.subtitle'),
    )
    this.empty.setVisible(kinds.length === 0)
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.root.destroy(true)
  }

  private createCell(x: number, y: number, index: number): Cell {
    const { scene, layout, theme } = this.options
    const ui = layout.ui
    const font = layout.text
    const container = scene.add.container(x, y)
    const bg = scene.add.graphics()
    const halfW = (CELL_W * ui) / 2
    const halfH = (CELL_H * ui) / 2
    bg.fillStyle(theme.surface, 1)
    bg.fillRoundedRect(-halfW, -halfH, halfW * 2, halfH * 2, 11 * ui)
    bg.lineStyle(1.5 * ui, theme.borderSoft, 0.9)
    bg.strokeRoundedRect(-halfW, -halfH, halfW * 2, halfH * 2, 11 * ui)
    container.add(bg)

    const icon = scene.add.image(-42 * ui, 0, productTextureKey('apple')).setScale(0.52 * ui)
    container.add(icon)
    const name = scene.add
      .text(-20 * ui, -12 * ui, '', textStyle(theme, font.body, theme.text, true))
      .setOrigin(0, 0.5)
    container.add(name)
    const count = scene.add
      .text(52 * ui, -12 * ui, '', textStyle(theme, font.caption, cssColor(theme.accentInk), true))
      .setOrigin(1, 0.5)
    container.add(count)
    const bonus = scene.add
      .text(-20 * ui, 13 * ui, '', textStyle(theme, font.caption, theme.textMuted, false))
      .setOrigin(0, 0.5)
    container.add(bonus)

    const zone = scene.add
      .zone(0, 0, CELL_W * ui, CELL_H * ui)
      .setInteractive({ useHandCursor: true })
    zone.on('pointerdown', () => {
      const kind = this.cells[index]?.kind
      if (kind === null || kind === undefined) return
      if (carryOf(this.state.player.carry, kind) <= 0) return
      scene.tweens.killTweensOf(container)
      scene.tweens.add({
        targets: container,
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 70,
        yoyo: true,
        ease: 'Quad.easeOut',
      })
      this.options.onEat(kind)
    })
    container.add(zone)

    return { container, bg, icon, name, count, bonus, kind: null }
  }

  private bonusText(product: ProductKind): string {
    const { i18n } = this.options
    const zone = zoneOf(product)
    const bonus = FOOD_BUFF[zone]
    if (zone === 'kitchen') {
      return i18n.t('dining.bonusAll', { seconds: Math.round((bonus[0]?.ms ?? 0) / 1000) })
    }
    const entry = bonus[0]
    if (entry === undefined) return ''
    return i18n.t('dining.bonus', {
      buff: i18n.t(BUFF_LABEL[entry.drink]),
      seconds: Math.round(entry.ms / 1000),
    })
  }
}
