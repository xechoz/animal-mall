import { type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { PLANT_SLOTS, producerCost, ZONE_PRODUCTS } from '../logic/config'
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
  readonly onSelect: (product: PlantKind) => void
  readonly onClose: () => void
}

const WIDTH = 214
const HEIGHT = 126
const BUTTON_W = 92
const BUTTON_H = 48
const GAP = 8

export class PlantPicker {
  private readonly root: Phaser.GameObjects.Container
  private readonly blocker: Phaser.GameObjects.Rectangle
  private destroyed = false

  constructor(options: PlantPickerOptions) {
    const { scene, layout, theme, state, zone, slot } = options
    const point = PLANT_SLOTS[zone][slot] ?? { x: 320, y: 320 }
    const screen = worldToScreen(layout, point)
    const x = Math.max(WIDTH / 2 + 10, Math.min(layout.width - WIDTH / 2 - 10, screen.x))
    const bottom = Math.max(150, screen.y - 38 * layout.worldScale)
    const y = Math.max(
      HEIGHT / 2 + 84,
      Math.min(layout.height - HEIGHT / 2 - 20, bottom - HEIGHT / 2),
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
    g.fillRoundedRect(-WIDTH / 2, -HEIGHT / 2 + 5, WIDTH, HEIGHT, 18)
    g.fillStyle(theme.panel, 0.98)
    g.fillRoundedRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT, 18)
    g.lineStyle(3, theme.accent, 0.9)
    g.strokeRoundedRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT, 18)
    g.fillStyle(theme.accent, 0.9)
    g.fillTriangle(-10, HEIGHT / 2 - 1, 10, HEIGHT / 2 - 1, 0, HEIGHT / 2 + 13)
    panel.add(g)

    const noProducers = state.producers.length === 0
    const products = ZONE_PRODUCTS[zone]
    products.forEach((product, index) => {
      if (product === 'egg' || product === 'milk' || product === 'yarn' || product === 'fish') {
        return
      }
      if (product === 'cake' || product === 'sweater' || product === 'grilledFish') return
      const plant = product
      const column = index % 2
      const row = Math.floor(index / 2)
      const bx = -WIDTH / 2 + 11 + column * (BUTTON_W + GAP) + BUTTON_W / 2
      const by = -HEIGHT / 2 + 11 + row * (BUTTON_H + GAP) + BUTTON_H / 2
      const cost = producerCost(plant)
      const deposit = state.deposits[plantDepositKey(plant)] ?? 0
      const remaining = Math.max(0, cost - deposit)
      const enabled = state.coins > 0 && (!noProducers || state.coins >= remaining)
      panel.add(this.choiceButton(options, plant, bx, by, remaining, enabled))
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
  ): Phaser.GameObjects.Container {
    const { scene, theme } = options
    const button = scene.add.container(x, y)
    const g = scene.add.graphics()
    g.fillStyle(theme.surface, enabled ? 1 : 0.55)
    g.fillRoundedRect(-BUTTON_W / 2, -BUTTON_H / 2, BUTTON_W, BUTTON_H, 12)
    g.lineStyle(2, enabled ? theme.borderSoft : theme.ink, enabled ? 1 : 0.18)
    g.strokeRoundedRect(-BUTTON_W / 2, -BUTTON_H / 2, BUTTON_W, BUTTON_H, 12)
    button.add(g)

    const icon = scene.add.image(-26, 0, productTextureKey(product)).setScale(0.62)
    if (!enabled) icon.setAlpha(0.5)
    button.add(icon)

    const coin = scene.add.image(4, 0, coinTextureKey()).setScale(0.42)
    if (!enabled) coin.setAlpha(0.5)
    button.add(coin)
    const label = scene.add
      .text(
        14,
        0,
        String(price),
        textStyle(theme, 15, enabled ? theme.text : theme.textMuted, true),
      )
      .setOrigin(0, 0.5)
    button.add(label)

    const zone = scene.add.zone(0, 0, BUTTON_W, BUTTON_H).setInteractive({ useHandCursor: true })
    zone.on('pointerdown', () => {
      if (!enabled) return
      options.onSelect(product)
    })
    button.add(zone)
    return button
  }
}
