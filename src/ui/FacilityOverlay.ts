import { Button, type I18n, type Theme } from '@mg/core'
import type Phaser from 'phaser'
import { FACILITY_DWELL_MS } from '../logic/config'
import { nearestRestingStaff } from '../logic/facilities'
import type { ShopState, Vec2 } from '../logic/types'
import { type GameLayout, worldToScreen } from './layout'

export interface FacilityOverlayCallbacks {
  readonly onNudge: () => void
}

export class FacilityOverlay {
  private readonly scene: Phaser.Scene
  private readonly layout: GameLayout
  private readonly theme: Theme
  private readonly i18n: I18n
  private readonly ring: Phaser.GameObjects.Graphics
  private readonly button: Button
  private buttonEnabled = false
  private labelKey = ''

  constructor(
    scene: Phaser.Scene,
    layout: GameLayout,
    theme: Theme,
    i18n: I18n,
    callbacks: FacilityOverlayCallbacks,
  ) {
    this.scene = scene
    this.layout = layout
    this.theme = theme
    this.i18n = i18n
    this.ring = scene.add.graphics().setDepth(3999)
    this.button = new Button(scene, 0, 0, '', theme, {
      width: 174,
      height: 46,
      fontSize: 16,
      variant: 'primary',
      onClick: callbacks.onNudge,
    })
    this.button.setDepth(6250).setVisible(false).setEnabled(false)
  }

  update(state: ShopState, enabled: boolean): void {
    const resting = enabled ? nearestRestingStaff(state) : null
    this.updateButton(resting, enabled)
    this.drawRings(state, resting, enabled)
  }

  destroy(): void {
    this.button.destroy()
    this.ring.destroy()
  }

  private updateButton(resting: ShopState['staffMembers'][number] | null, enabled: boolean): void {
    const show = enabled && resting !== null
    this.button.setVisible(show)
    if (this.buttonEnabled !== show) {
      this.buttonEnabled = show
      this.button.setEnabled(show)
    }
    if (resting === null) return

    const labelKey = `facility.nudge-${resting.kind}`
    if (labelKey !== this.labelKey) {
      this.labelKey = labelKey
      this.button.setText(
        this.i18n.t('facility.nudge', {
          name: this.i18n.t(`staff.${resting.kind}`),
        }),
      )
    }
    this.button.setPosition(
      this.layout.width - this.layout.insets.right - 98,
      this.layout.height - this.layout.insets.bottom - 86,
    )
  }

  private drawRings(
    state: ShopState,
    resting: ShopState['staffMembers'][number] | null,
    enabled: boolean,
  ): void {
    this.ring.clear()
    if (!enabled) return

    const facilities = state.map.facilities
    if (state.facility.trashDwellMs > 0) {
      this.drawProgress(
        facilities.trashPoint,
        state.facility.trashDwellMs / FACILITY_DWELL_MS,
        this.theme.accent,
      )
    }
    if (state.facility.drinkDwellMs > 0) {
      this.drawProgress(
        facilities.vendingPoint,
        state.facility.drinkDwellMs / FACILITY_DWELL_MS,
        this.theme.accentAlt,
      )
    }
    if (resting !== null) {
      const point = worldToScreen(this.layout, resting.pos)
      const pulse = 1 + Math.sin(this.scene.time.now * 0.006) * 0.12
      const radius = 24 * this.layout.worldScale * pulse
      this.ring.lineStyle(3, this.theme.accentAlt, 0.9)
      this.ring.strokeCircle(point.x, point.y - 18, radius)
      this.ring.lineStyle(2, this.theme.panel, 0.7)
      this.ring.strokeCircle(point.x, point.y - 18, radius + 5)
    }
  }

  private drawProgress(point: Vec2, ratio: number, color: number): void {
    const screen = worldToScreen(this.layout, point)
    const radius = Math.max(14, 26 * this.layout.worldScale)
    const progress = Math.max(0, Math.min(1, ratio))
    this.ring.lineStyle(4, this.theme.ink, 0.18)
    this.ring.strokeCircle(screen.x, screen.y, radius)
    this.ring.lineStyle(4, color, 1)
    this.ring.beginPath()
    this.ring.arc(screen.x, screen.y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress)
    this.ring.strokePath()
  }
}
