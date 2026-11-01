import { distance } from './collision'
import {
  ANIMALS,
  FEED_ORDER,
  FRUIT_ORDER,
  INTERACT,
  isAnimalProductKind,
  isPlantKind,
  isProcessedKind,
  PLANTS,
  PRODUCT_ORDER,
  producerPosition,
  RECIPES,
  type RecipeConfig,
  type RecipeInput,
  STATION_BUFFER_BATCHES,
  shelfCapacity,
  troughCapacity,
  VEG_ORDER,
  ZONE_ORDER,
  ZONE_PRODUCTS,
  zoneOf,
} from './config'
import type {
  AnimalProductKind,
  GameEvent,
  PlantKind,
  ProducerState,
  ProductKind,
  ShelfLevels,
  ShelfState,
  ShopMap,
  Vec2,
  ZoneId,
  ZoneUnlocks,
} from './types'

export function createProducer(
  product: ProductKind,
  slot: number,
  id: number,
  map: ShopMap,
  fresh = false,
): ProducerState {
  const kind = isPlantKind(product) ? 'plant' : isAnimalProductKind(product) ? 'animal' : 'station'
  return {
    id,
    kind,
    product,
    slot,
    pos: producerPosition(map, product, slot),
    progressMs: 0,
    ready: fresh ? 0 : kind === 'plant' ? 1 : 0,
    mature: fresh ? false : kind === 'plant',
    hungry: false,
    feed: {},
    hopper: {},
  }
}

export function emptyShelves(zones: ZoneUnlocks, levels: ShelfLevels): Record<ZoneId, ShelfState> {
  return Object.fromEntries(
    ZONE_ORDER.map((zone) => {
      const capacity = shelfCapacity(levels[zone])
      const stock = Object.fromEntries(PRODUCT_ORDER.map((product) => [product, 0])) as Record<
        ProductKind,
        number
      >
      const bins = Object.fromEntries(PRODUCT_ORDER.map((product) => [product, false])) as Record<
        ProductKind,
        boolean
      >
      const everStocked = Object.fromEntries(
        PRODUCT_ORDER.map((product) => [product, false]),
      ) as Record<ProductKind, boolean>
      return [
        zone,
        {
          zone,
          capacity,
          active: zones[zone],
          bins,
          stock,
          everStocked,
        } satisfies ShelfState,
      ]
    }),
  ) as Record<ZoneId, ShelfState>
}

export function refreshShelves(
  shelves: Record<ZoneId, ShelfState>,
  producers: readonly ProducerState[],
  zones: ZoneUnlocks,
  levels: ShelfLevels,
): Record<ZoneId, ShelfState> {
  const bins = new Set(producers.map((producer) => producer.product))
  return Object.fromEntries(
    ZONE_ORDER.map((zone) => {
      const shelf = shelves[zone]
      const capacity = shelfCapacity(levels[zone])
      const stock = { ...shelf.stock }
      const everStocked = { ...shelf.everStocked }
      const nextBins = { ...shelf.bins }
      for (const product of ZONE_PRODUCTS[zone]) {
        const exists = bins.has(product)
        nextBins[product] = exists
        // Stock produced before a crop or machine was swapped stays on the
        // shelf and can still be sold. Only an empty, unproduced bin is retired.
        if (!exists && stock[product] <= 0) everStocked[product] = false
      }
      for (const product of PRODUCT_ORDER) {
        stock[product] = Math.min(stock[product], capacity)
      }
      return [
        zone,
        {
          ...shelf,
          capacity,
          active: zones[zone],
          bins: nextBins,
          stock,
          everStocked,
        },
      ]
    }),
  ) as Record<ZoneId, ShelfState>
}

export function stepProduction(
  producers: readonly ProducerState[],
  shelves: Record<ZoneId, ShelfState>,
  dtMs: number,
  growthMultiplier: number,
): {
  producers: readonly ProducerState[]
  shelves: Record<ZoneId, ShelfState>
  events: GameEvent[]
} {
  let nextShelves = shelves
  const events: GameEvent[] = []
  const nextProducers = producers.map((producer) => {
    if (producer.kind === 'plant') return advancePlant(producer, dtMs, growthMultiplier, events)
    if (producer.kind === 'animal') return advanceAnimal(producer, dtMs, events)
    const result = advanceStation(producer, nextShelves, dtMs, events)
    nextShelves = result.shelves
    return result.producer
  })
  return { producers: nextProducers, shelves: nextShelves, events }
}

