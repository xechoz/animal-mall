import { getServices } from '@mg/core'
import type Phaser from 'phaser'
import { dayLighting, NIGHT_AMBIENCE_PEAK, nightAmbienceVolume } from '../ui/lighting'
import { duckMusic } from './music'

const TRACK_KEY = 'nightAmbience'
const MIN_AUDIBLE_VOLUME = 0.004

export { NIGHT_AMBIENCE_PEAK, nightAmbienceVolume }

interface AmbienceTrack extends Phaser.Sound.BaseSound {
  setVolume(value: number): void
}

let track: AmbienceTrack | null = null
let host: Phaser.Scene | null = null
let unsubscribeHostMute: (() => void) | null = null
let targetVolume = 0

/**
 * Registers the shared night-ambience loop on the global sound manager. The
 * loop stays paused during the day and wakes up only once dusk begins.
 */
export function startNightAmbience(scene: Phaser.Scene): void {
  host = scene
  const services = getServices()
  if (!unsubscribeHostMute) {
    unsubscribeHostMute = services.platform.onHostMutedChange?.(() => syncNightAmbience()) ?? null
  }
  if (!track) {
    if (!scene.cache.audio.exists(TRACK_KEY)) return
    track = scene.sound.add(TRACK_KEY, {
      loop: true,
      volume: 0,
    }) as AmbienceTrack
    if (scene.sound.locked) scene.sound.once('unlocked', () => syncNightAmbience())
  }
  syncNightAmbience()
}

/** Drives both the cricket loop and the daytime BGM duck from the shop clock. */
export function updateNightAmbience(ms: number, reportOpen = false): void {
  const { night } = dayLighting(ms)
  duckMusic(reportOpen ? 0 : night)
  targetVolume = nightAmbienceVolume(ms, reportOpen)
  syncNightAmbience()
}

/** Silences the night loop when leaving the shop for the title menu. */
export function stopNightAmbience(): void {
  targetVolume = 0
  duckMusic(0)
  syncNightAmbience()
}

/** Applies sound settings, host mute and the current dusk/night gain. */
export function syncNightAmbience(): void {
  const current = track
  if (!current || !host) return
  if (enabled() && targetVolume >= MIN_AUDIBLE_VOLUME) {
    current.setVolume(targetVolume)
    if (!current.isPlaying && !host.sound.locked) {
      if (current.isPaused) current.resume()
      else current.play()
    }
    return
  }
  current.setVolume(0)
  if (current.isPlaying) current.pause()
}

function enabled(): boolean {
  const services = getServices()
  if (!services.settings.value.sound) return false
  return !(services.platform.hostMuted?.() ?? false)
}
