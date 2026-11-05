import { Button, type I18n, Modal, type Theme, textStyle } from '@mg/core'
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
import { createCloseButton, drawLevelPips } from './dialog'
import { drawPanelFrame } from './frames'
import type { GameLayout } from './layout'
import { createNextTag } from './nextTag'
import { productTextureKey } from './productArt'
import { staffPortraitKey } from './staffArt'
import { drawToolIcon } from './toolArt'

/** Cards stop growing past this height so portrait panels stay balanced. */
const MAX_CARD_HEIGHT = 205
const MAX_STAFF_CARD_HEIGHT = 260
/** Height below which a card switches to its compact, secondary-copy-free layout. */
const CARD_COMFORT_HEIGHT = 150
/**
 * Tightest card the compact layout can hold without collisions: name, planted
 * line and the price button stack exactly inside it. Cards shorter than this
 * scale down as a whole instead of letting the button ride up into the copy.
 */
const CARD_SCALE_HEIGHT = 112

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
  readonly face: Phaser.GameObjects.Graphics
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
  private readonly tabLabels = new Map<Tab, Phaser.GameObjects.Text>()
  private readonly zoneButtons = new Map<ZoneId, Button>()
  private readonly tabFaces = new Map<Tab, Phaser.GameObjects.Graphics>()
  /** Desktop hover hint for the bare tab labels. */
  private hoverTab: Tab | null = null
  private readonly zoneFaces = new Map<ZoneId, Phaser.GameObjects.Graphics>()
  private readonly dynamicButtons: DynamicButton[] = []
  private zoneChips?: Phaser.GameObjects.Container
  private removeModal?: Modal
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
      .rectangle(0, 0, options.layout.width, options.layout.height, options.theme.overlay, 0.72)
      .setOrigin(0)
      // The shop is modal. Swallow taps outside the panel so world price chips
      // behind the dimmer cannot open a chooser on top of the shop.
      .setInteractive()
    this.root.add(blocker)

    this.chrome = scene.add.container(0, 0)
    this.chrome.setName('shop-chrome')
    this.root.add(this.chrome)
    this.renderChrome()
    this.renderBody()
  }

  setState(state: ShopState): void {
    if (state === this.state) return
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
    this.removeModal?.destroy(true)
    this.root.destroy(true)
  }

  private confirmRemove(id: number, refund: number): void {
    if (this.removeModal !== undefined) return
    const { scene, theme, i18n } = this.options
    const modal = new Modal(scene, theme, {
      title: i18n.t('shop.removeTitle'),
      // Plain heading, matching every other dialog in the game.
      titleRibbon: false,
      body: i18n.t('shop.removeBody', { refund }),
      width: 560,
      height: 360,
      actionsLayout: 'column',
      actionHeight: 70,
      actionFontSize: 26,
      actions: [
        {
          label: i18n.t('shop.cancel'),
          variant: 'soft',
          onClick: () => {
            this.removeModal?.destroy(true)
            this.removeModal = undefined
          },
        },
        {
          label: i18n.t('shop.removeConfirm'),
          variant: 'danger',
          onClick: () => {
            const next = this.options.onRemove(id)
            this.removeModal?.destroy(true)
            this.removeModal = undefined
            this.setState(next)
          },
        },
      ],
    })
    modal.setDepth(7300)
    this.removeModal = modal
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.removeModal?.destroy(true)
    this.removeModal = undefined
    this.options.onClose()
    this.root.destroy(true)
  }

  private renderChrome(): void {
    const { scene, layout, theme, i18n } = this.options
    const panelX = (layout.width - layout.panelWidth) / 2
    const panelY = (layout.height - layout.panelHeight) / 2
    this.chrome.setPosition(panelX, panelY)
    this.tabLabels.clear()
    this.zoneButtons.clear()
    this.tabFaces.clear()
    this.zoneFaces.clear()
    this.hoverTab = null
    this.balanceText = undefined

    const ui = layout.ui
    const font = layout.text
    const w = layout.panelWidth
    const h = layout.panelHeight
    const g = scene.add.graphics()
    // Top leaves would sit under the heading, the balance and the close button.
    drawPanelFrame(g, 0, 0, w, h, theme, theme.radiusLarge, false)
    this.chrome.add(g)

    // The heading is plain text on the parchment. A filled ribbon here read as
    // a fourth button and drowned out the real actions below it.
    // Heading, balance and close share one row. The tabs and zone chips are
    // then compressed into a single filter band so a 844×390 landscape panel
    // still leaves the cards room to show their stats and effects.
    const headerY = 28 * ui
    const title = scene.add
      .text(30 * ui, headerY, i18n.t('shop.title'), textStyle(theme, font.title, theme.text, true))
      .setOrigin(0, 0.5)
    this.chrome.add(title)

    this.balanceText = scene.add
      .text(
        w - 66 * ui,
        headerY + 1 * ui,
        i18n.t('shop.balance', { coins: this.state.coins }),
        textStyle(theme, font.label, theme.text, true),
      )
      .setOrigin(1, 0.5)
    this.chrome.add(this.balanceText)

    this.chrome.add(createCloseButton(scene, w - 32 * ui, headerY, theme, () => this.close(), ui))

    this.tabHeight = 34 * ui
    this.chipHeight = 32 * ui
    this.tabY = 70 * ui
    this.chipY = this.tabY + this.tabHeight / 2 + 6 * ui + this.chipHeight / 2
    this.bodyTop = this.chipY + this.chipHeight / 2 + 8 * ui
    this.toolsTop = this.tabY + this.tabHeight / 2 + 10 * ui

    this.renderTabs(w)
    this.renderZoneChips(w)
    this.tabHighlight = scene.add.graphics()
    this.zoneHighlight = scene.add.graphics()
    this.chrome.add([this.tabHighlight, this.zoneHighlight])
    this.applyChromeSelection()
  }

  /**
   * Tabs are a bare text row with an accent underline for the active one. A
   * button face here would create a second pill row right under the heading and
   * make the filter hierarchy unreadable.
   */
  private renderTabs(w: number): void {
    const { scene, theme, i18n } = this.options
    const ui = this.options.layout.ui
    const font = this.options.layout.text
    const y = this.tabY
    const gap = 6 * ui
    const tabWidth = (w - 60 * ui - gap * 2) / 3
    const tabs: readonly { readonly tab: Tab; readonly label: string }[] = [
      { tab: 'production', label: i18n.t('shop.production') },
      { tab: 'tools', label: i18n.t('shop.tools') },
      { tab: 'staff', label: i18n.t('shop.staff') },
    ]
    tabs.forEach((entry, index) => {
      const x = 30 * ui + tabWidth / 2 + index * (tabWidth + gap)
      const label = scene.add
        .text(x, y, entry.label, textStyle(theme, font.label, theme.text, true))
        .setOrigin(0.5)
      // Russian/German tab words can be wider than a third of a portrait
      // panel. Shrink the label in place instead of letting two tabs collide.
      const maxLabelWidth = tabWidth - 10 * ui
      if (label.width > maxLabelWidth) {
        label.setFontSize((font.label * maxLabelWidth) / label.width)
      }
      const underline = scene.add.graphics()
      const barWidth = tabWidth * 0.56
      const barHeight = 3 * ui
      underline.fillStyle(theme.accent, 1)
      underline.fillRoundedRect(
        x - barWidth / 2,
        y + this.tabHeight / 2 + 1 * ui,
        barWidth,
        barHeight,
        barHeight / 2,
      )
      underline.setVisible(false)
      const hit = scene.add
        .zone(x, y, Math.max(tabWidth, 64 * ui), Math.max(this.tabHeight, 64 * ui))
        .setInteractive({ useHandCursor: true })
      hit.on('pointerover', () => {
        this.hoverTab = entry.tab
        this.applyChromeSelection()
      })
      hit.on('pointerout', () => {
        if (this.hoverTab === entry.tab) this.hoverTab = null
        this.applyChromeSelection()
      })
      hit.on('pointerdown', () => this.setTab(entry.tab))
      this.tabLabels.set(entry.tab, label)
      this.tabFaces.set(entry.tab, underline)
      this.chrome.add([label, underline, hit])
    })
  }

  private addSelectionFace(
    button: Button,
    width: number,
    height: number,
    ui: number,
  ): Phaser.GameObjects.Graphics {
    const { theme } = this.options
    const face = this.options.scene.add.graphics()
    const radius = height / 2
    face.fillStyle(theme.accent, 0.16)
    face.fillRoundedRect(-width / 2, -height / 2, width, height, radius)
    face.lineStyle(2 * ui, theme.accent, 0.9)
    face.strokeRoundedRect(-width / 2, -height / 2, width, height, radius)
    face.setVisible(false)
    button.addAt(face, 1)
    return face
  }

  private renderZoneChips(w: number): void {
    const { scene, theme, i18n } = this.options
    const container = scene.add.container(0, 0)
    this.zoneChips = container
    this.chrome.add(container)
    const ui = this.options.layout.ui
    const font = this.options.layout.text
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
          fontSize: font.body,
          minHitSize: 64 * ui,
          variant: 'soft',
          onClick: () => this.setZone(zone),
        },
      )
      button.setName(`chip-${zone}`)
      this.zoneButtons.set(zone, button)
      container.add(button)
      this.zoneFaces.set(zone, this.addSelectionFace(button, chipWidth, this.chipHeight, ui))
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
    this.tabHighlight?.clear()
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
    for (const [tab, face] of this.tabFaces) {
      // Idle tabs keep the underline hidden; hover only previews it faintly.
      face.setVisible(tab === this.tab || tab === this.hoverTab)
      face.setAlpha(tab === this.tab ? 1 : 0.3)
    }
    for (const [tab, label] of this.tabLabels) {
      // 0.7 keeps the inactive labels readable on the parchment.
      label.setAlpha(tab === this.tab ? 1 : tab === this.hoverTab ? 0.85 : 0.7)
    }

    this.zoneHighlight?.clear()
    for (const [zone, face] of this.zoneFaces) {
      face.setVisible(this.tab === 'production' && zone === this.zone)
    }
    if (this.tab !== 'production') return
    const chipWidth = (w - 60 * ui - gap * 3) / 4
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
    for (const [zone, button] of this.zoneButtons) {
      const inactive = this.state.zones[zone] ? 0.85 : 0.62
      button.setAlpha(zone === this.zone ? 1 : inactive)
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
    const font = this.options.layout.text
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
          textStyle(theme, font.title, theme.text, true),
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
          textStyle(theme, font.body, theme.textMuted),
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
            textStyle(theme, font.body, theme.textMuted),
          )
          .setOrigin(0.5),
      )
    }
    if (zone === 'veg') {
      const locked = this.state.served === 0
      const button = new Button(scene, 0, height / 2 - 36 * ui, i18n.t('shop.unlockFree'), theme, {
        width: w - 120 * ui,
        height: 48 * ui,
        fontSize: font.body,
        minHitSize: 64 * ui,
        variant: locked ? 'soft' : 'primary',
        onClick: () => {
          const next = this.options.onUnlockZone(zone)
          this.setState(next)
        },
      })
      if (locked) button.setText(i18n.t('shop.afterFirstSale'))
      // Keep the disabled-looking state tappable: the tap explains the
      // first-sale requirement instead of doing nothing.
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
          fontSize: font.body,
          minHitSize: 64 * ui,
          variant: 'primary',
          onClick: () => {
            const next = this.options.onUnlockZone(zone)
            this.setState(next)
          },
        },
      )
      this.track(
        button,
        cost,
        0,
        (remaining) => i18n.t('shop.unlockZone', { cost: remaining }),
        w - 120 * ui,
        48 * ui,
      )
      card.add(button)
    }
    parent.add(card)
  }

  /**
   * The grid gives a card whatever height is left over. Below the tightest
   * compact card the whole layout shrinks with the space (`u` is the card's
   * height in 112ths), so offsets and fonts keep their proportion and the price
   * button can never ride up into the copy on a short landscape panel.
   */
  private cardUnit(height: number): { u: number; fit: number } {
    const ui = this.options.layout.ui
    const fit = Math.min(1, height / (CARD_SCALE_HEIGHT * ui))
    return { u: ui * fit, fit }
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
    const gridTop = this.renderShelfRow(parent, zone, w, top)
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
    const font = this.options.layout.text
    const compact = height < CARD_COMFORT_HEIGHT * ui
    // A crowded landscape card still has to answer "what does it sell for and
    // how long does it take?"; only the extra refund row is allowed to drop.
    const showStats = height >= 100 * ui
    const { u, fit } = this.cardUnit(height)
    const g = scene.add.graphics()
    const goal = this.isGoalProduct(product)
    const primary = this.primaryPlant() === product
    this.drawCardFace(g, width, height, goal)
    card.add(g)
    if (goal) this.addNextTag(card, width, height)

    card.add(
      scene.add
        .image(
          -width / 2 + 34 * u,
          -height / 2 + (compact ? 32 : 38) * u,
          productTextureKey(product),
        )
        .setScale((compact ? 0.58 : 0.72) * u),
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 64 * u,
          -height / 2 + (compact ? 24 : 28) * u,
          this.productName(product),
          textStyle(theme, font.label * fit, theme.text, true),
        )
        .setOrigin(0, 0.5),
    )

    const planted = plantedCount(this.state, product)
    if (planted > 0) {
      card.add(
        scene.add
          .text(
            -width / 2 + 64 * u,
            -height / 2 + (compact ? 48 : 54) * u,
            i18n.t('shop.planted', { count: planted }),
            textStyle(theme, font.caption * fit, theme.textMuted, false),
          )
          .setOrigin(0, 0.5),
      )
    }

    const config = PLANTS[product]
    if (showStats) {
      card.add(
        scene.add
          .text(
            -width / 2 + 20 * u,
            -height / 2 + (compact ? 58 : 72) * u,
            i18n.t('shop.stats.plant', {
              price: config.price,
              grow: Math.round(config.growMs / 1000),
            }),
            {
              ...textStyle(theme, (compact ? font.caption : font.body) * fit, theme.textMuted),
              wordWrap: { width: width - 40 * u },
              lineSpacing: 1 * u,
            },
          )
          .setOrigin(0, 0.5),
      )
    }

    const cost = config.cost
    const buy = new Button(
      scene,
      0,
      height / 2 - (compact ? 26 : 34) * u,
      i18n.t('shop.plant', { cost }),
      theme,
      {
        width: width - 36 * u,
        height: (compact ? 34 : 46) * u,
        fontSize: font.body * fit,
        minHitSize: 64 * ui,
        variant: primary ? 'primary' : 'soft',
        onClick: () => {
          const next = this.options.onPurchasePlant(product)
          this.setState(next)
        },
      },
    )
    this.track(
      buy,
      cost,
      0,
      (remaining) => i18n.t('shop.plant', { cost: remaining }),
      width - 36 * u,
      (compact ? 34 : 46) * u,
    )
    card.add(buy)

    const installed = this.state.producers.find((producer) => producer.product === product)
    if (installed !== undefined && !compact) {
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
            fontSize: font.caption,
            minHitSize: 56 * ui,
            variant: 'soft',
            onClick: () => this.confirmRemove(installed.id, refund),
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
    // Keep the shelf upgrade reachable on short landscape panels; the card
    // layout below switches to a compact variant when it has to share height.
    const gridTop = this.renderShelfRow(parent, zone, w, top)
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
    const font = this.options.layout.text
    // Short landscape cards have no room for a diet/recipe line once the
    // button is placed; the picker still shows the essential output stats.
    const compact = height < CARD_COMFORT_HEIGHT * ui
    const showDetail = !compact
    const { u, fit } = this.cardUnit(height)
    const producer = this.state.producers.find(
      (candidate) => candidate.slot === slot && zoneOf(candidate.product) === zone,
    )
    const card = scene.add.container(x, y)
    const g = scene.add.graphics()
    // An empty slot in the recommended zone is where the next purchase goes;
    // the picker itself names the product with the NEXT pill.
    const primaryEmpty = producer === undefined && this.firstEmptySlot(zone) === slot
    this.drawCardFace(g, width, height, primaryEmpty)
    card.add(g)

    const slotName = i18n.t(zone === 'farm' ? 'shop.pen' : 'shop.station', { n: slot + 1 })
    card.add(
      scene.add
        .text(-width / 2 + 20 * u, -height / 2 + 18 * u, slotName, {
          ...textStyle(theme, font.caption * fit, theme.textMuted, true),
        })
        .setOrigin(0, 0.5),
    )

    if (producer === undefined) {
      card.add(
        scene.add
          .text(
            -width / 2 + 20 * u,
            -height / 2 + (compact ? 36 : 52) * u,
            i18n.t(zone === 'farm' ? 'shop.emptyPen' : 'shop.emptyStation'),
            textStyle(theme, font.label * fit, theme.text, true),
          )
          .setOrigin(0, 0.5),
      )
      if (showDetail) {
        card.add(
          scene.add
            .text(
              -width / 2 + 20 * u,
              -height / 2 + 80 * u,
              i18n.t(zone === 'farm' ? 'shop.emptyPenHint' : 'shop.emptyStationHint'),
              {
                ...textStyle(theme, font.body * fit, theme.textMuted),
                wordWrap: { width: width - 40 * u },
              },
            )
            .setOrigin(0, 0.5),
        )
      }
      card.add(
        new Button(
          scene,
          0,
          height / 2 - (compact ? 28 : 32) * u,
          i18n.t(zone === 'farm' ? 'shop.chooseAnimal' : 'shop.chooseMachine'),
          theme,
          {
            width: width - 40 * u,
            height: (compact ? 34 : 46) * u,
            fontSize: font.body * fit,
            minHitSize: 64 * ui,
            variant: primaryEmpty ? 'primary' : 'soft',
            onClick: () => this.options.onOpenProducerPicker(zone, slot),
          },
        ),
      )
      return card
    }

    card.add(
      scene.add
        .image(
          -width / 2 + 34 * u,
          -height / 2 + (compact ? 40 : 54) * u,
          productTextureKey(producer.product),
        )
        .setScale((compact ? 0.56 : 0.68) * u),
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 62 * u,
          -height / 2 + (compact ? 32 : 44) * u,
          this.producerName(producer.product),
          textStyle(theme, font.label * fit, theme.text, true),
        )
        .setOrigin(0, 0.5),
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 62 * u,
          -height / 2 + (compact ? 56 : 68) * u,
          this.producerStats(producer.product),
          textStyle(theme, font.body * fit, theme.textMuted),
        )
        .setOrigin(0, 0.5),
    )
    if (showDetail) {
      card.add(
        scene.add
          .text(-width / 2 + 20 * u, -height / 2 + 94 * u, this.producerDetail(producer.product), {
            ...textStyle(theme, font.body * fit, theme.textMuted),
            wordWrap: { width: width - 40 * u },
          })
          .setOrigin(0, 0.5),
      )
    }
    card.add(
      new Button(scene, 0, height / 2 - (compact ? 28 : 32) * u, i18n.t('shop.replace'), theme, {
        width: width - 40 * u,
        height: (compact ? 34 : 46) * u,
        fontSize: font.body * fit,
        minHitSize: 64 * ui,
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
    const font = this.options.layout.text
    const height = 46 * ui
    const width = w - 60 * ui
    const card = scene.add.container(30 * ui + width / 2, top + height / 2)
    const g = scene.add.graphics()
    g.fillStyle(theme.surface, 1)
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 14 * ui)
    g.lineStyle(1.5 * ui, theme.borderSoft, 1)
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, 14 * ui)
    card.add(g)

    const icon = scene.add.graphics()
    drawToolIcon(icon, 'shelf', -width / 2 + 26 * ui, 0, 18 * ui)
    card.add(icon)

    const level = this.state.shelfLevels[zone]
    const max = shelfUpgradeMax()
    const capacity = shelfCapacity(level)
    const stock = Object.values(this.state.shelves[zone].stock).reduce(
      (total, amount) => total + amount,
      0,
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 46 * ui,
          -height / 2 + 14 * ui,
          `${i18n.t('shelf.name', { zone: i18n.t(`zone.${zone}`) })} · ${i18n.t('shop.level', {
            level,
            max,
          })}`,
          textStyle(theme, font.body, theme.text, true),
        )
        .setOrigin(0, 0.5),
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 46 * ui,
          -height / 2 + 32 * ui,
          i18n.t('shelf.stock', { stock, capacity }),
          textStyle(theme, font.caption, theme.textMuted, true),
        )
        .setOrigin(0, 0.5),
    )

    const buttonWidth = Math.min(156 * ui, width * 0.36)
    if (this.state.producers.length === 0) {
      card.add(
        scene.add
          .text(width / 2 - 12 * ui, 0, i18n.t('shelf.plantFirst'), {
            ...textStyle(theme, font.caption, theme.textMuted, true),
            align: 'right',
            wordWrap: { width: buttonWidth },
          })
          .setOrigin(1, 0.5),
      )
      // The hint is still a purchase attempt: tapping it explains why the
      // shelf cannot be upgraded yet instead of leaving a dead area.
      const hintHit = scene.add
        .zone(width / 2 - buttonWidth / 2 - 12 * ui, 0, buttonWidth, height)
        .setInteractive({ useHandCursor: true })
      hintHit.on('pointerdown', () => {
        const next = this.options.onShelfUpgrade(zone)
        this.setState(next)
      })
      card.add(hintHit)
      parent.add(card)
      return top + height + 8 * ui
    }
    const cost = shelfUpgradeCost(level)
    const buy = new Button(
      scene,
      width / 2 - buttonWidth / 2 - 12 * ui,
      0,
      cost === null ? i18n.t('shop.max') : i18n.t('shelf.upgrade', { cost }),
      theme,
      {
        width: buttonWidth,
        height: 32 * ui,
        fontSize: font.caption,
        minHitSize: 56 * ui,
        variant: 'soft',
        onClick: () => {
          const next = this.options.onShelfUpgrade(zone)
          this.setState(next)
        },
      },
    )
    if (cost !== null) {
      this.track(
        buy,
        cost,
        0,
        (remaining) => i18n.t('shelf.upgrade', { cost: remaining }),
        buttonWidth,
        32 * ui,
      )
    }
    card.add(buy)
    parent.add(card)
    return top + height + 6 * ui
  }

  private renderTools(
    parent: Phaser.GameObjects.Container,
    w: number,
    top: number,
    bottom: number,
  ): void {
    const ui = this.options.layout.ui
    const gap = 10 * ui
    // Four tools read as a clean 2×2 on every width. A third column only
    // produced a 3 + 1 orphan on wide panels.
    const columns = 2
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
    const font = this.options.layout.text
    const compact = height < CARD_COMFORT_HEIGHT * ui
    const { u, fit } = this.cardUnit(height)
    const g = scene.add.graphics()
    const goal = this.isGoalUpgrade(kind)
    const primary = goal
    this.drawCardFace(g, width, height, goal)
    card.add(g)
    if (goal) this.addNextTag(card, width, height)

    const icon = scene.add.graphics()
    drawToolIcon(icon, kind, -width / 2 + 38 * u, -height / 2 + (compact ? 24 : 42) * u, 24 * u)
    card.add(icon)
    card.add(
      scene.add
        .text(
          -width / 2 + 64 * u,
          -height / 2 + (compact ? 22 : 26) * u,
          i18n.t(`tool.${kind}`),
          textStyle(theme, font.label * fit, theme.text, true),
        )
        .setOrigin(0, 0.5),
    )
    const level = this.state.upgrades[kind]
    const max = upgradeMax(kind)
    const pips = scene.add.graphics()
    drawLevelPips(pips, -width / 2 + 82 * u, -height / 2 + 46 * u, level, max, theme, u)
    card.add(pips)
    // The effect is the reason to buy the tool, so it survives the compact
    // landscape layout; only the wording scale drops.
    if (!compact || height >= 125 * ui) {
      card.add(
        scene.add
          .text(
            -width / 2 + 18 * u,
            -height / 2 + 62 * u,
            i18n.t(`tool.${kind}.desc`, { value: UPGRADE_EFFECT[kind] }),
            {
              ...textStyle(theme, (compact ? font.caption : font.body) * fit, theme.textMuted),
              wordWrap: { width: width - 36 * u },
            },
          )
          .setOrigin(0, 0),
      )
    }

    const cost = upgradeCost(kind, level)
    const label = cost === null ? i18n.t('shop.max') : i18n.t('shop.upgrade', { cost })
    const buy = new Button(scene, 0, height / 2 - 32 * u, label, theme, {
      width: width - 36 * u,
      height: 44 * u,
      fontSize: font.body * fit,
      minHitSize: 64 * ui,
      variant: cost === null ? 'soft' : primary ? 'primary' : 'soft',
      onClick: () => {
        const next = this.options.onUpgrade(kind)
        this.setState(next)
      },
    })
    if (cost !== null) {
      this.track(
        buy,
        cost,
        0,
        (remaining) => i18n.t('shop.upgrade', { cost: remaining }),
        width - 36 * u,
        44 * u,
      )
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
    // Portrait is a vertical roster: one readable row per hire instead of
    // squeezing four 120px cards across the panel.
    const columns = this.options.layout.portrait ? 1 : kinds.length
    const rows = Math.ceil(kinds.length / columns)
    const cardW = (w - 60 * ui - gap * (columns - 1)) / columns
    const cardH = Math.min((bottom - top - gap * (rows - 1)) / rows, MAX_STAFF_CARD_HEIGHT * ui)
    const topOffset = rows === 1 ? top + (bottom - top - cardH) / 2 : top + 8 * ui
    kinds.forEach((kind, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const x = 30 * ui + column * (cardW + gap) + cardW / 2
      parent.add(this.staffCard(kind, x, topOffset + row * (cardH + gap) + cardH / 2, cardW, cardH))
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
    const font = this.options.layout.text
    const compact = height < CARD_COMFORT_HEIGHT * ui
    const { u, fit } = this.cardUnit(height)
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 16 * u)
    g.lineStyle(2 * u, theme.borderSoft, 1)
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, 16 * u)
    card.add(g)

    card.add(
      scene.add
        .image(-width / 2 + 48 * u, -height / 2 + (compact ? 46 : 58) * u, staffPortraitKey(kind))
        .setScale(0.66 * u * ANIMAL_SCALE),
    )
    card.add(
      scene.add
        .text(
          -width / 2 + 84 * u,
          -height / 2 + 34 * u,
          i18n.t(`staff.${kind}`),
          textStyle(theme, font.label * fit, theme.text, true),
        )
        .setOrigin(0, 0.5),
    )
    const level = this.state.staff[kind]
    const max = staffMax(kind)
    const pips = scene.add.graphics()
    drawLevelPips(
      pips,
      -width / 2 + 84 * u,
      -height / 2 + (compact ? 46 : 64) * u,
      level,
      max,
      theme,
      u,
    )
    card.add(pips)
    const cost = staffCost(kind, level)
    const deposit = this.state.deposits[`staff:${kind}`] ?? 0
    if (!compact) {
      card.add(
        scene.add
          .text(-width / 2 + 20 * u, -height / 2 + 108 * u, i18n.t(`staff.${kind}.desc`), {
            ...textStyle(theme, (compact ? font.caption : font.body) * fit, theme.textMuted),
            wordWrap: { width: width - 40 * u },
          })
          .setOrigin(0, 0),
      )
      if (deposit > 0 && cost !== null) {
        card.add(
          scene.add
            .text(
              -width / 2 + 20 * u,
              -height / 2 + 172 * u,
              i18n.t('shop.depositLine', {
                paid: deposit,
                remaining: Math.max(0, cost - deposit),
              }),
              textStyle(theme, font.body * fit, theme.textMuted, true),
            )
            .setOrigin(0, 0),
        )
      }
    }

    const remaining = cost === null ? 0 : Math.max(0, cost - deposit)
    const label = cost === null ? i18n.t('shop.max') : i18n.t('shop.hire', { cost: remaining })
    const buy = new Button(scene, 0, height / 2 - 36 * u, label, theme, {
      width: width - 36 * u,
      height: 46 * u,
      fontSize: font.body * fit,
      minHitSize: 64 * ui,
      variant: 'soft',
      onClick: () => {
        const next = this.options.onStaff(kind)
        this.setState(next)
      },
    })
    if (cost !== null) {
      this.track(
        buy,
        cost,
        deposit,
        (value) => i18n.t('shop.hire', { cost: value }),
        width - 36 * u,
        46 * u,
      )
    }
    card.add(buy)
    return card
  }

  private track(
    button: Button,
    cost: number,
    deposit: number,
    format: (remaining: number) => string,
    faceWidth: number,
    faceHeight: number,
    locked = false,
    lockedLabel?: string,
  ): void {
    const { scene, theme } = this.options
    const ui = this.options.layout.ui
    // The shared Button fades its whole container when disabled, which makes
    // the "Need X coins" label unreadable. A soft overlay keeps the label at
    // full contrast while still reading as unavailable.
    const face = scene.add.graphics()
    const radius = Math.min(theme.radius, faceHeight / 2)
    face.fillStyle(theme.surfaceAlt, 1)
    face.fillRoundedRect(-faceWidth / 2, -faceHeight / 2, faceWidth, faceHeight, radius)
    face.lineStyle(Math.max(1, 2 * ui), theme.borderSoft, 1)
    face.strokeRoundedRect(-faceWidth / 2, -faceHeight / 2, faceWidth, faceHeight, radius)
    face.setVisible(false)
    button.addAt(face, 1)
    this.dynamicButtons.push({
      button,
      face,
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

  /** One orange purchase button per plant tab: the goal crop, or the cheapest. */
  private primaryPlant(): PlantKind | null {
    if (this.zone !== 'fruit' && this.zone !== 'veg') return null
    const goal = this.goal()
    if (
      goal !== null &&
      goal.type === 'producer' &&
      isPlantKind(goal.product) &&
      zoneOf(goal.product) === this.zone
    ) {
      return goal.product
    }
    return PLANT_SHOP_ORDER.find((product) => zoneOf(product) === this.zone) ?? null
  }

  /** The first empty pen/station is the one primary "choose" action. */
  private firstEmptySlot(zone: 'farm' | 'kitchen'): number | null {
    const slots =
      zone === 'farm' ? this.options.layout.map.animalPens : this.options.layout.map.stationSlots
    for (const slot of slots) {
      const occupied = this.state.producers.some(
        (producer) => producer.slot === slot.index && zoneOf(producer.product) === zone,
      )
      if (!occupied) return slot.index
    }
    return null
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
          entry.button.setAlpha(1)
          entry.face.setVisible(true)
        }
        continue
      }
      const remaining = Math.max(0, entry.cost - entry.deposit)
      const affordable = this.state.coins >= remaining
      if (entry.enabled !== affordable) {
        entry.enabled = affordable
        // Keep the hit area alive even when the price is out of reach, so the
        // existing purchase callback can surface a "not enough coins" toast.
        entry.button.setAlpha(1)
        entry.face.setVisible(!affordable)
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
        .map((input) => {
          if ('product' in input) return `${input.count}× ${this.productName(input.product)}`
          if ('pool' in input) return `${input.count}× ${i18n.t('shop.anyGrill')}`
          return `${input.count}× ${i18n.t(input.category === 'fruit' ? 'shop.anyFruit' : 'shop.anyVeg')}`
        })
        .join(', ')
      return i18n.t('shop.recipe', { items: inputs })
    }
    return ''
  }
}
