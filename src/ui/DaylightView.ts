import Phaser from 'phaser'
import { DAY } from '../logic/config'
import { dayPhase, dayProgress } from '../logic/day'
import type { DayState } from '../logic/types'
import type { GameLayout } from './layout'
import { type WorldCamera, worldToScreen } from './worldCamera'

interface Lighting {
  readonly tint: number
  readonly alpha: number
  readonly glow: number
}

const DAYLIGHT: Readonly<Record<'dawn' | 'day' | 'dusk' | 'night' | 'closing', Lighting>> = {
  dawn: { tint: 0xffc27a, alpha: 0.12, glow: 0 },
  day: { tint: 0xffffff, alpha: 0, glow: 0 },
  dusk: { tint: 0xff9a5c, alpha: 0.16, glow: 0.12 },
  night: { tint: 0x1b2b4a, alpha: 0.28, glow: 0.5 },
  closing: { tint: 0x1b2b4a, alpha: 0.32, glow: 0.4 },
}

/**
 * Screen-space time-of-day wash. The tint sits above every world object but
 * below the HUD, tutorial arrows and map offers, so a dark evening never costs
 * readability. The warm pool keeps the shop lit while the forest goes dark.
 */
export class DaylightView {
  private readonly tint: Phaser.GameObjects.Rectangle
  private readonly glow: Phaser.GameObjects.Graphics
  private layout: GameLayout

  constructor(scene: Phaser.Scene, layout: GameLayout) {
    this.layout = layout
    this.tint = scene.add
      .rectangle(0, 0, layout.width, layout.height, 0xffffff, 0)
      .setOrigin(0)
      .setDepth(3900)
    this.glow = scene.add.graphics().setDepth(3901).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0)
    this.drawGlow()
  }

  relayout(layout: GameLayout): void {
    this.layout = layout
    this.tint.setSize(layout.width, layout.height)
    this.drawGlow()
  }

  update(day: DayState, camera: WorldCamera): void {
    const phase = dayPhase(day.ms)
    const lighting = DAYLIGHT[phase]
    const local = phaseProgress(day.ms)
    const alpha =
      phase === 'dawn'
        ? lighting.alpha * local
        : phase === 'dusk'
          ? lighting.alpha * local
          : lighting.alpha
    const glow = phase === 'dusk' ? lighting.glow * local : lighting.glow

    this.tint.setFillStyle(lighting.tint, alpha)
    this.glow.setAlpha(glow)
    if (glow <= 0) return

    const center = worldToScreen(camera, {
      x: this.layout.map.room.w / 2,
      y: this.layout.map.room.h / 2,
    })
    const width = this.layout.map.room.w * camera.scale
    const height = this.layout.map.room.h * camera.scale
    this.glow.setPosition(center.x, center.y).setScale((width * 1.25) / 200, (height * 1.25) / 200)
  }

  destroy(): void {
    this.tint.destroy()
    this.glow.destroy()
  }

  /** Binary layout: the pool is a set of soft ellipses scaled to the room. */
  private drawGlow(): void {
    const g = this.glow
    g.clear()
    g.fillStyle(0xffc77a, 0.08)
    g.fillEllipse(0, 0, 200, 200)
    g.fillStyle(0xffc77a, 0.1)
    g.fillEllipse(0, 0, 150, 150)
    g.fillStyle(0xffd79a, 0.12)
    g.fillEllipse(0, 0, 100, 100)
    g.fillStyle(0xffe3b8, 0.14)
    g.fillEllipse(0, 0, 56, 56)
  }
}

/** How far through the current phase we are, used to fade dawn and dusk. */
function phaseProgress(ms: number): number {
  const phase = dayPhase(ms)
  if (phase === 'dawn') return Math.max(0, 1 - ms / DAY.dawnEndMs)
  if (phase === 'dusk') {
    return Math.max(0, Math.min(1, (ms - DAY.duskStartMs) / (DAY.nightStartMs - DAY.duskStartMs)))
  }
  return dayProgress(ms)
}
