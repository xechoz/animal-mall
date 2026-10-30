import type {
  AnimalProductKind,
  FruitKind,
  PlantKind,
  Plot,
  ProcessedKind,
  ProductKind,
  Rect,
  SpeciesId,
  StaffKind,
  UpgradeKind,
  Vec2,
  VegKind,
  ZoneId,
} from './types'

export const ROOM_W = 680
export const ROOM_H = 1200
export const WALL = 24
export const PLAYER_RADIUS = 15
export const CUSTOMER_RADIUS = 12
export const NAV_CELL = 20

export const PLAYER_START: Vec2 = { x: 320, y: 1080 }
export const DOOR_POINT: Vec2 = { x: 280, y: 1150 }
export const DOOR_SPAWN: Vec2 = { x: 280, y: 1150 }

export const FRUIT_ORDER: readonly FruitKind[] = ['apple', 'pear', 'peach', 'cherry']
export const VEG_ORDER: readonly VegKind[] = ['carrot', 'tomato', 'corn', 'pumpkin']
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
  apple: { cost: 100, price: 4, growMs: 8_000, fruitMs: 5_000, maxFruit: 3 },
  pear: { cost: 180, price: 6, growMs: 12_000, fruitMs: 7_000, maxFruit: 3 },
  peach: { cost: 320, price: 8, growMs: 16_000, fruitMs: 9_000, maxFruit: 4 },
  cherry: { cost: 520, price: 10, growMs: 20_000, fruitMs: 11_000, maxFruit: 4 },
  carrot: { cost: 70, price: 4, growMs: 5_000, fruitMs: 4_000, maxFruit: 3 },
  tomato: { cost: 110, price: 6, growMs: 7_000, fruitMs: 5_000, maxFruit: 3 },
  corn: { cost: 190, price: 9, growMs: 10_000, fruitMs: 6_500, maxFruit: 3 },
  pumpkin: { cost: 380, price: 16, growMs: 14_000, fruitMs: 8_000, maxFruit: 2 },
}

export interface AnimalConfig {
  readonly cost: number
  readonly price: number
  readonly cycleMs: number
  readonly capacity: number
  readonly diet: readonly PlantKind[]
}

export const ANIMALS: Readonly<Record<AnimalProductKind, AnimalConfig>> = {
  egg: { cost: 0, price: 8, cycleMs: 10_000, capacity: 3, diet: ['apple', 'corn'] },
  milk: { cost: 600, price: 14, cycleMs: 16_000, capacity: 2, diet: ['pear', 'pumpkin'] },
  yarn: { cost: 900, price: 18, cycleMs: 20_000, capacity: 2, diet: ['carrot', 'peach'] },
  fish: { cost: 400, price: 12, cycleMs: 14_000, capacity: 3, diet: ['tomato'] },
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
    cost: 700,
    price: 60,
    craftMs: 16_000,
    capacity: 3,
    inputs: [{ product: 'yarn', count: 2 }],
  },
  grilledFish: {
    cost: 500,
    price: 40,
    craftMs: 10_000,
    capacity: 3,
    inputs: [{ product: 'fish', count: 1 }],
  },
}

export function productPrice(product: ProductKind): number {
  if (isPlantKind(product)) return PLANTS[product].price
  if (isAnimalProductKind(product)) return ANIMALS[product].price
  return RECIPES[product].price
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
  readonly station: Vec2
  readonly home: Vec2
  readonly species: SpeciesId
  readonly speed: number
  readonly carry: number
  readonly harvestMs: number
  readonly stockMs: number
}

export const STAFF: Readonly<Record<StaffKind, StaffConfig>> = {
  cashier: {
    costs: [320],
    station: { x: 470, y: 1120 },
    home: { x: 470, y: 1120 },
    species: 'cat',
    speed: 0,
    carry: 0,
    harvestMs: 0,
    stockMs: 0,
  },
  picker: {
    costs: [260, 680],
    station: { x: 320, y: 560 },
    home: { x: 320, y: 560 },
    species: 'rabbit',
    speed: 112,
    carry: 4,
    harvestMs: 520,
    stockMs: 320,
  },
}

