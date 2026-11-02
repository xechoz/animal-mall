import type Phaser from 'phaser'
import { gameColors } from '../colors'
import { isProcessedKind } from '../logic/config'
import type { ProcessedKind, ProducerState } from '../logic/types'

/**
 * Kitchen machinery is drawn with a shared three-quarter-view language: a
 * ground shadow, a darker side face, a lit top face and one product-specific
 * silhouette. Keeping it procedural means the four stations stay crisp at every
 * world scale without adding atlas pages.
 */
export function drawStation(g: Phaser.GameObjects.Graphics, producer: ProducerState): void {
  if (!isProcessedKind(producer.product)) return
  g.fillStyle(0x3b2f3a, 0.16)
  g.fillEllipse(0, 28, 92, 16)

  switch (producer.product) {
    case 'cake':
      drawOven(g)
      break
    case 'sweater':
      drawLoom(g)
      break
    case 'skewer':
      drawGrill(g)
      break
    case 'juice':
      drawJuicer(g)
      break
    case 'jam':
      drawJamPot(g)
      break
    case 'iceCream':
      drawIceCreamChurn(g)
      break
  }

  // Finished goods wait on a small side tray instead of floating over the art.
  for (let index = 0; index < producer.ready; index += 1) {
    g.fillStyle(0xfff7e8, 0.95)
    g.fillCircle(-30 + index * 10, 22, 5)
    g.fillStyle(0xffd166, 0.9)
    g.fillCircle(-30 + index * 10, 21, 2.2)
  }
}

/**
 * Per-frame details: oven glow, grill smoke, a moving loom shuttle and juice
 * bubbles. It only reads `progressMs`; simulation state is never touched.
 */
export function drawStationFx(
  g: Phaser.GameObjects.Graphics,
  producer: ProducerState,
  time: number,
  active: boolean,
): void {
  g.clear()
  if (!active || !isProcessedKind(producer.product)) return
  const working = producer.progressMs > 0

  switch (producer.product) {
    case 'cake': {
      if (!working) return
      const pulse = 0.55 + Math.sin(time * 0.008) * 0.18
      g.fillStyle(0xffb347, pulse)
      g.fillRoundedRect(-13, 4, 26, 18, 4)
      g.fillStyle(0xfff3b0, pulse * 0.6)
      g.fillRoundedRect(-9, 8, 18, 10, 3)
      drawSmoke(g, 24, -40, time, 3, 0x8d817c)
      return
    }
    case 'skewer': {
      const flicker = 0.6 + Math.sin(time * 0.02) * 0.25
      g.fillStyle(0xf08a3c, flicker)
      g.fillEllipse(0, 2, 30, 9)
      g.fillStyle(0xffd166, flicker * 0.8)
      g.fillEllipse(-3, 1, 14, 5)
      if (working) drawSmoke(g, 0, -24, time, 4, 0x9aa5aa)
      return
    }
    case 'sweater': {
      if (!working) return
      const shuttle = Math.sin(time * 0.006) * 22
      g.fillStyle(0x8f5734, 1)
      g.fillRoundedRect(shuttle - 7, -6, 14, 6, 2)
      g.fillStyle(0xffd166, 1)
      g.fillCircle(shuttle, -3, 2)
      return
    }
    case 'juice': {
      if (!working) return
      const bubble = (time * 0.002) % 1
      g.fillStyle(0xffffff, 0.28)
      g.fillCircle(-3, 4 + bubble * 10, 2.2)
      g.fillCircle(4, 9 - bubble * 7, 1.6)
      return
    }
    case 'jam': {
      if (!working) return
      const bubble = (time * 0.003) % 1
      g.fillStyle(0xd94b6a, 0.75)
      g.fillCircle(-4, 2 - bubble * 8, 2.4)
      g.fillCircle(5, 6 - bubble * 6, 1.8)
      g.fillStyle(0xffffff, 0.25)
      g.fillCircle(-4, 1 - bubble * 8, 0.9)
      return
    }
    case 'iceCream': {
      if (!working) return
      const puff = (time * 0.002) % 1
      g.fillStyle(0xdff3ef, 0.5)
      g.fillCircle(-16, -26 - puff * 12, 4 + puff * 3)
      g.fillCircle(12, -30 - puff * 10, 3 + puff * 2)
      g.fillStyle(0xffffff, 0.5)
      g.fillCircle(-14, -30 - puff * 12, 2.4)
      return
    }
  }
}

