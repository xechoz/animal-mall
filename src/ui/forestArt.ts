import type Phaser from 'phaser'
import { gameColors } from '../colors'
import type { Rect, Vec2 } from '../logic/types'

/** A straight fence run in world coordinates. */
export interface FenceRun {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
}

export interface FencePost {
  readonly x: number
  readonly y: number
  readonly height: number
}

export interface FenceRail {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
}

export interface FenceOptions {
  /** Height of the posts above their base line. */
  readonly height?: number
  /** Distance between posts along the run. */
  readonly postGap?: number
  /** Distance from the run start where the fence opens (a gate). */
  readonly gapStart?: number
  /** Distance from the run start where the gate closes. */
  readonly gapEnd?: number
  readonly seed?: number
  readonly moss?: boolean
}

export interface FenceLayout {
  readonly posts: readonly FencePost[]
  readonly rails: readonly FenceRail[]
}

export type FoliageTone = 'green' | 'olive' | 'teal' | 'amber' | 'plum' | 'gold'

interface FoliagePalette {
  readonly dark: number
  readonly mid: number
  readonly light: number
}

const FOLIAGE: Readonly<Record<FoliageTone, FoliagePalette>> = {
  green: { dark: 0x4f8a52, mid: 0x6fb36a, light: 0x9ed68a },
  olive: { dark: 0x6f8f3a, mid: 0x8fae4a, light: 0xb8d070 },
  teal: { dark: 0x3f7d6a, mid: 0x5f9e8a, light: 0x8fc9b0 },
  amber: { dark: 0x8f5a2f, mid: 0xb87545, light: 0xd9a05a },
  plum: { dark: 0x7a3f52, mid: 0xa85a72, light: 0xd98aa2 },
  gold: { dark: 0x8f7a2f, mid: 0xc9a45a, light: 0xe8d08a },
}

const OAK_TONES: readonly FoliageTone[] = ['green', 'olive', 'amber', 'plum', 'gold']
const PINE_TONES: readonly FoliageTone[] = ['green', 'teal', 'olive', 'gold']
const FRUIT_COLORS = [0xd9574f, 0xe8963f, 0xf0c94a, 0x8f5aa8, 0x5f9ec9, 0xe88aa8, 0xfff3dd] as const

function pickTone(x: number, y: number, tones: readonly FoliageTone[]): FoliageTone {
  const index = Math.floor(hash01(Math.round(x * 13 + y * 7 + tones.length * 11)) * tones.length)
  return tones[index] ?? tones[0] ?? 'green'
}

export function drawFoliageTone(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  tone: FoliageTone,
): void {
  const palette = FOLIAGE[tone]
  g.fillStyle(palette.dark, 0.9)
  g.fillCircle(x - 4 * scale, y, 7 * scale)
  g.fillCircle(x + 4 * scale, y - 1 * scale, 7 * scale)
  g.fillStyle(palette.mid, 0.95)
  g.fillCircle(x, y - 4 * scale, 8 * scale)
  g.fillStyle(palette.light, 0.8)
  g.fillCircle(x + 2 * scale, y - 6 * scale, 4 * scale)
}

/**
 * A tiny deterministic hash. Decorative scatter must be stable across rebuilds
 * and must never consume the simulation RNG, so we derive positions from a
 * seed instead of `Math.random()`.
 */
