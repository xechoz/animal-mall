import { describe, expect, it } from 'vitest'
import {
  type CameraLayout,
  createWorldCamera,
  followWorldCamera,
  snapWorldCamera,
  worldToScreen,
} from './worldCamera'

function phoneLayout(): CameraLayout {
  return {
    content: { x: 0, y: 121, w: 720, h: 1431 },
    room: { x: -27, y: 153, w: 774, h: 1367 },
    worldScale: 1.139,
    worldZoom: 1.45,
    map: { room: { w: 680, h: 1200 } },
  }
}

function landscapeLayout(): CameraLayout {
  return {
    content: { x: 174, y: 6, w: 1384, h: 708 },
    room: { x: -108, y: -192, w: 1949, h: 1104 },
    worldScale: 1.12,
    worldZoom: 1.45,
    map: { room: { w: 1200, h: 680 } },
  }
}

describe('world camera', () => {
  it('zooms phones in and keeps the focused player on screen', () => {
    const layout = phoneLayout()
    const focus = { x: layout.map.room.w / 2, y: layout.map.room.h / 2 }
    const camera = createWorldCamera(layout, focus)
    expect(camera.zoom).toBeCloseTo(1.45, 5)
    expect(camera.scale).toBeCloseTo(layout.worldScale * 1.45, 5)
    const screen = worldToScreen(camera, focus)
    expect(screen.x).toBeGreaterThanOrEqual(layout.content.x)
    expect(screen.x).toBeLessThanOrEqual(layout.content.x + layout.content.w)
    expect(screen.y).toBeGreaterThanOrEqual(layout.content.y)
    expect(screen.y).toBeLessThanOrEqual(layout.content.y + layout.content.h)
  })

  it('does not scroll until the player leaves the dead zone', () => {
    const layout = phoneLayout()
    const focus = { x: layout.map.room.w / 2, y: layout.map.room.h / 2 }
    const camera = createWorldCamera(layout, focus)
    const startX = camera.x
    const startY = camera.y
    followWorldCamera(layout, camera, { x: focus.x + 6, y: focus.y + 6 }, 16)
    expect(camera.x).toBeCloseTo(startX, 5)
    expect(camera.y).toBeCloseTo(startY, 5)
  })

  it('follows a walking player and clamps to the shop edges', () => {
    const layout = phoneLayout()
    const focus = { x: layout.map.room.w / 2, y: layout.map.room.h / 2 }
    const camera = createWorldCamera(layout, focus)
    const towardLeft = { x: 40, y: layout.map.room.h / 2 }
    for (let frame = 0; frame < 120; frame += 1) {
      followWorldCamera(layout, camera, towardLeft, 16)
    }
    const screen = worldToScreen(camera, towardLeft)
    expect(screen.x).toBeGreaterThanOrEqual(layout.content.x - 0.001)
    expect(screen.y).toBeGreaterThanOrEqual(layout.content.y - 0.001)
    expect(screen.x).toBeLessThanOrEqual(layout.content.x + layout.content.w + 0.001)
    expect(screen.y).toBeLessThanOrEqual(layout.content.y + layout.content.h + 0.001)
  })

  it('snaps when the layout changes instead of panning across the shop', () => {
    const portrait = phoneLayout()
    const camera = createWorldCamera(portrait, { x: 340, y: 600 })
    const landscape = landscapeLayout()
    snapWorldCamera(landscape, camera, { x: 300, y: 600 })
    expect(camera.scale).toBeCloseTo(landscape.worldScale * landscape.worldZoom, 5)
    expect(camera.zoom).toBe(landscape.worldZoom)
  })

  it('leaves tablets and desktops at 1:1', () => {
    const layout: CameraLayout = {
      content: { x: 0, y: 60, w: 1152, h: 620 },
      room: { x: 0, y: 60, w: 1152, h: 620 },
      worldScale: 0.96,
      worldZoom: 1,
      map: { room: { w: 1200, h: 680 } },
    }
    const camera = createWorldCamera(layout, { x: 300, y: 600 })
    expect(camera.zoom).toBe(1)
    expect(camera.scale).toBeCloseTo(layout.worldScale, 5)
    expect(camera.x).toBeCloseTo(layout.room.x, 5)
    expect(camera.y).toBeCloseTo(layout.room.y, 5)
  })
})
