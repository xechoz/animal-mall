import { carriedKinds } from '../logic/carry'
import { distance, distanceToRect } from '../logic/collision'
import {
  INTERACT,
  isPlantKind,
  PEN_SIZE,
  PLANTS,
  PLOT_SIZE,
  QUICK_BUY,
  REGISTER_RADIUS,
  STATION_SIZE,
  TUTORIAL,
  zoneOf,
} from '../logic/config'
import { stockReach } from '../logic/state'
import type {
  ProducerState,
  Rect,
  ShopMap,
  ShopState,
  TutorialStep,
  Vec2,
  ZoneId,
} from '../logic/types'

/**
 * `walk` targets fire on contact or by stopping there, `wait` targets only need
 * the player to stay nearby. The tap hand lives in the crop chooser, not in the
 * world guide.
 */
export type TutorialGuideMode = 'walk' | 'wait'

export interface TutorialGuide {
  readonly step: TutorialStep
  /** Stable identity of the chosen object, used to avoid target flicker. */
  readonly key: string
  /** World point the hand points at (the object centre). */
  readonly point: Vec2
  /** World point the destination arrow lands on (the player-side edge). */
  readonly marker: Vec2
  /** Interaction footprint, drawn as the highlighted area. */
  readonly rect: Rect
  readonly mode: TutorialGuideMode
  /** True once the player is close enough for the action to be possible. */
  readonly inReach: boolean
  /** Remaining wait until the whole fruit set is ready; only for `wait`. */
  readonly waitMs?: number
  readonly index: number
  readonly total: number
}

const STEP_INDEX: Readonly<Record<TutorialStep, number>> = {
  buyTree: 0,
  grow: 0,
  harvest: 1,
  stock: 2,
  checkout: 3,
  done: 3,
}
const STEP_TOTAL = 4
/** A new target must be this much closer before the guide switches beds. */
const SWITCH_MARGIN = 28

interface Candidate {
  readonly key: string
  readonly point: Vec2
  readonly marker: Vec2
  readonly rect: Rect
  readonly mode: TutorialGuideMode
  readonly distance: number
  readonly waitMs?: number
}

/** How far below the counter the player stands, on the fence side. */
export const REGISTER_STAND_OFFSET = 28

export function guideFor(state: ShopState, previous?: TutorialGuide | null): TutorialGuide {
  const step = state.tutorial
  const candidate = targetFor(state, previous ?? null, step)
  return {
    step,
    ...candidate,
    inReach: reachFor(state, candidate.rect, candidate.point, step),
    index: STEP_INDEX[step],
    total: STEP_TOTAL,
  }
}

function targetFor(
  state: ShopState,
  previous: TutorialGuide | null,
  step: TutorialStep,
): Candidate {
  switch (step) {
    case 'buyTree':
      return choose(buyTreeCandidates(state), previous, step)
    case 'grow':
      return choose(plantCandidates(state, 'grow'), previous, step)
    case 'harvest':
      return choose(plantCandidates(state, 'harvest'), previous, step)
    case 'stock':
      return choose(stockCandidates(state), previous, step)
    case 'checkout':
    case 'done':
      return registerCandidate(state)
  }
}

/**
 * The tutorial used to point at the first plot in array order, which is the
 * farthest bed from the player. Pick the closest empty bed instead and keep it
 * until another bed is clearly closer, so standing between two rows does not
 * make the marker jump every frame.
 */
function buyTreeCandidates(state: ShopState): readonly Candidate[] {
  const used = new Set(
    state.producers
      .filter((producer) => isPlantKind(producer.product) && zoneOf(producer.product) === 'fruit')
      .map((producer) => producer.slot),
  )
  const plots = state.map.plantSlots.fruit
  const open = plots.filter((plot) => !used.has(plot.index))
  const pool = open.length > 0 ? open : plots
  if (pool.length === 0) return [registerCandidate(state)]
  return pool.map((plot) => {
    const rect = centerRect(plot, PLOT_SIZE)
    return {
      key: `plot:fruit:${plot.index}`,
      point: { x: plot.x, y: plot.y },
      // The empty-bed price chip spans the top of the bed, so land the arrow
      // just beside the right edge instead of covering the price.
      marker: { x: rect.x + rect.w + 12, y: rect.y + rect.h / 2 },
      rect,
      mode: 'walk',
      distance: distanceToRect(state.player.pos, rect),
    }
  })
}

