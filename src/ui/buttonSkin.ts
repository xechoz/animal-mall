import { mixColor, type Theme } from '@mg/core'
import type Phaser from 'phaser'
import { gameColors } from '../colors'

export type ButtonSkinVariant = 'primary' | 'soft' | 'ghost' | 'danger'

export interface ButtonSkinState {
  readonly hovered: boolean
  readonly pressed: boolean
  /** Shown but not affordable: paper face, bark frame stays. */
  readonly muted?: boolean
  /** A soft accent ring inside the face, used by chips and language choices. */
  readonly selected?: boolean
}

export interface ButtonSkinMetrics {
  /** Bark frame thickness around the face. */
  readonly rim: number
  /** Exposed bark under the face; this is the "thickness" of the key. */
  readonly lip: number
  readonly shadowOffset: number
  readonly faceX: number
  readonly faceY: number
  readonly faceWidth: number
  readonly faceHeight: number
  readonly faceRadius: number
  /** The face sits slightly above the geometric centre because the lip is thicker than the rim. */
  readonly faceCenterY: number
  /** How far the face sinks when pressed; the label and every decoration follow it. */
  readonly pressOffset: number
}

const clamp = (min: number, value: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/**
 * Shared geometry for every game control that should read as a physical key:
 * a bark socket, an inset face and a visible lip under it. Everything stays
 * inside the nominal width and height so replacing a flat button never moves a
 * card layout.
 */
export function buttonSkinMetrics(
  width: number,
  height: number,
  variant: ButtonSkinVariant,
): ButtonSkinMetrics {
  const scale = height / 56
  const ghost = variant === 'ghost'
  const soft = variant === 'soft'
  const rim = ghost ? 1.2 : clamp(2, (soft ? 2.5 : 3.2) * scale, soft ? 3.4 : 4.4)
  const lip = ghost ? 0 : clamp(3, (soft ? 5 : 6.4) * scale, soft ? 7 : 9)
  const shadowOffset = ghost ? 0 : clamp(3, 6 * scale, 8)
  const faceWidth = Math.max(1, width - rim * 2)
  const faceHeight = Math.max(1, height - rim - lip)
  return {
    rim,
    lip,
    shadowOffset,
    faceX: -width / 2 + rim,
    faceY: -height / 2 + rim,
    faceWidth,
    faceHeight,
    faceRadius: faceHeight / 2,
    faceCenterY: (rim - lip) / 2,
    pressOffset: ghost ? 0 : Math.max(0, lip - rim),
  }
}

export function buttonFaceColor(
  theme: Theme,
  variant: ButtonSkinVariant,
  hovered: boolean,
  muted = false,
): number {
  if (muted && variant !== 'ghost') {
    return hovered ? mixColor(theme.surfaceAlt, theme.surface, 0.32) : theme.surfaceAlt
  }
  switch (variant) {
    case 'primary':
      return hovered ? mixColor(theme.accent, theme.highlight, 0.14) : theme.accent
    case 'danger':
      return hovered ? mixColor(theme.danger, theme.highlight, 0.12) : theme.danger
    case 'soft':
      return hovered ? mixColor(theme.surface, theme.accentWarm, 0.42) : theme.surface
    case 'ghost':
      return theme.surface
  }
}

export function drawButtonSkin(
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  variant: ButtonSkinVariant,
  state: ButtonSkinState,
  theme: Theme,
): void {
  const radius = height / 2

  if (variant === 'ghost') {
    if (state.hovered) {
      g.fillStyle(theme.surface, 0.72)
      g.fillRoundedRect(-width / 2, -height / 2, width, height, radius)
    }
    g.lineStyle(1.4, gameColors.barkDark, 0.5)
    g.strokeRoundedRect(-width / 2 + 0.7, -height / 2 + 0.7, width - 1.4, height - 1.4, radius)
    return
  }

  const metrics = buttonSkinMetrics(width, height, variant)
  const muted = state.muted === true
  const selected = state.selected === true
  const face = buttonFaceColor(theme, variant, state.hovered, muted)
  const press = state.pressed ? metrics.pressOffset : 0
  const shadowY = state.pressed ? 2 : metrics.shadowOffset
  const shadowAlpha = state.pressed ? 0.12 : variant === 'soft' ? 0.16 : 0.2

  g.fillStyle(theme.shadow, shadowAlpha)
  g.fillRoundedRect(-width / 2, -height / 2 + shadowY, width, height, radius)

  // The exposed bottom edge of this bark body is the lip. Keeping it inside the
  // nominal height means a dense card row never gains a stray shadow line.
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(-width / 2, -height / 2, width, height, radius)

  g.fillStyle(face, 1)
  g.fillRoundedRect(
    metrics.faceX,
    metrics.faceY + press,
    metrics.faceWidth,
    metrics.faceHeight,
    metrics.faceRadius,
  )

  // A tinted sheen instead of translucent white: white over the leaf green
  // would desaturate the brand colour into grey.
  const sheen =
    variant === 'primary'
      ? mixColor(face, theme.accentWarm, 0.55)
      : variant === 'danger'
        ? mixColor(face, theme.highlight, 0.35)
        : mixColor(face, theme.highlight, 0.72)
  g.fillStyle(sheen, muted ? 0.28 : variant === 'soft' ? 0.5 : 0.42)
  g.fillEllipse(
    metrics.faceX + metrics.faceWidth / 2,
    metrics.faceY + press + metrics.faceHeight * 0.36,
    metrics.faceWidth * 0.78,
    metrics.faceHeight * 0.46,
  )

  if (selected) {
    // The ring lives inside the face so the bark frame stays intact and the
    // selected chip still reads as the same physical button as its neighbours.
    const inset = Math.max(2, height * 0.05)
    g.lineStyle(Math.max(1.4, height * 0.035), theme.accent, 0.95)
    g.strokeRoundedRect(
      metrics.faceX + inset,
      metrics.faceY + press + inset,
      metrics.faceWidth - inset * 2,
      metrics.faceHeight - inset * 2,
      Math.max(1, metrics.faceRadius - inset),
    )
  }
}
