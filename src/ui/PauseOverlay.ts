import { Button, type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
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

/**
 * In-run pause card. Sound, fullscreen and language live in the menu settings
 * so this stays a three-choice decision: resume, browse the shop or leave.
 */
export class PauseOverlay {
  private readonly root: Phaser.GameObjects.Container
  private closed = false

  constructor(options: PauseOptions) {
    const { scene, layout, theme, i18n } = options
    const ui = layout.ui
    this.root = scene.add.container(0, 0).setDepth(7100)

    const backdrop = scene.add
      .rectangle(0, 0, layout.width, layout.height, theme.overlay, 0.64)
      .setOrigin(0)
      .setInteractive()
    this.root.add(backdrop)

    const cardW = Math.min(420 * ui, layout.width - 40 * ui)
    const cardH = Math.min(390 * ui, layout.height - 40 * ui)
    const card = scene.add.container(layout.width / 2, layout.height / 2)
    this.root.add(card)
    const g = scene.add.graphics()
    g.fillStyle(theme.shadow, 0.22)
    g.fillRoundedRect(-cardW / 2, -cardH / 2 + 10 * ui, cardW, cardH, 28 * ui)
    g.fillStyle(theme.panel, 1)
    g.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 28 * ui)
    g.lineStyle(3 * ui, theme.borderSoft, 1)
    g.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 28 * ui)
    card.add(g)

    card.add(
      scene.add
        .text(
          0,
          -cardH / 2 + 52 * ui,
          i18n.t('pause.title'),
          textStyle(theme, 30 * ui, theme.text, true),
        )
        .setOrigin(0.5),
    )

    const buttonWidth = cardW - 80 * ui
    const startY = -cardH / 2 + 122 * ui
    const gap = 68 * ui
    const resume = new Button(scene, 0, startY, i18n.t('pause.resume'), theme, {
      width: buttonWidth,
      height: 56 * ui,
      fontSize: 20 * ui,
      variant: 'primary',
      onClick: options.onResume,
    })
    const shop = new Button(scene, 0, startY + gap, i18n.t('pause.shop'), theme, {
      width: buttonWidth,
      height: 52 * ui,
      fontSize: 18 * ui,
      variant: 'soft',
      onClick: options.onShop,
    })
    const menu = new Button(scene, 0, startY + gap * 2, i18n.t('pause.menu'), theme, {
      width: buttonWidth,
      height: 48 * ui,
      fontSize: 16 * ui,
      variant: 'ghost',
      onClick: options.onMenu,
    })
    card.add([resume, shop, menu])
  }

  destroy(): void {
    if (this.closed) return
    this.closed = true
    this.root.destroy(true)
  }
}
