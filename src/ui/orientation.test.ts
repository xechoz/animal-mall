import { describe, expect, it } from 'vitest'
import { shouldPreferLandscape } from './orientation'

const phone = { mobile: true, embedded: false, lockSupported: true }

describe('shouldPreferLandscape', () => {
  it('prefers landscape on phones with a lock API', () => {
    expect(shouldPreferLandscape(phone)).toBe(true)
  })

  it('never locks inside an iframe', () => {
    expect(shouldPreferLandscape({ ...phone, embedded: true })).toBe(false)
  })

  it('falls back when the browser cannot lock', () => {
    expect(shouldPreferLandscape({ ...phone, lockSupported: false })).toBe(false)
  })

  it('leaves desktop alone', () => {
    expect(shouldPreferLandscape({ ...phone, mobile: false })).toBe(false)
  })
})
