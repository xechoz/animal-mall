import { type Insets, NO_INSETS } from '@mg/core'
import { shopMapFor } from '../logic/config'
import type { Rect, ShopMap, Vec2 } from '../logic/types'

export interface HudLayout {
  readonly vertical: boolean
  readonly bar: Rect
  readonly coins: Vec2
  readonly goal: Vec2
  readonly goalWidth: number
  readonly shop: Vec2
  readonly pause: Vec2
  readonly buttonSize: number
}

export interface GameLayout {
  readonly width: number
  readonly height: number
  readonly portrait: boolean
  readonly insets: Insets
  readonly map: ShopMap
  /** Visible play area between the rail/HUD and the screen edges. */
  readonly content: Rect
  readonly room: Rect
  readonly worldScale: number
  readonly hud: HudLayout
  readonly panelWidth: number
  readonly panelHeight: number
}

export interface GameLayoutOptions {
  /** Phones and tablets move the HUD into a vertical rail in landscape. */
  readonly mobile?: boolean
}

const TOP_GAP = 78
const MOBILE_TOP_GAP = 76
const BUTTON_SIZE = 64
const RAIL_WIDTH = 100
const RAIL_GAP = 6
const RAIL_ROOM_GAP = 6
const EDGE_GAP = 4

export function computeGameLayout(
  width: number,
  height: number,
  insets: Insets = NO_INSETS,
  options: GameLayoutOptions = {},
): GameLayout {
  const portrait = height >= width
  const vertical = options.mobile === true && !portrait
  const map = shopMapFor(width, height)
  const contentLeft = vertical ? insets.left + RAIL_GAP + RAIL_WIDTH + RAIL_ROOM_GAP : insets.left
  const contentWidth = Math.max(240, width - contentLeft - insets.right)
  const top =
    insets.top + (vertical ? EDGE_GAP : options.mobile === true ? MOBILE_TOP_GAP : TOP_GAP)
  const availableHeight = Math.max(240, height - top - insets.bottom - EDGE_GAP)
  const fitScale = Math.min(contentWidth / map.room.w, availableHeight / map.room.h)
  const walkableWidth = Math.max(1, map.room.w - map.wall * 2)
  const walkableHeight = Math.max(1, map.room.h - map.wall * 2)
  // On mobile, scale by the walkable bounds instead of the decorative wall.
  // The outer wall may be cropped by the screen edge, but the player and every
  // facility stay visible and the shop uses the whole available side.
  const scale = Math.max(
    0.2,
    options.mobile === true
      ? Math.min(contentWidth / walkableWidth, availableHeight / walkableHeight)
      : fitScale,
  )
  const content: Rect = {
    x: contentLeft,
    y: top,
    w: contentWidth,
    h: availableHeight,
  }
  const room: Rect = {
    x: contentLeft + (contentWidth - map.room.w * scale) / 2,
    y: top + (availableHeight - map.room.h * scale) / 2,
    w: map.room.w * scale,
    h: map.room.h * scale,
  }

  const bar: Rect = vertical
    ? {
        x: insets.left + RAIL_GAP,
        y: insets.top + RAIL_GAP,
        w: RAIL_WIDTH,
        h: Math.max(300, height - insets.top - insets.bottom - RAIL_GAP * 2),
      }
    : {
        x: insets.left + (options.mobile === true ? 6 : 12),
        y: insets.top + 8,
        w: Math.max(240, contentWidth - (options.mobile === true ? 12 : 24)),
        h: 60,
      }
  const centerY = bar.y + bar.h / 2
  const centerX = bar.x + bar.w / 2

  return {
    width,
    height,
    portrait,
    insets,
    map,
    content,
    room,
    worldScale: scale,
    hud: {
      vertical,
      bar,
      coins: vertical ? { x: centerX, y: bar.y + 40 } : { x: bar.x + 58, y: centerY },
      goal: vertical
        ? { x: centerX, y: bar.y + 120 }
        : { x: insets.left + contentWidth / 2, y: centerY },
      goalWidth: vertical ? bar.w - 32 : Math.min(220, Math.max(120, contentWidth * 0.3)),
      shop: vertical
        ? { x: centerX, y: Math.max(bar.y + 208, bar.y + bar.h - 250) }
        : { x: bar.x + bar.w - BUTTON_SIZE * 1.55, y: centerY },
      pause: vertical
        ? { x: centerX, y: Math.max(bar.y + 288, bar.y + bar.h - 150) }
        : { x: bar.x + bar.w - BUTTON_SIZE * 0.55, y: centerY },
      buttonSize: BUTTON_SIZE,
    },
    panelWidth: Math.min(720, width - 24),
    panelHeight: Math.min(1180, height - 20),
  }
}

export function worldToScreen(layout: GameLayout, point: Vec2): Vec2 {
  return {
    x: layout.room.x + point.x * layout.worldScale,
    y: layout.room.y + point.y * layout.worldScale,
  }
}

export function pointInRect(point: Vec2, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  )
}
