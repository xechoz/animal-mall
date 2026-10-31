import { type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { PLANT_SHOP_ORDER, producerCost, zoneOf } from '../logic/config'
import { plantDepositKey } from '../logic/purchase'
import type { PlantKind, ShopState } from '../logic/types'
import { coinTextureKey } from './fruitArt'
import { type GameLayout, worldToScreen } from './layout'
import { productTextureKey } from './productArt'

export interface PlantPickerOptions {
  readonly scene: Phaser.Scene
  readonly layout: GameLayout
  readonly theme: Theme
  readonly state: ShopState
  readonly zone: 'fruit' | 'veg'
  readonly slot: number
  /** Set when the slot already has a crop and the player is changing it. */
  readonly current?: PlantKind
  readonly onSelect: (product: PlantKind) => void
  readonly onClose: () => void
}

const PADDING = 11
const COLUMNS = 2
const BUTTON_W = 92
const BUTTON_H = 48
const GAP = 8

export class PlantPicker {
  private readonly root: Phaser.GameObjects.Container
  private readonly blocker: Phaser.GameObjects.Rectangle
  private destroyed = false

  constructor(options: PlantPickerOptions) {
    const { scene, layout, theme, state, zone, slot } = options
    const ui = layout.ui
    const products = PLANT_SHOP_ORDER.filter((product) => zoneOf(product) === zone)
    const rows = Math.ceil(products.length / COLUMNS)
    const width = (PADDING * 2 + COLUMNS * BUTTON_W + (COLUMNS - 1) * GAP) * ui
    const height = (PADDING * 2 + rows * BUTTON_H + (rows - 1) * GAP) * ui
    const point = layout.map.plantSlots[zone][slot] ?? layout.map.playerStart
    const screen = worldToScreen(layout, point)
    const x = Math.max(width / 2 + 10 * ui, Math.min(layout.width - width / 2 - 10 * ui, screen.x))
    const bottom = Math.max(150 * ui, screen.y - 38 * layout.worldScale * ui)
    const y = Math.max(
      height / 2 + 84 * ui,
      Math.min(layout.height - height / 2 - 20 * ui, bottom - height / 2),
    )

    this.root = scene.add.container(0, 0).setDepth(6900)
    this.blocker = scene.add
      .rectangle(0, 0, layout.width, layout.height, theme.overlay, 0.16)
      .setOrigin(0)
      .setInteractive()
    this.blocker.on('pointerdown', () => options.onClose())
    this.root.add(this.blocker)

    const panel = scene.add.container(x, y)
    this.root.add(panel)

    const g = scene.add.graphics()
    g.fillStyle(theme.shadow, 0.2)
    g.fillRoundedRect(-width / 2, -height / 2 + 5 * ui, width, height, 18 * ui)
    g.fillStyle(theme.panel, 0.98)
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 18 * ui)
    g.lineStyle(3 * ui, theme.accent, 0.9)
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, 18 * ui)
    g.fillStyle(theme.accent, 0.9)
    g.fillTriangle(-10 * ui, height / 2 - ui, 10 * ui, height / 2 - ui, 0, height / 2 + 13 * ui)
    panel.add(g)

    const noProducers = state.producers.length === 0
    products.forEach((plant, index) => {
      const column = index % COLUMNS
      const row = Math.floor(index / COLUMNS)
      const bx = -width / 2 + (PADDING + column * (BUTTON_W + GAP) + BUTTON_W / 2) * ui
      const by = -height / 2 + (PADDING + row * (BUTTON_H + GAP) + BUTTON_H / 2) * ui
      const cost = producerCost(plant)
      const deposit = state.deposits[plantDepositKey(plant, options.slot)] ?? 0
      const remaining = Math.max(0, cost - deposit)
      const enabled = state.coins > 0 && (!noProducers || state.coins >= remaining)
      panel.add(
        this.choiceButton(options, plant, bx, by, remaining, enabled, options.current === plant),
      )
    })
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.root.destroy(true)
  }

  private choiceButton(
    options: PlantPickerOptions,
    product: PlantKind,
    x: number,
    y: number,
    price: number,
    enabled: boolean,
    current: boolean,
  ): Phaser.GameObjects.Container {
    const { scene, theme } = options
    const ui = options.layout.ui
    const buttonW = BUTTON_W * ui
    const buttonH = BUTTON_H * ui
    const button = scene.add.container(x, y)
    const g = scene.add.graphics()
    g.fillStyle(theme.surface, enabled ? 1 : 0.55)
    g.fillRoundedRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, 12 * ui)
    g.lineStyle(3 * ui, current ? theme.accentAlt : enabled ? theme.borderSoft : theme.ink, 1)
    g.strokeRoundedRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, 12 * ui)
    button.add(g)

    const icon = scene.add.image(-26 * ui, 0, productTextureKey(product)).setScale(0.62 * ui)
    if (!enabled) icon.setAlpha(0.5)
    button.add(icon)

    const coin = scene.add.image(4 * ui, 0, coinTextureKey()).setScale(0.42 * ui)
    if (!enabled) coin.setAlpha(0.5)
    button.add(coin)
    const label = scene.add
      .text(
        14 * ui,
        0,
        String(price),
        textStyle(theme, 15 * ui, enabled ? theme.text : theme.textMuted, true),
      )
      .setOrigin(0, 0.5)
    button.add(label)

    const zone = scene.add.zone(0, 0, buttonW, buttonH).setInteractive({ useHandCursor: true })
    zone.on('pointerdown', () => {
      if (!enabled) return
      options.onSelect(product)
    })
    button.add(zone)
    return button
  }
}
