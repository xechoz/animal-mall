import { Button, type I18n, mixColor, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { DAY } from '../logic/config'
import { dayClockLabel, dayPhase, dayProgress } from '../logic/day'
import { goalCost, nextGoal } from '../logic/goals'
import type { DayPhase, ShopState, Vec2 } from '../logic/types'
import { coinTextureKey } from './fruitArt'
import type { GameLayout } from './layout'
import { type DaySkyTint, daySkyTint } from './lighting'
import { RoundButton } from './RoundButton'

export interface HudCallbacks {
  readonly onShop: () => void
  readonly onPause: () => void
  readonly onDev?: () => void
}

const COIN_PILL_HEIGHT = 44
const COIN_PILL_INSET = 26
/** Layout of the day clock inside its capsule, in design units before `ui`. */
const CLOCK_HORIZON_TOP = 7
const CLOCK_HORIZON_HEIGHT = 28
const CLOCK_ARC_INSET = 30
const CLOCK_ARC_APEX = 15
const CLOCK_TEXT_BASELINE = 49
const CLOCK_TEXT_INSET = 18
const CLOCK_MILESTONES = 5
/** Keep one track dot per milestone centre, plus four dots between each pair. */
const CLOCK_TRACK_DOTS = (CLOCK_MILESTONES - 1) * 5 + 1
const CLOCK_ARC_DOT_RADIUS = 1.2
const CLOCK_MILESTONE_RADIUS = 3.4
const PHASE_PULSE_MS = 350
const CLOSING_PULSE_RATE = 0.003

export class Hud {
  private readonly theme: Theme
  private readonly i18n: I18n
  private readonly bar: Phaser.GameObjects.Graphics
  private readonly coinIcon: Phaser.GameObjects.Image
  private readonly coinsText: Phaser.GameObjects.Text
  private readonly clockBg: Phaser.GameObjects.Graphics
  private readonly clockIcon: Phaser.GameObjects.Graphics
  private readonly dayText: Phaser.GameObjects.Text
  private readonly clockText: Phaser.GameObjects.Text
  private readonly shopButton: RoundButton
  private readonly pauseButton: RoundButton
  private readonly devButton?: Button
  private devEnabled = true
  private layout: GameLayout
  private coinBaseScale = 0.78
  private lastCoins = -1
  private lastAffordable = false
  private lastClock = ''
  private lastPhase: DayPhase | null = null
  private phaseStartMs = 0

  constructor(
    scene: Phaser.Scene,
    layout: GameLayout,
    theme: Theme,
    i18n: I18n,
    callbacks: HudCallbacks,
  ) {
    this.theme = theme
    this.i18n = i18n
    this.layout = layout

    this.bar = scene.add.graphics().setDepth(6000)
    this.coinIcon = scene.add
      .image(0, 0, coinTextureKey())
      .setDepth(6002)
      .setScale(0.78 * layout.ui)
    this.coinsText = scene.add
      .text(0, 0, '', textStyle(theme, 22 * layout.ui, theme.text, true))
      .setOrigin(0, 0.5)
      .setDepth(6002)

    // Day and time sit in a second floating pill beside the coin purse. Keeping
    // it out of the world means the night tint never hurts its legibility.
    this.clockBg = scene.add.graphics().setDepth(6003)
    this.clockIcon = scene.add.graphics().setDepth(6004)
    this.dayText = scene.add
      .text(0, 0, '', textStyle(theme, layout.text.caption, theme.textMuted, true))
      .setOrigin(0, 0.5)
      .setDepth(6004)
    this.clockText = scene.add
      .text(0, 0, '', textStyle(theme, layout.text.body, theme.text, true))
      .setOrigin(1, 0.5)
      .setDepth(6004)

    // Shop and pause carry their own translucent faces, so the top row needs no
    // panel behind them: the world keeps the full width and the HUD floats.
    this.shopButton = new RoundButton(scene, 0, 0, {
      icon: 'bag',
      theme,
      variant: 'glass',
      iconColor: theme.accentInk,
      size: layout.hud.buttonSize,
      onClick: callbacks.onShop,
    })
    this.shopButton.setDepth(6100)
    this.pauseButton = new RoundButton(scene, 0, 0, {
      icon: 'pause',
      theme,
      variant: 'glass',
      size: layout.hud.buttonSize,
      onClick: callbacks.onPause,
    })
    this.pauseButton.setDepth(6100)
    if (callbacks.onDev !== undefined) {
      this.devButton = new Button(scene, 0, 0, 'DEV', theme, {
        width: 64 * layout.ui,
        height: 36 * layout.ui,
        fontSize: 13 * layout.ui,
        variant: 'ghost',
        onClick: callbacks.onDev,
      })
      this.devButton.setDepth(6100)
    }

    this.relayout(layout)
  }

  relayout(layout: GameLayout): void {
    this.layout = layout
    const hud = layout.hud
    const ui = layout.ui
    this.bar.clear()

    this.coinBaseScale = 0.78 * ui
    this.coinIcon.setPosition(hud.coins.x, hud.coins.y).setScale(this.coinBaseScale)
    this.coinsText
      .setOrigin(0, 0.5)
      .setPosition(hud.coins.x + 20 * ui, hud.coins.y)
      .setFontSize(22 * ui)
    this.drawCoinPill()
    this.layoutClock()
    this.shopButton.setPosition(hud.shop.x, hud.shop.y)
    this.pauseButton.setPosition(hud.pause.x, hud.pause.y)
    this.devButton?.setPosition(hud.pause.x, hud.pause.y + hud.buttonSize * 0.95)
    this.lastCoins = -1
    this.lastAffordable = false
    this.lastClock = ''
    this.lastPhase = null
    this.phaseStartMs = 0
  }

  update(state: ShopState, time = 0): void {
    const ms = state.day.ms
    const phase = dayPhase(ms)
    if (phase !== this.lastPhase) {
      // The first frame after a relayout must not fire a transition pulse.
      this.phaseStartMs = this.lastPhase === null ? ms - PHASE_PULSE_MS : ms
      this.lastPhase = phase
    }
    const clock = `${state.day.index}|${dayClockLabel(ms)}|${phase}`
    if (clock !== this.lastClock) {
      this.lastClock = clock
      this.updateClockText(state)
    }
    // Event-driven refreshes pass no frame time; only the render loop animates
    // the sun and its glow so those calls cannot jolt the phase.
    if (time > 0) this.drawClockFace(ms, time)

    if (state.coins !== this.lastCoins) {
      this.lastCoins = state.coins
      const text = String(state.coins)
      this.coinsText.setText(text)
      this.coinsText.setFontSize(22 * this.layout.ui)
      // The pill hugs the number, so every digit count stays readable over the
      // world instead of floating as bare text.
      this.bar.clear()
      this.drawCoinPill()
    }

    // "What to buy next" now lives on the shop cards; the button keeps only the
    // affordable state as a badge so the world view stays quiet.
    const goal = nextGoal(state)
    const affordable = goal !== null && state.coins >= goalCost(state, goal)
    if (affordable !== this.lastAffordable) {
      this.lastAffordable = affordable
      this.shopButton.setBadge(affordable)
    }
  }

  private layoutClock(): void {
    const hud = this.layout.hud
    const ui = this.layout.ui
    const left = hud.clock.x - hud.clockWidth / 2
    const textY = hud.clock.y - hud.clockHeight / 2 + CLOCK_TEXT_BASELINE * ui

    this.dayText
      .setOrigin(0, 0.5)
      .setPosition(left + CLOCK_TEXT_INSET * ui, textY)
      .setFontSize(this.layout.text.caption)
    this.clockText
      .setOrigin(1, 0.5)
      .setPosition(left + hud.clockWidth - CLOCK_TEXT_INSET * ui, textY)
      .setFontSize(Math.max(18 * ui, this.layout.text.body))
  }

  private updateClockText(state: ShopState): void {
    this.dayText.setText(this.i18n.t('day.label', { day: state.day.index }))
    this.clockText.setText(dayClockLabel(state.day.ms))
  }

  /**
   * A sun (or moon) rides a dotted 09:00–21:00 arc. Five milestone beads split
   * the arc into equal steps; passed dots and the rim take their colour from
   * the world lighting curve.
   */
  private drawClockFace(ms: number, time: number): void {
    const hud = this.layout.hud
    const ui = this.layout.ui
    const width = hud.clockWidth
    const height = hud.clockHeight
    const left = hud.clock.x - width / 2
    const top = hud.clock.y - height / 2
    const radius = height / 2
    const tint = daySkyTint(ms)
    const pulse = this.phasePulse(ms)
    const closing = this.closingPulse(ms)

    const bg = this.clockBg
    bg.clear()
    bg.fillStyle(this.theme.shadow, 0.18)
    bg.fillRoundedRect(left, top + 3 * ui, width, height, radius)
    bg.fillStyle(this.theme.panel, 0.96)
    bg.fillRoundedRect(left, top, width, height, radius)

    const horizonY = top + (CLOCK_HORIZON_TOP + CLOCK_HORIZON_HEIGHT) * ui
    bg.lineStyle(1.5 * ui, this.theme.muted, 0.22)
    bg.lineBetween(left + 16 * ui, horizonY, left + width - 16 * ui, horizonY)

    const arcLeft = left + CLOCK_ARC_INSET * ui
    const arcRight = left + width - CLOCK_ARC_INSET * ui
    const arcBaseY = horizonY - 2 * ui
    const arcApexY = top + CLOCK_ARC_APEX * ui
    const progress = dayProgress(ms)
    const passedColor = mixColor(tint.icon, this.theme.ink, 0.45)
    // Milestones keep more of the sun's colour so the five steps read first.
    const milestoneColor = mixColor(tint.icon, this.theme.ink, 0.25)
    drawClockTrack(
      bg,
      arcLeft,
      arcRight,
      arcBaseY,
      arcApexY,
      progress,
      passedColor,
      this.theme.muted,
      ui,
    )
    drawClockMilestones(
      bg,
      arcLeft,
      arcRight,
      arcBaseY,
      arcApexY,
      progress,
      milestoneColor,
      this.theme.muted,
      ui,
    )

    const edge =
      closing > 0
        ? mixColor(this.theme.borderSoft, this.theme.accent, closing * 0.85)
        : mixColor(this.theme.borderSoft, tint.band, 0.3 + pulse * 0.5)
    bg.lineStyle(1.5 * ui + pulse * 0.8 * ui, edge, 0.9)
    bg.strokeRoundedRect(left, top, width, height, radius)

    const point = clockArcPoint(arcLeft, arcRight, arcBaseY, arcApexY, progress)
    this.drawClockBody(point, 5.5 * ui, tint, pulse, time)
  }

  /** One-shot brightness pulse when the day crosses into a new phase. */
  private phasePulse(ms: number): number {
    const elapsed = ms - this.phaseStartMs
    if (elapsed <= 0 || elapsed >= PHASE_PULSE_MS) return 0
    return 1 - elapsed / PHASE_PULSE_MS
  }

  /** Warm border breathing from 20:30 until closing, derived from the shop clock. */
  private closingPulse(ms: number): number {
    if (ms < DAY.lastSpawnMs || ms >= DAY.lengthMs) return 0
    return 0.5 + 0.5 * Math.sin((ms - DAY.lastSpawnMs) * CLOSING_PULSE_RATE)
  }

  private drawClockBody(
    point: Vec2,
    radius: number,
    tint: DaySkyTint,
    pulse: number,
    time: number,
  ): void {
    const g = this.clockIcon
    g.clear()
    const night = this.lastPhase === 'night' || this.lastPhase === 'closing'
    const breathe = 0.5 + 0.5 * Math.sin(time * 0.0022)
    g.fillStyle(tint.icon, (night ? 0.14 : 0.18) + breathe * 0.07 + pulse * 0.24)
    g.fillCircle(point.x, point.y, radius * 2.2)
    g.fillStyle(tint.icon, 1)
    g.fillCircle(point.x, point.y, radius)

    if (night) {
      g.fillStyle(this.theme.panel, 1)
      g.fillCircle(point.x + radius * 0.55, point.y - radius * 0.22, radius * 0.9)
      return
    }

    g.lineStyle(radius * 0.24, tint.icon, 0.6)
    const spin = time * 0.00012
    for (let index = 0; index < 8; index += 1) {
      const angle = spin + (index / 8) * Math.PI * 2
      g.lineBetween(
        point.x + Math.cos(angle) * radius * 1.3,
        point.y + Math.sin(angle) * radius * 1.3,
        point.x + Math.cos(angle) * radius * 1.62,
        point.y + Math.sin(angle) * radius * 1.62,
      )
    }
  }

  /** Floating coin pill: the only HUD surface left above the world. */
  private drawCoinPill(): void {
    const hud = this.layout.hud
    const ui = this.layout.ui
    const radius = (COIN_PILL_HEIGHT * ui) / 2
    const height = COIN_PILL_HEIGHT * ui
    const x = hud.coins.x - COIN_PILL_INSET * ui
    const y = hud.coins.y - height / 2
    const width = Math.max(72 * ui, this.coinsText.x - x + this.coinsText.width + 16 * ui)

    this.bar.fillStyle(this.theme.shadow, 0.18)
    this.bar.fillRoundedRect(x, y + 3 * ui, width, height, radius)
    this.bar.fillStyle(this.theme.panel, 0.96)
    this.bar.fillRoundedRect(x, y, width, height, radius)
    this.bar.lineStyle(1.5 * ui, this.theme.borderSoft, 0.9)
    this.bar.strokeRoundedRect(x, y, width, height, radius)
  }

  setEnabled(enabled: boolean): void {
    this.shopButton.setEnabled(enabled)
    this.pauseButton.setEnabled(enabled)
    if (this.devButton !== undefined && this.devEnabled !== enabled) {
      this.devEnabled = enabled
      this.devButton.setEnabled(enabled)
    }
  }

  pulseCoin(): void {
    this.coinIcon.scene.tweens.add({
      targets: this.coinIcon,
      scale: { from: this.coinBaseScale * 1.22, to: this.coinBaseScale },
      duration: 220,
      ease: 'Quad.easeOut',
    })
  }
}

/** Point on the shallow quadratic that runs from the left horizon to the right one. */
function clockArcPoint(left: number, right: number, baseY: number, apexY: number, t: number): Vec2 {
  const clamped = Math.max(0, Math.min(1, t))
  const controlY = apexY * 2 - baseY
  const inverse = 1 - clamped
  const y = inverse * inverse * baseY + 2 * inverse * clamped * controlY + clamped * clamped * baseY
  return { x: left + (right - left) * clamped, y }
}

/** Small beads along the whole arc; passed beads brighten with the day. */
function drawClockTrack(
  g: Phaser.GameObjects.Graphics,
  left: number,
  right: number,
  baseY: number,
  apexY: number,
  progress: number,
  passedColor: number,
  upcomingColor: number,
  ui: number,
): void {
  for (let index = 0; index < CLOCK_TRACK_DOTS; index += 1) {
    const t = index / Math.max(1, CLOCK_TRACK_DOTS - 1)
    const point = clockArcPoint(left, right, baseY, apexY, t)
    const passed = t <= progress + 0.001
    g.fillStyle(passed ? passedColor : upcomingColor, passed ? 0.9 : 0.28)
    g.fillCircle(point.x, point.y, CLOCK_ARC_DOT_RADIUS * ui)
  }
}

/** Five larger beads at 09:00 / 12:00 / 15:00 / 18:00 / 21:00. */
function drawClockMilestones(
  g: Phaser.GameObjects.Graphics,
  left: number,
  right: number,
  baseY: number,
  apexY: number,
  progress: number,
  passedColor: number,
  upcomingColor: number,
  ui: number,
): void {
  for (let index = 0; index < CLOCK_MILESTONES; index += 1) {
    const t = index / Math.max(1, CLOCK_MILESTONES - 1)
    const point = clockArcPoint(left, right, baseY, apexY, t)
    const passed = t <= progress + 0.001
    // Hollow so the aligned track dot stays visible at the ring's centre.
    g.lineStyle(1.4 * ui, passed ? passedColor : upcomingColor, passed ? 1 : 0.5)
    g.strokeCircle(point.x, point.y, CLOCK_MILESTONE_RADIUS * ui)
    g.fillStyle(passed ? passedColor : upcomingColor, passed ? 1 : 0.55)
    g.fillCircle(point.x, point.y, CLOCK_ARC_DOT_RADIUS * ui)
  }
}