/** Ground props and a work mat behind each machine, drawn by the shop floor. */
export function drawStationPad(
  g: Phaser.GameObjects.Graphics,
  product: ProcessedKind,
  x: number,
  y: number,
): void {
  if (product === 'cake') {
    // Brick hearth with a flour sack and a rolling pin.
    g.fillStyle(0x8f5734, 0.18)
    g.fillRoundedRect(x - 42, y - 30, 84, 62, 12)
    g.fillStyle(0xb56b4f, 0.28)
    g.fillRoundedRect(x - 40, y - 32, 80, 58, 11)
    g.lineStyle(1, 0x8f5734, 0.25)
    for (let row = 0; row < 3; row += 1) {
      g.lineBetween(x - 38, y - 24 + row * 16, x + 38, y - 24 + row * 16)
    }
    g.fillStyle(0xf2dfc2, 1)
    g.fillRoundedRect(x + 24, y + 10, 14, 18, 4)
    g.fillStyle(0xd9c3a0, 1)
    g.fillEllipse(x + 31, y + 10, 10, 4)
    g.fillStyle(gameColors.wood, 1)
    g.fillRoundedRect(x - 38, y + 14, 22, 4, 2)
    return
  }

  if (product === 'sweater') {
    // Plank workshop with a yarn basket.
    g.fillStyle(gameColors.woodDark, 0.16)
    g.fillRoundedRect(x - 42, y - 30, 84, 62, 12)
    g.fillStyle(gameColors.woodLight, 0.24)
    g.fillRoundedRect(x - 40, y - 32, 80, 58, 11)
    g.lineStyle(1, gameColors.woodDark, 0.28)
    for (let column = 0; column < 5; column += 1) {
      g.lineBetween(x - 36 + column * 18, y - 30, x - 36 + column * 18, y + 26)
    }
    g.fillStyle(0xc98b5c, 1)
    g.fillEllipse(x + 28, y + 16, 20, 12)
    g.fillStyle(0x9c6b42, 1)
    g.fillEllipse(x + 28, y + 13, 16, 9)
    g.fillStyle(0xe88a9a, 1)
    g.fillCircle(x + 24, y + 12, 3)
    g.fillCircle(x + 32, y + 13, 3)
    return
  }

  if (product === 'skewer') {
    // Charcoal grill pad with stones and a bucket.
    g.fillStyle(0x5a5f66, 0.18)
    g.fillRoundedRect(x - 42, y - 30, 84, 62, 12)
    g.fillStyle(0x8a9098, 0.28)
    g.fillRoundedRect(x - 40, y - 32, 80, 58, 11)
    g.fillStyle(0x6f757c, 0.7)
    g.fillEllipse(x + 28, y + 16, 18, 10)
    g.fillStyle(0x3b2f3a, 0.3)
    g.fillEllipse(x + 28, y + 14, 12, 6)
    g.fillStyle(0x8f5734, 1)
    g.fillRoundedRect(x - 36, y + 12, 18, 5, 2)
    g.fillStyle(0x4f5a5f, 1)
    g.fillRoundedRect(x - 34, y + 15, 14, 8, 2)
    return
  }

  if (product === 'jam') {
    // Warm berry mat with a small fruit crate.
    g.fillStyle(0xb54b5f, 0.16)
    g.fillRoundedRect(x - 42, y - 30, 84, 62, 12)
    g.fillStyle(0xf3c6cf, 0.28)
    g.fillRoundedRect(x - 40, y - 32, 80, 58, 11)
    g.fillStyle(0x8f5734, 1)
    g.fillRoundedRect(x + 20, y + 8, 24, 16, 4)
    g.fillStyle(0xd94b6a, 1)
    g.fillCircle(x + 26, y + 7, 4)
    g.fillCircle(x + 34, y + 6, 4)
    g.fillCircle(x + 41, y + 8, 3.4)
    g.fillStyle(0x5aa96f, 1)
    g.fillEllipse(x + 31, y + 2, 7, 3)
    return
  }

  if (product === 'iceCream') {
    // Frosty tile with a snowflake and a cone stand.
    g.fillStyle(0x8fa6c9, 0.16)
    g.fillRoundedRect(x - 42, y - 30, 84, 62, 12)
    g.fillStyle(0xdff3ef, 0.4)
    g.fillRoundedRect(x - 40, y - 32, 80, 58, 11)
    g.lineStyle(2, 0xffffff, 0.55)
    for (const angle of [0, Math.PI / 3, -Math.PI / 3]) {
      g.lineBetween(
        x + 28 - Math.cos(angle) * 8,
        y + 14 - Math.sin(angle) * 8,
        x + 28 + Math.cos(angle) * 8,
        y + 14 + Math.sin(angle) * 8,
      )
    }
    g.fillStyle(0xd9b25a, 1)
    g.fillTriangle(x - 36, y + 8, x - 22, y + 8, x - 29, y + 24)
    g.fillStyle(0xfff7e8, 1)
    g.fillCircle(x - 29, y + 6, 6)
    return
  }

  // Juicer: pale checker tile with a fruit crate.
  g.fillStyle(0x8fa6c9, 0.16)
  g.fillRoundedRect(x - 42, y - 30, 84, 62, 12)
  g.fillStyle(0xdff3ef, 0.32)
  g.fillRoundedRect(x - 40, y - 32, 80, 58, 11)
  g.lineStyle(1, 0x6f89b0, 0.22)
  for (let column = 0; column < 4; column += 1) {
    g.lineBetween(x - 40 + column * 20, y - 32, x - 40 + column * 20, y + 26)
  }
  g.fillStyle(0xb87545, 1)
  g.fillRoundedRect(x + 22, y + 10, 22, 14, 3)
  g.fillStyle(0xffa94d, 1)
  g.fillCircle(x + 28, y + 10, 4)
  g.fillCircle(x + 36, y + 9, 4)
  g.fillStyle(0x8cd08b, 1)
  g.fillEllipse(x + 32, y + 5, 9, 5)
}