export function stockOf(
  shelves: Readonly<Record<ZoneId, ShelfState>>,
  product: ProductKind,
): number {
  return shelves[zoneOf(product)].stock[product]
}

export function binReady(
  shelves: Readonly<Record<ZoneId, ShelfState>>,
  product: ProductKind,
): boolean {
  const shelf = shelves[zoneOf(product)]
  return shelf.active && (shelf.bins[product] || shelf.stock[product] > 0)
}

export function eligibleProducts(
  shelves: Readonly<Record<ZoneId, ShelfState>>,
): readonly ProductKind[] {
  return PRODUCT_ORDER.filter((product) => {
    const shelf = shelves[zoneOf(product)]
    return (
      shelf.active &&
      (shelf.stock[product] > 0 || (shelf.bins[product] && shelf.everStocked[product]))
    )
  })
}

/** Products that only exist as leftover stock, with no producer behind them. */
export function clearanceProducts(
  shelves: Readonly<Record<ZoneId, ShelfState>>,
): readonly ProductKind[] {
  return PRODUCT_ORDER.filter((product) => {
    const shelf = shelves[zoneOf(product)]
    return shelf.active && !shelf.bins[product] && shelf.stock[product] > 0
  })
}

export function nearestCollectable(
  producers: readonly ProducerState[],
  pos: Vec2,
  map: ShopMap,
): ProducerState | null {
  let best: ProducerState | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const producer of producers) {
    if (producer.ready <= 0) continue
    // Pen animals are collected from the front access point, so standing at the
    // trough also picks up the egg/milk/yarn the animal just finished.
    const anchor =
      producer.kind === 'animal' &&
      isAnimalProductKind(producer.product) &&
      producer.product !== 'fish'
        ? map.animalAccess[producer.product]
        : producer.pos
    const distanceToProducer = distance(pos, anchor)
    if (distanceToProducer <= INTERACT.harvestRadius && distanceToProducer < bestDistance) {
      best = producer
      bestDistance = distanceToProducer
    }
  }
  return best
}

export function collectFromProducer(
  producers: readonly ProducerState[],
  id: number,
  amount = 1,
): readonly ProducerState[] {
  return producers.map((producer) =>
    producer.id === id
      ? { ...producer, ready: Math.max(0, producer.ready - Math.max(0, amount)) }
      : producer,
  )
}

export function addStock(
  shelves: Record<ZoneId, ShelfState>,
  product: ProductKind,
  amount: number,
): Record<ZoneId, ShelfState> {
  const zone = zoneOf(product)
  const shelf = shelves[zone]
  const stock = Math.min(shelf.capacity, shelf.stock[product] + amount)
  return {
    ...shelves,
    [zone]: {
      ...shelf,
      stock: { ...shelf.stock, [product]: stock },
      everStocked: { ...shelf.everStocked, [product]: stock > 0 },
    },
  }
}

function advancePlant(
  producer: ProducerState,
  dtMs: number,
  growthMultiplier: number,
  events: GameEvent[],
): ProducerState {
  if (!isPlantKind(producer.product)) return producer
  const config = PLANTS[producer.product]
  if (!producer.mature) {
    const growthMs = producer.progressMs + dtMs * growthMultiplier
    if (growthMs >= config.growMs) {
      events.push({ type: 'producerMature', producerId: producer.id, product: producer.product })
      return {
        ...producer,
        mature: true,
        progressMs: 0,
        ready: 1,
      }
    }
    return { ...producer, progressMs: growthMs }
  }

  if (producer.ready >= config.maxFruit) {
    return producer.progressMs === 0 ? producer : { ...producer, progressMs: 0 }
  }

  let ready = producer.ready
  let progressMs = producer.progressMs + dtMs * growthMultiplier
  while (progressMs >= config.fruitMs && ready < config.maxFruit) {
    ready += 1
    progressMs -= config.fruitMs
    events.push({ type: 'producerReady', producerId: producer.id, product: producer.product })
  }
  if (ready >= config.maxFruit) progressMs = 0
  return { ...producer, ready, progressMs }
}