export function hash01(value: number): number {
  let x = Math.imul(value ^ 0x9e3779b9, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return (x >>> 0) / 0xffff_ffff
}

export function scatterPoints(area: Rect, count: number, seed: number): readonly Vec2[] {
  const points: Vec2[] = []
  for (let index = 0; index < count; index += 1) {
    points.push({
      x: area.x + 8 + hash01(seed + index * 3) * Math.max(1, area.w - 16),
      y: area.y + 8 + hash01(seed + index * 3 + 1) * Math.max(1, area.h - 16),
    })
  }
  return points
}

/**
 * An organic clearing shape for a rectangular gameplay zone. The gameplay
 * trigger stays a rectangle; only the paint gets a wobbly edge so the floor
 * stops reading as a stack of UI cards.
 */
export function zonePatchPoints(area: Rect): readonly Vec2[] {
  const inset = 7
  const left = area.x + inset
  const right = area.x + area.w - inset
  const top = area.y + inset
  const bottom = area.y + area.h - inset
  const seed = Math.round(area.x * 13 + area.y * 7 + area.w * 3 + area.h * 11)
  const points: Vec2[] = []
  const steps = 4
  const wobble = (index: number, amount: number): number =>
    (hash01(seed + index * 97) - 0.5) * amount

  for (let index = 0; index < steps; index += 1) {
    const t = index / steps
    points.push({ x: left + (right - left) * t, y: top + wobble(index, 8) })
  }
  for (let index = 0; index < steps; index += 1) {
    const t = index / steps
    points.push({ x: right + wobble(index + 4, 8), y: top + (bottom - top) * t })
  }
  for (let index = 0; index < steps; index += 1) {
    const t = index / steps
    points.push({ x: right - (right - left) * t, y: bottom + wobble(index + 8, 8) })
  }
  for (let index = 0; index < steps; index += 1) {
    const t = index / steps
    points.push({ x: left + wobble(index + 12, 8), y: bottom - (bottom - top) * t })
  }
  return points
}

export function fillPolygon(
  g: Phaser.GameObjects.Graphics,
  points: readonly Vec2[],
  color: number,
  alpha = 1,
): void {
  if (points.length < 3) return
  g.fillStyle(color, alpha)
  g.beginPath()
  g.moveTo(points[0]?.x ?? 0, points[0]?.y ?? 0)
  for (let index = 1; index < points.length; index += 1) {
    g.lineTo(points[index]?.x ?? 0, points[index]?.y ?? 0)
  }
  g.closePath()
  g.fillPath()
}

export function strokePolygon(
  g: Phaser.GameObjects.Graphics,
  points: readonly Vec2[],
  color: number,
  alpha = 1,
  width = 2,
): void {
  if (points.length < 2) return
  g.lineStyle(width, color, alpha)
  g.beginPath()
  g.moveTo(points[0]?.x ?? 0, points[0]?.y ?? 0)
  for (let index = 1; index < points.length; index += 1) {
    g.lineTo(points[index]?.x ?? 0, points[index]?.y ?? 0)
  }
  g.closePath()
  g.strokePath()
}

/**
 * Post and rail layout. Rails are raised in screen space, posts stand on the
 * base line, and a gate gap splits the rails without moving the gameplay wall.
 */
export function fenceLayout(run: FenceRun, options: FenceOptions = {}): FenceLayout {
  const dx = run.x2 - run.x1
  const dy = run.y2 - run.y1
  const length = Math.hypot(dx, dy)
  const height = options.height ?? 30
  const postGap = options.postGap ?? 36
  const gapStart = options.gapStart ?? Number.POSITIVE_INFINITY
  const gapEnd = options.gapEnd ?? Number.NEGATIVE_INFINITY
  const posts = new Map<string, FencePost>()
  const addPost = (distance: number, extra: number): void => {
    const t = length === 0 ? 0 : distance / length
    const x = run.x1 + dx * t
    const y = run.y1 + dy * t
    posts.set(`${Math.round(x)}:${Math.round(y)}`, { x, y, height: height + extra })
  }

  const count = Math.max(1, Math.round(length / postGap))
  for (let index = 0; index <= count; index += 1) {
    const distance = (index / count) * length
    if (distance > gapStart + 1 && distance < gapEnd - 1) continue
    addPost(distance, 0)
  }
  if (gapStart > 1 && gapStart < length - 1) addPost(gapStart, 8)
  if (gapEnd > 1 && gapEnd < length - 1) addPost(gapEnd, 8)

  const segments: Array<readonly [number, number]> =
    gapStart > 1 && gapEnd > gapStart && gapEnd < length - 1
      ? [
          [0, gapStart],
          [gapEnd, length],
        ]
      : [[0, length]]
  const rails: FenceRail[] = []
  for (const [start, end] of segments) {
    if (end - start < 3) continue
    for (const offset of [0.32, 0.66]) {
      rails.push({
        x1: run.x1 + dx * (start / length),
        y1: run.y1 + dy * (start / length) - height * offset,
        x2: run.x1 + dx * (end / length),
        y2: run.y1 + dy * (end / length) - height * offset,
      })
    }
  }

  return { posts: [...posts.values()], rails }
}

function drawLeafCluster(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  color = gameColors.leaf,
): void {
  g.fillStyle(color, 0.92)
  g.fillEllipse(x - 3 * scale, y, 7 * scale, 4 * scale)
  g.fillEllipse(x + 3 * scale, y - 1 * scale, 7 * scale, 4 * scale)
  g.fillStyle(gameColors.leafLight, 0.75)
  g.fillEllipse(x, y - 2 * scale, 5 * scale, 3 * scale)
}

export function drawFence(
  g: Phaser.GameObjects.Graphics,
  run: FenceRun,
  options: FenceOptions = {},
): void {
  const layout = fenceLayout(run, options)
  const seed = options.seed ?? 1

  g.lineStyle(4, 0x1a120c, 0.16)
  g.lineBetween(run.x1 + 3, run.y1 + 4, run.x2 + 3, run.y2 + 4)
  for (const rail of layout.rails) {
    g.lineStyle(5, gameColors.barkDark, 1)
    g.lineBetween(rail.x1, rail.y1, rail.x2, rail.y2)
    g.lineStyle(2.2, gameColors.barkLight, 0.62)
    g.lineBetween(rail.x1, rail.y1 - 1.2, rail.x2, rail.y2 - 1.2)
  }

  layout.posts.forEach((post, index) => {
    g.fillStyle(0x1a120c, 0.18)
    g.fillRoundedRect(post.x - 3, post.y - post.height + 4, 8, post.height, 2)
    g.fillStyle(gameColors.barkDark, 1)
    g.fillRoundedRect(post.x - 4, post.y - post.height, 8, post.height, 2)
    g.fillStyle(gameColors.bark, 1)
    g.fillRoundedRect(post.x - 3, post.y - post.height + 2, 5, Math.max(2, post.height - 2), 1.5)
    g.fillStyle(gameColors.barkLight, 0.7)
    g.fillRoundedRect(post.x - 2, post.y - post.height + 3, 2, Math.max(2, post.height - 5), 1)
    g.fillStyle(gameColors.barkLight, 1)
    g.fillEllipse(post.x, post.y - post.height, 8, 4)
    g.lineStyle(0.8, gameColors.barkDark, 0.45)
    g.lineBetween(post.x, post.y - post.height + 5, post.x, post.y - 4)

    if (options.moss !== false && hash01(seed + index * 31) > 0.42) {
      g.fillStyle(gameColors.moss, 0.85)
      g.fillEllipse(post.x + 3, post.y - 1, 6, 3)
      g.fillStyle(gameColors.mossDark, 0.6)
      g.fillEllipse(post.x - 2, post.y, 4, 2)
    }
    if (hash01(seed + index * 53 + 7) > 0.6) {
      drawLeafCluster(g, post.x + 3, post.y - post.height * 0.45, 0.6, gameColors.fern)
    }
  })
}

export function drawBush(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  tone: 'dark' | 'light' = 'dark',
  variant?: FoliageTone,
): void {
  const palette = FOLIAGE[variant ?? pickTone(x, y, [...OAK_TONES, 'teal'])]
  g.fillStyle(0x1a120c, 0.14)
  g.fillEllipse(x, y + 4 * scale, 24 * scale, 7 * scale)
  const base = tone === 'dark' ? palette.dark : palette.mid
  g.fillStyle(base, 1)
  g.fillCircle(x - 7 * scale, y - 2 * scale, 8 * scale)
  g.fillCircle(x + 7 * scale, y - 3 * scale, 8 * scale)
  g.fillCircle(x, y - 7 * scale, 10 * scale)
  g.fillStyle(palette.mid, 0.95)
  g.fillCircle(x - 4 * scale, y - 7 * scale, 6 * scale)
  g.fillCircle(x + 6 * scale, y - 6 * scale, 5 * scale)
  g.fillStyle(palette.light, 0.8)
  g.fillCircle(x + 1 * scale, y - 10 * scale, 4 * scale)
  const berryColor =
    FRUIT_COLORS[Math.floor(hash01(Math.round(x * 7 + y * 11)) * FRUIT_COLORS.length)] ??
    gameColors.berry
  g.fillStyle(berryColor, 0.85)
  g.fillCircle(x - 9 * scale, y - 5 * scale, 1.4 * scale)
  g.fillCircle(x + 8 * scale, y - 8 * scale, 1.2 * scale)
}

export function drawTree(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  kind: 'oak' | 'pine' = 'oak',
  tone?: FoliageTone,
): void {
  const palette = FOLIAGE[tone ?? pickTone(x, y, kind === 'pine' ? PINE_TONES : OAK_TONES)]
  g.fillStyle(0x1a120c, 0.14)
  g.fillEllipse(x, y + 6 * scale, 34 * scale, 10 * scale)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x - 4 * scale, y - 34 * scale, 8 * scale, 38 * scale, 2 * scale)
  g.fillStyle(gameColors.bark, 1)
  g.fillRoundedRect(x - 2 * scale, y - 33 * scale, 4 * scale, 34 * scale, 1.5 * scale)
  g.lineStyle(1 * scale, gameColors.barkDark, 0.45)
  g.lineBetween(x, y - 28 * scale, x, y - 4 * scale)

  if (kind === 'pine') {
    g.fillStyle(palette.dark, 1)
    g.fillTriangle(
      x,
      y - 108 * scale,
      x - 27 * scale,
      y - 48 * scale,
      x + 27 * scale,
      y - 48 * scale,
    )
    g.fillStyle(palette.mid, 1)
    g.fillTriangle(
      x,
      y - 96 * scale,
      x - 22 * scale,
      y - 40 * scale,
      x + 22 * scale,
      y - 40 * scale,
    )
    g.fillStyle(palette.light, 0.92)
    g.fillTriangle(
      x,
      y - 84 * scale,
      x - 17 * scale,
      y - 30 * scale,
      x + 17 * scale,
      y - 30 * scale,
    )
    g.fillStyle(palette.light, 0.6)
    g.fillTriangle(x, y - 80 * scale, x - 7 * scale, y - 44 * scale, x + 7 * scale, y - 44 * scale)
    for (let index = 0; index < 4; index += 1) {
      const fx = x + (hash01(Math.round(x + y) + index * 17) - 0.5) * 34 * scale
      const fy = y - 42 * scale - hash01(Math.round(x + y) + index * 29) * 34 * scale
      g.fillStyle(index % 2 === 0 ? gameColors.straw : gameColors.barkLight, 0.95)
      g.fillEllipse(fx, fy, 4 * scale, 6 * scale)
    }
    return
  }

  g.fillStyle(palette.dark, 1)
  g.fillCircle(x - 22 * scale, y - 46 * scale, 22 * scale)
  g.fillCircle(x + 22 * scale, y - 44 * scale, 21 * scale)
  g.fillCircle(x, y - 64 * scale, 25 * scale)
  g.fillStyle(palette.mid, 1)
  g.fillCircle(x - 16 * scale, y - 54 * scale, 17 * scale)
  g.fillCircle(x + 17 * scale, y - 52 * scale, 15 * scale)
  g.fillCircle(x, y - 70 * scale, 18 * scale)
  g.fillStyle(palette.light, 0.82)
  g.fillCircle(x - 8 * scale, y - 76 * scale, 10 * scale)
  g.fillCircle(x + 10 * scale, y - 66 * scale, 7 * scale)

  // Hanging fruit in several colours makes the canopy read as a forest, not a
  // single green silhouette.
  for (let index = 0; index < 6; index += 1) {
    const fx = x + (hash01(Math.round(x * 3 + y * 5) + index * 31) - 0.5) * 50 * scale
    const fy = y - 44 * scale - hash01(Math.round(x * 7 + y * 3) + index * 13) * 42 * scale
    const color =
      FRUIT_COLORS[Math.floor(hash01(Math.round(x + y) + index * 7) * FRUIT_COLORS.length)] ??
      gameColors.berry
    g.fillStyle(color, 0.95)
    g.fillCircle(fx, fy, 2.6 * scale)
    g.fillStyle(0xffffff, 0.35)
    g.fillCircle(fx - 0.8 * scale, fy - 0.9 * scale, 0.9 * scale)
  }
}

