import { describe, expect, it } from 'vitest'
import { PORTRAIT_MAP } from './config'
import { nextGoal } from './goals'
import { initialSave } from './saveData'
import { createShopState } from './state'

describe('goals', () => {
  it('stays quiet while the first-sale tutorial is running', () => {
    const state = createShopState(initialSave(), PORTRAIT_MAP)
    expect(state.tutorial).toBe('buyTree')
    expect(nextGoal(state)).toBeNull()
  })

  it('starts the chain once the tutorial is done', () => {
    const state = createShopState(initialSave(), PORTRAIT_MAP)
    const done = {
      ...state,
      tutorial: 'done' as const,
      zones: { ...state.zones, veg: true },
    }
    expect(nextGoal(done)).toEqual({ type: 'producer', product: 'carrot' })
  })
})
