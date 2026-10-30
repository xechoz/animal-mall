import { Button, type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import {
  FRUIT_ORDER,
  FRUITS,
  STAFF,
  STAFF_ORDER,
  UPGRADE_EFFECT,
  UPGRADE_ORDER,
} from '../logic/config'
import {
  activeTreeDeposit,
  emptyPlot,
  plantedCount,
  staffCost,
  staffMax,
  treeDepositKey,
  upgradeCost,
  upgradeMax,
} from '../logic/purchase'
import type { FruitKind, ShopState, StaffKind, UpgradeKind } from '../logic/types'
import { animalTextureKey } from './animalArt'
import { FRUIT_COLORS, fruitTextureKey } from './fruitArt'
import type { GameLayout } from './layout'
import { drawToolIcon } from './toolArt'

export interface ShopPanelOptions {
  readonly scene: Phaser.Scene
  readonly layout: GameLayout
  readonly theme: Theme
  readonly i18n: I18n
  readonly state: ShopState
  readonly onPlant: (kind: FruitKind) => ShopState
  readonly onUpgrade: (kind: UpgradeKind) => ShopState
  readonly onStaff: (kind: StaffKind) => ShopState
  readonly onRemove: (plot: number) => ShopState
  readonly onClose: () => void
}

type Tab = 'trees' | 'tools' | 'staff'

export class ShopPanel {
  private readonly options: ShopPanelOptions
  private readonly root: Phaser.GameObjects.Container
  private readonly blocker: Phaser.GameObjects.Rectangle
  private state: ShopState
  private tab: Tab = 'trees'
  private content?: Phaser.GameObjects.Container
  private confirm?: Phaser.GameObjects.Container
  private closed = false
  private structureKey = ''
  private balanceText?: Phaser.GameObjects.Text
  private readonly treeButtons = new Map<FruitKind, Button>()
  private readonly toolButtons = new Map<UpgradeKind, Button>()
  private readonly staffButtons = new Map<StaffKind, Button>()

  constructor(options: ShopPanelOptions) {
    this.options = options
    this.state = options.state
    const { scene } = options
    this.root = scene.add.container(0, 0).setDepth(7000)
    this.blocker = scene.add
      .rectangle(0, 0, options.layout.width, options.layout.height, options.theme.overlay, 0.68)
      .setOrigin(0)
      .setInteractive()
    this.blocker.on('pointerdown', () => this.close())
    this.root.add(this.blocker)
    this.render()
  }

  setState(state: ShopState): void {
    this.state = state
    if (!this.closed) this.render()
  }

  update(state: ShopState): void {
    if (this.closed) return
    if (this.structureKeyFor(state) !== this.structureKey) {
      this.state = state
      this.render()
      return
    }
    this.state = state
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

  private render(): void {
    const { scene, layout, theme } = this.options
    const panelX = (layout.width - layout.panelWidth) / 2
    const panelY = (layout.height - layout.panelHeight) / 2
    this.content?.destroy(true)
    this.confirm?.destroy(true)
    this.treeButtons.clear()
    this.toolButtons.clear()
    this.staffButtons.clear()
    this.balanceText = undefined
    this.content = scene.add.container(panelX, panelY)
    this.root.add(this.content)
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
    g.fillRoundedRect(18, 18, w - 36, 62, 18)
    this.content.add(g)

    const blocker = scene.add.rectangle(w / 2, h / 2, w, h, 0, 0).setInteractive()
    this.content.add(blocker)

    const title = scene.add
      .text(34, 42, this.options.i18n.t('shop.title'), textStyle(theme, 28, theme.text, true))
      .setOrigin(0, 0.5)
    this.content.add(title)

    const balance = scene.add
      .text(
        w - 104,
        42,
        this.options.i18n.t('shop.balance', { coins: this.state.coins }),
        textStyle(theme, 18, theme.text, true),
      )
      .setOrigin(1, 0.5)
    this.balanceText = balance
    this.content.add(balance)

    const close = new Button(scene, w - 40, 42, '×', theme, {
      width: 42,
      height: 42,
      variant: 'soft',
      fontSize: 26,
      onClick: () => this.close(),
    })
    this.content.add(close)

    this.renderTabs(w)

    const contentTop = 108
    const contentBottom = h - 22
    const contentHeight = contentBottom - contentTop
    const gap = 12
    const cols = 2
    const rows = this.tab === 'trees' ? 2 : this.tab === 'tools' ? 3 : 1
    const cardW = (w - 48 - gap * (cols - 1)) / cols
    const cardH = (contentHeight - gap * (rows - 1)) / rows

    if (this.tab === 'trees') {
      FRUIT_ORDER.forEach((kind, index) => {
        const column = index % cols
        const row = Math.floor(index / cols)
        const x = 24 + column * (cardW + gap) + cardW / 2
        const y = contentTop + row * (cardH + gap) + cardH / 2
        this.content?.add(this.fruitCard(kind, x, y, cardW, cardH))
      })
    } else if (this.tab === 'tools') {
      UPGRADE_ORDER.forEach((kind, index) => {
        const column = index % cols
        const row = Math.floor(index / cols)
        const x = 24 + column * (cardW + gap) + cardW / 2
        const y = contentTop + row * (cardH + gap) + cardH / 2
        this.content?.add(this.toolCard(kind, x, y, cardW, cardH))
      })
    } else {
      STAFF_ORDER.forEach((kind, index) => {
        const column = index % cols
        const x = 24 + column * (cardW + gap) + cardW / 2
        const y = contentTop + cardH / 2
        this.content?.add(this.staffCard(kind, x, y, cardW, cardH))
      })
    }

    this.structureKey = this.structureKeyFor(this.state)
    this.refreshDynamic()
  }

  private renderTabs(w: number): void {
    const { scene, theme } = this.options
    const y = 78
    const gap = 6
    const tabWidth = Math.min(144, (w - 60 - gap * 2) / 3)
    const tabs: readonly { readonly tab: Tab; readonly label: string }[] = [
      { tab: 'trees', label: this.options.i18n.t('shop.trees') },
      { tab: 'tools', label: this.options.i18n.t('shop.tools') },
      { tab: 'staff', label: this.options.i18n.t('shop.staff') },
    ]
    tabs.forEach((entry, index) => {
      const button = new Button(
        scene,
        24 + tabWidth / 2 + index * (tabWidth + gap),
        y,
        entry.label,
        theme,
        {
          width: tabWidth,
          height: 34,
          fontSize: tabWidth < 110 ? 13 : 16,
          variant: this.tab === entry.tab ? 'primary' : 'soft',
          onClick: () => this.switchTab(entry.tab),
        },
      )
      this.content?.add(button)
    })
  }

  private switchTab(tab: Tab): void {
    if (this.tab === tab) return
    this.tab = tab
    this.render()
  }

  private structureKeyFor(state: ShopState): string {
    const trees = [...state.trees]
      .sort((a, b) => a.plot - b.plot)
      .map((tree) => `${tree.kind}@${tree.plot}`)
      .join(',')
    const upgrades = UPGRADE_ORDER.map((kind) => state.upgrades[kind]).join(',')
    const staff = STAFF_ORDER.map((kind) => state.staff[kind]).join(',')
    const deposits = Object.entries(state.deposits)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, amount]) => `${key}:${amount}`)
      .join(',')
    return `${this.tab}|${trees}|${upgrades}|${staff}|${deposits}`
  }

  private refreshDynamic(): void {
    const { i18n } = this.options
    this.balanceText?.setText(i18n.t('shop.balance', { coins: this.state.coins }))

    const activeDeposit = activeTreeDeposit(this.state)
    for (const [kind, button] of this.treeButtons) {
      const cost = FRUITS[kind].cost
      const deposit = this.state.deposits[treeDepositKey(kind)] ?? 0
      const remaining = Math.max(0, cost - deposit)
      const locked = activeDeposit !== null && activeDeposit.kind !== kind
      const hasPlot = emptyPlot(this.state) !== null
      button.setEnabled(hasPlot && !locked && this.state.coins >= remaining)
      if (!hasPlot) button.setText(i18n.t('shop.needPlot'))
      else if (locked) button.setText(i18n.t('shop.depositLocked'))
      else if (this.state.coins < remaining) {
        button.setText(i18n.t('shop.notEnough', { cost: remaining - this.state.coins }))
      } else {
        button.setText(i18n.t('shop.plant', { cost: remaining }))
      }
    }

    for (const [kind, button] of this.toolButtons) {
      const level = this.state.upgrades[kind]
      const cost = upgradeCost(kind, level)
      if (cost === null) {
        button.setText(i18n.t('shop.max'))
        button.setEnabled(false)
        continue
      }
      button.setText(
        this.state.coins < cost
          ? i18n.t('shop.notEnough', { cost: cost - this.state.coins })
          : i18n.t('shop.upgrade', { cost }),
      )
      button.setEnabled(this.state.coins >= cost)
    }

    for (const [kind, button] of this.staffButtons) {
      const level = this.state.staff[kind]
      const cost = staffCost(kind, level)
      if (cost === null) {
        button.setText(i18n.t('shop.max'))
        button.setEnabled(false)
        continue
      }
      const deposit = this.state.deposits[`staff:${kind}`] ?? 0
      const remaining = Math.max(0, cost - deposit)
      button.setText(
        this.state.coins < remaining
          ? i18n.t('shop.notEnough', { cost: remaining - this.state.coins })
          : i18n.t('shop.hire', { cost: remaining }),
      )
      button.setEnabled(this.state.coins >= remaining)
    }
  }

  private fruitCard(kind: FruitKind, x: number, y: number, width: number, height: number) {
    const { scene, theme, i18n } = this.options
    const card = scene.add.container(x, y)
    const g = scene.add.graphics()
    g.fillStyle(theme.surface, 1)
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 16)
    g.lineStyle(2, theme.borderSoft, 1)
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, 16)
    g.fillStyle(FRUIT_COLORS[kind], 0.16)
    g.fillRoundedRect(-width / 2 + 8, -height / 2 + 8, width - 16, 34, 10)
    card.add(g)

    const icon = scene.add
      .image(-width / 2 + 48, -height / 2 + 58, fruitTextureKey(kind))
      .setScale(1.15)
    card.add(icon)

    const name = scene.add
      .text(
        -width / 2 + 82,
        -height / 2 + 36,
        i18n.t(`fruit.${kind}`),
        textStyle(theme, 19, theme.text, true),
      )
      .setOrigin(0, 0.5)
    card.add(name)

    const planted = plantedCount(this.state, kind)
    const countLabel = scene.add
      .text(
        width / 2 - 18,
        -height / 2 + 36,
        planted > 0 ? i18n.t('shop.planted', { count: planted }) : '',
        textStyle(theme, 12, theme.textMuted, true),
      )
      .setOrigin(1, 0.5)
    card.add(countLabel)

    const config = FRUITS[kind]
    const stats = scene.add
      .text(
        -width / 2 + 20,
        -height / 2 + 80,
        i18n.t('shop.stats', {
          price: config.price,
          grow: Math.round(config.growMs / 1000),
          fruit: Math.round(config.fruitMs / 1000),
        }),
        textStyle(theme, 13, theme.textMuted),
      )
      .setOrigin(0, 0)
    card.add(stats)

    const cost = config.cost
    const deposit = this.state.deposits[treeDepositKey(kind)] ?? 0
    if (deposit > 0) {
      const paid = scene.add
        .text(
          -width / 2 + 20,
          -height / 2 + 104,
          i18n.t('shop.depositLine', { paid: deposit, remaining: Math.max(0, cost - deposit) }),
          textStyle(theme, 12, theme.textMuted, true),
        )
        .setOrigin(0, 0)
      card.add(paid)
    }

    const hasPlot = emptyPlot(this.state) !== null
    const canPlant = this.state.coins >= Math.max(0, cost - deposit) && hasPlot
    const plantLabel = !hasPlot
      ? i18n.t('shop.needPlot')
      : this.state.coins < Math.max(0, cost - deposit)
        ? i18n.t('shop.notEnough', { cost: Math.max(0, cost - deposit) - this.state.coins })
        : i18n.t('shop.plant', { cost: Math.max(0, cost - deposit) })
    const plant = new Button(scene, 0, height / 2 - 42, plantLabel, theme, {
      width: width - 36,
      height: 40,
      fontSize: 15,
      variant: 'primary',
      onClick: () => {
        const next = this.options.onPlant(kind)
        this.setState(next)
      },
    })
    plant.setEnabled(canPlant)
    this.treeButtons.set(kind, plant)
    card.add(plant)

    if (planted > 0) {
      const first = this.state.trees.find((tree) => tree.kind === kind)
      if (first !== undefined) {
        const refund = Math.floor(cost / 2)
        const remove = new Button(
          scene,
          0,
          height / 2 - 84,
          i18n.t('shop.remove', { refund }),
          theme,
          {
            width: width - 36,
            height: 28,
            fontSize: 13,
            variant: 'soft',
            onClick: () => this.confirmRemove(first.plot, refund),
          },
        )
        card.add(remove)
      }
    }

    return card
  }

  private toolCard(kind: UpgradeKind, x: number, y: number, width: number, height: number) {
    const { scene, theme, i18n } = this.options
    const card = scene.add.container(x, y)
    const g = scene.add.graphics()
    g.fillStyle(theme.surface, 1)
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 16)
    g.lineStyle(2, theme.borderSoft, 1)
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, 16)
    g.fillStyle(theme.accentAlt, 0.13)
    g.fillRoundedRect(-width / 2 + 8, -height / 2 + 8, width - 16, 30, 10)
    card.add(g)

    const icon = scene.add.graphics()
    drawToolIcon(icon, kind, -width / 2 + 38, -height / 2 + 42, 26)
    card.add(icon)

    const level = this.state.upgrades[kind]
    const max = upgradeMax(kind)
    const name = scene.add
      .text(
        -width / 2 + 66,
        -height / 2 + 28,
        i18n.t(`tool.${kind}`),
        textStyle(theme, 17, theme.text, true),
      )
      .setOrigin(0, 0.5)
    card.add(name)
    const levelText = scene.add
      .text(
        width / 2 - 18,
        -height / 2 + 28,
        i18n.t('shop.level', { level, max }),
        textStyle(theme, 12, theme.textMuted, true),
      )
      .setOrigin(1, 0.5)
    card.add(levelText)

    const effect = UPGRADE_EFFECT[kind]
    const desc = scene.add
      .text(
        -width / 2 + 20,
        -height / 2 + 64,
        i18n.t(`tool.${kind}.desc`, { value: effect }),
        textStyle(theme, 12, theme.textMuted),
      )
      .setOrigin(0, 0.5)
    card.add(desc)

    const cost = upgradeCost(kind, level)
    const label = cost === null ? i18n.t('shop.max') : i18n.t('shop.upgrade', { cost })
    const buy = new Button(scene, 0, height / 2 - 34, label, theme, {
      width: width - 36,
      height: 38,
      fontSize: 15,
      variant: cost === null ? 'soft' : 'primary',
      onClick: () => {
        const next = this.options.onUpgrade(kind)
        this.setState(next)
      },
    })
    buy.setEnabled(cost !== null && this.state.coins >= cost)
    if (cost !== null && this.state.coins < cost) {
      buy.setText(i18n.t('shop.notEnough', { cost: cost - this.state.coins }))
    }
    this.toolButtons.set(kind, buy)
    card.add(buy)

    return card
  }

  private staffCard(kind: StaffKind, x: number, y: number, width: number, height: number) {
    const { scene, theme, i18n } = this.options
    const card = scene.add.container(x, y)
    const g = scene.add.graphics()
    g.fillStyle(theme.surface, 1)
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 16)
    g.lineStyle(2, theme.borderSoft, 1)
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, 16)
    g.fillStyle(theme.accentAlt, 0.13)
    g.fillRoundedRect(-width / 2 + 8, -height / 2 + 8, width - 16, 30, 10)
    card.add(g)

    const icon = scene.add
      .image(-width / 2 + 46, -height / 2 + 64, animalTextureKey(STAFF[kind].species))
      .setScale(0.72)
    card.add(icon)

    const level = this.state.staff[kind]
    const max = staffMax(kind)
    const name = scene.add
      .text(
        -width / 2 + 82,
        -height / 2 + 34,
        i18n.t(`staff.${kind}`),
        textStyle(theme, 19, theme.text, true),
      )
      .setOrigin(0, 0.5)
    card.add(name)

    const levelText = scene.add
      .text(
        width / 2 - 18,
        -height / 2 + 34,
        i18n.t('shop.level', { level, max }),
        textStyle(theme, 12, theme.textMuted, true),
      )
      .setOrigin(1, 0.5)
    card.add(levelText)

    const desc = scene.add
      .text(-width / 2 + 20, -height / 2 + 104, i18n.t(`staff.${kind}.desc`), {
        ...textStyle(theme, 13, theme.textMuted),
        wordWrap: { width: width - 40 },
      })
      .setOrigin(0, 0)
    card.add(desc)

    const cost = staffCost(kind, level)
    const deposit = this.state.deposits[`staff:${kind}`] ?? 0
    if (deposit > 0 && cost !== null) {
      const paid = scene.add
        .text(
          -width / 2 + 20,
          -height / 2 + 136,
          i18n.t('shop.depositLine', { paid: deposit, remaining: Math.max(0, cost - deposit) }),
          textStyle(theme, 12, theme.textMuted, true),
        )
        .setOrigin(0, 0)
      card.add(paid)
    }
    const remaining = cost === null ? 0 : Math.max(0, cost - deposit)
    const label = cost === null ? i18n.t('shop.max') : i18n.t('shop.hire', { cost: remaining })
    const buy = new Button(scene, 0, height / 2 - 42, label, theme, {
      width: width - 36,
      height: 40,
      fontSize: 15,
      variant: cost === null ? 'soft' : 'primary',
      onClick: () => {
        const next = this.options.onStaff(kind)
        this.setState(next)
      },
    })
    buy.setEnabled(cost !== null && this.state.coins >= remaining)
    if (cost !== null && this.state.coins < remaining) {
      buy.setText(i18n.t('shop.notEnough', { cost: remaining - this.state.coins }))
    }
    this.staffButtons.set(kind, buy)
    card.add(buy)

    return card
  }

  private confirmRemove(plot: number, refund: number): void {
    if (this.confirm !== undefined) return
    const { scene, theme, i18n } = this.options
    const width = this.options.layout.panelWidth
    const height = this.options.layout.panelHeight
    const overlay = scene.add.container(width / 2, height / 2)
    const dim = scene.add.rectangle(0, 0, width, height, theme.overlay, 0.55).setInteractive()
    overlay.add(dim)
    const cardW = Math.min(420, width - 60)
    const cardH = 224
    const g = scene.add.graphics()
    g.fillStyle(theme.panel, 1)
    g.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 22)
    g.lineStyle(2, theme.borderSoft, 1)
    g.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 22)
    overlay.add(g)
    overlay.add(
      scene.add
        .text(
          0,
          -cardH / 2 + 40,
          i18n.t('shop.removeTitle'),
          textStyle(theme, 22, theme.text, true),
        )
        .setOrigin(0.5),
    )
    overlay.add(
      scene.add
        .text(0, -20, i18n.t('shop.removeBody', { refund }), {
          ...textStyle(theme, 14, theme.textMuted),
          align: 'center',
          wordWrap: { width: cardW - 60 },
        })
        .setOrigin(0.5),
    )
    overlay.add(
      new Button(scene, 0, cardH / 2 - 74, i18n.t('shop.removeConfirm'), theme, {
        width: cardW - 70,
        height: 44,
        fontSize: 16,
        variant: 'danger',
        onClick: () => {
          const next = this.options.onRemove(plot)
          this.confirm?.destroy(true)
          this.confirm = undefined
          this.setState(next)
        },
      }),
    )
    overlay.add(
      new Button(scene, 0, cardH / 2 - 26, i18n.t('shop.cancel'), theme, {
        width: cardW - 70,
        height: 36,
        fontSize: 14,
        variant: 'soft',
        onClick: () => {
          this.confirm?.destroy(true)
          this.confirm = undefined
        },
      }),
    )
    this.content?.add(overlay)
    this.confirm = overlay
  }
}
