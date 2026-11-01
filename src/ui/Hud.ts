import { Button, type I18n, mixColor, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { ZONE_PRODUCTS } from '../logic/config'
import { type Goal, goalCost, nextGoal } from '../logic/goals'
import type { ProductKind, ShopState } from '../logic/types'
import { drawPanelFrame } from './frames'
import { coinTextureKey } from './fruitArt'
import type { GameLayout } from './layout'
import { productTextureKey } from './productArt'
import { RoundButton } from './RoundButton'
import { drawToolIcon } from './toolArt'
import { ZoneStatusRail } from './ZoneStatusRail'

export interface HudCallbacks {
  readonly onShop: () => void
  readonly onPause: () => void
  readonly onDev?: () => void
}

export class Hud {
  private readonly theme: Theme
  private readonly i18n: I18n
  private readonly bar: Phaser.GameObjects.Graphics
  private readonly coinIcon: Phaser.GameObjects.Image
  private readonly coinsText: Phaser.GameObjects.Text
  private readonly goalIcon: Phaser.GameObjects.Image
  private readonly goalTool: Phaser.GameObjects.Graphics
  private readonly goalCoin: Phaser.GameObjects.Image
  private readonly goalCost: Phaser.GameObjects.Text
  private readonly goalBg: Phaser.GameObjects.Rectangle
  private readonly goalFill: Phaser.GameObjects.Rectangle
  private readonly shopButton: RoundButton
  private readonly pauseButton: RoundButton
  private readonly devButton?: Button
  private readonly zoneStatus: ZoneStatusRail
  private devEnabled = true
  private layout: GameLayout
  private vertical = false
  private coinBaseScale = 0.78
  private lastCoins = -1
  private lastGoal = ''

  constructor(
    scene: Phaser.Scene,
    layout: GameLayout,
    theme: Theme,
    i18n: I18n,
    callbacks: HudCallbacks,
  ) {
    this.theme = theme
    this.i18n = i18n
    this.layout = layout

    this.bar = scene.add.graphics().setDepth(6000)
    this.coinIcon = scene.add
      .image(0, 0, coinTextureKey())
      .setDepth(6002)
      .setScale(0.78 * layout.ui)
    this.coinsText = scene.add
      .text(0, 0, '', textStyle(theme, 22 * layout.ui, theme.text, true))
      .setOrigin(0, 0.5)
      .setDepth(6002)
    this.goalIcon = scene.add.image(0, 0, productTextureKey('apple')).setDepth(6002)
    this.goalTool = scene.add.graphics().setDepth(6002)
    this.goalCoin = scene.add
      .image(0, 0, coinTextureKey())
      .setDepth(6002)
      .setScale(0.6 * layout.ui)
    this.goalCost = scene.add
      .text(0, 0, '', textStyle(theme, 16 * layout.ui, theme.text, true))
      .setOrigin(0, 0.5)
      .setDepth(6002)
    this.goalBg = scene.add
      .rectangle(0, 0, 10, 6 * layout.ui, theme.ink, 0.13)
      .setOrigin(0, 0.5)
      .setDepth(6002)
    this.goalFill = scene.add
      .rectangle(0, 0, 0, 6 * layout.ui, theme.accent, 1)
      .setOrigin(0, 0.5)
      .setDepth(6003)

    this.shopButton = new RoundButton(scene, 0, 0, {
      icon: 'bag',
      theme,
      variant: 'primary',
      size: layout.hud.buttonSize,
      onClick: callbacks.onShop,
    })
    this.shopButton.setDepth(6100)
    this.pauseButton = new RoundButton(scene, 0, 0, {
      icon: 'pause',
      theme,
      variant: 'soft',
      size: layout.hud.buttonSize,
      onClick: callbacks.onPause,
    })
    this.pauseButton.setDepth(6100)
    if (callbacks.onDev !== undefined) {
      this.devButton = new Button(scene, 0, 0, 'DEV', theme, {
        width: 64 * layout.ui,
        height: 36 * layout.ui,
        fontSize: 13 * layout.ui,
        variant: 'ghost',
        onClick: callbacks.onDev,
      })
      this.devButton.setDepth(6100)
    }
    this.zoneStatus = new ZoneStatusRail(scene, layout, theme)

    this.relayout(layout)
  }

  relayout(layout: GameLayout): void {
    this.layout = layout
    const hud = layout.hud
    const bar = hud.bar
    const ui = layout.ui
    this.vertical = hud.vertical
    this.bar.clear()

    if (hud.vertical) {
      drawPanelFrame(this.bar, bar.x, bar.y, bar.w, bar.h, this.theme, 20 * ui)
      this.bar.fillStyle(this.theme.accentWarm, 0.32)
      this.bar.fillRoundedRect(bar.x + 10 * ui, bar.y + 10 * ui, bar.w - 20 * ui, 80 * ui, 14 * ui)
      this.bar.lineStyle(1.5, this.theme.borderSoft, 0.9)
      this.bar.lineBetween(
        bar.x + 16 * ui,
        bar.y + 160 * ui,
        bar.x + bar.w - 16 * ui,
        bar.y + 160 * ui,
      )
      this.bar.lineBetween(
        bar.x + 16 * ui,
        hud.shop.y - 56 * ui,
        bar.x + bar.w - 16 * ui,
        hud.shop.y - 56 * ui,
      )
      this.bar.fillStyle(this.theme.accentWarm, 0.6)
      this.bar.fillEllipse(bar.x + bar.w / 2, bar.y + bar.h - 12 * ui, 28 * ui, 4 * ui)
    } else {
      drawPanelFrame(this.bar, bar.x, bar.y, bar.w, bar.h, this.theme, 18 * ui)
      this.bar.fillStyle(this.theme.accentWarm, 0.4)
      this.bar.fillRoundedRect(bar.x + 10 * ui, bar.y + 8 * ui, 92 * ui, bar.h - 16 * ui, 12 * ui)
    }

    if (hud.vertical) {
      this.coinBaseScale = 0.7 * ui
      this.coinIcon.setPosition(hud.coins.x, hud.coins.y).setScale(this.coinBaseScale)
      this.coinsText
        .setOrigin(0.5, 0.5)
        .setPosition(hud.coins.x, hud.coins.y + 27 * ui)
        .setFontSize(22 * ui)
      this.goalIcon.setPosition(hud.goal.x - 30 * ui, hud.goal.y - 6 * ui).setScale(0.45 * ui)
      this.goalCoin.setPosition(hud.goal.x - 8 * ui, hud.goal.y - 6 * ui).setScale(0.6 * ui)
      this.goalCost
        .setOrigin(0, 0.5)
        .setPosition(hud.goal.x + 2 * ui, hud.goal.y - 6 * ui)
        .setFontSize(16 * ui)
      this.goalBg.setPosition(hud.goal.x - hud.goalWidth / 2, hud.goal.y + 16 * ui)
      this.goalFill.setPosition(hud.goal.x - hud.goalWidth / 2, hud.goal.y + 16 * ui)
    } else {
      this.coinBaseScale = 0.78 * ui
      this.coinIcon.setPosition(hud.coins.x - 24 * ui, hud.coins.y).setScale(this.coinBaseScale)
      this.coinsText
        .setOrigin(0, 0.5)
        .setPosition(hud.coins.x - 4 * ui, hud.coins.y)
        .setFontSize(22 * ui)
      this.goalIcon.setPosition(hud.goal.x - 46 * ui, hud.goal.y - 7 * ui).setScale(0.45 * ui)
      this.goalCoin.setPosition(hud.goal.x - 10 * ui, hud.goal.y - 7 * ui).setScale(0.6 * ui)
      this.goalCost
        .setOrigin(0, 0.5)
        .setPosition(hud.goal.x + 4 * ui, hud.goal.y - 7 * ui)
        .setFontSize(16 * ui)
      this.goalBg.setPosition(hud.goal.x - hud.goalWidth / 2, hud.goal.y + 13 * ui)
      this.goalFill.setPosition(hud.goal.x - hud.goalWidth / 2, hud.goal.y + 13 * ui)
    }
    this.goalBg.setDisplaySize(hud.goalWidth, 6 * ui)
    this.shopButton.setPosition(hud.shop.x, hud.shop.y)
    this.pauseButton.setPosition(hud.pause.x, hud.pause.y)
    this.devButton?.setPosition(
      hud.vertical ? bar.x + bar.w / 2 : hud.shop.x - 78 * ui,
      hud.vertical ? bar.y + bar.h - 44 * ui : hud.shop.y,
    )
    this.zoneStatus.relayout(layout)
    this.lastCoins = -1
    this.lastGoal = ''
  }

  update(state: ShopState): void {
    this.zoneStatus.update(state)
    if (state.coins !== this.lastCoins) {
      this.lastCoins = state.coins
      const text = String(state.coins)
      this.coinsText.setText(text)
      if (this.vertical) {
        const size = Math.max(12, Math.min(22, Math.floor(72 / (0.62 * text.length))))
        this.coinsText.setFontSize(size * this.layout.ui)
      } else {
        this.coinsText.setFontSize(22 * this.layout.ui)
      }
    }

    const goal = nextGoal(state)
    const cost = goalCost(state, goal)
    const goalKey =
      goal === null
        ? 'done'
        : goal.type === 'zone'
          ? `zone:${goal.zone}`
          : goal.type === 'producer'
            ? `producer:${goal.product}`
            : `upgrade:${goal.kind}`
    const key = `${goalKey}-${cost}-${state.coins}`
    if (key !== this.lastGoal) {
      this.lastGoal = key
      this.drawGoal(goal, cost, state)
      this.goalCost.setColor(
        goal !== null && state.coins >= cost ? this.theme.text : this.theme.textMuted,
      )
      const ratio = goal === null ? 1 : Math.min(1, state.coins / Math.max(1, cost))
      this.goalFill.setDisplaySize(this.layout.hud.goalWidth * ratio, 6 * this.layout.ui)
      this.goalFill.setFillStyle(
        ratio >= 1
          ? this.theme.accentAlt
          : mixColor(this.theme.accent, this.theme.accentWarm, ratio),
      )
      this.shopButton.setBadge(goal !== null && state.coins >= cost)
    }
  }

  private drawGoal(goal: Goal, cost: number, state: ShopState): void {
    const hud = this.layout.hud
    const ui = this.layout.ui
    const x = hud.goal.x
    const y = hud.goal.y - (hud.vertical ? 6 : 7) * ui
    const textual = hud.vertical && goal !== null && goal.type === 'zone' && cost === 0
    this.goalTool.clear()
    this.goalIcon.setVisible(goal !== null && goal.type !== 'upgrade' && !textual)
    this.goalTool.setVisible(goal?.type === 'upgrade')
    this.goalCoin.setVisible(goal !== null && cost > 0)
    this.goalCost.setVisible(goal !== null)
    const label =
      goal === null
        ? ''
        : goal.type === 'zone' && cost === 0
          ? goal.zone === 'veg' && state.served === 0
            ? this.i18n.t('goal.afterSale')
            : this.i18n.t('goal.free')
          : String(cost)
    this.goalCost.setText(label)
    if (hud.vertical) {
      if (textual) {
        this.goalCost
          .setOrigin(0.5, 0.5)
          .setPosition(x, y)
          .setFontSize(13 * ui)
          .setWordWrapWidth(hud.goalWidth + 12 * ui, true)
      } else {
        this.goalCost
          .setOrigin(0, 0.5)
          .setPosition(x + 2 * ui, y)
          .setFontSize(16 * ui)
          .setWordWrapWidth(1000, true)
      }
    } else {
      this.goalCost
        .setOrigin(0, 0.5)
        .setPosition(x + 4 * ui, y)
        .setFontSize(16 * ui)
        .setWordWrapWidth(1000, true)
    }
    if (goal?.type === 'producer') {
      this.goalIcon.setTexture(productTextureKey(goal.product))
    } else if (goal?.type === 'zone') {
      this.goalIcon.setTexture(productTextureKey(ZONE_PRODUCTS[goal.zone][0] as ProductKind))
    } else if (goal?.type === 'upgrade') {
      drawToolIcon(
        this.goalTool,
        goal.kind,
        hud.vertical ? x - 30 * ui : x - 46 * ui,
        y,
        (hud.vertical ? 18 : 20) * ui,
      )
    }
  }

  setEnabled(enabled: boolean): void {
    this.shopButton.setEnabled(enabled)
    this.pauseButton.setEnabled(enabled)
    if (this.devButton !== undefined && this.devEnabled !== enabled) {
      this.devEnabled = enabled
      this.devButton.setEnabled(enabled)
    }
  }

  pulseCoin(): void {
    this.coinIcon.scene.tweens.add({
      targets: this.coinIcon,
      scale: { from: this.coinBaseScale * 1.22, to: this.coinBaseScale },
      duration: 220,
      ease: 'Quad.easeOut',
    })
  }
}
