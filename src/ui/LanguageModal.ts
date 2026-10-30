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
    this.root = scene.add.container(0, 0).setDepth(7100)
    const backdrop = scene.add
      .rectangle(0, 0, layout.width, layout.height, theme.overlay, 0.66)
      .setOrigin(0)
      .setInteractive()
    backdrop.on('pointerdown', () => this.close())
    this.root.add(backdrop)

    const cardW = Math.min(620, layout.width - 32)
    const cardH = Math.min(560, layout.height - 32)
    const card = scene.add.container(layout.width / 2, layout.height / 2)
    this.root.add(card)
    card.add(scene.add.rectangle(0, 0, cardW, cardH, 0, 0).setInteractive())
    const g = scene.add.graphics()
    g.fillStyle(theme.shadow, 0.2)
    g.fillRoundedRect(-cardW / 2, -cardH / 2 + 9, cardW, cardH, 26)
    g.fillStyle(theme.panel, 1)
    g.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 26)
    g.lineStyle(3, theme.borderSoft, 1)
    g.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 26)
    card.add(g)

    card.add(
      scene.add
        .text(0, -cardH / 2 + 40, i18n.t('language.title'), textStyle(theme, 26, theme.text, true))
        .setOrigin(0.5),
    )
    card.add(
      new Button(scene, cardW / 2 - 36, -cardH / 2 + 36, '×', theme, {
        width: 40,
        height: 40,
        fontSize: 24,
        variant: 'soft',
        onClick: () => this.close(),
      }),
    )

    const columns = 3
    const gap = 10
    const buttonWidth = (cardW - 40 - gap * (columns - 1)) / columns
    const rows = Math.ceil(SUPPORTED_LANGS.length / columns)
    const buttonHeight = Math.min(54, (cardH - 120 - gap * (rows - 1)) / rows)
    const startY = -cardH / 2 + 92 + (cardH - 120 - (rows * buttonHeight + (rows - 1) * gap)) / 2

    SUPPORTED_LANGS.forEach((lang, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const x = -cardW / 2 + 20 + column * (buttonWidth + gap) + buttonWidth / 2
      const y = startY + row * (buttonHeight + gap) + buttonHeight / 2
      card.add(
        new Button(scene, x, y, LANG_LABELS[lang], theme, {
          width: buttonWidth,
          height: buttonHeight,
          fontSize: 16,
          variant: lang === options.current ? 'primary' : 'soft',
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