export function drawFern(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  flip = 1,
): void {
  for (let index = 0; index < 5; index += 1) {
    const angle = -Math.PI / 2 + (index - 2) * 0.34 * flip
    const length = (12 + (index % 2) * 3) * scale
    const endX = x + Math.cos(angle) * length
    const endY = y + Math.sin(angle) * length
    g.lineStyle(1.6 * scale, gameColors.leafDark, 0.95)
    g.lineBetween(x, y, endX, endY)
    for (const t of [0.42, 0.7] as const) {
      const px = x + (endX - x) * t
      const py = y + (endY - y) * t
      g.fillStyle(index % 2 === 0 ? gameColors.fern : gameColors.leafLight, 0.88)
      g.fillEllipse(px + 2.2 * scale, py - 1.4 * scale, 5 * scale, 2.4 * scale)
      g.fillEllipse(px - 2.2 * scale, py - 1.8 * scale, 4 * scale, 2 * scale)
    }
  }
}

export function drawRock(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
): void {
  g.fillStyle(0x1a120c, 0.16)
  g.fillEllipse(x, y + 3 * scale, 20 * scale, 6 * scale)
  g.fillStyle(gameColors.stoneDark, 1)
  g.fillEllipse(x, y, 18 * scale, 11 * scale)
  g.fillStyle(gameColors.stone, 1)
  g.fillEllipse(x - 1 * scale, y - 2 * scale, 14 * scale, 8 * scale)
  g.fillStyle(0xd7dcdd, 0.6)
  g.fillEllipse(x - 3 * scale, y - 4 * scale, 7 * scale, 3 * scale)
  g.fillStyle(gameColors.moss, 0.7)
  g.fillEllipse(x + 5 * scale, y + 2 * scale, 5 * scale, 2.5 * scale)
}

