import Phaser from 'phaser'

/** Fixed light: the sun sits upper-left, so props cast down-right. */
export const PROP_SHADOW_OFFSET = { x: 7, y: 9 } as const

/** Ground-plane rings are ellipses so they read as painted on the floor. */
export const GROUND_RING_SQUASH = 0.55

/**
 * Screen depth of a horizontal top face. A top-down footprint is foreshortened
 * by the camera angle; using the full footprint depth makes every prop look
 * like a flat card with a thick bottom strip.
 */
export const PROP_TOP_SCALE = 0.56

export const SHELF_HEIGHT = 24
export const COUNTER_HEIGHT = 30
export const TRASH_HEIGHT = 30
export const VENDING_HEIGHT = 60
export const TABLE_HEIGHT = 18

const SHADOW_TEXTURE = 'prop-soft-shadow'

export interface SlabPalette {
  readonly top: number
  readonly front: number
  readonly side: number
  readonly edge: number
}

export interface ExtrudedSlab {
  /** Footprint top-left in local coordinates. */
  readonly x: number
  readonly y: number
  readonly w: number
  readonly d: number
  readonly h: number
  readonly radius: number
  readonly palette: SlabPalette
}

/**
 * Draws a box with a footprint, a visible front face and a raised top face.
 * The caller draws details on top; this only establishes the 2.5D volume.
 */
export function drawExtrudedSlab(g: Phaser.GameObjects.Graphics, slab: ExtrudedSlab): void {
  const { x, y, w, d, h, radius, palette } = slab
  const frontY = y + d - h
  const topDepth = d * PROP_TOP_SCALE
  const topY = frontY - topDepth
  g.fillStyle(palette.front, 1)
  g.fillRoundedRect(x, frontY, w, h, radius)
  g.lineStyle(2, palette.side, 0.35)
  g.lineBetween(x + 2, frontY + radius, x + 2, y + d - radius)
  g.lineBetween(x + w - 2, frontY + radius, x + w - 2, y + d - radius)
  g.fillStyle(palette.top, 1)
  g.fillRoundedRect(x, topY, w, topDepth, radius)
  g.fillStyle(palette.edge, 0.55)
  g.fillRoundedRect(x + 4, topY + 4, w - 8, 3, 1.5)
  g.fillStyle(0x1a120c, 0.18)
  g.fillRoundedRect(x + 2, y + d - 3, w - 4, 4, 2)
}

export interface LegOptions {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly color: number
  readonly edge: number
}

/**
 * A single tapered post. Legs are the cheapest way to stop a raised prop from
 * reading as a solid block glued to the floor.
 */
export function drawLeg(g: Phaser.GameObjects.Graphics, options: LegOptions): void {
  const { x, y, w, h, color, edge } = options
  g.fillStyle(0x1a120c, 0.14)
  g.fillRoundedRect(x + 1, y + 2, w, h, 2)
  g.fillStyle(color, 1)
  g.fillRoundedRect(x, y, w, h, 2)
  g.fillStyle(edge, 0.7)
  g.fillRoundedRect(x + 1, y + 1, 2, Math.max(2, h - 2), 1)
}

export interface PropShadowOptions {
  readonly width: number
  readonly height: number
  readonly alpha?: number
}

/**
 * Contact plus cast shadow under a prop. A canvas radial gradient is cheaper
 * and softer than stacking Graphics ellipses, and one quad per prop is enough.
 */
export function addPropShadow(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  options: PropShadowOptions,
): void {
  const key = ensureSoftShadowTexture(scene)
  const alpha = options.alpha ?? 0.2
  const contact = scene.add
    .image(0, 2, key)
    .setDisplaySize(options.width, options.height)
    .setAlpha(alpha)
  const cast = scene.add
    .image(PROP_SHADOW_OFFSET.x, PROP_SHADOW_OFFSET.y, key)
    .setDisplaySize(options.width * 1.12, options.height * 1.08)
    .setAlpha(alpha * 0.55)
  parent.addAt(contact, 0)
  parent.addAt(cast, 0)
}

export function strokeGroundEllipse(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  color: number,
  alpha: number,
  lineWidth: number,
): void {
  g.lineStyle(lineWidth, color, alpha)
  g.strokeEllipse(x, y, radius * 2, radius * 2 * GROUND_RING_SQUASH)
}

/** Phaser has no elliptical arc helper, so walk the ellipse in short steps. */
export function strokeGroundArc(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  start: number,
  end: number,
  color: number,
  alpha: number,
  lineWidth: number,
  steps = 56,
): void {
  const ry = radius * GROUND_RING_SQUASH
  const span = end - start
  const count = Math.max(2, Math.ceil((steps * Math.abs(span)) / (Math.PI * 2)))
  g.lineStyle(lineWidth, color, alpha)
  g.beginPath()
  for (let index = 0; index <= count; index += 1) {
    const angle = start + (span * index) / count
    const px = x + Math.cos(angle) * radius
    const py = y + Math.sin(angle) * ry
    if (index === 0) g.moveTo(px, py)
    else g.lineTo(px, py)
  }
  g.strokePath()
}

function ensureSoftShadowTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(SHADOW_TEXTURE)) return SHADOW_TEXTURE
  const size = 128
  const texture = scene.textures.createCanvas(SHADOW_TEXTURE, size, size)
  if (texture === null) throw new Error(`Could not create ${SHADOW_TEXTURE}`)
  const ctx = texture.context
  const center = size / 2
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center)
  gradient.addColorStop(0, 'rgba(0,0,0,0.6)')
  gradient.addColorStop(0.45, 'rgba(0,0,0,0.3)')
  gradient.addColorStop(0.75, 'rgba(0,0,0,0.08)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  texture.refresh()
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR)
  return SHADOW_TEXTURE
}
