import Phaser from 'phaser'
import { gameColors } from '../colors'
import type { ShopMap } from '../logic/types'
import { bakeLayer } from './bakeArt'
import { drawBarrel } from './forestArt'
import { addPropShadow, COUNTER_HEIGHT, drawExtrudedSlab, drawLeg, PROP_TOP_SCALE } from './propArt'

/**
 * The till is a real volume now: customers behind it are occluded by the front
 * face while the cashier in front draws over it. Keeping it out of the baked
 * floor plan is what makes that depth sort possible.
 */
export class CounterView extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, map: ShopMap, bakeScale: number) {
    const rect = map.counter
    super(scene, rect.x + rect.w / 2, rect.y + rect.h / 2)
    const w = rect.w
    const h = rect.h
    const register = map.register
    const registerX = register.x - (rect.x + rect.w / 2)
    const topDepth = h * PROP_TOP_SCALE
    const top = h / 2 - COUNTER_HEIGHT - topDepth
    const registerY = top + topDepth * 0.52

    addPropShadow(scene, this, { width: w + 18, height: h + 14, alpha: 0.2 })

    const g = scene.add.graphics()
    const frontEdge = h / 2 - COUNTER_HEIGHT
    const floorY = h / 2
    const legW = 10
    const leftLeg = -w / 2 + 10
    const rightLeg = w / 2 - 10 - legW
    const panelTop = frontEdge + 4
    const panelBottom = floorY - 10

    // Front legs and toe-kick: the recess at the bottom stops the cabinet from
    // reading as one solid block.
    drawLeg(g, {
      x: leftLeg,
      y: frontEdge - 8,
      w: legW,
      h: floorY - frontEdge + 8,
      color: gameColors.bark,
      edge: gameColors.woodLight,
    })
    drawLeg(g, {
      x: rightLeg,
      y: frontEdge - 8,
      w: legW,
      h: floorY - frontEdge + 8,
      color: gameColors.bark,
      edge: gameColors.woodLight,
    })
    g.fillStyle(0x2f1e12, 0.62)
    g.fillRoundedRect(leftLeg + legW + 2, floorY - 10, rightLeg - leftLeg - legW - 4, 10, 2)

    // Recessed front panel with two doors and a centre stile.
    g.fillStyle(gameColors.wood, 1)
    g.fillRoundedRect(
      leftLeg + legW,
      panelTop,
      rightLeg - leftLeg - legW,
      panelBottom - panelTop,
      4,
    )
    const doorGap = 6
    const doorW = (rightLeg - leftLeg - legW - doorGap * 3) / 2
    g.fillStyle(gameColors.barkDark, 0.28)
    g.fillRoundedRect(leftLeg + legW + doorGap, panelTop + 4, doorW, panelBottom - panelTop - 8, 3)
    g.fillRoundedRect(
      leftLeg + legW + doorGap * 2 + doorW,
      panelTop + 4,
      doorW,
      panelBottom - panelTop - 8,
      3,
    )
    g.fillStyle(gameColors.woodLight, 0.35)
    g.fillRect(
      leftLeg + legW + doorGap * 2 + doorW - 2,
      panelTop + 4,
      2,
      panelBottom - panelTop - 8,
    )
    g.fillStyle(0xffd166, 0.9)
    g.fillCircle(leftLeg + legW + doorGap + doorW - 6, panelTop + 8, 1.8)
    g.fillCircle(leftLeg + legW + doorGap * 2 + doorW + 6, panelTop + 8, 1.8)

    // Foreshortened top board with an overhang and a front lip.
    g.fillStyle(gameColors.barkDark, 1)
    g.fillRoundedRect(-w / 2, top, w, topDepth, 12)
    g.fillStyle(gameColors.wood, 1)
    g.fillRoundedRect(-w / 2 + 4, top + 3, w - 8, topDepth - 9, 10)
    g.fillStyle(gameColors.woodLight, 1)
    g.fillRoundedRect(-w / 2 + 8, top + 6, w - 16, topDepth - 14, 8)
    g.fillStyle(0xfff3dd, 0.24)
    g.fillRoundedRect(-w / 2 + 12, top + 8, w - 24, 3, 1.5)
    g.lineStyle(1, 0x7b4f33, 0.2)
    for (let index = 0; index < 3; index += 1) {
      const plankY = top + 14 + index * 7
      g.lineBetween(-w / 2 + 14, plankY, w / 2 - 14, plankY)
    }
    g.fillStyle(gameColors.barkDark, 1)
    g.fillRoundedRect(-w / 2, frontEdge - 8, w, 8, 4)
    g.fillStyle(0xb07a4a, 1)
    g.fillRoundedRect(-w / 2 + 2, frontEdge - 7, w - 4, 2, 1)
    g.fillStyle(0x1a120c, 0.2)
    g.fillRect(-w / 2 + 10, frontEdge, w - 20, 5)
    g.fillStyle(0x1a120c, 0.14)
    g.fillRect(w / 2 - 5, top + 6, 5, topDepth - 12)

