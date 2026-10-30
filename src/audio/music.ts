import { getServices } from '@mg/core'
import type Phaser from 'phaser'

const TRACK_KEY = 'music'
/** Base level for a track normalised to about -15 LUFS, under the SFX peaks. */
const MUSIC_VOLUME = 0.45

interface MusicTrack extends Phaser.Sound.BaseSound {
  setVolume(value: number): void
}

let track: MusicTrack | null = null
let host: Phaser.Scene | null = null
let unsubscribeHostMute: (() => void) | null = null

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
      volume: MUSIC_VOLUME,
    }) as MusicTrack
    if (scene.sound.locked) scene.sound.once('unlocked', () => syncMusic())
  }
  syncMusic()
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
