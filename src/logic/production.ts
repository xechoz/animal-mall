import { distance } from './collision'
import {
  ANIMALS,
  AUTO_RESERVE,
  FEED_ORDER,
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
  troughCapacity,
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
  }
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

function advanceAnimal(producer: ProducerState, dtMs: number, events: GameEvent[]): ProducerState {
  if (!isAnimalProductKind(producer.product)) return producer
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
    if (!isAnimalProductKind(producer.product)) continue
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
