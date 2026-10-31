import { type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import {
  ANIMAL_ORDER,
  DEV_TUNING,
  DRINK_ORDER,
  defaultDrinkPrice,
  defaultProductPrice,
  drinkPrice,
  FRUIT_ORDER,
  PROCESSED_ORDER,
  productPrice,
  VEG_ORDER,
} from '../logic/config'
import type { DrinkKind, ProductKind, ShopState } from '../logic/types'
import { DRINK_CUP_COLORS, drawCup } from './facilitiesArt'
import type { GameLayout } from './layout'
import { productTextureKey } from './productArt'

type ProductTab = 'fruit' | 'veg' | 'farm' | 'kitchen'
type DevTab = 'coins' | ProductTab | 'drinks'

interface TabButton {
  readonly id: DevTab
  readonly bg: Phaser.GameObjects.Graphics
  readonly label: Phaser.GameObjects.Text
}

const PANEL_W = 620
const PANEL_H = 500
const ROW_W = 560
const ROW_H = 52
const ROW_START = -126
const ROW_GAP = 60
const TAB_LABEL: Readonly<Record<DevTab, string>> = {
  coins: 'dev.coins',
  fruit: 'dev.fruit',
  veg: 'dev.veg',
  farm: 'dev.farm',
  kitchen: 'dev.kitchen',
  drinks: 'dev.drinks',
}
const PRODUCTS: Readonly<Record<ProductTab, readonly ProductKind[]>> = {
  fruit: FRUIT_ORDER,
  veg: VEG_ORDER,
  farm: ANIMAL_ORDER,
  kitchen: PROCESSED_ORDER,
}

export interface DevPanelOptions {
  readonly scene: Phaser.Scene
  readonly layout: GameLayout
  readonly theme: Theme
  readonly i18n: I18n
  readonly state: ShopState
  readonly onSetCoins: (coins: number) => void
  readonly onClose: () => void
}

export class DevPanel {
  private readonly options: DevPanelOptions
  private readonly root: Phaser.GameObjects.Container
  private readonly panel: Phaser.GameObjects.Container
  private readonly tabsLayer: Phaser.GameObjects.Container
  private readonly rowsLayer: Phaser.GameObjects.Container
  private readonly tabs: TabButton[] = []
  private balanceText?: Phaser.GameObjects.Text
  private activeTab: DevTab = 'fruit'
  private state: ShopState
  private destroyed = false

  constructor(options: DevPanelOptions) {
    this.options = options
    this.state = options.state
    const { scene, layout, theme, i18n } = options

    this.root = scene.add.container(0, 0).setDepth(7000)
    const blocker = scene.add
      .rectangle(0, 0, layout.width, layout.height, theme.overlay, 0.2)
      .setOrigin(0)
      .setInteractive()
    blocker.on('pointerdown', () => options.onClose())
    this.root.add(blocker)

    const centerX = layout.room.x + layout.room.w / 2
    const centerY = layout.room.y + layout.room.h / 2
    this.panel = scene.add.container(centerX, centerY)
    this.root.add(this.panel)

    const bg = scene.add.graphics()
    bg.fillStyle(theme.shadow, 0.22)
    bg.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2 + 7, PANEL_W, PANEL_H, 24)
    bg.fillStyle(theme.panel, 0.99)
    bg.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 24)
    bg.lineStyle(3, theme.accent, 0.8)
    bg.strokeRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 24)
    this.panel.add(bg)

    const swallow = scene.add.zone(0, 0, PANEL_W, PANEL_H).setInteractive()
    this.panel.add(swallow)

    this.panel.add(
      scene.add
        .text(0, -PANEL_H / 2 + 30, i18n.t('dev.title'), textStyle(theme, 24, theme.text, true))
        .setOrigin(0.5),
    )
    const close = scene.add
      .text(PANEL_W / 2 - 24, -PANEL_H / 2 + 24, '×', textStyle(theme, 28, theme.textMuted, true))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    close.on('pointerdown', () => options.onClose())
    this.panel.add(close)

    this.tabsLayer = scene.add.container(0, 0)
    this.panel.add(this.tabsLayer)
    this.createTabs()

    this.rowsLayer = scene.add.container(0, 0)
    this.panel.add(this.rowsLayer)

    this.createResetButton()
    this.renderTab()
  }

  update(state: ShopState): void {
    this.state = state
    if (this.activeTab === 'coins' && this.balanceText !== undefined) {
      this.balanceText.setText(String(state.coins))
    }
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.root.destroy(true)
  }

  private createTabs(): void {
    const ids: readonly DevTab[] = ['coins', 'fruit', 'veg', 'farm', 'kitchen', 'drinks']
    ids.forEach((id, index) => {
      const x = -225 + index * 90
      const y = -PANEL_H / 2 + 82
      const container = this.options.scene.add.container(x, y)
      const bg = this.options.scene.add.graphics()
      const label = this.options.scene.add
        .text(
          0,
          0,
          this.options.i18n.t(TAB_LABEL[id]),
          textStyle(this.options.theme, 13, this.options.theme.text, true),
        )
        .setOrigin(0.5)
      const zone = this.options.scene.add.zone(0, 0, 82, 32).setInteractive({ useHandCursor: true })
      zone.on('pointerdown', () => {
        this.activeTab = id
        this.renderTab()
      })
      container.add([bg, label, zone])
      this.tabsLayer.add(container)
      this.tabs.push({ id, bg, label })
    })
  }

  private createResetButton(): void {
    const { scene, theme, i18n } = this.options
    const y = PANEL_H / 2 - 34
    const container = scene.add.container(0, y)
    const bg = scene.add.graphics()
    bg.fillStyle(theme.surface, 1)
    bg.fillRoundedRect(-82, -17, 164, 34, 11)
    bg.lineStyle(2, theme.borderSoft, 1)
    bg.strokeRoundedRect(-82, -17, 164, 34, 11)
    const label = scene.add
      .text(0, 0, i18n.t('dev.resetPrices'), textStyle(theme, 13, theme.text, true))
      .setOrigin(0.5)
    const zone = scene.add.zone(0, 0, 164, 34).setInteractive({ useHandCursor: true })
    zone.on('pointerdown', () => this.resetPrices())
    container.add([bg, label, zone])
    this.panel.add(container)
  }

  private renderTab(): void {
    this.rowsLayer.removeAll(true)
    this.balanceText = undefined
    for (const tab of this.tabs) {
      const active = tab.id === this.activeTab
      tab.bg.clear()
      tab.bg.fillStyle(
        active ? this.options.theme.accent : this.options.theme.surface,
        active ? 1 : 0.75,
      )
      tab.bg.fillRoundedRect(-41, -16, 82, 32, 10)
      tab.bg.lineStyle(1, active ? this.options.theme.accent : this.options.theme.borderSoft, 1)
      tab.bg.strokeRoundedRect(-41, -16, 82, 32, 10)
      tab.label.setColor(active ? '#3b2f3a' : this.options.theme.textMuted)
    }

    if (this.activeTab === 'coins') {
      this.renderCoins()
      return
    }
    if (this.activeTab === 'drinks') {
      DRINK_ORDER.forEach((kind, index) => {
        this.renderDrinkRow(kind, index)
      })
      return
    }
    PRODUCTS[this.activeTab].forEach((product, index) => {
      this.renderProductRow(product, index)
    })
  }

  private renderCoins(): void {
    const { scene, theme, i18n } = this.options
    this.rowsLayer.add(
      scene.add
        .text(0, -60, i18n.t('dev.balance'), textStyle(theme, 14, theme.textMuted, true))
        .setOrigin(0.5),
    )
    this.balanceText = scene.add
      .text(0, -10, String(this.state.coins), textStyle(theme, 38, theme.text, true))
      .setOrigin(0.5)
    this.rowsLayer.add(this.balanceText)

    const deltas = [-1000, -100, 100, 1000]
    deltas.forEach((delta, index) => {
      this.addButton(
        this.rowsLayer,
        -165 + index * 110,
        70,
        100,
        36,
        delta > 0 ? `+${delta}` : String(delta),
        () => this.addCoins(delta),
      )
    })
    const presets = [0, 100, 1000, 10000]
    presets.forEach((value, index) => {
      this.addButton(this.rowsLayer, -165 + index * 110, 122, 100, 36, String(value), () =>
        this.setCoins(value),
      )
    })
  }

  private renderProductRow(product: ProductKind, index: number): void {
    const { scene, theme, i18n } = this.options
    const y = ROW_START + index * ROW_GAP
    const row = scene.add.container(0, y)

    const bg = scene.add.graphics()
    bg.fillStyle(theme.surface, 0.9)
    bg.fillRoundedRect(-ROW_W / 2, -ROW_H / 2, ROW_W, ROW_H, 13)
    bg.lineStyle(1, theme.borderSoft, 1)
    bg.strokeRoundedRect(-ROW_W / 2, -ROW_H / 2, ROW_W, ROW_H, 13)
    row.add(bg)

    const icon = scene.add.image(-244, 0, productTextureKey(product)).setScale(0.52)
    row.add(icon)
    row.add(
      scene.add
        .text(-214, -9, i18n.t(`product.${product}`), textStyle(theme, 15, theme.text, true))
        .setOrigin(0, 0.5),
    )
    row.add(
      scene.add
        .text(-214, 12, i18n.t('dev.sell'), textStyle(theme, 10, theme.textMuted, false))
        .setOrigin(0, 0.5),
    )

    const value = scene.add
      .text(28, 0, String(productPrice(product)), textStyle(theme, 22, theme.text, true))
      .setOrigin(0.5)
    row.add(value)
    this.addSteppers(row, 102, (delta) => {
      const next = Math.max(0, productPrice(product) + delta)
      if (next === defaultProductPrice(product)) delete DEV_TUNING.prices[product]
      else DEV_TUNING.prices[product] = next
      value.setText(String(productPrice(product)))
    })
    this.rowsLayer.add(row)
  }

  private renderDrinkRow(kind: DrinkKind, index: number): void {
    const { scene, theme, i18n } = this.options
    const y = ROW_START + index * ROW_GAP
    const row = scene.add.container(0, y)

    const bg = scene.add.graphics()
    bg.fillStyle(theme.surface, 0.9)
    bg.fillRoundedRect(-ROW_W / 2, -ROW_H / 2, ROW_W, ROW_H, 13)
    bg.lineStyle(1, theme.borderSoft, 1)
    bg.strokeRoundedRect(-ROW_W / 2, -ROW_H / 2, ROW_W, ROW_H, 13)
    row.add(bg)

    const cup = scene.add.graphics()
    drawCup(cup, -244, 0, 1.1, DRINK_CUP_COLORS[kind])
    row.add(cup)
    row.add(
      scene.add
        .text(-214, -9, i18n.t(`drink.${kind}`), textStyle(theme, 15, theme.text, true))
        .setOrigin(0, 0.5),
    )
    row.add(
      scene.add
        .text(-214, 12, i18n.t('dev.sell'), textStyle(theme, 10, theme.textMuted, false))
        .setOrigin(0, 0.5),
    )

    const value = scene.add
      .text(28, 0, String(drinkPrice(kind)), textStyle(theme, 22, theme.text, true))
      .setOrigin(0.5)
    row.add(value)
    this.addSteppers(row, 102, (delta) => {
      const next = Math.max(0, drinkPrice(kind) + delta)
      if (next === defaultDrinkPrice(kind)) delete DEV_TUNING.drinkPrices[kind]
      else DEV_TUNING.drinkPrices[kind] = next
      value.setText(String(drinkPrice(kind)))
    })
    this.rowsLayer.add(row)
  }

  private addSteppers(
    parent: Phaser.GameObjects.Container,
    startX: number,
    onChange: (delta: number) => void,
  ): void {
    ;[-10, -1, 1, 10].forEach((delta, index) => {
      this.addButton(
        parent,
        startX + index * 50,
        0,
        42,
        26,
        delta > 0 ? `+${delta}` : String(delta),
        () => onChange(delta),
      )
    })
  }

  private addButton(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
  ): void {
    const { scene, theme } = this.options
    const container = scene.add.container(x, y)
    const bg = scene.add.graphics()
    bg.fillStyle(theme.surfaceAlt, 1)
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
    bg.lineStyle(1, theme.borderSoft, 1)
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8)
    const text = scene.add.text(0, 0, label, textStyle(theme, 12, theme.text, true)).setOrigin(0.5)
    const zone = scene.add.zone(0, 0, width, height).setInteractive({ useHandCursor: true })
    zone.on('pointerdown', onClick)
    container.add([bg, text, zone])
    parent.add(container)
  }

  private addCoins(delta: number): void {
    this.setCoins(Math.max(0, this.state.coins + delta))
  }

  private setCoins(value: number): void {
    const coins = Math.max(0, Math.floor(value))
    this.state = { ...this.state, coins }
    this.options.onSetCoins(coins)
    this.balanceText?.setText(String(coins))
  }

  private resetPrices(): void {
    for (const product of Object.keys(DEV_TUNING.prices) as ProductKind[]) {
      delete DEV_TUNING.prices[product]
    }
    for (const drink of Object.keys(DEV_TUNING.drinkPrices) as DrinkKind[]) {
      delete DEV_TUNING.drinkPrices[drink]
    }
    this.renderTab()
  }
}
