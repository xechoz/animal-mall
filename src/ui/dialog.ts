import { mixColor, type Theme } from '@mg/core'
import type Phaser from 'phaser'
import { gameColors } from '../colors'
import { GameButton } from './GameButton'

/** One close control for every dialog: 44-unit soft circle with a 20-unit X. */
export function createCloseButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  theme: Theme,
  onClick: () => void,
  ui: number,
): GameButton {
  const size = 44 * ui
  return new GameButton(scene, x, y, '', theme, {
    width: size,
    height: size,
    fontSize: 1,
    minHitSize: 56 * ui,
    variant: 'soft',
    decoration: (decorScene, button) => {
      const g = decorScene.add.graphics()
      const arm = Math.min(button.width, button.height) * 0.2
      g.lineStyle(2.2 * ui, theme.ink, 0.9)
      g.lineBetween(-arm, -arm, arm, arm)
      g.lineBetween(arm, -arm, -arm, arm)
      return g
    },
    onClick,
  })
}

/** Filled/empty level beads: shape carries the count, not just colour. */
export function drawLevelPips(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  level: number,
  max: number,
  theme: Theme,
  ui: number,
): void {
  const radius = 3.2 * ui
  const gap = 8.5 * ui
  const start = x - ((max - 1) * gap) / 2
  for (let index = 0; index < max; index += 1) {
    const px = start + index * gap
    if (index < level) {
      g.fillStyle(theme.accent, 1)
      g.fillCircle(px, y, radius)
    } else {
      g.fillStyle(theme.surfaceAlt, 1)
      g.fillCircle(px, y, radius)
      g.lineStyle(1.2 * ui, theme.borderSoft, 1)
      g.strokeCircle(px, y, radius)
    }
  }
}

/** Paper-diorama switch used by settings rows. */
export function drawToggle(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  on: boolean,
  theme: Theme,
  ui: number,
): void {
  const radius = height / 2
  const inset = Math.max(1.5, 2 * ui)
  g.fillStyle(theme.shadow, 0.14)
  g.fillRoundedRect(x - width / 2, y - height / 2 + 2 * ui, width, height, radius)
  g.fillStyle(gameColors.barkDark, 1)
  g.fillRoundedRect(x - width / 2, y - height / 2, width, height, radius)
  g.fillStyle(on ? theme.accent : theme.surfaceAlt, 1)
  g.fillRoundedRect(
    x - width / 2 + inset,
    y - height / 2 + inset,
    width - inset * 2,
    height - inset * 2,
    Math.max(1, radius - inset),
  )
  g.fillStyle(on ? gameColors.hay : theme.highlight, on ? 0.35 : 0.4)
  g.fillEllipse(x, y - height * 0.16, width * 0.68, height * 0.28)

  const knobX = on ? x + width / 2 - radius : x - width / 2 + radius
  const knobRadius = radius - inset * 2
  g.fillStyle(theme.shadow, 0.18)
  g.fillCircle(knobX, y + 1.5 * ui, knobRadius)
  g.fillStyle(theme.surface, 1)
  g.fillCircle(knobX, y, knobRadius)
  g.lineStyle(Math.max(1, 1.2 * ui), gameColors.barkDark, 0.55)
  g.strokeCircle(knobX, y, knobRadius)
  g.fillStyle(mixColor(theme.surface, theme.highlight, 0.7), 0.7)
  g.fillEllipse(knobX, y - knobRadius * 0.35, knobRadius * 1.2, knobRadius * 0.6)
}

/** Quiet chevron for a row that opens another dialog. */
export function drawChevron(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  theme: Theme,
  ui: number,
): void {
  g.lineStyle(2 * ui, theme.muted, 0.9)
  g.lineBetween(x - 3.5 * ui, y - 6 * ui, x + 2.5 * ui, y)
  g.lineBetween(x + 2.5 * ui, y, x - 3.5 * ui, y + 6 * ui)
}
