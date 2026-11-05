import { mixColor, type Theme } from '@mg/core'
import Phaser from 'phaser'
import { distanceToRect } from '../logic/collision'
import { FISHING } from '../logic/config'
import { pondRect } from '../logic/fishing'
import type { ProducerState, ShopState, Vec2 } from '../logic/types'
import { productTextureKey } from './productArt'
import { GROUND_RING_SQUASH } from './propArt'

const RING_RADIUS = 46
const RING_WIDTH = 3
/** How long the caught fish stays in the air before it lands in the basket. */
const CATCH_FX_MS = 440
const ROD_SEGMENTS = 14

interface CatchFx {
  readonly startMs: number
  readonly from: Vec2
  readonly hand: Vec2
  readonly land: Vec2
  readonly facing: -1 | 1
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function easeOutCubic(value: number): number {
  const inverse = 1 - value
  return 1 - inverse * inverse * inverse
}

function quadraticPoint(from: Vec2, control: Vec2, to: Vec2, t: number): Vec2 {
  const inverse = 1 - t
  return {
    x: inverse * inverse * from.x + 2 * inverse * t * control.x + t * t * to.x,
    y: inverse * inverse * from.y + 2 * inverse * t * control.y + t * t * to.y,
  }
}

function quadraticPoints(from: Vec2, control: Vec2, to: Vec2, segments: number): Vec2[] {
  const points: Vec2[] = []
  for (let index = 0; index <= segments; index += 1) {
    points.push(quadraticPoint(from, control, to, index / segments))
  }
  return points
}

/** Phaser's strokePoints wants Vector2, so walk the sampled points ourselves. */
function strokePolyline(
  g: Phaser.GameObjects.Graphics,
  points: readonly Vec2[],
  color: number,
  alpha: number,
  width: number,
): void {
  g.lineStyle(width, color, alpha)
  for (let index = 0; index < points.length - 1; index += 1) {
    g.lineBetween(points[index].x, points[index].y, points[index + 1].x, points[index + 1].y)
  }
}

/**
 * Draws the fishing rod, line, bobber and ripples in world space. The logic
 * owns the fishing timers; this view only reads them. The catch lift is a short
 * cosmetic timer started by the scene's `fishCaught` event, so it still plays
 * when a full basket freezes the fishing state on the next tick.
 */
export class FishingView extends Phaser.GameObjects.Container {
  private readonly art: Phaser.GameObjects.Graphics
  private readonly fish: Phaser.GameObjects.Image
  private readonly theme: Theme
  private catchFx: CatchFx | undefined

  constructor(scene: Phaser.Scene, theme: Theme) {
    super(scene, 0, 0)
    this.theme = theme
    this.art = scene.add.graphics()
    this.fish = scene.add.image(0, 0, productTextureKey('fish')).setVisible(false)
    this.add([this.art, this.fish])
    this.setDepth(4_800)
    scene.add.existing(this)
  }

  /** Started by the scene event, never writes back into the simulation. */
  playCatch(state: ShopState, pondId: number, time: number): void {
    const pond = state.producers.find((producer) => producer.id === pondId)
    if (pond === undefined) return
    const facing = pond.pos.x < state.player.pos.x ? -1 : 1
    const hand = this.handPoint(state, pond)
    this.catchFx = {
      startMs: time,
      from: { x: pond.pos.x + 6, y: pond.pos.y + 2 },
      hand,
      land: { x: hand.x + facing * 8, y: hand.y - 2 },
      facing,
    }
  }

  updateFishing(state: ShopState, time: number): void {
    const pond = state.producers.find((producer) => producer.product === 'fish')
    this.art.clear()
    this.fish.setVisible(false)
    if (pond === undefined) {
      this.catchFx = undefined
      return
    }

    const inRange = distanceToRect(state.player.pos, pondRect(pond)) <= FISHING.margin
    if (inRange) this.drawRing(pond)

    const catchFx = this.catchFx
    if (catchFx !== undefined) {
      const progress = (time - catchFx.startMs) / CATCH_FX_MS
      if (progress < 1) {
        this.drawCatch(catchFx, clamp01(progress), time)
        return
      }
      this.catchFx = undefined
    }

    const fishing = state.fishing
    if (fishing.pondId !== pond.id) return
    if (fishing.phase === 'rest') return

    const hand = this.handPoint(state, pond)
    if (fishing.phase === 'idle') {
      const ratio = Math.min(1, fishing.timerMs / FISHING.castMs)
      const spread = 0.18 + 0.82 * easeOutCubic(ratio)
      const aim = { x: pond.pos.x, y: pond.pos.y - 26 }
      const tip = this.drawRod(hand, aim, spread, 0.05)
      this.drawLine(tip, pond.pos, spread, false)
      if (fishing.timerMs <= 0 && inRange) this.drawBobberHint(pond, time)
      return
    }

    const ratio = Math.min(1, fishing.timerMs / FISHING.catchMs)
    const bite = ratio > 0.72 ? clamp01((ratio - 0.72) / 0.28) : 0
    const jiggle = bite > 0 ? Math.sin(time * 0.08) * 1.6 * bite : 0
    const bobber = {
      x: pond.pos.x + 6,
      y: pond.pos.y + 2 + bite * 7 + jiggle,
    }
    const aim = { x: bobber.x, y: bobber.y - 26 }
    const tip = this.drawRod(hand, aim, 1, 0.12 + bite * 0.75)
    this.drawLine(tip, bobber, 1, true)
    this.drawRipples(bobber, time, ratio, bite)
    this.drawBobber(bobber, bite)
  }

