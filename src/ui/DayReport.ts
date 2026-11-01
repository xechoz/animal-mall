import { Button, cssColor, type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import type { DayReport as DayReportData } from '../logic/types'
import { drawHeaderRibbon, drawPanelFrame } from './frames'
import type { GameLayout } from './layout'

export interface DayReportOptions {
  readonly scene: Phaser.Scene
  readonly layout: GameLayout
  readonly theme: Theme
  readonly i18n: I18n
  readonly report: DayReportData
  readonly onNext: () => void
}

/**
 * End-of-day card. A single primary action starts the next morning; the
 * backdrop blocks input and deliberately cannot dismiss the card so the player
 * always sees the books before the shop reopens.
 */
export class DayReport {
  private readonly root: Phaser.GameObjects.Container

  constructor(options: DayReportOptions) {
    const { scene, layout, theme, i18n, report } = options
    const ui = layout.ui
    this.root = scene.add.container(0, 0).setDepth(7100)

    const backdrop = scene.add
      .rectangle(0, 0, layout.width, layout.height, theme.overlay, 0.64)
      .setOrigin(0)
      .setInteractive()
    this.root.add(backdrop)

    const cardW = Math.min(430 * ui, layout.width - 40 * ui)
    const cardH = Math.min(492 * ui, layout.height - 40 * ui)
    /** Shrink the contents when the screen is too short for the full card. */
    const unit = Math.min(ui, cardH / 492, cardW / 430)
    const card = scene.add.container(layout.width / 2, layout.height / 2)
    this.root.add(card)

    const g = scene.add.graphics()
    drawPanelFrame(g, -cardW / 2, -cardH / 2, cardW, cardH, theme, 28 * unit)
    drawHeaderRibbon(
      g,
      -cardW / 2 + 18 * unit,
      -cardH / 2 + 16 * unit,
      cardW - 36 * unit,
      64 * unit,
      14 * unit,
    )
    card.add(g)

    const title = i18n.t('day.report.title', { day: report.day })
    card.add(
      scene.add
        .text(0, -cardH / 2 + 48 * unit, title, textStyle(theme, 26 * unit, '#fff7e8', true))
        .setOrigin(0.5),
    )

    const ratingValue = report.rating === null ? '—' : String(report.rating)
    const ratingColor =
      report.rating === null
        ? theme.textMuted
        : report.rating >= 85
          ? cssColor(theme.accentAlt)
          : report.rating >= 70
            ? cssColor(theme.accent)
            : cssColor(theme.danger)
    card.add(
      scene.add
        .text(
          0,
          -cardH / 2 + 118 * unit,
          ratingValue,
          textStyle(theme, 52 * unit, ratingColor, true),
        )
        .setOrigin(0.5),
    )
    card.add(
      scene.add
        .text(
          0,
          -cardH / 2 + 156 * unit,
          ratingLabel(i18n, report.rating),
          textStyle(theme, 16 * unit, theme.textMuted, true),
        )
        .setOrigin(0.5),
    )

    // Five dots repeat the score without relying on colour alone.
    const dots = scene.add.graphics()
    const filled = report.rating === null ? 0 : Math.round(report.rating / 20)
    for (let index = 0; index < 5; index += 1) {
      const x = (index - 2) * 16 * unit
      dots.fillStyle(index < filled ? theme.accent : theme.surfaceAlt, 1)
      dots.fillCircle(x, -cardH / 2 + 184 * unit, 4.5 * unit)
      dots.lineStyle(1.2 * unit, theme.borderSoft, 1)
      dots.strokeCircle(x, -cardH / 2 + 184 * unit, 4.5 * unit)
    }
    card.add(dots)

    const money = (value: number): string => String(Math.max(0, Math.round(value)))
    const average = report.served > 0 ? Math.round(report.revenue / report.served) : 0
    const rows: readonly {
      readonly label: string
      readonly value: string
      readonly tone?: string
    }[] = [
      { label: i18n.t('day.report.revenue'), value: money(report.revenue) },
      { label: i18n.t('day.report.served'), value: String(report.served) },
      { label: i18n.t('day.report.lost'), value: String(report.lost) },
      { label: i18n.t('day.report.missed'), value: String(report.missed) },
      { label: i18n.t('day.report.average'), value: money(average) },
      {
        label: i18n.t('day.report.tip'),
        value:
          report.tip > 0
            ? `+${money(report.tip)} · ${report.tipPercent}%`
            : i18n.t('day.report.noTip'),
        tone: report.tip > 0 ? cssColor(theme.accentAlt) : theme.textMuted,
      },
    ]

    const left = -cardW / 2 + 44 * unit
    const right = cardW / 2 - 44 * unit
    const firstY = -cardH / 2 + 220 * unit
    const rowGap = 30 * unit
    rows.forEach((row, index) => {
      const y = firstY + index * rowGap
      card.add(
        scene.add
          .text(left, y, row.label, textStyle(theme, 15 * unit, theme.textMuted))
          .setOrigin(0, 0.5),
      )
      card.add(
        scene.add
          .text(right, y, row.value, textStyle(theme, 16 * unit, row.tone ?? theme.text, true))
          .setOrigin(1, 0.5),
      )
    })

    const next = new Button(
      scene,
      0,
      cardH / 2 - 50 * unit,
      i18n.t('day.report.next', { day: report.day + 1 }),
      theme,
      {
        width: cardW - 80 * unit,
        height: 54 * unit,
        fontSize: 18 * unit,
        variant: 'primary',
        onClick: options.onNext,
      },
    )
    card.add(next)
  }

  destroy(): void {
    this.root.destroy(true)
  }
}

function ratingLabel(i18n: I18n, rating: number | null): string {
  if (rating === null) return i18n.t('day.rating.none')
  if (rating >= 95) return i18n.t('day.rating.excellent')
  if (rating >= 85) return i18n.t('day.rating.good')
  if (rating >= 70) return i18n.t('day.rating.okay')
  if (rating >= 50) return i18n.t('day.rating.poor')
  return i18n.t('day.rating.bad')
}
