import { type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import type { Rect, ShopState, TutorialStep, Vec2 } from '../logic/types'
import type { GameLayout } from './layout'
import { guideFor, type TutorialGuide } from './tutorialGuide'
import { type WorldCamera, worldToScreen } from './worldCamera'

const AREA_DEPTH = 3997
const BEACON_DEPTH = 5990
const PLAYER_ARROW_DEPTH = 5991
const PILL_DEPTH = 6210
const TEXT_DEPTH = 6211
const DOTS = 4

/**
 * World-space onboarding guide: highlights the real trigger area, points a
 * direction arrow beside the player and marks the destination. The tap hand
 * lives in the crop chooser (see `TapHint`), because standing still already
 * opens that chooser; a hand over the bed would only duplicate the dwell.
 */
export class TutorialOverlay {
  private readonly layout: GameLayout
  private readonly camera: WorldCamera
  private readonly theme: Theme
  private readonly i18n: I18n
  private readonly mobile: boolean
  private readonly area: Phaser.GameObjects.Graphics
  private readonly beacon: Phaser.GameObjects.Graphics
  private readonly playerArrow: Phaser.GameObjects.Graphics
  private readonly waitClock: Phaser.GameObjects.Graphics
  private readonly waitText: Phaser.GameObjects.Text
  private readonly pill: Phaser.GameObjects.Graphics
  private readonly title: Phaser.GameObjects.Text
  private readonly hint: Phaser.GameObjects.Text
  private lastWaitText = ''
  private guide: TutorialGuide | null = null
  private step: TutorialStep = 'done'
  private hidden = false
  private initialized = false

  constructor(
    scene: Phaser.Scene,
    layout: GameLayout,
    camera: WorldCamera,
    theme: Theme,
    i18n: I18n,
    mobile: boolean,
  ) {
    this.layout = layout
    this.camera = camera
    this.theme = theme
    this.i18n = i18n
    this.mobile = mobile
    this.area = scene.add.graphics().setDepth(AREA_DEPTH)
    this.beacon = scene.add.graphics().setDepth(BEACON_DEPTH)
    this.playerArrow = scene.add.graphics().setDepth(PLAYER_ARROW_DEPTH)
    this.waitClock = scene.add.graphics().setDepth(PLAYER_ARROW_DEPTH + 1)
    this.waitText = scene.add
      .text(0, 0, '', textStyle(theme, 14 * layout.ui, theme.text, true))
      .setOrigin(0.5)
      .setDepth(PLAYER_ARROW_DEPTH + 2)
    this.pill = scene.add.graphics().setDepth(PILL_DEPTH)
    this.title = scene.add
      .text(0, 0, '', textStyle(theme, 18 * layout.ui, theme.text, true))
      .setOrigin(0.5, 0)
      .setDepth(TEXT_DEPTH)
    this.hint = scene.add
      .text(0, 0, '', textStyle(theme, 13 * layout.ui, theme.textMuted, false))
      .setOrigin(0.5, 0)
      .setDepth(TEXT_DEPTH)
    this.setVisible(false)
  }

  update(state: ShopState, time: number): void {
    if (this.hidden) return
    if (state.tutorial === 'done') {
      this.hide()
      return
    }

    const guide = guideFor(state, this.guide)
    if (!this.initialized || guide.step !== this.step) {
      this.initialized = true
      this.step = guide.step
      this.setText(guide.step)
      this.guide = guide
      this.layoutPill()
    }
    this.guide = guide
    this.draw(guide, state.player.pos, time)
  }

  setVisible(visible: boolean): void {
    const show = visible && !this.hidden
    this.area.setVisible(show)
    this.beacon.setVisible(show)
    this.playerArrow.setVisible(show)
    this.waitClock.setVisible(show)
    this.waitText.setVisible(show)
    this.pill.setVisible(show)
    this.title.setVisible(show)
    this.hint.setVisible(show)
  }

  destroy(): void {
    this.area.destroy()
    this.beacon.destroy()
    this.playerArrow.destroy()
    this.waitClock.destroy()
    this.waitText.destroy()
    this.pill.destroy()
    this.title.destroy()
    this.hint.destroy()
  }

  private setText(step: TutorialStep): void {
    if (step === 'done') return
    this.title.setText(this.i18n.t(`tutorial.${step}.title`))
    const hint =
      step === 'buyTree'
        ? `tutorial.buyTree.${this.mobile ? 'hintTouch' : 'hintKeys'}`
        : `tutorial.${step}.hint`
    this.hint.setText(this.i18n.t(hint))
  }

  private layoutPill(): void {
    const content = this.layout.content
    const ui = this.layout.ui
    const maxWidth = Math.min(520 * ui, content.w - 48 * ui)
    const innerWidth = Math.max(80 * ui, maxWidth - 48 * ui)
    this.title.setWordWrapWidth(innerWidth, true)
    this.hint.setWordWrapWidth(innerWidth, true)

    const dotsH = 6 * ui
    const dotsGap = 6 * ui
    const lineGap = 3 * ui
    const blockHeight = dotsH + dotsGap + this.title.height + lineGap + this.hint.height
    const padX = 24 * ui
    const padY = 12 * ui
    const pillWidth = Math.min(
      maxWidth,
      Math.max(160 * ui, Math.max(this.title.width, this.hint.width) + padX * 2),
    )
    const pillHeight = blockHeight + padY * 2
    const x = content.x + content.w / 2
    const top = this.layout.hud.pause.y + this.layout.hud.buttonSize / 2 + 14 * ui
    const y = top + pillHeight / 2
    const left = x - pillWidth / 2
    const topEdge = y - pillHeight / 2

    this.pill.clear()
    this.pill.fillStyle(0x3b2f3a, 0.16)
    this.pill.fillRoundedRect(left, topEdge + 4 * ui, pillWidth, pillHeight, 18 * ui)
    this.pill.fillStyle(this.theme.panel, 0.96)
    this.pill.fillRoundedRect(left, topEdge, pillWidth, pillHeight, 18 * ui)
    this.pill.lineStyle(2 * ui, this.theme.borderSoft, 1)
    this.pill.strokeRoundedRect(left, topEdge, pillWidth, pillHeight, 18 * ui)

    const index = this.guide === null ? 0 : Math.min(this.guide.index, DOTS - 1)
    const radius = 3 * ui
    const gap = 9 * ui
    const dotsWidth = DOTS * radius * 2 + (DOTS - 1) * gap
    let dotX = x - dotsWidth / 2 + radius
    const dotY = topEdge + padY + dotsH / 2
    for (let dot = 0; dot < DOTS; dot += 1) {
      const done = dot < index
      this.pill.fillStyle(
        done || dot === index ? this.theme.accent : this.theme.borderSoft,
        done ? 0.45 : 1,
      )
      this.pill.fillCircle(dotX, dotY, radius)
      dotX += radius * 2 + gap
    }

    const titleTop = topEdge + padY + dotsH + dotsGap
    this.title.setPosition(x, titleTop)
    this.hint.setPosition(x, titleTop + this.title.height + lineGap)
  }

  private draw(guide: TutorialGuide, player: Vec2, time: number): void {
    const ui = this.layout.ui
    const content = this.layout.content
    const edgeMargin = Math.min(52 * ui, content.w / 2, content.h / 2)
    const minX = content.x + edgeMargin
    const maxX = content.x + content.w - edgeMargin
    const minY = content.y + edgeMargin
    const maxY = content.y + content.h - edgeMargin
    const markerScreen = worldToScreen(this.camera, guide.marker)
    const playerScreen = worldToScreen(this.camera, player)
    // The old edge margin treated a destination just inside the bottom fence
    // as off-screen. Only fall back to the edge arrow when the marker is really
    // outside the play area; the landing arrow itself may sit near the edge.
    const inside = 10 * ui
    const offscreen =
      markerScreen.x < content.x + inside ||
      markerScreen.x > content.x + content.w - inside ||
      markerScreen.y < content.y + inside ||
      markerScreen.y > content.y + content.h - inside

    this.area.clear()
    this.beacon.clear()
    this.playerArrow.clear()
    this.waitClock.clear()
    this.waitText.setVisible(false)
    this.drawPlayerArrow(playerScreen, markerScreen, guide.inReach, time, ui)

    if (offscreen) {
      const x = clamp(markerScreen.x, minX, maxX)
      const y = clamp(markerScreen.y, minY, maxY)
      const angle = Math.atan2(markerScreen.y - y, markerScreen.x - x)
      drawChevron(this.beacon, x, y, angle, 1, this.theme, 14 * ui)
      return
    }

    const rect = screenRect(this.camera, guide.rect)
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.004)
    this.drawArea(rect, pulse, ui)

    if (guide.mode === 'wait') {
      this.drawWaitClock(markerScreen, guide.waitMs ?? 0, time, ui)
      return
    }

    const alpha = guide.inReach ? 0.25 : 1
    drawLandingArrow(this.beacon, markerScreen.x, markerScreen.y, alpha, time, this.theme, ui)
  }

  /**
   * A short arrow beside the player points at the target. The destination
   * marker says *where* to go; this one says *which way* when the target is
   * far away or off-screen.
   */
  private drawPlayerArrow(
    playerScreen: Vec2,
    targetScreen: Vec2,
    inReach: boolean,
    time: number,
    ui: number,
  ): void {
    // Orbit the character's body rather than its feet: the sprite is drawn
    // upward from the feet, so a feet-anchored arrow would sit on the face.
    const anchorX = playerScreen.x
    const anchorY = playerScreen.y - 18 * ui
    const dx = targetScreen.x - anchorX
    const dy = targetScreen.y - anchorY
    const gap = Math.hypot(dx, dy)
    // Close enough for the hand/area to speak for itself; also stops the
    // arrow from pointing past a target that is right next to the player.
    if (inReach || gap < 80 * ui) return

    const dirX = dx / gap
    const dirY = dy / gap
    const perpX = -dirY
    const perpY = dirX
    const bob = Math.sin(time * 0.006) * 3 * ui
    const start = 34 * ui
    const tipDistance = 64 * ui + bob
    const head = 11 * ui
    const backDistance = tipDistance - head
    const tipX = anchorX + dirX * tipDistance
    const tipY = anchorY + dirY * tipDistance
    const backX = anchorX + dirX * backDistance
    const backY = anchorY + dirY * backDistance
    const leftX = backX + perpX * head * 0.72
    const leftY = backY + perpY * head * 0.72
    const rightX = backX - perpX * head * 0.72
    const rightY = backY - perpY * head * 0.72
    const shaftStartX = anchorX + dirX * start
    const shaftStartY = anchorY + dirY * start
    const shaftEndX = anchorX + dirX * (backDistance + 2 * ui)
    const shaftEndY = anchorY + dirY * (backDistance + 2 * ui)

    this.playerArrow.lineStyle(6 * ui, this.theme.panel, 0.9)
    this.playerArrow.lineBetween(shaftStartX, shaftStartY, shaftEndX, shaftEndY)
    this.playerArrow.lineStyle(3 * ui, this.theme.accent, 1)
    this.playerArrow.lineBetween(shaftStartX, shaftStartY, shaftEndX, shaftEndY)
    this.playerArrow.lineStyle(4 * ui, this.theme.panel, 0.9)
    this.playerArrow.strokeTriangle(tipX, tipY, leftX, leftY, rightX, rightY)
    this.playerArrow.fillStyle(this.theme.accent, 1)
    this.playerArrow.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY)
  }

  /**
   * While the tree fills its fruit slots the destination arrow is replaced by a
   * clock card beside the tree. The number is the remaining real seconds,
   * divided by the tutorial growth multiplier so it matches what the player
   * sees.
   */
  private drawWaitClock(marker: Vec2, waitMs: number, time: number, ui: number): void {
    const content = this.layout.content
    const width = 68 * ui
    const height = 32 * ui
    const gap = 18 * ui
    const placeRight = marker.x + gap + width / 2 <= content.x + content.w - 8 * ui
    const cx = clamp(
      placeRight ? marker.x + gap + width / 2 : marker.x - gap - width / 2,
      content.x + width / 2 + 6 * ui,
      content.x + content.w - width / 2 - 6 * ui,
    )
    const bob = Math.sin(time * 0.004) * 2 * ui
    const cy = clamp(
      marker.y + bob,
      content.y + height / 2 + 6 * ui,
      content.y + content.h - height / 2 - 6 * ui,
    )
    const left = cx - width / 2
    const top = cy - height / 2

    this.waitClock.fillStyle(0x3b2f3a, 0.16)
    this.waitClock.fillRoundedRect(left, top + 3 * ui, width, height, 10 * ui)
    this.waitClock.fillStyle(this.theme.panel, 0.96)
    this.waitClock.fillRoundedRect(left, top, width, height, 10 * ui)
    this.waitClock.lineStyle(2 * ui, this.theme.accent, 0.75)
    this.waitClock.strokeRoundedRect(left, top, width, height, 10 * ui)

    const iconX = left + 16 * ui
    this.waitClock.fillStyle(this.theme.accent, 0.16)
    this.waitClock.fillCircle(iconX, cy, 9 * ui)
    this.waitClock.lineStyle(2 * ui, this.theme.accent, 1)
    this.waitClock.strokeCircle(iconX, cy, 9 * ui)
    this.waitClock.lineBetween(iconX, cy, iconX, cy - 5 * ui)
    this.waitClock.lineBetween(iconX, cy, iconX + 4 * ui, cy + 1.5 * ui)

    const seconds = Math.max(1, Math.ceil(waitMs / 1000))
    const label = `${seconds}s`
    if (label !== this.lastWaitText) {
      this.lastWaitText = label
      this.waitText.setText(label)
    }
    this.waitText.setPosition(cx + 9 * ui, cy).setVisible(true)
  }

  private drawArea(rect: Rect, pulse: number, ui: number): void {
    const radius = 8 * ui
    this.area.fillStyle(this.theme.accent, 0.1 + 0.05 * pulse)
    this.area.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, radius)
    // The cream underlay keeps the accent line legible on dark beds and on the
    // pale floor, where a single thin line disappears.
    this.area.lineStyle(5 * ui, this.theme.panel, 0.85)
    this.area.strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, radius)
    this.area.lineStyle(2.5 * ui, this.theme.accent, 0.85 + 0.15 * pulse)
    this.area.strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, radius)
  }

  private hide(): void {
    this.hidden = true
    this.setVisible(false)
  }
}

