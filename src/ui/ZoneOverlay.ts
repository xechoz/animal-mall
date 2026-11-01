import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { gameColors } from '../colors'
import { ZONE_ORDER, ZONES } from '../logic/config'
import type { ShopMap, ShopState, ZoneId } from '../logic/types'
import { fillPolygon, strokePolygon, zonePatchPoints } from './forestArt'
import { drawTagFrame } from './frames'

/**
 * Dims locked landscape zones and shows their unlock price. It lives inside the
 * world container, so it follows the room scale and stays under shelves and
 * characters.
 */
export class ZoneOverlay extends Phaser.GameObjects.Container {
  private readonly map: ShopMap
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly prices = new Map<ZoneId, Phaser.GameObjects.Text>()
  private lastKey = ''

  constructor(scene: Phaser.Scene, theme: Theme, map: ShopMap) {
    super(scene, 0, 0)
    this.map = map
    this.graphics = scene.add.graphics()
    this.add(this.graphics)

    for (const zone of ZONE_ORDER) {
      const price = scene.add
        .text(0, 0, '', textStyle(theme, 20, theme.text, true))
        .setOrigin(0.5)
        .setVisible(false)
      this.prices.set(zone, price)
      this.add(price)
    }

    scene.add.existing(this)
  }

  updateZones(state: ShopState): void {
    const key = `${this.map.id}|${ZONE_ORDER.map((zone) => `${zone}:${state.zones[zone]}`).join('|')}`
    if (key === this.lastKey) return
    this.lastKey = key

    this.graphics.clear()
    for (const zone of ZONE_ORDER) {
      const price = this.prices.get(zone)
      if (price === undefined) continue
      price.setVisible(false)
      if (this.map.id !== 'landscape' || state.zones[zone]) continue

      const area = this.map.zoneAreas[zone]
      const centerX = area.x + area.w / 2
      const lockY = area.y + 148
      const priceY = area.y + 198
      const patch = zonePatchPoints(area)
      fillPolygon(this.graphics, patch, gameColors.canopy, 0.4)
      strokePolygon(this.graphics, patch, gameColors.mossDark, 0.85, 2)
      patch.forEach((point, index) => {
        if (index % 3 !== 0) return
        this.graphics.fillStyle(gameColors.moss, 0.65)
        this.graphics.fillEllipse(point.x, point.y, 6, 3)
      })
      drawLock(this.graphics, centerX, lockY)

      const cost = ZONES[zone].unlockCost
      if (cost <= 0) continue
      price.setText(String(cost)).setVisible(true)
      const tagWidth = Math.max(54, price.width + 42)
      const tagHeight = 26
      drawTagFrame(
        this.graphics,
        centerX - tagWidth / 2,
        priceY - tagHeight / 2,
        tagWidth,
        tagHeight,
      )
      price.setPosition(centerX + 4, priceY)
      this.graphics.fillStyle(gameColors.sunbeam, 1)
      this.graphics.fillCircle(centerX - price.width / 2 - 11, priceY, 6)
    }
  }
}

function drawLock(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x2f2433, 0.16)
  g.fillRoundedRect(x - 17, y - 12, 34, 30, 6)
  g.fillStyle(0xffd166, 1)
  g.fillRoundedRect(x - 16, y - 10, 32, 26, 6)
  g.lineStyle(5, 0xffd166, 1)
  g.beginPath()
  g.arc(x, y - 10, 12, Math.PI, Math.PI * 2)
  g.strokePath()
  g.fillStyle(0x2f2433, 1)
  g.fillCircle(x, y + 2, 4)
  g.fillRect(x - 2, y + 2, 4, 8)
}
