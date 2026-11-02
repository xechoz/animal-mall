import { type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import type { GameLayout } from './layout'

export class Toast {
  private readonly scene: Phaser.Scene
  private readonly theme: Theme
  private readonly layout: GameLayout
  private readonly bg: Phaser.GameObjects.Graphics
  private readonly text: Phaser.GameObjects.Text
  private timer?: Phaser.Time.TimerEvent
  private readonly queue: string[] = []
  private showing = false
  private lastMessage = ''
  private bottom = false

  constructor(scene: Phaser.Scene, layout: GameLayout, theme: Theme) {
    this.scene = scene
    this.theme = theme
    this.layout = layout
    this.bg = scene.add.graphics().setDepth(6300).setVisible(false)
    this.text = scene.add
      .text(0, 0, '', textStyle(theme, layout.text.body, theme.text, true))
      .setOrigin(0.5)
      .setDepth(6301)
      .setVisible(false)
  }

  /**
   * Onboarding uses the strip under the HUD for its prompt. Move transient
   * toasts to the bottom while it is active so the two never stack.
   */
  setBottom(bottom: boolean): void {
    this.bottom = bottom
  }

  show(message: string): void {
    if (message === this.lastMessage) return
    if (this.showing) {
      if (this.queue[this.queue.length - 1] !== message) this.queue.push(message)
      if (this.queue.length > 3) this.queue.shift()
      return
    }
    this.render(message)
  }

  private render(message: string): void {
    this.showing = true
    this.lastMessage = message
    const hud = this.layout.hud
    const content = this.layout.content
    const ui = this.layout.ui
    const width = Math.min(520 * ui, content.w - 40 * ui)
    const height = 44 * ui
    const x = content.x + content.w / 2
    const y = this.bottom
      ? this.layout.height - this.layout.insets.bottom - 30 * ui
      : hud.bar.y + hud.bar.h + 34 * ui
    this.bg.clear()
    this.bg.fillStyle(0x3b2f3a, 0.16)
    this.bg.fillRoundedRect(x - width / 2, y - height / 2 + 4 * ui, width, height, 16 * ui)
    this.bg.fillStyle(this.theme.panel, 0.97)
    this.bg.fillRoundedRect(x - width / 2, y - height / 2, width, height, 16 * ui)
    this.bg.lineStyle(2 * ui, this.theme.accent, 0.6)
    this.bg.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 16 * ui)
    this.bg.fillStyle(this.theme.accent, 0.8)
    this.bg.fillCircle(x - width / 2 + 15 * ui, y, 4 * ui)
    this.text
      .setText(message)
      .setPosition(x, y)
      .setWordWrapWidth(width - 44 * ui, true)
    this.bg.setVisible(true).setAlpha(1)
    this.text.setVisible(true).setAlpha(1)
    this.timer = this.scene.time.delayedCall(2_600, () => {
      this.scene.tweens.add({
        targets: [this.bg, this.text],
        alpha: 0,
        duration: 220,
        onComplete: () => {
          this.bg.setVisible(false)
          this.text.setVisible(false)
          this.showing = false
          this.lastMessage = ''
          const next = this.queue.shift()
          if (next !== undefined) this.render(next)
        },
      })
    })
  }

  destroy(): void {
    this.timer?.remove()
    this.queue.length = 0
    this.bg.destroy()
    this.text.destroy()
  }
}
