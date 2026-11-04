import { Button, type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { drawPanelFrame } from './frames'
import type { GameLayout } from './layout'

export interface SettingsOptions {
  readonly scene: Phaser.Scene
  readonly layout: GameLayout
  readonly theme: Theme
  readonly i18n: I18n
  readonly soundEnabled: boolean
  readonly fullscreenActive: boolean
  readonly fullscreenAvailable: boolean
  readonly onToggleSound: () => boolean
  readonly onToggleFullscreen: () => void
  readonly onOpenLanguage: () => void
  readonly onClose: () => void
}

export class SettingsModal {
  private readonly root: Phaser.GameObjects.Container
  private readonly options: SettingsOptions
  private readonly soundButton: Button
  private readonly fullscreenButton: Button
  private closed = false

  constructor(options: SettingsOptions) {
    this.options = options
    const { scene, layout, theme, i18n } = options
    const ui = layout.ui
    this.root = scene.add.container(0, 0).setDepth(7100)
    const backdrop = scene.add
      .rectangle(0, 0, layout.width, layout.height, theme.overlay, 0.66)
      .setOrigin(0)
      .setInteractive()
    backdrop.on('pointerdown', () => this.close())
    this.root.add(backdrop)

    const cardW = Math.min(500 * ui, layout.width - 40 * ui)
    // Heading band, three setting rows, then Close as its own group. The card
    // follows the unit scale so a narrow screen never adds a dead band.
    const unit = Math.min(ui, cardW / 500, (layout.height - 40 * ui) / 347)
    const cardH = 347 * unit
    const card = scene.add.container(layout.width / 2, layout.height / 2)
    this.root.add(card)
    const block = scene.add.rectangle(0, 0, cardW, cardH, 0, 0).setInteractive()
    card.add(block)
    const g = scene.add.graphics()
    drawPanelFrame(g, -cardW / 2, -cardH / 2, cardW, cardH, theme, 26 * unit)
    card.add(g)

    const headerY = -cardH / 2 + 40 * unit
    card.add(
      scene.add
        .text(0, headerY, i18n.t('settings.title'), textStyle(theme, 26 * unit, theme.text, true))
        .setOrigin(0.5),
    )
    card.add(
      new Button(scene, cardW / 2 - 34 * unit, headerY, '×', theme, {
        width: 44 * unit,
        height: 44 * unit,
        fontSize: 22 * unit,
        variant: 'soft',
        onClick: () => this.close(),
      }),
    )

    const buttonWidth = cardW - 70 * unit
    const buttonHeight = 48 * unit
    const rowGap = 60 * unit
    const firstY = -cardH / 2 + 105 * unit

    this.soundButton = new Button(scene, 0, firstY, this.soundLabel(), theme, {
      width: buttonWidth,
      height: buttonHeight,
      fontSize: 16 * unit,
      variant: 'soft',
      onClick: () => {
        const enabled = options.onToggleSound()
        this.soundButton.setText(this.soundLabel(enabled))
      },
    })
    this.fullscreenButton = new Button(scene, 0, firstY + rowGap, this.fullscreenLabel(), theme, {
      width: buttonWidth,
      height: buttonHeight,
      fontSize: 16 * unit,
      variant: 'soft',
      onClick: () => options.onToggleFullscreen(),
    })
    this.fullscreenButton.setEnabled(options.fullscreenAvailable)
    if (!options.fullscreenAvailable) this.fullscreenButton.setAlpha(1)
    const languageButton = new Button(
      scene,
      0,
      firstY + rowGap * 2,
      i18n.t('menu.language'),
      theme,
      {
        width: buttonWidth,
        height: buttonHeight,
        fontSize: 16 * unit,
        variant: 'soft',
        onClick: () => options.onOpenLanguage(),
      },
    )
    card.add([this.soundButton, this.fullscreenButton, languageButton])

    card.add(
      new Button(scene, 0, cardH / 2 - 48 * unit, i18n.t('settings.close'), theme, {
        width: buttonWidth,
        height: buttonHeight,
        fontSize: 17 * unit,
        variant: 'soft',
        onClick: () => this.close(),
      }),
    )
  }

  setFullscreen(active: boolean): void {
    this.fullscreenButton.setText(this.fullscreenLabel(active))
  }

  destroy(): void {
    if (this.closed) return
    this.closed = true
    this.root.destroy(true)
  }

  private close(): void {
    if (this.closed) return
    this.destroy()
    this.options.onClose()
  }

  private soundLabel(enabled = this.options.soundEnabled): string {
    return this.options.i18n.t('settings.sound', {
      state: this.options.i18n.t(enabled ? 'common.on' : 'common.off'),
    })
  }

  private fullscreenLabel(active = this.options.fullscreenActive): string {
    return this.options.i18n.t(active ? 'pause.exitFullscreen' : 'pause.fullscreen')
  }
}