  private handPoint(state: ShopState, pond: ProducerState): Vec2 {
    const player = state.player
    const facing = pond.pos.x < player.pos.x ? -1 : 1
    // The bear's front paw carries goods, so the rod sits in the same hand.
    return {
      x: player.pos.x + facing * 22,
      y: player.pos.y - 15,
    }
  }

  /** Faint ring while the player is close enough to fish. */
  private drawRing(pond: ProducerState): void {
    this.art.lineStyle(RING_WIDTH, 0x3b2f3a, 0.12)
    this.art.strokeEllipse(
      pond.pos.x,
      pond.pos.y,
      RING_RADIUS * 2,
      RING_RADIUS * 2 * GROUND_RING_SQUASH,
    )
  }

  /** Small floating bobber hint before the line goes out. */
  private drawBobberHint(pond: ProducerState, time: number): void {
    const bob = Math.sin(time * 0.006) * 2
    this.art.fillStyle(0xffffff, 0.35)
    this.art.fillCircle(pond.pos.x, pond.pos.y - 22 + bob, 3)
    this.art.fillStyle(this.theme.accentAlt, 0.75)
    this.art.fillRoundedRect(pond.pos.x - 2, pond.pos.y - 16 + bob, 4, 7, 2)
  }

  /**
   * A tapered quadratic arc from the grip to the tip. `bend` pulls the tip
   * toward the water and deepens the bow when a fish is on the line.
   */
  private drawRod(hand: Vec2, aim: Vec2, spread: number, bend: number): Vec2 {
    const dx = aim.x - hand.x
    const dy = aim.y - hand.y
    const distance = Math.max(1, Math.hypot(dx, dy))
    const tip = {
      x: hand.x + dx * 0.9 * spread,
      y: hand.y + dy * 0.9 * spread - 6 + bend * 10,
    }

    let normalX = -dy
    let normalY = dx
    if (normalY > 0) {
      normalX = -normalX
      normalY = -normalY
    }
    const normalLength = Math.max(1, Math.hypot(normalX, normalY))
    const chord = Math.hypot(tip.x - hand.x, tip.y - hand.y)
    const bow = chord * (0.24 + bend * 0.16)
    const control = {
      x: (hand.x + tip.x) / 2 + (normalX / normalLength) * bow,
      y: (hand.y + tip.y) / 2 + (normalY / normalLength) * bow,
    }

    const points = quadraticPoints(hand, control, tip, ROD_SEGMENTS)
    for (let index = 0; index < points.length - 1; index += 1) {
      const taper = index / (points.length - 2)
      this.art.lineStyle(4.4 - 2.6 * taper, 0x8f5734, 1)
      this.art.lineBetween(
        points[index].x,
        points[index].y,
        points[index + 1].x,
        points[index + 1].y,
      )
    }

    // Cork grip extends a little behind the hand so the rod reads as held.
    const gripX = hand.x - (dx / distance) * 9
    const gripY = hand.y - (dy / distance) * 9
    strokePolyline(this.art, [{ x: gripX, y: gripY }, ...points.slice(0, 3)], 0x6b4527, 1, 5.5)
    const reelX = hand.x + (normalX / normalLength) * 6
    const reelY = hand.y + (normalY / normalLength) * 6
    this.art.fillStyle(0x5a3a22, 1)
    this.art.fillCircle(reelX, reelY, 3.2)
    this.art.fillStyle(0xd9b25a, 0.9)
    this.art.fillCircle(reelX, reelY, 1.4)

    return tip
  }

