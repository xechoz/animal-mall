import { createRng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import { CUSTOMER_SPECIES } from './config'
import { customerSpeciesWeight, pickCustomerSpecies } from './customers'

const NOCTURNAL = new Set(['owl', 'raccoon', 'hedgehog', 'fox'])

function nocturnalShare(night: boolean): number {
  const rng = createRng(20261103)
  let count = 0
  for (let index = 0; index < 2_000; index += 1) {
    if (NOCTURNAL.has(pickCustomerSpecies(rng, CUSTOMER_SPECIES, night))) count += 1
  }
  return count / 2_000
}

describe('customer species weights', () => {
  it('leaves the daytime pick identical to the old uniform pool', () => {
    const weighted = createRng(17)
    const uniform = createRng(17)
    for (let index = 0; index < 200; index += 1) {
      expect(pickCustomerSpecies(weighted, CUSTOMER_SPECIES, false)).toBe(
        uniform.pick(CUSTOMER_SPECIES),
      )
    }
  })

  it('favours nocturnal animals after dark', () => {
    const day = nocturnalShare(false)
    const night = nocturnalShare(true)
    expect(night).toBeGreaterThan(0.55)
    expect(night).toBeGreaterThan(day + 0.15)
  })

  it('keeps every species usable at night', () => {
    for (const species of CUSTOMER_SPECIES) {
      expect(customerSpeciesWeight(species, true)).toBeGreaterThan(0)
    }
  })

  it('only returns species from the supplied pool', () => {
    const pool = ['owl', 'rabbit', 'duck'] as const
    const rng = createRng(99)
    for (let index = 0; index < 100; index += 1) {
      expect(pool).toContain(pickCustomerSpecies(rng, pool, true))
    }
  })
})
