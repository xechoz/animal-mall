import type Phaser from 'phaser'
import { PEN_SIZE } from '../logic/config'
import type { ShopMap } from '../logic/types'
import { drawFence } from './forestArt'

/**
 * Pen fences are split into a back and a front layer. The back layer sits at
 * the pen's north edge so animals and the trough draw over it; the front rail
 * sits at the south edge and covers feet inside the pen. A single depth for the
 * whole pen would put the front rail behind the animal.
 */
export class PenFences {
  private readonly back: Phaser.GameObjects.Graphics[] = []
  private readonly front: Phaser.GameObjects.Graphics[] = []
  private locked = false

  constructor(scene: Phaser.Scene, map: ShopMap) {
    for (const pen of map.animalPens) {
      const left = pen.x - PEN_SIZE.w / 2
      const right = pen.x + PEN_SIZE.w / 2
      const top = pen.y - PEN_SIZE.h / 2
      const bottom = pen.y + PEN_SIZE.h / 2

      const back = scene.add.graphics()
      drawFence(
        back,
        { x1: left, y1: top + 6, x2: right, y2: top + 6 },
        { height: 12, postGap: 28, moss: false, seed: pen.index + 3 },
      )
      drawFence(
        back,
        { x1: left + 2, y1: top, x2: left + 2, y2: bottom },
        { height: 12, postGap: 28, moss: false, seed: pen.index + 5 },
      )
      drawFence(
        back,
        { x1: right - 2, y1: top, x2: right - 2, y2: bottom },
        { height: 12, postGap: 28, moss: false, seed: pen.index + 7 },
      )
      back.setDepth(top)
      this.back.push(back)

      const front = scene.add.graphics()
      drawFence(
        front,
        { x1: left, y1: bottom, x2: right, y2: bottom },
        {
          height: 10,
          postGap: 16,
          gapStart: PEN_SIZE.w / 2 - 12,
          gapEnd: PEN_SIZE.w / 2 + 12,
          moss: false,
          seed: pen.index + 9,
        },
      )
      front.setDepth(bottom)
      this.front.push(front)
    }
  }

  addTo(world: Phaser.GameObjects.Container): void {
    for (const graphics of this.back) world.add(graphics)
    for (const graphics of this.front) world.add(graphics)
  }

  /**
   * Keep the fence depths intact so the zone tint cannot paint over their
   * edges. A locked farm fades the rails instead; the floor tint still shows
   * through, but every post and rail stays readable.
   */
  setLocked(locked: boolean): void {
    if (locked === this.locked) return
    this.locked = locked
    for (const graphics of this.back) graphics.setAlpha(locked ? 0.55 : 1)
    for (const graphics of this.front) graphics.setAlpha(locked ? 0.55 : 1)
  }
}
