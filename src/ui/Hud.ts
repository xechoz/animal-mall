import { Button, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { goalCost, nextGoal } from '../logic/goals'
import type { ShopState } from '../logic/types'
import { coinTextureKey } from './fruitArt'
import type { GameLayout } from './layout'
import { RoundButton } from './RoundButton'

export interface HudCallbacks {
  readonly onShop: () => void
  readonly onPause: () => void
  readonly onDev?: () => void
}

const COIN_PILL_HEIGHT = 44
const COIN_PILL_INSET = 26
const COIN_RAIL_HEIGHT = 84

export class Hud {
  private readonly theme: Theme
  private readonly bar: Phaser.GameObjects.Graphics
  private readonly coinIcon: Phaser.GameObjects.Image
  private readonly coinsText: Phaser.GameObjects.Text
  private readonly shopButton: RoundButton
  private readonly pauseButton: RoundButton
  private readonly devButton?: Button
  private devEnabled = true
  private layout: GameLayout
  private vertical = false
  private coinBaseScale = 0.78
  private lastCoins = -1
  private lastAffordable = false

  constructor(scene: Phaser.Scene, layout: GameLayout, theme: Theme, callbacks: HudCallbacks) {
    this.theme = theme
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

    // Shop and pause carry their own circular faces, so the top bar needs no
    // panel behind them: the world keeps the full width and the HUD floats.
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
      this.coinBaseScale = 0.7 * ui
      this.coinIcon.setPosition(hud.coins.x, hud.coins.y).setScale(this.coinBaseScale)
      this.coinsText
        .setOrigin(0.5, 0.5)
        .setPosition(hud.coins.x, hud.coins.y + 27 * ui)
        .setFontSize(22 * ui)
    } else {
      this.coinBaseScale = 0.78 * ui
      this.coinIcon.setPosition(hud.coins.x, hud.coins.y).setScale(this.coinBaseScale)
      this.coinsText
        .setOrigin(0, 0.5)
        .setPosition(hud.coins.x + 20 * ui, hud.coins.y)
        .setFontSize(22 * ui)
    }
    this.drawCoinPill()
    this.shopButton.setPosition(hud.shop.x, hud.shop.y)
    this.pauseButton.setPosition(hud.pause.x, hud.pause.y)
    this.devButton?.setPosition(
      hud.vertical ? bar.x + bar.w / 2 : hud.shop.x - 78 * ui,
      hud.vertical ? bar.y + bar.h - 44 * ui : hud.shop.y,
    )
    this.lastCoins = -1
    this.lastAffordable = false
  }

  update(state: ShopState): void {
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
      // The pill hugs the number, so every digit count stays readable over the
      // world instead of floating as bare text.
      this.bar.clear()
      this.drawCoinPill()
    }

    // "What to buy next" now lives on the shop cards; the button keeps only the
    // affordable state as a badge so the world view stays quiet.
    const goal = nextGoal(state)
    const affordable = goal !== null && state.coins >= goalCost(state, goal)
    if (affordable !== this.lastAffordable) {
      this.lastAffordable = affordable
      this.shopButton.setBadge(affordable)
    }
  }

  /** Floating coin pill: the only HUD surface left above the world. */
  private drawCoinPill(): void {
    const hud = this.layout.hud
    const ui = this.layout.ui
    const radius = hud.vertical ? 16 * ui : (COIN_PILL_HEIGHT * ui) / 2
    const height = hud.vertical ? COIN_RAIL_HEIGHT * ui : COIN_PILL_HEIGHT * ui
    const x = hud.vertical ? hud.bar.x : hud.coins.x - COIN_PILL_INSET * ui
    const y = hud.vertical ? hud.bar.y : hud.coins.y - height / 2
    const width = hud.vertical
      ? hud.bar.w
      : Math.max(72 * ui, this.coinsText.x - x + this.coinsText.width + 16 * ui)

    this.bar.fillStyle(this.theme.shadow, 0.18)
    this.bar.fillRoundedRect(x, y + 3 * ui, width, height, radius)
    this.bar.fillStyle(this.theme.panel, 0.96)
    this.bar.fillRoundedRect(x, y, width, height, radius)
    this.bar.lineStyle(1.5 * ui, this.theme.borderSoft, 0.9)
    this.bar.strokeRoundedRect(x, y, width, height, radius)
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