function drawOven(g: Phaser.GameObjects.Graphics): void {
  // Chimney first, so the body overlaps its base.
  g.fillStyle(0x4f3630, 1)
  g.fillRoundedRect(18, -48, 16, 24, 4)
  g.fillStyle(0x7a4f40, 1)
  g.fillRoundedRect(20, -46, 12, 6, 2)

  // Lit top face and brick body.
  g.fillStyle(0x4f3630, 1)
  g.fillRoundedRect(-36, -26, 72, 54, 9)
  g.fillStyle(0x8f5f4a, 1)
  g.fillRoundedRect(-33, -23, 66, 48, 8)
  g.fillStyle(0xb07a5c, 1)
  g.fillRoundedRect(-33, -30, 66, 10, 5)
  g.fillStyle(0x6f4638, 1)
  g.fillRoundedRect(29, -23, 6, 48, 3)

  // Brick courses and rivets.
  g.lineStyle(1, 0x6f4638, 0.45)
  for (let row = 0; row < 3; row += 1) {
    g.lineBetween(-31, -14 + row * 14, 31, -14 + row * 14)
  }
  for (let column = 0; column < 4; column += 1) {
    g.fillStyle(0x5a3a32, 0.55)
    g.fillCircle(-24 + column * 16, 23, 1.4)
  }

  // Arched glass door.
  g.fillStyle(0x3b2b2a, 1)
  g.fillRoundedRect(-22, -8, 44, 32, 14)
  g.fillStyle(0x2f2433, 1)
  g.fillRoundedRect(-18, -4, 36, 26, 11)
  g.fillStyle(0xffb347, 0.38)
  g.fillRoundedRect(-14, 0, 28, 18, 8)
  g.fillStyle(0xfff3b0, 0.7)
  g.fillRoundedRect(-8, 4, 16, 8, 4)
  g.lineStyle(2, 0xd9a066, 1)
  g.strokeRoundedRect(-18, -4, 36, 26, 11)

  // Top tray with a cake and a dial panel.
  g.fillStyle(0x6f4638, 1)
  g.fillRoundedRect(-26, -40, 24, 8, 3)
  g.fillStyle(0xfff7e8, 1)
  g.fillRoundedRect(-23, -44, 18, 8, 3)
  g.fillStyle(0xe88a9a, 1)
  g.fillRoundedRect(-23, -42, 18, 4, 2)
  g.fillStyle(0xffd166, 1)
  g.fillCircle(-14, -45, 1.6)
  g.fillStyle(0x2f2433, 1)
  g.fillRoundedRect(10, -22, 16, 10, 3)
  g.fillStyle(0xffd166, 1)
  g.fillCircle(15, -17, 2)
  g.fillCircle(21, -17, 2)
}

