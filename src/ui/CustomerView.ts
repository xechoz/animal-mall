import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import type { CustomerState } from '../logic/types'
import { AnimalRig } from './AnimalRig'
import { productTextureKey } from './productArt'

const BODY_SCALE = 0.74

export class CustomerView extends AnimalRig {
  private readonly moodArt: Phaser.GameObjects.Graphics
  private readonly bubble: Phaser.GameObjects.Container
  private readonly bubbleBg: Phaser.GameObjects.Graphics
  private readonly bubbleIcons: Phaser.GameObjects.Image[] = []
  private readonly bubbleMark: Phaser.GameObjects.Text
  private readonly patienceBg: Phaser.GameObjects.Rectangle
  private readonly patienceFill: Phaser.GameObjects.Rectangle
  private readonly basket: Phaser.GameObjects.Container
  private readonly basketText: Phaser.GameObjects.Text
  private readonly theme: Theme
  private bubbleKey = ''
  private basketKey = ''
  private facing: -1 | 1 = 1

  constructor(
    scene: Phaser.Scene,
    theme: Theme,
    species: CustomerState['species'],
    textScale: number,
    seed: number,
  ) {
    super(scene, {
      species,
      player: false,
      scale: BODY_SCALE,
      seed,
      shadow: { width: 34, height: 10, alpha: 0.16 },
    })
    this.theme = theme

    this.moodArt = scene.add.graphics()
    this.addAbove(this.moodArt)

    this.patienceBg = scene.add.rectangle(0, -66, 46, 6, 0x3b2f3a, 0.28).setOrigin(0.5)
    this.patienceFill = scene.add.rectangle(-23, -66, 46, 6, 0x5fbf9f, 1).setOrigin(0, 0.5)
    this.addAbove(this.patienceBg)
    this.addAbove(this.patienceFill)

    this.bubble = scene.add.container(0, -94)
    this.bubbleBg = scene.add.graphics()
    this.bubble.add(this.bubbleBg)
    for (let index = 0; index < 3; index += 1) {
      const icon = scene.add
        .image(0, 0, productTextureKey('apple'))
        .setScale(0.44)
        .setVisible(false)
      this.bubbleIcons.push(icon)
      this.bubble.add(icon)
    }
    this.bubbleMark = scene.add
      .text(0, 0, '✓', textStyle(theme, 18, '#3f8454', true))
      .setOrigin(0.5)
      .setVisible(false)
    this.bubble.add(this.bubbleMark)
    this.addAbove(this.bubble)

    this.basket = scene.add.container(20, -24)
    const basketArt = scene.add.graphics()
    basketArt.fillStyle(0x8f5734, 1)
    basketArt.fillRoundedRect(-12, -3, 24, 12, 4)
    basketArt.lineStyle(2, 0x6f4b2e, 1)
    basketArt.beginPath()
    basketArt.arc(0, -3, 7, Math.PI, Math.PI * 2)
    basketArt.strokePath()
    basketArt.fillStyle(0xd39a65, 0.8)
    basketArt.fillRect(-10, 0, 20, 2)
    this.basket.add(basketArt)
    this.basketText = scene.add
      .text(0, -1, '', textStyle(theme, 10 * textScale, '#fff7e8', true))
      .setOrigin(0.5)
    this.basket.add(this.basketText)
    this.basket.setVisible(false)
    this.addAbove(this.basket)

    scene.add.existing(this)
  }

  updateCustomer(customer: CustomerState, alpha: number, time: number): void {
    const x = customer.prevPos.x + (customer.pos.x - customer.prevPos.x) * alpha
    const y = customer.prevPos.y + (customer.pos.y - customer.prevPos.y) * alpha
    const dx = customer.pos.x - customer.prevPos.x
    if (Math.abs(dx) > 0.01) this.facing = dx < 0 ? -1 : 1

    const angry = customer.angerMs >= 1_200
    const shake = angry ? Math.sin(time * 0.035 + customer.id) * 1.6 : 0
    const frame = this.updateRig(x, y, this.facing, time, { x: shake })
    this.moodArt.setPosition(frame.headX, frame.headY)

    const ratio = Math.max(0, Math.min(1, customer.patienceMs / customer.maxPatienceMs))
    this.patienceFill.setDisplaySize(46 * ratio, 6)
    this.patienceFill.setFillStyle(ratio > 0.55 ? 0x5fbf9f : ratio > 0.25 ? 0xffd166 : 0xe25d5d)
    this.patienceBg.setVisible(!customer.sad)

    this.drawMood(customer, angry, time)
    this.bubble.setVisible(!angry)

    const bubbleKey = `${customer.phase}-${customer.wanted.join(',')}-${customer.basket.length}-${customer.sad}-${angry}`
    if (bubbleKey !== this.bubbleKey) {
      this.bubbleKey = bubbleKey
      this.redrawBubble(customer)
    }

    const basketKey = customer.basket.join(',')
    if (basketKey !== this.basketKey) {
      this.basketKey = basketKey
      this.basket.setVisible(customer.basket.length > 0)
      this.basketText.setText(customer.basket.length > 1 ? `×${customer.basket.length}` : '')
    }

    this.setTint(customer.sad ? 0xd9b0b0 : null)
  }

