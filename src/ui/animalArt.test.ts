import { describe, expect, it } from 'vitest'
import { CUSTOMER_SPECIES } from '../logic/config'
import {
  ANIMAL_FOOT_GAP,
  ANIMAL_SCALE,
  ANIMAL_TEXTURE_SIZE,
  ANIMAL_VIEWS,
  animalFace,
  animalPartKey,
  animalTextureKey,
  blinkEyes,
  pawView,
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

  it('ships five directional views per rigged part', () => {
    expect(ANIMAL_VIEWS).toEqual(['front', 'frontSide', 'side', 'backSide', 'back'])
  })

  it('exposes usable anchors and a unique texture key for every species and view', () => {
    const keys = new Set<string>()
    for (const species of ALL_SPECIES) {
      const face = animalFace(species, 1)
      for (const value of [face.eyeY, face.browY, face.mouthY, face.blushY, face.topY]) {
        expect(Number.isFinite(value)).toBe(true)
      }
      expect(face.topY).toBeLessThan(face.eyeY)
      expect(face.mouthColor).toBeGreaterThan(0)

      const frontEyes = blinkEyes(species)
      expect(frontEyes).toHaveLength(2)
      for (const eye of frontEyes) expect(eye.r).toBeGreaterThan(0)
      expect(blinkEyes(species, 'side')).toHaveLength(1)
      expect(blinkEyes(species, 'frontSide').length).toBeGreaterThanOrEqual(1)
      expect(blinkEyes(species, 'backSide')).toHaveLength(0)
      expect(blinkEyes(species, 'back')).toHaveLength(0)

      const pivot = tailPivot(species)
      expect(pivot.x).toBeGreaterThan(0)
      expect(pivot.x).toBeLessThan(ANIMAL_TEXTURE_SIZE)
      expect(pivot.y).toBeGreaterThan(0)
      expect(pivot.y).toBeLessThan(ANIMAL_TEXTURE_SIZE)

      const portrait = animalTextureKey(species)
      expect(keys.has(portrait)).toBe(false)
      keys.add(portrait)
      for (const view of ANIMAL_VIEWS) {
        for (const part of ['body', 'head', 'tail'] as const) {
          const partKey = animalPartKey(species, part, view)
          expect(keys.has(partKey)).toBe(false)
          keys.add(partKey)
          const sidePivot = tailPivot(species, view)
          expect(sidePivot.x).toBeGreaterThan(0)
          expect(sidePivot.x).toBeLessThan(ANIMAL_TEXTURE_SIZE)
        }
      }
    }

    expect(keys.has(playerTextureKey())).toBe(false)
    for (const view of ANIMAL_VIEWS) {
      for (const part of ['body', 'head', 'tail'] as const) {
        const key = playerPartKey(part, view)
        expect(keys.has(key)).toBe(false)
        keys.add(key)
      }
    }
  })

  it('uses the leg-and-foot art for every turned view', () => {
    expect(pawView('front')).toBe('front')
    expect(pawView('back')).toBe('front')
    expect(pawView('frontSide')).toBe('front')
    expect(pawView('side')).toBe('side')
    expect(pawView('backSide')).toBe('side')
  })

  it('keeps the split paw spacing and the 96-unit display footprint', () => {
    expect(ANIMAL_TEXTURE_SIZE).toBe(128)
    expect(ANIMAL_SCALE).toBeCloseTo(0.75)
    expect(ANIMAL_FOOT_GAP).toBeGreaterThan(16)
  })
})
