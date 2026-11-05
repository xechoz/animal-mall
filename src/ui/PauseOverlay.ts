import { Button, type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { drawPanelFrame } from './frames'
import type { GameLayout } from './layout'

export interface PauseOptions {
  readonly scene: Phaser.Scene
  readonly layout: GameLayout
  readonly theme: Theme
  readonly i18n: I18n
  readonly onResume: () => void
  readonly onShop: () => void
  readonly onMenu: () => void
}

/** Content height the card is designed around; used to shrink on short screens. */
const CARD_CONTENT_HEIGHT = 282

/**
 * In-run pause card. Sound, fullscreen and language live in the menu settings
 * so this stays a three-choice decision: resume, browse the shop or leave.
 *
 * The heading is plain text on the parchment. It used to sit in a filled
 * ribbon, which read as a fourth button and competed with Resume.
 */
export class PauseOverlay {
  private readonly root: Phaser.GameObjects.Container
  private closed = false

  constructor(options: PauseOptions) {
    const { scene, layout, theme, i18n } = options
    const ui = layout.ui
    this.root = scene.add.container(0, 0).setDepth(7100)

    const backdrop = scene.add
      .rectangle(0, 0, layout.width, layout.height, theme.overlay, 0.72)
      .setOrigin(0)
      .setInteractive()
    this.root.add(backdrop)

    const cardW = Math.min(420 * ui, layout.width - 40 * ui)
    const unit = Math.min(ui, cardW / 420, (layout.height - 40 * ui) / CARD_CONTENT_HEIGHT)
    const cardH = CARD_CONTENT_HEIGHT * unit
    const card = scene.add.container(layout.width / 2, layout.height / 2)
    this.root.add(card)
    const g = scene.add.graphics()
    drawPanelFrame(g, -cardW / 2, -cardH / 2, cardW, cardH, theme, 28 * unit)
    card.add(g)

    const titleSize = 26 * unit
    // Top padding + heading line + a group gap, then the action stack.
    const titleY = -cardH / 2 + 30 * unit + titleSize / 2
    card.add(
      scene.add
        .text(0, titleY, i18n.t('pause.title'), textStyle(theme, titleSize, theme.text, true))
        .setOrigin(0.5),
    )

    const buttonWidth = cardW - 80 * unit
    const buttonHeight = 50 * unit
    const gap = 62 * unit
    const startY = titleY + titleSize / 2 + 24 * unit + buttonHeight / 2
    const action = (
      y: number,
      label: string,
      variant: 'primary' | 'soft' | 'ghost',
      onClick: () => void,
      decoration?: (
        decorScene: Phaser.Scene,
        size: { width: number; height: number },
      ) => Phaser.GameObjects.GameObject,
    ): Button =>
      new Button(scene, 0, y, label, theme, {
        width: buttonWidth,
        height: buttonHeight,
        fontSize: 18 * unit,
        variant,
        ...(decoration !== undefined ? { decoration } : {}),
        onClick,
      })
    const resume = action(startY, i18n.t('pause.resume'), 'primary', options.onResume)
    const shop = action(startY + gap, i18n.t('pause.shop'), 'soft', options.onShop)
    // Leaving the run is the quietest choice; only one action stays filled. A
    // hairline keeps the ghost from reading as a disabled panel.
    const menu = action(
      startY + gap * 2,
      i18n.t('pause.menu'),
      'ghost',
      options.onMenu,
      (decorScene, size) => {
        const g = decorScene.add.graphics()
        g.lineStyle(1.2 * unit, theme.borderSoft, 0.9)
        g.strokeRoundedRect(
          -size.width / 2,
          -size.height / 2,
          size.width,
          size.height,
          size.height / 2,
        )
        return g
      },
    )
    card.add([resume, shop, menu])
  }

  destroy(): void {
    if (this.closed) return
    this.closed = true
    this.root.destroy(true)
  }
}