function drawLoom(g: Phaser.GameObjects.Graphics): void {
  // Workbench base.
  g.fillStyle(gameColors.woodDark, 1)
  g.fillRoundedRect(-33, 6, 66, 20, 5)
  g.fillStyle(gameColors.wood, 1)
  g.fillRoundedRect(-30, 8, 60, 14, 4)
  g.fillStyle(gameColors.woodLight, 1)
  g.fillRoundedRect(-30, 8, 60, 4, 2)
  g.fillStyle(gameColors.woodDark, 1)
  g.fillRoundedRect(-27, 24, 7, 8, 2)
  g.fillRoundedRect(20, 24, 7, 8, 2)

  // Tall frame and warp threads.
  g.fillStyle(0x6f4b2e, 1)
  g.fillRoundedRect(-34, -44, 8, 54, 3)
  g.fillRoundedRect(26, -44, 8, 54, 3)
  g.fillRoundedRect(-34, -46, 68, 8, 3)
  g.fillStyle(0x9c6b42, 1)
  g.fillRoundedRect(-34, -44, 68, 3, 1.5)
  g.lineStyle(1, 0xd9a066, 0.85)
  for (let column = 0; column < 9; column += 1) {
    g.lineBetween(-24 + column * 6, -34, -24 + column * 6, 8)
  }

  // Half-finished cloth and a hanging ball of yarn.
  g.fillStyle(0x9bc477, 1)
  g.fillRoundedRect(-24, -12, 48, 20, 4)
  g.fillStyle(0x7fa65a, 1)
  for (let row = 0; row < 2; row += 1) {
    g.lineBetween(-22, -7 + row * 7, 22, -7 + row * 7)
  }
  g.fillStyle(0xe88a9a, 1)
  g.fillCircle(28, -34, 5)
  g.lineStyle(1, 0xb85f73, 0.8)
  g.beginPath()
  g.arc(28, -34, 3, 0.3, 3.2)
  g.strokePath()
  g.lineStyle(1.4, 0xe88a9a, 1)
  g.lineBetween(25, -31, 19, -14)

  // Spool and shuttle on the bench.
  g.fillStyle(0x8f5734, 1)
  g.fillRoundedRect(-28, 12, 10, 8, 3)
  g.fillStyle(0xffd166, 1)
  g.fillRoundedRect(-26, 14, 6, 4, 1.5)
  g.fillStyle(0x6f4b2e, 1)
  g.fillRoundedRect(12, 13, 16, 5, 2)
}

