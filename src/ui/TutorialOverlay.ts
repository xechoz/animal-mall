import { type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { PLOTS, REGISTER_POINT, SHELF_ACCESS, zoneOf } from '../logic/config'
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
        ...textStyle(theme, 15, theme.text, true),
        align: 'center',
        wordWrap: { width: Math.min(460, layout.width - 80) },
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
        const plot = PLOTS.find((candidate) => !used.has(candidate.index)) ?? PLOTS[0]
        this.target = plot === undefined ? { x: 320, y: 320 } : { x: plot.x, y: plot.y }
        break
      }
      case 'grow': {
        const producer = state.producers.find((candidate) => !candidate.mature)
        this.target = producer?.pos ?? { x: PLOTS[0]?.x ?? 320, y: PLOTS[0]?.y ?? 320 }
        break
      }
      case 'harvest': {
        const producer = state.producers.find((candidate) => candidate.ready > 0)
        this.target = producer?.pos ?? { x: PLOTS[0]?.x ?? 320, y: PLOTS[0]?.y ?? 320 }
        break
      }
      case 'stock': {
        const kind = state.player.carry
        this.target = kind === null ? { x: 320, y: 300 } : SHELF_ACCESS[zoneOf(kind)]
        break
      }
      case 'checkout':
        this.target = REGISTER_POINT
        break
      case 'done':
        this.target = REGISTER_POINT
        break
    }
  }

  private layoutPill(): void {
    const textWidth = Math.min(460, this.layout.width - 80)
    const pillWidth = Math.max(120, Math.min(500, this.text.width + 56))
    const pillHeight = 42
    const x = this.layout.width / 2
    const y = this.layout.height - this.layout.insets.bottom - 28
    this.pill.clear()
    this.pill.fillStyle(0x3b2f3a, 0.16)
    this.pill.fillRoundedRect(x - pillWidth / 2, y - pillHeight / 2 + 4, pillWidth, pillHeight, 18)
    this.pill.fillStyle(this.theme.panel, 0.96)
    this.pill.fillRoundedRect(x - pillWidth / 2, y - pillHeight / 2, pillWidth, pillHeight, 18)
    this.pill.lineStyle(2, this.theme.accent, 0.7)
    this.pill.strokeRoundedRect(x - pillWidth / 2, y - pillHeight / 2, pillWidth, pillHeight, 18)
    this.pill.fillStyle(this.theme.accent, 0.7)
    this.pill.fillCircle(x - pillWidth / 2 + 16, y, 4)
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
    this.ring.clear()
    this.ring.lineStyle(4, this.theme.accent, 0.9)
    this.ring.strokeCircle(x, y, 28 * pulse)
    this.ring.lineStyle(2, this.theme.panel, 0.8)
    this.ring.strokeCircle(x, y, 34 * pulse)
    this.targetDot.clear()
    this.targetDot.fillStyle(this.theme.accent, 0.18)
    this.targetDot.fillCircle(x, y, 28 * pulse)
  }

  private hide(): void {
    this.hidden = true
    this.setVisible(false)
  }
}
