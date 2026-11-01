import { describe, expect, it } from 'vitest'
import { carryOf } from './carry'
import { FOOD_BUFF, LANDSCAPE_MAP, PORTRAIT_MAP, PRODUCT_ORDER, zoneOf } from './config'
import { eatCarried, nearestFreeSeatInState, sitAtSeat, standUp, stepDining } from './dining'
import { initialSave } from './saveData'
import { createShopState } from './state'
import type { DiningState, GameEvent, PlayerState, ShopState, Vec2 } from './types'

function withPlayer(state: ShopState, pos: Vec2): ShopState {
  return { ...state, player: { ...state.player, pos, prevPos: pos } }
}

function dwell(
  state: ShopState,
  ticks: number,
): { player: PlayerState; dining: DiningState; events: readonly GameEvent[] } {
  let player = state.player
  let dining = state.dining
  const events: GameEvent[] = []
  for (let tick = 0; tick < ticks; tick += 1) {
    const result = stepDining(player, dining, state.staffMembers, player.carry, 50, state.map)
    player = result.player
    dining = result.dining
    events.push(...result.events)
  }
  return { player, dining, events }
}

describe('dining seats', () => {
  it('sits the player on a free chair and stands back up', () => {
    const state = createShopState(initialSave(), LANDSCAPE_MAP)
    const seat = LANDSCAPE_MAP.dining.seats[0]
    if (seat === undefined) throw new Error('missing seat')
    const near = withPlayer(state, seat.stand)

    const sitting = sitAtSeat(near, seat.index)
    expect(sitting.result).toBe('ok')
    expect(sitting.state.dining.playerSeat).toBe(seat.index)
    expect(sitting.state.player.pos).toEqual(seat.seat)

    const stood = standUp(sitting.state)
    expect(stood.dining.playerSeat).toBeNull()
    expect(stood.player.pos).toEqual(seat.stand)
    expect(stood.dining.armed).toBe(false)
  })

  it('refuses a chair that a staff member already owns', () => {
    const state = createShopState(
      { ...initialSave(), staff: { cashier: 1, picker: 0, chef: 0 } },
      PORTRAIT_MAP,
    )
    const seat = PORTRAIT_MAP.dining.seats[0]
    if (seat === undefined) throw new Error('missing seat')
    const occupied = {
      ...withPlayer(state, seat.stand),
      staffMembers: state.staffMembers.map((member) => ({ ...member, seatIndex: seat.index })),
    }
    expect(sitAtSeat(occupied, seat.index).result).toBe('taken')
  })

  it('refuses a chair that is out of reach', () => {
    const state = createShopState(initialSave(), LANDSCAPE_MAP)
    const seat = LANDSCAPE_MAP.dining.seats[0]
    if (seat === undefined) throw new Error('missing seat')
    expect(sitAtSeat(state, seat.index).result).toBe('far')
  })

  it('sits automatically after half a second of carrying goods', () => {
    const state = createShopState(initialSave(), LANDSCAPE_MAP)
    const seat = LANDSCAPE_MAP.dining.seats[0]
    if (seat === undefined) throw new Error('missing seat')
    const near = {
      ...withPlayer(state, seat.stand),
      player: { ...state.player, pos: seat.stand, prevPos: seat.stand, carry: { apple: 1 } },
    }

    const early = dwell(near, 9)
    expect(early.events).toHaveLength(0)
    expect(early.dining.playerSeat).toBeNull()

    const done = dwell(near, 10)
    expect(done.events).toEqual([{ type: 'diningReady', seat: seat.index }])
    expect(done.dining.playerSeat).toBe(seat.index)
    expect(done.player.pos).toEqual(seat.seat)
  })

  it('does not auto-sit empty-handed and does not immediately re-sit after standing', () => {
    const state = createShopState(initialSave(), LANDSCAPE_MAP)
    const seat = LANDSCAPE_MAP.dining.seats[0]
    if (seat === undefined) throw new Error('missing seat')
    const near = withPlayer(state, seat.stand)
    expect(dwell(near, 20).events).toHaveLength(0)

    const carrying = { ...near, player: { ...near.player, carry: { apple: 1 } } }
    const seated = dwell(carrying, 10)
    expect(seated.dining.playerSeat).toBe(seat.index)

    const stood = {
      ...carrying,
      player: seated.player,
      dining: standUp({ ...carrying, player: seated.player, dining: seated.dining }).dining,
    }
    expect(dwell(stood, 20).events).toHaveLength(0)

    const away = withPlayer(stood, { x: 500, y: 620 })
    expect(dwell(away, 1).dining.armed).toBe(true)
  })

  it('skips the chair already claimed by a staff member', () => {
    const state = createShopState(
      { ...initialSave(), staff: { cashier: 0, picker: 1, chef: 0 } },
      PORTRAIT_MAP,
    )
    const claimed = state.staffMembers.map((member) => ({ ...member, seatIndex: 0 }))
    const seat = nearestFreeSeatInState({ ...state, staffMembers: claimed })
    expect(seat?.index).not.toBe(0)
  })
})

describe('eating carried food', () => {
  function seatedState(): ShopState {
    const state = createShopState(initialSave(), LANDSCAPE_MAP)
    const seat = LANDSCAPE_MAP.dining.seats[0]
    if (seat === undefined) throw new Error('missing seat')
    const sitting = sitAtSeat(withPlayer(state, seat.stand), seat.index)
    if (sitting.result !== 'ok') throw new Error('could not sit')
    return sitting.state
  }

  it('eats every product kind and applies its category timer', () => {
    const base = seatedState()
    for (const product of PRODUCT_ORDER) {
      const state = { ...base, player: { ...base.player, carry: { [product]: 2 } } }
      const outcome = eatCarried(state, product)
      expect(outcome.events).toHaveLength(1)
      expect(outcome.events[0]?.type).toBe('ate')
      expect(carryOf(outcome.state.player.carry, product)).toBe(1)
      const bonus = FOOD_BUFF[zoneOf(product)]
      for (const entry of bonus) {
        expect(outcome.state.buffs[entry.drink]).toBe(entry.ms)
      }
    }
  })

  it('stacks time onto an existing buff', () => {
    const base = seatedState()
    const state = {
      ...base,
      player: { ...base.player, carry: { apple: 1 } },
      buffs: { ...base.buffs, appleSoda: 5_000 },
    }
    const outcome = eatCarried(state, 'apple')
    expect(outcome.state.buffs.appleSoda).toBe(15_000)
  })

  it('refuses to eat when not seated or empty-handed', () => {
    const state = createShopState(initialSave(), LANDSCAPE_MAP)
    const carrying = { ...state, player: { ...state.player, carry: { apple: 1 } } }
    expect(eatCarried(carrying, 'apple').state).toBe(carrying)
    const seated = seatedState()
    expect(eatCarried(seated, 'apple').state).toBe(seated)
  })
})