export function drawMushroomCluster(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
): void {
  const mushrooms = [
    { dx: 0, dy: 0, s: 1 },
    { dx: -7, dy: 3, s: 0.68 },
    { dx: 6, dy: 4, s: 0.56 },
  ] as const
  for (const mushroom of mushrooms) {
    const mx = x + mushroom.dx * scale
    const my = y + mushroom.dy * scale
    const s = mushroom.s * scale
    g.fillStyle(0x1a120c, 0.12)
    g.fillEllipse(mx, my + 5 * s, 9 * s, 3 * s)
    g.fillStyle(gameColors.cream, 1)
    g.fillRoundedRect(mx - 1.6 * s, my - 1 * s, 3.2 * s, 6 * s, 1.2 * s)
    g.fillStyle(gameColors.berry, 0.95)
    g.fillEllipse(mx, my - 1 * s, 10 * s, 6 * s)
    g.fillStyle(gameColors.cream, 0.85)
    g.fillCircle(mx - 2.2 * s, my - 2 * s, 1.1 * s)
    g.fillCircle(mx + 2 * s, my - 1.6 * s, 0.9 * s)
  }
}

export function drawLeafLitter(
  g: Phaser.GameObjects.Graphics,
  area: Rect,
  count: number,
  seed: number,
): void {
  scatterPoints(area, count, seed).forEach((point, index) => {
    const color =
      index % 3 === 0 ? gameColors.leaf : index % 3 === 1 ? gameColors.moss : gameColors.barkLight
    g.fillStyle(color, 0.42)
    g.fillEllipse(point.x, point.y, 5, 2.4)
    g.lineStyle(0.8, gameColors.barkDark, 0.24)
    g.lineBetween(point.x - 2, point.y, point.x + 2, point.y)
  })
}

