import { getTextResolution } from '@mg/core'
import type Phaser from 'phaser'

/**
 * Largest texture edge a baked layer may allocate. The map is 1280x680 world
 * units, so a 3x bake would already cost 30 MB of GPU memory on a phone.
 */
const MAX_TEXTURE_EDGE = 4096
/**
 * One baked layer must not dominate GPU memory. 6M texels is ~24 MB of RGBA,
 * which still lets the 1280x680 floor plan bake at 2.5x on a phone.
 */
const MAX_BAKE_TEXELS = 6_000_000

/**
 * Physical pixels per design unit. The canvas backing store is already larger
 * than the design space on most screens, so a texture baked at 1 texel per
 * design unit is magnified 1.5-3x and reads as blurry.
 */
export function screenBakeScale(): number {
  // Screen furniture is generated through Canvas2D, which already antialiases,
  // so exact physical density is enough. A full-screen layer should not pay for
  // supersampling it does not need.
  return Math.max(1, getTextResolution())
}

/**
 * Physical pixels per world unit for art inside the scaled world container.
 * The container scale and the canvas density multiply, so both belong in the
 * factor. Half steps keep the texture cache from churning on tiny layout moves.
 */
export function worldBakeScale(cameraScale: number): number {
  return Math.max(1, Math.ceil(cameraScale * getTextResolution() * 2) / 2)
}

/**
 * Screen-space UI is small enough to supersample. Render Textures have no MSAA,
 * so a 2x density bake is what keeps rounded corners and tool badges smooth.
 */
export function uiBakeScale(): number {
  return Math.min(4, Math.max(1, Math.ceil(getTextResolution() * 2)))
}

/** Edge and memory limits shared by both bake paths. */
function bakeFactor(width: number, height: number, scale: number): number {
  const edge = Math.max(width, height)
  const byEdge = MAX_TEXTURE_EDGE / Math.max(1, edge)
  const byArea = Math.sqrt(MAX_BAKE_TEXELS / Math.max(1, width * height))
  return Math.max(1, Math.min(scale, byEdge, byArea))
}

/**
 * Phaser walks a Graphics command buffer on every rendered frame, even when the
 * drawing never changed. One shop background is roughly 190k buffer entries, so
 * a static layer costs the whole frame budget forever. Bake it into a texture
 * once and swap it for an Image: the renderer then submits a single quad.
 *
 * `width`/`height` are in the Graphics' local units and must start at (0, 0):
 * `generateTexture` clips anything drawn above or left of the origin.
 */
export function bakeGraphics(
  scene: Phaser.Scene,
  graphics: Phaser.GameObjects.Graphics,
  key: string,
  width: number,
  height: number,
  scale = 1,
): Phaser.GameObjects.Image {
  const factor = bakeFactor(width, height, scale)
  const textures = scene.textures
  if (textures.exists(key)) textures.remove(key)

  const previousScale = graphics.scaleX
  graphics.setScale(factor)
  graphics.generateTexture(key, Math.ceil(width * factor), Math.ceil(height * factor))
  graphics.setScale(previousScale)
  // The caller keeps the Graphics in place (it may re-bake later), so clear the
  // buffer: a non-empty command buffer is re-walked by the renderer every frame.
  graphics.clear()

  return scene.add
    .image(0, 0, key)
    .setOrigin(0, 0)
    .setScale(1 / factor)
}

/**
 * Bakes a Graphics whose drawing is centred on its own origin, or otherwise
 * extends into negative coordinates. `generateTexture` clips anything left of
 * or above (0, 0), so the layer is rendered through a Render Texture that can
 * be given an offset. The texture covers `origin` plus `width` x `height` in
 * the Graphics' local units.
 */
export function bakeLayer(
  scene: Phaser.Scene,
  graphics: Phaser.GameObjects.Graphics,
  key: string,
  origin: { readonly x: number; readonly y: number },
  width: number,
  height: number,
  scale = 1,
): Phaser.GameObjects.Image {
  const factor = bakeFactor(width, height, scale)
  const textures = scene.textures
  if (textures.exists(key)) textures.remove(key)

  const previousScale = graphics.scaleX
  graphics.setScale(factor)
  const target = scene.make.renderTexture(
    { x: 0, y: 0, width: Math.ceil(width * factor), height: Math.ceil(height * factor) },
    false,
  )
  target.draw(graphics, -origin.x * factor, -origin.y * factor)
  target.render()
  target.saveTexture(key)
  graphics.setScale(previousScale)
  graphics.clear()
  target.destroy()

  return scene.add
    .image(origin.x, origin.y, key)
    .setOrigin(0, 0)
    .setScale(1 / factor)
}