  /** The line extends with the cast and hangs slack until the bite pulls it taut. */
  private drawLine(from: Vec2, to: Vec2, spread: number, taut: boolean): void {
    const reach = taut ? 1 : clamp01((spread - 0.25) / 0.75)
    if (reach <= 0.02) return
    const end = {
      x: from.x + (to.x - from.x) * reach,
      y: from.y + (to.y - from.y) * reach,
    }
    const sag = taut ? 0 : 6 * (1 - spread)
    const control = {
      x: (from.x + end.x) / 2,
      y: (from.y + end.y) / 2 + sag,
    }
    strokePolyline(this.art, quadraticPoints(from, control, end, 8), 0xfff7e8, 0.85, 1.4)
  }

  private drawRipples(bobber: Vec2, time: number, ratio: number, bite: number): void {
    for (let index = 0; index < 3; index += 1) {
      const phase = (time * 0.0016 + index * 0.33) % 1
      const radius = 7 + phase * 22
      this.art.lineStyle(1.5, 0xffffff, 0.38 * (1 - phase) * (0.7 + ratio * 0.3))
      this.art.strokeEllipse(bobber.x, bobber.y + 4, radius * 1.7, radius * 0.7)
    }
    if (bite > 0) {
      this.art.fillStyle(0xffffff, 0.35 * bite)
      this.art.fillEllipse(bobber.x, bobber.y + 6, 30 + bite * 10, 10 + bite * 4)
    }
  }

  private drawBobber(bobber: Vec2, bite: number): void {
    this.art.fillStyle(0x3b2f3a, 0.18)
    this.art.fillEllipse(bobber.x, bobber.y + 7, 14, 4)
    this.art.fillStyle(mixColor(0xffffff, this.theme.accent, 0.55), 1)
    this.art.fillRoundedRect(bobber.x - 3, bobber.y - 6 + bite, 6, 11, 3)
    this.art.fillStyle(0xffffff, 0.85)
    this.art.fillCircle(bobber.x, bobber.y - 8 + bite, 2.4)
  }

  /**
   * The fish leaps out of the pond, the rod snaps up and the catch arcs into
   * the player's hand instead of sliding across the water surface.
   */
  private drawCatch(fx: CatchFx, progress: number, time: number): void {
    const riseEnd = 0.32
    const flyEnd = 0.84
    const lifted = { x: fx.from.x, y: fx.from.y - 54 }

    let fish: Vec2
    if (progress < riseEnd) {
      const rise = easeOutCubic(progress / riseEnd)
      fish = {
        x: fx.from.x + fx.facing * 3 * rise,
        y: fx.from.y - 54 * rise,
      }
    } else {
      const fly = easeOutCubic(clamp01((progress - riseEnd) / (flyEnd - riseEnd)))
      const control = {
        x: (lifted.x + fx.land.x) / 2,
        y: Math.min(lifted.y, fx.land.y) - 30,
      }
      fish = quadraticPoint(lifted, control, fx.land, fly)
    }

    const fade = progress > 0.86 ? 1 - (progress - 0.86) / 0.14 : 1
    const scale =
      0.62 + 0.46 * clamp01(progress / 0.26) - 0.52 * clamp01((progress - riseEnd) / (1 - riseEnd))
    const wiggle = Math.sin(time * 0.035) * 0.18
    this.fish
      .setVisible(true)
      .setPosition(fish.x, fish.y)
      .setRotation(-0.7 * Math.sin(Math.PI * clamp01(progress / 0.6)) + wiggle - 0.15)
      .setScale(scale)
      .setAlpha(clamp01(fade))

    const liftedAim = { x: fx.hand.x + fx.facing * 30, y: fx.hand.y - 52 }
    const bend = 0.35 + 0.45 * (1 - clamp01(progress / 0.55))
    const tip = this.drawRod(fx.hand, liftedAim, 0.85, bend)
    this.drawLine(tip, fish, 1, true)
    this.drawSplash(fx.from, progress)
  }

  private drawSplash(from: Vec2, progress: number): void {
    if (progress > 0.4) return
    const splash = clamp01(progress / 0.4)
    for (let index = 0; index < 6; index += 1) {
      const angle = -Math.PI / 2 + (index - 2.5) * 0.32
      const radius = 10 + 24 * easeOutCubic(splash)
      const x = from.x + Math.cos(angle) * radius
      const y = from.y + Math.sin(angle) * radius * 0.55 + 16 * splash * splash
      this.art.fillStyle(0xeaf9ff, 0.9 * (1 - splash))
      this.art.fillCircle(x, y, 2.2)
    }
    const ripple = clamp01(progress / 0.26)
    this.art.lineStyle(2, 0xffffff, 0.45 * (1 - ripple))
    this.art.strokeEllipse(from.x, from.y + 4, 26 + ripple * 46, 9 + ripple * 16)
  }
}
