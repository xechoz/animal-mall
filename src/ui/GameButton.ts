import {
  type ButtonDecoration,
  cssColor,
  drawIcon,
  type IconName,
  type Theme,
  textStyle,
} from '@mg/core'
import Phaser from 'phaser'
import { type ButtonSkinVariant, buttonSkinMetrics, drawButtonSkin } from './buttonSkin'

export type GameButtonVariant = ButtonSkinVariant

export interface GameButtonOptions {
  width?: number
  height?: number
  /**
   * Minimum side of the invisible touch target. The visual size is unchanged,
   * so a compact modal action can still meet mobile tap-target sizing.
   */
  minHitSize?: number
  variant?: GameButtonVariant
  fontSize?: number
  icon?: IconName
  decoration?: ButtonDecoration
  onClick: () => void
}

type Decorated = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform

/**
 * The game's physical button. It shares the platform `Button` API but keeps its
 * own skin: a bark socket, an inset face and a lip that the face sinks into.
 * Platform files stay untouched, so other games keep their flat controls.
 */
export class GameButton extends Phaser.GameObjects.Container {
  private readonly theme: Theme
  private readonly background: Phaser.GameObjects.Graphics
  private readonly label: Phaser.GameObjects.Text
  private readonly zone: Phaser.GameObjects.Zone
  private readonly buttonWidth: number
  private readonly buttonHeight: number
  private readonly fontSize: number
  private readonly variant: GameButtonVariant
  private readonly iconGraphics?: Phaser.GameObjects.Graphics
  private readonly decoration?: Decorated
  private readonly decorationBaseY: number
  private iconName?: IconName
  private enabled = true
  private hovered = false
  private pressed = false
  private muted = false
  private selected = false
  private onClickHandler: () => void

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    theme: Theme,
    options: GameButtonOptions,
  ) {
    super(scene, x, y)
    this.theme = theme
    this.buttonWidth = options.width ?? 220
    this.buttonHeight = options.height ?? 54
    this.fontSize = options.fontSize ?? 26
    this.variant = options.variant ?? 'primary'
    this.iconName = options.icon
    this.onClickHandler = options.onClick

    this.background = new Phaser.GameObjects.Graphics(scene)
    this.label = new Phaser.GameObjects.Text(
      scene,
      0,
      0,
      text,
      textStyle(theme, this.fontSize, this.labelColor(), true),
    ).setOrigin(0.5)

    if (options.icon) {
      this.iconGraphics = new Phaser.GameObjects.Graphics(scene)
    }

    const faceHitHeight = this.buttonHeight + 12
    const minHitSize = Math.max(0, options.minHitSize ?? 0)
    const hitWidth = Math.max(this.buttonWidth, minHitSize)
    const hitHeight = Math.max(faceHitHeight, minHitSize)
    const hitOffsetY = hitHeight > faceHitHeight ? 0 : 8
    this.zone = new Phaser.GameObjects.Zone(scene, 0, hitOffsetY, hitWidth, hitHeight)
    this.zone.setInteractive({ useHandCursor: true })

    const children: Phaser.GameObjects.GameObject[] = [this.background]
    if (this.iconGraphics) children.push(this.iconGraphics)
    if (options.decoration) {
      const decoration = options.decoration(scene, {
        width: this.buttonWidth,
        height: this.buttonHeight,
      }) as Decorated
      this.decoration = decoration
      this.decorationBaseY = decoration.y
      children.push(decoration)
    } else {
      this.decorationBaseY = 0
    }
    children.push(this.label, this.zone)
    this.add(children)
    this.redraw()

    const canHover = window.matchMedia('(hover: hover)').matches
    this.zone.on('pointerover', () => {
      if (!canHover) return
      this.hovered = true
      this.redraw()
      this.tweenScale(1.015, 90)
    })
    this.zone.on('pointerout', () => {
      this.hovered = false
      this.cancelPress()
      this.redraw()
      this.tweenScale(1, 90)
    })
    this.zone.on('pointerupoutside', () => this.cancelPress())
    this.zone.on('pointerdown', () => {
      this.pressed = true
      this.redraw()
      this.tweenScale(0.985, 70)
    })
    this.zone.on('pointerup', () => {
      if (!this.enabled || !this.pressed) return
      this.pressed = false
      this.redraw()
      this.tweenScale(this.hovered ? 1.015 : 1, 110)
      this.onClickHandler()
    })

    scene.add.existing(this)
  }

  setText(text: string): this {
    this.label.setText(text)
    this.layoutContent()
    return this
  }

  setIcon(icon: IconName): this {
    if (!this.iconGraphics) return this
    this.iconName = icon
    this.redraw()
    return this
  }

  setOnClick(handler: () => void): this {
    this.onClickHandler = handler
    return this
  }

  /**
   * Muted is "visible but cannot be bought": the face turns to paper while the
   * label keeps full contrast and the control stays tappable so it can explain
   * the shortfall. Unlike `setEnabled(false)`, this never dims the whole key.
   */
  setMuted(muted: boolean): this {
    if (this.muted === muted) return this
    this.muted = muted
    this.label.setColor(this.labelColor())
    this.redraw()
    return this
  }

  setSelected(selected: boolean): this {
    if (this.selected === selected) return this
    this.selected = selected
    this.redraw()
    return this
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled
    this.pressed = false
    this.setAlpha(enabled ? 1 : 0.45)
    if (!enabled) {
      this.hovered = false
      this.scene.tweens.killTweensOf(this)
      this.setScale(1)
    }
    if (enabled) this.zone.setInteractive({ useHandCursor: true })
    else this.zone.disableInteractive()
    this.redraw()
    return this
  }

  private cancelPress(): void {
    if (!this.pressed) return
    this.pressed = false
    this.redraw()
    this.tweenScale(this.hovered ? 1.015 : 1, 90)
  }

  private tweenScale(scale: number, duration: number): void {
    this.scene.tweens.killTweensOf(this)
    this.scene.tweens.add({ targets: this, scale, duration, ease: 'Quad.out' })
  }

  private labelColor(): string {
    if (this.muted) return this.theme.text
    if (this.variant === 'primary') return cssColor(this.theme.onAccent)
    if (this.variant === 'danger') return cssColor(this.theme.onDanger)
    return this.theme.text
  }

  private iconColor(): number {
    if (this.muted) return this.theme.ink
    if (this.variant === 'primary') return this.theme.onAccent
    if (this.variant === 'danger') return this.theme.onDanger
    return this.theme.ink
  }

  private redraw(): void {
    this.background.clear()
    drawButtonSkin(
      this.background,
      this.buttonWidth,
      this.buttonHeight,
      this.variant,
      {
        hovered: this.hovered,
        pressed: this.pressed,
        muted: this.muted,
        selected: this.selected,
      },
      this.theme,
    )
    this.layoutContent()
  }

  private layoutContent(): void {
    const metrics = buttonSkinMetrics(this.buttonWidth, this.buttonHeight, this.variant)
    const offset = metrics.faceCenterY + (this.pressed ? metrics.pressOffset : 0)
    this.decoration?.setY(this.decorationBaseY + offset)

    const icon = this.iconGraphics
    const name = this.iconName
    if (!icon || !name) {
      this.label.setPosition(0, offset)
      return
    }

    const iconSize = Math.round(this.fontSize * 1.02)
    if (this.label.text.length === 0) {
      icon.setPosition(0, offset)
      drawIcon(icon, name, iconSize, this.iconColor())
      return
    }

    const gap = Math.round(this.fontSize * 0.3)
    const groupWidth = iconSize + gap + this.label.width
    const left = -groupWidth / 2
    icon.setPosition(left + iconSize / 2, offset)
    this.label.setPosition(left + iconSize + gap + this.label.width / 2, offset)
    drawIcon(icon, name, iconSize, this.iconColor())
  }
}
