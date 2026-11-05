import { Button, type I18n, LANG_LABELS, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { createCloseButton, drawChevron, drawToggle } from './dialog'
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

/** Height the card is designed around; short screens shrink the whole card. */
const CARD_CONTENT_HEIGHT = 372

/**
 * Settings is a list of stateful rows, not four identical buttons: each row
 * names the setting and carries its own switch, chevron or unavailable state.
 */
export class SettingsModal {
  private readonly root: Phaser.GameObjects.Container
  private readonly options: SettingsOptions
  private readonly soundToggle: Phaser.GameObjects.Graphics
  private readonly fullscreenToggle: Phaser.GameObjects.Graphics
  private readonly unit: number
  private readonly rowWidth: number
  private soundOn: boolean
  private fullscreenOn: boolean
  private closed = false

  constructor(options: SettingsOptions) {
    this.options = options
    this.soundOn = options.soundEnabled
    this.fullscreenOn = options.fullscreenActive
    const { scene, layout, theme, i18n } = options
    const ui = layout.ui
    this.root = scene.add.container(0, 0).setDepth(7100)
    const backdrop = scene.add
      .rectangle(0, 0, layout.width, layout.height, theme.overlay, 0.72)
      .setOrigin(0)
      .setInteractive()
    backdrop.on('pointerdown', () => this.close())
    this.root.add(backdrop)

    const cardW = Math.min(520 * ui, layout.width - 40 * ui)
    // Keep the type at the device's UI scale; the card is wide enough on a
    // phone, so shrinking to the 520-unit design width would only make the
    // labels smaller than the rest of the interface.
    const unit = Math.min(ui, (layout.height - 40 * ui) / CARD_CONTENT_HEIGHT)
    this.unit = unit
    const cardH = CARD_CONTENT_HEIGHT * unit
    const card = scene.add.container(layout.width / 2, layout.height / 2)
    this.root.add(card)
    card.add(scene.add.rectangle(0, 0, cardW, cardH, 0, 0).setInteractive())
    const g = scene.add.graphics()
    drawPanelFrame(g, -cardW / 2, -cardH / 2, cardW, cardH, theme, 26 * unit)
    card.add(g)

    const headerY = -cardH / 2 + 34 * unit
    card.add(
      scene.add
        .text(0, headerY, i18n.t('settings.title'), textStyle(theme, 24 * unit, theme.text, true))
        .setOrigin(0.5),
    )
    card.add(
      createCloseButton(scene, cardW / 2 - 34 * unit, headerY, theme, () => this.close(), unit),
    )

    const rowW = cardW - 64 * unit
    this.rowWidth = rowW
    const rowH = 58 * unit
    const gap = 12 * unit
    const firstY = -cardH / 2 + 92 * unit
    const row = (y: number, label: string): Phaser.GameObjects.Container => {
      const container = scene.add.container(0, y)
      const bg = scene.add.graphics()
      bg.fillStyle(theme.surface, 1)
      bg.fillRoundedRect(-rowW / 2, -rowH / 2, rowW, rowH, 12 * unit)
      bg.lineStyle(1.5 * unit, theme.borderSoft, 1)
      bg.strokeRoundedRect(-rowW / 2, -rowH / 2, rowW, rowH, 12 * unit)
      container.add(bg)
      container.add(
        scene.add
          .text(-rowW / 2 + 20 * unit, 0, label, textStyle(theme, 16 * unit, theme.text, true))
          .setOrigin(0, 0.5),
      )
      card.add(container)
      return container
    }
    const hit = (container: Phaser.GameObjects.Container, onPress: () => void): void => {
      const zone = scene.add.zone(0, 0, rowW, rowH).setInteractive({ useHandCursor: true })
      zone.on('pointerdown', onPress)
      container.add(zone)
    }

    const soundRow = row(firstY, i18n.t('settings.soundLabel'))
    this.soundToggle = scene.add.graphics()
    soundRow.add(this.soundToggle)
    this.drawSoundToggle()
    hit(soundRow, () => {
      this.soundOn = options.onToggleSound()
      this.drawSoundToggle()
    })

    const fullscreenRow = row(firstY + rowH + gap, i18n.t('settings.fullscreen'))
    this.fullscreenToggle = scene.add.graphics()
    fullscreenRow.add(this.fullscreenToggle)
    if (options.fullscreenAvailable) {
      this.drawFullscreenToggle()
      hit(fullscreenRow, () => {
        options.onToggleFullscreen()
        this.fullscreenOn = !this.fullscreenOn
        this.drawFullscreenToggle()
      })
    } else {
      // A disabled control must look disabled. The old code disabled the button
      // and then reset its alpha to 1, leaving a dead control that looked live.
      fullscreenRow.setAlpha(0.5)
      fullscreenRow.add(
        scene.add
          .text(
            rowW / 2 - 20 * unit,
            0,
            i18n.t('settings.unavailable'),
            textStyle(theme, 14 * unit, theme.textMuted, false),
          )
          .setOrigin(1, 0.5),
      )
    }

    const languageRow = row(firstY + (rowH + gap) * 2, i18n.t('menu.language'))
    languageRow.add(
      scene.add
        .text(
          rowW / 2 - 34 * unit,
          0,
          LANG_LABELS[i18n.lang],
          textStyle(theme, 14 * unit, theme.textMuted, false),
        )
        .setOrigin(1, 0.5),
    )
    const chevron = scene.add.graphics()
    drawChevron(chevron, rowW / 2 - 20 * unit, 0, theme, unit)
    languageRow.add(chevron)
    hit(languageRow, () => options.onOpenLanguage())

    card.add(
      new Button(scene, 0, cardH / 2 - 42 * unit, i18n.t('settings.done'), theme, {
        width: rowW,
        height: 48 * unit,
        fontSize: 17 * unit,
        variant: 'primary',
        onClick: () => this.close(),
      }),
    )
  }

  setFullscreen(active: boolean): void {
    this.fullscreenOn = active
    if (this.options.fullscreenAvailable) this.drawFullscreenToggle()
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

  private drawSoundToggle(): void {
    drawToggle(
      this.soundToggle,
      this.rowWidth / 2 - 44 * this.unit,
      0,
      48 * this.unit,
      28 * this.unit,
      this.soundOn,
      this.options.theme,
      this.unit,
    )
  }

  private drawFullscreenToggle(): void {
    drawToggle(
      this.fullscreenToggle,
      this.rowWidth / 2 - 44 * this.unit,
      0,
      48 * this.unit,
      28 * this.unit,
      this.fullscreenOn,
      this.options.theme,
      this.unit,
    )
  }
}
