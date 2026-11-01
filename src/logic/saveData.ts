import {
  FRUIT_ORDER,
  isAnimalProductKind,
  isFruitKind,
  isPlantKind,
  isProcessedKind,
  isProductKind,
  PEN_SLOT_COUNT,
  PLANTS,
  plantSlotCount,
  STAFF,
  STAFF_ORDER,
  STARTING_COINS,
  STATION_SLOT_COUNT,
  shelfUpgradeMax,
  UPGRADE_ORDER,
  UPGRADES,
  ZONE_ORDER,
} from './config'
import type {
  PlantKind,
  ProductKind,
  SaveData,
  SaveProducer,
  StaffKind,
  UpgradeKind,
  ZoneId,
  ZoneUnlocks,
} from './types'

export function initialSave(): SaveData {
  return {
    coins: STARTING_COINS,
    totalEarned: 0,
    served: 0,
    pendingCoins: 0,
    producers: [],
    zones: zeroZones(),
    upgrades: zeroUpgrades(),
    shelfLevels: zeroShelfLevels(),
    staff: zeroStaff(),
    deposits: {},
    day: 1,
  }
}

export function zeroUpgrades(): Record<UpgradeKind, number> {
  return Object.fromEntries(UPGRADE_ORDER.map((kind) => [kind, 0])) as Record<UpgradeKind, number>
}

export function zeroShelfLevels(): Record<ZoneId, number> {
  return Object.fromEntries(ZONE_ORDER.map((zone) => [zone, 0])) as Record<ZoneId, number>
}

export function zeroStaff(): Record<StaffKind, number> {
  return Object.fromEntries(STAFF_ORDER.map((kind) => [kind, 0])) as Record<StaffKind, number>
}

export function zeroZones(): Record<ZoneId, boolean> {
  return Object.fromEntries(ZONE_ORDER.map((zone) => [zone, zone === 'fruit'])) as Record<
    ZoneId,
    boolean
  >
}

export function isStaffKind(value: unknown): value is StaffKind {
  return typeof value === 'string' && (STAFF_ORDER as readonly string[]).includes(value)
}

export function migrateSave(data: unknown, _version = 0): SaveData {
  if (typeof data !== 'object' || data === null) return initialSave()
  const record = data as Record<string, unknown>
  const producers = parseProducers(record)
  const served = nonNegativeNumber(record.served, 0)

  const zones = zeroZones()
  if (typeof record.zones === 'object' && record.zones !== null) {
    const source = record.zones as Record<string, unknown>
    for (const zone of ZONE_ORDER) {
      if (source[zone] === false) zones[zone] = false
      if (source[zone] === true) zones[zone] = true
    }
  }
  zones.fruit = true
  if (served > 0) zones.veg = true
  for (const producer of producers) {
    const zone = producerZone(producer.product)
    if (zone !== null) zones[zone] = true
  }

  const upgrades = zeroUpgrades()
  let legacyShelfLevel = 0
  if (typeof record.upgrades === 'object' && record.upgrades !== null) {
    const source = record.upgrades as Record<string, unknown>
    for (const kind of UPGRADE_ORDER) {
      const level = source[kind]
      if (typeof level === 'number' && Number.isFinite(level)) {
        upgrades[kind] = Math.max(0, Math.min(UPGRADES[kind].costs.length, Math.floor(level)))
      }
    }
    const legacyShelf = source.shelf
    if (typeof legacyShelf === 'number' && Number.isFinite(legacyShelf)) {
      legacyShelfLevel = Math.max(0, Math.min(shelfUpgradeMax(), Math.floor(legacyShelf)))
    }
  }

  const shelfLevels = zeroShelfLevels()
  let hasShelfLevels = false
  if (typeof record.shelfLevels === 'object' && record.shelfLevels !== null) {
    const source = record.shelfLevels as Record<string, unknown>
    for (const zone of ZONE_ORDER) {
      const level = source[zone]
      if (typeof level === 'number' && Number.isFinite(level)) {
        shelfLevels[zone] = Math.max(0, Math.min(shelfUpgradeMax(), Math.floor(level)))
        hasShelfLevels = true
      }
    }
  }
  // Version 4 and earlier had one global shelf level. Preserve its value on
  // every zone so an upgraded shop never loses capacity.
  if (!hasShelfLevels && legacyShelfLevel > 0) {
    for (const zone of ZONE_ORDER) shelfLevels[zone] = legacyShelfLevel
  }

  const staff = zeroStaff()
  if (typeof record.staff === 'object' && record.staff !== null) {
    const source = record.staff as Record<string, unknown>
    for (const kind of STAFF_ORDER) {
      const level = source[kind]
      if (typeof level === 'number' && Number.isFinite(level)) {
        staff[kind] = Math.max(0, Math.min(STAFF[kind].costs.length, Math.floor(level)))
      }
    }
  }

  let coins = nonNegativeNumber(record.coins, STARTING_COINS)
  const deposits: Record<string, number> = {}
  let plantDepositSeen = false

  if (typeof record.deposits === 'object' && record.deposits !== null) {
    const source = record.deposits as Record<string, unknown>
    for (const [key, raw] of Object.entries(source)) {
      const amount = nonNegativeNumber(raw, 0)
      if (amount <= 0) continue

      if (key.startsWith('tree:')) {
        const kind = key.slice(5)
        if (!isPlantKind(kind) || plantDepositSeen) {
          coins += amount
          continue
        }
        plantDepositSeen = true
        const plantKey = `plant:${kind}`
        deposits[plantKey] = Math.min(amount, PLANTS[kind].cost)
        continue
      }

      if (key.startsWith('plant:')) {
        const kind = key.slice(6)
        if (!isPlantKind(kind) || plantDepositSeen) {
          coins += amount
          continue
        }
        plantDepositSeen = true
        deposits[key] = Math.min(amount, PLANTS[kind].cost)
        continue
      }

      if (key.startsWith('staff:')) {
        const kind = key.slice(6)
        if (!isStaffKind(kind)) {
          coins += amount
          continue
        }
        const cost = STAFF[kind].costs[staff[kind]]
        if (cost === undefined) {
          coins += amount
          continue
        }
        deposits[key] = Math.min(amount, cost)
        continue
      }

      coins += amount
    }
  }

  // A partially paid plant commitment must never strand the player when
  // there is no producer generating income yet.
  if (producers.length === 0) {
    for (const amount of Object.values(deposits)) coins += amount
    for (const key of Object.keys(deposits)) delete deposits[key]
    const cheapest = Math.min(...FRUIT_ORDER.map((kind) => PLANTS[kind].cost))
    if (coins < cheapest) coins = cheapest
  }

  return {
    coins,
    totalEarned: nonNegativeNumber(record.totalEarned, 0),
    served,
    pendingCoins: nonNegativeNumber(record.pendingCoins, 0),
    producers,
    zones,
    upgrades,
    shelfLevels,
    staff,
    deposits,
    day: normalizeDay(record.day),
  }
}

