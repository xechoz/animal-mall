import { cssColor, type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import {
  ANIMALS,
  isPlantKind,
  isProcessedKind,
  PLANT_SHOP_ORDER,
  PLANTS,
  producerCost,
  RECIPES,
  ZONE_PRODUCTS,
  zoneOf,
} from '../logic/config'
import { plantDepositKey } from '../logic/purchase'
import type { ProductKind, ShopState, ZoneId } from '../logic/types'
import { coinTextureKey } from './fruitArt'
import { type GameLayout, worldToScreen } from './layout'
import { productTextureKey } from './productArt'

export interface SlotPickerOptions {
  readonly scene: Phaser.Scene
  readonly layout: GameLayout
  readonly theme: Theme
  readonly i18n: I18n
  readonly state: ShopState
  readonly zone: ZoneId
  readonly slot: number
  /** Set when the slot already holds a crop, animal or machine. */
  readonly current?: ProductKind
  /** Shop-originated pickers sit in the middle of the panel instead of the slot. */
  readonly centered?: boolean
  readonly onSelect: (product: ProductKind) => void
  readonly onClose: () => void
}

const PADDING = 11
const HEADER_H = 52
const COLUMNS = 2
const BUTTON_W = 124
const BUTTON_H = 64
const GAP = 8

function pickerProducts(zone: ZoneId): readonly ProductKind[] {
  if (zone === 'fruit' || zone === 'veg') {
    return PLANT_SHOP_ORDER.filter((product) => zoneOf(product) === zone)
  }
  return ZONE_PRODUCTS[zone]
}

export class SlotPicker {
  private readonly root: Phaser.GameObjects.Container
  private destroyed = false

  constructor(options: SlotPickerOptions) {
    const { scene, layout, theme, state, zone, slot, i18n } = options
    const ui = layout.ui
    const products = pickerProducts(zone)
    const rows = Math.ceil(products.length / COLUMNS)
    const width = (PADDING * 2 + COLUMNS * BUTTON_W + (COLUMNS - 1) * GAP) * ui
    const height = (PADDING * 2 + HEADER_H + rows * BUTTON_H + (rows - 1) * GAP) * ui
    const point = slotPoint(layout, zone, slot) ?? layout.map.playerStart
    const screen = worldToScreen(layout, point)
    const x = options.centered
      ? layout.width / 2
      : Math.max(width / 2 + 10 * ui, Math.min(layout.width - width / 2 - 10 * ui, screen.x))
    const bottom = Math.max(150 * ui, screen.y - 38 * layout.worldScale * ui)
    const y = options.centered
      ? layout.height / 2
      : Math.max(
          height / 2 + 84 * ui,
          Math.min(layout.height - height / 2 - 20 * ui, bottom - height / 2),
        )

    const current = options.current
    const currentRefund = current === undefined ? 0 : Math.floor(producerCost(current) * 0.5)
    const subtitle =
      current === undefined
        ? i18n.t('picker.balance', { coins: state.coins })
        : `${i18n.t('picker.balance', { coins: state.coins })} · ${i18n.t('picker.refund', {
            refund: currentRefund,
          })}`

    this.root = scene.add.container(0, 0).setDepth(7200)
    const blocker = scene.add
      .rectangle(0, 0, layout.width, layout.height, theme.overlay, 0.16)
      .setOrigin(0)
      .setInteractive()
    blocker.on('pointerdown', () => options.onClose())
    this.root.add(blocker)

    const panel = scene.add.container(x, y)
    this.root.add(panel)

    const g = scene.add.graphics()
    g.fillStyle(theme.shadow, 0.2)
    g.fillRoundedRect(-width / 2, -height / 2 + 5 * ui, width, height, 18 * ui)
    g.fillStyle(theme.panel, 0.98)
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 18 * ui)
    g.lineStyle(3 * ui, theme.accent, 0.9)
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, 18 * ui)
    if (!options.centered) {
      g.fillStyle(theme.accent, 0.9)
      g.fillTriangle(-10 * ui, height / 2 - ui, 10 * ui, height / 2 - ui, 0, height / 2 + 13 * ui)
    }
    panel.add(g)

    // The panel swallows taps on its own padding; without it the full-screen
    // blocker behind the panel would close the chooser from a harmless tap.
    const swallow = scene.add.zone(0, 0, width, height).setInteractive()
    panel.add(swallow)

    const title = scene.add
      .text(
        0,
        -height / 2 + 21 * ui,
        i18n.t(pickerTitle(zone, current !== undefined)),
        textStyle(theme, 18 * ui, theme.text, true),
      )
      .setOrigin(0.5)
    panel.add(title)

    const sub = scene.add
      .text(0, -height / 2 + 42 * ui, subtitle, textStyle(theme, 13 * ui, theme.textMuted, false))
      .setOrigin(0.5)
    panel.add(sub)

    const close = scene.add
      .text(
        width / 2 - 17 * ui,
        -height / 2 + 17 * ui,
        '×',
        textStyle(theme, 22 * ui, theme.textMuted, true),
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    close.on('pointerdown', () => options.onClose())
    panel.add(close)

    products.forEach((product, index) => {
      const column = index % COLUMNS
      const row = Math.floor(index / COLUMNS)
      const bx = -width / 2 + (PADDING + column * (BUTTON_W + GAP) + BUTTON_W / 2) * ui
      const by = -height / 2 + (PADDING + HEADER_H + row * (BUTTON_H + GAP) + BUTTON_H / 2) * ui
      const cost = producerCost(product)
      const deposit =
        current === undefined && isPlantKind(product)
          ? (state.deposits[plantDepositKey(product, slot)] ?? 0)
          : 0
      // A swap refunds half of the old product in the same transaction, so the
      // button shows what the player actually pays now: cost minus refund.
      const price =
        current === undefined ? Math.max(0, cost - deposit) : Math.max(0, cost - currentRefund)
      const installedElsewhere =
        !isPlantKind(product) &&
        current !== product &&
        state.producers.some((producer) => producer.product === product)
      const enabled = current === product || (!installedElsewhere && state.coins >= price)
      panel.add(
        this.choiceButton(
          options,
          product,
          bx,
          by,
          price,
          enabled,
          current === product,
          installedElsewhere,
        ),
      )
    })
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.root.destroy(true)
  }

  private choiceButton(
    options: SlotPickerOptions,
    product: ProductKind,
    x: number,
    y: number,
    price: number,
    enabled: boolean,
    current: boolean,
    installedElsewhere: boolean,
  ): Phaser.GameObjects.Container {
    const { scene, theme, i18n } = options
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

    const icon = scene.add.image(-43 * ui, 0, productTextureKey(product)).setScale(0.6 * ui)
    if (!enabled) icon.setAlpha(0.5)
    button.add(icon)

    const name = scene.add
      .text(
        -26 * ui,
        -17 * ui,
        producerName(options, product),
        textStyle(theme, 10.5 * ui, enabled ? theme.text : theme.textMuted, true),
      )
      .setOrigin(0, 0.5)
    button.add(name)

    if (current) {
      // The installed product is a "keep this" choice, not a purchase, so the
      // check replaces the price instead of crowding it in the corner.
      const mark = scene.add
        .text(-26 * ui, 5 * ui, '✓', textStyle(theme, 18 * ui, cssColor(theme.accentAlt), true))
        .setOrigin(0, 0.5)
      button.add(mark)
    } else if (installedElsewhere) {
      button.add(
        scene.add
          .text(
            -26 * ui,
            5 * ui,
            i18n.t('picker.installed'),
            textStyle(theme, 9 * ui, theme.textMuted, true),
          )
          .setOrigin(0, 0.5),
      )
    } else {
      const coin = scene.add.image(-26 * ui, 7 * ui, coinTextureKey()).setScale(0.34 * ui)
      if (!enabled) coin.setAlpha(0.5)
      button.add(coin)
      button.add(
        scene.add
          .text(
            -17 * ui,
            7 * ui,
            String(price),
            textStyle(theme, 13 * ui, enabled ? theme.text : theme.textMuted, true),
          )
          .setOrigin(0, 0.5),
      )
    }

    button.add(
      scene.add
        .text(
          -26 * ui,
          22 * ui,
          pickerStat(options, product),
          textStyle(theme, 9 * ui, theme.textMuted, false),
        )
        .setOrigin(0, 0.5),
    )

    const zone = scene.add.zone(0, 0, buttonW, buttonH).setInteractive({ useHandCursor: true })
    zone.on('pointerdown', () => {
      if (!enabled) return
      options.onSelect(product)
    })
    button.add(zone)
    return button
  }
}