export function drawCanopyBand(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  seed: number,
): void {
  g.fillStyle(gameColors.pine, 1)
  g.fillRoundedRect(x, y, width, height, 12)
  g.fillStyle(gameColors.canopy, 0.65)
  g.fillRoundedRect(x + 4, y + 4, width - 8, height - 8, 10)

  const variants: readonly FoliageTone[] = ['green', 'olive', 'teal', 'gold', 'plum']
  const count = Math.max(3, Math.round(width / 22))
  for (let index = 0; index < count; index += 1) {
    const px = x + 8 + (index * (width - 16)) / Math.max(1, count - 1)
    const py = y + height - 2 + (hash01(seed + index * 17) - 0.5) * 5
    const scale = 0.45 + hash01(seed + index * 29) * 0.3
    const variant = variants[index % variants.length] ?? 'green'
    drawBush(g, px, py, scale, index % 2 === 0 ? 'dark' : 'light', variant)
    if (hash01(seed + index * 43) > 0.45) {
      const color =
        FRUIT_COLORS[Math.floor(hash01(seed + index * 59) * FRUIT_COLORS.length)] ??
        gameColors.berry
      g.fillStyle(color, 0.9)
      g.fillCircle(px + 5 * scale, py - 5 * scale, 1.8 * scale)
    }
  }
  for (let index = 0; index < 5; index += 1) {
    const px = x + 18 + hash01(seed + index * 41) * Math.max(1, width - 36)
    g.lineStyle(1.2, gameColors.mossDark, 0.7)
    g.lineBetween(px, y + height, px + 2, y + height + 8 + hash01(seed + index) * 8)
    drawLeafCluster(g, px + 2, y + height + 9, 0.55, gameColors.fern)
  }
}

export function drawSunShaft(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 0.08,
): void {
  fillPolygon(
    g,
    [
      { x, y },
      { x: x + width, y },
      { x: x + width * 1.55, y: y + height },
      { x: x + width * 0.55, y: y + height },
    ],
    gameColors.sunbeam,
    alpha,
  )
}

export function drawStump(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
): void {
  g.fillStyle(0x1a120c, 0.16)
  g.fillEllipse(x, y + 6 * scale, 26 * scale, 8 * scale)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x - 11 * scale, y - 10 * scale, 22 * scale, 16 * scale, 4 * scale)
  g.fillStyle(gameColors.bark, 1)
  g.fillRoundedRect(x - 9 * scale, y - 12 * scale, 18 * scale, 14 * scale, 4 * scale)
  g.fillStyle(gameColors.hay, 0.9)
  g.fillEllipse(x, y - 12 * scale, 16 * scale, 6 * scale)
  g.lineStyle(0.9, gameColors.barkDark, 0.45)
  g.strokeEllipse(x, y - 12 * scale, 10 * scale, 4 * scale)
  g.strokeEllipse(x, y - 12 * scale, 5 * scale, 2 * scale)
  g.fillStyle(gameColors.moss, 0.8)
  g.fillEllipse(x - 7 * scale, y - 3 * scale, 7 * scale, 3 * scale)
  drawMushroomCluster(g, x + 12 * scale, y + 2 * scale, 0.55 * scale)
}

export function drawLog(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
  g.fillStyle(0x1a120c, 0.16)
  g.fillEllipse(x, y + 7 * scale, 58 * scale, 10 * scale)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x - 28 * scale, y - 8 * scale, 56 * scale, 16 * scale, 7 * scale)
  g.fillStyle(gameColors.bark, 1)
  g.fillRoundedRect(x - 26 * scale, y - 7 * scale, 52 * scale, 11 * scale, 5 * scale)
  g.fillStyle(gameColors.hay, 0.85)
  g.fillEllipse(x - 26 * scale, y - 1 * scale, 8 * scale, 13 * scale)
  g.fillEllipse(x + 26 * scale, y - 1 * scale, 8 * scale, 13 * scale)
  g.lineStyle(0.9, gameColors.barkDark, 0.45)
  g.strokeEllipse(x - 26 * scale, y - 1 * scale, 4 * scale, 7 * scale)
  g.strokeEllipse(x + 26 * scale, y - 1 * scale, 4 * scale, 7 * scale)
  g.fillStyle(gameColors.moss, 0.8)
  g.fillEllipse(x - 4 * scale, y - 7 * scale, 16 * scale, 4 * scale)
  g.fillEllipse(x + 13 * scale, y - 6 * scale, 10 * scale, 3 * scale)
  drawMushroomCluster(g, x + 14 * scale, y - 4 * scale, 0.5 * scale)
}