function screenRect(camera: WorldCamera, rect: Rect): Rect {
  const topLeft = worldToScreen(camera, { x: rect.x, y: rect.y })
  return {
    x: topLeft.x,
    y: topLeft.y,
    w: rect.w * camera.scale,
    h: rect.h * camera.scale,
  }
}

/**
 * A full downward arrow that lands on a pulsing ellipse. The old chevron read
 * as an unrelated "V"; the shaft, large head and landing ring make "go here"
 * explicit while the small player-side arrow handles direction.
 */
function drawLandingArrow(
  g: Phaser.GameObjects.Graphics,
  x: number,
  tipY: number,
  alpha: number,
  time: number,
  theme: Theme,
  ui: number,
): void {
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.004)
  g.fillStyle(theme.accent, 0.16 * alpha)
  g.fillEllipse(x, tipY + 4 * ui, 28 * ui, 11 * ui)
  g.lineStyle(2.5 * ui, theme.accent, (0.55 + 0.35 * pulse) * alpha)
  g.strokeEllipse(x, tipY + 4 * ui, 28 * ui + 4 * pulse * ui, 11 * ui + 2 * pulse * ui)

  const bob = Math.sin(time * 0.005) * 3 * ui
  const tip = tipY + bob
  const headHeight = 15 * ui
  const headHalf = 11 * ui
  const shaftTop = tip - 48 * ui
  const shaftBottom = tip - headHeight

  g.lineStyle(10 * ui, theme.panel, 0.9 * alpha)
  g.lineBetween(x, shaftTop, x, shaftBottom)
  g.lineStyle(5.5 * ui, theme.accent, alpha)
  g.lineBetween(x, shaftTop, x, shaftBottom)
  g.fillStyle(theme.panel, 0.95 * alpha)
  g.fillTriangle(
    x,
    tip,
    x - headHalf - 3 * ui,
    tip - headHeight - 2 * ui,
    x + headHalf + 3 * ui,
    tip - headHeight - 2 * ui,
  )
  g.fillStyle(theme.accent, alpha)
  g.fillTriangle(x, tip, x - headHalf, tip - headHeight, x + headHalf, tip - headHeight)
}

/**
 * Draws a chevron whose tip is at (x, y), opening back along `angle`. A panel
 * stroke underneath keeps it readable over the night wash and bright floors.
 */
function drawChevron(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  angle: number,
  alpha: number,
  theme: Theme,
  size: number,
): void {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const backX = x - cos * size
  const backY = y - sin * size
  const spread = size * 0.82
  const leftX = backX + Math.cos(angle + Math.PI / 2) * spread
  const leftY = backY + Math.sin(angle + Math.PI / 2) * spread
  const rightX = backX + Math.cos(angle - Math.PI / 2) * spread
  const rightY = backY + Math.sin(angle - Math.PI / 2) * spread

  g.lineStyle(size * 0.48, theme.panel, 0.9 * alpha)
  g.lineBetween(x, y, leftX, leftY)
  g.lineBetween(x, y, rightX, rightY)
  g.lineStyle(size * 0.28, theme.accent, alpha)
  g.lineBetween(x, y, leftX, leftY)
  g.lineBetween(x, y, rightX, rightY)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
