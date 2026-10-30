import type { FruitKind, Plot, Rect, SpeciesId, StaffKind, UpgradeKind, Vec2 } from './types'

export const ROOM = 640
export const WALL = 24
export const PLAYER_RADIUS = 15
export const CUSTOMER_RADIUS = 12
export const NAV_CELL = 20

export const PLAYER_START: Vec2 = { x: 360, y: 580 }
export const DOOR_POINT: Vec2 = { x: 320, y: 596 }
export const DOOR_SPAWN: Vec2 = { x: 320, y: 596 }

export const FRUIT_ORDER: readonly FruitKind[] = ['apple', 'pear', 'peach', 'cherry']

export interface FruitConfig {
  readonly cost: number
  readonly price: number
  readonly growMs: number
  readonly fruitMs: number
  readonly maxFruit: number
}

export const FRUITS: Readonly<Record<FruitKind, FruitConfig>> = {
  apple: { cost: 100, price: 4, growMs: 8_000, fruitMs: 5_000, maxFruit: 3 },
  pear: { cost: 180, price: 6, growMs: 12_000, fruitMs: 7_000, maxFruit: 3 },
  peach: { cost: 320, price: 8, growMs: 16_000, fruitMs: 9_000, maxFruit: 4 },
  cherry: { cost: 520, price: 10, growMs: 20_000, fruitMs: 11_000, maxFruit: 4 },
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
    station: { x: 392, y: 514 },
    home: { x: 506, y: 566 },
    species: 'cat',
    speed: 0,
    carry: 0,
    harvestMs: 0,
    stockMs: 0,
  },
  picker: {
    costs: [260, 680],
    station: { x: 178, y: 236 },
    home: { x: 330, y: 360 },
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
  radius: 58,
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

const SHELF_W = 100
const SHELF_H = 58
const SHELF_GAP = 26
const SHELF_TOP = 86
const SHELF_START_X =
  (ROOM - (FRUIT_ORDER.length * SHELF_W + (FRUIT_ORDER.length - 1) * SHELF_GAP)) / 2

export const SHELF_RECTS: Readonly<Record<FruitKind, Rect>> = Object.fromEntries(
  FRUIT_ORDER.map((kind, index) => [
    kind,
    {
      x: SHELF_START_X + index * (SHELF_W + SHELF_GAP),
      y: SHELF_TOP,
      w: SHELF_W,
      h: SHELF_H,
    },
  ]),
) as Readonly<Record<FruitKind, Rect>>

export const SHELF_ACCESS: Readonly<Record<FruitKind, Vec2>> = Object.fromEntries(
  FRUIT_ORDER.map((kind) => {
    const rect = SHELF_RECTS[kind]
    return [kind, { x: rect.x + rect.w / 2, y: rect.y + rect.h + 34 }]
  }),
) as Readonly<Record<FruitKind, Vec2>>

export const PLOTS: readonly Plot[] = [
  { index: 0, x: 112, y: 306 },
  { index: 1, x: 244, y: 306 },
  { index: 2, x: 112, y: 446 },
  { index: 3, x: 244, y: 446 },
]

export const PLOT_SIZE = { w: 68, h: 46 } as const

export const PLOT_ACCESS: readonly Vec2[] = PLOTS.map((plot) => ({
  x: plot.x,
  y: plot.y + PLOT_SIZE.h / 2 + 24,
}))

export const COUNTER_RECT: Rect = { x: 424, y: 486, w: 164, h: 56 }
export const REGISTER_POINT: Vec2 = { x: 506, y: 514 }
export const REGISTER_RADIUS = 72

export const QUEUE_SLOTS: readonly Vec2[] = [
  { x: 506, y: 456 },
  { x: 442, y: 456 },
  { x: 378, y: 456 },
  { x: 314, y: 456 },
]

export const STATIC_OBSTACLES: readonly Rect[] = [
  ...FRUIT_ORDER.map((kind) => SHELF_RECTS[kind]),
  COUNTER_RECT,
  ...PLOTS.map((plot) => ({
    x: plot.x - PLOT_SIZE.w / 2,
    y: plot.y - PLOT_SIZE.h / 2,
    w: PLOT_SIZE.w,
    h: PLOT_SIZE.h,
  })),
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
  harvestRadius: 82,
  stockRadius: 66,
  harvestMs: 240,
  stockMs: 90,
  trayCapacity: 999,
} as const

export const SAVE_VERSION = 2
export const STARTING_COINS = 100
