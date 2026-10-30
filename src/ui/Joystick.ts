import Phaser from 'phaser'
import type { Vec2 } from '../logic/types'

const DEAD_ZONE = 0.14
const STEER_RADIUS = 68

/**
 * Invisible drag steering. A press on empty play-field space becomes the origin
 * of a virtual stick; dragging away from that point drives movement. Nothing is
 * drawn, so there is no floating stick art to chase with the thumb.
 */
export class Joystick {
  private readonly scene: Phaser.Scene
  private pointerId: number | null = null
  private activePointer: Phaser.Input.Pointer | null = null
  private basePoint: Vec2 = { x: 0, y: 0 }
  private vector: Vec2 = { x: 0, y: 0 }
  private enabled = true

  constructor(scene: Phaser.Scene) {
    this.scene = scene

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
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this)
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this)
    this.scene.input.off(Phaser.Input.Events.GAME_OUT, this.onGameOut, this)
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || this.pointerId !== null || !pointer.primaryDown) return
    if (this.scene.input.hitTestPointer(pointer).length > 0) return

    this.pointerId = pointer.id
    this.activePointer = pointer
    this.basePoint = this.toWorld(pointer)
    this.vector = { x: 0, y: 0 }
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

  private toWorld(pointer: Phaser.Input.Pointer): Vec2 {
    const point = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
    return { x: point.x, y: point.y }
  }
}
