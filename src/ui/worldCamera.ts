import type { Rect, Vec2 } from '../logic/types'

/** Mutable view transform shared by the world container and its overlays. */
export interface WorldCamera {
  x: number
  y: number
  scale: number
  zoom: number
}

/** The subset of `GameLayout` the camera maths needs. */
export interface CameraLayout {
  readonly content: Rect
  readonly room: Rect
  readonly worldScale: number
  readonly worldZoom: number
  readonly map: { readonly room: { readonly w: number; readonly h: number } }
}

/** How quickly the camera catches up once the player leaves the dead zone. */
const SMOOTHING_PER_SECOND = 11
/** A tab switch must not fling the camera across the shop. */
const MAX_STEP_MS = 64
/** Fraction of the play area where the player can move without scrolling. */
const DEADZONE_FRACTION = 0.42
const EPSILON = 0.0001

export function createWorldCamera(layout: CameraLayout, focus: Vec2): WorldCamera {
  const camera: WorldCamera = { x: 0, y: 0, scale: 1, zoom: 1 }
  snapWorldCamera(layout, camera, focus)
  return camera
}

/**
 * Places the camera immediately. Used on scene start and whenever the layout
 * changes, because a smooth pan across a rotation feels like a bug.
 */
export function snapWorldCamera(layout: CameraLayout, camera: WorldCamera, focus: Vec2): void {
  camera.scale = layout.worldScale * layout.worldZoom
  camera.zoom = layout.worldZoom
  if (camera.zoom <= 1 + EPSILON) {
    camera.x = layout.room.x
    camera.y = layout.room.y
    return
  }
  const center = viewCenter(layout)
  camera.x = center.x - focus.x * camera.scale
  camera.y = center.y - focus.y * camera.scale
  clampCamera(layout, camera)
}

/**
 * Eases the camera towards the player. The world is only zoomed in on phones;
 * at 1:1 the whole shop stays fixed and no follow is needed.
 */
export function followWorldCamera(
  layout: CameraLayout,
  camera: WorldCamera,
  focus: Vec2,
  dtMs: number,
): void {
  const scale = layout.worldScale * layout.worldZoom
  if (
    Math.abs(camera.scale - scale) > EPSILON ||
    Math.abs(camera.zoom - layout.worldZoom) > EPSILON
  ) {
    snapWorldCamera(layout, camera, focus)
    return
  }
  if (camera.zoom <= 1 + EPSILON) {
    camera.x = layout.room.x
    camera.y = layout.room.y
    return
  }

  const center = viewCenter(layout)
  const halfDeadzoneX = (layout.content.w * DEADZONE_FRACTION) / 2
  const halfDeadzoneY = (layout.content.h * DEADZONE_FRACTION) / 2
  const playerX = camera.x + focus.x * camera.scale
  const playerY = camera.y + focus.y * camera.scale

  let targetX = camera.x
  if (playerX < center.x - halfDeadzoneX) targetX += center.x - halfDeadzoneX - playerX
  else if (playerX > center.x + halfDeadzoneX) targetX -= playerX - (center.x + halfDeadzoneX)

  let targetY = camera.y
  if (playerY < center.y - halfDeadzoneY) targetY += center.y - halfDeadzoneY - playerY
  else if (playerY > center.y + halfDeadzoneY) targetY -= playerY - (center.y + halfDeadzoneY)

  targetX = clampAxis(targetX, layout.content.x, layout.content.w, layout.map.room.w * camera.scale)
  targetY = clampAxis(targetY, layout.content.y, layout.content.h, layout.map.room.h * camera.scale)

  const step = Math.min(Math.max(dtMs, 0), MAX_STEP_MS)
  const blend = 1 - Math.exp((-SMOOTHING_PER_SECOND * step) / 1000)
  camera.x += (targetX - camera.x) * blend
  camera.y += (targetY - camera.y) * blend
  clampCamera(layout, camera)
}

export function worldToScreen(camera: WorldCamera, point: Vec2): Vec2 {
  return {
    x: camera.x + point.x * camera.scale,
    y: camera.y + point.y * camera.scale,
  }
}

function viewCenter(layout: CameraLayout): Vec2 {
  return {
    x: layout.content.x + layout.content.w / 2,
    y: layout.content.y + layout.content.h / 2,
  }
}

function clampCamera(layout: CameraLayout, camera: WorldCamera): void {
  camera.x = clampAxis(
    camera.x,
    layout.content.x,
    layout.content.w,
    layout.map.room.w * camera.scale,
  )
  camera.y = clampAxis(
    camera.y,
    layout.content.y,
    layout.content.h,
    layout.map.room.h * camera.scale,
  )
}

function clampAxis(value: number, start: number, viewSize: number, roomSize: number): number {
  if (roomSize <= viewSize) return start + (viewSize - roomSize) / 2
  const min = start + viewSize - roomSize
  const max = start
  return Math.min(max, Math.max(min, value))
}