export function drawSquirrel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  facing: 1 | -1 = 1,
): void {
  g.fillStyle(0x1a120c, 0.14)
  g.fillEllipse(x, y + 5 * scale, 20 * scale, 5 * scale)
  g.fillStyle(gameColors.bark, 1)
  g.fillEllipse(x - 8 * scale * facing, y - 8 * scale, 10 * scale, 16 * scale)
  g.fillStyle(gameColors.barkLight, 1)
  g.fillEllipse(x - 7 * scale * facing, y - 9 * scale, 6 * scale, 12 * scale)
  g.fillStyle(gameColors.coral, 1)
  g.fillEllipse(x, y, 12 * scale, 10 * scale)
  g.fillEllipse(x + 5 * scale * facing, y - 5 * scale, 8 * scale, 8 * scale)
  g.fillStyle(gameColors.hay, 0.95)
  g.fillEllipse(x + 3 * scale * facing, y + 2 * scale, 6 * scale, 4 * scale)
  g.fillStyle(gameColors.coral, 1)
  g.fillTriangle(
    x + 7 * scale * facing,
    y - 10 * scale,
    x + 11 * scale * facing,
    y - 12 * scale,
    x + 10 * scale * facing,
    y - 6 * scale,
  )
  g.fillStyle(0x2b241d, 1)
  g.fillCircle(x + 7 * scale * facing, y - 6 * scale, 1.3 * scale)
  g.fillCircle(x + 10 * scale * facing, y - 1 * scale, 1 * scale)
  g.fillStyle(gameColors.cream, 0.9)
  g.fillEllipse(x + 4 * scale * facing, y + 1 * scale, 3 * scale, 2 * scale)
}

export function drawHedgehog(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  facing: 1 | -1 = 1,
): void {
  g.fillStyle(0x1a120c, 0.14)
  g.fillEllipse(x, y + 5 * scale, 22 * scale, 5 * scale)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillEllipse(x - 2 * scale * facing, y - 1 * scale, 18 * scale, 12 * scale)
  g.fillStyle(gameColors.bark, 1)
  for (let index = 0; index < 5; index += 1) {
    g.fillTriangle(
      x - 9 * scale + index * 4 * scale,
      y - 7 * scale,
      x - 5 * scale + index * 4 * scale,
      y - 13 * scale,
      x - 1 * scale + index * 4 * scale,
      y - 6 * scale,
    )
  }
  g.fillStyle(gameColors.hay, 1)
  g.fillEllipse(x + 8 * scale * facing, y, 7 * scale, 6 * scale)
  g.fillStyle(0x2b241d, 1)
  g.fillCircle(x + 10 * scale * facing, y - 1 * scale, 1.2 * scale)
  g.fillCircle(x + 12 * scale * facing, y + 1 * scale, 1 * scale)
  g.fillStyle(gameColors.moss, 0.8)
  g.fillEllipse(x - 3 * scale, y + 4 * scale, 8 * scale, 2.5 * scale)
}

export function drawBird(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  facing: 1 | -1 = 1,
): void {
  g.fillStyle(0x1a120c, 0.12)
  g.fillEllipse(x, y + 4 * scale, 12 * scale, 3 * scale)
  g.fillStyle(gameColors.stoneDark, 1)
  g.fillEllipse(x, y, 11 * scale, 8 * scale)
  g.fillStyle(gameColors.stone, 1)
  g.fillEllipse(x - 1 * scale, y - 1 * scale, 8 * scale, 5 * scale)
  g.fillStyle(gameColors.stoneDark, 1)
  g.fillCircle(x + 5 * scale * facing, y - 4 * scale, 4.5 * scale)
  g.fillStyle(gameColors.sunbeam, 1)
  g.fillTriangle(
    x + 9 * scale * facing,
    y - 4 * scale,
    x + 13 * scale * facing,
    y - 3 * scale,
    x + 9 * scale * facing,
    y - 1 * scale,
  )
  g.fillStyle(0x2b241d, 1)
  g.fillCircle(x + 6 * scale * facing, y - 5 * scale, 1.1 * scale)
  g.fillStyle(gameColors.stoneDark, 1)
  g.fillTriangle(
    x - 5 * scale * facing,
    y - 1 * scale,
    x - 10 * scale * facing,
    y - 3 * scale,
    x - 6 * scale * facing,
    y + 2 * scale,
  )
}

export function drawFrog(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
): void {
  g.fillStyle(0x1a120c, 0.14)
  g.fillEllipse(x, y + 4 * scale, 18 * scale, 5 * scale)
  g.fillStyle(gameColors.leafDark, 1)
  g.fillEllipse(x, y, 14 * scale, 9 * scale)
  g.fillStyle(gameColors.leaf, 1)
  g.fillEllipse(x - 3 * scale, y - 1 * scale, 8 * scale, 6 * scale)
  g.fillCircle(x - 5 * scale, y - 5 * scale, 2.4 * scale)
  g.fillCircle(x + 5 * scale, y - 5 * scale, 2.4 * scale)
  g.fillStyle(0x2b241d, 1)
  g.fillCircle(x - 5 * scale, y - 5 * scale, 1 * scale)
  g.fillCircle(x + 5 * scale, y - 5 * scale, 1 * scale)
  g.lineStyle(1.6 * scale, gameColors.leafDark, 1)
  g.lineBetween(x - 7 * scale, y + 3 * scale, x - 10 * scale, y + 6 * scale)
  g.lineBetween(x + 7 * scale, y + 3 * scale, x + 10 * scale, y + 6 * scale)
}