function drawGrill(g: Phaser.GameObjects.Graphics): void {
  // Stone base.
  g.fillStyle(0x5a5f66, 1)
  g.fillRoundedRect(-34, 2, 68, 26, 6)
  g.fillStyle(0x8a9098, 1)
  g.fillRoundedRect(-31, 4, 62, 20, 5)
  g.fillStyle(0x6f757c, 1)
  g.fillRoundedRect(-31, 18, 62, 6, 3)
  g.lineStyle(1, 0x4f5a5f, 0.4)
  for (let column = 0; column < 5; column += 1) {
    g.lineBetween(-27 + column * 14, 6, -27 + column * 14, 18)
  }

  // Grate and skewers.
  g.fillStyle(0x2f3a3f, 1)
  g.fillRoundedRect(-30, -8, 60, 10, 4)
  g.fillStyle(0x4f5a5f, 1)
  g.fillRoundedRect(-30, -10, 60, 6, 3)
  g.lineStyle(2, 0x9aa5aa, 1)
  for (let column = 0; column < 5; column += 1) {
    g.lineBetween(-26 + column * 13, -10, -26 + column * 13, 2)
  }
  g.lineStyle(2, 0xb87545, 1)
  g.lineBetween(-22, -16, 22, -16)
  g.lineBetween(-18, -18, 18, -18)
  g.fillStyle(0xf08a3c, 1)
  g.fillEllipse(-10, -16, 14, 6)
  g.fillEllipse(10, -18, 14, 6)
  g.fillStyle(0xffb066, 1)
  g.fillEllipse(-12, -17, 8, 3)
  g.fillEllipse(8, -19, 8, 3)

  // Ember bed under the grate.
  g.fillStyle(0xf08a3c, 0.9)
  g.fillEllipse(0, 2, 34, 7)
  g.fillStyle(0xffd166, 1)
  g.fillCircle(-10, 1, 2.4)
  g.fillCircle(2, 2, 2)
  g.fillCircle(13, 0, 2.4)

  // Hanging pan and a charcoal bucket.
  g.lineStyle(2, 0x3b2f3a, 0.6)
  g.lineBetween(32, -28, 32, -14)
  g.fillStyle(0x4f5a5f, 1)
  g.fillCircle(32, -11, 6)
  g.fillStyle(0x2f3a3f, 1)
  g.fillCircle(32, -11, 3.5)
  g.fillStyle(0x5a5f66, 1)
  g.fillRoundedRect(-40, 26, 16, 8, 3)
}

function drawJuicer(g: Phaser.GameObjects.Graphics): void {
  // Countertop and metal body.
  g.fillStyle(0x6f757c, 1)
  g.fillRoundedRect(-34, 4, 68, 24, 6)
  g.fillStyle(0x9aa5aa, 1)
  g.fillRoundedRect(-31, 6, 62, 18, 5)
  g.fillStyle(0xdff3ef, 1)
  g.fillRoundedRect(-27, -22, 54, 30, 8)
  g.fillStyle(0xffffff, 0.55)
  g.fillRoundedRect(-23, -19, 12, 20, 5)
  g.fillStyle(0x4f5a5f, 1)
  g.fillRoundedRect(-33, -24, 66, 7, 3)

  // Funnel and fruit.
  g.fillStyle(0x4f5a5f, 1)
  g.fillTriangle(-12, -24, 12, -24, 5, -36)
  g.fillStyle(0x8a9098, 1)
  g.fillTriangle(-10, -24, 10, -24, 4, -34)
  g.fillStyle(0xffa94d, 1)
  g.fillCircle(0, -26, 4)
  g.fillStyle(0x8cd08b, 1)
  g.fillEllipse(-9, -27, 8, 4)
  g.fillStyle(0xf2a93b, 1)
  g.fillCircle(12, -23, 3.4)

  // Glass jug, juice level and bubbles.
  g.fillStyle(0xbfe8ef, 0.85)
  g.fillRoundedRect(-13, -4, 26, 24, 5)
  g.fillStyle(0xffa94d, 0.9)
  g.fillRoundedRect(-10, 4, 20, 14, 3)
  g.fillStyle(0xffd08a, 0.85)
  g.fillEllipse(-3, 7, 7, 2)
  g.lineStyle(2, 0x8a9098, 1)
  g.strokeRoundedRect(-13, -4, 26, 24, 5)

  // Lever and drip tray.
  g.lineStyle(2, 0x4f5a5f, 1)
  g.lineBetween(20, -14, 20, 2)
  g.fillStyle(0x3b2f3a, 1)
  g.fillCircle(20, 4, 4)
  g.fillStyle(0xffd166, 1)
  g.fillCircle(20, 4, 1.6)
  g.fillStyle(0x9aa5aa, 1)
  g.fillRoundedRect(-16, 26, 32, 5, 2)

  // Fruit crate beside the machine.
  g.fillStyle(0xb87545, 1)
  g.fillRoundedRect(24, 12, 20, 14, 3)
  g.fillStyle(0xffa94d, 1)
  g.fillCircle(30, 12, 4)
  g.fillCircle(38, 11, 4)
  g.fillStyle(0x8cd08b, 1)
  g.fillEllipse(34, 7, 9, 5)
}

