import { FRUIT_ORDER, FRUITS, PLOTS, STAFF, shelfCapacity, UPGRADE_ORDER, UPGRADES } from './config'
import { addTreeToState, removeTreeFromState, setTutorial } from './state'
import type { FruitKind, GameEvent, ShopState, StaffKind, TreeState, UpgradeKind } from './types'

export type PurchaseResult =
  | 'ok'
  | 'insufficient'
  | 'noPlot'
  | 'maxed'
  | 'missing'
  | 'deposited'
  | 'locked'
  | 'lastTree'

export interface PurchaseOutcome {
  readonly state: ShopState
  readonly result: PurchaseResult
  readonly events: readonly GameEvent[]
}

export function treeCost(kind: FruitKind): number {
  return FRUITS[kind].cost
}

export function upgradeCost(kind: UpgradeKind, level: number): number | null {
  return UPGRADES[kind].costs[level] ?? null
}

export function upgradeMax(kind: UpgradeKind): number {
  return UPGRADES[kind].costs.length
}

export function staffCost(kind: StaffKind, level: number): number | null {
  return STAFF[kind].costs[level] ?? null
}

export function staffMax(kind: StaffKind): number {
  return STAFF[kind].costs.length
}

export function treeDepositKey(kind: FruitKind): string {
  return `tree:${kind}`
}

export function staffDepositKey(kind: StaffKind): string {
  return `staff:${kind}`
}

export function activeTreeDeposit(
  state: ShopState,
): { readonly kind: FruitKind; readonly amount: number } | null {
  for (const kind of FRUIT_ORDER) {
    const amount = state.deposits[treeDepositKey(kind)] ?? 0
    if (amount > 0) return { kind, amount }
  }
  return null
}

export function emptyPlot(state: ShopState): number | null {
  const used = new Set(state.trees.map((tree) => tree.plot))
  const plot = PLOTS.find((candidate) => !used.has(candidate.index))
  return plot === undefined ? null : plot.index
}

export function plantedCount(state: ShopState, kind: FruitKind): number {
  return state.trees.filter((tree) => tree.kind === kind).length
}

export function purchaseTree(state: ShopState, kind: FruitKind): PurchaseOutcome {
  const plot = emptyPlot(state)
  if (plot === null) return { state, result: 'noPlot', events: [] }
  return purchaseTreeAt(state, kind, plot, false)
}

export function purchaseTreeAt(
  state: ShopState,
  kind: FruitKind,
  plot: number,
  allowDeposit: boolean,
): PurchaseOutcome {
  const point = PLOTS[plot]
  if (point === undefined) return { state, result: 'noPlot', events: [] }
  if (state.trees.some((tree) => tree.plot === plot)) {
    return { state, result: 'missing', events: [] }
  }

  const active = activeTreeDeposit(state)
  if (active !== null && active.kind !== kind) {
    return { state, result: 'locked', events: [] }
  }

  const cost = treeCost(kind)
  const deposit = active?.kind === kind ? active.amount : 0
  const remaining = Math.max(0, cost - deposit)

  if (state.coins >= remaining) {
    const tree: TreeState = {
      id: state.nextTreeId,
      kind,
      plot,
      pos: { x: point.x, y: point.y },
      growthMs: 0,
      mature: false,
      fruit: 0,
      fruitMs: 0,
    }
    const key = treeDepositKey(kind)
    const deposits = { ...state.deposits }
    delete deposits[key]
    let next: ShopState = {
      ...addTreeToState(state, tree),
      coins: state.coins - remaining,
      deposits,
    }
    next = setTutorial(next, state.tutorial === 'buyTree' ? 'grow' : state.tutorial)
    return {
      state: next,
      result: 'ok',
      events: [{ type: 'treeBought', kind, plot }],
    }
  }

  // A deposit is only safe when the player can still earn coins. With no
  // planted trees there is no income, so never strand the opening fund.
  if (!allowDeposit || state.trees.length === 0 || state.coins <= 0) {
    return { state, result: 'insufficient', events: [] }
  }

  const amount = state.coins
  const key = treeDepositKey(kind)
  const deposits = {
    ...state.deposits,
    [key]: deposit + amount,
  }
  return {
    state: { ...state, coins: 0, deposits },
    result: 'deposited',
    events: [
      {
        type: 'deposit',
        target: 'tree',
        kind,
        amount,
        remaining: Math.max(0, cost - deposits[key]),
      },
    ],
  }
}

export function purchaseUpgrade(state: ShopState, kind: UpgradeKind): PurchaseOutcome {
  const level = state.upgrades[kind]
  const cost = upgradeCost(kind, level)
  if (cost === null) return { state, result: 'maxed', events: [] }
  if (state.coins < cost) return { state, result: 'insufficient', events: [] }

  const upgrades = {
    ...state.upgrades,
    [kind]: level + 1,
  }
  const capacity = shelfCapacity(upgrades.shelf)
  const shelves = { ...state.shelves }
  for (const fruit of Object.keys(shelves) as FruitKind[]) {
    shelves[fruit] = {
      ...shelves[fruit],
      capacity,
      stock: Math.min(shelves[fruit].stock, capacity),
    }
  }

  return {
    state: { ...state, coins: state.coins - cost, upgrades, shelves },
    result: 'ok',
    events: [{ type: 'upgradeBought', kind, level: level + 1 }],
  }
}

export function purchaseStaff(
  state: ShopState,
  kind: StaffKind,
  allowDeposit: boolean,
): PurchaseOutcome {
  const level = state.staff[kind]
  const cost = staffCost(kind, level)
  if (cost === null) return { state, result: 'maxed', events: [] }

  const key = staffDepositKey(kind)
  const deposit = state.deposits[key] ?? 0
  const remaining = Math.max(0, cost - deposit)

  if (state.coins >= remaining) {
    const staff = { ...state.staff, [kind]: level + 1 }
    const deposits = { ...state.deposits }
    delete deposits[key]
    return {
      state: { ...state, coins: state.coins - remaining, staff, deposits },
      result: 'ok',
      events: [{ type: 'staffBought', kind, level: level + 1 }],
    }
  }

  if (!allowDeposit || state.trees.length === 0 || state.coins <= 0) {
    return { state, result: 'insufficient', events: [] }
  }

  const amount = state.coins
  const deposits = { ...state.deposits, [key]: deposit + amount }
  return {
    state: { ...state, coins: 0, deposits },
    result: 'deposited',
    events: [
      {
        type: 'deposit',
        target: 'staff',
        kind,
        amount,
        remaining: Math.max(0, cost - deposits[key]),
      },
    ],
  }
}

export function removeTree(state: ShopState, plot: number): PurchaseOutcome {
  const tree = state.trees.find((candidate) => candidate.plot === plot)
  if (tree === undefined) return { state, result: 'missing', events: [] }
  const refund = Math.floor(FRUITS[tree.kind].cost * 0.5)
  const cheapest = Math.min(...FRUIT_ORDER.map((kind) => FRUITS[kind].cost))
  if (state.trees.length === 1 && state.coins + refund < cheapest) {
    return { state, result: 'lastTree', events: [] }
  }
  const next = {
    ...removeTreeFromState(state, plot),
    coins: state.coins + refund,
  }
  return {
    state: next,
    result: 'ok',
    events: [{ type: 'treeRemoved', kind: tree.kind, plot }],
  }
}

export function nextUpgradeKind(state: ShopState): UpgradeKind | null {
  const kind = UPGRADE_ORDER.find((candidate) => state.upgrades[candidate] < upgradeMax(candidate))
  return kind ?? null
}