export function drawWell(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
): void {
  g.fillStyle(0x1a120c, 0.16)
  g.fillEllipse(x, y + 8 * scale, 40 * scale, 12 * scale)
  g.fillStyle(gameColors.stoneDark, 1)
  g.fillEllipse(x, y, 34 * scale, 18 * scale)
  g.fillStyle(gameColors.stone, 1)
  g.fillEllipse(x, y - 2 * scale, 30 * scale, 14 * scale)
  g.fillStyle(0x2f4a5a, 0.9)
  g.fillEllipse(x, y - 2 * scale, 22 * scale, 9 * scale)
  g.fillStyle(0x6fb7b3, 0.75)
  g.fillEllipse(x - 2 * scale, y - 3 * scale, 14 * scale, 5 * scale)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x - 16 * scale, y - 30 * scale, 4 * scale, 30 * scale, 1.5 * scale)
  g.fillRoundedRect(x + 12 * scale, y - 30 * scale, 4 * scale, 30 * scale, 1.5 * scale)
  g.fillStyle(gameColors.bark, 1)
  g.fillRoundedRect(x - 20 * scale, y - 34 * scale, 40 * scale, 5 * scale, 2 * scale)
  g.fillStyle(gameColors.straw, 1)
  g.fillTriangle(x, y - 48 * scale, x - 24 * scale, y - 34 * scale, x + 24 * scale, y - 34 * scale)
  g.fillStyle(gameColors.hay, 1)
  g.fillTriangle(x, y - 44 * scale, x - 15 * scale, y - 34 * scale, x + 15 * scale, y - 34 * scale)
  g.lineStyle(1, gameColors.barkDark, 0.8)
  g.lineBetween(x, y - 34 * scale, x, y - 12 * scale)
  g.fillStyle(gameColors.bark, 1)
  g.fillRoundedRect(x - 4 * scale, y - 16 * scale, 8 * scale, 7 * scale, 2 * scale)
  g.fillStyle(gameColors.moss, 0.8)
  g.fillEllipse(x + 12 * scale, y + 2 * scale, 8 * scale, 3 * scale)
  g.fillEllipse(x - 10 * scale, y + 4 * scale, 6 * scale, 2.5 * scale)
}

export function drawBarrel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
): void {
  g.fillStyle(0x1a120c, 0.16)
  g.fillEllipse(x, y + 6 * scale, 22 * scale, 6 * scale)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x - 10 * scale, y - 12 * scale, 20 * scale, 18 * scale, 5 * scale)
  g.fillStyle(gameColors.bark, 1)
  g.fillRoundedRect(x - 8 * scale, y - 10 * scale, 16 * scale, 14 * scale, 4 * scale)
  g.fillStyle(gameColors.woodLight, 1)
  g.fillEllipse(x, y - 12 * scale, 18 * scale, 6 * scale)
  g.fillStyle(gameColors.hay, 0.8)
  g.fillEllipse(x, y - 12 * scale, 13 * scale, 4 * scale)
  g.lineStyle(1.4, gameColors.stoneDark, 0.9)
  g.lineBetween(x - 10 * scale, y - 5 * scale, x + 10 * scale, y - 5 * scale)
  g.lineBetween(x - 9 * scale, y + 2 * scale, x + 9 * scale, y + 2 * scale)
  g.fillStyle(gameColors.moss, 0.7)
  g.fillEllipse(x - 7 * scale, y - 10 * scale, 6 * scale, 2.5 * scale)
}

