import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import type { ShopMap } from '../logic/types'
import { bakeLayer } from './bakeArt'
import { drawTrashBin, drawVendingMachine } from './facilitiesArt'
import { addPropShadow, TRASH_HEIGHT, VENDING_HEIGHT } from './propArt'

export type FacilityKind = 'trash' | 'vending'

export class FacilityView extends Phaser.GameObjects.Container {
  private readonly sceneRef: Phaser.Scene
  private readonly baseScale = 1

  constructor(
    scene: Phaser.Scene,
    theme: Theme,
    kind: FacilityKind,
    map: ShopMap,
    label: string,
    textScale: number,
    bakeScale: number,
  ) {
    const rect = kind === 'trash' ? map.facilities.trashRect : map.facilities.vendingRect
    super(scene, rect.x + rect.w / 2, rect.y + rect.h / 2)
    this.sceneRef = scene

    const local = { x: -rect.w / 2, y: -rect.h / 2, w: rect.w, h: rect.h }
    addPropShadow(scene, this, {
      width: rect.w + 10,
      height: rect.h + 10,
      alpha: kind === 'vending' ? 0.24 : 0.18,
    })

    const art = scene.add.graphics()
    if (kind === 'trash') {
      drawTrashBin(art, local)
    } else {
      drawVendingMachine(art, local)
    }
    // The bin and the machine never change once built, so bake their art into
    // one quad instead of letting the renderer re-walk the command buffer.
    const height = kind === 'trash' ? TRASH_HEIGHT : VENDING_HEIGHT
    const topPad = height + 12
    this.add(
      bakeLayer(
        scene,
        art,
        `facility-${map.id}-${kind}`,
        { x: local.x - 10, y: local.y - topPad },
        local.w + 20,
        local.h + topPad + 10,
        bakeScale,
      ),
    )
    art.destroy()
    if (kind === 'vending') {
      this.add(
        scene.add
          .text(
            0,
            local.y + local.h - VENDING_HEIGHT + 6,
            label,
            textStyle(theme, 10 * Math.min(textScale, 1.25), '#fff7e8', true),
          )
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
