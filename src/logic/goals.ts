import { FRUIT_ORDER, FRUITS, UPGRADE_ORDER, UPGRADES } from './config'
import type { FruitKind, ShopState, UpgradeKind } from './types'

export type Goal =
  | { readonly type: 'tree'; readonly kind: FruitKind }
  | { readonly type: 'upgrade'; readonly kind: UpgradeKind }
  | null

export function nextGoal(state: ShopState): Goal {
  const planted = new Set(state.trees.map((tree) => tree.kind))
  const fruit = FRUIT_ORDER.find((kind) => !planted.has(kind))
  if (fruit !== undefined) return { type: 'tree', kind: fruit }

  const upgrade = UPGRADE_ORDER.find((kind) => state.upgrades[kind] < UPGRADES[kind].costs.length)
  return upgrade === undefined ? null : { type: 'upgrade', kind: upgrade }
}

export function goalCost(state: ShopState, goal: Goal): number {
  if (goal === null) return 0
  if (goal.type === 'tree') return FRUITS[goal.kind].cost
  return UPGRADES[goal.kind].costs[state.upgrades[goal.kind]] ?? 0
}
