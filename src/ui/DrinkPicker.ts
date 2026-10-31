import { cssColor, type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { DRINK_ORDER, DRINKS, drinkPrice } from '../logic/config'
import type { DrinkKind, ShopState } from '../logic/types'
import { DRINK_CUP_COLORS, drawCup } from './facilitiesArt'
import { coinTextureKey } from './fruitArt'
import type { GameLayout } from './layout'

export interface DrinkPickerOptions {
  readonly scene: Phaser.Scene
  readonly layout: GameLayout
  readonly theme: Theme
  readonly i18n: I18n
  readonly state: ShopState
  readonly onBuy: (drink: DrinkKind) => void
  readonly onClose: () => void
}

interface DrinkRow {
  readonly kind: DrinkKind
  readonly container: Phaser.GameObjects.Container
  readonly bg: Phaser.GameObjects.Graphics
  readonly name: Phaser.GameObjects.Text
  readonly desc: Phaser.GameObjects.Text
  readonly price: Phaser.GameObjects.Text
  readonly active: Phaser.GameObjects.Text
  readonly buy: Phaser.GameObjects.Text
  lastKey: string
}

const PANEL_W = 440
const PANEL_H = 360
const ROW_W = 400
const ROW_H = 68

export class DrinkPicker {
  private readonly options: DrinkPickerOptions
  private readonly root: Phaser.GameObjects.Container
  private readonly blocker: Phaser.GameObjects.Rectangle
  private readonly panel: Phaser.GameObjects.Container
  private readonly balance: Phaser.GameObjects.Text
  private readonly rows: readonly DrinkRow[]
  private state: ShopState
  private destroyed = false
  private lastBalance = -1

  constructor(options: DrinkPickerOptions) {
    this.options = options
    this.state = options.state
    const { scene, layout, theme, i18n } = options
    const centerX = layout.room.x + layout.room.w / 2
    const centerY = layout.room.y + layout.room.h / 2

    this.root = scene.add.container(0, 0).setDepth(6900)
    this.blocker = scene.add
      .rectangle(0, 0, layout.width, layout.height, theme.overlay, 0.16)
      .setOrigin(0)
      .setInteractive()
    this.blocker.on('pointerdown', () => options.onClose())
    this.root.add(this.blocker)

    this.panel = scene.add.container(centerX, centerY)
    this.root.add(this.panel)

    const panelBg = scene.add.graphics()
    panelBg.fillStyle(theme.shadow, 0.22)
    panelBg.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2 + 6, PANEL_W, PANEL_H, 22)
    panelBg.fillStyle(theme.panel, 0.98)
    panelBg.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 22)
    panelBg.lineStyle(3, theme.accent, 0.8)
    panelBg.strokeRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 22)
    this.panel.add(panelBg)

    const swallow = scene.add.zone(0, 0, PANEL_W, PANEL_H).setInteractive()
    this.panel.add(swallow)

    this.panel.add(
      scene.add
        .text(0, -PANEL_H / 2 + 30, i18n.t('drink.title'), textStyle(theme, 24, theme.text, true))
        .setOrigin(0.5),
    )
    this.balance = scene.add
      .text(0, -PANEL_H / 2 + 58, '', textStyle(theme, 15, theme.textMuted, true))
      .setOrigin(0.5)
    this.panel.add(this.balance)

    const close = scene.add
      .text(PANEL_W / 2 - 22, -PANEL_H / 2 + 22, '×', textStyle(theme, 26, theme.textMuted, true))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    close.on('pointerdown', () => options.onClose())
    this.panel.add(close)

    this.rows = DRINK_ORDER.map((kind, index) => {
      const row = this.createRow(index, kind)
      this.panel.add(row.container)
      return row
    })
    this.update(this.state)
  }

  update(state: ShopState): void {
    this.state = state
    if (state.coins !== this.lastBalance) {
      this.lastBalance = state.coins
      this.balance.setText(this.options.i18n.t('drink.balance', { coins: state.coins }))
    }
    for (const row of this.rows) this.updateRow(row, state)
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.root.destroy(true)
  }

  private createRow(index: number, kind: DrinkKind): DrinkRow {
    const { scene, theme, i18n } = this.options
    const container = scene.add.container(0, -PANEL_H / 2 + 104 + index * 78)
    const bg = scene.add.graphics()
    container.add(bg)

    const cup = scene.add.graphics()
    drawCup(cup, -ROW_W / 2 + 34, 0, 1.3, DRINK_CUP_COLORS[kind])
    container.add(cup)

    const name = scene.add
      .text(-ROW_W / 2 + 62, -11, i18n.t(`drink.${kind}`), textStyle(theme, 17, theme.text, true))
      .setOrigin(0, 0.5)
    container.add(name)

    const desc = scene.add
      .text(-ROW_W / 2 + 62, 12, this.describe(kind), textStyle(theme, 12, theme.textMuted, false))
      .setOrigin(0, 0.5)
    container.add(desc)

    const coin = scene.add.image(76, -12, coinTextureKey()).setScale(0.4)
    container.add(coin)
    const price = scene.add
      .text(86, -12, String(drinkPrice(kind)), textStyle(theme, 14, theme.text, true))
      .setOrigin(0, 0.5)
    container.add(price)

    const active = scene.add
      .text(76, 12, '', textStyle(theme, 11, cssColor(theme.accentAlt), true))
      .setOrigin(0, 0.5)
    container.add(active)

    const buy = scene.add
      .text(ROW_W / 2 - 48, 0, i18n.t('drink.buy'), textStyle(theme, 14, theme.text, true))
      .setOrigin(0.5)
    container.add(buy)

    const zone = scene.add.zone(0, 0, ROW_W, ROW_H).setInteractive({ useHandCursor: true })
    zone.on('pointerdown', () => {
      if (this.state.coins < drinkPrice(kind)) return
      this.options.onBuy(kind)
    })
    container.add(zone)

    return {
      kind,
      container,
      bg,
      name,
      desc,
      price,
      active,
      buy,
      lastKey: '',
    }
  }

  private updateRow(row: DrinkRow, state: ShopState): void {
    const price = drinkPrice(row.kind)
    const affordable = state.coins >= price
    const buffMs = state.buffs[row.kind]
    const buffSeconds = Math.ceil(buffMs / 1000)
    const key = `${price}-${affordable}-${buffSeconds}`
    if (key === row.lastKey) return
    row.lastKey = key
    row.price.setText(String(price))

    const { theme, i18n } = this.options
    const halfW = ROW_W / 2
    const halfH = ROW_H / 2
    row.bg.clear()
    row.bg.fillStyle(theme.surface, affordable ? 1 : 0.55)
    row.bg.fillRoundedRect(-halfW, -halfH, ROW_W, ROW_H, 13)
    row.bg.lineStyle(2, affordable ? theme.borderSoft : theme.ink, affordable ? 1 : 0.18)
    row.bg.strokeRoundedRect(-halfW, -halfH, ROW_W, ROW_H, 13)
    row.bg.fillStyle(affordable ? theme.accent : theme.borderSoft, affordable ? 0.18 : 0.12)
    row.bg.fillRoundedRect(halfW - 96, -17, 80, 34, 10)

    row.name.setColor(affordable ? theme.text : theme.textMuted)
    row.desc.setColor(theme.textMuted)
    row.price.setColor(affordable ? theme.text : theme.textMuted)
    row.buy.setColor(affordable ? cssColor(theme.accentInk) : theme.textMuted)
    row.active
      .setText(buffSeconds > 0 ? i18n.t('drink.active', { seconds: buffSeconds }) : '')
      .setVisible(buffSeconds > 0)
  }

  private describe(kind: DrinkKind): string {
    const config = DRINKS[kind]
    const value =
      kind === 'milkTea'
        ? config.carryBonus
        : Math.round((kind === 'appleSoda' ? config.speedBonus : config.scanBonus) * 100)
    return this.options.i18n.t(`drink.${kind}.desc`, {
      value,
      seconds: Math.round(config.durationMs / 1000),
    })
  }
}
