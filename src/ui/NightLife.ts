import Phaser from 'phaser'
import type { DayState, ShopMap, Vec2 } from '../logic/types'
import { type FenceLantern, fenceLanterns } from './fenceLanterns'
import { drawFirefly } from './forestArt'
import type { GameLayout } from './layout'
import { dayLighting } from './lighting'
import type { WorldCamera } from './worldCamera'

const LAMP_DEPTH = 3910
const CRITTER_DEPTH = 3911
const BAT_DEPTH = 3912
const BAT_CYCLE_SECONDS = 26
const BAT_FLIGHT_SHARE = 0.28

/**
 * Night-only wildlife drawn above the grey wash. Fireflies and moths would be
 * swallowed by the darkness layer if they stayed inside the world container,
 * so the glows are screen-space and follow the camera. They are decorative:
 * no input, collision or simulation state.
 */
export class NightLife {
  private readonly lampsArt: Phaser.GameObjects.Graphics
  private readonly critterArt: Phaser.GameObjects.Graphics
  private readonly batArt: Phaser.GameObjects.Graphics
  private layout: GameLayout
  private fireflies: readonly Vec2[] = []
  private moths: readonly Vec2[] = []
  private lanterns: readonly FenceLantern[] = []

  constructor(scene: Phaser.Scene, layout: GameLayout) {
    this.layout = layout
    this.lampsArt = scene.add
      .graphics()
      .setDepth(LAMP_DEPTH)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false)
    this.critterArt = scene.add
      .graphics()
      .setDepth(CRITTER_DEPTH)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false)
    this.batArt = scene.add.graphics().setDepth(BAT_DEPTH).setVisible(false)
    this.relayout(layout)
  }

  relayout(layout: GameLayout): void {
    this.layout = layout
    this.fireflies = fireflyAnchors(layout.map)
    this.lanterns = fenceLanterns(layout.map)
    this.moths = [
      { x: layout.map.room.w * 0.15, y: 52 },
      { x: layout.map.room.w * 0.85, y: 52 },
      ...this.lanterns
        .filter((lamp) => lamp.facing === 'bottom')
        .map((lamp) => ({ x: lamp.x, y: lamp.y })),
    ]
    this.hide()
  }

  update(day: DayState, camera: WorldCamera, time: number): void {
    const lighting = dayLighting(day.ms)
    if (lighting.night <= 0.02) {
      this.hide()
      return
    }

    const t = time * 0.001
    this.lampsArt.clear().setVisible(true).setAlpha(lighting.lights)
    this.critterArt.clear().setVisible(true).setAlpha(lighting.night)

    for (const lamp of this.lanterns) {
      const x = camera.x + lamp.x * camera.scale
      const y = camera.y + lamp.y * camera.scale
      const scale = lamp.scale * camera.scale
      this.lampsArt.fillStyle(0xffe8b0, 0.92)
      this.lampsArt.fillRoundedRect(x - 3 * scale, y - 5 * scale, 6 * scale, 10 * scale, 2 * scale)
      this.lampsArt.fillStyle(0xfff7d6, 0.8)
      this.lampsArt.fillCircle(x, y - scale, 2.2 * scale)
    }

    this.fireflies.forEach((anchor, index) => {
      const x = anchor.x + Math.sin(t * 0.7 + index * 1.9) * 16
      const y = anchor.y + Math.cos(t * 0.9 + index * 2.3) * 10
      drawFirefly(
        this.critterArt,
        camera.x + x * camera.scale,
        camera.y + y * camera.scale,
        t * 2.4 + index * 1.3,
      )
    })

    this.moths.forEach((anchor, index) => {
      const angle = t * 0.9 + index * 1.7
      const x = anchor.x + Math.cos(angle) * 18
      const y = anchor.y + Math.sin(angle * 1.3) * 10
      this.drawMoth(camera.x + x * camera.scale, camera.y + y * camera.scale, t + index)
    })

    this.drawBat(t, lighting.night)
  }

  destroy(): void {
    this.lampsArt.destroy()
    this.critterArt.destroy()
    this.batArt.destroy()
  }

  private drawMoth(x: number, y: number, phase: number): void {
    const flap = 0.6 + Math.abs(Math.sin(phase * 9)) * 0.4
    const g = this.critterArt
    g.fillStyle(0xfff1c9, 0.75)
    g.fillEllipse(x - 1.6, y, 3.2 * flap, 1.5)
    g.fillEllipse(x + 1.6, y, 3.2 * flap, 1.5)
    g.fillStyle(0xffffff, 0.9)
    g.fillCircle(x, y, 0.8)
  }

  /** A pale, low-contrast silhouette crossing the canopy every ~26 seconds. */
  private drawBat(t: number, night: number): void {
    const cycle = (t % BAT_CYCLE_SECONDS) / BAT_CYCLE_SECONDS
    if (night < 0.4 || cycle >= BAT_FLIGHT_SHARE) {
      this.batArt.setVisible(false)
      return
    }
    const progress = cycle / BAT_FLIGHT_SHARE
    const x = -70 + progress * (this.layout.width + 140)
    const y = this.layout.content.y + 16 + Math.sin(t * 2.1) * 6
    const flap = 0.55 + Math.abs(Math.sin(t * 7.5)) * 0.45
    const wing = 9 * flap

    this.batArt
      .clear()
      .setVisible(true)
      .setAlpha(night * 0.8)
      .fillStyle(0xc7cfd6, 0.55)
    this.batArt.fillEllipse(x, y, 5, 3)
    this.batArt.fillEllipse(x - 6, y, wing, 2.4)
    this.batArt.fillEllipse(x + 6, y, wing, 2.4)
  }

  private hide(): void {
    this.lampsArt.clear().setVisible(false)
    this.critterArt.clear().setVisible(false)
    this.batArt.clear().setVisible(false)
  }
}

/** Fireflies hug the zone edges and the forest margins around the shop. */
function fireflyAnchors(map: ShopMap): readonly Vec2[] {
  const { w, h } = map.room
  const fruit = map.zoneAreas.fruit
  const veg = map.zoneAreas.veg
  const farm = map.zoneAreas.farm
  return [
    { x: fruit.x + 28, y: fruit.y + 190 },
    { x: veg.x + veg.w - 30, y: veg.y + 210 },
    { x: farm.x + 34, y: farm.y + farm.h - 36 },
    { x: w * 0.44, y: h - 66 },
    { x: 44, y: h * 0.3 },
    { x: 44, y: h * 0.58 },
    { x: w - 44, y: h * 0.34 },
    { x: w - 44, y: h * 0.64 },
    { x: w * 0.2, y: h - 38 },
    { x: w * 0.5, y: h - 34 },
    { x: w * 0.8, y: h - 42 },
    { x: w * 0.3, y: 104 },
    { x: w * 0.7, y: 98 },
    { x: w * 0.55, y: h * 0.52 },
  ]
}
