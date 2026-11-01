export type FruitKind = 'apple' | 'pear' | 'peach' | 'cherry' | 'strawberry' | 'grape'
export type VegKind = 'carrot' | 'tomato' | 'corn' | 'pumpkin' | 'potato' | 'eggplant'
export type AnimalProductKind = 'egg' | 'milk' | 'yarn' | 'fish' | 'cheese' | 'honey'
export type ProcessedKind = 'cake' | 'sweater' | 'grilledFish' | 'juice' | 'jam' | 'iceCream'
export type PlantKind = FruitKind | VegKind
export type ProductKind = PlantKind | AnimalProductKind | ProcessedKind

/** A mixed basket: how many of each product the player is carrying. */
export type Carry = Readonly<Partial<Record<ProductKind, number>>>

export type ZoneId = 'fruit' | 'veg' | 'farm' | 'kitchen'
export type ProducerKind = 'plant' | 'animal' | 'station'

export type UpgradeKind = 'carry' | 'speed' | 'scan' | 'fertilizer'

export type StaffKind = 'cashier' | 'picker' | 'chef'
export type DrinkKind = 'appleSoda' | 'milkTea' | 'lemonTea'

export type SpeciesId = 'bear' | 'cat' | 'rabbit' | 'fox' | 'panda' | 'frog' | 'pig' | 'dog'

export type CustomerPhase = 'toShelf' | 'picking' | 'toQueue' | 'inQueue' | 'leaving'

export type TutorialStep = 'buyTree' | 'grow' | 'harvest' | 'stock' | 'checkout' | 'done'

/** The visible part of the working day. `closing` waits for the last shopper. */
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night' | 'closing'

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

export interface DiningSeat {
  readonly index: number
  /** Where the body sits while the chair is occupied. */
  readonly seat: Vec2
  /** Walkable point used to reach the chair and to stand up onto. */
  readonly stand: Vec2
  readonly facing: -1 | 1
}

export interface DiningLayout {
  readonly rug: Rect
  readonly table: Rect
  readonly seats: readonly DiningSeat[]
}

/**
 * A walkable dirt aisle. The map owns the rect so the floor art, the walkable
 * gap between zones and any future navigation hints cannot drift apart.
 */
export interface Aisle {
  readonly rect: Rect
  readonly vertical: boolean
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
  /**
   * Walkable footprint of each zone. It drives both the visible floor tint and
   * zone-level quick buying, so the trigger area always matches the floor.
   */
  readonly zoneAreas: Readonly<Record<ZoneId, Rect>>
  readonly shelfAccess: Readonly<Record<ZoneId, Vec2>>
  readonly plots: readonly Plot[]
  readonly cropPlots: readonly Plot[]
  readonly plantSlots: Readonly<Record<'fruit' | 'veg', readonly Plot[]>>
  readonly plantAccess: Readonly<Record<'fruit' | 'veg', readonly Vec2[]>>
  /**
   * Farm pens are generic slots. Any farm product, including the pond, can be
   * installed in any of them, so the save stores a slot index instead of a
   * product-keyed plot.
   */
  readonly animalPens: readonly Plot[]
  readonly animalAccess: readonly Vec2[]
  /** Kitchen stations are generic slots for the same reason. */
  readonly stationSlots: readonly Plot[]
  readonly stationAccess: readonly Vec2[]
  readonly staffStations: Readonly<Record<StaffKind, StaffSpot>>
  readonly facilities: FacilityLayout
  readonly dining: DiningLayout
  /** Dirt paths between the zones and down to the door. */
  readonly aisles: readonly Aisle[]
  /** Solid props for every walker: shelves, counter, pens and stations. */
  readonly obstacles: readonly Rect[]
  /**
   * Player-only collision. Animal pens and kitchen stations are deliberately
   * left out so the player can walk through their footprint like crop beds,
   * while customers and staff still route around them.
   */
  readonly playerObstacles: readonly Rect[]
}

export interface SaveProducer {
  readonly product: ProductKind
  readonly slot: number
}

export type ZoneUnlocks = Readonly<Record<ZoneId, boolean>>
export type ShelfLevels = Readonly<Record<ZoneId, number>>

export interface SaveData {
  readonly coins: number
  readonly totalEarned: number
  readonly served: number
  readonly pendingCoins: number
  readonly producers: readonly SaveProducer[]
  readonly zones: ZoneUnlocks
  readonly upgrades: Readonly<Record<UpgradeKind, number>>
  /** One shelf size upgrade level per zone. */
  readonly shelfLevels: ShelfLevels
  readonly staff: Readonly<Record<StaffKind, number>>
  readonly deposits: Readonly<Record<string, number>>
  /** Current shop day. Transient counters restart in the morning on reload. */
  readonly day: number
}

export interface DayReport {
  readonly day: number
  readonly revenue: number
  readonly served: number
  readonly lost: number
  readonly missed: number
  readonly rating: number | null
  readonly tip: number
  readonly tipPercent: number
}

/**
 * One working day. `ms` only advances while the shop is open, so losing focus
 * never eats a shift. Counters are reset when the report is produced.
 */
