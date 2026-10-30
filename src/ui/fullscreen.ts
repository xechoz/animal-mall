import { isEmbedded, isMobileDevice } from '@mg/core'
import type Phaser from 'phaser'

export function fullscreenActive(): boolean {
  return document.fullscreenElement !== null
}

export function fullscreenSupported(scale: Phaser.Scale.ScaleManager): boolean {
  return scale.fullscreen.available
}

/**
 * Browser fullscreen must be requested from a user gesture. The menu's
 * "Open Shop" tap is the earliest deliberate one, and embedded portals keep
 * their own player chrome.
 */
export function requestGameFullscreen(scale: Phaser.Scale.ScaleManager): void {
  if (isEmbedded() || fullscreenActive() || !scale.fullscreen.available) return
  scale.startFullscreen()
}

export function toggleGameFullscreen(scale: Phaser.Scale.ScaleManager): void {
  if (!scale.fullscreen.available) return
  if (scale.isFullscreen) {
    scale.stopFullscreen()
    return
  }
  scale.startFullscreen()
}

export function fullscreenHint(scale: Phaser.Scale.ScaleManager): string | null {
  if (isEmbedded()) return 'menu.iframeHint'
  if (!scale.fullscreen.available && isMobileDevice()) return 'menu.iosHint'
  return null
}
