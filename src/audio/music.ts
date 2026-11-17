import { getServices } from '@mg/core'
import type Phaser from 'phaser'
import { MUSIC_VOLUME, musicVolumeForNight } from '../ui/lighting'

const TRACK_KEY = 'music'

export { MUSIC_VOLUME, musicVolumeForNight }

interface MusicTrack extends Phaser.Sound.BaseSound {
  setVolume(value: number): void
}

let track: MusicTrack | null = null
let host: Phaser.Scene | null = null
let unsubscribeHostMute: (() => void) | null = null
let nightLevel = 0

/**
 * Starts the shared background loop once. Every scene calls this so the host
 * stays current, but the track lives on the global sound manager and keeps
 * playing across scene transitions and menu restarts.
 */
export function startMusic(scene: Phaser.Scene): void {
  host = scene
  const services = getServices()
  if (!unsubscribeHostMute) {
    unsubscribeHostMute = services.platform.onHostMutedChange?.(() => syncMusic()) ?? null
  }
  if (!track) {
    if (!scene.cache.audio.exists(TRACK_KEY)) return
    track = scene.sound.add(TRACK_KEY, {
      loop: true,
      volume: musicVolumeForNight(nightLevel),
    }) as MusicTrack
    if (scene.sound.locked) scene.sound.once('unlocked', () => syncMusic())
  }
  syncMusic()
}

/** Updates the daytime music gain to make room for the night ambience. */
export function duckMusic(night: number): void {
  nightLevel = Math.max(0, Math.min(1, night))
  track?.setVolume(musicVolumeForNight(nightLevel))
}

/** Applies the player's sound setting and the host mute to the loop. */
export function syncMusic(): void {
  const current = track
  if (!current || !host) return
  if (enabled()) {
    if (!current.isPlaying && !host.sound.locked) {
      if (current.isPaused) current.resume()
      else current.play()
    }
    return
  }
  if (current.isPlaying) current.pause()
}

function enabled(): boolean {
  const services = getServices()
  if (!services.settings.value.sound) return false
  return !(services.platform.hostMuted?.() ?? false)
}
