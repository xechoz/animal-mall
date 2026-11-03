import type { ShopMap } from '../logic/types'

export interface FenceLantern {
  /** Centre of the lantern glass, also the anchor for its night-time light. */
  readonly x: number
  readonly y: number
  readonly scale: number
  readonly facing: 'left' | 'right' | 'bottom'
}

/**
 * Lanterns mounted on the two side fences and on the bottom fence beside the
 * door. Positions live here so the baked fence art and the night lights cannot
 * drift apart.
 */
export function fenceLanterns(map: ShopMap): readonly FenceLantern[] {
  const { w, h } = map.room
  const sideY = [h * 0.3, h * 0.62] as const
  const scale = 0.95
  return [
    ...sideY.flatMap((y): FenceLantern[] => [
      { x: 34, y, scale, facing: 'left' },
      { x: w - 34, y, scale, facing: 'right' },
    ]),
    { x: map.doorPoint.x - 96, y: h - 42, scale: 0.88, facing: 'bottom' },
    { x: map.doorPoint.x + 96, y: h - 42, scale: 0.88, facing: 'bottom' },
  ]
}