function advanceAnimal(producer: ProducerState, dtMs: number, events: GameEvent[]): ProducerState {
  if (!isAnimalProductKind(producer.product)) return producer
  // Fish are caught at the pond by the player, not produced from a trough.
  if (producer.product === 'fish') {
    return producer.progressMs === 0 ? producer : { ...producer, progressMs: 0, hungry: false }
  }
  const config = ANIMALS[producer.product]
  if (producer.ready >= config.capacity) {
    return producer.progressMs === 0 ? producer : { ...producer, progressMs: 0 }
  }

  let current = producer
  if (current.progressMs === 0) {
    const fed = takeFeed(current)
    if (fed === null) {
      if (!current.hungry) {
        events.push({ type: 'producerHungry', producerId: current.id, product: current.product })
      }
      return { ...current, hungry: true, progressMs: 0 }
    }
    current = { ...fed, hungry: false }
  }

  const progressMs = current.progressMs + dtMs
  if (progressMs >= config.cycleMs) {
    events.push({ type: 'producerProduce', producerId: current.id, product: current.product })
    return {
      ...current,
      ready: current.ready + 1,
      progressMs: 0,
      hungry: false,
    }
  }

  return { ...current, progressMs }
}

function advanceStation(
  producer: ProducerState,
  shelves: Record<ZoneId, ShelfState>,
  dtMs: number,
  events: GameEvent[],
): { producer: ProducerState; shelves: Record<ZoneId, ShelfState> } {
  if (!isProcessedKind(producer.product)) return { producer, shelves }
  const config = RECIPES[producer.product]
  if (producer.ready >= config.capacity) {
    return {
      producer: producer.progressMs === 0 ? producer : { ...producer, progressMs: 0 },
      shelves,
    }
  }

  let nextProducer = producer
  let nextShelves = shelves
  let progressMs = producer.progressMs

  if (progressMs === 0) {
    const inputs = resolveRecipeInputs(nextProducer, nextShelves, config)
    if (inputs === null) return { producer: nextProducer, shelves: nextShelves }
    const consumed = consumeResolvedInputs(nextProducer, nextShelves, inputs)
    nextProducer = consumed.producer
    nextShelves = consumed.shelves
  }

  progressMs += dtMs
  if (progressMs >= config.craftMs) {
    const ready = nextProducer.ready + 1
    events.push({ type: 'producerProduce', producerId: producer.id, product: producer.product })
    return {
      producer: { ...nextProducer, ready, progressMs: 0 },
      shelves: nextShelves,
    }
  }

  return { producer: { ...nextProducer, progressMs }, shelves: nextShelves }
}

interface ResolvedInput {
  readonly product: ProductKind
  readonly count: number
}

/** The concrete product kinds that satisfy one recipe input. */
export function recipeInputProducts(input: RecipeInput): readonly ProductKind[] {
  if ('product' in input) return [input.product]
  return input.category === 'fruit' ? FRUIT_ORDER : VEG_ORDER
}

/** Representative icon for a category input, used by the HUD and shop cards. */
export function recipeInputIcon(input: RecipeInput): ProductKind {
  if ('product' in input) return input.product
  return input.category === 'fruit' ? 'apple' : 'carrot'
}

function availableCount(
  producer: ProducerState,
  shelves: Readonly<Record<ZoneId, ShelfState>>,
  product: ProductKind,
): number {
  return (producer.hopper[product] ?? 0) + stockOf(shelves, product)
}

/** How many units of one input slot a station can buffer. */
export function inputCapacity(input: RecipeInput): number {
  return input.count * STATION_BUFFER_BATCHES
}

/** Ingredients of one input slot currently resting in the hand-loaded hopper. */
export function hopperInputTotal(producer: ProducerState, input: RecipeInput): number {
  return recipeInputProducts(input).reduce(
    (sum, product) => sum + (producer.hopper[product] ?? 0),
    0,
  )
}

/** Hopper plus shelf stock for an input, used to explain why a station is idle. */
export function recipeInputAvailable(
  producer: ProducerState,
  shelves: Readonly<Record<ZoneId, ShelfState>>,
  input: RecipeInput,
): number {
  let best = 0
  for (const product of recipeInputProducts(input)) {
    best = Math.max(best, availableCount(producer, shelves, product))
  }
  return best
}

/** Total hopper plus shelf stock across every product that satisfies an input. */
export function recipeInputTotal(
  producer: ProducerState,
  shelves: Readonly<Record<ZoneId, ShelfState>>,
  input: RecipeInput,
): number {
  return recipeInputProducts(input).reduce(
    (sum, product) => sum + availableCount(producer, shelves, product),
    0,
  )
}

