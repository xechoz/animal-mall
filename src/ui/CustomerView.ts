import { type Theme, textStyle } from '@mg/core'
import Phaser from 'phaser'
import type { CustomerState } from '../logic/types'
import { animalTextureKey } from './animalArt'
import { fruitTextureKey } from './fruitArt'

export class CustomerView extends Phaser.GameObjects.Container {
  private readonly bodyImage: Phaser.GameObjects.Image
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

  constructor(scene: Phaser.Scene, theme: Theme, species: CustomerState['species']) {
    super(scene, 0, 0)
    this.theme = theme

    const shadow = scene.add.graphics()
    shadow.fillStyle(0x3b2f3a, 0.16)
    shadow.fillEllipse(0, 2, 34, 10)
    this.add(shadow)

    this.bodyImage = scene.add
      .image(0, 0, animalTextureKey(species))
      .setOrigin(0.5, 0.9)
      .setScale(0.74)
    this.add(this.bodyImage)

    this.patienceBg = scene.add.rectangle(0, -66, 46, 6, 0x3b2f3a, 0.28).setOrigin(0.5)
    this.patienceFill = scene.add.rectangle(-23, -66, 46, 6, 0x5fbf9f, 1).setOrigin(0, 0.5)
    this.add([this.patienceBg, this.patienceFill])

    this.bubble = scene.add.container(0, -94)
    this.bubbleBg = scene.add.graphics()
    this.bubble.add(this.bubbleBg)
    for (let index = 0; index < 3; index += 1) {
      const icon = scene.add.image(0, 0, fruitTextureKey('apple')).setScale(0.44).setVisible(false)
      this.bubbleIcons.push(icon)
      this.bubble.add(icon)
    }
    this.bubbleMark = scene.add
      .text(0, 0, '✓', textStyle(theme, 18, '#3f8454', true))
      .setOrigin(0.5)
      .setVisible(false)
    this.bubble.add(this.bubbleMark)
    this.add(this.bubble)

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
      .text(0, -1, '', textStyle(theme, 10, '#fff7e8', true))
      .setOrigin(0.5)
    this.basket.add(this.basketText)
    this.basket.setVisible(false)
    this.add(this.basket)

    scene.add.existing(this)
  }

  updateCustomer(customer: CustomerState, alpha: number, time: number): void {
    const x = customer.prevPos.x + (customer.pos.x - customer.prevPos.x) * alpha
    const y = customer.prevPos.y + (customer.pos.y - customer.prevPos.y) * alpha
    const dx = customer.pos.x - customer.prevPos.x
    const moving =
      customer.phase !== 'picking' &&
      customer.phase !== 'inQueue' &&
      Math.abs(dx) + Math.abs(customer.pos.y - customer.prevPos.y) > 0.01
    const bob = moving ? Math.abs(Math.sin(time * 0.011 + customer.id)) * 2.5 : 0
    this.setPosition(x, y - bob)
    if (Math.abs(dx) > 0.01) this.bodyImage.setScale(dx < 0 ? -0.74 : 0.74, 0.74)

    const ratio = Math.max(0, Math.min(1, customer.patienceMs / customer.maxPatienceMs))
    this.patienceFill.setDisplaySize(46 * ratio, 6)
    this.patienceFill.setFillStyle(ratio > 0.55 ? 0x5fbf9f : ratio > 0.25 ? 0xffd166 : 0xe25d5d)
    this.patienceBg.setVisible(!customer.sad)

    const bubbleKey = `${customer.phase}-${customer.wanted.join(',')}-${customer.basket.length}-${customer.sad}`
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

    if (customer.sad) {
      this.bodyImage.setTint(0xd9b0b0)
    } else {
      this.bodyImage.clearTint()
    }
  }

  private redrawBubble(customer: CustomerState): void {
    const icons = customer.sad ? [] : customer.wanted.slice(0, 3)
    const width = customer.sad ? 34 : icons.length > 0 ? icons.length * 19 + 12 : 34
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
      const visible = !customer.sad && index < icons.length
      icon.setVisible(visible)
      if (visible) {
        const kind = icons[index]
        if (kind !== undefined) icon.setTexture(fruitTextureKey(kind))
        icon.setPosition(-width / 2 + 12 + index * 19, 0)
      }
    })

    const complete = !customer.sad && icons.length === 0
    this.bubbleMark.setVisible(customer.sad || complete)
    this.bubbleMark.setText(customer.sad ? '!' : '✓')
    this.bubbleMark.setColor(customer.sad ? '#e25d5d' : '#3f8454')
  }
}
