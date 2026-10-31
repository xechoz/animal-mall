import { createGame } from '@mg/core'
import { gameColors } from './colors'
import { gameI18n } from './i18n'
import { GameScene } from './scenes/GameScene'
import { MenuScene } from './scenes/MenuScene'

const music = new URL('./assets/audio/joyful-jungle.mp3', import.meta.url).href
const drinkGulp = new URL('./assets/audio/drink-gulp.mp3', import.meta.url).href
const fishCast = new URL('./assets/audio/fish-cast.wav', import.meta.url).href
const fishSplash = new URL('./assets/audio/fish-splash.wav', import.meta.url).href
const cowMoo = new URL('./assets/audio/cow-moo.mp3', import.meta.url).href
const chickenCluck = new URL('./assets/audio/chicken-cluck.mp3', import.meta.url).href
const sheepBaa = new URL('./assets/audio/sheep-baa.mp3', import.meta.url).href

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
  // Built-in slots can be overridden and games may register their own sound
  // names; the two fishing effects are sample-only keys.
  audioSamples: { slow: drinkGulp, fishCast, fishSplash, cowMoo, chickenCluck, sheepBaa },
  scenes: [MenuScene, GameScene],
})
