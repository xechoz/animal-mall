import { Button, type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import type { GameLayout } from './layout'

export interface PauseOptions {
  readonly scene: Phaser.Scene
  readonly layout: GameLayout
  readonly theme: Theme
  readonly i18n: I18n
  readonly soundEnabled: boolean
  readonly fullscreenActive: boolean
  readonly fullscreenAvailable: boolean
  readonly onResume: () => void
  readonly onShop: () => void
  readonly onMenu: () => void
  readonly onToggleSound: () => boolean
  readonly onToggleFullscreen: () => void
}

export class PauseOverlay {
  private readonly root: Phaser.GameObjects.Container
  private readonly options: PauseOptions
  private readonly soundButton: Button
  private readonly fullscreenButton: Button
  private closed = false

  constructor(options: PauseOptions) {
    this.options = options
    const { scene, layout, theme, i18n } = options
    this.root = scene.add.container(0, 0).setDepth(7100)

    const backdrop = scene.add
      .rectangle(0, 0, layout.width, layout.height, theme.overlay, 0.64)
      .setOrigin(0)
      .setInteractive()
    this.root.add(backdrop)

    const cardW = Math.min(420, layout.width - 40)
    const cardH = Math.min(500, layout.height - 40)
    const card = scene.add.container(layout.width / 2, layout.height / 2)
    this.root.add(card)
    const g = scene.add.graphics()
    g.fillStyle(theme.shadow, 0.22)
    g.fillRoundedRect(-cardW / 2, -cardH / 2 + 10, cardW, cardH, 28)
    g.fillStyle(theme.panel, 1)
    g.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 28)
    g.lineStyle(3, theme.borderSoft, 1)
    g.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 28)
    card.add(g)

    card.add(
      scene.add
        .text(0, -cardH / 2 + 52, i18n.t('pause.title'), textStyle(theme, 30, theme.text, true))
        .setOrigin(0.5),
    )

    const buttonWidth = cardW - 80
    const startY = -cardH / 2 + 116
    const gap = 58
    const resume = new Button(scene, 0, startY, i18n.t('pause.resume'), theme, {
      width: buttonWidth,
      height: 48,
      fontSize: 19,
      variant: 'primary',
      onClick: options.onResume,
    })
    const shop = new Button(scene, 0, startY + gap, i18n.t('pause.shop'), theme, {
      width: buttonWidth,
      height: 44,
      fontSize: 17,
      variant: 'soft',
      onClick: options.onShop,
    })
    this.soundButton = new Button(scene, 0, startY + gap * 2, this.soundLabel(), theme, {
      width: buttonWidth,
      height: 44,
      fontSize: 16,
      variant: 'soft',
      onClick: () => {
        const enabled = options.onToggleSound()
        this.soundButton.setText(this.soundLabel(enabled))
      },
    })
    this.fullscreenButton = new Button(
      scene,
      0,
      startY + gap * 3,
      this.fullscreenLabel(options.fullscreenActive),
      theme,
      {
        width: buttonWidth,
        height: 44,
        fontSize: 16,
        variant: 'soft',
        onClick: () => options.onToggleFullscreen(),
      },
    )
    this.fullscreenButton.setEnabled(options.fullscreenAvailable)
    const menu = new Button(scene, 0, startY + gap * 4, i18n.t('pause.menu'), theme, {
      width: buttonWidth,
      height: 40,
      fontSize: 15,
      variant: 'ghost',
      onClick: options.onMenu,
    })
    card.add([resume, shop, this.soundButton, this.fullscreenButton, menu])
  }

  setFullscreen(active: boolean): void {
    this.fullscreenButton.setText(this.fullscreenLabel(active))
  }

  destroy(): void {
    if (this.closed) return
    this.closed = true
    this.root.destroy(true)
  }

  private soundLabel(enabled = this.options.soundEnabled): string {
    return this.options.i18n.t('pause.sound', {
      state: this.options.i18n.t(enabled ? 'common.on' : 'common.off'),
    })
  }

  private fullscreenLabel(active: boolean): string {
    return this.options.i18n.t(active ? 'pause.exitFullscreen' : 'pause.fullscreen')
  }
}
