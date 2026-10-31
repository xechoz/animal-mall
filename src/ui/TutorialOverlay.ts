import { type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { carriedKinds } from '../logic/carry'
import { zoneOf } from '../logic/config'
import type { ShopState, TutorialStep, Vec2 } from '../logic/types'
import { type GameLayout, worldToScreen } from './layout'

export class TutorialOverlay {
  private readonly layout: GameLayout
  private readonly theme: Theme
  private readonly i18n: I18n
  private readonly ring: Phaser.GameObjects.Graphics
  private readonly pill: Phaser.GameObjects.Graphics
  private readonly text: Phaser.GameObjects.Text
  private readonly targetDot: Phaser.GameObjects.Graphics
  private step: TutorialStep = 'done'
  private target: Vec2 = { x: 0, y: 0 }
  private targetInScreen = false
  private hidden = false
  private initialized = false

  constructor(scene: Phaser.Scene, layout: GameLayout, theme: Theme, i18n: I18n) {
    this.layout = layout
    this.theme = theme
    this.i18n = i18n
    this.targetDot = scene.add.graphics().setDepth(3998)
    this.ring = scene.add.graphics().setDepth(4000)
    this.pill = scene.add.graphics().setDepth(6200)
    this.text = scene.add
      .text(0, 0, '', {
        ...textStyle(theme, 15 * layout.ui, theme.text, true),
        align: 'center',
        wordWrap: { width: Math.min(460 * layout.ui, layout.content.w - 80 * layout.ui) },
      })
      .setOrigin(0.5)
      .setDepth(6201)
    this.setVisible(false)
  }

  update(state: ShopState, time: number): void {
    if (this.hidden) return
    if (state.tutorial === 'done') {
      this.hide()
      return
    }

    if (!this.initialized || state.tutorial !== this.step) {
      this.initialized = true
      this.step = state.tutorial
      this.updateTarget(state)
      this.text.setText(this.i18n.t(`tutorial.${state.tutorial}`))
      this.layoutPill()
    }
    if (state.tutorial === 'harvest' || state.tutorial === 'grow') this.updateTarget(state)
    if (state.tutorial === 'stock') this.updateTarget(state)
    this.draw(time)
  }

  setVisible(visible: boolean): void {
    const show = visible && !this.hidden
    this.ring.setVisible(show)
    this.pill.setVisible(show)
    this.text.setVisible(show)
    this.targetDot.setVisible(show)
  }

  destroy(): void {
    this.ring.destroy()
    this.pill.destroy()
    this.text.destroy()
    this.targetDot.destroy()
  }

  private updateTarget(state: ShopState): void {
    this.targetInScreen = false
    switch (state.tutorial) {
      case 'buyTree': {
        const used = new Set(
          state.producers
            .filter((producer) => zoneOf(producer.product) === 'fruit')
            .map((producer) => producer.slot),
        )
        const plots = this.layout.map.plots
        const plot = plots.find((candidate) => !used.has(candidate.index)) ?? plots[0]
        this.target = plot === undefined ? this.layout.map.playerStart : { x: plot.x, y: plot.y }
        break
      }
      case 'grow': {
        const producer = state.producers.find((candidate) => !candidate.mature)
        const plot = this.layout.map.plots[0] ?? this.layout.map.playerStart
        this.target = producer?.pos ?? plot
        break
      }
      case 'harvest': {
        const producer = state.producers.find((candidate) => candidate.ready > 0)
        const plot = this.layout.map.plots[0] ?? this.layout.map.playerStart
        this.target = producer?.pos ?? plot
        break
      }
      case 'stock': {
        const kind = carriedKinds(state.player.carry)[0] ?? null
        this.target =
          kind === null
            ? (this.layout.map.plots[0] ?? this.layout.map.playerStart)
            : this.layout.map.shelfAccess[zoneOf(kind)]
        break
      }
      case 'checkout':
        this.target = this.layout.map.register
        break
      case 'done':
        this.target = this.layout.map.register
        break
    }
  }

  private layoutPill(): void {
    const content = this.layout.content
    const ui = this.layout.ui
    const textWidth = Math.min(460 * ui, content.w - 80 * ui)
    this.text.setWordWrapWidth(textWidth, true)
    const pillWidth = Math.max(120 * ui, Math.min(500 * ui, this.text.width + 56 * ui))
    const pillHeight = Math.max(42 * ui, this.text.height + 20 * ui)
    const x = content.x + content.w / 2
    const y = this.layout.height - this.layout.insets.bottom - 30 * ui
    this.pill.clear()
    this.pill.fillStyle(0x3b2f3a, 0.16)
    this.pill.fillRoundedRect(
      x - pillWidth / 2,
      y - pillHeight / 2 + 4 * ui,
      pillWidth,
      pillHeight,
      18 * ui,
    )
    this.pill.fillStyle(this.theme.panel, 0.96)
    this.pill.fillRoundedRect(x - pillWidth / 2, y - pillHeight / 2, pillWidth, pillHeight, 18 * ui)
    this.pill.lineStyle(2 * ui, this.theme.accent, 0.7)
    this.pill.strokeRoundedRect(
      x - pillWidth / 2,
      y - pillHeight / 2,
      pillWidth,
      pillHeight,
      18 * ui,
    )
    this.pill.fillStyle(this.theme.accent, 0.7)
    this.pill.fillCircle(x - pillWidth / 2 + 16 * ui, y, 4 * ui)
    this.text.setPosition(x, y)
    this.text.setWordWrapWidth(textWidth, true)
  }

  private draw(time: number): void {
    let x = this.target.x
    let y = this.target.y
    if (!this.targetInScreen) {
      const screen = worldToScreen(this.layout, this.target)
      x = screen.x
      y = screen.y
    }
    const pulse = 1 + Math.sin(time * 0.005) * 0.12
    const ui = this.layout.ui
    this.ring.clear()
    this.ring.lineStyle(4 * ui, this.theme.accent, 0.9)
    this.ring.strokeCircle(x, y, 28 * ui * pulse)
    this.ring.lineStyle(2 * ui, this.theme.panel, 0.8)
    this.ring.strokeCircle(x, y, 34 * ui * pulse)
    this.targetDot.clear()
    this.targetDot.fillStyle(this.theme.accent, 0.18)
    this.targetDot.fillCircle(x, y, 28 * ui * pulse)
  }

  private hide(): void {
    this.hidden = true
    this.setVisible(false)
  }
}