export const QUICK_BUY = {
  openMs: 520,
  buyMs: 1_000,
  radius: 62,
  stationRadius: 42,
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
  readonly shelf: Rect
  readonly access: Vec2
  readonly unlockCost: number
  readonly includes: ProductKind | null
}

export const ZONES: Readonly<Record<ZoneId, ZoneConfig>> = {
  fruit: {
    shelf: { x: 60, y: 92, w: 220, h: 50 },
    access: { x: 170, y: 170 },
    unlockCost: 0,
    includes: null,
  },
  veg: {
    shelf: { x: 400, y: 92, w: 220, h: 50 },
    access: { x: 510, y: 170 },
    unlockCost: 0,
    includes: null,
  },
  farm: {
    shelf: { x: 60, y: 592, w: 220, h: 50 },
    access: { x: 170, y: 670 },
    unlockCost: 600,
    includes: 'egg',
  },
  kitchen: {
    shelf: { x: 400, y: 592, w: 220, h: 50 },
    access: { x: 510, y: 670 },
    unlockCost: 1_200,
    includes: 'cake',
  },
}

export const SHELF_RECTS: Readonly<Record<ZoneId, Rect>> = Object.fromEntries(
  ZONE_ORDER.map((zone) => [zone, ZONES[zone].shelf]),
) as Readonly<Record<ZoneId, Rect>>

export const SHELF_ACCESS: Readonly<Record<ZoneId, Vec2>> = Object.fromEntries(
  ZONE_ORDER.map((zone) => [zone, ZONES[zone].access]),
) as Readonly<Record<ZoneId, Vec2>>

export const PLOTS: readonly Plot[] = [
  { index: 0, x: 115, y: 255 },
  { index: 1, x: 225, y: 255 },
  { index: 2, x: 115, y: 385 },
  { index: 3, x: 225, y: 385 },
]

export const CROP_PLOTS: readonly Plot[] = [
  { index: 0, x: 455, y: 255 },
  { index: 1, x: 565, y: 255 },
  { index: 2, x: 455, y: 385 },
  { index: 3, x: 565, y: 385 },
]

export const PLOT_SIZE = { w: 68, h: 46 } as const

export const PLOT_ACCESS: readonly Vec2[] = PLOTS.map((plot) => ({
  x: plot.x,
  y: plot.y + PLOT_SIZE.h / 2 + 24,
}))

export const CROP_ACCESS: readonly Vec2[] = CROP_PLOTS.map((plot) => ({
  x: plot.x,
  y: plot.y + PLOT_SIZE.h / 2 + 24,
}))

export const PLANT_SLOTS: Readonly<Record<'fruit' | 'veg', readonly Plot[]>> = {
  fruit: PLOTS,
  veg: CROP_PLOTS,
}

export const PLANT_ACCESS: Readonly<Record<'fruit' | 'veg', readonly Vec2[]>> = {
  fruit: PLOT_ACCESS,
  veg: CROP_ACCESS,
}

export const ANIMAL_PENS: Readonly<Record<AnimalProductKind, Plot>> = {
  egg: { index: 0, x: 110, y: 760 },
  milk: { index: 1, x: 220, y: 760 },
  yarn: { index: 2, x: 110, y: 890 },
  fish: { index: 3, x: 220, y: 890 },
}

export const STATION_SLOTS: Readonly<Record<ProcessedKind, Plot>> = {
  cake: { index: 0, x: 455, y: 760 },
  sweater: { index: 1, x: 565, y: 760 },
  grilledFish: { index: 2, x: 455, y: 890 },
}

export const PEN_SIZE = { w: 80, h: 56 } as const
export const STATION_SIZE = { w: 80, h: 56 } as const

