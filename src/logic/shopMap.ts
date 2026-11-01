import type {
  Aisle,
  DiningLayout,
  FacilityLayout,
  Plot,
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
  readonly animalPens: readonly Plot[]
  readonly stationSlots: readonly Plot[]
  readonly staffStations: Readonly<Record<StaffKind, StaffSpot>>
  readonly facilities: FacilityLayout
  readonly dining: DiningLayout
  readonly aisles: readonly Aisle[]
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
  const animalAccess = input.animalPens.map(penAccess)
  const stationAccesses = input.stationSlots.map(stationAccess)

  const solid = [
    ...Object.values(input.shelves),
    input.counter,
    input.facilities.trashRect,
    input.facilities.vendingRect,
    input.dining.table,
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
    obstacles: [...solid, ...input.animalPens.map(penRect), ...input.stationSlots.map(stationRect)],
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
    fruit: { x: 46, y: 564, w: 252, h: 50 },
    veg: { x: 382, y: 564, w: 252, h: 50 },
    farm: { x: 46, y: 92, w: 252, h: 50 },
    kitchen: { x: 382, y: 92, w: 252, h: 50 },
  },
  zoneAreas: {
    fruit: { x: 32, y: 560, w: 280, h: 416 },
    veg: { x: 368, y: 560, w: 280, h: 416 },
    farm: { x: 32, y: 88, w: 280, h: 416 },
    kitchen: { x: 368, y: 88, w: 280, h: 416 },
  },
  shelfAccess: {
    fruit: { x: 172, y: 642 },
    veg: { x: 508, y: 642 },
    farm: { x: 172, y: 170 },
    kitchen: { x: 508, y: 170 },
  },
  fruitField: { ...PLANT_FIELDS.fruit, x: 102, y: 705, gapX: 140, gapY: 100 },
  vegField: { ...PLANT_FIELDS.veg, x: 428, y: 720, gapX: 80, gapY: 68 },
  animalPens: [
    { index: 0, x: 110, y: 270 },
    { index: 1, x: 220, y: 270 },
    { index: 2, x: 110, y: 410 },
    { index: 3, x: 220, y: 410 },
  ],
  stationSlots: [
    { index: 0, x: 445, y: 270 },
    { index: 1, x: 575, y: 270 },
    { index: 2, x: 445, y: 410 },
    { index: 3, x: 575, y: 410 },
  ],
  staffStations: {
    // `station` is the hire sign and quick-buy trigger; `home` is where the
    // cashier actually works. The sign sits above the trash bin, clear of both
    // the counter and the bin's own trigger area.
    cashier: { station: { x: 620, y: 1035 }, home: { x: 470, y: 1120 } },
    picker: { station: { x: 320, y: 532 }, home: { x: 320, y: 532 } },
    chef: { station: { x: 405, y: 470 }, home: { x: 510, y: 470 } },
  },
  facilities: {
    trashRect: { x: 580, y: 1104, w: 40, h: 48 },
    trashPoint: { x: 600, y: 1128 },
    trashAccess: { x: 600, y: 1070 },
    vendingRect: { x: 100, y: 1044, w: 62, h: 88 },
    vendingPoint: { x: 131, y: 1088 },
    vendingUse: { x: 131, y: 1154 },
    restMat: { x: 70, y: 980, w: 186, h: 48 },
    // The old five stools become standing spots around the dining nook:
    // staff can still drink here while both chairs are taken.
    restSpots: [
      { x: 82, y: 1030 },
      { x: 122, y: 1030 },
      { x: 163, y: 1030 },
      { x: 204, y: 1030 },
      { x: 244, y: 1030 },
    ],
  },
  dining: {
    rug: { x: 60, y: 980, w: 186, h: 56 },
    table: { x: 128, y: 988, w: 66, h: 28 },
    seats: [
      { index: 0, seat: { x: 94, y: 1008 }, stand: { x: 76, y: 1008 }, facing: 1 },
      { index: 1, seat: { x: 228, y: 1008 }, stand: { x: 246, y: 1008 }, facing: -1 },
    ],
  },
  aisles: [
    { rect: { x: 312, y: 88, w: 56, h: 888 }, vertical: true },
    { rect: { x: 32, y: 504, w: 616, h: 56 }, vertical: false },
    { rect: { x: 234, y: 976, w: 92, h: 132 }, vertical: true },
  ],
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
    { x: 600, y: 508 },
    { x: 540, y: 508 },
    { x: 480, y: 508 },
    { x: 420, y: 508 },
  ],
  shelves: {
    fruit: { x: 46, y: 92, w: 220, h: 50 },
    veg: { x: 342, y: 92, w: 220, h: 50 },
    farm: { x: 638, y: 92, w: 220, h: 50 },
    kitchen: { x: 934, y: 92, w: 220, h: 50 },
  },
  zoneAreas: {
    fruit: { x: 36, y: 88, w: 240, h: 352 },
    veg: { x: 332, y: 88, w: 240, h: 352 },
    farm: { x: 628, y: 88, w: 240, h: 352 },
    kitchen: { x: 924, y: 88, w: 240, h: 352 },
  },
  shelfAccess: {
    fruit: { x: 156, y: 170 },
    veg: { x: 452, y: 170 },
    farm: { x: 748, y: 170 },
    kitchen: { x: 1044, y: 170 },
  },
  fruitField: { ...PLANT_FIELDS.fruit, x: 91, y: 195, gapX: 130, gapY: 85 },
  vegField: { ...PLANT_FIELDS.veg, x: 382, y: 198, gapX: 70, gapY: 62 },
  animalPens: [
    { index: 0, x: 685, y: 210 },
    { index: 1, x: 815, y: 210 },
    { index: 2, x: 685, y: 370 },
    { index: 3, x: 815, y: 370 },
  ],
  stationSlots: [
    { index: 0, x: 985, y: 210 },
    { index: 1, x: 1115, y: 210 },
    { index: 2, x: 985, y: 370 },
    { index: 3, x: 1115, y: 370 },
  ],
  staffStations: {
    cashier: { station: { x: 730, y: 600 }, home: { x: 600, y: 630 } },
    picker: { station: { x: 600, y: 452 }, home: { x: 600, y: 452 } },
    chef: { station: { x: 1050, y: 460 }, home: { x: 1050, y: 250 } },
  },
  facilities: {
    trashRect: { x: 1100, y: 584, w: 40, h: 48 },
    trashPoint: { x: 1120, y: 608 },
    trashAccess: { x: 1120, y: 550 },
    vendingRect: { x: 40, y: 496, w: 62, h: 88 },
    vendingPoint: { x: 71, y: 540 },
    vendingUse: { x: 71, y: 600 },
    restMat: { x: 50, y: 590, w: 186, h: 48 },
    restSpots: [
      { x: 76, y: 614 },
      { x: 111, y: 614 },
      { x: 146, y: 614 },
      { x: 181, y: 614 },
      { x: 216, y: 614 },
    ],
  },
  dining: {
    rug: { x: 786, y: 496, w: 268, h: 140 },
    table: { x: 850, y: 524, w: 140, h: 72 },
    seats: [
      { index: 0, seat: { x: 815, y: 540 }, stand: { x: 792, y: 540 }, facing: 1 },
      { index: 1, seat: { x: 815, y: 580 }, stand: { x: 792, y: 580 }, facing: 1 },
      { index: 2, seat: { x: 1025, y: 540 }, stand: { x: 1048, y: 540 }, facing: -1 },
      { index: 3, seat: { x: 1025, y: 580 }, stand: { x: 1048, y: 580 }, facing: -1 },
    ],
  },
  aisles: [
    { rect: { x: 276, y: 88, w: 56, h: 352 }, vertical: true },
    { rect: { x: 572, y: 88, w: 56, h: 352 }, vertical: true },
    { rect: { x: 868, y: 88, w: 56, h: 352 }, vertical: true },
    { rect: { x: 36, y: 440, w: 1128, h: 56 }, vertical: false },
    { rect: { x: 234, y: 440, w: 92, h: 148 }, vertical: true },
  ],
})

export function shopMapFor(width: number, height: number): ShopMap {
  return width > height ? LANDSCAPE_MAP : PORTRAIT_MAP
}
