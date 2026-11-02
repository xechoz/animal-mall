import {
  Button,
  displayTextStyle,
  type GameServices,
  getServices,
  readViewport,
  textStyle,
} from '@mg/core'
import Phaser from 'phaser'
import { startMusic, syncMusic } from '../audio/music'
import { gameColors } from '../colors'
import { hasProgress, progressSave } from '../save'
import { ANIMAL_SCALE, createAnimalTextures, playerTextureKey } from '../ui/animalArt'
import {
  drawAntTrail,
  drawBird,
  drawBush,
  drawCanopyBand,
  drawFence,
  drawFern,
  drawFrog,
  drawHedgehog,
  drawLog,
  drawMushroomCluster,
  drawRock,
  drawSquirrel,
  drawStump,
  drawSunShaft,
  drawTree,
  fillPolygon,
  strokePolygon,
} from '../ui/forestArt'
import { createFruitTextures, fruitTextureKey } from '../ui/fruitArt'
import {
  fullscreenActive,
  fullscreenHint,
  fullscreenSupported,
  preferLandscape,
  requestGameFullscreen,
  toggleGameFullscreen,
} from '../ui/fullscreen'
import { LanguageModal } from '../ui/LanguageModal'
import { computeGameLayout } from '../ui/layout'
import { RoundButton } from '../ui/RoundButton'
import { SettingsModal } from '../ui/SettingsModal'
import { readCssShortSide } from '../ui/scale'

export class MenuScene extends Phaser.Scene {
  private services!: GameServices
  private settingsModal?: SettingsModal
  private languageModal?: LanguageModal
  private startButton?: Button
  private restarting = false
  private starting = false

  constructor() {
    super('Menu')
  }

