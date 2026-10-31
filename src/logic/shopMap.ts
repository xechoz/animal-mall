import type {
  AnimalProductKind,
  FacilityLayout,
  Plot,
  ProcessedKind,
  Rect,
  ShopMap,
  ShopMapId,
  StaffKind,
  StaffSpot,
  Vec2,
  ZoneId,
} from './types'

export const PLOT_SIZE = { w: 68, h: 46 } as const
export const PEN_SIZE = { w: 80, h: 56 } as const
export const STATION_SIZE = { w: 80, h: 56 } as const

const ACCESS_GAP = 24

/**
 * Planting grids are configuration, not hard-coded arrays. Fruit trees need
 * more room than vegetables, so the two zones can use different shapes.
 * Change these values and the floor plan, save-slot validation and shop art
 * all follow.
 */
export interface PlantField {
  readonly cols: number
  readonly rows: number
}

export const PLANT_FIELDS: Readonly<Record<'fruit' | 'veg', PlantField>> = {
  fruit: { cols: 2, rows: 3 },
  veg: { cols: 3, rows: 4 },
}

export function plantSlotCount(zone: 'fruit' | 'veg'): number {
  const field = PLANT_FIELDS[zone]
  return field.cols * field.rows
}

interface FieldLayout extends PlantField {
  readonly x: number
  readonly y: number
  readonly gapX: number
  readonly gapY: number
}

function fieldPlots(field: FieldLayout): readonly Plot[] {
  const plots: Plot[] = []
  for (let row = 0; row < field.rows; row += 1) {
    for (let column = 0; column < field.cols; column += 1) {
      plots.push({
        index: row * field.cols + column,
        x: field.x + column * field.gapX,
        y: field.y + row * field.gapY,
      })
    }
  }
  return plots
}

interface ShopMapInput {
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
  readonly zoneAreas: Readonly<Record<ZoneId, Rect>>
  readonly shelfAccess: Readonly<Record<ZoneId, Vec2>>
  readonly fruitField: FieldLayout
  readonly vegField: FieldLayout
  readonly animalPens: Readonly<Record<AnimalProductKind, Plot>>
  readonly stationSlots: Readonly<Record<ProcessedKind, Plot>>
  readonly staffStations: Readonly<Record<StaffKind, StaffSpot>>
  readonly facilities: FacilityLayout
}

function plotAccess(plot: Plot): Vec2 {
  return { x: plot.x, y: plot.y + PLOT_SIZE.h / 2 + ACCESS_GAP }
}

function penAccess(pen: Plot): Vec2 {
  return { x: pen.x, y: pen.y + PEN_SIZE.h / 2 + ACCESS_GAP }
}

function stationAccess(station: Plot): Vec2 {
  return { x: station.x, y: station.y + STATION_SIZE.h / 2 + ACCESS_GAP }
}

function penRect(pen: Plot): Rect {
  return {
    x: pen.x - PEN_SIZE.w / 2,
    y: pen.y - PEN_SIZE.h / 2,
    w: PEN_SIZE.w,
    h: PEN_SIZE.h,
  }
}

function stationRect(station: Plot): Rect {
  return {
    x: station.x - STATION_SIZE.w / 2,
    y: station.y - STATION_SIZE.h / 2,
    w: STATION_SIZE.w,
    h: STATION_SIZE.h,
  }
}

function createShopMap(input: ShopMapInput): ShopMap {
  const plots = fieldPlots(input.fruitField)
  const cropPlots = fieldPlots(input.vegField)
  const animalAccess = Object.fromEntries(
    Object.entries(input.animalPens).map(([product, pen]) => [product, penAccess(pen)]),
  ) as Record<AnimalProductKind, Vec2>
  const stationAccesses = Object.fromEntries(
    Object.entries(input.stationSlots).map(([product, station]) => [
      product,
      stationAccess(station),
    ]),
  ) as Record<ProcessedKind, Vec2>

  const solid = [
    ...Object.values(input.shelves),
    input.counter,
    input.facilities.trashRect,
    input.facilities.vendingRect,
  ]

  return {
    ...input,
    plots,
    cropPlots,
    plantSlots: { fruit: plots, veg: cropPlots },
    plantAccess: {
      fruit: plots.map(plotAccess),
      veg: cropPlots.map(plotAccess),
    },
    animalAccess,
    stationAccess: stationAccesses,
    obstacles: [
      ...solid,
      ...Object.values(input.animalPens).map(penRect),
      ...Object.values(input.stationSlots).map(stationRect),
    ],
    playerObstacles: solid,
  }
}