  private drawMood(customer: CustomerState, angry: boolean, time: number): void {
    this.moodArt.clear()
    if (!angry) return

    const twitch = Math.sin(time * 0.012 + customer.id) * 0.7
    const g = this.moodArt

    // Angry brows scowl inward, and the mouth turns into a frown.
    g.lineStyle(2.6, 0x3b2f3a, 0.92)
    g.lineBetween(-12, -55 - twitch, -4, -58 + twitch)
    g.lineBetween(12, -55 + twitch, 4, -58 - twitch)
    g.lineStyle(2.2, 0x3b2f3a, 0.92)
    g.lineBetween(-6, -34, 0, -37)
    g.lineBetween(0, -37, 6, -34)
    g.fillStyle(0xe25d5d, 0.4)
    g.fillEllipse(-14, -41, 8, 4.5)
    g.fillEllipse(14, -41, 8, 4.5)

    // Comic anger vein on the temple, matching the flames above the head.
    drawAngerMark(g, 25, -56, 6, 0xd94b4b)
    this.drawFlames(customer.id, time)
  }

  /**
   * Three flickering fire tongues above the head plus rising embers. The flame
   * group replaces the thought bubble while angry; the bubble comes back as
   * soon as the anger cools down.
   */
  private drawFlames(customerId: number, time: number): void {
    const g = this.moodArt
    const t = time * 0.006 + customerId
    const glow = 0.1 + Math.abs(Math.sin(t * 1.9)) * 0.05

    g.fillStyle(0xff6a3d, glow)
    g.fillCircle(0, -86, 20)
    g.fillStyle(0xffb45c, glow * 0.85)
    g.fillCircle(0, -82, 12)

    const tongues = [
      { x: -13, base: -72, height: 17, width: 9, seed: 0.4 },
      { x: 0, base: -70, height: 27, width: 11, seed: 2.1 },
      { x: 13, base: -72, height: 15, width: 8, seed: 3.7 },
    ]
    for (const tongue of tongues) {
      const flick = Math.sin(t * 3.1 + tongue.seed) * 3
      const sway = Math.sin(t * 1.7 + tongue.seed) * 2.6
      const tip = new Phaser.Math.Vector2(tongue.x + sway, tongue.base - tongue.height - flick)
      const half = tongue.width / 2

      g.fillStyle(0xf0642f, 0.95)
      g.fillPoints(
        [
          new Phaser.Math.Vector2(tongue.x - half, tongue.base),
          new Phaser.Math.Vector2(tongue.x - half * 1.2, tongue.base - tongue.height * 0.45),
          tip,
          new Phaser.Math.Vector2(tongue.x + half * 1.2, tongue.base - tongue.height * 0.42),
          new Phaser.Math.Vector2(tongue.x + half, tongue.base),
        ],
        true,
      )

      g.fillStyle(0xffb347, 1)
      g.fillPoints(
        [
          new Phaser.Math.Vector2(tongue.x - half * 0.52, tongue.base),
          new Phaser.Math.Vector2(
            tongue.x + sway * 0.4,
            tongue.base - tongue.height * 0.66 - flick * 0.5,
          ),
          new Phaser.Math.Vector2(tongue.x + half * 0.52, tongue.base),
        ],
        true,
      )

      g.fillStyle(0xfff0b8, 0.85)
      g.fillCircle(tongue.x, tongue.base - tongue.height * 0.24, half * 0.42)
    }

    for (let index = 0; index < 4; index += 1) {
      const phase = (t * 0.55 + index * 0.27) % 1
      g.fillStyle(0xffc46b, (1 - phase) * 0.8)
      g.fillCircle(Math.sin(t * 2 + index * 2.2) * 11, -78 - phase * 26, 1.6 + (1 - phase) * 1.2)
    }
  }

  private redrawBubble(customer: CustomerState): void {
    const angry = customer.angerMs >= 1_200
    const icons = customer.sad || angry ? [] : customer.wanted.slice(0, 3)
    const width = customer.sad || angry ? 34 : icons.length > 0 ? icons.length * 19 + 12 : 34
    const height = 30
    this.bubbleBg.clear()
    this.bubbleBg.fillStyle(0x3b2f3a, 0.16)
    this.bubbleBg.fillRoundedRect(-width / 2, -height / 2 + 3, width, height, 9)
    this.bubbleBg.fillStyle(0xfff7e8, 0.97)
    this.bubbleBg.fillRoundedRect(-width / 2, -height / 2, width, height, 9)
    this.bubbleBg.lineStyle(2, this.theme.ink, 0.35)
    this.bubbleBg.strokeRoundedRect(-width / 2, -height / 2, width, height, 9)
    this.bubbleBg.fillStyle(0xfff7e8, 0.97)
    this.bubbleBg.fillTriangle(-5, height / 2 - 1, 5, height / 2 - 1, 0, height / 2 + 7)

    this.bubbleIcons.forEach((icon, index) => {
      const visible = !customer.sad && !angry && index < icons.length
      icon.setVisible(visible)
      if (visible) {
        const kind = icons[index]
        if (kind !== undefined) icon.setTexture(productTextureKey(kind))
        icon.setPosition(-width / 2 + 12 + index * 19, 0)
      }
    })

    const complete = !customer.sad && !angry && icons.length === 0
    const upset = customer.sad || angry
    this.bubbleMark.setVisible(upset || complete)
    this.bubbleMark.setText(upset ? '!' : '✓')
    this.bubbleMark.setColor(upset ? '#e25d5d' : '#3f8454')
  }
}

/** Comic anger vein: four short strokes meeting at the temple. */
function drawAngerMark(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  color: number,
): void {
  g.lineStyle(Math.max(1.8, size * 0.4), color, 0.95)
  g.beginPath()
  g.moveTo(x - size, y - size)
  g.lineTo(x - size * 0.3, y - size * 0.3)
  g.moveTo(x + size, y - size)
  g.lineTo(x + size * 0.3, y - size * 0.3)
  g.moveTo(x - size, y + size)
  g.lineTo(x - size * 0.3, y + size * 0.3)
  g.moveTo(x + size, y + size)
  g.lineTo(x + size * 0.3, y + size * 0.3)
  g.strokePath()
}
