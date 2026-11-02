import type { Theme } from '@mg/core'
import Phaser from 'phaser'
import type { Vec2 } from '../logic/types'

const DEAD_ZONE = 0.14
const STEER_RADIUS = 68
const KNOB_RADIUS = 26
const VISUAL_DEPTH = 5900

/**
 * World tap targets that must not swallow a steering drag. Mark a hit zone
 * with this key so a touch on a bed, pen or price chip can still become the
 * origin of the virtual stick; real UI (HUD, modals) keeps blocking the stick.
 */
export const JOYSTICK_PASS = 'joystickPass'

/**
 * Drag steering. A press on empty play-field space becomes the origin of a
 * virtual stick; dragging away from that point drives movement. Touch presses
 * draw the stick under the finger, mouse drags stay invisible.
 */
export class Joystick {
  private readonly scene: Phaser.Scene
  private readonly theme: Theme
  private readonly art: Phaser.GameObjects.Graphics
  private pointerId: number | null = null
  private activePointer: Phaser.Input.Pointer | null = null
  private basePoint: Vec2 = { x: 0, y: 0 }
  private vector: Vec2 = { x: 0, y: 0 }
  private showArt = false
  private enabled = true

  constructor(scene: Phaser.Scene, theme: Theme) {
    this.scene = scene
    this.theme = theme
    this.art = scene.add.graphics().setDepth(VISUAL_DEPTH).setVisible(false)

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this)
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this)
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this)
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this)
    scene.input.on(Phaser.Input.Events.GAME_OUT, this.onGameOut, this)
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return
    this.enabled = enabled
    if (!enabled) this.reset()
  }

  getVector(): Vec2 {
    if (this.activePointer !== null && !this.activePointer.isDown) this.reset()
    return this.vector
  }

  reset(): void {
    this.pointerId = null
    this.activePointer = null
    this.vector = { x: 0, y: 0 }
    this.showArt = false
    this.art.setVisible(false)
  }

  destroy(): void {
    this.art.destroy()
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this)
    this.scene.input.off(Phaser.Input.Events.GAME_OUT, this.onGameOut, this)
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || this.pointerId !== null || !pointer.primaryDown) return
    const hits = this.scene.input.hitTestPointer(pointer)
    if (hits.some((hit) => hit.getData(JOYSTICK_PASS) !== true)) return

    this.pointerId = pointer.id
    this.activePointer = pointer
    this.basePoint = this.toWorld(pointer)
    this.vector = { x: 0, y: 0 }
    this.showArt = pointer.wasTouch
    if (this.showArt) this.drawStick(0, 0)
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || pointer.id !== this.pointerId) return
    if (!pointer.isDown) {
      this.reset()
      return
    }
    this.updateVector(pointer)
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return
    this.reset()
  }

  private onGameOut(): void {
    this.reset()
  }

  private updateVector(pointer: Phaser.Input.Pointer): void {
    const point = this.toWorld(pointer)
    const dx = point.x - this.basePoint.x
    const dy = point.y - this.basePoint.y
    const length = Math.hypot(dx, dy)
    if (this.showArt) this.drawStick(dx, dy, length)
    if (length < STEER_RADIUS * DEAD_ZONE) {
      this.vector = { x: 0, y: 0 }
      return
    }
    const clamped = Math.min(STEER_RADIUS, length)
    const strength = (clamped / STEER_RADIUS - DEAD_ZONE) / (1 - DEAD_ZONE)
    this.vector = {
      x: (dx / length) * strength,
      y: (dy / length) * strength,
    }
  }

  private drawStick(dx: number, dy: number, length = Math.hypot(dx, dy)): void {
    const { x, y } = this.basePoint
    const clamped = Math.min(STEER_RADIUS, length)
    const nx = length > 0 ? dx / length : 0
    const ny = length > 0 ? dy / length : 0
    const knobX = x + nx * clamped
    const knobY = y + ny * clamped

    this.art.clear()
    this.art.fillStyle(this.theme.ink, 0.1)
    this.art.fillCircle(x, y, STEER_RADIUS)
    this.art.lineStyle(3, this.theme.ink, 0.22)
    this.art.strokeCircle(x, y, STEER_RADIUS)
    this.art.fillStyle(this.theme.surface, 0.92)
    this.art.fillCircle(knobX, knobY, KNOB_RADIUS)
    this.art.lineStyle(3, this.theme.ink, 0.26)
    this.art.strokeCircle(knobX, knobY, KNOB_RADIUS)
    this.art.setVisible(true)
  }

  private toWorld(pointer: Phaser.Input.Pointer): Vec2 {
    const point = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
    return { x: point.x, y: point.y }
  }
}
