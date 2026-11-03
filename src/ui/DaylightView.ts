import Phaser from 'phaser'
import { DAY } from '../logic/config'
import type { DayState, ProducerState } from '../logic/types'
import { fenceLanterns } from './fenceLanterns'
import type { GameLayout } from './layout'
import { dayLighting } from './lighting'
import type { WorldCamera } from './worldCamera'

const WARM_DEPTH = 3900
const MULTIPLY_DEPTH = 3901
const VEIL_DEPTH = 3902
const LIGHT_DEPTH = 3904
const TEXTURE_SIZE = 512
const LIGHT_TEXTURE = 'daylight-soft-pool'
const VEIL_TEXTURE = 'daylight-night-veil'

interface LightSpec {
  readonly x: number
  readonly y: number
  readonly rx: number
  readonly ry: number
  readonly color: number
  readonly strength: number
  readonly flicker: number
  /** Kitchen slots only light up while a machine is installed there. */
  readonly slot: number | null
}

interface LightPool {
  readonly spec: LightSpec
  readonly image: Phaser.GameObjects.Image
}

/**
 * Screen-space time-of-day lighting. The grey night wash and its vignette sit
 * above every world object but below the HUD, tutorial arrows and map offers.
 * Practical lights are anchored to real lanterns, the vending machine, kitchen
 * stations and the till, so the evening reads as lit darkness instead of
 * coloured rings.
 */
export class DaylightView {
  private readonly scene: Phaser.Scene
  private readonly warm: Phaser.GameObjects.Rectangle
  private readonly multiply: Phaser.GameObjects.Rectangle
  private readonly veil: Phaser.GameObjects.Image
  private lights: LightPool[] = []
  private layout: GameLayout

  constructor(scene: Phaser.Scene, layout: GameLayout) {
    this.scene = scene
    this.layout = layout
    ensureSoftLightTexture(scene)
    ensureVeilTexture(scene)

    this.warm = scene.add
      .rectangle(0, 0, layout.width, layout.height, 0xffc27a, 1)
      .setOrigin(0)
      .setDepth(WARM_DEPTH)
      .setVisible(false)
    this.multiply = scene.add
      .rectangle(0, 0, layout.width, layout.height, 0x5f656d, 1)
      .setOrigin(0)
      .setDepth(MULTIPLY_DEPTH)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setVisible(false)
    this.veil = scene.add
      .image(0, 0, VEIL_TEXTURE)
      .setOrigin(0)
      .setDepth(VEIL_DEPTH)
      .setVisible(false)
    this.applyLayout(layout)
    this.buildLights()
  }

  relayout(layout: GameLayout): void {
    this.layout = layout
    this.applyLayout(layout)
    this.buildLights()
  }

  update(
    day: DayState,
    producers: readonly ProducerState[],
    camera: WorldCamera,
    time: number,
  ): void {
    const lighting = dayLighting(day.ms)
    const dawn = Math.max(0, Math.min(1, 1 - day.ms / DAY.dawnEndMs))
    const warm = Math.max(lighting.warm * 0.16, dawn * 0.1)
    this.warm.setVisible(warm > 0.002).setAlpha(warm)

    const night = lighting.night
    const dark = night > 0.002
    this.multiply.setVisible(dark).setAlpha(night * 0.95)
    this.veil.setVisible(dark).setAlpha(night)
    if (!dark) {
      for (const pool of this.lights) pool.image.setVisible(false)
      return
    }

    const activeSlots = new Set<number>()
    for (const producer of producers) {
      if (producer.kind === 'station') activeSlots.add(producer.slot)
    }

    for (const pool of this.lights) {
      const spec = pool.spec
      const active = spec.slot === null || activeSlots.has(spec.slot)
      const flicker =
        spec.flicker === 0 ? 1 : 1 + Math.sin(time * 0.0016 + spec.x * 0.05) * spec.flicker
      const alpha = active ? lighting.lights * spec.strength * flicker : 0
      if (alpha <= 0.003) {
        pool.image.setVisible(false)
        continue
      }
      pool.image
        .setVisible(true)
        .setPosition(camera.x + spec.x * camera.scale, camera.y + spec.y * camera.scale)
        .setDisplaySize(spec.rx * 2 * camera.scale, spec.ry * 2 * camera.scale)
        .setTint(spec.color)
        .setAlpha(alpha)
    }
  }

