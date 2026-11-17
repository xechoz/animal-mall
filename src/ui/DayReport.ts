import { cssColor, drawIcon, type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { isPlantKind, ZONE_PRODUCTS } from '../logic/config'
import type { Goal } from '../logic/goals'
import type { DayReport as DayReportData } from '../logic/types'
import { playerTextureKey } from './animalArt'
import { goalProgress, ratingStars, reportMode } from './dayReportModel'
import { drawPanelFrame } from './frames'
import { coinTextureKey } from './fruitArt'
import { GameButton } from './GameButton'
import type { GameLayout } from './layout'
import { productTextureKey } from './productArt'
import { staffPortraitKey } from './staffArt'
import { drawToolIcon } from './toolArt'

export interface DayReportOptions {
  readonly scene: Phaser.Scene
  readonly layout: GameLayout
  readonly theme: Theme
  readonly i18n: I18n
  readonly report: DayReportData
  /** Coins already in the purse, including the tip paid at closing. */
  readonly coins: number
  /** Cashier takings still waiting on the counter. */
  readonly pendingCoins: number
  /** The purchase the shop would recommend next, if any. */
  readonly goal: Goal
  /** Cost of that purchase; zero when the goal is null. */
  readonly goalCost: number
  /** True once every zone, producer, staff role and upgrade is owned. */
  readonly allDone: boolean
  readonly onNext: () => void
}

interface ChipSpec {
  readonly kind: 'sad' | 'crate' | 'star'
  readonly value?: string
  readonly label: string
  readonly accent?: boolean
}

/**
 * End-of-day ledger. The page answers three questions in order: how much the
 * day earned, what went wrong, and what the player is working toward next.
 *
 * The old card was a six-row table with the stars floating above it. Revenue now
 * owns the hero block, problems are reduced to one row of chips, and the next
 * purchase gets its own progress card. A single button starts the morning; the
 * report deliberately cannot be dismissed by the backdrop.
 */
export class DayReport {
  private readonly root: Phaser.GameObjects.Container
  private readonly scene: Phaser.Scene
  private readonly animated: object[] = []
  private destroyed = false

  constructor(options: DayReportOptions) {
    const { scene, layout, theme, i18n, report, goal } = options
    const ui = layout.ui
    const mode = reportMode(report)
    const filledStars = ratingStars(report.rating)
    const emptyDay = mode === 'empty'
    const hasGoal = goal !== null || options.allDone
    const portrait = layout.portrait
    const designW = portrait ? 400 : 540
    const designH = hasGoal
      ? mode === 'normal'
        ? portrait
          ? 540
          : 500
        : portrait
          ? 440
          : 380
      : emptyDay
        ? portrait
          ? 380
          : 320
        : portrait
          ? 420
          : 360
    const availableWidth = layout.width - 32 * ui
    const availableHeight = layout.height - 32 * ui
    const unit = Math.min(ui, availableWidth / designW, availableHeight / designH)
    const cardW = designW * unit
    const cardH = designH * unit
    const padding = (portrait ? 32 : 28) * unit
    const left = -cardW / 2 + padding
    const right = cardW / 2 - padding
    const contentW = right - left
    const reduceMotion = prefersReducedMotion()
    const numberFormat = new Intl.NumberFormat(i18n.lang, { maximumFractionDigits: 0 })
    const fmt = (value: number): string => numberFormat.format(Math.max(0, Math.round(value)))
    const available = Math.max(0, options.coins + options.pendingCoins)
    const ready = goal !== null && available >= options.goalCost
    const pending = options.pendingCoins

    this.scene = scene
    this.root = scene.add.container(0, 0).setDepth(7100)

    const backdrop = scene.add
      .rectangle(0, 0, layout.width, layout.height, theme.overlay, 0.74)
      .setOrigin(0)
      .setInteractive()
    this.root.add(backdrop)

    const card = scene.add.container(layout.width / 2, layout.height / 2)
    this.root.add(card)

    const g = scene.add.graphics()
    // The header starts at the left edge, so drop the upper leaf corner that
    // would sit behind the shopkeeper portrait.
    drawPanelFrame(g, -cardW / 2, -cardH / 2, cardW, cardH, theme, 28 * unit, false)
    card.add(g)

    const addText = (
      x: number,
      y: number,
      value: string,
      size: number,
      color: string,
      bold = false,
      originX = 0,
      originY = 0,
    ): Phaser.GameObjects.Text => {
      const label = scene.add
        .text(x, y, value, textStyle(theme, size, color, bold))
        .setOrigin(originX, originY)
      card.add(label)
      return label
    }

    let y = -cardH / 2 + padding

    const headerHeight = 44 * unit
    const headerCenter = y + headerHeight / 2
    const mascot = scene.add.image(left + 22 * unit, headerCenter, playerTextureKey())
    mascot.setScale((40 * unit) / mascot.width)
    card.add(mascot)
    addText(
      left + 50 * unit,
      headerCenter,
      i18n.t('day.label', { day: report.day }),
      24 * unit,
      theme.text,
      true,
      0,
      0.5,
    )

    const starRadius = 11 * unit
    const starGap = 6 * unit
    const starStep = starRadius * 2 + starGap
    const starRowW = starRadius * 10 + starGap * 4
    for (let index = 0; index < 5; index += 1) {
      const on = index < filledStars
      const star = scene.add.graphics()
      drawStar(
        star,
        0,
        0,
        starRadius,
        on ? theme.accent : theme.surfaceAlt,
        on ? theme.accentInk : theme.borderSoft,
        1.5 * unit,
        on ? 0.45 : 0.9,
      )
      star.setPosition(right - starRowW + starRadius + index * starStep, headerCenter)
      card.add(star)
      if (!reduceMotion && on) {
        star.setScale(0.55).setAlpha(0)
        this.animated.push(star)
        scene.tweens.add({
          targets: star,
          scale: 1,
          alpha: 1,
          delay: 120 + index * 55,
          duration: 220,
          ease: 'Back.easeOut',
        })
      }
    }

    y += headerHeight + 16 * unit

    if (mode === 'normal') {
      const eyebrow = addText(
        left,
        y,
        i18n.t('day.report.revenue'),
        12 * unit,
        theme.textMuted,
        true,
      )
      eyebrow.setLetterSpacing(1 * unit)
      y += 16 * unit

      const heroCenter = y + 28 * unit
      const coin = scene.add.image(left + 16 * unit, heroCenter, coinTextureKey())
      coin.setScale((34 * unit) / coin.width)
      card.add(coin)
      const money = addText(
        left + 38 * unit,
        heroCenter,
        fmt(reduceMotion ? report.revenue : 0),
        52 * unit,
        theme.text,
        true,
        0,
        0.5,
      )
      if (!reduceMotion) {
        const counter = { value: 0 }
        this.animated.push(money, counter)
        scene.tweens.add({
          targets: counter,
          value: report.revenue,
          delay: 110,
          duration: 460,
          ease: 'Cubic.easeOut',
          onUpdate: () => money.setText(fmt(counter.value)),
          onComplete: () => money.setText(fmt(report.revenue)),
        })
      }

      y += 58 * unit
      const captionY = y + 8 * unit
      const served = addText(
        left,
        captionY,
        i18n.t('day.report.servedLine', { count: report.served }),
        15 * unit,
        theme.textMuted,
        false,
        0,
        0.5,
      )
      if (report.tip > 0) {
        const dot = addText(
          served.x + served.width + 7 * unit,
          captionY,
          '·',
          15 * unit,
          theme.textMuted,
          false,
          0,
          0.5,
        )
        const tip = addText(
          dot.x + dot.width + 7 * unit,
          captionY,
          i18n.t('day.report.tipLine', { amount: fmt(report.tip) }),
          15 * unit,
          cssColor(theme.accentInk),
          true,
          0,
          0.5,
        )
        if (!reduceMotion) {
          tip.setAlpha(0)
          this.animated.push(tip)
          scene.tweens.add({
            targets: tip,
            alpha: 1,
            delay: 360,
            duration: 220,
            ease: 'Quad.easeOut',
          })
        }
      }
      y += 22 * unit
    } else if (mode === 'empty') {
      addText(left, y + 10 * unit, i18n.t('day.rating.none'), 30 * unit, theme.text, true, 0, 0.5)
      y += 36 * unit
      const body = scene.add
        .text(left, y, i18n.t('day.report.emptyBody'), {
          ...textStyle(theme, 15 * unit, theme.textMuted),
          wordWrap: { width: contentW },
          lineSpacing: 6 * unit,
        })
        .setOrigin(0, 0)
      card.add(body)
      y += body.height + 14 * unit
    } else {
      addText(
        left,
        y + 10 * unit,
        i18n.t('day.report.noSales'),
        30 * unit,
        theme.text,
        true,
        0,
        0.5,
      )
      y += 36 * unit
    }

    y += 16 * unit

    if (!emptyDay) {
      const chips: ChipSpec[] = []
      if (report.lost > 0) {
        chips.push({
          kind: 'sad',
          value: String(report.lost),
          label: i18n.t('day.report.lostShort'),
        })
      }
      if (report.missed > 0) {
        chips.push({
          kind: 'crate',
          value: String(report.missed),
          label: i18n.t('day.report.missedShort'),
        })
      }
      if (chips.length === 0 && report.served > 0) {
        chips.push({ kind: 'star', label: i18n.t('day.report.perfect'), accent: true })
      }
      if (chips.length > 0) {
        const chipHeight = 28 * unit
        const chipGap = 8 * unit
        let chipX = left
        let chipY = y + chipHeight / 2
        for (const spec of chips) {
          const chip = buildChip(scene, theme, unit, spec)
          if (chipX > left && chipX + chip.width > right) {
            chipX = left
            chipY += chipHeight + 6 * unit
          }
          chip.container.setPosition(chipX + chip.width / 2, chipY)
          card.add(chip.container)
          chipX += chip.width + chipGap
        }
        y = chipY + chipHeight / 2 + 16 * unit
      }
    }

    if (hasGoal) {
      y += 2 * unit
      const rule = scene.add.graphics()
      drawDashedLine(rule, left, right, y, 5 * unit, 4 * unit, theme.borderSoft, 0.8, 1 * unit)
      card.add(rule)
      y += 18 * unit

      if (goal !== null) {
        const label = addText(
          left,
          y,
          i18n.t('day.report.nextLabel'),
          12 * unit,
          theme.textMuted,
          true,
        )
        label.setLetterSpacing(1 * unit)
        y += 18 * unit
      }

      const boxTop = y
      const boxH = goal !== null ? 90 * unit + (pending > 0 ? 12 * unit : 0) : 72 * unit
      const goalCard = scene.add.graphics()
      goalCard.fillStyle(theme.surface, 0.92)
      goalCard.fillRoundedRect(left, boxTop, contentW, boxH, 18 * unit)
      goalCard.lineStyle(
        (ready ? 2 : 1.2) * unit,
        ready ? theme.accent : theme.borderSoft,
        ready ? 1 : 0.85,
      )
      goalCard.strokeRoundedRect(left, boxTop, contentW, boxH, 18 * unit)
      card.add(goalCard)

      const iconX = left + 44 * unit
      const iconY = boxTop + boxH / 2
      const medallion = scene.add.graphics()
      medallion.fillStyle(theme.surfaceAlt, 0.95)
      medallion.fillCircle(iconX, iconY, 25 * unit)
      medallion.lineStyle(1.2 * unit, theme.borderSoft, 0.9)
      medallion.strokeCircle(iconX, iconY, 25 * unit)
      card.add(medallion)
      addGoalIcon(scene, card, goal, iconX, iconY, unit, theme)

      const textX = left + 78 * unit
      if (goal !== null) {
        const name = addText(
          textX,
          boxTop + 26 * unit,
          goalName(i18n, goal),
          19 * unit,
          theme.text,
          true,
          0,
          0.5,
        )
        fitText(name, right - 14 * unit - textX - 80 * unit, 19 * unit, 14 * unit)
        if (ready) {
          // A plain check + word reads as a status, not a second green button
          // competing with Start day. The full bar and accent rim already say
          // the purchase is affordable.
          const readyLabel = addText(
            right - 12 * unit,
            boxTop + 26 * unit,
            i18n.t('day.report.ready'),
            13 * unit,
            cssColor(theme.accentInk),
            true,
            1,
            0.5,
          )
          const check = scene.add.graphics()
          drawCheck(
            check,
            readyLabel.x - readyLabel.width - 10 * unit,
            boxTop + 26 * unit,
            12 * unit,
            theme.accentInk,
          )
          card.add(check)
        } else {
          addText(
            right - 12 * unit,
            boxTop + 26 * unit,
            `${fmt(available)} / ${fmt(options.goalCost)}`,
            15 * unit,
            theme.text,
            true,
            1,
            0.5,
          )
        }

        const barX = textX
        const barY = boxTop + 56 * unit
        const barW = right - 14 * unit - barX
        const barH = 8 * unit
        const bar = scene.add.graphics()
        card.add(bar)
        const ratio = goalProgress(available, options.goalCost)
        const drawBar = (value: number): void => {
          bar.clear()
          bar.fillStyle(theme.surfaceAlt, 1)
          bar.fillRoundedRect(barX, barY, barW, barH, barH / 2)
          if (value > 0) {
            bar.fillStyle(theme.accent, 1)
            bar.fillRoundedRect(barX, barY, Math.max(barH, barW * value), barH, barH / 2)
          }
          bar.lineStyle(1 * unit, theme.borderSoft, 0.7)
          bar.strokeRoundedRect(barX, barY, barW, barH, barH / 2)
        }
        if (reduceMotion) {
          drawBar(ratio)
        } else {
          const progress = { value: 0 }
          drawBar(0)
          this.animated.push(bar, progress)
          scene.tweens.add({
            targets: progress,
            value: ratio,
            delay: 360,
            duration: 420,
            ease: 'Cubic.easeOut',
            onUpdate: () => drawBar(progress.value),
          })
        }

        if (pending > 0) {
          addText(
            textX,
            boxTop + 78 * unit,
            i18n.t('day.report.pending', { amount: fmt(pending) }),
            12 * unit,
            theme.textMuted,
            false,
            0,
            0.5,
          )
        }
      } else {
        const name = addText(
          textX,
          boxTop + boxH / 2,
          i18n.t('day.report.allDone'),
          19 * unit,
          theme.text,
          true,
          0,
          0.5,
        )
        fitText(name, right - 14 * unit - textX, 19 * unit, 14 * unit)
      }

      y = boxTop + boxH + 16 * unit
    }

    const buttonHeight = 54 * unit
    const openedAt = scene.time.now
    const next = new GameButton(
      scene,
      0,
      y + buttonHeight / 2,
      i18n.t('day.report.next', { day: report.day + 1 }),
      theme,
      {
        width: contentW,
        height: buttonHeight,
        fontSize: 20 * unit,
        variant: 'primary',
        minHitSize: 64 * unit,
        onClick: () => {
          // The report appears while the player may still be holding a click.
          if (scene.time.now - openedAt < 300) return
          options.onNext()
        },
      },
    )
    card.add(next)

    if (!reduceMotion) {
      backdrop.setAlpha(0)
      card.setAlpha(0).setScale(0.94)
      this.animated.push(backdrop, card)
      scene.tweens.add({
        targets: backdrop,
        alpha: 0.74,
        duration: 160,
        ease: 'Quad.easeOut',
      })
      scene.tweens.add({
        targets: card,
        alpha: 1,
        scale: 1,
        duration: 220,
        ease: 'Back.easeOut',
      })
    }
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    for (const target of this.animated) this.scene.tweens.killTweensOf(target)
    this.root.destroy(true)
  }
}

function buildChip(
  scene: Phaser.Scene,
  theme: Theme,
  unit: number,
  spec: ChipSpec,
): { readonly container: Phaser.GameObjects.Container; readonly width: number } {
  const height = 28 * unit
  const padX = 10 * unit
  const iconSize = 14 * unit
  const gap = 5 * unit
  const valueText =
    spec.value === undefined
      ? undefined
      : scene.add
          .text(0, 0, spec.value, textStyle(theme, 15 * unit, theme.text, true))
          .setOrigin(0, 0.5)
  const labelText = scene.add
    .text(
      0,
      0,
      spec.label,
      textStyle(
        theme,
        13 * unit,
        spec.accent === true ? cssColor(theme.accentInk) : theme.textMuted,
        spec.accent === true,
      ),
    )
    .setOrigin(0, 0.5)

  const width =
    padX * 2 +
    iconSize +
    gap +
    (valueText === undefined ? 0 : valueText.width + gap) +
    labelText.width
  const bg = scene.add.graphics()
  bg.fillStyle(spec.accent === true ? theme.accentWarm : theme.surfaceAlt, 0.92)
  bg.fillRoundedRect(-width / 2, -height / 2, width, height, height / 2)
  bg.lineStyle(1 * unit, spec.accent === true ? theme.accent : theme.borderSoft, 0.75)
  bg.strokeRoundedRect(-width / 2, -height / 2, width, height, height / 2)

  const icon = scene.add.graphics()
  const iconX = -width / 2 + padX + iconSize / 2
  if (spec.kind === 'sad') drawSadFace(icon, iconX, 0, iconSize, theme.danger)
  else if (spec.kind === 'crate') drawCrate(icon, iconX, 0, iconSize, theme.muted)
  else {
    drawIcon(icon, 'star', iconSize, theme.accentInk)
    icon.setPosition(iconX, 0)
  }

  let cursor = -width / 2 + padX + iconSize + gap
  if (valueText !== undefined) {
    valueText.setPosition(cursor, 0)
    cursor += valueText.width + gap
  }
  labelText.setPosition(cursor, 0)

  const children: Phaser.GameObjects.GameObject[] = [bg, icon]
  if (valueText !== undefined) children.push(valueText)
  children.push(labelText)
  return { container: scene.add.container(0, 0, children), width }
}

function addGoalIcon(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  goal: Goal,
  x: number,
  y: number,
  unit: number,
  theme: Theme,
): void {
  const icon = scene.add.container(x, y)
  if (goal === null) {
    const star = scene.add.graphics()
    drawIcon(star, 'star', 26 * unit, theme.accentInk)
    icon.add(star)
  } else if (goal.type === 'upgrade') {
    const tool = scene.add.graphics()
    drawToolIcon(tool, goal.kind, 0, 0, 30 * unit)
    icon.add(tool)
  } else if (goal.type === 'staff') {
    const portrait = scene.add.image(0, 0, staffPortraitKey(goal.kind))
    portrait.setScale((40 * unit) / portrait.width)
    icon.add(portrait)
  } else {
    const product = goal.type === 'zone' ? ZONE_PRODUCTS[goal.zone][0] : goal.product
    const image = scene.add.image(0, 0, productTextureKey(product))
    image.setScale((32 * unit) / image.width)
    icon.add(image)
    if (goal.type === 'zone') {
      const lock = scene.add.graphics()
      drawLockBadge(lock, 15 * unit, 15 * unit, 8 * unit, theme)
      icon.add(lock)
    }
  }
  parent.add(icon)
}

function goalName(i18n: I18n, goal: NonNullable<Goal>): string {
  if (goal.type === 'zone') return i18n.t(`zone.${goal.zone}`)
  if (goal.type === 'staff') return i18n.t(`staff.${goal.kind}`)
  if (goal.type === 'upgrade') return i18n.t(`tool.${goal.kind}`)
  return i18n.t(isPlantKind(goal.product) ? `product.${goal.product}` : `producer.${goal.product}`)
}

function fitText(
  text: Phaser.GameObjects.Text,
  maxWidth: number,
  baseSize: number,
  minSize: number,
): void {
  if (text.width <= maxWidth || text.width <= 0) return
  text.setFontSize(Math.max(minSize, baseSize * (maxWidth / text.width)))
}

function drawDashedLine(
  g: Phaser.GameObjects.Graphics,
  x1: number,
  x2: number,
  y: number,
  dash: number,
  gap: number,
  color: number,
  alpha: number,
  width: number,
): void {
  g.lineStyle(width, color, alpha)
  for (let x = x1; x < x2; x += dash + gap) {
    g.lineBetween(x, y, Math.min(x + dash, x2), y)
  }
}

/** Five equal stars, the first `filled` in accent and the rest as empty paper. */
function drawStar(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  radius: number,
  fill: number,
  stroke: number,
  strokeWidth: number,
  strokeAlpha: number,
): void {
  const points = starPoints(cx, cy, radius)
  g.fillStyle(fill, 1)
  g.lineStyle(strokeWidth, stroke, strokeAlpha)
  g.beginPath()
  points.forEach((point, index) => {
    if (index === 0) g.moveTo(point.x, point.y)
    else g.lineTo(point.x, point.y)
  })
  g.closePath()
  g.fillPath()
  g.strokePath()
}

function starPoints(cx: number, cy: number, radius: number): Array<{ x: number; y: number }> {
  const inner = radius * 0.46
  const points: Array<{ x: number; y: number }> = []
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5
    const length = index % 2 === 0 ? radius : inner
    points.push({ x: cx + Math.cos(angle) * length, y: cy + Math.sin(angle) * length })
  }
  return points
}

