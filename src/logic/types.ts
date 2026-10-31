export type FruitKind = 'apple' | 'pear' | 'peach' | 'cherry'
export type VegKind = 'carrot' | 'tomato' | 'corn' | 'pumpkin'
export type AnimalProductKind = 'egg' | 'milk' | 'yarn' | 'fish'
export type ProcessedKind = 'cake' | 'sweater' | 'grilledFish'
export type PlantKind = FruitKind | VegKind
export type ProductKind = PlantKind | AnimalProductKind | ProcessedKind

export type ZoneId = 'fruit' | 'veg' | 'farm' | 'kitchen'
export type ProducerKind = 'plant' | 'animal' | 'station'

export type UpgradeKind = 'carry' | 'shelf' | 'speed' | 'scan' | 'fertilizer'

export type StaffKind = 'cashier' | 'picker'
export type DrinkKind = 'appleSoda' | 'milkTea' | 'lemonTea'

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

export interface WanderTuning {
  readonly chance: number
  readonly minLeg: number
  readonly minExtra: number
  readonly maxExtra: number
  readonly maxOffset: number
}

export type ShopMapId = 'portrait' | 'landscape'

export interface StaffSpot {
  readonly station: Vec2
  readonly home: Vec2
}

export interface FacilityLayout {
  readonly trashRect: Rect
  readonly trashPoint: Vec2
  readonly trashAccess: Vec2
  readonly vendingRect: Rect
  readonly vendingPoint: Vec2
  readonly vendingUse: Vec2
  readonly restMat: Rect
  readonly restSpots: readonly Vec2[]
}

/**
 * One complete shop floor plan. The simulation only knows this shape, so the
 * same rules run on the portrait and landscape layouts.
 */
export interface ShopMap {
  readonly id: ShopMapId
  readonly room: { readonly w: number; readonly h: number }
  readonly wall: number
  readonly playerStart: Vec2
  readonly doorPoint: Vec2
  readonly doorSpawn: Vec2
  readonly counter: Rect
  readonly register: Vec2
  readonly queueSlots: readonly Vec2[]
  readonly shelves: Readonly<Record<ZoneId, Rect>>
  readonly shelfAccess: Readonly<Record<ZoneId, Vec2>>
  readonly plots: readonly Plot[]
  readonly cropPlots: readonly Plot[]
  readonly plantSlots: Readonly<Record<'fruit' | 'veg', readonly Plot[]>>
  readonly plantAccess: Readonly<Record<'fruit' | 'veg', readonly Vec2[]>>
  readonly animalPens: Readonly<Record<AnimalProductKind, Plot>>
  readonly animalAccess: Readonly<Record<AnimalProductKind, Vec2>>
  readonly stationSlots: Readonly<Record<ProcessedKind, Plot>>
  readonly stationAccess: Readonly<Record<ProcessedKind, Vec2>>
  readonly staffStations: Readonly<Record<StaffKind, StaffSpot>>
  readonly facilities: FacilityLayout
  readonly obstacles: readonly Rect[]
}

export interface SaveProducer {
  readonly product: ProductKind
  readonly slot: number
}

export type ZoneUnlocks = Readonly<Record<ZoneId, boolean>>

export interface SaveData {
  readonly coins: number
  readonly totalEarned: number
  readonly served: number
  readonly pendingCoins: number
  readonly producers: readonly SaveProducer[]
  readonly zones: ZoneUnlocks
  readonly upgrades: Readonly<Record<UpgradeKind, number>>
  readonly staff: Readonly<Record<StaffKind, number>>
  readonly deposits: Readonly<Record<string, number>>
}

export interface ProducerState {
  readonly id: number
  readonly kind: ProducerKind
  readonly product: ProductKind
  readonly slot: number
  readonly pos: Vec2
  readonly progressMs: number
  readonly ready: number
  readonly mature: boolean
  readonly hungry: boolean
}

export interface ShelfState {
  readonly zone: ZoneId
  readonly capacity: number
  readonly active: boolean
  readonly bins: Readonly<Record<ProductKind, boolean>>
  readonly stock: Readonly<Record<ProductKind, number>>
  readonly everStocked: Readonly<Record<ProductKind, boolean>>
}

