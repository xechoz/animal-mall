import type {
  AnimalProductKind,
  DrinkKind,
  FruitKind,
  PlantKind,
  ProcessedKind,
  ProductKind,
  ShopMap,
  SpeciesId,
  StaffKind,
  UpgradeKind,
  Vec2,
  VegKind,
  WanderTuning,
  ZoneId,
} from './types'

export const PLAYER_RADIUS = 15
export const CUSTOMER_RADIUS = 12
export const NAV_CELL = 20

export const FRUIT_ORDER: readonly FruitKind[] = [
  'apple',
  'pear',
  'peach',
  'cherry',
  'strawberry',
  'grape',
]
export const VEG_ORDER: readonly VegKind[] = [
  'carrot',
  'tomato',
  'corn',
  'pumpkin',
  'potato',
  'eggplant',
]
export const ANIMAL_ORDER: readonly AnimalProductKind[] = ['egg', 'milk', 'yarn', 'fish']
export const PROCESSED_ORDER: readonly ProcessedKind[] = ['cake', 'sweater', 'grilledFish']
export const PLANT_ORDER: readonly PlantKind[] = [...FRUIT_ORDER, ...VEG_ORDER]
export const PRODUCT_ORDER: readonly ProductKind[] = [
  ...FRUIT_ORDER,
  ...VEG_ORDER,
  ...ANIMAL_ORDER,
  ...PROCESSED_ORDER,
]
export const ZONE_ORDER: readonly ZoneId[] = ['fruit', 'veg', 'farm', 'kitchen']

export const ZONE_PRODUCTS: Readonly<Record<ZoneId, readonly ProductKind[]>> = {
  fruit: FRUIT_ORDER,
  veg: VEG_ORDER,
  farm: ANIMAL_ORDER,
  kitchen: PROCESSED_ORDER,
}

export function isFruitKind(value: unknown): value is FruitKind {
  return typeof value === 'string' && (FRUIT_ORDER as readonly string[]).includes(value)
}

export function isVegKind(value: unknown): value is VegKind {
  return typeof value === 'string' && (VEG_ORDER as readonly string[]).includes(value)
}

export function isPlantKind(value: unknown): value is PlantKind {
  return isFruitKind(value) || isVegKind(value)
}

export function isAnimalProductKind(value: unknown): value is AnimalProductKind {
  return typeof value === 'string' && (ANIMAL_ORDER as readonly string[]).includes(value)
}

export function isProcessedKind(value: unknown): value is ProcessedKind {
  return typeof value === 'string' && (PROCESSED_ORDER as readonly string[]).includes(value)
}

export function isProductKind(value: unknown): value is ProductKind {
  return isPlantKind(value) || isAnimalProductKind(value) || isProcessedKind(value)
}

export function zoneOf(product: ProductKind): ZoneId {
  if (isFruitKind(product)) return 'fruit'
  if (isVegKind(product)) return 'veg'
  if (isAnimalProductKind(product)) return 'farm'
  return 'kitchen'
}

export interface PlantConfig {
  readonly cost: number
  readonly price: number
  readonly growMs: number
  readonly fruitMs: number
  readonly maxFruit: number
}

export const PLANTS: Readonly<Record<PlantKind, PlantConfig>> = {
  apple: { cost: 80, price: 6, growMs: 8_000, fruitMs: 5_000, maxFruit: 3 },
  pear: { cost: 140, price: 9, growMs: 12_000, fruitMs: 7_000, maxFruit: 3 },
  peach: { cost: 260, price: 12, growMs: 16_000, fruitMs: 9_000, maxFruit: 4 },
  cherry: { cost: 420, price: 15, growMs: 20_000, fruitMs: 11_000, maxFruit: 4 },
  strawberry: { cost: 220, price: 10, growMs: 14_000, fruitMs: 8_000, maxFruit: 4 },
  grape: { cost: 680, price: 22, growMs: 24_000, fruitMs: 12_000, maxFruit: 3 },
  carrot: { cost: 60, price: 6, growMs: 5_000, fruitMs: 4_000, maxFruit: 3 },
  tomato: { cost: 95, price: 9, growMs: 7_000, fruitMs: 5_000, maxFruit: 3 },
  corn: { cost: 160, price: 13, growMs: 10_000, fruitMs: 6_500, maxFruit: 3 },
  pumpkin: { cost: 300, price: 22, growMs: 14_000, fruitMs: 8_000, maxFruit: 2 },
  potato: { cost: 230, price: 17, growMs: 12_000, fruitMs: 7_000, maxFruit: 3 },
  eggplant: { cost: 520, price: 30, growMs: 16_000, fruitMs: 10_000, maxFruit: 3 },
}