function drawJamPot(g: Phaser.GameObjects.Graphics): void {
  // Copper preserving pot with a dark rim and a bubbling jam surface.
  g.fillStyle(0x6f3f2a, 1)
  g.fillRoundedRect(-28, -10, 56, 36, 10)
  g.fillStyle(0xb0623e, 1)
  g.fillRoundedRect(-26, -8, 52, 32, 9)
  g.fillStyle(0xd98a5a, 1)
  g.fillRoundedRect(-24, -6, 48, 12, 6)
  g.fillStyle(0x8a4a32, 1)
  g.fillEllipse(0, -18, 46, 11)
  g.fillStyle(0xc4774a, 1)
  g.fillEllipse(0, -20, 42, 9)
  g.fillStyle(0xd94b6a, 1)
  g.fillEllipse(0, -18, 32, 5)
  g.fillStyle(0xf07f8d, 0.8)
  g.fillEllipse(-6, -19, 10, 2.4)
  g.fillStyle(0x3b2f3a, 1)
  g.fillCircle(0, -26, 4)
  // Side handles.
  g.lineStyle(3, 0x6f3f2a, 1)
  g.beginPath()
  g.arc(-29, 0, 7, Math.PI * 0.6, Math.PI * 1.4)
  g.strokePath()
  g.beginPath()
  g.arc(29, 0, 7, Math.PI * 1.6, Math.PI * 0.4)
  g.strokePath()
  // Berry crate.
  g.fillStyle(0x8f5734, 1)
  g.fillRoundedRect(22, 12, 20, 14, 3)
  g.fillStyle(0xd94b6a, 1)
  g.fillCircle(28, 12, 4)
  g.fillCircle(36, 11, 4)
  g.fillStyle(0x5aa96f, 1)
  g.fillEllipse(32, 7, 9, 4)
}

function drawIceCreamChurn(g: Phaser.GameObjects.Graphics): void {
  // Wooden bucket with metal bands and a hand crank.
  g.fillStyle(0x9b6b42, 1)
  g.fillRoundedRect(-22, -20, 44, 46, 8)
  g.fillStyle(0xc98b5c, 1)
  g.fillRoundedRect(-20, -18, 40, 42, 7)
  g.fillStyle(0x8a9098, 1)
  g.fillRoundedRect(-22, -10, 44, 5, 2)
  g.fillRoundedRect(-22, 10, 44, 5, 2)
  // Cream dome and frost.
  g.fillStyle(0xbfe8ef, 1)
  g.fillEllipse(0, -22, 34, 11)
  g.fillStyle(0xfff7e8, 1)
  g.fillEllipse(0, -24, 30, 9)
  // Crank.
  g.lineStyle(3, 0x4f5a5f, 1)
  g.lineBetween(0, -28, 0, -40)
  g.lineBetween(-9, -40, 9, -40)
  g.fillStyle(0x8a9098, 1)
  g.fillCircle(0, -44, 4)
  g.fillStyle(0xffd166, 1)
  g.fillCircle(0, -44, 1.4)
  // Cone beside the churn.
  g.fillStyle(0xd9b25a, 1)
  g.fillTriangle(23, 12, 35, 12, 29, 28)
  g.fillStyle(0xfff7e8, 1)
  g.fillCircle(29, 9, 6)
  g.fillStyle(0xf5a3b5, 1)
  g.fillCircle(29, 5, 4)
}

function drawSmoke(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  time: number,
  count: number,
  color: number,
): void {
  for (let index = 0; index < count; index += 1) {
    const phase = (((time * 0.0006 + index / count) % 1) + 1) % 1
    const rise = phase * 26
    g.fillStyle(color, 0.2 * (1 - phase))
    g.fillCircle(x + Math.sin(time * 0.002 + index * 2) * 4, y - rise, 3 + phase * 4)
  }
}
