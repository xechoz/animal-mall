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

export const SHELF_HEIGHT = 32
/** Back riser above the shelf top face; also drives the depth occluder. */
export const SHELF_RISER_HEIGHT = 28
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
  // The right face turns away from the upper-left light source, the left edge
  // catches it. Two narrow bands are enough to give the front face a volume
  // without turning every prop into a full isometric box.
  g.fillStyle(palette.side, 0.2)
  g.fillRoundedRect(x + w - 6, frontY + radius, 6, h - radius * 2, 2)
  g.fillStyle(palette.edge, 0.22)
  g.fillRect(x + 1, frontY + radius, 2, h - radius * 2)
  g.lineStyle(2, palette.side, 0.28)
  g.lineBetween(x + 2, frontY + radius, x + 2, y + d - radius)
  g.lineBetween(x + w - 2, frontY + radius, x + w - 2, y + d - radius)
  g.fillStyle(palette.top, 1)
  g.fillRoundedRect(x, topY, w, topDepth, radius)
  g.fillStyle(palette.edge, 0.55)
  g.fillRoundedRect(x + 4, topY + 4, w - 8, 3, 1.5)
  g.fillStyle(palette.side, 0.14)
  g.fillRoundedRect(x + 4, topY + topDepth - 4, w - 8, 3, 1.5)
  g.fillStyle(0x1a120c, 0.22)
  g.fillRoundedRect(x + 2, y + d - 3, w - 4, 5, 2)
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

export type CrateGoods = 'produce' | 'bottle' | 'jar'

export interface CrateOptions {
  /** Centre of the crate on the floor. */
  readonly x: number
  /** Floor contact line. */
  readonly baseY: number
  readonly scale?: number
  readonly goods?: CrateGoods
}

/** A slatted produce crate with a foreshortened top face and visible goods. */
export function drawCrate(g: Phaser.GameObjects.Graphics, options: CrateOptions): void {
  const s = options.scale ?? 1
  const w = 38 * s
  const d = 24 * s
  const h = 22 * s
  const x = options.x - w / 2
  const y = options.baseY - d
  const goods = options.goods ?? 'produce'
  g.fillStyle(0x1a120c, 0.16)
  g.fillEllipse(options.x + 3 * s, options.baseY + 2 * s, w * 0.96, 7 * s)
  drawExtrudedSlab(g, {
    x,
    y,
    w,
    d,
    h,
    radius: 2,
    palette: { top: 0xd39a65, front: 0xb87d4c, side: 0x8f5734, edge: 0xf0c99b },
  })
  const frontY = options.baseY - h
  g.lineStyle(1.2 * s, 0x7a4f2e, 0.5)
  for (let row = 1; row < 3; row += 1) {
    g.lineBetween(x + 2 * s, frontY + (row * h) / 3, x + w - 2 * s, frontY + (row * h) / 3)
  }
  g.lineBetween(x + 3 * s, frontY + 2 * s, x + w - 3 * s, frontY + h - 3 * s)
  g.lineStyle(1.4 * s, 0x6f4b2e, 0.8)
  g.strokeRoundedRect(x, frontY, w, h, 2)

  const top = frontY - d * PROP_TOP_SCALE
  const goodsY = top + d * PROP_TOP_SCALE * 0.55
  const colors =
    goods === 'produce'
      ? [0xe25d5d, 0xf0a23c, 0x7fae63, 0xe25d5d]
      : goods === 'bottle'
        ? [0xdfe9f2, 0xdfe9f2, 0xffd166]
        : [0xf0d08a, 0xd97757, 0xffd166]
  const count = goods === 'produce' ? 4 : 3
  for (let index = 0; index < count; index += 1) {
    const gx = options.x - w * 0.28 + index * w * 0.18
    if (goods === 'bottle') {
      g.fillStyle(colors[index] as number, 1)
      g.fillRoundedRect(gx - 2.5 * s, goodsY - 7 * s, 5 * s, 11 * s, 1.5 * s)
      g.fillStyle(0xffffff, 0.45)
      g.fillRect(gx - 1 * s, goodsY - 6 * s, 1.2 * s, 5 * s)
    } else {
      g.fillStyle(colors[index] as number, 1)
      g.fillCircle(gx, goodsY, 3.2 * s)
      g.fillStyle(0xffffff, 0.25)
      g.fillCircle(gx - 1 * s, goodsY - 1 * s, 1.1 * s)
    }
  }
}

/** A tied burlap sack leaning against a stall. */
export function drawSack(
  g: Phaser.GameObjects.Graphics,
  x: number,
  baseY: number,
  scale = 1,
): void {
  const s = scale
  g.fillStyle(0x1a120c, 0.14)
  g.fillEllipse(x + 2 * s, baseY + 2 * s, 32 * s, 7 * s)
  g.fillStyle(0xd9c39a, 1)
  g.fillRoundedRect(x - 12 * s, baseY - 30 * s, 24 * s, 30 * s, 10 * s)
  g.fillStyle(0xc4aa7d, 1)
  g.fillEllipse(x, baseY - 7 * s, 25 * s, 15 * s)
  g.fillStyle(0xd9c39a, 1)
  g.fillRoundedRect(x - 7 * s, baseY - 38 * s, 14 * s, 12 * s, 5 * s)
  g.fillStyle(0x8f5734, 1)
  g.fillRoundedRect(x - 8 * s, baseY - 31 * s, 16 * s, 3 * s, 1.5 * s)
  g.fillStyle(0x8f5734, 0.55)
  g.fillRoundedRect(x - 4 * s, baseY - 20 * s, 10 * s, 8 * s, 2 * s)
  g.lineStyle(1 * s, 0xb59a70, 0.7)
  g.lineBetween(x - 9 * s, baseY - 15 * s, x + 9 * s, baseY - 15 * s)
  g.fillStyle(0xfff3dd, 0.4)
  g.fillRoundedRect(x - 6 * s, baseY - 36 * s, 4 * s, 6 * s, 2 * s)
}