  destroy(): void {
    this.warm.destroy()
    this.multiply.destroy()
    this.veil.destroy()
    for (const pool of this.lights) pool.image.destroy()
    this.lights = []
  }

  private applyLayout(layout: GameLayout): void {
    this.warm.setSize(layout.width, layout.height)
    this.multiply.setSize(layout.width, layout.height)
    this.veil.setDisplaySize(layout.width, layout.height)
  }

  private buildLights(): void {
    for (const pool of this.lights) pool.image.destroy()
    const map = this.layout.map
    const specs: LightSpec[] = [
      {
        x: map.room.w * 0.15,
        y: 78,
        rx: 170,
        ry: 112,
        color: 0xffd9a8,
        strength: 0.8,
        flicker: 0.05,
        slot: null,
      },
      {
        x: map.room.w * 0.85,
        y: 78,
        rx: 170,
        ry: 112,
        color: 0xffd9a8,
        strength: 0.8,
        flicker: 0.05,
        slot: null,
      },
    ]

    for (const lamp of fenceLanterns(map)) {
      specs.push({
        x: lamp.x,
        y: lamp.y,
        rx: 110,
        ry: 75,
        color: 0xffd09a,
        strength: 0.6,
        flicker: 0.03,
        slot: null,
      })
    }

    const vending = map.facilities.vendingRect
    specs.push({
      x: vending.x + vending.w / 2,
      y: vending.y + vending.h + 4,
      rx: 120,
      ry: 88,
      color: 0xcdeee2,
      strength: 0.42,
      flicker: 0.01,
      slot: null,
    })

    for (const station of map.stationSlots) {
      specs.push({
        x: station.x,
        y: station.y + 8,
        rx: 98,
        ry: 70,
        color: 0xffc98a,
        strength: 0.48,
        flicker: 0.04,
        slot: station.index,
      })
    }

    specs.push({
      x: map.register.x,
      y: map.register.y + 8,
      rx: 80,
      ry: 55,
      color: 0xbfe8d8,
      strength: 0.27,
      flicker: 0.01,
      slot: null,
    })

    this.lights = specs.map((spec) => ({
      spec,
      image: this.scene.add
        .image(0, 0, LIGHT_TEXTURE)
        .setOrigin(0.5)
        .setDepth(LIGHT_DEPTH)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setVisible(false),
    }))
  }
}

function ensureSoftLightTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(LIGHT_TEXTURE)) return
  const texture = scene.textures.createCanvas(LIGHT_TEXTURE, TEXTURE_SIZE, TEXTURE_SIZE)
  if (texture === null) throw new Error(`Could not create ${LIGHT_TEXTURE}`)
  const ctx = texture.context
  const center = TEXTURE_SIZE / 2
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center)
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)')
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.5)')
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.2)')
  gradient.addColorStop(0.8, 'rgba(255,255,255,0.05)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
  texture.refresh()
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR)
}

function ensureVeilTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(VEIL_TEXTURE)) return
  const texture = scene.textures.createCanvas(VEIL_TEXTURE, TEXTURE_SIZE, TEXTURE_SIZE)
  if (texture === null) throw new Error(`Could not create ${VEIL_TEXTURE}`)
  const ctx = texture.context
  const center = TEXTURE_SIZE / 2
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center)
  gradient.addColorStop(0, 'rgba(38,40,44,0.16)')
  gradient.addColorStop(0.55, 'rgba(34,36,40,0.18)')
  gradient.addColorStop(0.8, 'rgba(22,24,28,0.42)')
  gradient.addColorStop(1, 'rgba(10,12,16,0.7)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
  texture.refresh()
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR)
}
