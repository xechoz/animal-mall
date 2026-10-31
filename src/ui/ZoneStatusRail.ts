import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { ZONE_ORDER, ZONE_PRODUCTS, zoneOf } from '../logic/config'
import type { ProductKind, ShopState, ZoneId } from '../logic/types'
import type { GameLayout } from './layout'
import { productTextureKey } from './productArt'
import { ZONE_TINTS } from './shopArt'

interface ZoneRow {
  readonly zone: ZoneId
  readonly icon: Phaser.GameObjects.Image
  readonly count: Phaser.GameObjects.Text
  readonly warning: Phaser.GameObjects.Graphics
}

const ROW_HEIGHT = 40
const ROW_GAP = 5
const ROW_START = 184

/**
 * Compact at-a-glance zone overview under the mobile landscape HUD rail.
 * It mirrors the four floor zones left to right and shows lock state, ready
 * output and a hungry warning without adding more world-space text.
 */
export class ZoneStatusRail {
  private readonly theme: Theme
  private readonly warningColor: string
  private readonly chrome: Phaser.GameObjects.Graphics
  private readonly rows: readonly ZoneRow[]
  private layout: GameLayout
  private lastKey = ''

  constructor(scene: Phaser.Scene, layout: GameLayout, theme: Theme) {
    this.layout = layout
    this.theme = theme
    this.warningColor = Phaser.Display.Color.IntegerToColor(theme.danger).rgba
    this.chrome = scene.add.graphics().setDepth(6001)
    this.rows = ZONE_ORDER.map((zone) => {
      const icon = scene.add
        .image(0, 0, productTextureKey(ZONE_PRODUCTS[zone][0] as ProductKind))
        .setDepth(6002)
        .setScale(0.34)
      const count = scene.add
        .text(0, 0, '', textStyle(theme, 17, theme.text, true))
        .setOrigin(1, 0.5)
        .setDepth(6002)
      const warning = scene.add.graphics().setDepth(6002)
      return { zone, icon, count, warning }
    })
    this.relayout(layout)
  }

  relayout(layout: GameLayout): void {
    this.layout = layout
    const hud = layout.hud
    this.chrome.setVisible(hud.vertical)
    for (const row of this.rows) {
      row.icon.setVisible(hud.vertical)
      row.count.setVisible(hud.vertical)
      row.warning.setVisible(hud.vertical)
    }
    if (!hud.vertical) return

    const bar = hud.bar
    const left = bar.x + 10
    const width = bar.w - 20
    this.rows.forEach((row, index) => {
      const top = bar.y + ROW_START + index * (ROW_HEIGHT + ROW_GAP)
      row.icon.setPosition(left + 26, top + ROW_HEIGHT / 2)
      row.count.setPosition(left + width - 10, top + ROW_HEIGHT / 2)
    })
    this.lastKey = ''
  }

  update(state: ShopState): void {
    if (!this.layout.hud.vertical) return
    const zones = ZONE_ORDER.map((zone) => {
      const producers = state.producers.filter((producer) => zoneOf(producer.product) === zone)
      return {
        zone,
        locked: !state.zones[zone],
        ready: producers.reduce((sum, producer) => sum + producer.ready, 0),
        hungry: producers.some((producer) => producer.hungry),
      }
    })
    const key = zones
      .map((zone) => `${zone.zone}:${zone.locked}:${zone.ready}:${zone.hungry}`)
      .join('|')
    if (key === this.lastKey) return
    this.lastKey = key

    const bar = this.layout.hud.bar
    const left = bar.x + 10
    const width = bar.w - 20
    this.chrome.clear()
    zones.forEach((zone, index) => {
      const row = this.rows[index]
      if (row === undefined) return
      const top = bar.y + ROW_START + index * (ROW_HEIGHT + ROW_GAP)
      const tint = ZONE_TINTS[zone.zone]
      this.chrome.fillStyle(zone.locked ? 0x2f2433 : tint, zone.locked ? 0.06 : 0.11)
      this.chrome.fillRoundedRect(left, top, width, ROW_HEIGHT, 11)
      this.chrome.fillStyle(tint, zone.locked ? 0.25 : 0.8)
      this.chrome.fillRoundedRect(left + 6, top + 10, 4, ROW_HEIGHT - 20, 2)

      row.icon.setAlpha(zone.locked ? 0.25 : zone.ready > 0 ? 1 : 0.55)
      row.count
        .setText(zone.locked || zone.ready === 0 ? '' : String(zone.ready))
        .setColor(zone.hungry ? this.warningColor : this.theme.text)
      row.warning.clear()
      if (zone.hungry) {
        row.warning.fillStyle(this.theme.danger, 1)
        row.warning.fillCircle(left + 38, top + 9, 5)
        row.warning.lineStyle(2, this.theme.panel, 1)
        row.warning.strokeCircle(left + 38, top + 9, 5)
      }
      if (zone.locked) {
        drawSmallLock(this.chrome, left + width - 18, top + ROW_HEIGHT / 2)
      }
    })
  }
}

function drawSmallLock(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0xffd166, 1)
  g.fillRoundedRect(x - 7, y - 2, 14, 11, 3)
  g.lineStyle(2.5, 0xffd166, 1)
  g.beginPath()
  g.arc(x, y - 2, 5, Math.PI, Math.PI * 2)
  g.strokePath()
  g.fillStyle(0x2f2433, 1)
  g.fillCircle(x, y + 3, 1.8)
}
