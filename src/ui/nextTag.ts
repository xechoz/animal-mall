import { cssColor, type I18n, type Theme, textStyle } from '@mg/core'
import type Phaser from 'phaser'

export interface NextTagOptions {
  readonly scene: Phaser.Scene
  readonly theme: Theme
  readonly i18n: I18n
  readonly ui: number
  /** Highlighted in accent once the player can pay for it. */
  readonly affordable: boolean
}

export interface NextTag {
  readonly container: Phaser.GameObjects.Container
  readonly width: number
  readonly height: number
}

/**
 * Small "next" pill that straddles a card's top edge. The top bar no longer
 * carries the goal, so the recommendation appears exactly on the card the
 * player would buy, and only there.
 */
export function createNextTag(options: NextTagOptions): NextTag {
  const { scene, theme, i18n, ui, affordable } = options
  const label = scene.add
    .text(
      0,
      0,
      i18n.t('shop.next'),
      textStyle(
        theme,
        10 * ui,
        affordable ? cssColor(theme.onAccent) : cssColor(theme.surface),
        true,
      ),
    )
    .setOrigin(0.5)
  const width = label.width + 16 * ui
  const height = 18 * ui
  const g = scene.add.graphics()
  g.fillStyle(affordable ? theme.accent : theme.muted, 1)
  g.fillRoundedRect(-width / 2, -height / 2, width, height, height / 2)
  g.lineStyle(1.5 * ui, theme.surface, 1)
  g.strokeRoundedRect(-width / 2, -height / 2, width, height, height / 2)
  return { container: scene.add.container(0, 0, [g, label]), width, height }
}