/** Version 8 adds the working-day counter; older saves start on day 1. */
function normalizeDay(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1
}

function parseProducers(record: Record<string, unknown>): SaveProducer[] {
  const producers: SaveProducer[] = []
  const usedSlots = new Set<string>()
  const usedProducts = new Set<ProductKind>()

  const add = (product: unknown, rawSlot: unknown): void => {
    if (!isProductKind(product)) return
    if (!isPlantKind(product) && usedProducts.has(product)) return
    const slot = normalizeSlot(product, rawSlot)
    if (slot === null) return
    const zone = producerZone(product)
    if (zone === null) return

    if (isPlantKind(product)) {
      const key = `${zone}:${slot}`
      if (usedSlots.has(key)) return
      usedSlots.add(key)
      producers.push({ product, slot })
      return
    }

    const free = firstFreeProducerSlot(zone, usedSlots, slot)
    if (free === null) return
    usedSlots.add(`${zone}:${free}`)
    usedProducts.add(product)
    producers.push({ product, slot: free })
  }

  if (Array.isArray(record.producers)) {
    for (const entry of record.producers) {
      if (typeof entry !== 'object' || entry === null) continue
      const producer = entry as Record<string, unknown>
      add(producer.product, producer.slot)
    }
  }

  // Version 2 and earlier stored only fruit trees.
  if (Array.isArray(record.trees)) {
    for (const entry of record.trees) {
      if (typeof entry !== 'object' || entry === null) continue
      const tree = entry as Record<string, unknown>
      add(tree.kind, tree.plot)
    }
  }

  return producers
}

function firstFreeProducerSlot(
  zone: ZoneId,
  usedSlots: ReadonlySet<string>,
  preferred: number,
): number | null {
  const count = zone === 'farm' ? PEN_SLOT_COUNT : zone === 'kitchen' ? STATION_SLOT_COUNT : 0
  if (count === 0) return null
  if (preferred < count && !usedSlots.has(`${zone}:${preferred}`)) return preferred
  for (let slot = 0; slot < count; slot += 1) {
    if (!usedSlots.has(`${zone}:${slot}`)) return slot
  }
  return null
}

function normalizeSlot(product: ProductKind, rawSlot: unknown): number | null {
  if (isPlantKind(product)) {
    const zone = isFruitKind(product) ? 'fruit' : 'veg'
    if (
      typeof rawSlot !== 'number' ||
      !Number.isInteger(rawSlot) ||
      rawSlot < 0 ||
      rawSlot >= plantSlotCount(zone)
    ) {
      return null
    }
    return rawSlot
  }
  if (isAnimalProductKind(product) || isProcessedKind(product)) {
    const count = isAnimalProductKind(product) ? PEN_SLOT_COUNT : STATION_SLOT_COUNT
    return typeof rawSlot === 'number' &&
      Number.isInteger(rawSlot) &&
      rawSlot >= 0 &&
      rawSlot < count
      ? rawSlot
      : null
  }
  return null
}

function producerZone(product: ProductKind): ZoneId | null {
  if (isPlantKind(product)) return isFruitKind(product) ? 'fruit' : 'veg'
  if (isAnimalProductKind(product)) return 'farm'
  if (isProcessedKind(product)) return 'kitchen'
  return null
}

function nonNegativeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback
}

export type { PlantKind, SaveData, ZoneUnlocks }
