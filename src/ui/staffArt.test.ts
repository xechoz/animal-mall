import { describe, expect, it } from 'vitest'
import { STAFF_ORDER } from '../logic/config'
import { animalTextureKey } from './animalArt'
import { staffBodyKey, staffHatKey, staffPortraitKey } from './staffArt'

describe('staff art registry', () => {
  it('gives every role a body, a portrait and a hat texture', () => {
    const keys = new Set<string>()
    for (const kind of STAFF_ORDER) {
      for (const key of [staffBodyKey(kind), staffPortraitKey(kind), staffHatKey(kind)]) {
        expect(keys.has(key)).toBe(false)
        keys.add(key)
      }
    }
    expect(keys.size).toBe(STAFF_ORDER.length * 3)
    expect(keys.has(animalTextureKey('cat'))).toBe(false)
  })
})
