import {
  displayTextStyle,
  type GameServices,
  getServices,
  onAppHidden,
  onLayoutChange,
  readViewport,
  type SfxName,
  type Viewport,
} from '@mg/core'
import { createRng, type Rng, randomSeed } from '@mg/core/rng'
import Phaser from 'phaser'
import { gameColors } from '../colors'
import { FRUIT_ORDER, FRUITS, PLOTS, REGISTER_POINT, SHELF_RECTS } from '../logic/config'
import {
  type PurchaseResult,
  plantedCount,
  purchaseStaff,
  purchaseTree,
  purchaseTreeAt,
  purchaseUpgrade,
  removeTree,
} from '../logic/purchase'
import { createShopState, stepShop, toSave } from '../logic/state'
import type { FruitKind, GameEvent, ShopState } from '../logic/types'
import { progressSave } from '../save'
import { createAnimalTextures } from '../ui/animalArt'
import { CoinPileView } from '../ui/CoinPileView'
import { CustomerView } from '../ui/CustomerView'
import { FruitPicker } from '../ui/FruitPicker'
import { coinTextureKey, createFruitTextures } from '../ui/fruitArt'
import { fullscreenActive, fullscreenSupported, toggleGameFullscreen } from '../ui/fullscreen'
import { Hud } from '../ui/Hud'
import { Joystick } from '../ui/Joystick'
import { computeGameLayout, type GameLayout, worldToScreen } from '../ui/layout'
import { MapOffers } from '../ui/MapOffers'
import { PauseOverlay } from '../ui/PauseOverlay'
import { PlayerView } from '../ui/PlayerView'
import { ShelfView } from '../ui/ShelfView'
import { ShopPanel } from '../ui/ShopPanel'
import { StaffStationView } from '../ui/StaffStationView'
import { StaffView } from '../ui/StaffView'
import { createShopBackground } from '../ui/shopArt'
import { Toast } from '../ui/Toast'
import { TreeView } from '../ui/TreeView'
import { TutorialOverlay } from '../ui/TutorialOverlay'

const STEP_MS = 1000 / 60
const SAVE_EVERY_MS = 5_000

const MOVE_KEY_CODES: ReadonlySet<string> = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'KeyA',
  'KeyW',
  'KeyD',
  'KeyS',
])

const MOVE_KEY_FALLBACKS: Readonly<Record<string, string>> = {
  arrowleft: 'ArrowLeft',
  arrowright: 'ArrowRight',
  arrowup: 'ArrowUp',
  arrowdown: 'ArrowDown',
  a: 'KeyA',
  w: 'KeyW',
  d: 'KeyD',
  s: 'KeyS',
}

function moveKeyCode(event: KeyboardEvent): string | null {
  if (MOVE_KEY_CODES.has(event.code)) return event.code
  return MOVE_KEY_FALLBACKS[event.key.toLowerCase()] ?? null
}

type Mode = 'playing' | 'paused' | 'shop' | 'countdown'

export class GameScene extends Phaser.Scene {
  private services!: GameServices
  private saveStore!: ReturnType<typeof progressSave>
  private state!: ShopState
  private rng!: Rng
  private layout!: GameLayout
  private backdrop!: Phaser.GameObjects.Graphics
  private world!: Phaser.GameObjects.Container
  private shelfViews!: Record<FruitKind, ShelfView>
  private treeViews: TreeView[] = []
  private playerView!: PlayerView
  private customerViews = new Map<number, CustomerView>()
  private staffViews = new Map<number, StaffView>()
  private staffStations!: Record<'cashier' | 'picker', StaffStationView>
  private coinPile!: CoinPileView
  private mapOffers?: MapOffers
  private fruitPicker?: FruitPicker
  private hud!: Hud
  private joystick!: Joystick
  private tutorial!: TutorialOverlay
  private toast!: Toast
  private mode: Mode = 'playing'
  private pauseOverlay?: PauseOverlay
  private shopPanel?: ShopPanel
  private countdownText?: Phaser.GameObjects.Text
  private countdownMs = 0
  private countdownShown = 0
  private accumulator = 0
  private saveTimer = 0
  private removeHidden?: () => void
  private readonly heldMoveKeys = new Set<string>()
  private inputCleanup?: () => void

  constructor() {
    super('Game')
  }