function slotPoint(
  layout: GameLayout,
  zone: ZoneId,
  slot: number,
): { x: number; y: number } | undefined {
  if (zone === 'fruit' || zone === 'veg') return layout.map.plantSlots[zone][slot]
  if (zone === 'farm') return layout.map.animalPens[slot]
  return layout.map.stationSlots[slot]
}

function pickerTitle(zone: ZoneId, swapping: boolean): string {
  if (zone === 'fruit' || zone === 'veg') {
    return swapping ? 'picker.swapTitle' : 'picker.plantTitle'
  }
  if (zone === 'farm') return swapping ? 'picker.animalSwapTitle' : 'picker.animalTitle'
  return swapping ? 'picker.machineSwapTitle' : 'picker.machineTitle'
}

function producerName(options: SlotPickerOptions, product: ProductKind): string {
  if (isPlantKind(product)) return options.i18n.t(`product.${product}`)
  return options.i18n.t(`producer.${product}`)
}

function pickerStat(options: SlotPickerOptions, product: ProductKind): string {
  const { i18n } = options
  if (isPlantKind(product)) {
    return i18n.t('picker.grow', {
      seconds: Math.round(PLANTS[product].growMs / 1000),
    })
  }
  if (product === 'fish') return i18n.t('picker.fishByHand')
  if (isProcessedKind(product)) {
    return RECIPES[product].inputs
      .map((input) => {
        const name =
          'product' in input
            ? i18n.t(`product.${input.product}`)
            : i18n.t(input.category === 'fruit' ? 'picker.fruit' : 'picker.veg')
        return input.count > 1 ? `${input.count}× ${name}` : name
      })
      .join(' + ')
  }
  return i18n.t('picker.cycle', {
    seconds: Math.round(ANIMALS[product].cycleMs / 1000),
  })
}
