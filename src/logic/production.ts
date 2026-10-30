import { distance } from './collision'
import {
  ANIMAL_PENS,
  ANIMALS,
  AUTO_RESERVE,
  CROP_PLOTS,
  INTERACT,
  isAnimalProductKind,
  isPlantKind,
  isProcessedKind,
  PLANTS,
  PLOTS,
  PRODUCT_ORDER,
  RECIPES,
  type RecipeConfig,
  type RecipeInput,
  STATION_SLOTS,
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
  ShelfState,
  Vec2,
  ZoneId,
  ZoneUnlocks,
} from './types'

const FRUIT_SLOTS = PLOTS
const VEG_SLOTS = CROP_PLOTS
const STATIONS = STATION_SLOTS

export function createProducer(
  product: ProductKind,
  slot: number,
  id: number,
  fresh = false,
): ProducerState {
  const kind = isPlantKind(product) ? 'plant' : isAnimalProductKind(product) ? 'animal' : 'station'
  return {
    id,
    kind,
    product,
    slot,
    pos: producerPositionFor(product, slot),
    progressMs: 0,
    ready: fresh ? 0 : kind === 'plant' ? 1 : 0,
    mature: fresh ? false : kind === 'plant',
    hungry: false,
  }
}

function producerPositionFor(product: ProductKind, slot: number): Vec2 {
  if (isPlantKind(product)) {
    const zone = zoneOf(product)
    const points = zone === 'fruit' ? FRUIT_SLOTS : VEG_SLOTS
    const point = points[slot] ?? points[0]
    return point === undefined ? { x: 320, y: 560 } : { x: point.x, y: point.y }
  }
  if (isAnimalProductKind(product)) {
    const position = ANIMAL_PENS[product]
    return { x: position.x, y: position.y }
  }
  const position = STATIONS[product]
  return { x: position.x, y: position.y }
}

export function emptyShelves(zones: ZoneUnlocks, capacity: number): Record<ZoneId, ShelfState> {
  return Object.fromEntries(
    ZONE_ORDER.map((zone) => {
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
  capacity: number,
): Record<ZoneId, ShelfState> {
  const bins = new Set(producers.map((producer) => producer.product))
  return Object.fromEntries(
    ZONE_ORDER.map((zone) => {
      const shelf = shelves[zone]
      const stock = { ...shelf.stock }
      const everStocked = { ...shelf.everStocked }
      const nextBins = { ...shelf.bins }
      for (const product of ZONE_PRODUCTS[zone]) {
        const exists = bins.has(product)
        nextBins[product] = exists
        if (!exists) {
          stock[product] = 0
          everStocked[product] = false
        }
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
    if (producer.kind === 'animal') {
      const result = advanceAnimal(producer, nextShelves, dtMs, events)
      nextShelves = result.shelves
      return result.producer
    }
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
  return shelf.active && shelf.bins[product]
}

export function eligibleProducts(
  shelves: Readonly<Record<ZoneId, ShelfState>>,
): readonly ProductKind[] {
  return PRODUCT_ORDER.filter((product) => {
    const shelf = shelves[zoneOf(product)]
    return shelf.active && shelf.bins[product] && shelf.everStocked[product]
  })
}

export function nearestCollectable(
  producers: readonly ProducerState[],
  pos: Vec2,
  carry: ProductKind | null,
): ProducerState | null {
  let best: ProducerState | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const producer of producers) {
    if (producer.ready <= 0) continue
    if (carry !== null && carry !== producer.product) continue
    const distanceToProducer = distance(pos, producer.pos)
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
): readonly ProducerState[] {
  return producers.map((producer) =>
    producer.id === id ? { ...producer, ready: Math.max(0, producer.ready - 1) } : producer,
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

function advanceAnimal(
  producer: ProducerState,
  shelves: Record<ZoneId, ShelfState>,
  dtMs: number,
  events: GameEvent[],
): { producer: ProducerState; shelves: Record<ZoneId, ShelfState> } {
  if (!isAnimalProductKind(producer.product)) return { producer, shelves }
  const config = ANIMALS[producer.product]
  if (producer.ready >= config.capacity) {
    return {
      producer: producer.progressMs === 0 ? producer : { ...producer, progressMs: 0 },
      shelves,
    }
  }

  let progressMs = producer.progressMs
  let nextShelves = shelves
  let hungry = producer.hungry

  if (progressMs === 0) {
    const eaten = consumeFeed(nextShelves, config.diet)
    if (eaten === null) {
      if (!hungry) {
        events.push({ type: 'producerHungry', producerId: producer.id, product: producer.product })
      }
      return { producer: { ...producer, hungry: true, progressMs: 0 }, shelves }
    }
    nextShelves = eaten.shelves
    hungry = false
    progressMs = 0
  }

  progressMs += dtMs
  if (progressMs >= config.cycleMs) {
    const ready = producer.ready + 1
    events.push({ type: 'producerProduce', producerId: producer.id, product: producer.product })
    return {
      producer: {
        ...producer,
        ready,
        progressMs: 0,
        hungry: false,
      },
      shelves: nextShelves,
    }
  }

  return {
    producer: { ...producer, progressMs, hungry },
    shelves: nextShelves,
  }
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

  let progressMs = producer.progressMs
  let nextShelves = shelves

  if (progressMs === 0) {
    const consumed = consumeRecipe(nextShelves, config)
    if (consumed === null) return { producer: { ...producer, progressMs: 0 }, shelves }
    nextShelves = consumed
  }

  progressMs += dtMs
  if (progressMs >= config.craftMs) {
    const ready = producer.ready + 1
    events.push({ type: 'producerProduce', producerId: producer.id, product: producer.product })
    return {
      producer: { ...producer, ready, progressMs: 0 },
      shelves: nextShelves,
    }
  }

  return { producer: { ...producer, progressMs }, shelves: nextShelves }
}

function consumeFeed(
  shelves: Record<ZoneId, ShelfState>,
  diet: readonly PlantKind[],
): { shelves: Record<ZoneId, ShelfState> } | null {
  for (const product of diet) {
    const consumed = consumeProduct(shelves, product, 1)
    if (consumed !== null) return { shelves: consumed }
  }
  return null
}

function consumeRecipe(
  shelves: Record<ZoneId, ShelfState>,
  recipe: RecipeConfig,
): Record<ZoneId, ShelfState> | null {
  for (const input of recipe.inputs) {
    if (!canConsume(shelves, input)) return null
  }
  let nextShelves = shelves
  for (const input of recipe.inputs) {
    const consumed = consumeProduct(nextShelves, input.product, input.count)
    if (consumed === null) return null
    nextShelves = consumed
  }
  return nextShelves
}

function canConsume(shelves: Readonly<Record<ZoneId, ShelfState>>, input: RecipeInput): boolean {
  return stockOf(shelves, input.product) >= input.count + AUTO_RESERVE
}

function consumeProduct(
  shelves: Record<ZoneId, ShelfState>,
  product: ProductKind,
  amount: number,
): Record<ZoneId, ShelfState> | null {
  const zone = zoneOf(product)
  const shelf = shelves[zone]
  if (shelf.stock[product] < amount + AUTO_RESERVE) return null
  return {
    ...shelves,
    [zone]: {
      ...shelf,
      stock: { ...shelf.stock, [product]: shelf.stock[product] - amount },
    },
  }
}

export type { AnimalProductKind }
