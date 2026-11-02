import { type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import { INTERACTION } from '../logic/config'
import type { ShopMap } from '../logic/types'
import { bakeLayer } from './bakeArt'
import { drawDiningChair, drawDiningRug, drawDiningTable } from './diningArt'

/**
 * Draws one static prop into a texture. Everything here is baked because a live
 * Graphics costs the renderer its whole command buffer on every frame.
 */
function baked(
  scene: Phaser.Scene,
  graphics: Phaser.GameObjects.Graphics,
  key: string,
  rect: { readonly x: number; readonly y: number; readonly w: number; readonly h: number },
  pad: number,
  bakeScale: number,
): Phaser.GameObjects.Image {
  const origin = { x: rect.x - pad, y: rect.y - pad }
  const image = bakeLayer(
    scene,
    graphics,
    key,
    origin,
    rect.w + pad * 2,
    rect.h + pad * 2,
    bakeScale,
  )
  graphics.destroy()
  return image
}

function seatBounds(
  seats: readonly { readonly seat: { readonly x: number; readonly y: number } }[],
): { x: number; y: number; w: number; h: number } {
  const xs = seats.map((entry) => entry.seat.x)
  const ys = seats.map((entry) => entry.seat.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

/**
 * The dining table is split into a background layer (rug + chairs) and a table
 * layer so walkers above the table are drawn behind it while seated characters
 * always sit in front of their chairs.
 */
export class DiningView {
  private readonly rug: Phaser.GameObjects.Image
  private readonly chairs: Phaser.GameObjects.Image
  private readonly table: Phaser.GameObjects.Image
  private readonly label: Phaser.GameObjects.Text
  private readonly hits: readonly Phaser.GameObjects.Zone[]

  constructor(
    scene: Phaser.Scene,
    theme: Theme,
    map: ShopMap,
    label: string,
    textScale: number,
    bakeScale: number,
    onSeat: (seatIndex: number) => void,
  ) {
    const rugArt = scene.add.graphics()
    drawDiningRug(rugArt, map.dining.rug)
    this.rug = baked(scene, rugArt, `dining-rug-${map.id}`, map.dining.rug, 6, bakeScale).setDepth(
      1,
    )

    const chairArt = scene.add.graphics()
    for (const seat of map.dining.seats) drawDiningChair(chairArt, seat)
    this.chairs = baked(
      scene,
      chairArt,
      `dining-chairs-${map.id}`,
      seatBounds(map.dining.seats),
      20,
      bakeScale,
    ).setDepth(2)

    const tableArt = scene.add.graphics()
    drawDiningTable(tableArt, map.dining.table)
    this.table = baked(
      scene,
      tableArt,
      `dining-table-${map.id}`,
      map.dining.table,
      8,
      bakeScale,
    ).setDepth(map.dining.table.y + map.dining.table.h)

    this.label = scene.add
      .text(
        map.dining.table.x + map.dining.table.w / 2,
        Math.max(map.wall + 10, map.dining.rug.y - 12),
        label,
        textStyle(theme, 11 * Math.min(textScale, 1.25), theme.text, true),
      )
      .setOrigin(0.5)
      .setBackgroundColor('#fff7e8')
      .setPadding(5, 1, 5, 1)
      .setDepth(map.dining.table.y + map.dining.table.h + 1)

    this.hits = map.dining.seats.map((seat) => {
      const zone = scene.add
        .zone(seat.seat.x, seat.seat.y, 60, 40)
        .setDepth(5000)
        .setInteractive({ useHandCursor: true })
      let downX: number | undefined
      let downY: number | undefined
      zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        downX = pointer.x
        downY = pointer.y
      })
      zone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
        const startX = downX
        const startY = downY
        downX = undefined
        downY = undefined
        if (startX === undefined || startY === undefined) return
        if (Math.hypot(pointer.x - startX, pointer.y - startY) > INTERACTION.tapSlop) return
        onSeat(seat.index)
      })
      zone.on('pointerout', () => {
        downX = undefined
        downY = undefined
      })
      return zone
    })
  }

  addTo(world: Phaser.GameObjects.Container): void {
    world.add([this.rug, this.chairs, this.table, this.label, ...this.hits])
  }

  destroy(): void {
    this.rug.destroy()
    this.chairs.destroy()
    this.table.destroy()
    this.label.destroy()
    for (const hit of this.hits) hit.destroy()
  }
}