export function drawScarecrow(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
): void {
  g.fillStyle(0x1a120c, 0.14)
  g.fillEllipse(x, y + 4 * scale, 16 * scale, 5 * scale)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x - 1.5 * scale, y - 26 * scale, 3 * scale, 30 * scale, 1 * scale)
  g.fillRoundedRect(x - 12 * scale, y - 20 * scale, 24 * scale, 3 * scale, 1 * scale)
  g.fillStyle(gameColors.straw, 1)
  g.fillTriangle(
    x - 12 * scale,
    y - 20 * scale,
    x - 17 * scale,
    y - 18 * scale,
    x - 12 * scale,
    y - 16 * scale,
  )
  g.fillTriangle(
    x + 12 * scale,
    y - 20 * scale,
    x + 17 * scale,
    y - 18 * scale,
    x + 12 * scale,
    y - 16 * scale,
  )
  g.fillStyle(gameColors.coral, 1)
  g.fillRoundedRect(x - 7 * scale, y - 18 * scale, 14 * scale, 13 * scale, 3 * scale)
  g.fillStyle(gameColors.moss, 0.9)
  g.fillRoundedRect(x - 7 * scale, y - 18 * scale, 14 * scale, 4 * scale, 2 * scale)
  g.fillStyle(gameColors.hay, 1)
  g.fillCircle(x, y - 23 * scale, 6 * scale)
  g.fillStyle(0x2b241d, 1)
  g.fillCircle(x - 2 * scale, y - 24 * scale, 0.9 * scale)
  g.fillCircle(x + 2 * scale, y - 24 * scale, 0.9 * scale)
  g.lineStyle(1, gameColors.barkDark, 0.7)
  g.lineBetween(x - 2 * scale, y - 21 * scale, x + 2 * scale, y - 21 * scale)
  g.fillStyle(gameColors.straw, 1)
  g.fillEllipse(x, y - 29 * scale, 18 * scale, 5 * scale)
  g.fillStyle(gameColors.hay, 1)
  g.fillEllipse(x, y - 31 * scale, 12 * scale, 4 * scale)
}

export function drawBeehive(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
): void {
  g.fillStyle(0x1a120c, 0.14)
  g.fillEllipse(x, y + 6 * scale, 18 * scale, 5 * scale)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x - 1.5 * scale, y - 20 * scale, 3 * scale, 8 * scale, 1 * scale)
  g.fillStyle(gameColors.straw, 1)
  g.fillEllipse(x, y - 8 * scale, 18 * scale, 7 * scale)
  g.fillEllipse(x, y - 2 * scale, 20 * scale, 8 * scale)
  g.fillStyle(gameColors.hay, 1)
  g.fillEllipse(x, y - 12 * scale, 14 * scale, 6 * scale)
  g.fillEllipse(x, y - 5 * scale, 18 * scale, 6 * scale)
  g.fillStyle(0x5a3a22, 1)
  g.fillCircle(x, y - 2 * scale, 2.4 * scale)
  g.fillStyle(0x2b241d, 0.7)
  g.fillCircle(x, y - 2 * scale, 1.2 * scale)
  for (let index = 0; index < 3; index += 1) {
    const bx = x + (index - 1) * 12 * scale
    const by = y - 16 * scale - (index % 2) * 5 * scale
    g.fillStyle(gameColors.sunbeam, 0.9)
    g.fillEllipse(bx, by, 3 * scale, 2 * scale)
    g.lineStyle(0.8, gameColors.barkDark, 0.6)
    g.lineBetween(bx - 1 * scale, by - 1 * scale, bx + 1 * scale, by + 1 * scale)
  }
}

export function drawAntTrail(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
): void {
  g.lineStyle(0.8, gameColors.barkDark, 0.25)
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x + 18 * scale, y + 6 * scale)
  g.lineTo(x + 36 * scale, y + 2 * scale)
  g.lineTo(x + 54 * scale, y + 8 * scale)
  g.strokePath()
  for (let index = 0; index < 4; index += 1) {
    const px = x + (index * 18 + 6) * scale
    const py = y + (index % 2 === 0 ? 5 : 2) * scale
    g.fillStyle(0x2b241d, 0.85)
    g.fillCircle(px, py, 1.3 * scale)
    g.fillCircle(px - 2 * scale, py - 1.2 * scale, 0.9 * scale)
    g.fillCircle(px + 2 * scale, py - 1.2 * scale, 0.9 * scale)
  }
}

export function drawFirefly(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  phase: number,
): void {
  const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(phase))
  g.fillStyle(gameColors.sunbeam, 0.16 * pulse)
  g.fillCircle(x, y, 7)
  g.fillStyle(gameColors.sunbeam, 0.35 * pulse)
  g.fillCircle(x, y, 3.4)
  g.fillStyle(0xfff7d6, 0.95 * pulse)
  g.fillCircle(x, y, 1.5)
}

export function drawLantern(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
): void {
  g.lineStyle(1.4 * scale, gameColors.barkDark, 0.8)
  g.lineBetween(x, y - 18 * scale, x, y - 6 * scale)
  g.fillStyle(gameColors.sunbeam, 0.14)
  g.fillCircle(x, y, 14 * scale)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x - 5 * scale, y - 7 * scale, 10 * scale, 3 * scale, 1 * scale)
  g.fillStyle(0xfff3b0, 0.92)
  g.fillRoundedRect(x - 4 * scale, y - 4 * scale, 8 * scale, 11 * scale, 3 * scale)
  g.fillStyle(0xffffff, 0.55)
  g.fillRoundedRect(x - 2.4 * scale, y - 2.5 * scale, 2 * scale, 6 * scale, 1 * scale)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x - 4.5 * scale, y + 6 * scale, 9 * scale, 2.5 * scale, 1 * scale)
  g.fillStyle(0xffffff, 0.35)
  g.fillCircle(x, y + 1 * scale, 1.2 * scale)
}
