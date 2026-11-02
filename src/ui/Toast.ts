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
  private header = false

  constructor(scene: Phaser.Scene, layout: GameLayout, theme: Theme) {
    this.scene = scene
    this.theme = theme
    this.layout = layout
    // Above every modal and picker (shop 7000, report 7100, picker 7200) so a
    // failed purchase is never hidden behind the overlay that caused it.
    this.bg = scene.add.graphics().setDepth(7600).setVisible(false)
    this.text = scene.add
      .text(0, 0, '', textStyle(theme, layout.text.body, theme.text, true))
      .setOrigin(0.5)
      .setDepth(7601)
      .setVisible(false)
  }

  /**
   * Onboarding uses the strip under the HUD for its prompt. Move transient
   * toasts to the bottom while it is active so the two never stack.
   */
  setBottom(bottom: boolean): void {
    this.bottom = bottom
  }

  /**
   * The shop panel starts high on the screen, so its feedback sits in the
   * header band instead of covering the tab row the player may want to tap.
   */
  setHeader(header: boolean): void {
    this.header = header
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
    const maxWidth = Math.min(520 * ui, content.w - 40 * ui)
    const x = content.x + content.w / 2
    // Measure after wrapping so long localized copy grows the pill instead of
    // spilling out of a fixed 44px strip on narrow screens.
    this.text.setWordWrapWidth(maxWidth - 44 * ui, true).setText(message)
    const width = Math.min(maxWidth, Math.max(180 * ui, this.text.width + 44 * ui))
    const height = Math.max(44 * ui, this.text.height + 22 * ui)
    // Bottom toasts keep their lower edge above the inset no matter how many
    // lines the localized copy wraps to.
    const y = this.header
      ? this.layout.insets.top + 8 * ui + height / 2
      : this.bottom
        ? this.layout.height - this.layout.insets.bottom - 30 * ui - height / 2
        : hud.bar.y + hud.bar.h + 12 * ui + height / 2
    const radius = height / 2
    this.text.setPosition(x, y)
    this.bg.clear()
    this.bg.fillStyle(0x3b2f3a, 0.16)
    this.bg.fillRoundedRect(x - width / 2, y - height / 2 + 4 * ui, width, height, radius)
    this.bg.fillStyle(this.theme.panel, 0.97)
    this.bg.fillRoundedRect(x - width / 2, y - height / 2, width, height, radius)
    this.bg.lineStyle(2 * ui, this.theme.accent, 0.6)
    this.bg.strokeRoundedRect(x - width / 2, y - height / 2, width, height, radius)
    this.bg.fillStyle(this.theme.accent, 0.8)
    this.bg.fillCircle(x - width / 2 + 15 * ui, y, 4 * ui)
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