export const ANIMAL_ACCESS: Readonly<Record<AnimalProductKind, Vec2>> = Object.fromEntries(
  ANIMAL_ORDER.map((product) => {
    const pen = ANIMAL_PENS[product]
    return [product, { x: pen.x, y: pen.y + PEN_SIZE.h / 2 + 24 }]
  }),
) as Readonly<Record<AnimalProductKind, Vec2>>

export const STATION_ACCESS: Readonly<Record<ProcessedKind, Vec2>> = Object.fromEntries(
  PROCESSED_ORDER.map((product) => {
    const station = STATION_SLOTS[product]
    return [product, { x: station.x, y: station.y + STATION_SIZE.h / 2 + 24 }]
  }),
) as Readonly<Record<ProcessedKind, Vec2>>

export function producerPosition(product: ProductKind, slot: number): Vec2 {
  if (isPlantKind(product)) {
    const zone = isFruitKind(product) ? 'fruit' : 'veg'
    const point = PLANT_SLOTS[zone][slot] ?? PLANT_SLOTS[zone][0]
    return point === undefined ? PLAYER_START : { x: point.x, y: point.y }
  }
  if (isAnimalProductKind(product)) {
    const pen = ANIMAL_PENS[product]
    return { x: pen.x, y: pen.y }
  }
  const station = STATION_SLOTS[product]
  return { x: station.x, y: station.y }
}

export function producerAccess(product: ProductKind, slot: number): Vec2 {
  if (isPlantKind(product)) {
    const zone = isFruitKind(product) ? 'fruit' : 'veg'
    return PLANT_ACCESS[zone][slot] ?? PLAYER_START
  }
  if (isAnimalProductKind(product)) return ANIMAL_ACCESS[product]
  return STATION_ACCESS[product]
}

export const COUNTER_RECT: Rect = { x: 380, y: 1040, w: 180, h: 60 }
export const REGISTER_POINT: Vec2 = { x: 470, y: 1070 }
export const REGISTER_RADIUS = 50

export const QUEUE_SLOTS: readonly Vec2[] = [
  { x: 560, y: 1005 },
  { x: 500, y: 1005 },
  { x: 440, y: 1005 },
  { x: 380, y: 1005 },
]

export const STATIC_OBSTACLES: readonly Rect[] = [
  ...ZONE_ORDER.map((zone) => SHELF_RECTS[zone]),
  ...PLOTS.map((plot) => ({
    x: plot.x - PLOT_SIZE.w / 2,
    y: plot.y - PLOT_SIZE.h / 2,
    w: PLOT_SIZE.w,
    h: PLOT_SIZE.h,
  })),
  ...CROP_PLOTS.map((plot) => ({
    x: plot.x - PLOT_SIZE.w / 2,
    y: plot.y - PLOT_SIZE.h / 2,
    w: PLOT_SIZE.w,
    h: PLOT_SIZE.h,
  })),
  ...ANIMAL_ORDER.map((product) => {
    const pen = ANIMAL_PENS[product]
    return {
      x: pen.x - PEN_SIZE.w / 2,
      y: pen.y - PEN_SIZE.h / 2,
      w: PEN_SIZE.w,
      h: PEN_SIZE.h,
    }
  }),
  ...PROCESSED_ORDER.map((product) => {
    const station = STATION_SLOTS[product]
    return {
      x: station.x - STATION_SIZE.w / 2,
      y: station.y - STATION_SIZE.h / 2,
      w: STATION_SIZE.w,
      h: STATION_SIZE.h,
    }
  }),
  COUNTER_RECT,
]

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

export const INTERACT = {
  harvestRadius: 84,
  stockRadius: 66,
  harvestMs: 240,
  stockMs: 90,
  trayCapacity: 999,
} as const

export const AUTO_RESERVE = 1
export const PRODUCT_WEIGHT: Readonly<Record<ZoneId, number>> = {
  fruit: 3,
  veg: 3,
  farm: 2,
  kitchen: 2,
}

export const SAVE_VERSION = 3
export const STARTING_COINS = 100
