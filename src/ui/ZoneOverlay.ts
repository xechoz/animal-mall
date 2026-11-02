import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import { gameColors } from '../colors'
import { distanceToRect } from '../logic/collision'
import { ZONE_ORDER, ZONES } from '../logic/config'
import type { ShopMap, ShopState, Vec2, ZoneId } from '../logic/types'
import { bakeLayer } from './bakeArt'
import { fillPolygon, strokePolygon, zonePatchPoints } from './forestArt'
import { drawTagFrame } from './frames'

/** The name only surfaces once the player is close enough to buy the zone. */
const NAME_RANGE = 260
const NAME_FADE = 80

interface ZoneTag {
  readonly name: Phaser.GameObjects.Text
  readonly price: Phaser.GameObjects.Text
}

/**
 * Dims locked zones and shows what they cost. It lives inside the world
 * container, so it follows the room scale, sits under the daylight overlay and
 * needs no screen-space clamping. The zone name is the only world caption in
 * the game and is reserved for locked zones: once a zone opens, the beds, pens
 * and stations identify it, and the shop panel is where names are read.
 */
export class ZoneOverlay extends Phaser.GameObjects.Container {
  private readonly map: ShopMap
  private readonly textScale: number
  private readonly graphics: Phaser.GameObjects.Graphics
  private image?: Phaser.GameObjects.Image
  private readonly tags = new Map<ZoneId, ZoneTag>()
  private lastKey = ''

  constructor(
    scene: Phaser.Scene,
    theme: Theme,
    map: ShopMap,
    labels: Readonly<Record<ZoneId, string>>,
    textScale: number,
  ) {
    super(scene, 0, 0)
    this.map = map
    this.textScale = textScale
    this.graphics = scene.add.graphics()
    this.add(this.graphics)

    for (const zone of ZONE_ORDER) {
      const name = scene.add
        .text(0, 0, labels[zone], {
          ...textStyle(theme, 22 * textScale, '#fff7e8', true),
          // A soft halo keeps the caption readable on the dimmed patch without
          // the thick outline that turns dense CJK glyphs into blobs.
          shadow: {
            offsetX: 0,
            offsetY: 2,
            color: 'rgba(26, 18, 12, 0.55)',
            blur: 4,
            fill: true,
          },
        })
        .setOrigin(0.5)
        .setVisible(false)
      const price = scene.add
        .text(0, 0, '', textStyle(theme, 20 * textScale, theme.text, true))
        .setOrigin(0.5)
        .setVisible(false)
      this.tags.set(zone, { name, price })
      this.add([name, price])
    }

    scene.add.existing(this)
  }

  updateZones(state: ShopState, bakeScale: number): void {
    const key = `${this.map.id}|${ZONE_ORDER.map((zone) => `${zone}:${state.zones[zone]}`).join('|')}`
    if (key === this.lastKey) return
    this.lastKey = key

    this.graphics.clear()
    for (const zone of ZONE_ORDER) {
      const tag = this.tags.get(zone)
      if (tag === undefined) continue
      tag.name.setVisible(!state.zones[zone])
      tag.price.setVisible(false)
      if (state.zones[zone]) continue

      const area = this.map.zoneAreas[zone]
      const centerX = area.x + area.w / 2
      // Landscape has no lock on the shelf, so the zone centre carries the whole
      // plaque. Portrait already locks the shelf itself, so the name and price
      // hang just under it instead of repeating a second lock mid-zone.
      const landscape = this.map.id === 'landscape'
      const shelf = this.map.shelves[zone]
      const anchorY = landscape ? area.y + area.h / 2 : shelf.y + shelf.h
      const nameY = anchorY + (landscape ? -46 : 26) * this.textScale
      const priceY = anchorY + (landscape ? 48 : 62) * this.textScale

      const patch = zonePatchPoints(area)
      fillPolygon(this.graphics, patch, gameColors.canopy, 0.4)
      strokePolygon(this.graphics, patch, gameColors.mossDark, 0.85, 2)
      patch.forEach((point, index) => {
        if (index % 3 !== 0) return
        this.graphics.fillStyle(gameColors.moss, 0.65)
        this.graphics.fillEllipse(point.x, point.y, 6, 3)
      })
      if (landscape) drawLock(this.graphics, centerX, anchorY)
      tag.name.setPosition(centerX, nameY)

      const cost = ZONES[zone].unlockCost
      if (cost <= 0) continue
      tag.price.setText(String(cost)).setVisible(true)
      const tagWidth = Math.max(54 * this.textScale, tag.price.width + 42 * this.textScale)
      const tagHeight = 26 * this.textScale
      drawTagFrame(
        this.graphics,
        centerX - tagWidth / 2,
        priceY - tagHeight / 2,
        tagWidth,
        tagHeight,
      )
      tag.price.setPosition(centerX + 4 * this.textScale, priceY)
      this.graphics.fillStyle(gameColors.sunbeam, 1)
      this.graphics.fillCircle(centerX - tag.price.width / 2 - 11 * this.textScale, priceY, 6)
    }

    // Unlock dimming only changes when a zone opens, so bake the painted layer
    // instead of keeping ~3k commands live for the whole run.
    const bounds = zoneBounds(this.map)
    this.image?.destroy()
    this.image = bakeLayer(
      this.scene,
      this.graphics,
      'zone-overlay',
      { x: bounds.x, y: bounds.y },
      bounds.w,
      bounds.h,
      bakeScale,
    )
    this.addAt(this.image, 0)
  }

  /**
   * Proximity advertises, it does not shout: the name fades in as the player
   * walks up to a locked zone and fades out again when they leave. The lock and
   * price stay put so the zone is still legible from across the room.
   */
  updateFocus(pos: Vec2): void {
    for (const zone of ZONE_ORDER) {
      const tag = this.tags.get(zone)
      if (tag === undefined || !tag.name.visible) continue
      const gap = distanceToRect(pos, this.map.zoneAreas[zone])
      tag.name.setAlpha(Math.min(1, Math.max(0, (NAME_RANGE - gap) / NAME_FADE)))
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

/** Union of the four zone rectangles, padded for the wobbly patch edge. */
function zoneBounds(map: ShopMap): { x: number; y: number; w: number; h: number } {
  const areas = ZONE_ORDER.map((zone) => map.zoneAreas[zone])
  const minX = Math.min(...areas.map((area) => area.x))
  const minY = Math.min(...areas.map((area) => area.y))
  const maxX = Math.max(...areas.map((area) => area.x + area.w))
  const maxY = Math.max(...areas.map((area) => area.y + area.h))
  const pad = 16
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
}
