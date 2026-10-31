import type { GameServices } from '@mg/core'
import type { ProductKind } from '../logic/types'

/** Pen animals have their own CC0 sample instead of the built-in synth cues. */
const ANIMAL_SFX: Partial<Record<ProductKind, string>> = {
  egg: 'chickenCluck',
  milk: 'cowMoo',
  yarn: 'sheepBaa',
}

export function animalSfxName(product: ProductKind): string | null {
  return ANIMAL_SFX[product] ?? null
}

export function playAnimalSfx(
  services: GameServices,
  product: ProductKind,
  gain = 0.55,
  pitch = 1,
): void {
  const name = animalSfxName(product)
  if (name === null) return
  services.audio.play(name, { gain, pitch })
}
