import { isEmbedded, isMobileDevice, isStandalone } from '@mg/core'
import Phaser from 'phaser'
import { shouldPreferLandscape } from './orientation'

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
  if (isEmbedded() || isStandalone() || fullscreenActive() || !scale.fullscreen.available) return
  scale.startFullscreen()
}

/**
 * Mobile play defaults to landscape. The Screen Orientation API only honours a
 * lock while the document is fullscreen, so wait for the menu's fullscreen
 * request first. This is best-effort: iframes, iOS Safari and browsers without
 * the API keep the current orientation and fall back to the portrait plan.
 */
export function preferLandscape(scale: Phaser.Scale.ScaleManager): void {
  const orientation = screen.orientation
  const lockSupported = typeof orientation?.lock === 'function'
  if (
    !shouldPreferLandscape({
      mobile: isMobileDevice(),
      embedded: isEmbedded(),
      lockSupported,
    })
  ) {
    return
  }

  if (fullscreenActive() || isStandalone()) {
    lockLandscape(orientation)
    return
  }
  if (!scale.fullscreen.available) return

  let timer = 0
  function cleanup(): void {
    scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, onEnter)
    scale.off(Phaser.Scale.Events.FULLSCREEN_FAILED, onFail)
    scale.off(Phaser.Scale.Events.FULLSCREEN_UNSUPPORTED, onFail)
    window.clearTimeout(timer)
  }
  function onEnter(): void {
    cleanup()
    lockLandscape(orientation)
  }
  function onFail(): void {
    cleanup()
  }

  timer = window.setTimeout(cleanup, 2_000)
  scale.once(Phaser.Scale.Events.ENTER_FULLSCREEN, onEnter)
  scale.once(Phaser.Scale.Events.FULLSCREEN_FAILED, onFail)
  scale.once(Phaser.Scale.Events.FULLSCREEN_UNSUPPORTED, onFail)
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

function lockLandscape(orientation: ScreenOrientation): void {
  // A rejection means the browser will not rotate; portrait still works.
  void orientation.lock('landscape').catch(() => {})
}