    g.fillStyle(gameColors.moss, 0.65)
    g.fillEllipse(-w / 2 + 24, floorY - 3, 18, 5)
    g.fillEllipse(w / 2 - 28, floorY - 3, 16, 5)

    drawRegister(g, registerX, registerY)
    drawBarrel(g, -w / 2 - 26, -h / 2 + 26, 0.9)

    this.add(
      bakeLayer(
        scene,
        g,
        `counter-${map.id}`,
        { x: -w / 2 - 64, y: -h / 2 - COUNTER_HEIGHT - 26 },
        w + 128,
        h + COUNTER_HEIGHT + 52,
        bakeScale,
      ),
    )
    g.destroy()
    this.setDepth(rect.y + rect.h)
    scene.add.existing(this)
  }
}

/** A brass-and-wood till: cash drawer, keyboard, raised display and bell. */
function drawRegister(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
  const x = cx - 28
  const y = cy - 10
  const w = 56
  const d = 20
  const h = 12
  drawExtrudedSlab(g, {
    x,
    y,
    w,
    d,
    h,
    radius: 5,
    palette: {
      top: gameColors.woodLight,
      front: gameColors.barkDark,
      side: gameColors.barkDark,
      edge: gameColors.cream,
    },
  })

  const frontTop = y + d - h
  const top = frontTop - d * PROP_TOP_SCALE

  // Cash drawer with a brass pull.
  g.fillStyle(0x3b2f3a, 0.9)
  g.fillRoundedRect(x + 3, frontTop + 2, w - 6, h - 4, 3)
  g.fillStyle(0x4b4050, 1)
  g.fillRoundedRect(x + 5, frontTop + 4, w - 10, 3, 1.5)
  g.fillStyle(0xffd166, 1)
  g.fillRoundedRect(cx - 9, frontTop + 7, 18, 3, 1.5)
  g.fillStyle(0x3b2f3a, 0.4)
  g.fillRect(x + 3, frontTop + 6, w - 6, 1)

  // Keypad on the foreshortened top face.
  g.fillStyle(0x3b2f3a, 0.85)
  g.fillRoundedRect(cx - 22, top + 2, 44, 8, 3)
  const keyColors = [0xfff3dd, 0xfff3dd, gameColors.coral, 0xfff3dd, 0xffd166]
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      g.fillStyle(keyColors[(row + column) % keyColors.length] as number, 1)
      g.fillRoundedRect(cx - 19 + column * 8, top + 3 + row * 2.2, 5, 1.6, 0.7)
    }
  }

  // Raised display on a short stalk, facing the cashier.
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRect(cx - 3, top - 8, 6, 9)
  g.fillStyle(0x3b2f3a, 1)
  g.fillRoundedRect(cx - 17, top - 24, 34, 18, 4)
  g.fillStyle(0x9be7d0, 1)
  g.fillRoundedRect(cx - 14, top - 21, 28, 12, 2)
  g.fillStyle(0xffffff, 0.4)
  g.fillRoundedRect(cx - 11, top - 19, 14, 2, 1)
  g.fillStyle(0x2b241d, 0.5)
  g.fillRect(cx + 3, top - 16, 8, 1.5)
  g.fillRect(cx + 3, top - 13, 6, 1.5)

  // Paper slip and service bell.
  g.fillStyle(0xfff3dd, 1)
  g.fillRect(cx - 24, top - 20, 6, 10)
  g.fillStyle(0xcdb68b, 0.6)
  g.fillRect(cx - 24, top - 20, 6, 2)
  g.fillStyle(gameColors.sunbeam, 1)
  g.fillCircle(cx + 20, top + 8, 3.5)
  g.fillStyle(0xffffff, 0.4)
  g.fillCircle(cx + 19, top + 7, 1.5)
}