  create(): void {
    this.services = getServices()
    createAnimalTextures(this)
    createFruitTextures(this)
    this.saveStore = progressSave(this.services)
    this.state = createShopState(this.saveStore.read())
    const seed = Number(this.services.params.get('seed'))
    this.rng = createRng(Number.isFinite(seed) && seed > 0 ? seed : randomSeed())

    const viewport = readViewport(this)
    this.layout = computeGameLayout(viewport.width, viewport.height, viewport.insets)
    this.cameras.main.setBackgroundColor(gameColors.theme.bg)

    this.drawBackdrop()
    this.buildWorld()
    this.buildHudAndInput()
    if (this.services.debug) {
      ;(window as Window & { __animalMall?: unknown }).__animalMall = {
        getLayout: () => this.layout,
        getState: () => this.state,
      }
    }
    this.bindKeyboard()
    this.bindLifecycle()
    this.setPlaying()
  }

  update(time: number, delta: number): void {
    if (this.mode === 'playing' || this.mode === 'shop') {
      this.accumulator += Math.min(delta, 100)
      while (this.accumulator >= STEP_MS) {
        const result = stepShop(this.state, this.readInput(), this.rng, STEP_MS)
        this.state = result.state
        this.handleEvents(result.events)
        this.accumulator -= STEP_MS
      }
      this.saveTimer += delta
      if (this.saveTimer >= SAVE_EVERY_MS) {
        this.saveTimer = 0
        this.saveGame()
      }
    } else if (this.mode === 'countdown') {
      this.countdownMs -= delta
      const shown = Math.max(1, Math.ceil(this.countdownMs / 1000))
      if (shown !== this.countdownShown) {
        this.countdownShown = shown
        this.countdownText?.setText(String(shown))
      }
      if (this.countdownMs <= 0) this.finishCountdown()
    }

    const alpha = this.mode === 'playing' ? Math.min(1, this.accumulator / STEP_MS) : 1
    this.render(alpha, time)
  }

  private drawBackdrop(): void {
    const g = this.add.graphics().setDepth(-100)
    g.fillStyle(this.services.theme.bg, 1)
    g.fillRect(0, 0, this.layout.width, this.layout.height)
    g.fillStyle(this.services.theme.bgAlt, 1)
    g.fillRect(0, this.layout.height * 0.72, this.layout.width, this.layout.height * 0.28)
    g.fillStyle(0xffffff, 0.18)
    g.fillEllipse(this.layout.width * 0.12, this.layout.height * 0.12, 180, 48)
    g.fillEllipse(this.layout.width * 0.88, this.layout.height * 0.18, 220, 54)
    g.fillStyle(this.services.theme.accentAlt, 0.08)
    for (let index = 0; index < 7; index += 1) {
      g.fillCircle(this.layout.width * (0.08 + index * 0.14), this.layout.height * 0.9, 40)
    }
    this.backdrop = g
  }

  private buildWorld(): void {
    const { theme, i18n } = this.services
    this.world = this.add.container(this.layout.room.x, this.layout.room.y)
    this.world.setScale(this.layout.worldScale)

    const background = createShopBackground(this, theme, i18n.t('game.title'))
    background.setDepth(0)
    this.world.add(background)

    this.shelfViews = Object.fromEntries(
      FRUIT_ORDER.map((kind) => {
        const view = new ShelfView(this, theme, kind)
        const rect = SHELF_RECTS[kind]
        view.setDepth(rect.y + rect.h)
        this.world.add(view)
        return [kind, view]
      }),
    ) as Record<FruitKind, ShelfView>

    this.treeViews = PLOTS.map((plot) => {
      const view = new TreeView(this, theme, plot)
      view.setDepth(plot.y)
      this.world.add(view)
      return view
    })

    this.staffStations = {
      cashier: new StaffStationView(this, theme, 'cashier'),
      picker: new StaffStationView(this, theme, 'picker'),
    }
    this.staffStations.cashier.setDepth(520)
    this.staffStations.picker.setDepth(260)
    this.world.add(this.staffStations.cashier)
    this.world.add(this.staffStations.picker)

    this.coinPile = new CoinPileView(this, theme)
    this.world.add(this.coinPile)

    this.playerView = new PlayerView(this, theme)
    this.world.add(this.playerView)
    this.updateWorldViews()
  }

