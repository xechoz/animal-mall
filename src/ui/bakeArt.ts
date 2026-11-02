import type Phaser from 'phaser'

/**
 * Largest texture edge a baked layer may allocate. The map is 1280x680 world
 * units, so a 3x bake would already cost 30 MB of GPU memory on a phone.
 */
const MAX_TEXTURE_EDGE = 4096
/** Hard ceiling on supersampling; above 2x the cost outweighs the sharpness. */
const MAX_BAKE_SCALE = 2

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
  const edge = Math.max(width, height)
  const factor = Math.max(1, Math.min(scale, MAX_BAKE_SCALE, MAX_TEXTURE_EDGE / Math.max(1, edge)))
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
  const edge = Math.max(width, height)
  const factor = Math.max(1, Math.min(scale, MAX_BAKE_SCALE, MAX_TEXTURE_EDGE / Math.max(1, edge)))
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