/** Shop and chooser order: cheapest first, independent of the demand order. */
export const PLANT_SHOP_ORDER: readonly PlantKind[] = [...PLANT_ORDER].sort(
  (a, b) => PLANTS[a].cost - PLANTS[b].cost,
)

/** Feed priority for trough consumption: cheapest whole item first. */
export const FEED_ORDER: readonly PlantKind[] = [...PLANT_ORDER].sort(
  (a, b) => PLANTS[a].price - PLANTS[b].price,
)

export interface AnimalConfig {
  readonly cost: number
  readonly price: number
  readonly cycleMs: number
  readonly capacity: number
}

export const ANIMALS: Readonly<Record<AnimalProductKind, AnimalConfig>> = {
  egg: { cost: 0, price: 12, cycleMs: 10_000, capacity: 3 },
  milk: { cost: 350, price: 20, cycleMs: 16_000, capacity: 2 },
  yarn: { cost: 550, price: 26, cycleMs: 20_000, capacity: 2 },
  fish: { cost: 250, price: 18, cycleMs: 14_000, capacity: 3 },
}

/** A trough holds one full production batch of whole produce items. */
export function troughCapacity(product: AnimalProductKind): number {
  return ANIMALS[product].capacity
}

export interface RecipeInput {
  readonly product: AnimalProductKind
  readonly count: number
}

export interface RecipeConfig {
  readonly cost: number
  readonly price: number
  readonly craftMs: number
  readonly capacity: number
  readonly inputs: readonly RecipeInput[]
}

export const RECIPES: Readonly<Record<ProcessedKind, RecipeConfig>> = {
  cake: {
    cost: 0,
    price: 50,
    craftMs: 12_000,
    capacity: 3,
    inputs: [
      { product: 'egg', count: 2 },
      { product: 'milk', count: 1 },
    ],
  },
  sweater: {
    cost: 450,
    price: 70,
    craftMs: 16_000,
    capacity: 3,
    inputs: [{ product: 'yarn', count: 2 }],
  },
  grilledFish: {
    cost: 320,
    price: 55,
    craftMs: 10_000,
    capacity: 3,
    inputs: [{ product: 'fish', count: 1 }],
  },
}

/** Dev-only overrides. Empty in normal play; the dev panel edits these live. */
export const DEV_TUNING: {
  prices: Partial<Record<ProductKind, number>>
  drinkPrices: Partial<Record<DrinkKind, number>>
} = {
  prices: {},
  drinkPrices: {},
}

export function defaultProductPrice(product: ProductKind): number {
  if (isPlantKind(product)) return PLANTS[product].price
  if (isAnimalProductKind(product)) return ANIMALS[product].price
  return RECIPES[product].price
}

export function productPrice(product: ProductKind): number {
  return DEV_TUNING.prices[product] ?? defaultProductPrice(product)
}

export function producerCost(product: ProductKind): number {
  if (isPlantKind(product)) return PLANTS[product].cost
  if (isAnimalProductKind(product)) return ANIMALS[product].cost
  return RECIPES[product].cost
}

export const UPGRADE_ORDER: readonly UpgradeKind[] = [
  'carry',
  'shelf',
  'speed',
  'scan',
  'fertilizer',
]

