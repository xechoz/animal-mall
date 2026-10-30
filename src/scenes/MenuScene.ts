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
import { createAnimalTextures, playerTextureKey } from '../ui/animalArt'
import { createFruitTextures, fruitTextureKey } from '../ui/fruitArt'
import {
  fullscreenActive,
  fullscreenHint,
  fullscreenSupported,
  requestGameFullscreen,
  toggleGameFullscreen,
} from '../ui/fullscreen'
import { LanguageModal } from '../ui/LanguageModal'
import { computeGameLayout } from '../ui/layout'
import { RoundButton } from '../ui/RoundButton'
import { SettingsModal } from '../ui/SettingsModal'

export class MenuScene extends Phaser.Scene {
  private services!: GameServices
  private settingsModal?: SettingsModal
  private languageModal?: LanguageModal
  private startButton?: Button
  private restarting = false

  constructor() {
    super('Menu')
  }

  create(): void {
    this.restarting = false
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

    this.drawBackdrop(width, height)
    this.drawShopfront(width, height, portrait)

    const titleY = insets.top + (portrait ? 130 : 82)
    this.add
      .text(
        width / 2,
        titleY,
        i18n.t('game.title'),
        displayTextStyle(theme, 48, theme.text, true, 4, 4),
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
        width: Math.min(330, width - 80),
        height: 62,
        fontSize: 24,
        variant: 'primary',
        onClick: () => this.startGame(),
      },
    )
    this.startButton.setDepth(30)

    this.add
      .text(
        width / 2,
        startY + 78,
        i18n.t('menu.stats', {
          coins: save.coins,
          trees: save.trees.length,
          served: save.served,
        }),
        textStyle(theme, 15, theme.textMuted, true),
      )
      .setOrigin(0.5)
      .setDepth(20)

    const hint = fullscreenHint(this.scale)
    if (hint !== null) {
      this.add
        .text(
          width / 2,
          height - insets.bottom - 24,
          i18n.t(hint),
          textStyle(theme, 12, theme.textMuted),
        )
        .setOrigin(0.5)
        .setDepth(20)
    }

