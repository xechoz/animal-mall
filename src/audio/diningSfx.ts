import type { GameServices } from '@mg/core'

/**
 * The two CC0 crunch samples from the snake game are registered under this
 * dedicated key so the dining table gets the real bite sound while harvesting,
 * feeding and customer pickups keep the platform's original synth `eat` cue.
 */
const DINING_EAT_EFFECT = 'diningEat'

export function playDiningEatSfx(services: GameServices, gain = 0.55, pitch = 1): void {
  services.audio.play(DINING_EAT_EFFECT, { gain, pitch })
}
