import { createGame } from '@mg/core'
import { gameColors } from './colors'
import { gameI18n } from './i18n'
import { GameScene } from './scenes/GameScene'
import { MenuScene } from './scenes/MenuScene'

const music = new URL('./assets/audio/joyful-jungle.mp3', import.meta.url).href
const drinkGulp = new URL('./assets/audio/drink-gulp.mp3', import.meta.url).href

createGame({
  id: 'animal-mall',
  design: { base: 720 },
  theme: gameColors.theme,
  defaultLang: 'en',
  i18n: gameI18n,
  menuScene: 'Menu',
  assets: {
    audio: [{ key: 'music', urls: music }],
  },
  // The platform has no dedicated drink effect, and this game never uses the
  // `slow` slot, so the bundled gulp sample takes over that effect.
  audioSamples: { slow: drinkGulp },
  scenes: [MenuScene, GameScene],
})
