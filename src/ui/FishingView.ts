import { mixColor, type Theme } from '@mg/core'
import Phaser from 'phaser'
import { FISHING } from '../logic/config'
import type { ProducerState, ShopState } from '../logic/types'

/**
 * Draws the fishing rod, line, bobber and ripples in world space. The logic
 * owns the timers; this view only reads them.
 */
export class FishingView extends Phaser.GameObjects.Container {
  private readonly art: Phaser.GameObjects.Graphics
  private readonly theme: Theme

  constructor(scene: Phaser.Scene, theme: Theme) {
    super(scene, 0, 0)
    this.theme = theme
    this.art = scene.add.graphics()
    this.add(this.art)
    this.setDepth(4_800)
    scene.add.existing(this)
  }

  updateFishing(state: ShopState, time: number): void {
    const pond = state.producers.find((producer) => producer.product === 'fish')
    const fishing = state.fishing
    this.art.clear()
    if (pond === undefined || fishing.pondId !== pond.id) return
    if (fishing.phase === 'idle' && fishing.timerMs <= 0) return

    const hand = this.handPoint(state, pond)
    if (fishing.phase === 'idle') {
      this.drawRod(hand, pond.pos, 0.35)
      return
    }

    const ratio = Math.min(1, fishing.timerMs / FISHING.catchMs)
    const bite = ratio > 0.78 ? Math.sin(time * 0.04) * 3 : 0
    const bobber = {
      x: pond.pos.x + 6,
      y: pond.pos.y + 2 + bite,
    }
    this.drawRod(hand, bobber, 1)
    this.drawRipples(bobber, time, ratio)
    this.drawBobber(bobber, bite)
  }

  private handPoint(state: ShopState, pond: ProducerState) {
    const player = state.player
    const facing = pond.pos.x < player.pos.x ? -1 : 1
    return {
      x: player.pos.x + facing * 16,
      y: player.pos.y - 34,
    }
  }

  private drawRod(
    hand: { x: number; y: number },
    target: { x: number; y: number },
    progress: number,
  ): void {
    const tip = {
      x: hand.x + (target.x - hand.x) * 0.55 * progress,
      y: hand.y + (target.y - hand.y) * 0.55 * progress - 18,
    }
    this.art.lineStyle(4, 0x8f5734, 1)
    this.art.lineBetween(hand.x, hand.y, tip.x, tip.y)
    this.art.lineStyle(1.6, 0xfff7e8, 0.9)
    this.art.lineBetween(tip.x, tip.y, target.x, target.y)
  }

  private drawRipples(bobber: { x: number; y: number }, time: number, ratio: number): void {
    for (let index = 0; index < 3; index += 1) {
      const phase = (time * 0.0016 + index * 0.33) % 1
      const radius = 7 + phase * 22
      this.art.lineStyle(1.5, 0xffffff, 0.38 * (1 - phase))
      this.art.strokeEllipse(bobber.x, bobber.y + 4, radius * 1.7, radius * 0.7)
    }
    if (ratio > 0.78) {
      this.art.fillStyle(0xffffff, 0.35)
      this.art.fillEllipse(bobber.x, bobber.y + 5, 30, 10)
    }
  }

  private drawBobber(bobber: { x: number; y: number }, bite: number): void {
    this.art.fillStyle(0x3b2f3a, 0.18)
    this.art.fillEllipse(bobber.x, bobber.y + 7, 14, 4)
    this.art.fillStyle(mixColor(0xffffff, this.theme.accent, 0.55), 1)
    this.art.fillRoundedRect(bobber.x - 3, bobber.y - 6 + bite, 6, 11, 3)
    this.art.fillStyle(0xffffff, 0.85)
    this.art.fillCircle(bobber.x, bobber.y - 8 + bite, 2.4)
  }
}