export const PORTRAIT_MAP: ShopMap = createShopMap({
  id: 'portrait',
  room: { w: 680, h: 1200 },
  wall: 24,
  playerStart: { x: 320, y: 1080 },
  doorPoint: { x: 280, y: 1150 },
  doorSpawn: { x: 280, y: 1150 },
  counter: { x: 380, y: 1040, w: 180, h: 60 },
  register: { x: 470, y: 1070 },
  queueSlots: [
    { x: 560, y: 1005 },
    { x: 500, y: 1005 },
    { x: 440, y: 1005 },
    { x: 380, y: 1005 },
  ],
  shelves: {
    fruit: { x: 60, y: 592, w: 220, h: 50 },
    veg: { x: 400, y: 592, w: 220, h: 50 },
    farm: { x: 60, y: 92, w: 220, h: 50 },
    kitchen: { x: 400, y: 92, w: 220, h: 50 },
  },
  zoneAreas: {
    fruit: { x: 44, y: 590, w: 252, h: 405 },
    veg: { x: 384, y: 590, w: 252, h: 405 },
    farm: { x: 44, y: 90, w: 252, h: 420 },
    kitchen: { x: 384, y: 90, w: 252, h: 420 },
  },
  shelfAccess: {
    fruit: { x: 170, y: 670 },
    veg: { x: 510, y: 670 },
    farm: { x: 170, y: 170 },
    kitchen: { x: 510, y: 170 },
  },
  fruitField: { ...PLANT_FIELDS.fruit, x: 115, y: 735, gapX: 110, gapY: 100 },
  vegField: { ...PLANT_FIELDS.veg, x: 430, y: 758, gapX: 80, gapY: 68 },
  animalPens: {
    egg: { index: 0, x: 110, y: 255 },
    milk: { index: 1, x: 220, y: 255 },
    yarn: { index: 2, x: 110, y: 385 },
    fish: { index: 3, x: 220, y: 385 },
  },
  stationSlots: {
    cake: { index: 0, x: 455, y: 255 },
    sweater: { index: 1, x: 565, y: 255 },
    grilledFish: { index: 2, x: 455, y: 385 },
    juice: { index: 3, x: 565, y: 385 },
  },
  staffStations: {
    // `station` is the hire sign and quick-buy trigger; `home` is where the
    // cashier actually works. The sign sits above the trash bin, clear of both
    // the counter and the bin's own trigger area.
    cashier: { station: { x: 620, y: 1035 }, home: { x: 470, y: 1120 } },
    picker: { station: { x: 320, y: 560 }, home: { x: 320, y: 560 } },
  },
  facilities: {
    trashRect: { x: 580, y: 1104, w: 40, h: 48 },
    trashPoint: { x: 600, y: 1128 },
    trashAccess: { x: 600, y: 1070 },
    vendingRect: { x: 100, y: 1015, w: 62, h: 88 },
    vendingPoint: { x: 131, y: 1059 },
    vendingUse: { x: 131, y: 1125 },
    restMat: { x: 70, y: 952, w: 118, h: 48 },
    restSpots: [
      { x: 96, y: 980 },
      { x: 131, y: 980 },
      { x: 166, y: 980 },
    ],
  },
})

export const LANDSCAPE_MAP: ShopMap = createShopMap({
  id: 'landscape',
  room: { w: 1200, h: 680 },
  wall: 24,
  playerStart: { x: 300, y: 600 },
  doorPoint: { x: 280, y: 630 },
  doorSpawn: { x: 280, y: 630 },
  counter: { x: 510, y: 540, w: 180, h: 60 },
  register: { x: 600, y: 570 },
  queueSlots: [
    { x: 600, y: 500 },
    { x: 540, y: 500 },
    { x: 480, y: 500 },
    { x: 420, y: 500 },
  ],
  shelves: {
    fruit: { x: 40, y: 92, w: 220, h: 50 },
    veg: { x: 340, y: 92, w: 220, h: 50 },
    farm: { x: 640, y: 92, w: 220, h: 50 },
    kitchen: { x: 940, y: 92, w: 220, h: 50 },
  },
  zoneAreas: {
    fruit: { x: 40, y: 88, w: 220, h: 300 },
    veg: { x: 340, y: 88, w: 220, h: 300 },
    farm: { x: 640, y: 88, w: 220, h: 300 },
    kitchen: { x: 940, y: 88, w: 220, h: 300 },
  },
  shelfAccess: {
    fruit: { x: 150, y: 170 },
    veg: { x: 450, y: 170 },
    farm: { x: 750, y: 170 },
    kitchen: { x: 1050, y: 170 },
  },
  fruitField: { ...PLANT_FIELDS.fruit, x: 85, y: 195, gapX: 130, gapY: 65 },
  vegField: { ...PLANT_FIELDS.veg, x: 380, y: 198, gapX: 70, gapY: 55 },
  animalPens: {
    egg: { index: 0, x: 685, y: 200 },
    milk: { index: 1, x: 815, y: 200 },
    yarn: { index: 2, x: 685, y: 340 },
    fish: { index: 3, x: 815, y: 340 },
  },
  stationSlots: {
    cake: { index: 0, x: 985, y: 200 },
    sweater: { index: 1, x: 1115, y: 200 },
    grilledFish: { index: 2, x: 985, y: 340 },
    juice: { index: 3, x: 1115, y: 340 },
  },
  staffStations: {
    cashier: { station: { x: 730, y: 600 }, home: { x: 600, y: 630 } },
    picker: { station: { x: 600, y: 450 }, home: { x: 600, y: 450 } },
  },
  facilities: {
    trashRect: { x: 1100, y: 584, w: 40, h: 48 },
    trashPoint: { x: 1120, y: 608 },
    trashAccess: { x: 1120, y: 550 },
    vendingRect: { x: 100, y: 500, w: 62, h: 88 },
    vendingPoint: { x: 131, y: 544 },
    vendingUse: { x: 131, y: 608 },
    restMat: { x: 70, y: 432, w: 118, h: 48 },
    restSpots: [
      { x: 96, y: 460 },
      { x: 131, y: 460 },
      { x: 166, y: 460 },
    ],
  },
})

export function shopMapFor(width: number, height: number): ShopMap {
  return width > height ? LANDSCAPE_MAP : PORTRAIT_MAP
}
