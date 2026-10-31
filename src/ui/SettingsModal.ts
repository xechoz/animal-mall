import { Button, type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
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
    const cardH = Math.min(390 * ui, layout.height - 40 * ui)
    const card = scene.add.container(layout.width / 2, layout.height / 2)
    this.root.add(card)
    const block = scene.add.rectangle(0, 0, cardW, cardH, 0, 0).setInteractive()
    card.add(block)
    const g = scene.add.graphics()
    g.fillStyle(theme.shadow, 0.2)
    g.fillRoundedRect(-cardW / 2, -cardH / 2 + 9 * ui, cardW, cardH, 26 * ui)
    g.fillStyle(theme.panel, 1)
    g.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 26 * ui)
    g.lineStyle(3 * ui, theme.borderSoft, 1)
    g.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 26 * ui)
    card.add(g)

    card.add(
      scene.add
        .text(
          0,
          -cardH / 2 + 42 * ui,
          i18n.t('settings.title'),
          textStyle(theme, 26 * ui, theme.text, true),
        )
        .setOrigin(0.5),
    )

    this.soundButton = new Button(scene, 0, -cardH / 2 + 100 * ui, this.soundLabel(), theme, {
      width: cardW - 70 * ui,
      height: 48 * ui,
      fontSize: 16 * ui,
      variant: 'soft',
      onClick: () => {
        const enabled = options.onToggleSound()
        this.soundButton.setText(this.soundLabel(enabled))
      },
    })
    this.fullscreenButton = new Button(
      scene,
      0,
      -cardH / 2 + 156 * ui,
      this.fullscreenLabel(),
      theme,
      {
        width: cardW - 70 * ui,
        height: 48 * ui,
        fontSize: 16 * ui,
        variant: 'soft',
        onClick: () => options.onToggleFullscreen(),
      },
    )
    this.fullscreenButton.setEnabled(options.fullscreenAvailable)
    const languageButton = new Button(
      scene,
      0,
      -cardH / 2 + 212 * ui,
      i18n.t('menu.language'),
      theme,
      {
        width: cardW - 70 * ui,
        height: 48 * ui,
        fontSize: 16 * ui,
        variant: 'soft',
        onClick: () => options.onOpenLanguage(),
      },
    )
    card.add([this.soundButton, this.fullscreenButton, languageButton])

    card.add(
      new Button(scene, 0, cardH / 2 - 40 * ui, i18n.t('settings.close'), theme, {
        width: cardW - 70 * ui,
        height: 48 * ui,
        fontSize: 17 * ui,
        variant: 'primary',
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
