import Phaser from 'phaser'
import { isPlantKind, zoneOf } from '../logic/config'
import type { ShopState } from '../logic/types'
import { bakeGraphics } from './bakeArt'
import { drawEmptyBed } from './groundArt'

/**
 * Draws the empty planting slots on top of the static orchard/field ground.
 * The static background cannot know which beds are occupied, so the seedbed
 * and seed-packet cue live in this thin state-aware layer. It only re-bakes when
 * the set of planted slots or the zone unlocks changes.
 */
export class PlantBedView extends Phaser.GameObjects.Container {
  private readonly art: Phaser.GameObjects.Graphics
  private image?: Phaser.GameObjects.Image
  private lastKey = ''

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0)
    this.art = scene.add.graphics()
    this.add(this.art)
    scene.add.existing(this)
  }

  updateBeds(state: ShopState, bakeScale: number): void {
    const key = bedSignature(state)
    if (key === this.lastKey) return
    this.lastKey = key

    const bounds = plantBounds(state)
    this.art.clear()
    if (bounds !== null) {
      for (const zone of ['fruit', 'veg'] as const) {
        if (!state.zones[zone]) continue
        const occupied = new Set(
          state.producers
            .filter(
              (producer) => isPlantKind(producer.product) && zoneOf(producer.product) === zone,
            )
            .map((producer) => producer.slot),
        )
        for (const plot of state.map.plantSlots[zone]) {
          if (occupied.has(plot.index)) continue
          drawEmptyBed(this.art, plot.x - bounds.x, plot.y - bounds.y, zone)
        }
      }
    }

    this.image?.destroy()
    this.image = undefined
    if (bounds === null) return

    const baked = bakeGraphics(this.scene, this.art, 'plant-beds', bounds.w, bounds.h, bakeScale)
    this.image = baked.setPosition(bounds.x, bounds.y)
    this.addAt(this.image, 0)
  }
}

interface Bounds {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** Bounding box of every planting slot, padded for the bed lip and seed packet. */
function plantBounds(state: ShopState): Bounds | null {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const zone of ['fruit', 'veg'] as const) {
    if (!state.zones[zone]) continue
    for (const slot of state.map.plantSlots[zone]) {
      minX = Math.min(minX, slot.x)
      minY = Math.min(minY, slot.y)
      maxX = Math.max(maxX, slot.x)
      maxY = Math.max(maxY, slot.y)
    }
  }
  if (!Number.isFinite(minX)) return null
  const pad = 40
  return {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
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
