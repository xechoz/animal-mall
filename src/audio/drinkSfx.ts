import type { GameServices, SfxName } from '@mg/core'
import type { DrinkKind } from '../logic/types'

/**
 * The platform has no dedicated drink effect and this game never uses the
 * `slow` slot, so main.ts links the bundled gulp sample to that effect.
 */
const DRINK_EFFECT: SfxName = 'slow'

const DRINK_PITCH: Readonly<Record<DrinkKind, number>> = {
  appleSoda: 1,
  milkTea: 0.95,
  lemonTea: 1.05,
}

export function playGulpSfx(services: GameServices, pitch = 1): void {
  services.audio.play(DRINK_EFFECT, { gain: 0.65, pitch })
}

export function playDrinkSfx(services: GameServices, drink: DrinkKind): void {
  playGulpSfx(services, DRINK_PITCH[drink])
}