  private buildHudAndInput(): void {
    this.hud = new Hud(this, this.layout, this.services.theme, {
      onShop: () => this.openShop(),
      onPause: () => this.pauseGame(),
    })
    this.joystick = new Joystick(this)
    this.tutorial = new TutorialOverlay(this, this.layout, this.services.theme, this.services.i18n)
    this.toast = new Toast(this, this.layout, this.services.theme)
    this.mapOffers = new MapOffers(this, this.layout, this.services.theme)
    this.hud.update(this.state)
    this.syncCustomers(1, 0)
    this.syncStaff(1, 0)
  }

  private bindKeyboard(): void {
    const keyboard = this.input.keyboard
    if (keyboard === null) return
    const toggle = (): void => {
      if (this.mode === 'playing' || this.mode === 'shop') this.pauseGame()
      else if (this.mode === 'paused') this.resumeFromPause()
    }
    const escapeKey = (): void => {
      if (this.mode === 'shop') this.shopPanel?.close()
      else toggle()
    }
    keyboard.on('keydown-P', toggle)
    keyboard.on('keydown-ESC', escapeKey)

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const code = moveKeyCode(event)
      if (code !== null) this.heldMoveKeys.add(code)
    }
    const onKeyUp = (event: KeyboardEvent): void => {
      const code = moveKeyCode(event)
      if (code !== null) this.heldMoveKeys.delete(code)
    }
    const clear = (): void => this.resetMovementInput()

    // Capture-phase listeners update our own state even if another listener
    // prevents the event before Phaser's keyboard plugin sees it.
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('blur', clear)
    window.addEventListener('focus', clear)
    document.addEventListener('visibilitychange', clear)
    document.addEventListener('fullscreenchange', clear)

