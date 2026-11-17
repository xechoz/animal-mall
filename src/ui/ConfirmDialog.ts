import { type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { drawPanelFrame } from './frames'
import { GameButton, type GameButtonVariant } from './GameButton'
import type { GameLayout } from './layout'

export interface ConfirmAction {
  readonly label: string
  readonly variant?: GameButtonVariant
  readonly onClick?: () => void
}

export interface ConfirmDialogOptions {
  readonly scene: Phaser.Scene
  readonly layout: GameLayout
  readonly theme: Theme
  readonly title: string
  readonly body: string
  readonly actions: readonly ConfirmAction[]
  readonly onClose?: () => void
}

/** The design size the card is laid out around; short screens shrink it whole. */
const DESIGN_WIDTH = 560
const DESIGN_HEIGHT = 360

/**
 * Parchment confirmation card built from the game's own frame and buttons. It
 * replaces the platform `Modal` for decisions made inside the shop, so a remove
 * confirmation uses the same bark frame and leaf corners as every other dialog.
 */
export class ConfirmDialog {
  private readonly root: Phaser.GameObjects.Container
  private readonly options: ConfirmDialogOptions
  private closed = false

  constructor(options: ConfirmDialogOptions) {
    this.options = options
    const { scene, layout, theme } = options
    const ui = layout.ui
    const width = Math.min(DESIGN_WIDTH * ui, layout.width - 40 * ui)
    const height = Math.min(DESIGN_HEIGHT * ui, layout.height - 40 * ui)
    const unit = Math.min(ui, width / DESIGN_WIDTH, height / DESIGN_HEIGHT)

    this.root = scene.add.container(0, 0).setDepth(7300)
    const backdrop = scene.add
      .rectangle(0, 0, layout.width, layout.height, theme.overlay, 0.62)
      .setOrigin(0)
      .setInteractive()
    backdrop.setAlpha(0)
    this.root.add(backdrop)

    const card = scene.add.container(layout.width / 2, layout.height / 2)
    card.setAlpha(0)
    card.setScale(0.92)
    this.root.add(card)

    const panel = scene.add.graphics()
    drawPanelFrame(panel, -width / 2, -height / 2, width, height, theme, theme.radiusLarge)
    card.add(panel)

    card.add(
      scene.add
        .text(
          0,
          -height / 2 + 42 * unit,
          options.title,
          textStyle(theme, 26 * unit, theme.text, true),
        )
        .setOrigin(0.5),
    )
    card.add(
      scene.add
        .text(0, -height / 2 + 84 * unit, options.body, {
          ...textStyle(theme, 18 * unit, theme.textMuted),
          align: 'center',
          wordWrap: { width: width - 80 * unit },
          lineSpacing: 8 * unit,
        })
        .setOrigin(0.5, 0),
    )

    const gap = 20 * unit
    const buttonHeight = 70 * unit
    const total = options.actions.length * buttonHeight + (options.actions.length - 1) * gap
    let top = height / 2 - 34 * unit - total
    for (const action of options.actions) {
      card.add(
        new GameButton(scene, 0, top + buttonHeight / 2, action.label, theme, {
          width: width - 80 * unit,
          height: buttonHeight,
          fontSize: 26 * unit,
          variant: action.variant ?? 'primary',
          onClick: () => {
            action.onClick?.()
            this.close()
          },
        }),
      )
      top += buttonHeight + gap
    }

    scene.tweens.add({ targets: backdrop, alpha: 0.62, duration: 160, ease: 'Quad.out' })
    scene.tweens.add({
      targets: card,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: 'Back.out',
    })
  }

  destroy(): void {
    if (this.closed) return
    this.closed = true
    this.root.destroy(true)
    this.options.onClose?.()
  }

  private close(): void {
    this.destroy()
  }
}