    const settingsButton = new RoundButton(this, width - insets.right - 42, insets.top + 42, {
      icon: 'soundOn',
      theme,
      variant: 'soft',
      onClick: () => this.openSettings(),
    })
    settingsButton.setDepth(40)
    const languageButton = new RoundButton(this, width - insets.right - 104, insets.top + 42, {
      icon: 'globe',
      theme,
      variant: 'soft',
      onClick: () => this.openLanguage(),
    })
    languageButton.setDepth(40)

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this)
    })
  }

  private startGame(): void {
    requestGameFullscreen(this.scale)
    this.scene.start('Game')
  }

  private openSettings(): void {
    if (this.settingsModal !== undefined || this.languageModal !== undefined) return
    const viewport = readViewport(this)
    const layout = computeGameLayout(viewport.width, viewport.height, viewport.insets)
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
      onClose: () => {
        this.settingsModal = undefined
      },
    })
  }

  private openLanguage(): void {
    if (this.languageModal !== undefined || this.settingsModal !== undefined) return
    const viewport = readViewport(this)
    const layout = computeGameLayout(viewport.width, viewport.height, viewport.insets)
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
    if (this.restarting) return
    this.restarting = true
    this.scene.restart()
  }

  private drawBackdrop(width: number, height: number): void {
    const g = this.add.graphics().setDepth(0)
    g.fillStyle(gameColors.theme.bg, 1)
    g.fillRect(0, 0, width, height)
    g.fillStyle(gameColors.sky, 0.55)
    g.fillRect(0, 0, width, height * 0.42)
    g.fillStyle(0xffffff, 0.28)
    g.fillEllipse(width * 0.18, height * 0.16, 180, 52)
    g.fillEllipse(width * 0.27, height * 0.13, 120, 38)
    g.fillEllipse(width * 0.78, height * 0.2, 200, 50)
    g.fillStyle(0xfff3b0, 0.8)
    g.fillCircle(width * 0.86, height * 0.1, 34)
    g.fillStyle(0xf2cf9e, 1)
    g.fillRect(0, height * 0.76, width, height * 0.24)
    g.fillStyle(0xe4bd86, 1)
    for (let x = 0; x < width; x += 80) {
      g.fillEllipse(x + 40, height * 0.82 + (x % 160 === 0 ? 10 : 0), 40, 10)
    }
    g.fillStyle(0xffffff, 0.12)
    for (let index = 0; index < 6; index += 1) {
      g.fillCircle(width * 0.1 + index * width * 0.15, height * 0.3, 3)
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

    // Ground shadow.
    g.fillStyle(0x3b2f3a, 0.13)
    g.fillEllipse(0, 176, 560, 36)

    // Trees.
    drawMenuTree(g, -300, 120)
    drawMenuTree(g, 300, 120)

    // Main building.
    g.fillStyle(0x3b2f3a, 0.16)
    g.fillRoundedRect(-256, -86, 512, 264, 22)
    g.fillStyle(gameColors.cream, 1)
    g.fillRoundedRect(-260, -96, 520, 264, 22)
    g.fillStyle(gameColors.wall, 1)
    g.fillRoundedRect(-246, -82, 492, 236, 14)

    // Awning.
    for (let index = 0; index < 14; index += 1) {
      g.fillStyle(index % 2 === 0 ? gameColors.coral : gameColors.cream, 1)
      g.fillRoundedRect(-248 + index * 36, -108, 36, 26, 4)
    }
    g.fillStyle(0x3b2f3a, 0.16)
    g.fillRoundedRect(-246, -82, 492, 6, 3)

    // Sign.
    g.fillStyle(gameColors.woodDark, 1)
    g.fillRoundedRect(-150, -174, 300, 54, 14)
    g.fillStyle(gameColors.woodLight, 1)
    g.fillRoundedRect(-145, -170, 290, 46, 11)
    for (const [index, kind] of (['apple', 'pear', 'peach'] as const).entries()) {
      shop.add(this.add.image(-52 + index * 52, -147, fruitTextureKey(kind)).setScale(0.8))
    }

    // Windows with fruit shelves.
    for (const x of [-148, 148]) {
      g.fillStyle(0x3b2f3a, 0.7)
      g.fillRoundedRect(x - 72, -62, 144, 92, 12)
      g.fillStyle(0xfff3dd, 1)
      g.fillRoundedRect(x - 68, -58, 136, 84, 9)
      g.fillStyle(gameColors.wood, 1)
      g.fillRoundedRect(x - 58, -4, 116, 8, 4)
      g.fillRoundedRect(x - 58, 28, 116, 8, 4)
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

    // Door.
    g.fillStyle(0x3b2f3a, 0.55)
    g.fillRoundedRect(-44, -18, 88, 142, 12)
    g.fillStyle(gameColors.wood, 1)
    g.fillRoundedRect(-38, -14, 76, 138, 9)
    g.fillStyle(gameColors.woodDark, 1)
    g.fillRoundedRect(-28, -4, 56, 62, 6)
    g.fillStyle(0xfff3dd, 0.8)
    g.fillCircle(26, 58, 4)
    g.fillStyle(gameColors.coral, 1)
    g.fillRoundedRect(-24, -60, 48, 22, 6)
    shop.add(
      this.add
        .text(0, -49, i18n.t('menu.openSign'), textStyle(theme, 10, '#fff7e8', true))
        .setOrigin(0.5),
    )

    // Step.
    g.fillStyle(0xe4bd86, 1)
    g.fillRoundedRect(-84, 126, 168, 24, 8)
    g.fillStyle(0xf2cf9e, 1)
    g.fillRoundedRect(-76, 122, 152, 18, 7)

    // Waving shopkeeper and neighbors.
    const player = this.add.image(-12, 132, playerTextureKey()).setOrigin(0.5, 0.9).setScale(0.9)
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
  }
}

function drawMenuTree(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x3b2f3a, 0.14)
  g.fillEllipse(x, y + 40, 92, 20)
  g.fillStyle(gameColors.woodDark, 1)
  g.fillRoundedRect(x - 24, y + 8, 48, 30, 7)
  g.fillStyle(gameColors.dirt, 1)
  g.fillEllipse(x, y + 8, 40, 10)
  g.fillStyle(gameColors.woodDark, 1)
  g.fillRoundedRect(x - 6, y - 42, 12, 48, 5)
  g.fillStyle(gameColors.leafDark, 1)
  g.fillCircle(x - 36, y - 36, 32)
  g.fillCircle(x + 36, y - 34, 30)
  g.fillCircle(x, y - 58, 38)
  g.fillStyle(gameColors.leaf, 1)
  g.fillCircle(x - 30, y - 42, 26)
  g.fillCircle(x + 30, y - 40, 23)
  g.fillCircle(x, y - 64, 30)
  g.fillStyle(gameColors.leafLight, 1)
  g.fillCircle(x - 16, y - 70, 16)
  g.fillCircle(x + 16, y - 62, 11)
  g.fillStyle(0xe85a4f, 1)
  g.fillCircle(x - 22, y - 44, 5)
  g.fillCircle(x + 24, y - 50, 5)
  g.fillCircle(x + 4, y - 76, 5)
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
