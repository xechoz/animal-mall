import type Phaser from 'phaser'

/** Must stay in sync with `design: { base: 720 }` in `main.ts`. */
export const DESIGN_BASE = 720

/** Physical size a 10-unit world label should reach on a small screen. */
const WORLD_LABEL_TARGET_PX = 10.5

/** Phones cap out below 2x so the HUD keeps breathing room. */
const MAX_UI_SCALE = 1.55
const MAX_WORLD_TEXT_SCALE = 2
/** Comfortable physical size for a 1-unit world object on a phone. */
const WORLD_CSS_UNIT_TARGET = 0.9
/** Upper bound keeps the shop from turning into a keyhole view. */
const MAX_WORLD_ZOOM = 1.45

/**
 * CSS pixels covered by the design space short side. Phones squeeze the whole
 * 720-unit design space into ~390px, which is why fixed UI sizes read as tiny.
 */
export function readCssShortSide(scene: Phaser.Scene): number {
  const parent = scene.scale.parentSize
  return Math.min(parent.width, parent.height)
}

/**
 * Scales UI chrome (fonts, buttons, spacing) back up on small screens. Tablets
 * and desktops stay at 1, so their layout is untouched.
 */
export function computeUiScale(cssShortSide: number): number {
  if (!(cssShortSide > 0)) return 1
  return Math.min(MAX_UI_SCALE, Math.max(1, DESIGN_BASE / cssShortSide))
}

/**
 * The whole shop is fitted into the short side, so on a phone one world unit
 * ends up around 0.6 CSS px. This zoom restores a comfortable physical size
 * and lets the camera follow the player; tablets and desktops keep a 1:1 view.
 */
export function computeWorldZoom(worldScale: number, cssShortSide: number): number {
  if (!(worldScale > 0) || !(cssShortSide > 0) || cssShortSide >= DESIGN_BASE) return 1
  const cssPerUnit = worldScale * (cssShortSide / DESIGN_BASE)
  return Math.min(MAX_WORLD_ZOOM, Math.max(1, WORLD_CSS_UNIT_TARGET / cssPerUnit))
}

/**
 * World labels live inside a container scaled by `worldScale`, so they shrink
 * with the map. This counter-scale keeps a 10-unit label near its target size
 * on every device without ever shrinking desktop text.
 */
export function computeWorldTextScale(worldScale: number, cssShortSide: number): number {
  // Desktop windows keep their labels exactly as authored.
  if (!(worldScale > 0) || !(cssShortSide > 0) || cssShortSide >= DESIGN_BASE) return 1
  const cssPerWorldUnit = worldScale * (cssShortSide / DESIGN_BASE)
  return Math.min(MAX_WORLD_TEXT_SCALE, Math.max(1, WORLD_LABEL_TARGET_PX / (10 * cssPerWorldUnit)))
}
