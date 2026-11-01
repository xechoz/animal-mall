import { type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'
import type { ShopMap } from '../logic/types'
import { drawDiningChair, drawDiningRug, drawDiningTable } from './diningArt'

/**
 * The dining table is split into a background layer (rug + chairs) and a table
 * layer so walkers above the table are drawn behind it while seated characters
 * always sit in front of their chairs.
 */
export class DiningView {
  private readonly rug: Phaser.GameObjects.Graphics
  private readonly chairs: Phaser.GameObjects.Graphics
  private readonly table: Phaser.GameObjects.Graphics
  private readonly label: Phaser.GameObjects.Text
  private readonly hits: readonly Phaser.GameObjects.Zone[]

  constructor(
    scene: Phaser.Scene,
    theme: Theme,
    map: ShopMap,
    label: string,
    textScale: number,
    onSeat: (seatIndex: number) => void,
  ) {
    this.rug = scene.add.graphics()
    drawDiningRug(this.rug, map.dining.rug)
    this.rug.setDepth(1)

    this.chairs = scene.add.graphics()
    for (const seat of map.dining.seats) drawDiningChair(this.chairs, seat)
    this.chairs.setDepth(2)

    this.table = scene.add.graphics()
    drawDiningTable(this.table, map.dining.table)
    this.table.setDepth(map.dining.table.y + map.dining.table.h)

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
      zone.on('pointerup', () => onSeat(seat.index))
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
