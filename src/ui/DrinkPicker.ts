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
    const ui = layout.ui
    const font = layout.text
    const panelW = PANEL_W * ui
    const panelH = PANEL_H * ui
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
    panelBg.fillRoundedRect(-panelW / 2, -panelH / 2 + 6 * ui, panelW, panelH, 22 * ui)
    panelBg.fillStyle(theme.panel, 0.98)
    panelBg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 22 * ui)
    panelBg.lineStyle(3 * ui, theme.accent, 0.8)
    panelBg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 22 * ui)
    this.panel.add(panelBg)

    const swallow = scene.add.zone(0, 0, panelW, panelH).setInteractive()
    this.panel.add(swallow)

    this.panel.add(
      scene.add
        .text(
          0,
          -panelH / 2 + 30 * ui,
          i18n.t('drink.title'),
          textStyle(theme, font.title, theme.text, true),
        )
        .setOrigin(0.5),
    )
    this.balance = scene.add
      .text(0, -panelH / 2 + 60 * ui, '', textStyle(theme, font.body, theme.textMuted, true))
      .setOrigin(0.5)
    this.panel.add(this.balance)

    const close = scene.add
      .text(
        panelW / 2 - 22 * ui,
        -panelH / 2 + 24 * ui,
        '×',
        textStyle(theme, font.title, theme.textMuted, true),
      )
      .setOrigin(0.5)
    const closeHit = scene.add
      .zone(panelW / 2 - 22 * ui, -panelH / 2 + 24 * ui, 56 * ui, 56 * ui)
      .setInteractive({ useHandCursor: true })
    closeHit.on('pointerdown', () => options.onClose())
    this.panel.add(close)
    this.panel.add(closeHit)

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
    const ui = this.options.layout.ui
    const font = this.options.layout.text
    const rowW = ROW_W * ui
    const container = scene.add.container(0, (-PANEL_H / 2 + 108 + index * 84) * ui)
    const bg = scene.add.graphics()
    container.add(bg)

    const cup = scene.add.graphics()
    drawCup(cup, -rowW / 2 + 34 * ui, 0, 1.3 * ui, DRINK_CUP_COLORS[kind])
    container.add(cup)

    const name = scene.add
      .text(
        -rowW / 2 + 62 * ui,
        -12 * ui,
        i18n.t(`drink.${kind}`),
        textStyle(theme, font.label, theme.text, true),
      )
      .setOrigin(0, 0.5)
    container.add(name)

    const desc = scene.add
      .text(
        -rowW / 2 + 62 * ui,
        15 * ui,
        this.describe(kind),
        textStyle(theme, font.body, theme.textMuted, false),
      )
      .setOrigin(0, 0.5)
    container.add(desc)

    const coin = scene.add.image(76 * ui, -12 * ui, coinTextureKey()).setScale(0.4 * ui)
    container.add(coin)
    const price = scene.add
      .text(
        86 * ui,
        -12 * ui,
        String(drinkPrice(kind)),
        textStyle(theme, font.body, theme.text, true),
      )
      .setOrigin(0, 0.5)
    container.add(price)

    const active = scene.add
      .text(76 * ui, 14 * ui, '', textStyle(theme, font.caption, cssColor(theme.accentAlt), true))
      .setOrigin(0, 0.5)
    container.add(active)

    const buy = scene.add
      .text(
        rowW / 2 - 48 * ui,
        0,
        i18n.t('drink.buy'),
        textStyle(theme, font.body, theme.text, true),
      )
      .setOrigin(0.5)
    container.add(buy)

    const zone = scene.add.zone(0, 0, rowW, ROW_H * ui).setInteractive({ useHandCursor: true })
    zone.on('pointerdown', () => {
      // Buy anyway; the scene owns the failure toast so an unaffordable row
      // still answers the tap instead of swallowing it.
      if (this.state.coins >= drinkPrice(kind)) {
        scene.tweens.killTweensOf(container)
        scene.tweens.add({
          targets: container,
          scaleX: 0.98,
          scaleY: 0.98,
          duration: 70,
          yoyo: true,
          ease: 'Quad.easeOut',
        })
      }
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
    const ui = this.options.layout.ui
    const rowW = ROW_W * ui
    const rowH = ROW_H * ui
    const halfW = rowW / 2
    const halfH = rowH / 2
    row.bg.clear()
    row.bg.fillStyle(theme.surface, affordable ? 1 : 0.55)
    row.bg.fillRoundedRect(-halfW, -halfH, rowW, rowH, 13 * ui)
    row.bg.lineStyle(2 * ui, affordable ? theme.borderSoft : theme.ink, affordable ? 1 : 0.18)
    row.bg.strokeRoundedRect(-halfW, -halfH, rowW, rowH, 13 * ui)
    row.bg.fillStyle(affordable ? theme.accent : theme.borderSoft, affordable ? 0.18 : 0.12)
    row.bg.fillRoundedRect(halfW - 96 * ui, -18 * ui, 80 * ui, 36 * ui, 18 * ui)

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
