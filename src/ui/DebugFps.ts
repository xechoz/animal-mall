import { type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import type { GameLayout } from './layout'

const PLATE_DEPTH = 8000
const LABEL_DEPTH = 8001
const REFRESH_MS = 250

export interface DebugFpsOptions {
  /** Distance from the safe-area top, in design units before `ui`. */
  readonly topOffset?: number
}

/**
 * Tiny development-only FPS chip in the top-right safe area. It reads the
 * game loop's smoothed FPS instead of counting frames, so the display itself
 * costs one text update every 250 ms.
 */
export class DebugFps {
  private readonly scene: Phaser.Scene
  private readonly theme: Theme
  private readonly plate: Phaser.GameObjects.Graphics
  private readonly label: Phaser.GameObjects.Text
  private readonly timer: Phaser.Time.TimerEvent
  private readonly topOffset: number
  private layout: GameLayout

  constructor(
    scene: Phaser.Scene,
    layout: GameLayout,
    theme: Theme,
    options: DebugFpsOptions = {},
  ) {
    this.scene = scene
    this.theme = theme
    this.layout = layout
    this.topOffset = options.topOffset ?? 78
    this.plate = scene.add.graphics().setDepth(PLATE_DEPTH)
    this.label = scene.add
      .text(0, 0, '', textStyle(theme, 12 * layout.ui, '#fff7e8', true))
      .setOrigin(1, 0)
      .setDepth(LABEL_DEPTH)
    this.timer = scene.time.addEvent({
      delay: REFRESH_MS,
      loop: true,
      callback: () => this.refresh(),
    })
    this.refresh()
  }

  relayout(layout: GameLayout): void {
    this.layout = layout
    this.label.setStyle(textStyle(this.theme, 12 * layout.ui, '#fff7e8', true))
    this.refresh()
  }

  destroy(): void {
    this.timer.remove(false)
    this.plate.destroy()
    this.label.destroy()
  }

  private refresh(): void {
    this.label.setText(`FPS ${Math.round(this.scene.game.loop.actualFps)}`)

    const ui = this.layout.ui
    const padX = 8 * ui
    const padY = 4 * ui
    const right = this.layout.width - this.layout.insets.right - 10 * ui
    const top = this.layout.insets.top + this.topOffset * ui
    this.label.setPosition(right, top)

    const width = this.label.width + padX * 2
    const height = this.label.height + padY * 2
    this.plate.clear()
    this.plate.fillStyle(0x16241d, 0.62)
    this.plate.fillRoundedRect(right - width, top, width, height, 8 * ui)
    this.plate.lineStyle(1, 0xcdb68b, 0.35)
    this.plate.strokeRoundedRect(right - width, top, width, height, 8 * ui)
  }
}