function plantCandidates(state: ShopState, step: 'grow' | 'harvest'): readonly Candidate[] {
  const plants = state.producers.filter((producer) => isPlantKind(producer.product))
  const matching =
    step === 'grow'
      ? plants.filter((producer) => !isPlantFull(producer))
      : plants.filter((producer) => producer.ready > 0)
  const pool = matching.length > 0 ? matching : plants
  if (pool.length === 0) return [registerCandidate(state)]
  return pool.map((producer) => {
    const rect = producerRect(state.map, producer)
    return {
      key: `producer:${producer.id}`,
      point: producer.pos,
      marker: { x: producer.pos.x, y: rect.y },
      rect,
      mode: step === 'grow' ? 'wait' : 'walk',
      distance: distance(state.player.pos, producer.pos),
      ...(step === 'grow' ? { waitMs: remainingWaitMs(state, producer) } : {}),
    }
  })
}

function stockCandidates(state: ShopState): readonly Candidate[] {
  const reach = stockReach(state)
  const carried = carriedKinds(state.player.carry)
  const zones = new Set<ZoneId>(reach)
  if (zones.size === 0) {
    const first = carried[0]
    zones.add(first === undefined ? 'fruit' : zoneOf(first))
  }
  return [...zones].map((zone) => {
    const rect = state.map.shelves[zone]
    return {
      key: `shelf:${zone}`,
      point: { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 },
      marker: { x: rect.x + rect.w / 2, y: rect.y },
      rect,
      mode: 'walk',
      distance: distanceToRect(state.player.pos, rect),
    }
  })
}

function registerCandidate(state: ShopState): Candidate {
  const rect = state.map.counter
  // The register machine is inside the solid counter. Guide the player to the
  // open floor below it, on the fence side, where the till can actually be
  // reached; the customer queue is on the opposite side.
  const spot = {
    x: state.map.register.x,
    y: rect.y + rect.h + REGISTER_STAND_OFFSET,
  }
  return {
    key: 'register',
    point: spot,
    marker: spot,
    rect,
    mode: 'walk',
    distance: distanceToRect(state.player.pos, rect),
  }
}

function choose(
  candidates: readonly Candidate[],
  previous: TutorialGuide | null,
  step: TutorialStep,
): Candidate {
  let best = candidates[0] as Candidate
  for (const candidate of candidates) {
    if (candidate.distance < best.distance) best = candidate
  }
  if (previous === null || previous.step !== step) return best
  const kept = candidates.find((candidate) => candidate.key === previous.key)
  return kept !== undefined && kept.distance <= best.distance + SWITCH_MARGIN ? kept : best
}

function reachFor(state: ShopState, rect: Rect, point: Vec2, step: TutorialStep): boolean {
  switch (step) {
    case 'buyTree':
    case 'grow':
      return distanceToRect(state.player.pos, rect) <= QUICK_BUY.plotMargin
    case 'harvest':
      return distance(state.player.pos, point) <= INTERACT.harvestRadius
    case 'stock':
      return distanceToRect(state.player.pos, rect) <= INTERACT.stockMargin
    case 'checkout':
    case 'done':
      return distanceToRect(state.player.pos, rect) <= REGISTER_RADIUS
  }
}

function producerRect(map: ShopMap, producer: ProducerState): Rect {
  const zone = zoneOf(producer.product)
  if (isPlantKind(producer.product) && (zone === 'fruit' || zone === 'veg')) {
    const plot = map.plantSlots[zone].find((candidate) => candidate.index === producer.slot)
    if (plot !== undefined) return centerRect(plot, PLOT_SIZE)
  }
  if (producer.kind === 'animal') {
    const pen = map.animalPens.find((candidate) => candidate.index === producer.slot)
    if (pen !== undefined) return centerRect(pen, PEN_SIZE)
  }
  if (producer.kind === 'station') {
    const station = map.stationSlots.find((candidate) => candidate.index === producer.slot)
    if (station !== undefined) return centerRect(station, STATION_SIZE)
  }
  return centerRect(producer.pos, PLOT_SIZE)
}

function isPlantFull(producer: ProducerState): boolean {
  return isPlantKind(producer.product) && producer.ready >= PLANTS[producer.product].maxFruit
}

/**
 * Real seconds until the tree fills its fruit slots. `progressMs` advances at
 * the tutorial growth multiplier, so divide by it to keep the clock honest.
 */
function remainingWaitMs(state: ShopState, producer: ProducerState): number {
  if (!isPlantKind(producer.product)) return 0
  const config = PLANTS[producer.product]
  const remaining = producer.mature
    ? Math.max(0, (config.maxFruit - producer.ready) * config.fruitMs - producer.progressMs)
    : Math.max(0, config.growMs - producer.progressMs + (config.maxFruit - 1) * config.fruitMs)
  const multiplier = state.tutorial === 'done' ? 1 : TUTORIAL.growthMultiplier
  return Math.max(0, remaining / multiplier)
}

function centerRect(center: Vec2, size: { readonly w: number; readonly h: number }): Rect {
  return {
    x: center.x - size.w / 2,
    y: center.y - size.h / 2,
    w: size.w,
    h: size.h,
  }
}