    this.inputCleanup = () => {
      keyboard.off('keydown-P', toggle)
      keyboard.off('keydown-ESC', escapeKey)
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
      window.removeEventListener('blur', clear)
      window.removeEventListener('focus', clear)
      document.removeEventListener('visibilitychange', clear)
      document.removeEventListener('fullscreenchange', clear)
    }
  }

  private bindLifecycle(): void {
    this.removeHidden = onAppHidden(() => {
      this.resetMovementInput()
      if (this.mode === 'playing' || this.mode === 'shop') this.pauseGame()
    })
    onLayoutChange(this, (viewport) => this.handleLayout(viewport))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdownScene())
  }

  private render(alpha: number, time: number): void {
    this.playerView.updatePlayer(this.state.player, alpha, time)
    this.playerView.setDepth(this.state.player.pos.y + 1)
    this.syncCustomers(alpha, time)
    this.syncStaff(alpha, time)
    this.updateWorldViews()
    this.hud.update(this.state)
    this.mapOffers?.update(this.state)
    this.coinPile.updatePile(this.state.pendingCoins)

    if (this.fruitPicker !== undefined && (this.state.player.moving || this.mode !== 'playing')) {
      this.closeFruitPicker()
    }

    const showTutorial = this.mode === 'playing'
    this.tutorial.setVisible(showTutorial)
    if (showTutorial) this.tutorial.update(this.state, time)

    if (this.mode === 'shop') this.shopPanel?.update(this.state)

    this.joystick.setEnabled(this.mode === 'playing')
    this.hud.setEnabled(this.mode === 'playing')
  }

  private syncCustomers(alpha: number, time: number): void {
    const alive = new Set<number>()
    for (const customer of this.state.customers) {
      alive.add(customer.id)
      let view = this.customerViews.get(customer.id)
      if (view === undefined) {
        view = new CustomerView(this, this.services.theme, customer.species)
        this.world.add(view)
        this.customerViews.set(customer.id, view)
      }
      view.updateCustomer(customer, alpha, time)
      view.setDepth(customer.pos.y + 2)
    }
    for (const [id, view] of this.customerViews) {
      if (alive.has(id)) continue
      view.destroy()
      this.customerViews.delete(id)
    }
  }

  private syncStaff(alpha: number, time: number): void {
    const alive = new Set<number>()
    for (const member of this.state.staffMembers) {
      alive.add(member.id)
      let view = this.staffViews.get(member.id)
      if (view === undefined) {
        view = new StaffView(this, this.services.theme, member)
        this.world.add(view)
        this.staffViews.set(member.id, view)
      }
      view.updateStaff(member, alpha, time)
      view.setDepth(member.pos.y + 2)
    }
    for (const [id, view] of this.staffViews) {
      if (alive.has(id)) continue
      view.destroy()
      this.staffViews.delete(id)
    }
  }

  private updateWorldViews(): void {
    for (const kind of FRUIT_ORDER) {
      this.shelfViews[kind].updateShelf(this.state.shelves[kind])
    }
    for (const plot of PLOTS) {
      const tree = this.state.trees.find((candidate) => candidate.plot === plot.index) ?? null
      const view = this.treeViews[plot.index]
      view?.updateTree(tree)
      view?.setDepth(tree?.pos.y ?? plot.y)
    }
    this.staffStations.cashier.updateStaffLevel(this.state.staff.cashier)
    this.staffStations.picker.updateStaffLevel(this.state.staff.picker)
  }

  private readInput(): { moveX: number; moveY: number } {
    const held = this.heldMoveKeys
    let x = 0
    let y = 0
    if (held.has('ArrowLeft') || held.has('KeyA')) x -= 1
    if (held.has('ArrowRight') || held.has('KeyD')) x += 1
    if (held.has('ArrowUp') || held.has('KeyW')) y -= 1
    if (held.has('ArrowDown') || held.has('KeyS')) y += 1

    // Keyboard direction wins over a drag so a stuck pointer can never cancel
    // the arrow keys.
    if (x !== 0 || y !== 0) {
      const magnitude = Math.hypot(x, y)
      return { moveX: x / magnitude, moveY: y / magnitude }
    }

    const stick = this.joystick.getVector()
    return { moveX: stick.x, moveY: stick.y }
  }

  private resetMovementInput(): void {
    this.heldMoveKeys.clear()
    this.joystick.reset()
  }

  private handleEvents(events: readonly GameEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case 'harvest':
          this.sfx('eat', 0.45)
          break
        case 'stock':
          this.sfx('turn', 0.35)
          break
        case 'scan':
          this.sfx('click', 0.45)
          if (this.state.pendingCoins > 0) this.coinToPile()
          else this.coinBurst(1)
          break
        case 'sale':
          this.saveGame()
          this.sfx('boost', 0.5)
          break
        case 'treeMature':
          this.sfx('start', 0.35)
          this.sparklePlot(event.plot)
          break
        case 'fruitReady':
          break
        case 'customerEnter':
          this.sfx('turn', 0.18)
          break
        case 'customerPick':
          this.sfx('eat', 0.2)
          break
        case 'customerMissed':
          break
        case 'customerLeave':
          if (event.sad) this.sfx('die', 0.25)
          break
        case 'treeBought':
          this.saveGame()
          this.showPurchaseToast(event.kind)
          break
        case 'treeRemoved':
          this.saveGame()
          this.toast.show(
            this.services.i18n.t('toast.treeRemoved', {
              name: this.services.i18n.t(`fruit.${event.kind}`),
              refund: Math.floor(FRUITS[event.kind].cost / 2),
            }),
          )
          break
        case 'upgradeBought':
          this.saveGame()
          this.sfx('start', 0.35)
          this.toast.show(
            this.services.i18n.t('toast.upgrade', {
              name: this.services.i18n.t(`tool.${event.kind}`),
            }),
          )
          break
        case 'staffBought':
          this.saveGame()
          this.sfx('start', 0.4)
          this.toast.show(
            this.services.i18n.t('toast.staff', {
              name: this.services.i18n.t(`staff.${event.kind}`),
            }),
          )
          break
        case 'deposit':
          this.saveGame()
          this.sfx('click', 0.5)
          this.toast.show(
            this.services.i18n.t('toast.deposit', {
              amount: event.amount,
              remaining: event.remaining,
            }),
          )
          break
        case 'quickBuyReady':
          if (this.mode === 'playing') this.openFruitPicker(event.plot)
          break
        case 'coinsPending':
          this.sfx('click', 0.35)
          break
        case 'coinsCollected':
          this.saveGame()
          this.coinBagSfx()
          this.coinCollectBurst(event.amount)
          break
        case 'staffHarvest':
          this.sfx('eat', 0.2)
          break
        case 'staffStock':
          this.sfx('turn', 0.18)
          break
        case 'tutorial':
          if (event.step === 'done') {
            this.toast.show(this.services.i18n.t('toast.firstSale'))
            this.services.platform.happyTime()
          }
          break
      }
    }
  }

  private showPurchaseToast(kind: FruitKind): void {
    const count = plantedCount(this.state, kind)
    const name = this.services.i18n.t(`fruit.${kind}`)
    if (count === 1 && kind !== 'apple') {
      this.toast.show(this.services.i18n.t('toast.newFruit', { name }))
      this.services.platform.happyTime()
    } else {
      this.toast.show(this.services.i18n.t('toast.treePlanted', { name }))
      if (count === 1) this.services.platform.happyTime()
    }
  }

  private openFruitPicker(plot: number): void {
    this.closeFruitPicker()
    this.fruitPicker = new FruitPicker({
      scene: this,
      layout: this.layout,
      theme: this.services.theme,
      state: this.state,
      plot,
      onSelect: (kind) => this.chooseFruit(kind, plot),
      onClose: () => this.closeFruitPicker(),
    })
  }

  private chooseFruit(kind: FruitKind, plot: number): void {
    const outcome = purchaseTreeAt(this.state, kind, plot, true)
    if (outcome.result === 'ok' || outcome.result === 'deposited') {
      this.state = outcome.state
      this.handleEvents(outcome.events)
      this.saveGame()
      this.updateWorldViews()
      this.hud.update(this.state)
      this.closeFruitPicker()
      return
    }
    if (outcome.result === 'locked') this.toast.show(this.services.i18n.t('toast.locked'))
    else if (outcome.result === 'insufficient') {
      this.toast.show(this.services.i18n.t('toast.notEnough'))
    }
  }

  private closeFruitPicker(): void {
    this.fruitPicker?.destroy()
    this.fruitPicker = undefined
  }

  private coinBagSfx(): void {
    this.services.audio.play('turn', { gain: 0.4 })
    this.services.audio.play('boost', { gain: 0.24, pitch: 0.8 })
    for (let index = 0; index < 4; index += 1) {
      this.time.delayedCall(35 + index * 55, () => {
        this.services.audio.play('click', { gain: 0.32, pitch: 1.55 + index * 0.08 })
      })
    }
  }

  private coinCollectBurst(amount: number): void {
    const from = worldToScreen(this.layout, REGISTER_POINT)
    const to = this.layout.hud.coins
    const count = Math.min(6, Math.max(1, Math.ceil(amount / 4)))
    for (let index = 0; index < count; index += 1) {
      const coin = this.add
        .image(from.x + (index - count / 2) * 6, from.y - 10, coinTextureKey())
        .setScale(0.5)
        .setDepth(6500)
      this.tweens.add({
        targets: coin,
        x: to.x,
        y: to.y,
        alpha: 0.2,
        scale: 0.8,
        delay: index * 40,
        duration: 460,
        ease: 'Cubic.easeIn',
        onComplete: () => coin.destroy(),
      })
    }
    this.hud.pulseCoin()
  }

  private coinToPile(): void {
    const from = worldToScreen(this.layout, REGISTER_POINT)
    const to = worldToScreen(this.layout, { x: 550, y: 508 })
    const coin = this.add
      .image(from.x, from.y - 10, coinTextureKey())
      .setScale(0.5)
      .setDepth(6500)
    this.tweens.add({
      targets: coin,
      x: to.x,
      y: to.y - 10,
      duration: 260,
      ease: 'Quad.easeIn',
      onComplete: () => coin.destroy(),
    })
  }

  private coinBurst(amount: number): void {
    const point = worldToScreen(this.layout, REGISTER_POINT)
    for (let index = 0; index < Math.min(3, amount); index += 1) {
      const coin = this.add
        .image(point.x + (index - 1) * 8, point.y - 8, coinTextureKey())
        .setScale(0.55)
        .setDepth(6500)
      this.tweens.add({
        targets: coin,
        y: point.y - 56,
        alpha: 0,
        duration: 520 + index * 80,
        ease: 'Cubic.easeOut',
        onComplete: () => coin.destroy(),
      })
    }
  }

  private sparklePlot(plot: number): void {
    const target = PLOTS[plot]
    if (target === undefined) return
    const point = worldToScreen(this.layout, target)
    for (let index = 0; index < 5; index += 1) {
      const dot = this.add.circle(point.x, point.y - 20, 3, 0xffd166, 0.9).setDepth(6400)
      const angle = (Math.PI * 2 * index) / 5
      this.tweens.add({
        targets: dot,
        x: point.x + Math.cos(angle) * 26,
        y: point.y - 20 + Math.sin(angle) * 26,
        alpha: 0,
        duration: 480,
        onComplete: () => dot.destroy(),
      })
    }
  }

  private sfx(name: SfxName, gain = 1): void {
    this.services.audio.play(name, { gain })
  }

  private saveGame(): void {
    this.saveStore.write(toSave(this.state))
  }

  private openShop(): void {
    if (this.mode === 'paused') {
      this.pauseOverlay?.destroy()
      this.pauseOverlay = undefined
    } else if (this.mode !== 'playing') {
      return
    }
    this.resetMovementInput()
    this.closeFruitPicker()
    this.mode = 'shop'
    this.hud.setEnabled(false)
    this.joystick.setEnabled(false)
    this.tutorial.setVisible(false)
    this.services.platform.gameplayStart()
    this.saveGame()
    this.showShopPanel()
  }

  private showShopPanel(): void {
    this.shopPanel = new ShopPanel({
      scene: this,
      layout: this.layout,
      theme: this.services.theme,
      i18n: this.services.i18n,
      state: this.state,
      onPlant: (kind) => {
        const outcome = purchaseTree(this.state, kind)
        if (outcome.result !== 'ok') {
          this.showPurchaseFailure(outcome.result)
          return this.state
        }
        this.state = outcome.state
        this.handleEvents(outcome.events)
        this.saveGame()
        this.updateWorldViews()
        this.hud.update(this.state)
        return this.state
      },
      onUpgrade: (kind) => {
        const outcome = purchaseUpgrade(this.state, kind)
        if (outcome.result !== 'ok') {
          this.showPurchaseFailure(outcome.result)
          return this.state
        }
        this.state = outcome.state
        this.handleEvents(outcome.events)
        this.saveGame()
        this.updateWorldViews()
        this.hud.update(this.state)
        return this.state
      },
      onStaff: (kind) => {
        const outcome = purchaseStaff(this.state, kind, false)
        if (outcome.result !== 'ok') {
          this.showPurchaseFailure(outcome.result)
          return this.state
        }
        this.state = outcome.state
        this.handleEvents(outcome.events)
        this.saveGame()
        this.updateWorldViews()
        this.hud.update(this.state)
        return this.state
      },
      onRemove: (plot) => {
        const outcome = removeTree(this.state, plot)
        if (outcome.result !== 'ok') {
          this.showPurchaseFailure(outcome.result)
          return this.state
        }
        this.state = outcome.state
        this.handleEvents(outcome.events)
        this.saveGame()
        this.updateWorldViews()
        this.hud.update(this.state)
        return this.state
      },
      onClose: () => {
        this.shopPanel = undefined
        this.setPlaying()
      },
    })
  }

  private showPurchaseFailure(result: PurchaseResult): void {
    if (result === 'noPlot') this.toast.show(this.services.i18n.t('toast.noPlot'))
    else if (result === 'insufficient') this.toast.show(this.services.i18n.t('toast.notEnough'))
    else if (result === 'maxed') this.toast.show(this.services.i18n.t('toast.max'))
    else if (result === 'locked') this.toast.show(this.services.i18n.t('toast.locked'))
    else if (result === 'lastTree') this.toast.show(this.services.i18n.t('toast.lastTree'))
  }

  private pauseGame(): void {
    if (this.mode !== 'playing' && this.mode !== 'shop') return
    this.resetMovementInput()
    this.closeFruitPicker()
    this.shopPanel?.destroy()
    this.shopPanel = undefined
    this.mode = 'paused'
    this.hud.setEnabled(false)
    this.joystick.setEnabled(false)
    this.tutorial.setVisible(false)
    this.services.platform.gameplayStop()
    this.saveGame()
    this.showPauseOverlay()
  }

  private showPauseOverlay(): void {
    this.pauseOverlay = new PauseOverlay({
      scene: this,
      layout: this.layout,
      theme: this.services.theme,
      i18n: this.services.i18n,
      soundEnabled: this.services.settings.value.sound,
      fullscreenActive: fullscreenActive(),
      fullscreenAvailable: fullscreenSupported(this.scale),
      onResume: () => this.resumeFromPause(),
      onShop: () => this.openShop(),
      onMenu: () => {
        this.saveGame()
        this.scene.start('Menu')
      },
      onToggleSound: () => {
        const enabled = !this.services.settings.value.sound
        this.services.setSound(enabled)
        this.sfx('click')
        return enabled
      },
      onToggleFullscreen: () => {
        toggleGameFullscreen(this.scale)
        this.time.delayedCall(100, () => {
          this.pauseOverlay?.setFullscreen(fullscreenActive())
        })
      },
    })
  }

  private resumeFromPause(): void {
    if (this.mode !== 'paused') return
    this.pauseOverlay?.destroy()
    this.pauseOverlay = undefined
    this.beginResume()
  }

  private beginResume(): void {
    if (this.mode === 'countdown') return
    this.resetMovementInput()
    this.mode = 'countdown'
    this.countdownMs = 3_000
    this.countdownShown = 3
    this.hud.setEnabled(false)
    this.joystick.setEnabled(false)
    this.tutorial.setVisible(false)
    this.services.platform.gameplayStop()
    this.countdownText?.destroy()
    this.countdownText = this.add
      .text(
        this.layout.width / 2,
        this.layout.height / 2,
        '3',
        displayTextStyle(this.services.theme, 78, this.services.theme.text, true, 4, 4),
      )
      .setOrigin(0.5)
      .setDepth(7500)
  }

  private finishCountdown(): void {
    this.countdownText?.destroy()
    this.countdownText = undefined
    this.setPlaying()
  }

  private setPlaying(): void {
    this.resetMovementInput()
    this.mode = 'playing'
    this.accumulator = 0
    this.hud.setEnabled(true)
    this.joystick.setEnabled(true)
    this.tutorial.setVisible(true)
    this.services.platform.gameplayStart()
  }

  private handleLayout(viewport: Viewport): void {
    const next = computeGameLayout(viewport.width, viewport.height, viewport.insets)
    if (
      next.width === this.layout.width &&
      next.height === this.layout.height &&
      next.portrait === this.layout.portrait
    ) {
      return
    }
    const previousMode = this.mode
    const orientationChanged = next.portrait !== this.layout.portrait

    this.destroyFloatingUi()
    this.layout = next
    this.applyWorldLayout()
    this.tutorial = new TutorialOverlay(this, this.layout, this.services.theme, this.services.i18n)
    this.toast = new Toast(this, this.layout, this.services.theme)
    this.mapOffers = new MapOffers(this, this.layout, this.services.theme)

    if (previousMode === 'playing' && orientationChanged) {
      this.pauseGame()
    } else if (previousMode === 'paused') {
      this.showPauseOverlay()
    } else if (previousMode === 'shop') {
      this.showShopPanel()
    } else if (previousMode === 'countdown') {
      this.countdownText?.destroy()
      this.countdownText = this.add
        .text(
          this.layout.width / 2,
          this.layout.height / 2,
          String(this.countdownShown),
          displayTextStyle(this.services.theme, 78, this.services.theme.text, true, 4, 4),
        )
        .setOrigin(0.5)
        .setDepth(7500)
    }
  }

  private applyWorldLayout(): void {
    this.backdrop.destroy()
    this.drawBackdrop()
    this.world.setPosition(this.layout.room.x, this.layout.room.y)
    this.world.setScale(this.layout.worldScale)
    this.hud.relayout(this.layout)
    this.joystick.reset()
  }

  private destroyFloatingUi(): void {
    this.pauseOverlay?.destroy()
    this.pauseOverlay = undefined
    this.shopPanel?.destroy()
    this.shopPanel = undefined
    this.closeFruitPicker()
    this.mapOffers?.destroy()
    this.mapOffers = undefined
    this.tutorial?.destroy()
    this.toast?.destroy()
    this.countdownText?.destroy()
    this.countdownText = undefined
  }

  private shutdownScene(): void {
    this.saveGame()
    this.removeHidden?.()
    this.inputCleanup?.()
    this.joystick?.destroy()
    this.destroyFloatingUi()
  }
}
