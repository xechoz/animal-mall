import Phaser from 'phaser'
import { isPlantKind, zoneOf } from '../logic/config'
import type { ShopState } from '../logic/types'
import { drawEmptyBed } from './groundArt'

/**
 * Draws the empty planting slots on top of the static orchard/field ground.
 * The static background cannot know which beds are occupied, so the seedbed
 * and seed-packet cue live in this thin state-aware layer. It only redraws when
 * the set of planted slots or the zone unlocks changes.
 */
export class PlantBedView extends Phaser.GameObjects.Container {
  private readonly art: Phaser.GameObjects.Graphics
  private lastKey = ''

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0)
    this.art = scene.add.graphics()
    this.add(this.art)
    scene.add.existing(this)
  }

  updateBeds(state: ShopState): void {
    const key = bedSignature(state)
    if (key === this.lastKey) return
    this.lastKey = key
    this.art.clear()

    for (const zone of ['fruit', 'veg'] as const) {
      if (!state.zones[zone]) continue
      const occupied = new Set(
        state.producers
          .filter((producer) => isPlantKind(producer.product) && zoneOf(producer.product) === zone)
          .map((producer) => producer.slot),
      )
      for (const plot of state.map.plantSlots[zone]) {
        if (occupied.has(plot.index)) continue
        drawEmptyBed(this.art, plot.x, plot.y, zone)
      }
    }
  }
}

function bedSignature(state: ShopState): string {
  const zones = `${state.zones.fruit ? 'f' : ''}${state.zones.veg ? 'v' : ''}`
  const planted = state.producers
    .filter((producer) => isPlantKind(producer.product))
    .map((producer) => `${zoneOf(producer.product)}:${producer.slot}`)
    .sort()
    .join(',')
  return `${zones}|${planted}`
}