function drawSadFace(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  color: number,
): void {
  const radius = size / 2
  g.lineStyle(Math.max(1.2, size * 0.11), color, 0.9)
  g.strokeCircle(x, y, radius * 0.85)
  g.fillStyle(color, 0.9)
  g.fillCircle(x - radius * 0.28, y - radius * 0.12, radius * 0.13)
  g.fillCircle(x + radius * 0.28, y - radius * 0.12, radius * 0.13)
  g.beginPath()
  g.moveTo(x - radius * 0.3, y + radius * 0.4)
  g.lineTo(x, y + radius * 0.17)
  g.lineTo(x + radius * 0.3, y + radius * 0.4)
  g.strokePath()
}

function drawCheck(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  color: number,
): void {
  g.lineStyle(Math.max(1.5, size * 0.16), color, 1)
  g.beginPath()
  g.moveTo(x - size * 0.35, y)
  g.lineTo(x - size * 0.05, y + size * 0.3)
  g.lineTo(x + size * 0.4, y - size * 0.3)
  g.strokePath()
}

function drawCrate(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  color: number,
): void {
  const width = size * 0.88
  const height = size * 0.7
  g.lineStyle(Math.max(1.2, size * 0.11), color, 0.9)
  g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, size * 0.08)
  g.lineBetween(
    x - width / 2 + size * 0.1,
    y - height * 0.14,
    x + width / 2 - size * 0.1,
    y - height * 0.14,
  )
  g.lineBetween(x, y - height / 2, x, y + height / 2)
}

function drawLockBadge(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  theme: Theme,
): void {
  g.fillStyle(theme.surface, 1)
  g.fillCircle(x, y, radius)
  g.lineStyle(1.2, theme.borderSoft, 1)
  g.strokeCircle(x, y, radius)
  const bodyW = radius * 0.9
  const bodyH = radius * 0.7
  g.fillStyle(theme.muted, 1)
  g.fillRoundedRect(x - bodyW / 2, y - radius * 0.02, bodyW, bodyH, radius * 0.12)
  g.lineStyle(Math.max(1, radius * 0.12), theme.muted, 1)
  g.beginPath()
  g.arc(x, y - radius * 0.02, bodyW * 0.32, Math.PI, 0)
  g.strokePath()
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