export type BoardIcon = 'leaf' | 'coin' | 'fish'

export interface ChalkboardOptions {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly icon?: BoardIcon
}

/** A dark chalkboard in a bark frame. No text: copy would need localization. */
export function drawChalkboard(g: Phaser.GameObjects.Graphics, options: ChalkboardOptions): void {
  const { x, y, w, h, icon } = options
  g.fillStyle(0x1a120c, 0.2)
  g.fillRoundedRect(x + 3, y + 4, w, h, 5)
  g.fillStyle(0x6f4b2e, 1)
  g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 6)
  g.fillStyle(0x2f3b35, 1)
  g.fillRoundedRect(x + 2, y + 2, w - 4, h - 4, 3)
  g.fillStyle(0xfff3dd, 0.14)
  g.fillRoundedRect(x + 5, y + 4, w - 10, 2, 1)
  g.lineStyle(1.2, 0xfff3dd, 0.28)
  g.lineBetween(x + 7, y + h - 9, x + w - 9, y + h - 9)
  g.lineBetween(x + 7, y + h - 5, x + w * 0.62, y + h - 5)
  if (icon !== undefined) drawBoardIcon(g, x + w / 2, y + h * 0.42, Math.min(w, h) * 0.24, icon)
}

function drawBoardIcon(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  icon: BoardIcon,
): void {
  if (icon === 'leaf') {
    g.fillStyle(0xa6d489, 0.9)
    g.fillEllipse(x, y, size * 2.2, size * 1.2)
    g.lineStyle(1.4, 0x7fae63, 0.9)
    g.lineBetween(x - size * 1.1, y, x + size * 1.1, y)
    g.lineBetween(x, y + size * 0.5, x - size * 0.4, y + size * 1.1)
    return
  }
  if (icon === 'coin') {
    g.fillStyle(0xffd166, 1)
    g.fillCircle(x, y, size)
    g.fillStyle(0xe0a93d, 1)
    g.fillCircle(x, y, size * 0.58)
    return
  }
  g.fillStyle(0x9be7d0, 0.9)
  g.fillEllipse(x - size * 0.2, y, size * 2, size * 1.1)
  g.fillTriangle(x + size * 0.7, y, x + size * 1.5, y - size * 0.7, x + size * 1.5, y + size * 0.7)
  g.fillStyle(0x2f3b35, 1)
  g.fillCircle(x - size * 0.75, y - size * 0.15, size * 0.16)
}

/** A striped fabric valance with a scalloped hem. */
export function drawAwning(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  colors: readonly [number, number] = [0xd97757, 0xfff3dd],
): void {
  const stripe = 12
  let index = 0
  for (let sx = x; sx < x + w; sx += stripe, index += 1) {
    const sw = Math.min(stripe, x + w - sx)
    g.fillStyle(colors[index % 2] as number, 0.96)
    g.fillRect(sx, y, sw, h)
    g.fillCircle(sx + sw / 2, y + h, sw / 2)
  }
  g.fillStyle(0x6f4b2e, 1)
  g.fillRoundedRect(x - 3, y - 3, w + 6, 4, 2)
  g.fillStyle(0xfff3dd, 0.4)
  g.fillRect(x, y - 1, w, 1)
  g.fillStyle(0x1a120c, 0.16)
  g.fillRect(x + 2, y + h + 5, w - 4, 2)
}

/** A slim floor lamp with a warm cone. Used to anchor the dining nook. */
export function drawFloorLamp(
  g: Phaser.GameObjects.Graphics,
  x: number,
  baseY: number,
  scale = 1,
): void {
  const s = scale
  const topY = baseY - 58 * s
  g.fillStyle(0x1a120c, 0.15)
  g.fillEllipse(x + 4 * s, baseY + 2 * s, 28 * s, 8 * s)
  g.fillStyle(0x6f4b2e, 1)
  g.fillEllipse(x, baseY, 22 * s, 8 * s)
  g.fillStyle(0x8f5734, 1)
  g.fillEllipse(x, baseY - 2 * s, 18 * s, 6 * s)
  g.fillStyle(0x6f4b2e, 1)
  g.fillRect(x - 1.5 * s, topY + 12 * s, 3 * s, baseY - topY - 14 * s)
  g.fillStyle(0xb07a4a, 0.8)
  g.fillRect(x - 0.6 * s, topY + 14 * s, 1.2 * s, baseY - topY - 18 * s)
  g.fillStyle(0xd9a066, 1)
  g.fillRoundedRect(x - 14 * s, topY, 28 * s, 5 * s, 2.5 * s)
  g.fillStyle(0xf0d08a, 1)
  g.fillRoundedRect(x - 17 * s, topY + 5 * s, 34 * s, 8 * s, 2.5 * s)
  g.fillStyle(0xffd9a8, 0.2)
  g.fillCircle(x, topY + 15 * s, 17 * s)
  g.fillStyle(0xffe2b0, 1)
  g.fillRoundedRect(x - 19 * s, topY + 13 * s, 38 * s, 4 * s, 2 * s)
  g.fillStyle(0xfff3dd, 0.5)
  g.fillRoundedRect(x - 12 * s, topY + 2 * s, 12 * s, 2 * s, 1 * s)
  g.fillStyle(0x6f4b2e, 1)
  g.fillCircle(x, topY - 2 * s, 2.4 * s)
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
