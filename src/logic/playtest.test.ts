import type { Rng } from '@mg/core/rng'
import { describe, expect, it } from 'vitest'
import { PORTRAIT_MAP } from './config'
import { initialSave } from './saveData'
import { createShopState, stepShop } from './state'
import type { GameEvent, ShopState } from './types'

function fixedRng(value: number): Rng {
  return {
    next: () => value / 100,
    int: () => value,
    pick: <T>(items: readonly T[]): T => items[0] as T,
    shuffle: <T>(items: readonly T[]): T[] => [...items],
  }
}

function staffedShop(): ShopState {
  let state = createShopState(
    {
      ...initialSave(),
      served: 1,
      zones: { fruit: true, veg: true, farm: true, factory: true },
      producers: [
        { product: 'apple', slot: 0 },
        { product: 'carrot', slot: 0 },
        { product: 'egg', slot: 0 },
        { product: 'milk', slot: 1 },
        { product: 'cake', slot: 0 },
        { product: 'juice', slot: 1 },
      ],
      staff: { cashier: 1, picker: 1, chef: 1 },
    },
    PORTRAIT_MAP,
  )

  // Give the animals a starter trough so the farm can begin producing while
  // the picker is still walking over from the fruit field.
  state = {
    ...state,
    producers: state.producers.map((producer) =>
      producer.product === 'egg' || producer.product === 'milk'
        ? { ...producer, feed: { carrot: 4 } }
        : producer,
    ),
    shelves: {
      ...state.shelves,
      fruit: {
        ...state.shelves.fruit,
        stock: { ...state.shelves.fruit.stock, apple: 5 },
        everStocked: { ...state.shelves.fruit.everStocked, apple: true },
      },
      veg: {
        ...state.shelves.veg,
        stock: { ...state.shelves.veg.stock, carrot: 5 },
        everStocked: { ...state.shelves.veg.everStocked, carrot: true },
      },
      farm: {
        ...state.shelves.farm,
        stock: { ...state.shelves.farm.stock, egg: 3, milk: 2 },
        everStocked: { ...state.shelves.farm.everStocked, egg: true, milk: true },
      },
    },
  }
  return state
}

describe('playtest', () => {
  it('keeps the starter farm and factory producing without the player', () => {
    let state = staffedShop()
    const events: GameEvent[] = []
    const rng = fixedRng(0)

    for (let tick = 0; tick < 2_200; tick += 1) {
      const result = stepShop(state, { moveX: 0, moveY: 0 }, rng, 50)
      state = result.state
      events.push(...result.events)
    }

    expect(
      events.some((event) => event.type === 'producerProduce' && event.product === 'juice'),
    ).toBe(true)
    expect(
      events.some((event) => event.type === 'producerProduce' && event.product === 'cake'),
    ).toBe(true)
    expect(events.some((event) => event.type === 'staffHarvest' && event.product === 'juice')).toBe(
      true,
    )
    expect(
      events.some(
        (event) =>
          event.type === 'staffHarvest' && (event.product === 'egg' || event.product === 'milk'),
      ),
    ).toBe(true)
    expect(events.some((event) => event.type === 'staffTrash')).toBe(false)
  })
})
