import { type Insets, NO_INSETS } from '@mg/core'
import { shopMapFor } from '../logic/config'
import type { Rect, ShopMap, Vec2 } from '../logic/types'
import { computeUiScale, computeWorldTextScale, computeWorldZoom } from './scale'

export interface HudLayout {
  readonly vertical: boolean
  /** Reserved HUD safe area. Only the mobile rail paints a surface here. */
  readonly bar: Rect
  readonly coins: Vec2
  /** Active drink buff chips sit here, above the world and clear of the rail. */
  readonly buffTop: number
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
  /** Extra camera zoom for phones; 1 on tablets and desktops. */
  readonly worldZoom: number
  /** UI size multiplier: 1 on desktop, up to 1.55 on phones. */
  readonly ui: number
  /** Screen-space labels anchored to world points (price chips, swap tags). */
  readonly worldUi: number
  /** Multiplier for labels drawn inside the world container. */
  readonly worldText: number
  readonly hud: HudLayout
  readonly panelWidth: number
  readonly panelHeight: number
}

export interface GameLayoutOptions {
  /** Phones and tablets move the HUD into a vertical rail in landscape. */
  readonly mobile?: boolean
  /** CSS viewport short side, used to scale the UI back up on phones. */
  readonly cssShortSide?: number
}

const TOP_GAP = 78
const MOBILE_TOP_GAP = 84
const BAR_HEIGHT = 60
const MOBILE_BAR_HEIGHT = 76
const BUTTON_SIZE = 64
const RAIL_WIDTH = 100
const RAIL_GAP = 6
const RAIL_ROOM_GAP = 6
const EDGE_GAP = 4

/** Vertical rail flow, in unscaled design units. */
const RAIL_COIN_Y = 40
const RAIL_BUFF_Y = 112
const RAIL_BUTTON_GAP = 6
const RAIL_BOTTOM_PAD = 10
/** World-anchored screen labels grow with the camera but stay tappable. */
const MAX_WORLD_UI_SCALE = 2.2

export function computeGameLayout(
  width: number,
  height: number,
  insets: Insets = NO_INSETS,
  options: GameLayoutOptions = {},
): GameLayout {
  const mobile = options.mobile === true
  const ui = computeUiScale(options.cssShortSide ?? 0)
  const portrait = height >= width
  const vertical = mobile && !portrait
  const map = shopMapFor(width, height)
  const contentLeft = vertical
    ? insets.left + (RAIL_GAP + RAIL_WIDTH + RAIL_ROOM_GAP) * ui
    : insets.left
  const contentWidth = Math.max(240, width - contentLeft - insets.right)
  const top = insets.top + (vertical ? EDGE_GAP * ui : (mobile ? MOBILE_TOP_GAP : TOP_GAP) * ui)
  const availableHeight = Math.max(240, height - top - insets.bottom - EDGE_GAP * ui)
  const fitScale = Math.min(contentWidth / map.room.w, availableHeight / map.room.h)
  const walkableWidth = Math.max(1, map.room.w - map.wall * 2)
  const walkableHeight = Math.max(1, map.room.h - map.wall * 2)
  // On mobile, scale by the walkable bounds instead of the decorative wall.
  // The outer wall may be cropped by the screen edge, but the player and every
  // facility stay visible and the shop uses the whole available side.
  const scale = Math.max(
    0.2,
    mobile ? Math.min(contentWidth / walkableWidth, availableHeight / walkableHeight) : fitScale,
  )
  const worldZoom = computeWorldZoom(scale, options.cssShortSide ?? 0)
  const worldUi = Math.min(MAX_WORLD_UI_SCALE, ui * worldZoom)
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
        x: insets.left + RAIL_GAP * ui,
        y: insets.top + RAIL_GAP * ui,
        w: RAIL_WIDTH * ui,
        h: Math.max(300, height - insets.top - insets.bottom - RAIL_GAP * 2 * ui),
      }
    : {
        x: insets.left + (mobile ? 6 : 12) * ui,
        y: insets.top + 8 * ui,
        w: Math.max(240, contentWidth - (mobile ? 12 : 24) * ui),
        h: (mobile ? MOBILE_BAR_HEIGHT : BAR_HEIGHT) * ui,
      }
  const centerY = bar.y + bar.h / 2
  const centerX = bar.x + bar.w / 2
  const buttonSize = BUTTON_SIZE * ui
  const pause: Vec2 = vertical
    ? { x: centerX, y: bar.y + bar.h - RAIL_BOTTOM_PAD * ui - buttonSize / 2 }
    : { x: bar.x + bar.w - buttonSize * 0.55, y: centerY }

  return {
    width,
    height,
    portrait,
    insets,
    map,
    content,
    room,
    worldScale: scale,
    worldZoom,
    ui,
    worldUi,
    worldText: computeWorldTextScale(scale, options.cssShortSide ?? 0),
    hud: {
      vertical,
      bar,
      coins: vertical
        ? { x: centerX, y: bar.y + RAIL_COIN_Y * ui }
        : { x: bar.x + 36 * ui, y: centerY },
      buffTop: vertical ? bar.y + RAIL_BUFF_Y * ui : bar.y + bar.h + 14 * ui,
      shop: vertical
        ? { x: centerX, y: pause.y - buttonSize - RAIL_BUTTON_GAP * ui }
        : { x: bar.x + bar.w - buttonSize * 1.55, y: centerY },
      pause,
      buttonSize,
    },
    // Phones use the whole viewport: portrait keeps two columns, landscape
    // switches the shop panel to three so taller cards still fit.
    panelWidth: mobile ? width - 16 * ui : Math.min(720, width - 24),
    // Tall enough for the five-row producer tab, short enough to stay a dialog.
    panelHeight: Math.min(mobile ? 1330 : 1180, height - 20 * ui),
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