export interface PlayerState {
  readonly pos: Vec2
  readonly prevPos: Vec2
  readonly facing: -1 | 1
  readonly moving: boolean
  readonly carry: ProductKind | null
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
  readonly wanted: readonly ProductKind[]
  readonly basket: readonly ProductKind[]
  readonly target: ProductKind | null
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

export type StaffPhase =
  | 'cashier'
  | 'idle'
  | 'toProducer'
  | 'harvest'
  | 'toShelf'
  | 'stock'
  | 'toDrink'
  | 'drinking'
  | 'resting'
  | 'toWork'

export interface StaffState {
  readonly id: number
  readonly kind: StaffKind
  readonly species: SpeciesId
  readonly pos: Vec2
  readonly prevPos: Vec2
  readonly home: Vec2
  readonly facing: -1 | 1
  readonly moving: boolean
  readonly path: readonly Vec2[]
  readonly pathIndex: number
  readonly phase: StaffPhase
  readonly targetProducerId: number | null
  readonly targetShelf: ZoneId | null
  readonly carry: ProductKind | null
  readonly carryCount: number
  readonly timerMs: number
  readonly waitMs: number
  readonly workMs: number
}

export type BuffTimers = Readonly<Record<DrinkKind, number>>

export interface FacilityState {
  readonly trashDwellMs: number
  readonly drinkDwellMs: number
  readonly drinkArmed: boolean
}

export interface QuickBuyState {
  readonly targetKey: string | null
  readonly dwellMs: number
  readonly armed: boolean
}

export interface ShopState {
  readonly map: ShopMap
  readonly coins: number
  readonly totalEarned: number
  readonly served: number
  readonly pendingCoins: number
  readonly player: PlayerState
  readonly zones: ZoneUnlocks
  readonly producers: readonly ProducerState[]
  readonly shelves: Readonly<Record<ZoneId, ShelfState>>
  readonly customers: readonly CustomerState[]
  readonly queue: readonly number[]
  readonly register: RegisterState
  readonly spawnMs: number
  readonly nextCustomerId: number
  readonly nextProducerId: number
  readonly upgrades: Readonly<Record<UpgradeKind, number>>
  readonly staff: Readonly<Record<StaffKind, number>>
  readonly staffMembers: readonly StaffState[]
  readonly deposits: Readonly<Record<string, number>>
  readonly quickBuy: QuickBuyState
  readonly facility: FacilityState
  readonly buffs: BuffTimers
  readonly tutorial: TutorialStep
}

export type GameEvent =
  | { readonly type: 'harvest'; readonly product: ProductKind; readonly amount: number }
  | { readonly type: 'stock'; readonly product: ProductKind; readonly amount: number }
  | { readonly type: 'scan'; readonly product: ProductKind; readonly amount: number }
  | {
      readonly type: 'customerPick'
      readonly customerId: number
      readonly product: ProductKind
    }
  | {
      readonly type: 'customerMissed'
      readonly customerId: number
      readonly product: ProductKind
    }
  | { readonly type: 'sale'; readonly amount: number; readonly customerId: number }
  | { readonly type: 'producerMature'; readonly producerId: number; readonly product: ProductKind }
  | { readonly type: 'producerReady'; readonly producerId: number; readonly product: ProductKind }
  | { readonly type: 'producerProduce'; readonly producerId: number; readonly product: ProductKind }
  | { readonly type: 'producerHungry'; readonly producerId: number; readonly product: ProductKind }
  | {
      readonly type: 'customerEnter'
      readonly customerId: number
      readonly species: SpeciesId
    }
  | { readonly type: 'customerLeave'; readonly customerId: number; readonly sad: boolean }
  | {
      readonly type: 'producerBought'
      readonly product: ProductKind
      readonly slot: number
    }
  | {
      readonly type: 'producerRemoved'
      readonly product: ProductKind
      readonly slot: number
    }
  | { readonly type: 'zoneUnlocked'; readonly zone: ZoneId }
  | { readonly type: 'upgradeBought'; readonly kind: UpgradeKind; readonly level: number }
  | { readonly type: 'staffBought'; readonly kind: StaffKind; readonly level: number }
  | {
      readonly type: 'deposit'
      readonly target: 'plant'
      readonly product: PlantKind
      readonly amount: number
      readonly remaining: number
    }
  | {
      readonly type: 'deposit'
      readonly target: 'staff'
      readonly kind: StaffKind
      readonly amount: number
      readonly remaining: number
    }
  | {
      readonly type: 'plantPickerReady'
      readonly zone: 'fruit' | 'veg'
      readonly slot: number
    }
  | { readonly type: 'coinsPending'; readonly amount: number }
  | { readonly type: 'coinsCollected'; readonly amount: number }
  | { readonly type: 'staffHarvest'; readonly staffId: number; readonly product: ProductKind }
  | { readonly type: 'staffStock'; readonly staffId: number; readonly product: ProductKind }
  | { readonly type: 'discard'; readonly product: ProductKind; readonly amount: number }
  | { readonly type: 'drinkMenuReady' }
  | { readonly type: 'drinkBought'; readonly drink: DrinkKind; readonly price: number }
  | { readonly type: 'staffLazy'; readonly staffId: number; readonly kind: StaffKind }
  | { readonly type: 'staffUrged'; readonly staffId: number }
  | { readonly type: 'tutorial'; readonly step: TutorialStep }

export interface StepInput {
  readonly moveX: number
  readonly moveY: number
}

export interface StepResult {
  readonly state: ShopState
  readonly events: readonly GameEvent[]
}
