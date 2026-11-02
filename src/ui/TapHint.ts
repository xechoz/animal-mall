import type { Theme } from '@mg/core'
import type Phaser from 'phaser'

/** Fingertip position in the source artwork, normalised. */
const HAND_ORIGIN_X = 0.22
const HAND_ORIGIN_Y = 0.15
const HAND_SIZE = 46
const RIPPLE_MS = 1_100

/**
 * Reusable tap cue: the CC0 pointing hand plus a looping ripple. It is used by
 * the crop chooser, where a real tap is required; the world guide deliberately
 * has no hand because standing still opens the chooser by itself.
 */
export class TapHint {
  private readonly theme: Theme
  private readonly ui: number
  private readonly hand: Phaser.GameObjects.Image
  private readonly ripple: Phaser.GameObjects.Graphics
  private x = 0
  private y = 0

  constructor(scene: Phaser.Scene, theme: Theme, ui: number) {
    this.theme = theme
    this.ui = ui
    this.ripple = scene.add.graphics()
    this.hand = scene.add
      .image(0, 0, 'tutorial-hand')
      .setOrigin(HAND_ORIGIN_X, HAND_ORIGIN_Y)
      .setRotation(-Math.PI / 2)
      .setDisplaySize(HAND_SIZE * ui, HAND_SIZE * ui)
  }

  setPosition(x: number, y: number): void {
    this.x = x
    this.y = y
    this.hand.setPosition(x, y)
  }

  /** Adds the ripple first so the hand stays on top of its own pulse. */
  addTo(container: Phaser.GameObjects.Container): void {
    container.add(this.ripple)
    container.add(this.hand)
  }

  update(time: number): void {
    const ui = this.ui
    const bob = Math.sin(time * 0.006) * 3 * ui
    const x = this.x
    const y = this.y + bob
    this.hand.setPosition(x, y)

    this.ripple.clear()
    const phase = (time % RIPPLE_MS) / RIPPLE_MS
    for (let ring = 0; ring < 2; ring += 1) {
      const progress = (phase + ring * 0.5) % 1
      this.ripple.lineStyle(2.5 * ui, this.theme.accent, (1 - progress) * 0.75)
      this.ripple.strokeCircle(x, y, (10 + progress * 38) * ui)
    }
    this.ripple.fillStyle(this.theme.accent, 0.9)
    this.ripple.fillCircle(x, y, 4 * ui)
  }
}
