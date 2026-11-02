import { Button, type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import {
  ANIMALS,
  animalNeedsTrough,
  isAnimalProductKind,
  isPlantKind,
  isProcessedKind,
  PLANT_SHOP_ORDER,
  PLANTS,
  productPrice,
  RECIPES,
  STAFF_ORDER,
  shelfCapacity,
  shelfUpgradeCost,
  shelfUpgradeMax,
  UPGRADE_EFFECT,
  UPGRADE_ORDER,
  ZONE_ORDER,
  ZONES,
  zoneOf,
} from '../logic/config'
import { type Goal, goalCost, nextGoal } from '../logic/goals'
import { plantedCount, staffCost, staffMax, upgradeCost, upgradeMax } from '../logic/purchase'
import type {
  PlantKind,
  ProductKind,
  ShopState,
  StaffKind,
  UpgradeKind,
  ZoneId,
} from '../logic/types'
import { ANIMAL_SCALE } from './animalArt'
import { drawHeaderRibbon, drawPanelFrame } from './frames'
import type { GameLayout } from './layout'
import { createNextTag } from './nextTag'
import { productTextureKey } from './productArt'
import { staffPortraitKey } from './staffArt'
import { drawToolIcon } from './toolArt'

/** Cards stop growing past this height so portrait panels stay balanced. */
const MAX_CARD_HEIGHT = 205
const MAX_STAFF_CARD_HEIGHT = 260

export interface ShopPanelOptions {
  readonly scene: Phaser.Scene
  readonly layout: GameLayout
  readonly theme: Theme
  readonly i18n: I18n
  readonly state: ShopState
  readonly onPurchasePlant: (product: PlantKind) => ShopState
  readonly onOpenProducerPicker: (zone: 'farm' | 'kitchen', slot: number) => void
  readonly onUnlockZone: (zone: ZoneId) => ShopState
  readonly onRemove: (id: number) => ShopState
  readonly onUpgrade: (kind: UpgradeKind) => ShopState
  readonly onShelfUpgrade: (zone: ZoneId) => ShopState
  readonly onStaff: (kind: StaffKind) => ShopState
  readonly onClose: () => void
}

type Tab = 'production' | 'tools' | 'staff'

interface DynamicButton {
  readonly button: Button
  readonly cost: number
  readonly deposit: number
  readonly format: (remaining: number) => string
  readonly locked?: boolean
  readonly lockedLabel?: string
  enabled: boolean
  lastText: string
}

export class ShopPanel {
  private readonly options: ShopPanelOptions
  private readonly root: Phaser.GameObjects.Container
  private readonly chrome: Phaser.GameObjects.Container
  private body?: Phaser.GameObjects.Container
  private state: ShopState
  private tab: Tab = 'production'
  private zone: ZoneId = 'fruit'
  private closed = false
  private structureKey = ''
  private bodyDirty = false
  private balanceText?: Phaser.GameObjects.Text
  private readonly tabButtons = new Map<Tab, Button>()
  private readonly zoneButtons = new Map<ZoneId, Button>()
  private readonly dynamicButtons: DynamicButton[] = []
  private zoneChips?: Phaser.GameObjects.Container
  private tabHighlight?: Phaser.GameObjects.Graphics
  private zoneHighlight?: Phaser.GameObjects.Graphics
  /** Vertical rhythm shared by the chrome and the body, rebuilt per render. */
  private tabY = 76
  private tabHeight = 40
  private chipY = 124
  private chipHeight = 38
  private bodyTop = 158
  private toolsTop = 112

  constructor(options: ShopPanelOptions) {
    this.options = options
    this.state = options.state
    const { scene } = options
    this.root = scene.add.container(0, 0).setDepth(7000)
    this.root.setName('shop-root')
    const blocker = scene.add
      .rectangle(0, 0, options.layout.width, options.layout.height, options.theme.overlay, 0.68)
      .setOrigin(0)
    this.root.add(blocker)

    this.chrome = scene.add.container(0, 0)
    this.chrome.setName('shop-chrome')
    this.root.add(this.chrome)
    this.renderChrome()
    this.renderBody()
  }

  setState(state: ShopState): void {
    this.state = state
    if (!this.closed) this.bodyDirty = true
  }

  update(state: ShopState): void {
    if (this.closed) return
    this.state = state
    if (this.bodyDirty || this.structureKeyFor(state) !== this.structureKey) {
      this.bodyDirty = false
      this.renderBody()
      return
    }
    this.refreshDynamic()
  }

  destroy(): void {
    this.closed = true
    this.root.destroy(true)
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.options.onClose()
    this.root.destroy(true)
  }

  private renderChrome(): void {
    const { scene, layout, theme, i18n } = this.options
    const panelX = (layout.width - layout.panelWidth) / 2
    const panelY = (layout.height - layout.panelHeight) / 2
    this.chrome.setPosition(panelX, panelY)
    this.tabButtons.clear()
    this.zoneButtons.clear()
    this.balanceText = undefined

    const ui = layout.ui
    const w = layout.panelWidth
    const h = layout.panelHeight
    const g = scene.add.graphics()
    drawPanelFrame(g, 0, 0, w, h, theme, theme.radiusLarge)
    drawHeaderRibbon(g, 18 * ui, 18, w - 36 * ui, Math.max(58, 26 * ui + 20), 14 * ui)
    this.chrome.add(g)

    const title = scene.add
      .text(30 * ui, 38, i18n.t('shop.title'), textStyle(theme, 26 * ui, '#fff7e8', true))
      .setOrigin(0, 0.5)
    this.chrome.add(title)

    this.balanceText = scene.add
      .text(
        w - 96 * ui,
        38,
        i18n.t('shop.balance', { coins: this.state.coins }),
        textStyle(theme, 18 * ui, '#fff7e8', true),
      )
      .setOrigin(1, 0.5)
    this.chrome.add(this.balanceText)

    this.chrome.add(
      new Button(scene, w - 38 * ui, 38, '×', theme, {
        width: 48 * ui,
        height: 48 * ui,
        fontSize: 26 * ui,
        minHitSize: 64 * ui,
        variant: 'soft',
        onClick: () => this.close(),
      }),
    )

    // Chrome keeps a compact, fixed vertical rhythm: scaled fonts still fit, and
    // short landscape panels stay tall enough for the cards below.
    this.tabHeight = 40 * ui
    this.chipHeight = 38 * ui
    this.tabY = 58 + this.tabHeight / 2
    this.chipY = this.tabY + this.tabHeight / 2 + 10 + this.chipHeight / 2
    this.bodyTop = this.chipY + this.chipHeight / 2 + 12
    this.toolsTop = this.tabY + this.tabHeight / 2 + 14

    this.renderTabs(w)
    this.renderZoneChips(w)
    this.tabHighlight = scene.add.graphics()
    this.zoneHighlight = scene.add.graphics()
    this.chrome.add([this.tabHighlight, this.zoneHighlight])
    this.applyChromeSelection()
  }

  private renderTabs(w: number): void {
    const { scene, theme, i18n } = this.options
    const ui = this.options.layout.ui
    const y = this.tabY
    const gap = 6 * ui
    const tabWidth = (w - 60 * ui - gap * 2) / 3
    const tabs: readonly { readonly tab: Tab; readonly label: string }[] = [
      { tab: 'production', label: i18n.t('shop.production') },
      { tab: 'tools', label: i18n.t('shop.tools') },
      { tab: 'staff', label: i18n.t('shop.staff') },
    ]
    tabs.forEach((entry, index) => {
      const button = new Button(
        scene,
        30 * ui + tabWidth / 2 + index * (tabWidth + gap),
        y,
        entry.label,
        theme,
        {
          width: tabWidth,
          height: this.tabHeight,
          fontSize: 15 * ui,
          minHitSize: 64 * ui,
          variant: 'soft',
          onClick: () => this.setTab(entry.tab),
        },
      )
      this.tabButtons.set(entry.tab, button)
      this.chrome.add(button)
    })
  }

  private renderZoneChips(w: number): void {
    const { scene, theme, i18n } = this.options
    const container = scene.add.container(0, 0)
    this.zoneChips = container
    this.chrome.add(container)
    const ui = this.options.layout.ui
    const y = this.chipY
    const gap = 6 * ui
    const chipWidth = (w - 60 * ui - gap * 3) / 4
    ZONE_ORDER.forEach((zone, index) => {
      const button = new Button(
        scene,
        30 * ui + chipWidth / 2 + index * (chipWidth + gap),
        y,
        i18n.t(`zone.${zone}`),
        theme,
        {
          width: chipWidth,
          height: this.chipHeight,
          fontSize: 13 * ui,
          minHitSize: 64 * ui,
          variant: 'soft',
          onClick: () => this.setZone(zone),
        },
      )
      button.setName(`chip-${zone}`)
      this.zoneButtons.set(zone, button)
      container.add(button)
    })
  }

  private setTab(tab: Tab): void {
    if (this.tab === tab) return
    this.tab = tab
    this.applyChromeSelection()
    this.bodyDirty = true
  }

  private setZone(zone: ZoneId): void {
    if (this.zone === zone) return
    this.zone = zone
    this.applyChromeSelection()
    this.bodyDirty = true
  }

  private applyChromeSelection(): void {
    const { theme } = this.options
    this.zoneChips?.setVisible(this.tab === 'production')
    const w = this.options.layout.panelWidth
    const ui = this.options.layout.ui
    const gap = 6 * ui
    const tabWidth = (w - 60 * ui - gap * 2) / 3
    const tabOrder: readonly Tab[] = ['production', 'tools', 'staff']
    const tabIndex = tabOrder.indexOf(this.tab)
    this.tabHighlight?.clear()
    this.tabHighlight?.fillStyle(theme.accent, 1)
    this.tabHighlight?.fillRoundedRect(
      30 * ui + tabIndex * (tabWidth + gap) + 12 * ui,
      this.tabY + this.tabHeight / 2 - 4 * ui,
      tabWidth - 24 * ui,
      4 * ui,
      2 * ui,
    )
    // The NEXT pill lives on the card itself; a dot on the owning tab tells the
    // player where to look before that card is on screen.
    if (this.goal()?.type === 'upgrade' && this.tab !== 'tools') {
      const toolsIndex = tabOrder.indexOf('tools')
      this.tabHighlight?.fillStyle(theme.accent, 1)
      this.tabHighlight?.fillCircle(
        30 * ui + toolsIndex * (tabWidth + gap) + tabWidth - 9 * ui,
        this.tabY - this.tabHeight / 2 + 4 * ui,
        4 * ui,
      )
    }

    this.zoneHighlight?.clear()
    if (this.tab !== 'production') return
    const chipWidth = (w - 60 * ui - gap * 3) / 4
    const zoneIndex = ZONE_ORDER.indexOf(this.zone)
    this.zoneHighlight?.fillStyle(theme.accent, 1)
    this.zoneHighlight?.fillRoundedRect(
      30 * ui + zoneIndex * (chipWidth + gap) + 12 * ui,
      this.chipY + this.chipHeight / 2 - 4 * ui,
      chipWidth - 24 * ui,
      4 * ui,
      2 * ui,
    )
    const goalZone = this.goalZone()
    if (goalZone !== null && goalZone !== this.zone) {
      const goalIndex = ZONE_ORDER.indexOf(goalZone)
      this.zoneHighlight?.fillStyle(theme.accent, 1)
      this.zoneHighlight?.fillCircle(
        30 * ui + goalIndex * (chipWidth + gap) + chipWidth - 10 * ui,
        this.chipY - this.chipHeight / 2 + 4 * ui,
        4 * ui,
      )
    }

    for (const [tab, button] of this.tabButtons) {
      button.setAlpha(this.tab === tab ? 1 : 0.7)
    }
    for (const [zone, button] of this.zoneButtons) {
      const inactive = this.state.zones[zone] ? 0.7 : 0.4
      button.setAlpha(this.zone === zone ? 1 : inactive)
    }
  }

  private renderBody(): void {
    this.bodyDirty = false
    const { scene, layout } = this.options
    const panelX = (layout.width - layout.panelWidth) / 2
    const panelY = (layout.height - layout.panelHeight) / 2
    this.body?.destroy(true)
    this.dynamicButtons.length = 0
    this.body = scene.add.container(panelX, panelY)
    this.body.setName(`shop-body-${this.tab}-${this.zone}`)
    this.root.add(this.body)
    const w = layout.panelWidth
    const h = layout.panelHeight
    const ui = layout.ui
    const top = this.tab === 'production' ? this.bodyTop : this.toolsTop
    const bottom = h - 20 * ui

    if (this.tab === 'production') {
      if (!this.state.zones[this.zone]) {
        this.renderLockedZone(this.body, this.zone, w, top, bottom)
      } else if (this.zone === 'fruit' || this.zone === 'veg') {
        this.renderPlants(this.body, this.zone, w, top, bottom)
      } else {
        this.renderProducers(this.body, this.zone, w, top, bottom)
      }
    } else if (this.tab === 'tools') {
      this.renderTools(this.body, w, top, bottom)
    } else {
      this.renderStaff(this.body, w, top, bottom)
    }

    this.structureKey = this.structureKeyFor(this.state)
    this.refreshDynamic()
    this.applyChromeSelection()
  }

  private renderLockedZone(
    parent: Phaser.GameObjects.Container,
    zone: ZoneId,
    w: number,
    top: number,
    bottom: number,
  ): void {
    const { scene, theme, i18n } = this.options
    const ui = this.options.layout.ui
    const config = ZONES[zone]
    const height = Math.min(220 * ui, bottom - top)
    const card = scene.add.container(30 * ui + (w - 60 * ui) / 2, top + height / 2)
    const g = scene.add.graphics()
    g.fillStyle(theme.surface, 1)
    g.fillRoundedRect(-(w - 60 * ui) / 2, -height / 2, w - 60 * ui, height, 18 * ui)
    g.lineStyle(2 * ui, theme.borderSoft, 1)
    g.strokeRoundedRect(-(w - 60 * ui) / 2, -height / 2, w - 60 * ui, height, 18 * ui)
    g.fillStyle(theme.accentAlt, 0.12)
    g.fillRoundedRect(
      -(w - 60 * ui) / 2 + 12 * ui,
      -height / 2 + 12 * ui,
      w - 84 * ui,
      46 * ui,
      12 * ui,
    )
    card.add(g)
    card.add(
      scene.add
        .text(
          0,
          -height / 2 + 36 * ui,
          i18n.t(`zone.${zone}`),
          textStyle(theme, 20 * ui, theme.text, true),
        )
        .setOrigin(0.5),
    )
    card.add(
      scene.add
        .text(
          0,
          -height / 2 + 80 * ui,
          zone === 'veg'
            ? i18n.t('shop.zoneHint')
            : i18n.t('shop.zoneLocked', { zone: i18n.t(`zone.${zone}`) }),
          textStyle(theme, 13 * ui, theme.textMuted),
        )
        .setOrigin(0.5),
    )
    if (config.includes !== null) {
      const includes = config.includes
      card.add(
        scene.add
          .text(
            0,
            -height / 2 + 104 * ui,
            i18n.t('shop.includes', { name: this.productName(includes) }),
            textStyle(theme, 13 * ui, theme.textMuted),
          )
          .setOrigin(0.5),
      )
    }
    if (zone === 'veg') {
      const locked = this.state.served === 0
      const button = new Button(scene, 0, height / 2 - 36 * ui, i18n.t('shop.unlockFree'), theme, {
        width: w - 120 * ui,
        height: 48 * ui,
        fontSize: 15 * ui,
        minHitSize: 64,
        variant: locked ? 'soft' : 'primary',
        onClick: () => {
          const next = this.options.onUnlockZone(zone)
          this.setState(next)
        },
      })
      button.setEnabled(!locked)
      if (locked) button.setText(i18n.t('shop.afterFirstSale'))
      card.add(button)
    } else {
      const cost = config.unlockCost
      const button = new Button(
        scene,
        0,
        height / 2 - 36 * ui,
        i18n.t('shop.unlockZone', { cost }),
        theme,
        {
          width: w - 120 * ui,
          height: 48 * ui,
          fontSize: 15 * ui,
          minHitSize: 64,
          variant: 'primary',
          onClick: () => {
            const next = this.options.onUnlockZone(zone)
            this.setState(next)
          },
        },
      )
      this.track(button, cost, 0, (remaining) => i18n.t('shop.unlockZone', { cost: remaining }))
      card.add(button)
    }
    parent.add(card)
  }

  private renderPlants(
    parent: Phaser.GameObjects.Container,
    zone: 'fruit' | 'veg',
    w: number,
    top: number,
    bottom: number,
  ): void {
    const ui = this.options.layout.ui
    const gap = 10 * ui
    const gridTop = bottom - top >= 360 * ui ? this.renderShelfRow(parent, zone, w, top) : top
    const products = PLANT_SHOP_ORDER.filter((product) => zoneOf(product) === zone)
    const columns = w > 700 ? 3 : 2
    const rows = Math.ceil(products.length / columns)
    const cardW = (w - 60 * ui - gap * (columns - 1)) / columns
    const cardH = Math.min((bottom - gridTop - gap * (rows - 1)) / rows, MAX_CARD_HEIGHT * ui)
    const topOffset = gridTop + (bottom - gridTop - (rows * cardH + gap * (rows - 1))) / 2
    products.forEach((product, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const x = 30 * ui + column * (cardW + gap) + cardW / 2
      const y = topOffset + row * (cardH + gap) + cardH / 2
      parent.add(this.plantCard(product, x, y, cardW, cardH))
    })
  }

  private plantCard(
    product: PlantKind,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.Container {
    const { scene, theme, i18n } = this.options
    const card = scene.add.container(x, y)
    const ui = this.options.layout.ui
    const g = scene.add.graphics()
    const goal = this.isGoalProduct(product)
    this.drawCardFace(g, width, height, goal)
    card.add(g)
    if (goal) this.addNextTag(card, width, height)

    card.add(
      scene.add
        .image(-width / 2 + 34 * ui, -height / 2 + 38 * ui, productTextureKey(product))
        .setScale(0.72 * ui),
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 64 * ui,
          -height / 2 + 28 * ui,
          this.productName(product),
          textStyle(theme, 17 * ui, theme.text, true),
        )
        .setOrigin(0, 0.5),
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 64 * ui,
          -height / 2 + 54 * ui,
          i18n.t('shop.planted', { count: plantedCount(this.state, product) }),
          textStyle(theme, 12 * ui, theme.textMuted, true),
        )
        .setOrigin(0, 0.5),
    )

    const config = PLANTS[product]
    card.add(
      scene.add
        .text(
          -width / 2 + 20 * ui,
          -height / 2 + 72 * ui,
          i18n.t('shop.stats.plant', {
            price: config.price,
            grow: Math.round(config.growMs / 1000),
          }),
          textStyle(theme, 12 * ui, theme.textMuted),
        )
        .setOrigin(0, 0.5),
    )

    const cost = config.cost
    const buy = new Button(scene, 0, height / 2 - 34 * ui, i18n.t('shop.plant', { cost }), theme, {
      width: width - 36 * ui,
      height: 46 * ui,
      fontSize: 14 * ui,
      minHitSize: 64,
      variant: 'primary',
      onClick: () => {
        const next = this.options.onPurchasePlant(product)
        this.setState(next)
      },
    })
    this.track(buy, cost, 0, (remaining) => i18n.t('shop.plant', { cost: remaining }))
    card.add(buy)

    const planted = this.state.producers.find((producer) => producer.product === product)
    if (planted !== undefined) {
      const refund = Math.floor(cost * 0.5)
      // Narrow cards have no room beside the name, so the refund sits below the stats.
      const narrowRemove = width < 380
      card.add(
        new Button(
          scene,
          narrowRemove ? -width / 2 + 63 * ui : width / 2 - 48 * ui,
          narrowRemove ? -height / 2 + 104 * ui : -height / 2 + 34 * ui,
          i18n.t('shop.removeShort', { refund }),
          theme,
          {
            width: 86 * ui,
            height: 36 * ui,
            fontSize: 11 * ui,
            minHitSize: 56 * ui,
            variant: 'soft',
            onClick: () => {
              const next = this.options.onRemove(planted.id)
              this.setState(next)
            },
          },
        ),
      )
    }

    return card
  }

  private renderProducers(
    parent: Phaser.GameObjects.Container,
    zone: ZoneId,
    w: number,
    top: number,
    bottom: number,
  ): void {
    if (zone !== 'farm' && zone !== 'kitchen') return
    const ui = this.options.layout.ui
    const gap = 10 * ui
    const gridTop = bottom - top >= 360 * ui ? this.renderShelfRow(parent, zone, w, top) : top
    const slots =
      zone === 'farm' ? this.options.layout.map.animalPens : this.options.layout.map.stationSlots
    // Four physical slots read best as a 2 x 2 grid; a 3 + 1 row wastes width
    // and leaves one orphan card.
    const columns = 2
    const rows = Math.ceil(slots.length / columns)
    const cardW = (w - 60 * ui - gap * (columns - 1)) / columns
    const cardH = Math.min((bottom - gridTop - gap * (rows - 1)) / rows, MAX_CARD_HEIGHT * ui)
    const topOffset = gridTop + (bottom - gridTop - (rows * cardH + gap * (rows - 1))) / 2
    slots.forEach((slot, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      parent.add(
        this.slotCard(
          zone,
          slot.index,
          30 * ui + column * (cardW + gap) + cardW / 2,
          topOffset + row * (cardH + gap) + cardH / 2,
          cardW,
          cardH,
        ),
      )
    })
  }

  /**
   * Farm pens and kitchen stations are slots, not products. The card shows what
   * is installed and opens the same chooser as the in-world tool tag, so the
   * player can compare every animal or machine before paying.
   */
  private slotCard(
    zone: 'farm' | 'kitchen',
    slot: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.Container {
    const { scene, theme, i18n } = this.options
    const ui = this.options.layout.ui
    // Short landscape cards have no room for a diet/recipe line once the
    // button is placed; the picker still shows the essential output stats.
    const showDetail = height >= 190 * ui
    const producer = this.state.producers.find(
      (candidate) => candidate.slot === slot && zoneOf(candidate.product) === zone,
    )
    const card = scene.add.container(x, y)
    const g = scene.add.graphics()
    // An empty slot in the recommended zone is where the next purchase goes;
    // the picker itself names the product with the NEXT pill.
    this.drawCardFace(g, width, height, producer === undefined && this.goalZone() === zone)
    card.add(g)

    const slotName = i18n.t(zone === 'farm' ? 'shop.pen' : 'shop.station', { n: slot + 1 })
    card.add(
      scene.add
        .text(-width / 2 + 20 * ui, -height / 2 + 18 * ui, slotName, {
          ...textStyle(theme, 11 * ui, theme.textMuted, true),
        })
        .setOrigin(0, 0.5),
    )

    if (producer === undefined) {
      card.add(
        scene.add
          .text(
            -width / 2 + 20 * ui,
            -height / 2 + 52 * ui,
            i18n.t(zone === 'farm' ? 'shop.emptyPen' : 'shop.emptyStation'),
            textStyle(theme, 18 * ui, theme.text, true),
          )
          .setOrigin(0, 0.5),
      )
      if (showDetail) {
        card.add(
          scene.add
            .text(
              -width / 2 + 20 * ui,
              -height / 2 + 80 * ui,
              i18n.t(zone === 'farm' ? 'shop.emptyPenHint' : 'shop.emptyStationHint'),
              {
                ...textStyle(theme, 12 * ui, theme.textMuted),
                wordWrap: { width: width - 40 * ui },
              },
            )
            .setOrigin(0, 0.5),
        )
      }
      card.add(
        new Button(
          scene,
          0,
          height / 2 - 32 * ui,
          i18n.t(zone === 'farm' ? 'shop.chooseAnimal' : 'shop.chooseMachine'),
          theme,
          {
            width: width - 40 * ui,
            height: 46 * ui,
            fontSize: 14 * ui,
            minHitSize: 64,
            variant: 'primary',
            onClick: () => this.options.onOpenProducerPicker(zone, slot),
          },
        ),
      )
      return card
    }

    card.add(
      scene.add
        .image(-width / 2 + 34 * ui, -height / 2 + 54 * ui, productTextureKey(producer.product))
        .setScale(0.68 * ui),
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 62 * ui,
          -height / 2 + 44 * ui,
          this.producerName(producer.product),
          textStyle(theme, 17 * ui, theme.text, true),
        )
        .setOrigin(0, 0.5),
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 62 * ui,
          -height / 2 + 68 * ui,
          this.producerStats(producer.product),
          textStyle(theme, 12 * ui, theme.textMuted),
        )
        .setOrigin(0, 0.5),
    )
    if (showDetail) {
      card.add(
        scene.add
          .text(
            -width / 2 + 20 * ui,
            -height / 2 + 94 * ui,
            this.producerDetail(producer.product),
            {
              ...textStyle(theme, 12 * ui, theme.textMuted),
              wordWrap: { width: width - 40 * ui },
            },
          )
          .setOrigin(0, 0.5),
      )
    }
    card.add(
      new Button(scene, 0, height / 2 - 32 * ui, i18n.t('shop.replace'), theme, {
        width: width - 40 * ui,
        height: 46 * ui,
        fontSize: 14 * ui,
        minHitSize: 64,
        variant: 'soft',
        onClick: () => this.options.onOpenProducerPicker(zone, slot),
      }),
    )
    return card
  }

  /** Compact per-zone shelf upgrade above the product grid. */
  private renderShelfRow(
    parent: Phaser.GameObjects.Container,
    zone: ZoneId,
    w: number,
    top: number,
  ): number {
    const { scene, theme, i18n } = this.options
    const ui = this.options.layout.ui
    const height = 52 * ui
    const width = w - 60 * ui
    const card = scene.add.container(30 * ui + width / 2, top + height / 2)
    const g = scene.add.graphics()
    g.fillStyle(theme.surface, 1)
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 14 * ui)
    g.lineStyle(2 * ui, theme.borderSoft, 1)
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, 14 * ui)
    card.add(g)

    const icon = scene.add.graphics()
    drawToolIcon(icon, 'shelf', -width / 2 + 30 * ui, 0, 20 * ui)
    card.add(icon)

    const level = this.state.shelfLevels[zone]
    const max = shelfUpgradeMax()
    const capacity = shelfCapacity(level)
    card.add(
      scene.add
        .text(
          -width / 2 + 52 * ui,
          -height / 2 + 16 * ui,
          `${i18n.t('shelf.name', { zone: i18n.t(`zone.${zone}`) })} · ${i18n.t('shop.level', {
            level,
            max,
          })}`,
          textStyle(theme, 14 * ui, theme.text, true),
        )
        .setOrigin(0, 0.5),
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 52 * ui,
          -height / 2 + 34 * ui,
          i18n.t('shelf.capacity', { capacity }),
          textStyle(theme, 11 * ui, theme.textMuted, true),
        )
        .setOrigin(0, 0.5),
    )

    const cost = shelfUpgradeCost(level)
    const buttonWidth = Math.min(176 * ui, width * 0.36)
    const buy = new Button(
      scene,
      width / 2 - buttonWidth / 2 - 12 * ui,
      0,
      cost === null ? i18n.t('shop.max') : i18n.t('shelf.upgrade', { cost }),
      theme,
      {
        width: buttonWidth,
        height: 36 * ui,
        fontSize: 12 * ui,
        minHitSize: 56,
        variant: cost === null ? 'soft' : 'primary',
        onClick: () => {
          const next = this.options.onShelfUpgrade(zone)
          this.setState(next)
        },
      },
    )
    if (cost === null) {
      buy.setEnabled(false)
    } else {
      this.track(buy, cost, 0, (remaining) => i18n.t('shelf.upgrade', { cost: remaining }))
    }
    card.add(buy)
    parent.add(card)
    return top + height + 8 * ui
  }

  private renderTools(
    parent: Phaser.GameObjects.Container,
    w: number,
    top: number,
    bottom: number,
  ): void {
    const ui = this.options.layout.ui
    const gap = 10 * ui
    const columns = w > 1000 ? 3 : 2
    const rows = Math.ceil(UPGRADE_ORDER.length / columns)
    const cardW = (w - 60 * ui - gap * (columns - 1)) / columns
    const cardH = Math.min((bottom - top - gap * (rows - 1)) / rows, MAX_CARD_HEIGHT * ui)
    const gridTop = top + (bottom - top - (rows * cardH + gap * (rows - 1))) / 2
    UPGRADE_ORDER.forEach((kind, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const x = 30 * ui + column * (cardW + gap) + cardW / 2
      const y = gridTop + row * (cardH + gap) + cardH / 2
      parent.add(this.toolCard(kind, x, y, cardW, cardH))
    })
  }

  private toolCard(
    kind: UpgradeKind,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.Container {
    const { scene, theme, i18n } = this.options
    const card = scene.add.container(x, y)
    const ui = this.options.layout.ui
    const g = scene.add.graphics()
    const goal = this.isGoalUpgrade(kind)
    this.drawCardFace(g, width, height, goal)
    card.add(g)
    if (goal) this.addNextTag(card, width, height)

    const icon = scene.add.graphics()
    drawToolIcon(icon, kind, -width / 2 + 38 * ui, -height / 2 + 42 * ui, 24 * ui)
    card.add(icon)
    card.add(
      scene.add
        .text(
          -width / 2 + 64 * ui,
          -height / 2 + 26 * ui,
          i18n.t(`tool.${kind}`),
          textStyle(theme, 16 * ui, theme.text, true),
        )
        .setOrigin(0, 0.5),
    )
    const level = this.state.upgrades[kind]
    const max = upgradeMax(kind)
    const narrow = width < 380
    card.add(
      scene.add
        .text(
          narrow ? -width / 2 + 64 * ui : width / 2 - 18 * ui,
          narrow ? -height / 2 + 50 * ui : -height / 2 + 26 * ui,
          i18n.t('shop.level', { level, max }),
          textStyle(theme, 12 * ui, theme.textMuted, true),
        )
        .setOrigin(narrow ? 0 : 1, 0.5),
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 18 * ui,
          -height / 2 + 62 * ui,
          i18n.t(`tool.${kind}.desc`, { value: UPGRADE_EFFECT[kind] }),
          { ...textStyle(theme, 12 * ui, theme.textMuted), wordWrap: { width: width - 36 * ui } },
        )
        .setOrigin(0, 0),
    )

    const cost = upgradeCost(kind, level)
    const label = cost === null ? i18n.t('shop.max') : i18n.t('shop.upgrade', { cost })
    const buy = new Button(scene, 0, height / 2 - 32 * ui, label, theme, {
      width: width - 36 * ui,
      height: 44 * ui,
      fontSize: 14 * ui,
      minHitSize: 64,
      variant: cost === null ? 'soft' : 'primary',
      onClick: () => {
        const next = this.options.onUpgrade(kind)
        this.setState(next)
      },
    })
    if (cost === null) {
      buy.setEnabled(false)
    } else {
      this.track(buy, cost, 0, (remaining) => i18n.t('shop.upgrade', { cost: remaining }))
    }
    card.add(buy)
    return card
  }

  private renderStaff(
    parent: Phaser.GameObjects.Container,
    w: number,
    top: number,
    bottom: number,
  ): void {
    const ui = this.options.layout.ui
    const gap = 10 * ui
    // The chef only turns up once the kitchen itself exists.
    const kinds = STAFF_ORDER.filter((kind) => kind !== 'chef' || this.state.zones.kitchen)
    const columns = kinds.length
    const cardW = (w - 60 * ui - gap * (columns - 1)) / columns
    const cardH = Math.min(bottom - top, MAX_STAFF_CARD_HEIGHT * ui)
    kinds.forEach((kind, index) => {
      const x = 30 * ui + index * (cardW + gap) + cardW / 2
      parent.add(this.staffCard(kind, x, top + (bottom - top) / 2, cardW, cardH))
    })
  }

  private staffCard(
    kind: StaffKind,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.Container {
    const { scene, theme, i18n } = this.options
    const card = scene.add.container(x, y)
    const g = scene.add.graphics()
    g.fillStyle(theme.surface, 1)
    const ui = this.options.layout.ui
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 16 * ui)
    g.lineStyle(2 * ui, theme.borderSoft, 1)
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, 16 * ui)
    card.add(g)

    card.add(
      scene.add
        .image(-width / 2 + 48 * ui, -height / 2 + 58 * ui, staffPortraitKey(kind))
        .setScale(0.66 * ui * ANIMAL_SCALE),
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 84 * ui,
          -height / 2 + 34 * ui,
          i18n.t(`staff.${kind}`),
          textStyle(theme, 18 * ui, theme.text, true),
        )
        .setOrigin(0, 0.5),
    )
    const level = this.state.staff[kind]
    const max = staffMax(kind)
    const narrow = width < 380
    card.add(
      scene.add
        .text(
          narrow ? -width / 2 + 84 * ui : width / 2 - 18 * ui,
          narrow ? -height / 2 + 60 * ui : -height / 2 + 34 * ui,
          i18n.t('shop.level', { level, max }),
          textStyle(theme, 12 * ui, theme.textMuted, true),
        )
        .setOrigin(narrow ? 0 : 1, 0.5),
    )
    card.add(
      scene.add
        .text(-width / 2 + 20 * ui, -height / 2 + 108 * ui, i18n.t(`staff.${kind}.desc`), {
          ...textStyle(theme, 13 * ui, theme.textMuted),
          wordWrap: { width: width - 40 * ui },
        })
        .setOrigin(0, 0),
    )

    const cost = staffCost(kind, level)
    const deposit = this.state.deposits[`staff:${kind}`] ?? 0
    if (deposit > 0 && cost !== null) {
      card.add(
        scene.add
          .text(
            -width / 2 + 20 * ui,
            -height / 2 + 172 * ui,
            i18n.t('shop.depositLine', { paid: deposit, remaining: Math.max(0, cost - deposit) }),
            textStyle(theme, 12 * ui, theme.textMuted, true),
          )
          .setOrigin(0, 0),
      )
    }
    const remaining = cost === null ? 0 : Math.max(0, cost - deposit)
    const label = cost === null ? i18n.t('shop.max') : i18n.t('shop.hire', { cost: remaining })
    const buy = new Button(scene, 0, height / 2 - 36 * ui, label, theme, {
      width: width - 36 * ui,
      height: 46 * ui,
      fontSize: 14 * ui,
      minHitSize: 64,
      variant: cost === null ? 'soft' : 'primary',
      onClick: () => {
        const next = this.options.onStaff(kind)
        this.setState(next)
      },
    })
    if (cost === null) {
      buy.setEnabled(false)
    } else {
      this.track(buy, cost, deposit, (value) => i18n.t('shop.hire', { cost: value }))
    }
    card.add(buy)
    return card
  }

  private track(
    button: Button,
    cost: number,
    deposit: number,
    format: (remaining: number) => string,
    locked = false,
    lockedLabel?: string,
  ): void {
    this.dynamicButtons.push({
      button,
      cost,
      deposit,
      format,
      locked,
      lockedLabel,
      enabled: true,
      lastText: '',
    })
  }

  /** The purchase the game would recommend next, if any. */
  private goal(): Goal {
    return nextGoal(this.state)
  }

  private goalZone(): ZoneId | null {
    const goal = this.goal()
    if (goal === null) return null
    if (goal.type === 'zone') return goal.zone
    return goal.type === 'producer' ? zoneOf(goal.product) : null
  }

  private isGoalProduct(product: ProductKind): boolean {
    const goal = this.goal()
    return goal !== null && goal.type === 'producer' && goal.product === product
  }

  private isGoalUpgrade(kind: UpgradeKind): boolean {
    const goal = this.goal()
    return goal !== null && goal.type === 'upgrade' && goal.kind === kind
  }

  private goalAffordable(): boolean {
    const goal = this.goal()
    return goal !== null && this.state.coins >= goalCost(this.state, goal)
  }

  /** Shared card face; `highlight` outlines the recommended purchase. */
  private drawCardFace(
    g: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    highlight: boolean,
    radius?: number,
  ): void {
    const { theme } = this.options
    const ui = this.options.layout.ui
    const r = radius ?? 16 * ui
    g.fillStyle(theme.surface, 1)
    g.fillRoundedRect(-width / 2, -height / 2, width, height, r)
    g.lineStyle((highlight ? 3 : 2) * ui, highlight ? theme.accent : theme.borderSoft, 1)
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, r)
  }

  /** Straddles the card's top edge so it never fights the content rows. */
  private addNextTag(card: Phaser.GameObjects.Container, width: number, height: number): void {
    const ui = this.options.layout.ui
    const tag = createNextTag({
      scene: this.options.scene,
      theme: this.options.theme,
      i18n: this.options.i18n,
      ui,
      affordable: this.goalAffordable(),
    })
    tag.container.setPosition(width / 2 - tag.width / 2 - 12 * ui, -height / 2)
    card.add(tag.container)
  }

  private refreshDynamic(): void {
    if (this.balanceText !== undefined) {
      this.balanceText.setText(this.options.i18n.t('shop.balance', { coins: this.state.coins }))
    }
    for (const entry of this.dynamicButtons) {
      if (entry.locked) {
        if (entry.lastText !== (entry.lockedLabel ?? '')) {
          entry.lastText = entry.lockedLabel ?? ''
          entry.button.setText(entry.lastText)
        }
        if (entry.enabled) {
          entry.enabled = false
          entry.button.setEnabled(false)
        }
        continue
      }
      const remaining = Math.max(0, entry.cost - entry.deposit)
      const affordable = this.state.coins >= remaining
      if (entry.enabled !== affordable) {
        entry.enabled = affordable
        entry.button.setEnabled(affordable)
      }
      const text = affordable
        ? entry.format(remaining)
        : this.options.i18n.t('shop.notEnough', { cost: remaining - this.state.coins })
      if (text !== entry.lastText) {
        entry.lastText = text
        entry.button.setText(text)
      }
    }
  }

  private structureKeyFor(state: ShopState): string {
    const zones = ZONE_ORDER.map((zone) => (state.zones[zone] ? 1 : 0)).join('')
    const producers = [...state.producers]
      .map((producer) => `${producer.product}@${producer.slot}`)
      .sort()
      .join(',')
    const upgrades = UPGRADE_ORDER.map((kind) => state.upgrades[kind]).join('')
    const shelves = ZONE_ORDER.map((zone) => state.shelfLevels[zone]).join('')
    const staff = STAFF_ORDER.map((kind) => state.staff[kind]).join('')
    return [zones, producers, upgrades, shelves, staff, state.served > 0 ? 1 : 0].join('|')
  }

  private productName(product: ProductKind): string {
    return this.options.i18n.t(`product.${product}`)
  }

  private producerName(product: ProductKind): string {
    if (isPlantKind(product)) return this.options.i18n.t(`product.${product}`)
    return this.options.i18n.t(`producer.${product}`)
  }

  private producerStats(product: ProductKind): string {
    const { i18n } = this.options
    if (isPlantKind(product)) {
      return i18n.t('shop.stats.plant', {
        price: productPrice(product),
        grow: Math.round(PLANTS[product].growMs / 1000),
      })
    }
    if (product === 'fish') {
      return i18n.t('shop.stats.fish', { price: productPrice(product) })
    }
    if (isAnimalProductKind(product)) {
      const config = ANIMALS[product]
      return i18n.t('shop.stats.animal', {
        price: productPrice(product),
        cycle: Math.round(config.cycleMs / 1000),
        cap: config.capacity,
      })
    }
    if (isProcessedKind(product)) {
      const config = RECIPES[product]
      return i18n.t('shop.stats.recipe', {
        price: productPrice(product),
        craft: Math.round(config.craftMs / 1000),
      })
    }
    return ''
  }

  private producerDetail(product: ProductKind): string {
    const { i18n } = this.options
    if (product === 'fish') return i18n.t('shop.fishing')
    if (isAnimalProductKind(product)) {
      return animalNeedsTrough(product) ? i18n.t('shop.dietAny') : i18n.t('shop.passive')
    }
    if (isProcessedKind(product)) {
      const inputs = RECIPES[product].inputs
        .map((input) =>
          'product' in input
            ? `${input.count}× ${this.productName(input.product)}`
            : `${input.count}× ${i18n.t(input.category === 'fruit' ? 'shop.anyFruit' : 'shop.anyVeg')}`,
        )
        .join(', ')
      return i18n.t('shop.recipe', { items: inputs })
    }
    return ''
  }
}