export interface UpgradeConfig {
  readonly costs: readonly number[]
}

export const UPGRADES: Readonly<Record<UpgradeKind, UpgradeConfig>> = {
  carry: { costs: [50, 140, 300] },
  shelf: { costs: [40, 120, 260] },
  speed: { costs: [40, 130, 280] },
  scan: { costs: [40, 130, 280] },
  fertilizer: { costs: [80, 200, 420] },
}

export const UPGRADE_EFFECT: Readonly<Record<UpgradeKind, number>> = {
  carry: 2,
  shelf: 2,
  speed: 8,
  scan: 12,
  fertilizer: 10,
}

export const STAFF_ORDER: readonly StaffKind[] = ['cashier', 'picker']

export interface StaffConfig {
  readonly costs: readonly number[]
  readonly species: SpeciesId
  readonly speed: number
  readonly carry: number
  readonly harvestMs: number
  readonly stockMs: number
  readonly feedMs: number
}

export const STAFF: Readonly<Record<StaffKind, StaffConfig>> = {
  cashier: {
    costs: [320],
    species: 'cat',
    speed: 0,
    carry: 0,
    harvestMs: 0,
    stockMs: 0,
    feedMs: 0,
  },
  picker: {
    costs: [260, 680],
    species: 'rabbit',
    speed: 112,
    carry: 4,
    harvestMs: 520,
    stockMs: 320,
    feedMs: 260,
  },
}

export const DRINK_ORDER: readonly DrinkKind[] = ['appleSoda', 'milkTea', 'lemonTea']

export interface DrinkConfig {
  readonly price: number
  readonly durationMs: number
  readonly speedBonus: number
  readonly carryBonus: number
  readonly scanBonus: number
}

export const DRINKS: Readonly<Record<DrinkKind, DrinkConfig>> = {
  appleSoda: {
    price: 20,
    durationMs: 45_000,
    speedBonus: 0.15,
    carryBonus: 0,
    scanBonus: 0,
  },
  milkTea: {
    price: 35,
    durationMs: 45_000,
    speedBonus: 0,
    carryBonus: 3,
    scanBonus: 0,
  },
  lemonTea: {
    price: 30,
    durationMs: 45_000,
    speedBonus: 0,
    carryBonus: 0,
    scanBonus: 0.25,
  },
}

export function defaultDrinkPrice(kind: DrinkKind): number {
  return DRINKS[kind].price
}

export function drinkPrice(kind: DrinkKind): number {
  return DEV_TUNING.drinkPrices[kind] ?? defaultDrinkPrice(kind)
}

export function zeroBuffs(): Record<DrinkKind, number> {
  return Object.fromEntries(DRINK_ORDER.map((kind) => [kind, 0])) as Record<DrinkKind, number>
}

export const REST = {
  workMs: 60_000,
  workStaggerMs: 8_000,
  drinkMs: 7_000,
  returnPercent: 60,
  urgeRadius: 80,
  walkSpeed: 92,
} as const

export const FACILITY_DWELL_MS = 500
export const TRASH_RADIUS = 58
export const DRINK_RADIUS = 48

export const FISHING = {
  /** How far outside the pond rectangle still counts as standing at it. */
  margin: 42,
  castMs: 500,
  catchMs: 500,
  /** Short pause between catches so the rod visibly re-casts. */
  repeatMs: 350,
} as const

export const INTERACTION = {
  /** Pointer travel above this cancels a tap and a long press. */
  tapSlop: 12,
  /** Long-press threshold for opening a planted bed's swap chooser. */
  holdMs: 420,
  /** Extra touch area around a plot, in world units. */
  plotHitPadding: 12,
  /** Extra touch area around an offer label, in UI units. */
  labelHitPadding: 8,
} as const

