import {
  Button,
  type I18n,
  LANG_LABELS,
  type Lang,
  SUPPORTED_LANGS,
  type Theme,
  textStyle,
} from '@mg/core'
import type Phaser from 'phaser'
import type { GameLayout } from './layout'

export interface LanguageOptions {
  readonly scene: Phaser.Scene
  readonly layout: GameLayout
  readonly theme: Theme
  readonly i18n: I18n
  readonly current: Lang
  readonly onSelect: (lang: Lang) => void
  readonly onClose: () => void
}

export class LanguageModal {
  private readonly root: Phaser.GameObjects.Container
  private readonly options: LanguageOptions
  private closed = false

  constructor(options: LanguageOptions) {
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

    const cardW = Math.min(620 * ui, layout.width - 32 * ui)
    const cardH = Math.min(560 * ui, layout.height - 32 * ui)
    const card = scene.add.container(layout.width / 2, layout.height / 2)
    this.root.add(card)
    card.add(scene.add.rectangle(0, 0, cardW, cardH, 0, 0).setInteractive())
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
          -cardH / 2 + 40 * ui,
          i18n.t('language.title'),
          textStyle(theme, 26 * ui, theme.text, true),
        )
        .setOrigin(0.5),
    )
    card.add(
      new Button(scene, cardW / 2 - 36 * ui, -cardH / 2 + 40 * ui, '×', theme, {
        width: 44 * ui,
        height: 44 * ui,
        fontSize: 24 * ui,
        variant: 'soft',
        onClick: () => this.close(),
      }),
    )

    const columns = 3
    const gap = 10 * ui
    const buttonWidth = (cardW - 40 * ui - gap * (columns - 1)) / columns
    const rows = Math.ceil(SUPPORTED_LANGS.length / columns)
    const buttonHeight = Math.min(54 * ui, (cardH - 120 * ui - gap * (rows - 1)) / rows)
    const startY =
      -cardH / 2 + 92 * ui + (cardH - 120 * ui - (rows * buttonHeight + (rows - 1) * gap)) / 2

    SUPPORTED_LANGS.forEach((lang, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const x = -cardW / 2 + 20 * ui + column * (buttonWidth + gap) + buttonWidth / 2
      const y = startY + row * (buttonHeight + gap) + buttonHeight / 2
      const selected = lang === options.current
      card.add(
        new Button(scene, x, y, LANG_LABELS[lang], theme, {
          width: buttonWidth,
          height: buttonHeight,
          fontSize: 16 * ui,
          variant: 'soft',
          decoration: selected
            ? (faceScene, size) => {
                const g = faceScene.add.graphics()
                const radius = Math.min(12 * ui, size.height / 2)
                g.fillStyle(theme.accent, 0.16)
                g.fillRoundedRect(
                  -size.width / 2,
                  -size.height / 2,
                  size.width,
                  size.height,
                  radius,
                )
                g.lineStyle(2 * ui, theme.accent, 0.9)
                g.strokeRoundedRect(
                  -size.width / 2,
                  -size.height / 2,
                  size.width,
                  size.height,
                  radius,
                )
                return g
              }
            : undefined,
          onClick: () => {
            this.close()
            options.onSelect(lang)
          },
        }),
      )
    })
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
}
