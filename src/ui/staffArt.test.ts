import { describe, expect, it } from 'vitest'
import { STAFF_ORDER } from '../logic/config'
import { ANIMAL_VIEWS, animalTextureKey } from './animalArt'
import { staffBodyKey, staffHatKey, staffPortraitKey } from './staffArt'

describe('staff art registry', () => {
  it('gives every role a body and hat for every view, plus one portrait', () => {
    const keys = new Set<string>()
    for (const kind of STAFF_ORDER) {
      const portrait = staffPortraitKey(kind)
      expect(keys.has(portrait)).toBe(false)
      keys.add(portrait)
      for (const view of ANIMAL_VIEWS) {
        for (const key of [staffBodyKey(kind, view), staffHatKey(kind, view)]) {
          expect(keys.has(key)).toBe(false)
          keys.add(key)
        }
      }
    }
    expect(keys.size).toBe(STAFF_ORDER.length * (1 + ANIMAL_VIEWS.length * 2))
    expect(keys.has(animalTextureKey('cat'))).toBe(false)
  })
})
