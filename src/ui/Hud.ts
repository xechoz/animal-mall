import { Button, type I18n, mixColor, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { ZONE_PRODUCTS } from '../logic/config'
import { type Goal, goalCost, nextGoal } from '../logic/goals'
import type { ProductKind, ShopState } from '../logic/types'
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
    this.coinIcon = scene.add.image(0, 0, coinTextureKey()).setDepth(6002).setScale(0.78)
    this.coinsText = scene.add
      .text(0, 0, '', textStyle(theme, 22, theme.text, true))
      .setOrigin(0, 0.5)
      .setDepth(6002)
    this.goalIcon = scene.add.image(0, 0, productTextureKey('apple')).setDepth(6002)
    this.goalTool = scene.add.graphics().setDepth(6002)
    this.goalCoin = scene.add.image(0, 0, coinTextureKey()).setDepth(6002).setScale(0.6)
    this.goalCost = scene.add
      .text(0, 0, '', textStyle(theme, 16, theme.text, true))
      .setOrigin(0, 0.5)
      .setDepth(6002)
    this.goalBg = scene.add.rectangle(0, 0, 10, 6, theme.ink, 0.13).setOrigin(0, 0.5).setDepth(6002)
    this.goalFill = scene.add
      .rectangle(0, 0, 0, 6, theme.accent, 1)
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
        width: 64,
        height: 36,
        fontSize: 13,
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
    this.vertical = hud.vertical
    this.bar.clear()

    if (hud.vertical) {
      this.bar.fillStyle(this.theme.shadow, 0.16)
      this.bar.fillRoundedRect(bar.x, bar.y + 7, bar.w, bar.h, 22)
      this.bar.fillStyle(this.theme.panel, 0.94)
      this.bar.fillRoundedRect(bar.x, bar.y, bar.w, bar.h, 22)
      this.bar.lineStyle(2, this.theme.borderSoft, 0.8)
      this.bar.strokeRoundedRect(bar.x, bar.y, bar.w, bar.h, 22)
      this.bar.fillStyle(this.theme.accentWarm, 0.4)
      this.bar.fillRoundedRect(bar.x + 8, bar.y + 8, bar.w - 16, 84, 16)
      this.bar.fillStyle(this.theme.ink, 0.08)
      this.bar.fillRoundedRect(bar.x + 16, bar.y + 160, bar.w - 32, 2, 1)
      this.bar.fillStyle(this.theme.ink, 0.08)
      this.bar.fillRoundedRect(bar.x + 16, hud.shop.y - 56, bar.w - 32, 2, 1)
      this.bar.fillStyle(this.theme.accentWarm, 0.55)
      this.bar.fillRoundedRect(bar.x + bar.w / 2 - 14, bar.y + bar.h - 14, 28, 4, 2)
    } else {
      this.bar.fillStyle(this.theme.shadow, 0.16)
      this.bar.fillRoundedRect(bar.x, bar.y + 7, bar.w, bar.h, 18)
      this.bar.fillStyle(this.theme.panel, 0.94)
      this.bar.fillRoundedRect(bar.x, bar.y, bar.w, bar.h, 18)
      this.bar.lineStyle(2, this.theme.borderSoft, 0.8)
      this.bar.strokeRoundedRect(bar.x, bar.y, bar.w, bar.h, 18)
      this.bar.fillStyle(this.theme.accentWarm, 0.45)
      this.bar.fillRoundedRect(bar.x + 8, bar.y + 6, 92, bar.h - 12, 13)
    }

    if (hud.vertical) {
      this.coinBaseScale = 0.7
      this.coinIcon.setPosition(hud.coins.x, hud.coins.y).setScale(this.coinBaseScale)
      this.coinsText.setOrigin(0.5, 0.5).setPosition(hud.coins.x, hud.coins.y + 27)
      this.goalIcon.setPosition(hud.goal.x - 30, hud.goal.y - 6).setScale(0.45)
      this.goalCoin.setPosition(hud.goal.x - 8, hud.goal.y - 6)
      this.goalCost.setOrigin(0, 0.5).setPosition(hud.goal.x + 2, hud.goal.y - 6)
      this.goalBg.setPosition(hud.goal.x - hud.goalWidth / 2, hud.goal.y + 16)
      this.goalFill.setPosition(hud.goal.x - hud.goalWidth / 2, hud.goal.y + 16)
    } else {
      this.coinBaseScale = 0.78
      this.coinIcon.setPosition(hud.coins.x - 24, hud.coins.y).setScale(this.coinBaseScale)
      this.coinsText.setOrigin(0, 0.5).setPosition(hud.coins.x - 4, hud.coins.y)
      this.goalIcon.setPosition(hud.goal.x - 46, hud.goal.y - 7).setScale(0.45)
      this.goalCoin.setPosition(hud.goal.x - 10, hud.goal.y - 7)
      this.goalCost.setOrigin(0, 0.5).setPosition(hud.goal.x + 4, hud.goal.y - 7)
      this.goalBg.setPosition(hud.goal.x - hud.goalWidth / 2, hud.goal.y + 13)
      this.goalFill.setPosition(hud.goal.x - hud.goalWidth / 2, hud.goal.y + 13)
    }
    this.goalBg.setDisplaySize(hud.goalWidth, 6)
    this.shopButton.setPosition(hud.shop.x, hud.shop.y)
    this.pauseButton.setPosition(hud.pause.x, hud.pause.y)
    this.devButton?.setPosition(
      hud.vertical ? bar.x + bar.w / 2 : hud.shop.x - 78,
      hud.vertical ? bar.y + bar.h - 44 : hud.shop.y,
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
        this.coinsText.setFontSize(size)
      } else {
        this.coinsText.setFontSize(22)
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
      this.goalFill.setDisplaySize(this.layout.hud.goalWidth * ratio, 6)
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
    const x = hud.goal.x
    const y = hud.goal.y - (hud.vertical ? 6 : 7)
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
          .setFontSize(11)
          .setWordWrapWidth(hud.goalWidth + 12, true)
      } else {
        this.goalCost
          .setOrigin(0, 0.5)
          .setPosition(x + 2, y)
          .setFontSize(16)
          .setWordWrapWidth(1000, true)
      }
    } else {
      this.goalCost
        .setOrigin(0, 0.5)
        .setPosition(x + 4, y)
        .setFontSize(16)
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
        hud.vertical ? x - 30 : x - 46,
        y,
        hud.vertical ? 18 : 20,
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
