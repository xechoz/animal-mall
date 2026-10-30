import {
  FRUIT_ORDER,
  FRUITS,
  PLOTS,
  STAFF,
  STAFF_ORDER,
  STARTING_COINS,
  UPGRADE_ORDER,
  UPGRADES,
} from './config'
import type { FruitKind, SaveData, SaveTree, StaffKind, UpgradeKind } from './types'

export function initialSave(): SaveData {
  return {
    coins: STARTING_COINS,
    totalEarned: 0,
    served: 0,
    pendingCoins: 0,
    trees: [],
    upgrades: zeroUpgrades(),
    staff: zeroStaff(),
    deposits: {},
  }
}

export function zeroUpgrades(): Record<UpgradeKind, number> {
  return Object.fromEntries(UPGRADE_ORDER.map((kind) => [kind, 0])) as Record<UpgradeKind, number>
}

export function zeroStaff(): Record<StaffKind, number> {
  return Object.fromEntries(STAFF_ORDER.map((kind) => [kind, 0])) as Record<StaffKind, number>
}

export function isFruitKind(value: unknown): value is FruitKind {
  return typeof value === 'string' && (FRUIT_ORDER as readonly string[]).includes(value)
}

export function isStaffKind(value: unknown): value is StaffKind {
  return typeof value === 'string' && (STAFF_ORDER as readonly string[]).includes(value)
}

export function migrateSave(data: unknown): SaveData {
  if (typeof data !== 'object' || data === null) return initialSave()
  const record = data as Record<string, unknown>
  const usedPlots = new Set<number>()
  const trees: SaveTree[] = []

  if (Array.isArray(record.trees)) {
    for (const entry of record.trees) {
      if (typeof entry !== 'object' || entry === null) continue
      const tree = entry as Record<string, unknown>
      const kind = tree.kind
      const plot = tree.plot
      if (!isFruitKind(kind)) continue
      if (typeof plot !== 'number' || !Number.isInteger(plot) || plot < 0 || plot > 3) continue
      if (usedPlots.has(plot)) continue
      usedPlots.add(plot)
      trees.push({ kind, plot })
    }
  }

  const upgrades = zeroUpgrades()
  if (typeof record.upgrades === 'object' && record.upgrades !== null) {
    const source = record.upgrades as Record<string, unknown>
    for (const kind of UPGRADE_ORDER) {
      const level = source[kind]
      if (typeof level === 'number' && Number.isFinite(level)) {
        upgrades[kind] = Math.max(0, Math.min(UPGRADES[kind].costs.length, Math.floor(level)))
      }
    }
  }

  const staff = zeroStaff()
  if (typeof record.staff === 'object' && record.staff !== null) {
    const source = record.staff as Record<string, unknown>
    for (const kind of STAFF_ORDER) {
      const level = source[kind]
      if (typeof level === 'number' && Number.isFinite(level)) {
        staff[kind] = Math.max(0, Math.min(STAFF[kind].costs.length, Math.floor(level)))
      }
    }
  }

  let coins = nonNegativeNumber(record.coins, STARTING_COINS)
  const deposits: Record<string, number> = {}
  let treeDeposit: FruitKind | null = null

  if (typeof record.deposits === 'object' && record.deposits !== null) {
    const source = record.deposits as Record<string, unknown>
    for (const [key, raw] of Object.entries(source)) {
      const amount = nonNegativeNumber(raw, 0)
      if (amount <= 0) continue

      if (key.startsWith('tree:')) {
        const kind = key.slice(5)
        if (!isFruitKind(kind)) {
          coins += amount
          continue
        }
        if (treeDeposit !== null) {
          coins += amount
          continue
        }
        const cost = FRUITS[kind].cost
        treeDeposit = kind
        deposits[key] = Math.min(amount, cost)
        continue
      }

      if (key.startsWith('staff:')) {
        const kind = key.slice(6)
        if (!isStaffKind(kind)) {
          coins += amount
          continue
        }
        const cost = STAFF[kind].costs[staff[kind]]
        if (cost === undefined) {
          coins += amount
          continue
        }
        deposits[key] = Math.min(amount, cost)
        continue
      }

      coins += amount
    }
  }

  // Deposits are non-refundable during play, but a partially paid commitment
  // must never strand the player when there is no way to finish it.
  if (trees.length === 0) {
    for (const amount of Object.values(deposits)) coins += amount
    for (const key of Object.keys(deposits)) delete deposits[key]
    const cheapest = Math.min(...FRUIT_ORDER.map((kind) => FRUITS[kind].cost))
    if (coins < cheapest) coins = cheapest
  } else if (trees.length >= PLOTS.length) {
    for (const [key, amount] of Object.entries(deposits)) {
      if (!key.startsWith('tree:')) continue
      coins += amount
      delete deposits[key]
    }
  }

  return {
    coins,
    totalEarned: nonNegativeNumber(record.totalEarned, 0),
    served: nonNegativeNumber(record.served, 0),
    pendingCoins: nonNegativeNumber(record.pendingCoins, 0),
    trees,
    upgrades,
    staff,
    deposits,
  }
}

function nonNegativeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback
}
