import { type I18n, type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { ZONE_ORDER } from '../logic/config'
import type { Vec2, ZoneId } from '../logic/types'
import { drawTagFrame } from './frames'
import type { GameLayout } from './layout'
import { ZONE_TINTS } from './shopArt'
import { type WorldCamera, worldToScreen } from './worldCamera'

interface ZoneTag {
  readonly container: Phaser.GameObjects.Container
  readonly width: number
  readonly height: number
}

/**
 * Screen-space zone captions. The map itself is larger than a phone viewport,
 * so labels baked into the world can slide under the screen edge. This overlay
 * keeps the same anchors but clamps them to the visible content rectangle.
 */
export class ZoneLabels {
  private readonly scene: Phaser.Scene
  private readonly camera: WorldCamera
  private readonly theme: Theme
  private readonly i18n: I18n
  private readonly root: Phaser.GameObjects.Container
  private readonly tags = new Map<ZoneId, ZoneTag>()
  private layout: GameLayout

  constructor(
    scene: Phaser.Scene,
    layout: GameLayout,
    camera: WorldCamera,
    theme: Theme,
    i18n: I18n,
  ) {
    this.scene = scene
    this.layout = layout
    this.camera = camera
    this.theme = theme
    this.i18n = i18n
    this.root = scene.add.container(0, 0).setDepth(3950)
    this.build()
  }

  relayout(layout: GameLayout): void {
    this.layout = layout
    this.build()
  }

  update(): void {
    const content = this.layout.content
    const ui = this.layout.ui
    const margin = 80 * ui
    for (const zone of ZONE_ORDER) {
      const tag = this.tags.get(zone)
      if (tag === undefined) continue
      const screen = worldToScreen(this.camera, this.anchor(zone))
      if (
        screen.x < content.x - margin ||
        screen.x > content.x + content.w + margin ||
        screen.y < content.y - margin ||
        screen.y > content.y + content.h + margin
      ) {
        tag.container.setVisible(false)
        continue
      }
      const halfW = tag.width / 2
      const halfH = tag.height / 2
      const x = Phaser.Math.Clamp(
        screen.x,
        content.x + halfW + 6 * ui,
        content.x + content.w - halfW - 6 * ui,
      )
      const y = Phaser.Math.Clamp(
        screen.y,
        content.y + halfH + 6 * ui,
        content.y + content.h - halfH - 6 * ui,
      )
      tag.container.setPosition(x, y).setVisible(true)
    }
  }

  destroy(): void {
    this.root.destroy(true)
    this.tags.clear()
  }

  private build(): void {
    this.root.removeAll(true)
    this.tags.clear()
    const ui = this.layout.ui
    const fontSize = this.layout.text.label
    for (const zone of ZONE_ORDER) {
      const text = this.scene.add
        .text(
          0,
          0,
          this.i18n.t(`zone.${zone}`),
          textStyle(this.theme, fontSize, this.theme.text, true),
        )
        .setOrigin(0.5)
      const width = text.width + 28 * ui
      const height = Math.max(24 * ui, text.height + 10 * ui)
      const background = this.scene.add.graphics()
      drawTagFrame(
        background,
        -width / 2,
        -height / 2,
        width,
        height,
        Math.min(10 * ui, height / 2),
      )
      background.fillStyle(ZONE_TINTS[zone], 0.95)
      background.fillCircle(-width / 2 + 9 * ui, 0, 3 * ui)
      const container = this.scene.add.container(0, 0)
      container.add([background, text])
      container.setVisible(false)
      this.root.add(container)
      this.tags.set(zone, { container, width, height })
    }
  }

  private anchor(zone: ZoneId): Vec2 {
    if (this.layout.portrait) {
      const area = this.layout.map.zoneAreas[zone]
      return { x: area.x + area.w / 2, y: area.y - 14 }
    }
    const shelf = this.layout.map.shelves[zone]
    return { x: shelf.x + shelf.w / 2, y: shelf.y + shelf.h + 15 }
  }
}