export interface DayState {
  readonly index: number
  readonly ms: number
  readonly revenue: number
  readonly served: number
  readonly entered: number
  readonly missed: number
  readonly scoreSum: number
  readonly report: DayReport | null
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
  readonly feed: Readonly<Partial<Record<PlantKind, number>>>
  /** Ingredients the player loaded by hand, consumed before shelf stock. */
  readonly hopper: Readonly<Partial<Record<ProductKind, number>>>
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
  readonly carry: Carry
  readonly harvestMs: number
  readonly stockMs: number
  readonly feedMs: number
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
  /** Grows when an order is missed or the queue waits too long. Transient. */
  readonly angerMs: number
  readonly paid: number
  /** Out-of-stock items this shopper had to skip; feeds the daily rating. */
  readonly missed: number
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
  | 'toTrough'
  | 'feed'
  | 'toFetch'
  | 'toLoad'
  | 'load'
  | 'toDrink'
  | 'drinking'
  | 'toMeal'
  | 'toDining'
  | 'dining'
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
  readonly targetTroughId: number | null
  /** Ingredient a chef is walking to a shelf to pick up. Transient. */
  readonly fetchProduct: ProductKind | null
  readonly carry: ProductKind | null
  readonly carryCount: number
  readonly timerMs: number
  readonly waitMs: number
  readonly workMs: number
  /** Dining seat reserved while walking to the table or eating. */
  readonly seatIndex: number | null
}

export type BuffTimers = Readonly<Record<DrinkKind, number>>

export interface DiningState {
  readonly playerSeat: number | null
  readonly dwellMs: number
  readonly targetSeat: number | null
  /** False after standing until the player leaves the table, avoiding a loop. */
  readonly armed: boolean
}

export interface FacilityState {
  readonly trashDwellMs: number
  readonly drinkDwellMs: number
  readonly drinkArmed: boolean
  readonly urgeTargetId: number | null
  readonly urgeDwellMs: number
}

export interface QuickBuyState {
  readonly targetKey: string | null
  readonly dwellMs: number
  readonly armed: boolean
}

export interface FishingState {
  readonly pondId: number | null
  /** idle casts, waiting holds the line, rest is the gap before re-casting. */
  readonly phase: 'idle' | 'waiting' | 'rest'
  readonly timerMs: number
  /** False while the basket is full; space frees it again. */
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
  readonly shelfLevels: ShelfLevels
  readonly staff: Readonly<Record<StaffKind, number>>
  readonly staffMembers: readonly StaffState[]
  readonly deposits: Readonly<Record<string, number>>
  readonly quickBuy: QuickBuyState
  readonly fishing: FishingState
  readonly facility: FacilityState
  readonly dining: DiningState
  readonly buffs: BuffTimers
  readonly tutorial: TutorialStep
  readonly day: DayState
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
  | {
      readonly type: 'producerReplaced'
      readonly product: ProductKind
      readonly previous: ProductKind
      readonly slot: number
      readonly refund: number
    }
  | { readonly type: 'zoneUnlocked'; readonly zone: ZoneId }
  | { readonly type: 'upgradeBought'; readonly kind: UpgradeKind; readonly level: number }
  | { readonly type: 'shelfUpgraded'; readonly zone: ZoneId; readonly level: number }
  | { readonly type: 'staffBought'; readonly kind: StaffKind; readonly level: number }
  | {
      readonly type: 'stationLoad'
      readonly producerId: number
      readonly product: ProductKind
      readonly amount: number
    }
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
  | {
      readonly type: 'producerPickerReady'
      readonly zone: 'farm' | 'kitchen'
      readonly slot: number
    }
  | {
      readonly type: 'plantSwapReady'
      readonly zone: 'fruit' | 'veg'
      readonly slot: number
    }
  | { readonly type: 'coinsPending'; readonly amount: number }
  | { readonly type: 'coinsCollected'; readonly amount: number }
  | { readonly type: 'staffHarvest'; readonly staffId: number; readonly product: ProductKind }
  | { readonly type: 'staffStock'; readonly staffId: number; readonly product: ProductKind }
  | {
      readonly type: 'feed'
      readonly producerId: number
      readonly product: PlantKind
      readonly amount: number
    }
  | { readonly type: 'staffFeed'; readonly staffId: number; readonly product: PlantKind }
  | { readonly type: 'fishCast'; readonly pondId: number }
  | { readonly type: 'fishCaught'; readonly pondId: number }
  | { readonly type: 'fishFull'; readonly pondId: number }
  | { readonly type: 'discard'; readonly product: ProductKind; readonly amount: number }
  | { readonly type: 'drinkMenuReady' }
  | { readonly type: 'drinkBought'; readonly drink: DrinkKind; readonly price: number }
  | { readonly type: 'diningReady'; readonly seat: number }
  | {
      readonly type: 'ate'
      readonly product: ProductKind
      readonly buffs: readonly DrinkKind[]
    }
  | { readonly type: 'staffMeal'; readonly staffId: number; readonly product: ProductKind }
  | { readonly type: 'staffDrink'; readonly staffId: number }
  | { readonly type: 'staffLazy'; readonly staffId: number; readonly kind: StaffKind }
  | { readonly type: 'staffUrged'; readonly staffId: number }
  | { readonly type: 'tutorial'; readonly step: TutorialStep }
  | { readonly type: 'dayEnded'; readonly report: DayReport }

export interface StepInput {
  readonly moveX: number
  readonly moveY: number
  /** Scene modals set this false so standing near a table cannot auto-sit. */
  readonly allowAutoSit?: boolean
}

export interface StepResult {
  readonly state: ShopState
  readonly events: readonly GameEvent[]
}
