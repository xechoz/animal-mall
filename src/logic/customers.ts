import type { Rng } from '@mg/core/rng'
import { NIGHT_SPECIES_WEIGHT } from './config'
import type { SpeciesId } from './types'

/** Daytime shoppers stay uniform; the night table only reshapes the evening. */
export function customerSpeciesWeight(species: SpeciesId, night: boolean): number {
  if (!night) return 1
  return NIGHT_SPECIES_WEIGHT[species] ?? 1
}

/**
 * Weighted species pick inside the already-filtered pool. With `night` false
 * every weight is one, so the roll consumes the same RNG number and selects the
 * same species as the old uniform `rng.pick`.
 */
export function pickCustomerSpecies(
  rng: Rng,
  pool: readonly SpeciesId[],
  night: boolean,
): SpeciesId {
  const total = pool.reduce((sum, species) => sum + customerSpeciesWeight(species, night), 0)
  let roll = rng.next() * total
  for (const species of pool) {
    roll -= customerSpeciesWeight(species, night)
    if (roll < 0) return species
  }
  return pool[pool.length - 1] as SpeciesId
}
