import { type Insets, NO_INSETS } from '@mg/core'
import { shopMapFor } from '../logic/config'
import type { Rect, ShopMap, Vec2 } from '../logic/types'
import { computeUiScale, computeWorldTextScale, computeWorldZoom, DESIGN_BASE } from './scale'

export interface HudLayout {
  /** Top row shared by every layout; only the floating pills paint a surface. */
  readonly bar: Rect
  readonly coins: Vec2
  /** Floating day/time pill; the only HUD surface besides coins and buttons. */
  readonly clock: Vec2
  readonly clockWidth: number
  readonly clockHeight: number
  /** Active drink buff chips sit here, under the coin pill. */
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
  /** Visible play area between the HUD band and the screen edges. */
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
  /**
   * UI font sizes in design units. These are derived from a CSS-pixel floor so
   * secondary copy stays readable when 720 design units are squeezed into a
   * phone's short side.
   */
  readonly text: {
    readonly caption: number
    readonly body: number
    readonly label: number
    readonly title: number
  }
  readonly hud: HudLayout
  readonly panelWidth: number
  readonly panelHeight: number
}

export interface GameLayoutOptions {
  /** Phones and tablets enlarge the HUD and let it float over the world. */
  readonly mobile?: boolean
  /** CSS viewport short side, used to scale the UI back up on phones. */
  readonly cssShortSide?: number
}

const TOP_GAP = 78
const MOBILE_TOP_GAP = 84
const BAR_HEIGHT = 60
const MOBILE_BAR_HEIGHT = 76
const BUTTON_SIZE = 64
const EDGE_GAP = 4
/** Safe-area inset for the corner action buttons. */
const HUD_EDGE = 10
/** Gap between shop and pause; keeps two 53px targets apart on a phone. */
const HUD_BUTTON_GAP = 12
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
  const map = shopMapFor(width, height)
  const contentLeft = insets.left
  const contentWidth = Math.max(240, width - contentLeft - insets.right)
  // The HUD floats, so only desktop and portrait phones keep a band above the
  // world. Landscape phones let the top row sit on the map's decorative edge.
  const topGap = mobile ? (portrait ? MOBILE_TOP_GAP : EDGE_GAP) : TOP_GAP
  const top = insets.top + topGap * ui
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
  const cssPerDesign =
    options.cssShortSide !== undefined && options.cssShortSide > 0
      ? options.cssShortSide / DESIGN_BASE
      : 1
  const text = {
    caption: Math.max(12 * ui, 11 / cssPerDesign),
    body: Math.max(14 * ui, 13 / cssPerDesign),
    label: Math.max(16 * ui, 15 / cssPerDesign),
    title: Math.max(26 * ui, 22 / cssPerDesign),
  }
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

  const bar: Rect = {
    x: insets.left + (mobile ? 6 : 12) * ui,
    y: insets.top + 8 * ui,
    w: Math.max(240, contentWidth - (mobile ? 12 : 24) * ui),
    h: (mobile ? MOBILE_BAR_HEIGHT : BAR_HEIGHT) * ui,
  }
  // One row on every layout: coins stay left, the clock follows the shop and
  // pause buttons anchored to the top-right safe-area corner.
  const buttonSize = BUTTON_SIZE * ui
  const actionY = insets.top + HUD_EDGE * ui + buttonSize / 2
  const pause: Vec2 = {
    x: width - insets.right - HUD_EDGE * ui - buttonSize / 2,
    y: actionY,
  }
  const shop: Vec2 = { x: pause.x - buttonSize - HUD_BUTTON_GAP * ui, y: actionY }
  const clockWidth = 104 * ui
  const clockHeight = 46 * ui
  const clock: Vec2 = { x: shop.x - buttonSize * 1.55, y: actionY }

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
    text,
    hud: {
      bar,
      coins: { x: bar.x + 36 * ui, y: actionY },
      clock,
      clockWidth,
      clockHeight,
      buffTop: bar.y + bar.h + 14 * ui,
      shop,
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