function resolveRecipeInputs(
  producer: ProducerState,
  shelves: Readonly<Record<ZoneId, ShelfState>>,
  recipe: RecipeConfig,
): readonly ResolvedInput[] | null {
  const resolved: ResolvedInput[] = []
  for (const input of recipe.inputs) {
    let best: ProductKind | null = null
    let bestCount = -1
    for (const product of recipeInputProducts(input)) {
      const available = availableCount(producer, shelves, product)
      if (available < input.count || available <= bestCount) continue
      best = product
      bestCount = available
    }
    if (best === null) return null
    resolved.push({ product: best, count: input.count })
  }
  return resolved
}

function consumeResolvedInputs(
  producer: ProducerState,
  shelves: Record<ZoneId, ShelfState>,
  inputs: readonly ResolvedInput[],
): { producer: ProducerState; shelves: Record<ZoneId, ShelfState> } {
  let nextProducer = producer
  let nextShelves = shelves
  for (const input of inputs) {
    let remaining = input.count
    const hopperCount = nextProducer.hopper[input.product] ?? 0
    const fromHopper = Math.min(hopperCount, remaining)
    if (fromHopper > 0) {
      const hopper = { ...nextProducer.hopper }
      if (fromHopper >= hopperCount) delete hopper[input.product]
      else hopper[input.product] = hopperCount - fromHopper
      nextProducer = { ...nextProducer, hopper }
      remaining -= fromHopper
    }
    if (remaining > 0) {
      nextShelves = consumeProduct(nextShelves, input.product, remaining)
    }
  }
  return { producer: nextProducer, shelves: nextShelves }
}

/**
 * Nearest kitchen station the player can load by hand. Stations whose output
 * is full are skipped: they would not start another batch yet.
 */
export function nearestLoadableStation(
  producers: readonly ProducerState[],
  pos: Vec2,
  radius = INTERACT.loadRadius,
): ProducerState | null {
  let best: ProducerState | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const producer of producers) {
    if (!isProcessedKind(producer.product)) continue
    if (producer.ready >= RECIPES[producer.product].capacity) continue
    const distanceToStation = distance(pos, producer.pos)
    if (distanceToStation > radius || distanceToStation >= bestDistance) continue
    best = producer
    bestDistance = distanceToStation
  }
  return best
}

export function feedCount(producer: ProducerState): number {
  return Object.values(producer.feed).reduce((sum, amount) => sum + (amount ?? 0), 0)
}

export function feedSpace(producer: ProducerState): number {
  if (!isAnimalProductKind(producer.product)) return 0
  return Math.max(0, troughCapacity(producer.product) - feedCount(producer))
}

export function addFeed(
  producer: ProducerState,
  product: PlantKind,
  amount: number,
): { producer: ProducerState; accepted: number } {
  const accepted = Math.min(amount, feedSpace(producer))
  if (accepted <= 0) return { producer, accepted: 0 }
  return {
    producer: {
      ...producer,
      feed: {
        ...producer.feed,
        [product]: (producer.feed[product] ?? 0) + accepted,
      },
    },
    accepted,
  }
}

export function nearestTrough(
  producers: readonly ProducerState[],
  pos: Vec2,
  map: ShopMap,
  radius = Number.POSITIVE_INFINITY,
): ProducerState | null {
  let best: ProducerState | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const producer of producers) {
    if (!isAnimalProductKind(producer.product) || producer.product === 'fish') continue
    if (feedSpace(producer) <= 0) continue
    const distanceToTrough = distance(pos, map.animalAccess[producer.product])
    if (distanceToTrough > radius || distanceToTrough >= bestDistance) continue
    best = producer
    bestDistance = distanceToTrough
  }
  return best
}

export function takeFeed(producer: ProducerState): ProducerState | null {
  for (const product of FEED_ORDER) {
    const amount = producer.feed[product] ?? 0
    if (amount <= 0) continue
    const feed = { ...producer.feed }
    if (amount <= 1) delete feed[product]
    else feed[product] = amount - 1
    return { ...producer, feed }
  }
  return null
}

function consumeProduct(
  shelves: Record<ZoneId, ShelfState>,
  product: ProductKind,
  amount: number,
): Record<ZoneId, ShelfState> {
  const zone = zoneOf(product)
  const shelf = shelves[zone]
  return {
    ...shelves,
    [zone]: {
      ...shelf,
      stock: { ...shelf.stock, [product]: Math.max(0, shelf.stock[product] - amount) },
    },
  }
}

export type { AnimalProductKind }