  create(): void {
    this.restarting = false
    this.starting = false
    this.settingsModal = undefined
    this.languageModal = undefined
    this.services = getServices()
    startMusic(this)
    createAnimalTextures(this)
    createFruitTextures(this)
    this.services.platform.gameplayStop()
    this.cameras.main.setBackgroundColor(gameColors.theme.bg)

    const viewport = readViewport(this)
    const width = viewport.width
    const height = viewport.height
    const insets = viewport.insets
    const theme = this.services.theme
    const i18n = this.services.i18n
    const save = progressSave(this.services).read()
    const portrait = height >= width
    const layout = computeGameLayout(width, height, insets, {
      cssShortSide: readCssShortSide(this),
    })
    const ui = layout.ui

    this.drawBackdrop(width, height)
    this.drawShopfront(width, height, portrait)

    const titleY = insets.top + (portrait ? 130 : 82) * ui
    this.add
      .text(
        width / 2,
        titleY,
        i18n.t('game.title'),
        displayTextStyle(theme, 48 * ui, '#fff7e8', true, 4 * ui, 4 * ui),
      )
      .setOrigin(0.5)
      .setDepth(20)

    const zoneCount = Object.values(save.zones).filter(Boolean).length
    this.add
      .text(
        width / 2,
        titleY + 46 * ui,
        i18n.t('menu.stats', {
          coins: save.coins,
          zones: zoneCount,
          served: save.served,
        }),
        textStyle(theme, layout.text.body, '#e6d8bd', true),
      )
      .setOrigin(0.5)
      .setDepth(20)

    const startY = portrait ? height * 0.72 : height * 0.8
    this.startButton = new Button(
      this,
      width / 2,
      startY,
      hasProgress(save) ? i18n.t('menu.continue') : i18n.t('menu.start'),
      theme,
      {
        width: Math.min(330 * ui, width - 80 * ui),
        height: 62 * ui,
        fontSize: 24 * ui,
        variant: 'primary',
        onClick: () => this.startGame(),
      },
    )
    this.startButton.setDepth(30)

    const hint = fullscreenHint(this.scale)
    if (hint !== null) {
      this.add
        .text(
          width / 2,
          height - insets.bottom - 24 * ui,
          i18n.t(hint),
          textStyle(theme, 13 * ui, '#d8c9a8'),
        )
        .setOrigin(0.5)
        .setDepth(20)
    }

    const settingsButton = new RoundButton(
      this,
      width - insets.right - 42 * ui,
      insets.top + 42 * ui,
      {
        icon: 'gear',
        theme,
        variant: 'soft',
        size: 54 * ui,
        onClick: () => this.openSettings(),
      },
    )
    settingsButton.setDepth(40)

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    })
  }

  private startGame(): void {
    if (this.starting) return
    this.starting = true
    preferLandscape(this.scale)
    requestGameFullscreen(this.scale)
    this.scene.start('Game')
  }

  private openSettings(): void {
    if (this.settingsModal !== undefined || this.languageModal !== undefined) return
    const viewport = readViewport(this)
    const layout = computeGameLayout(viewport.width, viewport.height, viewport.insets, {
      cssShortSide: readCssShortSide(this),
    })
    this.settingsModal = new SettingsModal({
      scene: this,
      layout,
      theme: this.services.theme,
      i18n: this.services.i18n,
      soundEnabled: this.services.settings.value.sound,
      fullscreenActive: fullscreenActive(),
      fullscreenAvailable: fullscreenSupported(this.scale),
      onToggleSound: () => {
        const enabled = !this.services.settings.value.sound
        this.services.setSound(enabled)
        syncMusic()
        this.services.audio.play('click')
        return enabled
      },
      onToggleFullscreen: () => {
        toggleGameFullscreen(this.scale)
        this.time.delayedCall(100, () => {
          this.settingsModal?.setFullscreen(fullscreenActive())
        })
      },
      onOpenLanguage: () => {
        this.settingsModal?.destroy()
        this.settingsModal = undefined
        this.openLanguage()
      },
      onClose: () => {
        this.settingsModal = undefined
      },
    })
  }

  private openLanguage(): void {
    if (this.languageModal !== undefined || this.settingsModal !== undefined) return
    const viewport = readViewport(this)
    const layout = computeGameLayout(viewport.width, viewport.height, viewport.insets, {
      cssShortSide: readCssShortSide(this),
    })
    this.languageModal = new LanguageModal({
      scene: this,
      layout,
      theme: this.services.theme,
      i18n: this.services.i18n,
      current: this.services.i18n.lang,
      onSelect: (lang) => {
        this.services.setLang(lang)
        this.scene.restart()
      },
      onClose: () => {
        this.languageModal = undefined
      },
    })
  }

  private handleResize(): void {
    if (this.restarting || this.starting) return
    this.restarting = true
    this.scene.restart()
  }

  private drawBackdrop(width: number, height: number): void {
    const g = this.add.graphics().setDepth(0)
    g.fillStyle(gameColors.canopy, 1)
    g.fillRect(0, 0, width, height)
    g.fillStyle(gameColors.pine, 1)
    g.fillRect(0, 0, width, height * 0.52)
    g.fillStyle(gameColors.theme.bgAlt, 0.9)
    g.fillRect(0, height * 0.42, width, height * 0.58)

    // Distant trunks and a soft moss floor keep the clearing readable.
    drawTree(g, width * 0.2, height * 0.6, 0.82, 'pine', 'gold')
    drawTree(g, width * 0.34, height * 0.64, 0.72, 'oak', 'plum')
    drawTree(g, width * 0.68, height * 0.64, 0.72, 'oak', 'teal')
    drawTree(g, width * 0.8, height * 0.6, 0.82, 'pine', 'olive')
    g.fillStyle(gameColors.mossDark, 0.55)
    g.fillRect(0, height * 0.72, width, height * 0.28)
    g.fillStyle(gameColors.moss, 0.22)
    g.fillEllipse(width * 0.28, height * 0.82, width * 0.42, height * 0.16)
    g.fillEllipse(width * 0.74, height * 0.86, width * 0.36, height * 0.12)

    // A dirt path leads from the clearing to the shop gate.
    const pathTop = height * 0.7
    const pathPoints = [
      { x: width / 2 - 24, y: pathTop },
      { x: width / 2 + 24, y: pathTop },
      { x: width / 2 + 82, y: height + 12 },
      { x: width / 2 - 82, y: height + 12 },
    ]
    fillPolygon(g, pathPoints, 0xa87a4a, 0.88)
    strokePolygon(g, pathPoints, 0x6f4a2c, 0.45, 2)
    for (let index = 0; index < 6; index += 1) {
      const t = (index + 0.5) / 6
      const y = pathTop + (height - pathTop) * t
      const w = 40 + t * 26
      g.fillStyle(0xe0cba4, 0.9)
      g.fillEllipse(width / 2, y, w, 14)
      g.fillStyle(0xf2e3c6, 0.55)
      g.fillEllipse(width / 2 - 3, y - 2, w * 0.6, 5)
    }

    drawCanopyBand(g, -30, -22, width + 60, 84, 7)
    drawSunShaft(g, width * 0.18, 50, 72, height * 0.58, 0.06)
    drawSunShaft(g, width * 0.56, 30, 52, height * 0.48, 0.045)

    drawTree(g, width * 0.06, height * 0.8, 1.25, 'oak', 'amber')
    drawTree(g, width * 0.94, height * 0.82, 1.1, 'pine', 'teal')
    drawTree(g, width * 0.2, height * 0.7, 0.7, 'pine', 'gold')
    drawTree(g, width * 0.82, height * 0.72, 0.62, 'oak', 'plum')
    drawTree(g, width * 0.28, height * 0.78, 0.72, 'oak', 'olive')
    drawTree(g, width * 0.7, height * 0.8, 0.6, 'pine', 'green')

    drawFern(g, width * 0.04, height * 0.9, 1.1, 1)
    drawFern(g, width * 0.97, height * 0.9, 1.1, -1)
    drawRock(g, width * 0.09, height * 0.92, 1.1)
    drawRock(g, width * 0.9, height * 0.9, 0.9)
    drawMushroomCluster(g, width * 0.14, height * 0.94, 1.1)
    drawMushroomCluster(g, width * 0.86, height * 0.93, 0.9)
    drawStump(g, width * 0.44, height * 0.88, 1.05)
    drawLog(g, width * 0.68, height * 0.94, 0.95)
    drawSquirrel(g, width * 0.11, height * 0.9, 1.05, 1)
    drawHedgehog(g, width * 0.88, height * 0.91, 1, -1)
    drawFrog(g, width * 0.24, height * 0.95, 0.9)
    drawBird(g, width * 0.74, height * 0.86, 0.9, -1)
    drawAntTrail(g, width * 0.34, height * 0.93, 1)

    this.addMenuFireflies(width, height)
  }

  private addMenuFireflies(width: number, height: number): void {
    for (let index = 0; index < 7; index += 1) {
      const x = width * (0.07 + index * 0.14)
      const y = height * (0.2 + ((index * 23) % 54) / 100)
      const glow = this.add
        .circle(x, y, 5, gameColors.sunbeam, 0.1)
        .setDepth(1)
        .setBlendMode(Phaser.BlendModes.ADD)
      const dot = this.add
        .circle(x, y, 1.5, 0xfff7d6, 0.85)
        .setDepth(1)
        .setBlendMode(Phaser.BlendModes.ADD)
      this.tweens.add({
        targets: dot,
        alpha: { from: 0.25, to: 1 },
        duration: 900 + index * 130,
        yoyo: true,
        repeat: -1,
        delay: index * 170,
        ease: 'Sine.easeInOut',
      })
      this.tweens.add({
        targets: glow,
        scale: { from: 0.75, to: 1.2 },
        duration: 1_400 + index * 110,
        yoyo: true,
        repeat: -1,
        delay: index * 120,
        ease: 'Sine.easeInOut',
      })
    }
  }

  private drawShopfront(width: number, height: number, portrait: boolean): void {
    const scale = portrait ? 1 : 0.94
    const centerY = portrait ? height * 0.49 : height * 0.51
    const shop = this.add
      .container(width / 2, centerY)
      .setDepth(10)
      .setScale(scale)
    const theme = this.services.theme
    const i18n = this.services.i18n
    const g = this.add.graphics()
    shop.add(g)

    // Ground shadow and the two big trees that frame the cottage.
    g.fillStyle(0x1a120c, 0.16)
    g.fillEllipse(0, 184, 600, 42)
    drawTree(g, -300, 120, 1.12, 'oak', 'olive')
    drawTree(g, 300, 120, 1.05, 'pine', 'teal')
    drawBush(g, -252, 176, 1.1, 'dark', 'amber')
    drawBush(g, 252, 176, 1.05, 'light', 'gold')

    // Main building: warm plaster inside a bark frame.
    g.fillStyle(0x1a120c, 0.18)
    g.fillRoundedRect(-256, -86, 512, 264, 22)
    g.fillStyle(gameColors.cream, 1)
    g.fillRoundedRect(-260, -96, 520, 264, 22)
    g.fillStyle(0xf2e3c6, 1)
    g.fillRoundedRect(-246, -82, 492, 236, 14)
    g.fillStyle(gameColors.barkDark, 0.92)
    for (const x of [-240, -126, 126, 240]) {
      g.fillRoundedRect(x - 5, -82, 10, 236, 4)
    }
    g.fillRoundedRect(-246, -82, 492, 12, 6)
    g.fillRoundedRect(-246, 142, 492, 12, 6)

    // Thatched roof with a mossy, scalloped edge.
    g.fillStyle(0x1a120c, 0.2)
    g.fillRoundedRect(-272, -132, 544, 58, 20)
    g.fillStyle(gameColors.barkDark, 1)
    g.fillRoundedRect(-270, -138, 540, 58, 20)
    g.fillStyle(gameColors.straw, 1)
    g.fillRoundedRect(-264, -134, 528, 48, 16)
    g.fillStyle(gameColors.hay, 0.95)
    for (let index = 0; index < 13; index += 1) {
      const x = -252 + index * 42
      g.fillEllipse(x, -90, 46, 22)
      g.fillStyle(index % 2 === 0 ? gameColors.hay : gameColors.straw, 0.9)
    }
    g.fillStyle(gameColors.moss, 0.6)
    g.fillEllipse(-190, -122, 74, 18)
    g.fillEllipse(148, -118, 64, 16)
    g.fillStyle(gameColors.fern, 0.75)
    for (const x of [-236, -120, 10, 150, 232]) {
      g.fillEllipse(x, -88, 28, 10)
    }

    // Sign above the roof.
    g.fillStyle(0x1a120c, 0.2)
    g.fillRoundedRect(-148, -198, 300, 54, 14)
    g.fillStyle(gameColors.barkDark, 1)
    g.fillRoundedRect(-150, -200, 300, 54, 14)
    g.fillStyle(gameColors.woodLight, 1)
    g.fillRoundedRect(-145, -196, 290, 46, 11)
    g.fillStyle(gameColors.hay, 0.45)
    g.fillRoundedRect(-132, -190, 264, 3, 1.5)
    for (const [index, kind] of (['apple', 'pear', 'peach'] as const).entries()) {
      shop.add(this.add.image(-52 + index * 52, -173, fruitTextureKey(kind)).setScale(0.8))
    }

    // Windows with fruit shelves and flower boxes.
    for (const x of [-148, 148]) {
      g.fillStyle(0x2b241d, 0.72)
      g.fillRoundedRect(x - 72, -62, 144, 92, 12)
      g.fillStyle(0xfff3dd, 1)
      g.fillRoundedRect(x - 68, -58, 136, 84, 9)
      g.fillStyle(gameColors.wood, 1)
      g.fillRoundedRect(x - 58, -4, 116, 8, 4)
      g.fillRoundedRect(x - 58, 28, 116, 8, 4)
      g.fillStyle(gameColors.barkDark, 1)
      g.fillRoundedRect(x - 66, 34, 132, 14, 5)
      g.fillStyle(gameColors.moss, 0.95)
      for (let index = 0; index < 5; index += 1) {
        g.fillCircle(x - 52 + index * 26, 33, 5)
        g.fillStyle(index % 2 === 0 ? gameColors.berry : gameColors.sunbeam, 0.9)
        g.fillCircle(x - 52 + index * 26, 29, 3)
        g.fillStyle(gameColors.moss, 0.95)
      }
    }
    const fruitPositions: Array<{ x: number; y: number; key: string }> = [
      { x: -178, y: -28, key: fruitTextureKey('apple') },
      { x: -118, y: -28, key: fruitTextureKey('pear') },
      { x: 118, y: -28, key: fruitTextureKey('peach') },
      { x: 178, y: -28, key: fruitTextureKey('cherry') },
      { x: -148, y: 4, key: fruitTextureKey('apple') },
      { x: 148, y: 4, key: fruitTextureKey('pear') },
    ]
    for (const item of fruitPositions) {
      shop.add(this.add.image(item.x, item.y, item.key).setScale(0.55))
    }

    // Door with a round window and a leafy wreath.
    g.fillStyle(0x1a120c, 0.55)
    g.fillRoundedRect(-44, -18, 88, 142, 12)
    g.fillStyle(gameColors.wood, 1)
    g.fillRoundedRect(-38, -14, 76, 138, 9)
    g.fillStyle(gameColors.woodDark, 1)
    g.fillRoundedRect(-28, -4, 56, 62, 6)
    g.fillStyle(gameColors.sky, 0.8)
    g.fillCircle(0, 20, 15)
    g.lineStyle(2, gameColors.woodDark, 1)
    g.strokeCircle(0, 20, 15)
    g.lineBetween(-15, 20, 15, 20)
    g.lineBetween(0, 5, 0, 35)
    g.fillStyle(gameColors.sunbeam, 0.85)
    g.fillCircle(26, 58, 4)
    g.fillStyle(gameColors.mossDark, 1)
    g.fillCircle(0, -38, 22)
    g.fillStyle(gameColors.leaf, 1)
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2
      g.fillEllipse(Math.cos(angle) * 16, -38 + Math.sin(angle) * 16, 10, 5)
    }
    g.fillStyle(gameColors.berry, 0.9)
    g.fillCircle(-12, -50, 2.5)
    g.fillCircle(13, -45, 2.2)
    g.fillStyle(gameColors.coral, 1)
    g.fillRoundedRect(-24, -60, 48, 22, 6)
    shop.add(
      this.add
        .text(0, -49, i18n.t('menu.openSign'), textStyle(theme, 10, '#fff7e8', true))
        .setOrigin(0.5),
    )

    // Stone step and path.
    g.fillStyle(gameColors.stoneDark, 1)
    g.fillRoundedRect(-84, 126, 168, 24, 8)
    g.fillStyle(gameColors.stone, 1)
    g.fillRoundedRect(-76, 122, 152, 18, 7)
    for (let index = 0; index < 3; index += 1) {
      g.fillStyle(gameColors.stoneDark, 0.5)
      g.fillEllipse(0, 154 + index * 18, 54 - index * 8, 16)
      g.fillStyle(0xcbb28a, 1)
      g.fillEllipse(0, 150 + index * 18, 48 - index * 8, 13)
    }

    // Waving shopkeeper and neighbors.
    const player = this.add
      .image(-12, 132, playerTextureKey())
      .setOrigin(0.5, 0.9)
      .setScale(0.9 * ANIMAL_SCALE)
    shop.add(player)
    this.tweens.add({
      targets: player,
      angle: { from: -3, to: 3 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
    const cat = this.add.image(-192, 142, 'animal-cat').setOrigin(0.5, 0.9).setScale(0.66)
    const rabbit = this.add.image(190, 142, 'animal-rabbit').setOrigin(0.5, 0.9).setScale(0.66)
    shop.add([cat, rabbit])
    this.tweens.add({
      targets: [cat, rabbit],
      y: { from: 142, to: 137 },
      duration: 1_100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // Small potted plants by the door.
    drawMenuPot(g, -118, 112)
    drawMenuPot(g, 118, 112)

    // The front fence sits above the characters so the cottage reads as a
    // gated clearing rather than a flat facade.
    const front = this.add.graphics()
    shop.add(front)
    drawFence(
      front,
      { x1: -280, y1: 196, x2: 280, y2: 196 },
      { height: 24, postGap: 40, gapStart: 240, gapEnd: 320, seed: 5 },
    )
    drawBush(front, -246, 194, 0.9, 'dark', 'teal')
    drawBush(front, 246, 194, 0.85, 'light', 'plum')
    drawFern(front, -210, 198, 0.9, 1)
    drawFern(front, 214, 198, 0.9, -1)
    drawMushroomCluster(front, -170, 202, 0.8)
    drawMushroomCluster(front, 176, 202, 0.7)
  }
}

function drawMenuPot(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(gameColors.woodDark, 1)
  g.fillRoundedRect(x - 12, y, 24, 16, 5)
  g.fillStyle(gameColors.dirt, 1)
  g.fillEllipse(x, y + 1, 20, 6)
  g.fillStyle(gameColors.leaf, 1)
  g.fillEllipse(x, y - 12, 18, 10)
  g.fillEllipse(x - 8, y - 8, 12, 7)
  g.fillStyle(gameColors.leafLight, 1)
  g.fillEllipse(x + 3, y - 16, 7, 4)
}
