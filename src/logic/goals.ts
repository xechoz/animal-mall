import { producerCost, UPGRADE_ORDER, UPGRADES, ZONES } from './config'
import type { ProductKind, ShopState, UpgradeKind, ZoneId } from './types'

export type Goal =
  | { readonly type: 'zone'; readonly zone: ZoneId }
  | { readonly type: 'producer'; readonly product: ProductKind }
  | { readonly type: 'upgrade'; readonly kind: UpgradeKind }
  | null

const CHAIN: readonly Goal[] = [
  { type: 'zone', zone: 'veg' },
  { type: 'producer', product: 'carrot' },
  { type: 'zone', zone: 'farm' },
  { type: 'producer', product: 'milk' },
  { type: 'zone', zone: 'kitchen' },
  { type: 'producer', product: 'yarn' },
  { type: 'producer', product: 'sweater' },
  { type: 'producer', product: 'fish' },
  { type: 'producer', product: 'skewer' },
]

export function nextGoal(state: ShopState): Goal {
  for (const goal of CHAIN) {
    if (goal === null) continue
    if (goal.type === 'zone' && !state.zones[goal.zone]) return goal
    if (
      goal.type === 'producer' &&
      !state.producers.some((producer) => producer.product === goal.product)
    ) {
      return goal
    }
  }

  const upgrade = UPGRADE_ORDER.find((kind) => state.upgrades[kind] < UPGRADES[kind].costs.length)
  return upgrade === undefined ? null : { type: 'upgrade', kind: upgrade }
}

export function goalCost(state: ShopState, goal: Goal): number {
  if (goal === null) return 0
  if (goal.type === 'zone') return ZONES[goal.zone].unlockCost
  if (goal.type === 'producer') return producerCost(goal.product)
  return UPGRADES[goal.kind].costs[state.upgrades[goal.kind]] ?? 0
}
