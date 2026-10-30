export type FruitKind = 'apple' | 'pear' | 'peach' | 'cherry'

export type UpgradeKind = 'carry' | 'shelf' | 'speed' | 'scan' | 'fertilizer'

export type StaffKind = 'cashier' | 'picker'

export type SpeciesId = 'bear' | 'cat' | 'rabbit' | 'fox' | 'panda' | 'frog' | 'pig' | 'dog'

export type CustomerPhase = 'toShelf' | 'picking' | 'toQueue' | 'inQueue' | 'leaving'

export type TutorialStep = 'buyTree' | 'grow' | 'harvest' | 'stock' | 'checkout' | 'done'

export interface Vec2 {
  readonly x: number
  readonly y: number
}

export interface Rect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export interface Plot {
  readonly index: number
  readonly x: number
  readonly y: number
}

export interface SaveTree {
  readonly kind: FruitKind
  readonly plot: number
}

export interface SaveData {
  readonly coins: number
  readonly totalEarned: number
  readonly served: number
  readonly pendingCoins: number
  readonly trees: readonly SaveTree[]
  readonly upgrades: Readonly<Record<UpgradeKind, number>>
  readonly staff: Readonly<Record<StaffKind, number>>
  readonly deposits: Readonly<Record<string, number>>
}

export interface TreeState {
  readonly id: number
  readonly kind: FruitKind
  readonly plot: number
  readonly pos: Vec2
  readonly growthMs: number
  readonly mature: boolean
  readonly fruit: number
  readonly fruitMs: number
}

export interface ShelfState {
  readonly kind: FruitKind
  readonly stock: number
  readonly capacity: number
  readonly active: boolean
  readonly everStocked: boolean
}

export interface PlayerState {
  readonly pos: Vec2
  readonly prevPos: Vec2
  readonly facing: -1 | 1
  readonly moving: boolean
  readonly carry: FruitKind | null
  readonly carryCount: number
  readonly harvestMs: number
  readonly stockMs: number
}

export interface CustomerState {
  readonly id: number
  readonly species: SpeciesId
  readonly pos: Vec2
  readonly prevPos: Vec2
  readonly path: readonly Vec2[]
  readonly pathIndex: number
  readonly phase: CustomerPhase
  readonly wanted: readonly FruitKind[]
  readonly basket: readonly FruitKind[]
  readonly target: FruitKind | null
  readonly patienceMs: number
  readonly maxPatienceMs: number
  readonly waitMs: number
  readonly queueIndex: number
  readonly speed: number
  readonly sad: boolean
  readonly paid: number
}

export interface RegisterState {
  readonly customerId: number | null
  readonly scanMs: number
}

export type StaffPhase = 'cashier' | 'idle' | 'toTree' | 'harvest' | 'toShelf' | 'stock'

export interface StaffState {
  readonly id: number
  readonly kind: StaffKind
  readonly species: SpeciesId
  readonly pos: Vec2
  readonly prevPos: Vec2
  readonly facing: -1 | 1
  readonly moving: boolean
  readonly path: readonly Vec2[]
  readonly pathIndex: number
  readonly phase: StaffPhase
  readonly targetTreeId: number | null
  readonly targetShelf: FruitKind | null
  readonly carry: FruitKind | null
  readonly carryCount: number
  readonly timerMs: number
  readonly waitMs: number
}

export interface QuickBuyState {
  readonly targetKey: string | null
  readonly dwellMs: number
  readonly armed: boolean
}

export interface ShopState {
  readonly coins: number
  readonly totalEarned: number
  readonly served: number
  readonly pendingCoins: number
  readonly player: PlayerState
  readonly trees: readonly TreeState[]
  readonly shelves: Readonly<Record<FruitKind, ShelfState>>
  readonly customers: readonly CustomerState[]
  readonly queue: readonly number[]
  readonly register: RegisterState
  readonly spawnMs: number
  readonly nextCustomerId: number
  readonly nextTreeId: number
  readonly upgrades: Readonly<Record<UpgradeKind, number>>
  readonly staff: Readonly<Record<StaffKind, number>>
  readonly staffMembers: readonly StaffState[]
  readonly deposits: Readonly<Record<string, number>>
  readonly quickBuy: QuickBuyState
  readonly tutorial: TutorialStep
}

export type GameEvent =
  | { readonly type: 'harvest'; readonly kind: FruitKind; readonly amount: number }
  | { readonly type: 'stock'; readonly kind: FruitKind; readonly amount: number }
  | { readonly type: 'scan'; readonly kind: FruitKind; readonly amount: number }
  | {
      readonly type: 'customerPick'
      readonly customerId: number
      readonly kind: FruitKind
    }
  | {
      readonly type: 'customerMissed'
      readonly customerId: number
      readonly kind: FruitKind
    }
  | { readonly type: 'sale'; readonly amount: number; readonly customerId: number }
  | { readonly type: 'treeMature'; readonly treeId: number; readonly plot: number }
  | { readonly type: 'fruitReady'; readonly treeId: number; readonly plot: number }
  | {
      readonly type: 'customerEnter'
      readonly customerId: number
      readonly species: SpeciesId
    }
  | { readonly type: 'customerLeave'; readonly customerId: number; readonly sad: boolean }
  | { readonly type: 'treeBought'; readonly kind: FruitKind; readonly plot: number }
  | { readonly type: 'treeRemoved'; readonly kind: FruitKind; readonly plot: number }
  | { readonly type: 'upgradeBought'; readonly kind: UpgradeKind; readonly level: number }
  | { readonly type: 'staffBought'; readonly kind: StaffKind; readonly level: number }
  | {
      readonly type: 'deposit'
      readonly target: 'tree' | 'staff'
      readonly kind: FruitKind | StaffKind
      readonly amount: number
      readonly remaining: number
    }
  | { readonly type: 'quickBuyReady'; readonly plot: number }
  | { readonly type: 'coinsPending'; readonly amount: number }
  | { readonly type: 'coinsCollected'; readonly amount: number }
  | { readonly type: 'staffHarvest'; readonly staffId: number; readonly kind: FruitKind }
  | { readonly type: 'staffStock'; readonly staffId: number; readonly kind: FruitKind }
  | { readonly type: 'tutorial'; readonly step: TutorialStep }

export interface StepInput {
  readonly moveX: number
  readonly moveY: number
}

export interface StepResult {
  readonly state: ShopState
  readonly events: readonly GameEvent[]
}
