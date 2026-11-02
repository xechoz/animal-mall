import { describe, expect, it } from 'vitest'
import { LANDSCAPE_MAP, PORTRAIT_MAP } from '../logic/config'
import { createProducer } from '../logic/production'
import { initialSave } from '../logic/saveData'
import { addProducerToState, createShopState, setTutorial } from '../logic/state'
import type { ShopState, TutorialStep, Vec2 } from '../logic/types'
import { guideFor, REGISTER_STAND_OFFSET, type TutorialGuide } from './tutorialGuide'

function stateFor(step: TutorialStep, map = LANDSCAPE_MAP): ShopState {
  return setTutorial(createShopState(initialSave(), map), step)
}

function withPlayer(state: ShopState, pos: Vec2): ShopState {
  return { ...state, player: { ...state.player, pos, prevPos: pos } }
}

describe('tutorial guide', () => {
  it('points at the nearest empty fruit bed, not the first one', () => {
    const landscape = guideFor(stateFor('buyTree', LANDSCAPE_MAP))
    expect(landscape.key).toBe('plot:fruit:5')
    expect(landscape.mode).toBe('walk')
    expect(landscape.index).toBe(0)

    const portrait = guideFor(stateFor('buyTree', PORTRAIT_MAP))
    expect(portrait.key).toBe('plot:fruit:5')
  })

  it('skips a bed that is already planted', () => {
    const map = LANDSCAPE_MAP
    let state = stateFor('buyTree', map)
    state = addProducerToState(state, createProducer('apple', 5, 1, map))
    expect(guideFor(state).key).toBe('plot:fruit:4')
  })

  it('keeps the current bed until another is clearly closer', () => {
    const map = LANDSCAPE_MAP
    const nearSlotFive = withPlayer(stateFor('buyTree', map), { x: 225, y: 365 })
    const previous = guideFor(nearSlotFive)
    expect(previous.key).toBe('plot:fruit:5')

    const between = withPlayer(nearSlotFive, { x: 225, y: 322 })
    expect(guideFor(between, previous).key).toBe('plot:fruit:5')
    expect(guideFor(between, null).key).toBe('plot:fruit:3')
  })

  it('picks the closest ripe crop instead of the first in the array', () => {
    const map = LANDSCAPE_MAP
    let state = stateFor('harvest', map)
    state = addProducerToState(state, createProducer('apple', 0, 1, map))
    state = addProducerToState(state, createProducer('apple', 5, 2, map))
    const guide = guideFor(state)
    expect(guide.key).toBe('producer:2')
    expect(guide.mode).toBe('walk')
    expect(guide.index).toBe(1)
  })

  it('points at the shelf that matches the carried goods', () => {
    const map = LANDSCAPE_MAP
    let state = stateFor('stock', map)
    state = addProducerToState(state, createProducer('apple', 0, 1, map))
    state = { ...state, player: { ...state.player, carry: { apple: 1 } } }
    const guide = guideFor(state)
    expect(guide.key).toBe('shelf:fruit')
    expect(guide.mode).toBe('walk')
    expect(guide.inReach).toBe(false)
    expect(guideFor(withPlayer(state, map.shelfAccess.fruit)).inReach).toBe(true)
  })

  it('guides checkout to the fence side of the counter', () => {
    const counter = LANDSCAPE_MAP.counter
    const spot = {
      x: LANDSCAPE_MAP.register.x,
      y: counter.y + counter.h + REGISTER_STAND_OFFSET,
    }
    const guide = guideFor(stateFor('checkout'))
    expect(guide.key).toBe('register')
    expect(guide.point).toEqual(spot)
    expect(guide.marker).toEqual(spot)
    expect(guide.point.y).toBeGreaterThan(counter.y + counter.h)
    expect(guide.rect).toEqual(counter)
    expect(guide.index).toBe(3)
  })

  it('marks the register as reachable from the customer side', () => {
    const state = withPlayer(stateFor('checkout'), {
      x: LANDSCAPE_MAP.register.x,
      y: LANDSCAPE_MAP.register.y + 48,
    })
    expect(guideFor(state).inReach).toBe(true)
  })

  it('tracks the grow stage as the same progress step as planting', () => {
    const map = LANDSCAPE_MAP
    let state = stateFor('grow', map)
    state = addProducerToState(state, createProducer('apple', 0, 1, map, true))
    const guide: TutorialGuide = guideFor(state)
    expect(guide.key).toBe('producer:1')
    expect(guide.mode).toBe('wait')
    expect(guide.index).toBe(0)
    // Apple: 8 s grow + two more fruits at 5 s each, halved by onboarding.
    expect(guide.waitMs).toBe(9_000)
  })
})
