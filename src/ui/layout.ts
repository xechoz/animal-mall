import { type Insets, NO_INSETS } from '@mg/core'
import { shopMapFor } from '../logic/config'
import type { Rect, ShopMap, Vec2 } from '../logic/types'

export interface HudLayout {
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
  readonly room: Rect
  readonly worldScale: number
  readonly hud: HudLayout
  readonly panelWidth: number
  readonly panelHeight: number
}

const TOP_GAP = 78
const BUTTON_SIZE = 64

export function computeGameLayout(
  width: number,
  height: number,
  insets: Insets = NO_INSETS,
): GameLayout {
  const portrait = height >= width
  const map = shopMapFor(width, height)
  const safeWidth = width - insets.left - insets.right
  const top = insets.top + TOP_GAP
  const availableHeight = Math.max(240, height - top - insets.bottom - 12)
  const scale = Math.max(0.2, Math.min((safeWidth - 24) / map.room.w, availableHeight / map.room.h))
  const room: Rect = {
    x: insets.left + (safeWidth - map.room.w * scale) / 2,
    y: top + (availableHeight - map.room.h * scale) / 2,
    w: map.room.w * scale,
    h: map.room.h * scale,
  }

  const bar: Rect = {
    x: insets.left + 12,
    y: insets.top + 8,
    w: Math.max(240, safeWidth - 24),
    h: 60,
  }
  const centerY = bar.y + bar.h / 2
  const shopX = bar.x + bar.w - BUTTON_SIZE * 1.55
  const pauseX = bar.x + bar.w - BUTTON_SIZE * 0.55

  return {
    width,
    height,
    portrait,
    insets,
    map,
    room,
    worldScale: scale,
    hud: {
      bar,
      coins: { x: bar.x + 58, y: centerY },
      goal: { x: insets.left + safeWidth / 2, y: centerY },
      goalWidth: Math.min(220, Math.max(120, safeWidth * 0.3)),
      shop: { x: shopX, y: centerY },
      pause: { x: pauseX, y: centerY },
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
