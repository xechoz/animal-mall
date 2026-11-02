import { describe, expect, it } from 'vitest'
import { CUSTOMER_SPECIES } from '../logic/config'
import {
  ANIMAL_FOOT_GAP,
  ANIMAL_SCALE,
  ANIMAL_TEXTURE_SIZE,
  animalFace,
  animalPartKey,
  animalTextureKey,
  blinkEyes,
  playerPartKey,
  playerTextureKey,
  tailPivot,
} from './animalArt'

const ALL_SPECIES = ['bear', ...CUSTOMER_SPECIES] as const

describe('animal art registry', () => {
  it('keeps customer species unique and ships every species with art', () => {
    expect(new Set(CUSTOMER_SPECIES).size).toBe(CUSTOMER_SPECIES.length)
    expect(ALL_SPECIES.length).toBe(14)
  })

  it('exposes usable anchors and a unique texture key for every species', () => {
    const keys = new Set<string>()
    for (const species of ALL_SPECIES) {
      const face = animalFace(species, 1)
      for (const value of [face.eyeY, face.browY, face.mouthY, face.blushY, face.topY]) {
        expect(Number.isFinite(value)).toBe(true)
      }
      expect(face.topY).toBeLessThan(face.eyeY)
      expect(face.mouthColor).toBeGreaterThan(0)

      const eyes = blinkEyes(species)
      expect(eyes).toHaveLength(2)
      for (const eye of eyes) expect(eye.r).toBeGreaterThan(0)

      const pivot = tailPivot(species)
      expect(pivot.x).toBeGreaterThan(0)
      expect(pivot.x).toBeLessThan(ANIMAL_TEXTURE_SIZE)
      expect(pivot.y).toBeGreaterThan(0)
      expect(pivot.y).toBeLessThan(ANIMAL_TEXTURE_SIZE)

      const key = animalTextureKey(species)
      expect(keys.has(key)).toBe(false)
      keys.add(key)
      for (const part of ['body', 'head', 'tail', 'paw'] as const) {
        const partKey = animalPartKey(species, part)
        expect(keys.has(partKey)).toBe(false)
        keys.add(partKey)
      }
    }

    expect(keys.has(playerTextureKey())).toBe(false)
    expect(keys.has(playerPartKey('body'))).toBe(false)
  })

  it('keeps the split paw spacing and the 96-unit display footprint', () => {
    expect(ANIMAL_TEXTURE_SIZE).toBe(128)
    expect(ANIMAL_SCALE).toBeCloseTo(0.75)
    expect(ANIMAL_FOOT_GAP).toBeGreaterThan(16)
  })
})
