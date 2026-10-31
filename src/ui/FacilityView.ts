import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import type { ShopMap } from '../logic/types'
import { drawTrashBin, drawVendingMachine } from './facilitiesArt'

export type FacilityKind = 'trash' | 'vending'

export class FacilityView extends Phaser.GameObjects.Container {
  private readonly sceneRef: Phaser.Scene
  private readonly baseScale = 1

  constructor(scene: Phaser.Scene, theme: Theme, kind: FacilityKind, map: ShopMap, label: string) {
    const rect = kind === 'trash' ? map.facilities.trashRect : map.facilities.vendingRect
    super(scene, rect.x + rect.w / 2, rect.y + rect.h / 2)
    this.sceneRef = scene

    const local = { x: -rect.w / 2, y: -rect.h / 2, w: rect.w, h: rect.h }
    const art = scene.add.graphics()
    if (kind === 'trash') {
      drawTrashBin(art, local)
    } else {
      drawVendingMachine(art, local)
    }
    this.add(art)
    if (kind === 'vending') {
      this.add(
        scene.add
          .text(0, local.y + 13, label, textStyle(theme, 11, '#fff7e8', true))
          .setOrigin(0.5),
      )
    }
    this.setDepth(rect.y + rect.h)
    scene.add.existing(this)
  }

  playUse(): void {
    this.sceneRef.tweens.add({
      targets: this,
      scaleX: { from: 1.07, to: this.baseScale },
      scaleY: { from: 0.94, to: this.baseScale },
      duration: 180,
      ease: 'Quad.easeOut',
    })
  }
}