export const QUICK_BUY = {
  openMs: 500,
  buyMs: 1_000,
  zoneMs: 500,
  radius: 62,
  stationRadius: 80,
  /** How far outside a zone footprint still counts as standing at it. */
  zoneMargin: 36,
  /** How far outside a crop bed still counts as standing at that bed. */
  plotMargin: 38,
} as const

export function carryCapacity(level: number): number {
  return 6 + level * 2
}

export function shelfCapacity(level: number): number {
  return 8 + level * 2
}

export function moveSpeed(level: number): number {
  return Math.round(170 * (1 + level * 0.08))
}

export function scanIntervalMs(level: number): number {
  return Math.max(260, Math.round(520 * (1 - level * 0.12)))
}

export function fertilizerMultiplier(level: number): number {
  return 1 + level * 0.1
}

export interface ZoneConfig {
  readonly unlockCost: number
  readonly includes: ProductKind | null
}

export const ZONES: Readonly<Record<ZoneId, ZoneConfig>> = {
  fruit: { unlockCost: 0, includes: null },
  veg: { unlockCost: 0, includes: null },
  farm: { unlockCost: 350, includes: 'egg' },
  kitchen: { unlockCost: 800, includes: 'cake' },
}

export const REGISTER_RADIUS = 50

export function producerPosition(map: ShopMap, product: ProductKind, slot: number): Vec2 {
  if (isPlantKind(product)) {
    const zone = isFruitKind(product) ? 'fruit' : 'veg'
    const point = map.plantSlots[zone][slot] ?? map.plantSlots[zone][0]
    return point === undefined ? map.playerStart : { x: point.x, y: point.y }
  }
  if (isAnimalProductKind(product)) {
    const pen = map.animalPens[product]
    return { x: pen.x, y: pen.y }
  }
  const station = map.stationSlots[product]
  return { x: station.x, y: station.y }
}

export function producerAccess(map: ShopMap, product: ProductKind, slot: number): Vec2 {
  if (isPlantKind(product)) {
    const zone = isFruitKind(product) ? 'fruit' : 'veg'
    return map.plantAccess[zone][slot] ?? map.playerStart
  }
  if (isAnimalProductKind(product)) return map.animalAccess[product]
  return map.stationAccess[product]
}

export {
  LANDSCAPE_MAP,
  PEN_SIZE,
  PLANT_FIELDS,
  PLOT_SIZE,
  PORTRAIT_MAP,
  plantSlotCount,
  STATION_SIZE,
  shopMapFor,
} from './shopMap'

export const CUSTOMER_SPECIES: readonly SpeciesId[] = [
  'cat',
  'rabbit',
  'fox',
  'panda',
  'frog',
  'pig',
  'dog',
]

export const CUSTOMER_TUNING = {
  speed: 58,
  patienceMs: 60_000,
  tutorialPatienceMs: 120_000,
  spawnMs: 7_000,
  spawnJitterMs: 1_500,
  maxCustomers: 6,
  maxQueue: 4,
  pickMs: 450,
  shelfWaitMs: 3_500,
  queuePatienceFactor: 0.65,
} as const

export const WANDER: Readonly<Record<'customer' | 'staff', WanderTuning>> = {
  customer: { chance: 0.4, minLeg: 120, minExtra: 20, maxExtra: 0.3, maxOffset: 120 },
  staff: { chance: 0.2, minLeg: 140, minExtra: 16, maxExtra: 0.15, maxOffset: 90 },
}

export const INTERACT = {
  harvestRadius: 84,
  /** How close the player must be to a shelf edge to stock it, not to a point. */
  stockMargin: 70,
  feedRadius: 60,
  harvestMs: 240,
  stockMs: 90,
  feedMs: 200,
  trayCapacity: 999,
} as const

export const AUTO_RESERVE = 1
export const PRODUCT_WEIGHT: Readonly<Record<ZoneId, number>> = {
  fruit: 3,
  veg: 3,
  farm: 2,
  kitchen: 2,
}

export const SAVE_VERSION = 4
export const STARTING_COINS = 100
