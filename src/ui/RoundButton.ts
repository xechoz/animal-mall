import { drawIcon, type IconName, mixColor, type Theme } from '@mg/core'
import Phaser from 'phaser'

export type RoundButtonIcon = IconName | 'gear'

export interface RoundButtonOptions {
  readonly size?: number
  readonly icon: RoundButtonIcon
  readonly theme: Theme
  readonly variant?: 'primary' | 'soft'
  readonly onClick: () => void
  readonly badge?: boolean
}

function drawGear(g: Phaser.GameObjects.Graphics, size: number, color: number): void {
  const half = size / 2
  const inner = half * 0.52
  const outer = half * 0.82
  const line = Math.max(2, size * 0.1)
  g.fillStyle(color, 1)
  for (let index = 0; index < 8; index += 1) {
    const angle = (index * Math.PI) / 4
    const points = [
      new Phaser.Math.Vector2(Math.cos(angle - 0.16) * inner, Math.sin(angle - 0.16) * inner),
      new Phaser.Math.Vector2(Math.cos(angle - 0.22) * outer, Math.sin(angle - 0.22) * outer),
      new Phaser.Math.Vector2(Math.cos(angle + 0.22) * outer, Math.sin(angle + 0.22) * outer),
      new Phaser.Math.Vector2(Math.cos(angle + 0.16) * inner, Math.sin(angle + 0.16) * inner),
    ]
    g.fillPoints(points, true)
  }
  g.lineStyle(line, color, 1)
  g.strokeCircle(0, 0, inner)
  g.strokeCircle(0, 0, half * 0.22)
}

export class RoundButton extends Phaser.GameObjects.Container {
  private readonly theme: Theme
  private readonly icon: RoundButtonIcon
  private readonly buttonSize: number
  private readonly variant: 'primary' | 'soft'
  private readonly face: Phaser.GameObjects.Graphics
  private readonly zone: Phaser.GameObjects.Zone
  private readonly onClickHandler: () => void
  private enabled = true
  private hovered = false
  private pressed = false
  private badgeVisible = false

  constructor(scene: Phaser.Scene, x: number, y: number, options: RoundButtonOptions) {
    super(scene, x, y)
    this.theme = options.theme
    this.icon = options.icon
    this.buttonSize = options.size ?? 54
    this.variant = options.variant ?? 'soft'
    this.onClickHandler = options.onClick
    this.badgeVisible = options.badge ?? false

    this.face = new Phaser.GameObjects.Graphics(scene)
    this.add(this.face)

    this.zone = new Phaser.GameObjects.Zone(scene, 0, 0, this.buttonSize, this.buttonSize)
    this.zone.setInteractive({ useHandCursor: true })
    this.add(this.zone)

    this.zone.on('pointerover', () => {
      this.hovered = true
      this.redraw()
    })
    this.zone.on('pointerout', () => {
      this.hovered = false
      this.pressed = false
      this.redraw()
    })
    this.zone.on('pointerdown', () => {
      if (!this.enabled) return
      this.pressed = true
      this.redraw()
    })
    this.zone.on('pointerup', () => {
      if (!this.enabled || !this.pressed) return
      this.pressed = false
      this.redraw()
      this.onClickHandler()
    })

    scene.add.existing(this)
    this.redraw()
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled
    this.alpha = enabled ? 1 : 0.45
    const input = this.zone.input
    if (input !== null) input.enabled = enabled
    this.redraw()
    return this
  }

  setBadge(visible: boolean): this {
    if (this.badgeVisible === visible) return this
    this.badgeVisible = visible
    this.redraw()
    return this
  }

  private redraw(): void {
    const size = this.buttonSize
    const radius = size / 2
    const g = this.face
    g.clear()

    const base = this.variant === 'primary' ? this.theme.accent : this.theme.surface
    const hover =
      this.variant === 'primary'
        ? this.theme.accentHover
        : mixColor(this.theme.surface, this.theme.accentWarm, 0.5)
    const faceColor = !this.enabled
      ? mixColor(base, this.theme.borderSoft, 0.55)
      : this.pressed
        ? mixColor(base, this.theme.ink, 0.12)
        : this.hovered
          ? hover
          : base
    const iconColor = this.variant === 'primary' ? this.theme.onAccent : this.theme.ink

    // Both buttons float over the world with no bar behind them, so they carry
    // their own shadow and a ring dark enough to read on grass and floor.
    g.fillStyle(this.theme.shadow, 0.2)
    g.fillCircle(0, 5, radius)
    g.fillStyle(faceColor, 1)
    g.fillCircle(0, 0, radius)
    g.lineStyle(3, this.theme.ink, this.variant === 'primary' ? 0.75 : 0.55)
    g.strokeCircle(0, 0, radius - 1)

    if (this.variant === 'primary') {
      g.fillStyle(this.theme.highlight, 0.16)
      g.fillEllipse(0, -radius * 0.34, radius * 1.15, radius * 0.58)
    }

    if (this.icon === 'gear') drawGear(g, Math.round(size * 0.42), iconColor)
    else drawIcon(g, this.icon, Math.round(size * 0.42), iconColor)

    if (this.badgeVisible) {
      g.fillStyle(this.theme.accent, 1)
      g.fillCircle(radius * 0.72, -radius * 0.72, 7)
      g.lineStyle(2, this.theme.panel, 1)
      g.strokeCircle(radius * 0.72, -radius * 0.72, 7)
    }
  }
}
