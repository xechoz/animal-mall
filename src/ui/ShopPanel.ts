import { Button, type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import {
  ANIMALS,
  isAnimalProductKind,
  isPlantKind,
  isProcessedKind,
  PLANT_SHOP_ORDER,
  PLANTS,
  producerCost,
  productPrice,
  RECIPES,
  STAFF,
  STAFF_ORDER,
  UPGRADE_EFFECT,
  UPGRADE_ORDER,
  ZONE_ORDER,
  ZONE_PRODUCTS,
  ZONES,
  zoneOf,
} from '../logic/config'
import { plantedCount, staffCost, staffMax, upgradeCost, upgradeMax } from '../logic/purchase'
import type {
  PlantKind,
  ProductKind,
  ShopState,
  StaffKind,
  UpgradeKind,
  ZoneId,
} from '../logic/types'
import { animalTextureKey } from './animalArt'
import type { GameLayout } from './layout'
import { productTextureKey } from './productArt'
import { drawToolIcon } from './toolArt'

export interface ShopPanelOptions {
  readonly scene: Phaser.Scene
  readonly layout: GameLayout
  readonly theme: Theme
  readonly i18n: I18n
  readonly state: ShopState
  readonly onPurchasePlant: (product: PlantKind) => ShopState
  readonly onPurchaseProducer: (product: ProductKind) => ShopState
  readonly onUnlockZone: (zone: ZoneId) => ShopState
  readonly onRemove: (id: number) => ShopState
  readonly onUpgrade: (kind: UpgradeKind) => ShopState
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
  private pendingBody = false
  private balanceText?: Phaser.GameObjects.Text
  private readonly tabButtons = new Map<Tab, Button>()
  private readonly zoneButtons = new Map<ZoneId, Button>()
  private readonly dynamicButtons: DynamicButton[] = []
  private zoneChips?: Phaser.GameObjects.Container
  private tabHighlight?: Phaser.GameObjects.Graphics
  private zoneHighlight?: Phaser.GameObjects.Graphics

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
    if (!this.closed) this.update(state)
  }

  update(state: ShopState): void {
    if (this.closed) return
    this.state = state
    if (this.structureKeyFor(state) !== this.structureKey) {
      this.scheduleBodyRender()
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

    const w = layout.panelWidth
    const h = layout.panelHeight
    const g = scene.add.graphics()
    g.fillStyle(theme.shadow, 0.2)
    g.fillRoundedRect(0, 8, w, h, theme.radiusLarge)
    g.fillStyle(theme.panel, 1)
    g.fillRoundedRect(0, 0, w, h, theme.radiusLarge)
    g.lineStyle(3, theme.borderSoft, 1)
    g.strokeRoundedRect(0, 0, w, h, theme.radiusLarge)
    g.fillStyle(theme.accentWarm, 0.35)
    g.fillRoundedRect(18, 18, w - 36, 58, 18)
    this.chrome.add(g)

    const title = scene.add
      .text(30, 38, i18n.t('shop.title'), textStyle(theme, 26, theme.text, true))
      .setOrigin(0, 0.5)
    this.chrome.add(title)

    this.balanceText = scene.add
      .text(
        w - 96,
        38,
        i18n.t('shop.balance', { coins: this.state.coins }),
        textStyle(theme, 18, theme.text, true),
      )
      .setOrigin(1, 0.5)
    this.chrome.add(this.balanceText)

    this.chrome.add(
      new Button(scene, w - 38, 38, '×', theme, {
        width: 44,
        height: 44,
        fontSize: 26,
        minHitSize: 64,
        variant: 'soft',
        onClick: () => this.close(),
      }),
    )

    this.renderTabs(w)
    this.renderZoneChips(w)
    this.tabHighlight = scene.add.graphics()
    this.zoneHighlight = scene.add.graphics()
    this.chrome.add([this.tabHighlight, this.zoneHighlight])
    this.applyChromeSelection()
  }

  private renderTabs(w: number): void {
    const { scene, theme, i18n } = this.options
    const y = 76
    const gap = 6
    const tabWidth = (w - 60 - gap * 2) / 3
    const tabs: readonly { readonly tab: Tab; readonly label: string }[] = [
      { tab: 'production', label: i18n.t('shop.production') },
      { tab: 'tools', label: i18n.t('shop.tools') },
      { tab: 'staff', label: i18n.t('shop.staff') },
    ]
    tabs.forEach((entry, index) => {
      const button = new Button(
        scene,
        30 + tabWidth / 2 + index * (tabWidth + gap),
        y,
        entry.label,
        theme,
        {
          width: tabWidth,
          height: 36,
          fontSize: 15,
          minHitSize: 64,
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
    const y = 124
    const gap = 6
    const chipWidth = (w - 60 - gap * 3) / 4
    ZONE_ORDER.forEach((zone, index) => {
      const button = new Button(
        scene,
        30 + chipWidth / 2 + index * (chipWidth + gap),
        y,
        i18n.t(`zone.${zone}`),
        theme,
        {
          width: chipWidth,
          height: 34,
          fontSize: 13,
          minHitSize: 64,
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
    this.scheduleBodyRender()
  }

  private setZone(zone: ZoneId): void {
    if (this.zone === zone) return
    this.zone = zone
    this.applyChromeSelection()
    this.scheduleBodyRender()
  }

  private applyChromeSelection(): void {
    const { theme } = this.options
    this.zoneChips?.setVisible(this.tab === 'production')
    const w = this.options.layout.panelWidth
    const gap = 6
    const tabWidth = (w - 60 - gap * 2) / 3
    const tabOrder: readonly Tab[] = ['production', 'tools', 'staff']
    const tabIndex = tabOrder.indexOf(this.tab)
    this.tabHighlight?.clear()
    this.tabHighlight?.fillStyle(theme.accent, 1)
    this.tabHighlight?.fillRoundedRect(
      30 + tabIndex * (tabWidth + gap) + 12,
      92,
      tabWidth - 24,
      4,
      2,
    )

    this.zoneHighlight?.clear()
    if (this.tab !== 'production') return
    const chipWidth = (w - 60 - gap * 3) / 4
    const zoneIndex = ZONE_ORDER.indexOf(this.zone)
    this.zoneHighlight?.fillStyle(theme.accent, 1)
    this.zoneHighlight?.fillRoundedRect(
      30 + zoneIndex * (chipWidth + gap) + 12,
      140,
      chipWidth - 24,
      4,
      2,
    )

    for (const [tab, button] of this.tabButtons) {
      button.setAlpha(this.tab === tab ? 1 : 0.7)
    }
    for (const [zone, button] of this.zoneButtons) {
      const inactive = this.state.zones[zone] ? 0.7 : 0.4
      button.setAlpha(this.zone === zone ? 1 : inactive)
    }
  }

  private scheduleBodyRender(): void {
    if (this.pendingBody) return
    this.pendingBody = true
    this.options.scene.time.delayedCall(120, () => {
      this.pendingBody = false
      if (!this.closed) this.renderBody()
    })
  }

  private renderBody(): void {
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
    const top = this.tab === 'production' ? 158 : 112
    const bottom = h - 20

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
  }

  private renderLockedZone(
    parent: Phaser.GameObjects.Container,
    zone: ZoneId,
    w: number,
    top: number,
    bottom: number,
  ): void {
    const { scene, theme, i18n } = this.options
    const config = ZONES[zone]
    const height = Math.min(220, bottom - top)
    const card = scene.add.container(30 + (w - 60) / 2, top + height / 2)
    const g = scene.add.graphics()
    g.fillStyle(theme.surface, 1)
    g.fillRoundedRect(-(w - 60) / 2, -height / 2, w - 60, height, 18)
    g.lineStyle(2, theme.borderSoft, 1)
    g.strokeRoundedRect(-(w - 60) / 2, -height / 2, w - 60, height, 18)
    g.fillStyle(theme.accentAlt, 0.12)
    g.fillRoundedRect(-(w - 60) / 2 + 12, -height / 2 + 12, w - 84, 42, 12)
    card.add(g)
    card.add(
      scene.add
        .text(0, -height / 2 + 34, i18n.t(`zone.${zone}`), textStyle(theme, 20, theme.text, true))
        .setOrigin(0.5),
    )
    card.add(
      scene.add
        .text(
          0,
          -height / 2 + 74,
          zone === 'veg'
            ? i18n.t('shop.zoneHint')
            : i18n.t('shop.zoneLocked', { zone: i18n.t(`zone.${zone}`) }),
          textStyle(theme, 13, theme.textMuted),
        )
        .setOrigin(0.5),
    )
    if (config.includes !== null) {
      const includes = config.includes
      card.add(
        scene.add
          .text(
            0,
            -height / 2 + 98,
            i18n.t('shop.includes', { name: this.productName(includes) }),
            textStyle(theme, 13, theme.textMuted),
          )
          .setOrigin(0.5),
      )
    }
    if (zone === 'veg') {
      const locked = this.state.served === 0
      const button = new Button(scene, 0, height / 2 - 34, i18n.t('shop.unlockFree'), theme, {
        width: w - 120,
        height: 44,
        fontSize: 15,
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
        height / 2 - 34,
        i18n.t('shop.unlockZone', { cost }),
        theme,
        {
          width: w - 120,
          height: 44,
          fontSize: 15,
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
    const gap = 10
    const products = PLANT_SHOP_ORDER.filter((product) => zoneOf(product) === zone)
    const columns = 2
    const rows = Math.ceil(products.length / columns)
    const cardW = (w - 60 - gap * (columns - 1)) / columns
    const cardH = (bottom - top - gap * (rows - 1)) / rows
    products.forEach((product, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const x = 30 + column * (cardW + gap) + cardW / 2
      const y = top + row * (cardH + gap) + cardH / 2
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
    const g = scene.add.graphics()
    g.fillStyle(theme.surface, 1)
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 16)
    g.lineStyle(2, theme.borderSoft, 1)
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, 16)
    card.add(g)

    card.add(
      scene.add.image(-width / 2 + 34, -height / 2 + 36, productTextureKey(product)).setScale(0.72),
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 64,
          -height / 2 + 26,
          this.productName(product),
          textStyle(theme, 17, theme.text, true),
        )
        .setOrigin(0, 0.5),
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 64,
          -height / 2 + 50,
          i18n.t('shop.planted', { count: plantedCount(this.state, product) }),
          textStyle(theme, 12, theme.textMuted, true),
        )
        .setOrigin(0, 0.5),
    )

    const config = PLANTS[product]
    card.add(
      scene.add
        .text(
          -width / 2 + 20,
          -height / 2 + 78,
          i18n.t('shop.stats.plant', {
            price: config.price,
            grow: Math.round(config.growMs / 1000),
          }),
          textStyle(theme, 12, theme.textMuted),
        )
        .setOrigin(0, 0.5),
    )

    const cost = config.cost
    const buy = new Button(scene, 0, height / 2 - 34, i18n.t('shop.plant', { cost }), theme, {
      width: width - 36,
      height: 42,
      fontSize: 14,
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
      card.add(
        new Button(
          scene,
          width / 2 - 48,
          -height / 2 + 34,
          i18n.t('shop.removeShort', { refund }),
          theme,
          {
            width: 78,
            height: 30,
            fontSize: 11,
            minHitSize: 56,
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
    const products = ZONE_PRODUCTS[zone]
    const gap = 10
    const cardW = w - 60
    const cardH = (bottom - top - gap * (products.length - 1)) / products.length
    products.forEach((product, index) => {
      const y = top + index * (cardH + gap) + cardH / 2
      parent.add(this.producerCard(product, 30 + cardW / 2, y, cardW, cardH))
    })
  }

  private producerCard(
    product: ProductKind,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.Container {
    const { scene, theme, i18n } = this.options
    const card = scene.add.container(x, y)
    const g = scene.add.graphics()
    g.fillStyle(theme.surface, 1)
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 16)
    g.lineStyle(2, theme.borderSoft, 1)
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, 16)
    card.add(g)

    card.add(
      scene.add.image(-width / 2 + 34, -height / 2 + 34, productTextureKey(product)).setScale(0.68),
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 62,
          -height / 2 + 24,
          this.producerName(product),
          textStyle(theme, 17, theme.text, true),
        )
        .setOrigin(0, 0.5),
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 62,
          -height / 2 + 48,
          this.producerStats(product),
          textStyle(theme, 12, theme.textMuted),
        )
        .setOrigin(0, 0.5),
    )
    card.add(
      scene.add
        .text(-width / 2 + 20, -height / 2 + 64, this.producerDetail(product), {
          ...textStyle(theme, 12, theme.textMuted),
          wordWrap: { width: width - 40 },
        })
        .setOrigin(0, 0.5),
    )

    const owned = this.state.producers.some((producer) => producer.product === product)
    if (owned) {
      card.add(
        scene.add
          .text(
            width / 2 - 20,
            -height / 2 + 26,
            i18n.t('shop.owned'),
            textStyle(theme, 13, theme.text, true),
          )
          .setOrigin(1, 0.5),
      )
    } else {
      const cost = producerCost(product)
      const buy = new Button(scene, 0, height / 2 - 30, i18n.t('shop.buy', { cost }), theme, {
        width: width - 40,
        height: 40,
        fontSize: 14,
        minHitSize: 64,
        variant: 'primary',
        onClick: () => {
          const next = this.options.onPurchaseProducer(product)
          this.setState(next)
        },
      })
      this.track(buy, cost, 0, (remaining) => i18n.t('shop.buy', { cost: remaining }))
      card.add(buy)
    }

    return card
  }

  private renderTools(
    parent: Phaser.GameObjects.Container,
    w: number,
    top: number,
    bottom: number,
  ): void {
    const gap = 10
    const cardW = (w - 60 - gap) / 2
    const cardH = (bottom - top - gap * 2) / 3
    UPGRADE_ORDER.forEach((kind, index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const x = 30 + column * (cardW + gap) + cardW / 2
      const y = top + row * (cardH + gap) + cardH / 2
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
    const g = scene.add.graphics()
    g.fillStyle(theme.surface, 1)
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 16)
    g.lineStyle(2, theme.borderSoft, 1)
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, 16)
    card.add(g)

    const icon = scene.add.graphics()
    drawToolIcon(icon, kind, -width / 2 + 38, -height / 2 + 40, 24)
    card.add(icon)
    card.add(
      scene.add
        .text(
          -width / 2 + 64,
          -height / 2 + 26,
          i18n.t(`tool.${kind}`),
          textStyle(theme, 16, theme.text, true),
        )
        .setOrigin(0, 0.5),
    )
    const level = this.state.upgrades[kind]
    const max = upgradeMax(kind)
    card.add(
      scene.add
        .text(
          width / 2 - 18,
          -height / 2 + 26,
          i18n.t('shop.level', { level, max }),
          textStyle(theme, 12, theme.textMuted, true),
        )
        .setOrigin(1, 0.5),
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 18,
          -height / 2 + 58,
          i18n.t(`tool.${kind}.desc`, { value: UPGRADE_EFFECT[kind] }),
          { ...textStyle(theme, 12, theme.textMuted), wordWrap: { width: width - 36 } },
        )
        .setOrigin(0, 0),
    )

    const cost = upgradeCost(kind, level)
    const label = cost === null ? i18n.t('shop.max') : i18n.t('shop.upgrade', { cost })
    const buy = new Button(scene, 0, height / 2 - 30, label, theme, {
      width: width - 36,
      height: 38,
      fontSize: 14,
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
    const gap = 10
    const cardW = (w - 60 - gap) / 2
    const cardH = bottom - top
    STAFF_ORDER.forEach((kind, index) => {
      const x = 30 + index * (cardW + gap) + cardW / 2
      parent.add(this.staffCard(kind, x, top + cardH / 2, cardW, cardH))
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
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 16)
    g.lineStyle(2, theme.borderSoft, 1)
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, 16)
    card.add(g)

    card.add(
      scene.add
        .image(-width / 2 + 48, -height / 2 + 58, animalTextureKey(STAFF[kind].species))
        .setScale(0.66),
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 84,
          -height / 2 + 34,
          i18n.t(`staff.${kind}`),
          textStyle(theme, 18, theme.text, true),
        )
        .setOrigin(0, 0.5),
    )
    const level = this.state.staff[kind]
    const max = staffMax(kind)
    card.add(
      scene.add
        .text(
          width / 2 - 18,
          -height / 2 + 34,
          i18n.t('shop.level', { level, max }),
          textStyle(theme, 12, theme.textMuted, true),
        )
        .setOrigin(1, 0.5),
    )
    card.add(
      scene.add
        .text(-width / 2 + 20, -height / 2 + 104, i18n.t(`staff.${kind}.desc`), {
          ...textStyle(theme, 13, theme.textMuted),
          wordWrap: { width: width - 40 },
        })
        .setOrigin(0, 0),
    )

    const cost = staffCost(kind, level)
    const deposit = this.state.deposits[`staff:${kind}`] ?? 0
    if (deposit > 0 && cost !== null) {
      card.add(
        scene.add
          .text(
            -width / 2 + 20,
            -height / 2 + 164,
            i18n.t('shop.depositLine', { paid: deposit, remaining: Math.max(0, cost - deposit) }),
            textStyle(theme, 12, theme.textMuted, true),
          )
          .setOrigin(0, 0),
      )
    }
    const remaining = cost === null ? 0 : Math.max(0, cost - deposit)
    const label = cost === null ? i18n.t('shop.max') : i18n.t('shop.hire', { cost: remaining })
    const buy = new Button(scene, 0, height / 2 - 36, label, theme, {
      width: width - 36,
      height: 42,
      fontSize: 14,
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
    const staff = STAFF_ORDER.map((kind) => state.staff[kind]).join('')
    return [zones, producers, upgrades, staff, state.served > 0 ? 1 : 0].join('|')
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
    if (isAnimalProductKind(product)) {
      return i18n.t('shop.dietAny')
    }
    if (isProcessedKind(product)) {
      const inputs = RECIPES[product].inputs
        .map((input) => `${input.count}× ${this.productName(input.product)}`)
        .join(', ')
      return i18n.t('shop.recipe', { items: inputs })
    }
    return ''
  }
}
