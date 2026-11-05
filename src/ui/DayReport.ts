import { Button, cssColor, type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import type { DayReport as DayReportData } from '../logic/types'
import { drawPanelFrame } from './frames'
import type { GameLayout } from './layout'
import { drawToolIcon } from './toolArt'

export interface DayReportOptions {
  readonly scene: Phaser.Scene
  readonly layout: GameLayout
  readonly theme: Theme
  readonly i18n: I18n
  readonly report: DayReportData
  readonly onNext: () => void
}

interface Row {
  readonly label: string
  readonly value: string
  readonly tone?: string
  readonly strong?: boolean
}

/**
 * End-of-day card. A single primary action starts the next morning; the
 * backdrop blocks input and deliberately cannot dismiss the card so the player
 * always sees the books before the shop reopens.
 *
 * A zero-customer day is not a table of six dashes: it gets a plain explanation
 * and the one next step that will bring shoppers back.
 */
export class DayReport {
  private readonly root: Phaser.GameObjects.Container

  constructor(options: DayReportOptions) {
    const { scene, layout, theme, i18n, report } = options
    const ui = layout.ui
    this.root = scene.add.container(0, 0).setDepth(7100)

    const backdrop = scene.add
      .rectangle(0, 0, layout.width, layout.height, theme.overlay, 0.72)
      .setOrigin(0)
      .setInteractive()
    this.root.add(backdrop)

    const emptyDay = report.rating === null
    const designH = emptyDay ? 440 : 500
    const cardW = Math.min(440 * ui, layout.width - 40 * ui)
    const cardH = Math.min(designH * ui, layout.height - 40 * ui)
    const unit = Math.min(ui, cardH / designH, cardW / 440)
    const card = scene.add.container(layout.width / 2, layout.height / 2)
    this.root.add(card)

    const g = scene.add.graphics()
    drawPanelFrame(g, -cardW / 2, -cardH / 2, cardW, cardH, theme, 28 * unit)
    card.add(g)

    const title = i18n.t('day.report.title', { day: report.day })
    card.add(
      scene.add
        .text(0, -cardH / 2 + 38 * unit, title, textStyle(theme, 24 * unit, theme.text, true))
        .setOrigin(0.5),
    )

    // Hero badge: one large number, a soft disc, and the label underneath.
    const heroY = -cardH / 2 + 112 * unit
    const hero = scene.add.graphics()
    hero.fillStyle(emptyDay ? theme.surfaceAlt : theme.accentWarm, 1)
    hero.fillCircle(0, heroY, 42 * unit)
    hero.lineStyle(2.5 * unit, emptyDay ? theme.borderSoft : theme.accent, 0.9)
    hero.strokeCircle(0, heroY, 42 * unit)
    card.add(hero)
    card.add(
      scene.add
        .text(
          0,
          heroY,
          emptyDay ? '—' : String(report.rating),
          textStyle(theme, 52 * unit, emptyDay ? theme.textMuted : theme.text, true),
        )
        .setOrigin(0.5),
    )
    card.add(
      scene.add
        .text(
          0,
          -cardH / 2 + 166 * unit,
          ratingLabel(i18n, report.rating),
          textStyle(theme, 15 * unit, theme.textMuted, true),
        )
        .setOrigin(0.5),
    )

    if (emptyDay) {
      card.add(
        scene.add
          .text(0, -cardH / 2 + 218 * unit, i18n.t('day.report.emptyBody'), {
            ...textStyle(theme, 15 * unit, theme.textMuted),
            align: 'center',
            wordWrap: { width: cardW - 88 * unit },
            lineSpacing: 6 * unit,
          })
          .setOrigin(0.5, 0),
      )
      const shelf = scene.add.graphics()
      drawToolIcon(shelf, 'shelf', 0, cardH / 2 - 145 * unit, 58 * unit)
      card.add(shelf)
    } else {
      const dots = scene.add.graphics()
      const filled = Math.round((report.rating ?? 0) / 20)
      for (let index = 0; index < 5; index += 1) {
        const x = (index - 2) * 18 * unit
        dots.fillStyle(index < filled ? theme.accent : theme.surfaceAlt, 1)
        dots.fillCircle(x, -cardH / 2 + 194 * unit, 4.5 * unit)
        dots.lineStyle(1.2 * unit, theme.borderSoft, 1)
        dots.strokeCircle(x, -cardH / 2 + 194 * unit, 4.5 * unit)
      }
      card.add(dots)
      this.drawRows(card, options, cardW, cardH, unit)
    }

    const next = new Button(
      scene,
      0,
      cardH / 2 - 48 * unit,
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

  private drawRows(
    card: Phaser.GameObjects.Container,
    options: DayReportOptions,
    cardW: number,
    cardH: number,
    unit: number,
  ): void {
    const { scene, theme, i18n, report } = options
    const money = (value: number): string => String(Math.max(0, Math.round(value)))
    const average = report.served > 0 ? Math.round(report.revenue / report.served) : 0
    const rows: Row[] = [
      { label: i18n.t('day.report.revenue'), value: money(report.revenue), strong: true },
      { label: i18n.t('day.report.served'), value: String(report.served) },
    ]
    if (report.lost > 0) {
      rows.push({ label: i18n.t('day.report.lost'), value: String(report.lost) })
    }
    if (report.missed > 0) {
      rows.push({ label: i18n.t('day.report.missed'), value: String(report.missed) })
    }
    if (report.served > 0) {
      rows.push({ label: i18n.t('day.report.average'), value: money(average) })
    }
    if (report.tip > 0) {
      rows.push({
        label: i18n.t('day.report.tip'),
        value: `+${money(report.tip)} · ${report.tipPercent}%`,
        tone: cssColor(theme.accentInk),
      })
    }

    const left = -cardW / 2 + 48 * unit
    const right = cardW / 2 - 48 * unit
    const firstY = -cardH / 2 + 232 * unit
    const rowGap = Math.min(32 * unit, (cardH - 310 * unit) / Math.max(1, rows.length - 1))

    const divider = scene.add.graphics()
    divider.lineStyle(1 * unit, theme.borderSoft, 0.8)
    divider.lineBetween(left, firstY - 18 * unit, right, firstY - 18 * unit)
    card.add(divider)

    rows.forEach((row, index) => {
      const y = firstY + index * rowGap
      card.add(
        scene.add
          .text(
            left,
            y,
            row.label,
            textStyle(theme, (row.strong ? 16 : 15) * unit, theme.textMuted, row.strong === true),
          )
          .setOrigin(0, 0.5),
      )
      card.add(
        scene.add
          .text(
            right,
            y,
            row.value,
            textStyle(theme, (row.strong ? 19 : 16) * unit, row.tone ?? theme.text, true),
          )
          .setOrigin(1, 0.5),
      )
    })
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
