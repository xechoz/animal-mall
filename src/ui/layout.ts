import { type Insets, NO_INSETS } from '@mg/core'
import type { Rect, Vec2 } from '../logic/types'

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
  readonly room: Rect
  readonly worldScale: number
  readonly hud: HudLayout
  readonly panelWidth: number
  readonly panelHeight: number
}

const ROOM_UNITS = 640
const TOP_GAP = 72
const BUTTON_SIZE = 54

export function computeGameLayout(
  width: number,
  height: number,
  insets: Insets = NO_INSETS,
): GameLayout {
  const portrait = height >= width
  const safeWidth = width - insets.left - insets.right
  const top = insets.top + TOP_GAP
  const availableHeight = Math.max(240, height - top - insets.bottom - 12)
  const roomSize = Math.max(240, Math.min(ROOM_UNITS, safeWidth - 24, availableHeight))
  const room: Rect = {
    x: insets.left + (safeWidth - roomSize) / 2,
    y: top + (availableHeight - roomSize) / 2,
    w: roomSize,
    h: roomSize,
  }

  const bar: Rect = {
    x: insets.left + 12,
    y: insets.top + 8,
    w: Math.max(240, safeWidth - 24),
    h: 52,
  }
  const centerY = bar.y + bar.h / 2
  const shopX = bar.x + bar.w - BUTTON_SIZE * 1.55
  const pauseX = bar.x + bar.w - BUTTON_SIZE * 0.55

  return {
    width,
    height,
    portrait,
    insets,
    room,
    worldScale: roomSize / ROOM_UNITS,
    hud: {
      bar,
      coins: { x: bar.x + 58, y: centerY },
      goal: { x: insets.left + safeWidth / 2, y: centerY },
      goalWidth: Math.min(300, Math.max(160, safeWidth * 0.34)),
      shop: { x: shopX, y: centerY },
      pause: { x: pauseX, y: centerY },
      buttonSize: BUTTON_SIZE,
    },
    panelWidth: Math.min(720, width - 28),
    panelHeight: Math.min(650, height - 28),
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
