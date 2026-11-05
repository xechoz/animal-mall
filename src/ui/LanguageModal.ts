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
import { createCloseButton } from './dialog'
import { drawPanelFrame } from './frames'
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
      .rectangle(0, 0, layout.width, layout.height, theme.overlay, 0.72)
      .setOrigin(0)
      .setInteractive()
    backdrop.on('pointerdown', () => this.close())
    this.root.add(backdrop)

    const cardW = Math.min(620 * ui, layout.width - 32 * ui)
    // Heading, a group gap, then the language grid. The card hugs its content
    // instead of leaving a blank band above and below the buttons.
    const cardH = Math.min(357 * ui, layout.height - 32 * ui)
    const card = scene.add.container(layout.width / 2, layout.height / 2)
    this.root.add(card)
    card.add(scene.add.rectangle(0, 0, cardW, cardH, 0, 0).setInteractive())
    const g = scene.add.graphics()
    drawPanelFrame(g, -cardW / 2, -cardH / 2, cardW, cardH, theme, 26 * ui)
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
      createCloseButton(
        scene,
        cardW / 2 - 34 * ui,
        -cardH / 2 + 34 * ui,
        theme,
        () => this.close(),
        ui,
      ),
    )

    const columns = 3
    const gap = 10 * ui
    const buttonWidth = (cardW - 40 * ui - gap * (columns - 1)) / columns
    const rows = Math.ceil(SUPPORTED_LANGS.length / columns)
    const gridTop = -cardH / 2 + 83 * ui
    const available = cardH - 111 * ui
    const buttonHeight = Math.min(54 * ui, (available - gap * (rows - 1)) / rows)
    const startY = gridTop + (available - (rows * buttonHeight + (rows - 1) * gap)) / 2

    SUPPORTED_LANGS.forEach((lang, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const itemsInRow = Math.min(columns, SUPPORTED_LANGS.length - row * columns)
      const rowWidth = itemsInRow * buttonWidth + (itemsInRow - 1) * gap
      const x = -rowWidth / 2 + column * (buttonWidth + gap) + buttonWidth / 2
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
                const radius = size.height / 2
                g.fillStyle(theme.accent, 0.18)
                g.fillRoundedRect(
                  -size.width / 2,
                  -size.height / 2,
                  size.width,
                  size.height,
                  radius,
                )
                g.lineStyle(2 * ui, theme.accent, 0.95)
                g.strokeRoundedRect(
                  -size.width / 2,
                  -size.height / 2,
                  size.width,
                  size.height,
                  radius,
                )
                // A check makes the choice visible without relying on colour.
                g.lineStyle(2.4 * ui, theme.accentHover, 1)
                const cx = -size.width / 2 + 20 * ui
                g.lineBetween(cx - 5 * ui, 0, cx - 1 * ui, 4 * ui)
                g.lineBetween(cx - 1 * ui, 4 * ui, cx + 6 * ui, -5 * ui)
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
