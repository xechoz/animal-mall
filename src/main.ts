import { createGame } from '@mg/core'
import { gameColors } from './colors'
import { gameI18n } from './i18n'
import { GameScene } from './scenes/GameScene'
import { MenuScene } from './scenes/MenuScene'

const tutorialHand = new URL('./assets/ui/tap-hand.png', import.meta.url).href
const music = new URL('./assets/audio/joyful-jungle.mp3', import.meta.url).href
const eatSamples = [
  new URL('./assets/audio/eat-1.mp3', import.meta.url).href,
  new URL('./assets/audio/eat-2.mp3', import.meta.url).href,
]
const drinkGulp = new URL('./assets/audio/drink-gulp.mp3', import.meta.url).href
const stockDropSamples = [
  new URL('./assets/audio/stock-drop-1.mp3', import.meta.url).href,
  new URL('./assets/audio/stock-drop-2.mp3', import.meta.url).href,
]
const fishCast = new URL('./assets/audio/fish-cast.mp3', import.meta.url).href
const fishSplash = new URL('./assets/audio/fish-splash.mp3', import.meta.url).href
const cowMoo = new URL('./assets/audio/cow-moo.mp3', import.meta.url).href
const chickenCluck = new URL('./assets/audio/chicken-cluck.mp3', import.meta.url).href
const sheepBaa = new URL('./assets/audio/sheep-baa.mp3', import.meta.url).href

async function boot(): Promise<void> {
  // Phaser measures and rasterises text when a scene is created. Waiting for
  // the bundled Nunito faces keeps the first menu frame from using the system
  // fallback and reflowing a moment later. A timeout means a broken or blocked
  // font never holds the game hostage.
  if (typeof document !== 'undefined' && 'fonts' in document) {
    await Promise.race([
      document.fonts.load('700 16px Nunito').catch(() => undefined),
      new Promise((resolve) => window.setTimeout(resolve, 1_200)),
    ])
  }

  createGame({
    id: 'animal-mall',
    design: { base: 720 },
    theme: gameColors.theme,
    defaultLang: 'en',
    i18n: gameI18n,
    menuScene: 'Menu',
    assets: {
      images: [{ key: 'tutorial-hand', url: tutorialHand }],
      audio: [{ key: 'music', urls: music }],
    },
    // Built-in slots can be overridden and games may register their own sound
    // names; the fishing and animal effects are sample-only keys. `diningEat`
    // keeps the snake crunches scoped to table meals, while harvest, feed and
    // customer pickups keep the platform's synth `eat` cue.
    audioSamples: {
      slow: drinkGulp,
      diningEat: eatSamples,
      stockDrop: stockDropSamples,
      fishCast,
      fishSplash,
      cowMoo,
      chickenCluck,
      sheepBaa,
    },
    scenes: [MenuScene, GameScene],
  })
}

void boot()
