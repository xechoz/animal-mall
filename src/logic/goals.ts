import { producerCost, UPGRADE_ORDER, UPGRADES, ZONES } from './config'
import { staffCost } from './purchase'
import type { ProductKind, ShopState, StaffKind, UpgradeKind, ZoneId } from './types'

export type Goal =
  | { readonly type: 'zone'; readonly zone: ZoneId }
  | { readonly type: 'producer'; readonly product: ProductKind }
  | { readonly type: 'staff'; readonly kind: StaffKind }
  | { readonly type: 'upgrade'; readonly kind: UpgradeKind }
  | null

const CHAIN: readonly Goal[] = [
  { type: 'zone', zone: 'veg' },
  { type: 'producer', product: 'carrot' },
  { type: 'staff', kind: 'cashier' },
  { type: 'zone', zone: 'farm' },
  { type: 'staff', kind: 'picker' },
  { type: 'producer', product: 'milk' },
  { type: 'zone', zone: 'factory' },
  { type: 'staff', kind: 'chef' },
  { type: 'producer', product: 'yarn' },
  { type: 'producer', product: 'sweater' },
  { type: 'producer', product: 'fish' },
  { type: 'producer', product: 'fishDish' },
  { type: 'producer', product: 'salad' },
]

export function nextGoal(state: ShopState): Goal {
  // The first-sale tutorial is the only guide until the player has served a
  // customer. Advertising the vegetable zone before it unlocks sends players
  // into a shop tab whose button cannot be used.
  if (state.tutorial !== 'done') return null
  for (const goal of CHAIN) {
    if (goal === null) continue
    if (goal.type === 'zone' && !state.zones[goal.zone]) return goal
    if (
      goal.type === 'producer' &&
      !state.producers.some((producer) => producer.product === goal.product)
    ) {
      return goal
    }
    if (goal.type === 'staff' && state.staff[goal.kind] <= 0) return goal
  }

  const upgrade = UPGRADE_ORDER.find((kind) => state.upgrades[kind] < UPGRADES[kind].costs.length)
  return upgrade === undefined ? null : { type: 'upgrade', kind: upgrade }
}

export function goalCost(state: ShopState, goal: Goal): number {
  if (goal === null) return 0
  if (goal.type === 'zone') return ZONES[goal.zone].unlockCost
  if (goal.type === 'producer') return producerCost(goal.product)
  if (goal.type === 'staff') return staffCost(goal.kind, state.staff[goal.kind]) ?? 0
  return UPGRADES[goal.kind].costs[state.upgrades[goal.kind]] ?? 0
}
