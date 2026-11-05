import { cssColor, type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { gameColors } from '../colors'
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
import { goalCost, nextGoal } from '../logic/goals'
import { plantDepositKey } from '../logic/purchase'
import type { ProductKind, ShopState, ZoneId } from '../logic/types'
import { createCloseButton } from './dialog'
import { drawPopoverFrame } from './frames'
import { coinTextureKey } from './fruitArt'
import type { GameLayout } from './layout'
import { createNextTag } from './nextTag'
import { productTextureKey } from './productArt'
import { TapHint } from './TapHint'
import { type WorldCamera, worldToScreen } from './worldCamera'

export interface SlotPickerOptions {
  readonly scene: Phaser.Scene
  readonly layout: GameLayout
  readonly camera: WorldCamera
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
  /** Explains a disabled card without closing the chooser. */
  readonly onBlocked: (reason: 'insufficient' | 'installed') => void
  readonly onClose: () => void
}

const PADDING = 14
const HEADER_H = 64
const COLUMNS = 2
const BUTTON_H = 82
const GAP = 10

function pickerProducts(zone: ZoneId): readonly ProductKind[] {
  if (zone === 'fruit' || zone === 'veg') {
    return PLANT_SHOP_ORDER.filter((product) => zoneOf(product) === zone)
  }
  return ZONE_PRODUCTS[zone]
}

export class SlotPicker {
  private readonly root: Phaser.GameObjects.Container
  private readonly hint?: TapHint
  private destroyed = false

  constructor(options: SlotPickerOptions) {
    const { scene, layout, camera, theme, state, zone, slot, i18n } = options
    const ui = layout.ui
    const font = layout.text
    const products = pickerProducts(zone)
    // Recommend the same purchase the shop cards do, so the pill and the
    // highlighted frame point at one product instead of leaving a stale hint
    // on the top bar.
    const goal = nextGoal(state)
    const goalProduct =
      goal !== null && goal.type === 'producer' && zoneOf(goal.product) === zone
        ? goal.product
        : undefined
    const goalAffordable = goal !== null && state.coins >= goalCost(state, goal)
    const rows = Math.ceil(products.length / COLUMNS)
    // The chooser is a decision surface, not a tooltip: give it the width of a
    // dialog on every device and let the two columns grow with the screen.
    const width = Math.min(560 * ui, layout.width - 24 * ui)
    const buttonWidth = (width - (PADDING * 2 + GAP * (COLUMNS - 1)) * ui) / COLUMNS
    const buttonHeight = BUTTON_H * ui
    const height = (PADDING * 2 + HEADER_H) * ui + rows * buttonHeight + (rows - 1) * GAP * ui
    const point = slotPoint(layout, zone, slot) ?? layout.map.playerStart
    const screen = worldToScreen(camera, point)
    const x = options.centered
      ? layout.width / 2
      : Math.max(width / 2 + 10 * ui, Math.min(layout.width - width / 2 - 10 * ui, screen.x))
    const bottom = Math.max(150 * ui, screen.y - 38 * camera.scale)
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
      .rectangle(0, 0, layout.width, layout.height, theme.overlay, 0.24)
      .setOrigin(0)
      .setInteractive()
    blocker.on('pointerdown', () => options.onClose())
    this.root.add(blocker)

    const panel = scene.add.container(x, y)
    this.root.add(panel)

    const g = scene.add.graphics()
    drawPopoverFrame(g, -width / 2, -height / 2, width, height, theme, 20 * ui)
    if (!options.centered) {
      g.fillStyle(gameColors.barkDark, 1)
      g.fillTriangle(-10 * ui, height / 2 - ui, 10 * ui, height / 2 - ui, 0, height / 2 + 12 * ui)
      g.fillStyle(theme.panel, 1)
      g.fillTriangle(
        -7 * ui,
        height / 2 - 3 * ui,
        7 * ui,
        height / 2 - 3 * ui,
        0,
        height / 2 + 8 * ui,
      )
    }
    panel.add(g)

    // The panel swallows taps on its own padding; without it the full-screen
    // blocker behind the panel would close the chooser from a harmless tap.
    const swallow = scene.add.zone(0, 0, width, height).setInteractive()
    panel.add(swallow)

    const title = scene.add
      .text(
        -width / 2 + 20 * ui,
        -height / 2 + 22 * ui,
        i18n.t(pickerTitle(zone, current !== undefined)),
        textStyle(theme, font.label, theme.text, true),
      )
      .setOrigin(0, 0.5)
    panel.add(title)

    const sub = scene.add
      .text(
        -width / 2 + 20 * ui,
        -height / 2 + 46 * ui,
        subtitle,
        textStyle(theme, font.caption, theme.textMuted, false),
      )
      .setOrigin(0, 0.5)
    panel.add(sub)

    panel.add(
      createCloseButton(
        scene,
        width / 2 - 26 * ui,
        -height / 2 + 24 * ui,
        theme,
        () => options.onClose(),
        ui,
      ),
    )

    products.forEach((product, index) => {
      const column = index % COLUMNS
      const row = Math.floor(index / COLUMNS)
      const bx = -width / 2 + PADDING * ui + column * (buttonWidth + GAP * ui) + buttonWidth / 2
      const by =
        -height / 2 + (PADDING + HEADER_H) * ui + row * (buttonHeight + GAP * ui) + buttonHeight / 2
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
          buttonWidth,
          price,
          enabled,
          current === product,
          installedElsewhere,
          product === goalProduct,
          goalAffordable,
        ),
      )
    })

    // The first-sale guide has no hand over the bed: stopping there opens this
    // chooser by itself. The finger belongs on the apple card, which is the
    // only real tap the player has to make.
    const appleIndex = products.indexOf('apple')
    if (
      state.tutorial === 'buyTree' &&
      zone === 'fruit' &&
      current === undefined &&
      appleIndex >= 0
    ) {
      const column = appleIndex % COLUMNS
      const row = Math.floor(appleIndex / COLUMNS)
      const bx = -width / 2 + PADDING * ui + column * (buttonWidth + GAP * ui) + buttonWidth / 2
      const by =
        -height / 2 + (PADDING + HEADER_H) * ui + row * (buttonHeight + GAP * ui) + buttonHeight / 2
      this.hint = new TapHint(scene, theme, ui)
      // The left half carries the name and price; the finger stays in the
      // quiet bottom-right corner so it never sits on the number.
      this.hint.setPosition(bx + buttonWidth / 2 - 24 * ui, by + buttonHeight / 2 - 14 * ui)
      this.hint.addTo(panel)
      this.hint.update(scene.time.now)
    }
  }

  update(time: number): void {
    this.hint?.update(time)
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
    buttonW: number,
    price: number,
    enabled: boolean,
    current: boolean,
    installedElsewhere: boolean,
    goal: boolean,
    goalAffordable: boolean,
  ): Phaser.GameObjects.Container {
    const { scene, theme, i18n } = options
    const ui = options.layout.ui
    const font = options.layout.text
    const buttonH = BUTTON_H * ui
    const button = scene.add.container(x, y)
    const g = scene.add.graphics()
    // Unavailable cards step back: lighter paper, a hairline border and no
    // accent. They stay tappable so the toast can explain the shortfall.
    g.fillStyle(enabled ? theme.surface : theme.surfaceAlt, enabled ? 1 : 0.35)
    g.fillRoundedRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, 14 * ui)
    g.lineStyle(
      (goal || current ? 2.5 : 1.5) * ui,
      goal ? theme.accent : current ? theme.accentAlt : theme.borderSoft,
      enabled || goal || current ? 1 : 0.45,
    )
    g.strokeRoundedRect(-buttonW / 2, -buttonH / 2, buttonW, buttonH, 14 * ui)
    button.add(g)

    if (goal) {
      const tag = createNextTag({
        scene,
        theme,
        i18n,
        ui,
        affordable: goalAffordable,
      })
      tag.container.setPosition(buttonW / 2 - tag.width / 2 - 6 * ui, -buttonH / 2)
      button.add(tag.container)
    }

    const icon = scene.add
      .image(-buttonW / 2 + 32 * ui, -buttonH / 2 + 32 * ui, productTextureKey(product))
      .setScale(0.62 * ui)
    if (!enabled) icon.setAlpha(0.45)
    button.add(icon)

    const name = scene.add
      .text(
        -buttonW / 2 + 58 * ui,
        -buttonH / 2 + 22 * ui,
        producerName(options, product),
        textStyle(theme, font.body, enabled ? theme.text : theme.textMuted, true),
      )
      .setOrigin(0, 0.5)
    button.add(name)

    if (current) {
      // The installed product is a "keep this" choice, not a purchase, so the
      // check replaces the price instead of crowding it in the corner.
      const mark = scene.add
        .text(
          -buttonW / 2 + 58 * ui,
          -buttonH / 2 + 48 * ui,
          '✓',
          textStyle(theme, 18 * ui, cssColor(theme.accentAlt), true),
        )
        .setOrigin(0, 0.5)
      button.add(mark)
    } else if (installedElsewhere) {
      button.add(
        scene.add
          .text(
            -buttonW / 2 + 58 * ui,
            -buttonH / 2 + 48 * ui,
            i18n.t('picker.installed'),
            textStyle(theme, font.caption, theme.textMuted, true),
          )
          .setOrigin(0, 0.5),
      )
    } else {
      const coin = scene.add
        .image(-buttonW / 2 + 58 * ui, -buttonH / 2 + 49 * ui, coinTextureKey())
        .setScale(0.34 * ui)
      if (!enabled) coin.setAlpha(0.5)
      button.add(coin)
      button.add(
        scene.add
          .text(
            -buttonW / 2 + 67 * ui,
            -buttonH / 2 + 49 * ui,
            String(price),
            textStyle(theme, font.body, enabled ? theme.text : theme.textMuted, true),
          )
          .setOrigin(0, 0.5),
      )
    }

    button.add(
      scene.add
        .text(
          -buttonW / 2 + 58 * ui,
          -buttonH / 2 + 70 * ui,
          pickerStat(options, product),
          textStyle(theme, font.caption, theme.textMuted, false),
        )
        .setOrigin(0, 0.5),
    )

    const zone = scene.add.zone(0, 0, buttonW, buttonH).setInteractive({ useHandCursor: true })
    zone.on('pointerdown', () => {
      if (!enabled) {
        options.onBlocked(installedElsewhere ? 'installed' : 'insufficient')
        return
      }
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
        if ('product' in input) {
          const name = i18n.t(`product.${input.product}`)
          return input.count > 1 ? `${input.count}× ${name}` : name
        }
        const name = i18n.t(
          'pool' in input
            ? 'picker.grill'
            : input.category === 'fruit'
              ? 'picker.fruit'
              : 'picker.veg',
        )
        return input.count > 1 ? `${input.count}× ${name}` : name
      })
      .join(' + ')
  }
  return i18n.t('picker.cycle', {
    seconds: Math.round(ANIMALS[product].cycleMs / 1000),
  })
}
