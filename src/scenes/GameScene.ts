import {
  displayTextStyle,
  type GameServices,
  getServices,
  isMobileDevice,
  onAppHidden,
  onLayoutChange,
  readViewport,
  type SfxName,
  type Viewport,
} from '@mg/core'
import { createRng, type Rng, randomSeed } from '@mg/core/rng'
import Phaser from 'phaser'
import { playDrinkSfx } from '../audio/drinkSfx'
import { startMusic } from '../audio/music'
import { gameColors } from '../colors'
import { carriedKinds } from '../logic/carry'
import { distance } from '../logic/collision'
import {
  DRINK_RADIUS,
  DRINKS,
  INTERACT,
  isAnimalProductKind,
  isPlantKind,
  isProcessedKind,
  PLOT_SIZE,
  producerCost,
  REST,
  ZONE_ORDER,
  zoneOf,
} from '../logic/config'
import { nearestRestingStaff, purchaseDrink } from '../logic/facilities'
import { feedSpace } from '../logic/production'
import {
  type PurchaseOutcome,
  type PurchaseResult,
  plantedCount,
  purchasePlant,
  purchasePlantAt,
  purchaseProducer,
  purchaseStaff,
  purchaseUpgrade,
  purchaseZone,
  removeProducer,
  replacePlantAt,
  slotPlantDeposit,
} from '../logic/purchase'
import { urgeStaff } from '../logic/staff'
import { createShopState, remapShopState, stepShop, stockReach, toSave } from '../logic/state'
import type {
  DrinkKind,
  GameEvent,
  PlantKind,
  ProducerState,
  ProductKind,
  ShopState,
  ZoneId,
} from '../logic/types'
import { progressSave } from '../save'
import { createAnimalTextures } from '../ui/animalArt'
import { BuffBar } from '../ui/BuffBar'
import { CoinPileView } from '../ui/CoinPileView'
import { CustomerView } from '../ui/CustomerView'
import { DevPanel } from '../ui/DevPanel'
import { DrinkPicker } from '../ui/DrinkPicker'
import { FacilityOverlay } from '../ui/FacilityOverlay'
import { FacilityView } from '../ui/FacilityView'
import { FishingView } from '../ui/FishingView'
import { coinTextureKey } from '../ui/fruitArt'
import { Hud } from '../ui/Hud'
import { Joystick } from '../ui/Joystick'
import { computeGameLayout, type GameLayout, worldToScreen } from '../ui/layout'
import { MapOffers } from '../ui/MapOffers'
import { PauseOverlay } from '../ui/PauseOverlay'
import { PlantPicker } from '../ui/PlantPicker'
import { PlayerView } from '../ui/PlayerView'
import { ProducerView } from '../ui/ProducerView'
import { createProductTextures, productTextureKey } from '../ui/productArt'
import { ShelfView } from '../ui/ShelfView'
import { ShopPanel } from '../ui/ShopPanel'
import { StaffStationView } from '../ui/StaffStationView'
import { StaffView } from '../ui/StaffView'
import { readCssShortSide } from '../ui/scale'
import { createShopBackground } from '../ui/shopArt'
import { Toast } from '../ui/Toast'
import { TutorialOverlay } from '../ui/TutorialOverlay'
import { ZoneOverlay } from '../ui/ZoneOverlay'

const STEP_MS = 1000 / 60
const SAVE_EVERY_MS = 5_000
/** Hold this long on a planted bed to open the crop swap chooser. */
const BED_HOLD_MS = 420

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
  private shelfViews!: Record<ZoneId, ShelfView>
  private producerViews = new Map<number, ProducerView>()
  private playerView!: PlayerView
  private customerViews = new Map<number, CustomerView>()
  private staffViews = new Map<number, StaffView>()
  private staffStations!: Record<'cashier' | 'picker', StaffStationView>
  private zoneOverlay!: ZoneOverlay
  private coinPile!: CoinPileView
  private fishingView!: FishingView
  private trashView!: FacilityView
  private vendingView!: FacilityView
  private facilityOverlay!: FacilityOverlay
  private buffBar!: BuffBar
  private mapOffers?: MapOffers
  private bedHits: Phaser.GameObjects.Zone[] = []
  private bedPress?: {
    readonly zone: 'fruit' | 'veg'
    readonly slot: number
    readonly timer: Phaser.Time.TimerEvent
    fired: boolean
  }
  private plantPicker?: PlantPicker
  private drinkPicker?: DrinkPicker
  private devPanel?: DevPanel
  private pendingDrink = false
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
  /**
   * Fullscreen requests and the first frame of a scene start can emit a window
   * blur. Ignore auto-pause for a moment so tapping "Open Shop" never lands on
   * the pause card.
   */
  private suppressAutoPauseUntil = 0
  private removeHidden?: () => void
  private readonly heldMoveKeys = new Set<string>()
  private inputCleanup?: () => void
  private readonly announcedProducts = new Set<ProductKind>()
  private readonly hungryNotified = new Set<number>()

  constructor() {
    super('Game')
  }

  create(): void {
    this.services = getServices()
    this.suppressAutoPauseUntil = performance.now() + 1_200
    startMusic(this)
    createAnimalTextures(this)
    createProductTextures(this)
    this.saveStore = progressSave(this.services)
    const viewport = readViewport(this)
    this.layout = computeGameLayout(viewport.width, viewport.height, viewport.insets, {
      mobile: isMobileDevice(),
      cssShortSide: readCssShortSide(this),
    })
    this.state = createShopState(this.saveStore.read(), this.layout.map)
    const seed = Number(this.services.params.get('seed'))
    this.rng = createRng(Number.isFinite(seed) && seed > 0 ? seed : randomSeed())

    this.cameras.main.setBackgroundColor(gameColors.theme.bg)

    this.drawBackdrop()
    this.buildWorld()
    this.buildHudAndInput()
    if (this.services.debug) {
      ;(window as Window & { __animalMall?: unknown }).__animalMall = {
        getLayout: () => this.layout,
        getState: () => this.state,
        getScene: () => this,
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
    this.bedHits = []
    this.bedPress = undefined
    this.world = this.add.container(this.layout.room.x, this.layout.room.y)
    this.world.setScale(this.layout.worldScale)

    const labels: Record<ZoneId, string> = {
      fruit: i18n.t('zone.fruit'),
      veg: i18n.t('zone.veg'),
      farm: i18n.t('zone.farm'),
      kitchen: i18n.t('zone.kitchen'),
    }
    const background = createShopBackground(
      this,
      theme,
      i18n.t('game.title'),
      labels,
      this.layout.map,
      this.layout.worldText,
    )
    background.setDepth(0)
    this.world.add(background)

    this.zoneOverlay = new ZoneOverlay(this, theme, this.layout.map)
    this.zoneOverlay.setDepth(50)
    this.world.add(this.zoneOverlay)

    this.trashView = new FacilityView(
      this,
      theme,
      'trash',
      this.layout.map,
      '',
      this.layout.worldText,
    )
    this.vendingView = new FacilityView(
      this,
      theme,
      'vending',
      this.layout.map,
      i18n.t('facility.drinks'),
      this.layout.worldText,
    )
    this.world.add(this.trashView)
    this.world.add(this.vendingView)

    this.shelfViews = Object.fromEntries(
      ZONE_ORDER.map((zone) => {
        const view = new ShelfView(this, theme, zone, this.layout.map, this.layout.worldText)
        const rect = this.layout.map.shelves[zone]
        view.setDepth(rect.y + rect.h)
        this.world.add(view)
        return [zone, view]
      }),
    ) as Record<ZoneId, ShelfView>

    this.staffStations = {
      cashier: new StaffStationView(this, theme, 'cashier', this.layout.map),
      picker: new StaffStationView(this, theme, 'picker', this.layout.map),
    }
    this.staffStations.cashier.setDepth(this.layout.map.staffStations.cashier.station.y + 26)
    this.staffStations.picker.setDepth(this.layout.map.staffStations.picker.station.y + 26)
    this.world.add(this.staffStations.cashier)
    this.world.add(this.staffStations.picker)

    this.coinPile = new CoinPileView(this, theme, this.layout.map)
    this.world.add(this.coinPile)
    this.fishingView = new FishingView(this, theme)
    this.world.add(this.fishingView)

    this.playerView = new PlayerView(this, theme)
    this.world.add(this.playerView)
    this.buildBedHits()
    this.updateWorldViews()
  }

  /**
   * Each bed is tappable. A short tap opens the chooser on an empty bed, while
   * holding the finger down opens the swap chooser on a planted one. This is
   * the touch-friendly twin of the half-second dwell.
   */
  private buildBedHits(): void {
    for (const zone of ['fruit', 'veg'] as const) {
      for (const plot of this.layout.map.plantSlots[zone]) {
        const hit = this.add
          .zone(plot.x, plot.y, PLOT_SIZE.w, PLOT_SIZE.h + 12)
          .setInteractive({ useHandCursor: true })
        hit.on('pointerdown', () => this.beginBedPress(zone, plot.index))
        hit.on('pointerup', () => this.endBedPress(zone, plot.index))
        hit.on('pointerout', () => this.cancelBedPress(zone, plot.index))
        this.bedHits.push(hit)
        this.world.add(hit)
      }
    }
  }

  private beginBedPress(zone: 'fruit' | 'veg', slot: number): void {
    this.cancelBedPress(zone, slot)
    const timer = this.time.delayedCall(BED_HOLD_MS, () => {
      if (this.bedPress?.timer !== timer) return
      this.bedPress.fired = true
      this.tryOpenBed(zone, slot)
    })
    this.bedPress = { zone, slot, timer, fired: false }
  }

  private endBedPress(zone: 'fruit' | 'veg', slot: number): void {
    const press = this.bedPress
    this.bedPress = undefined
    if (press === undefined || press.zone !== zone || press.slot !== slot) return
    press.timer.remove()
    if (press.fired) return
    // A short tap only plants. Replacing a crop needs the hold (or the dwell),
    // so a stray tap while harvesting never opens a paid chooser.
    if (this.bedProducer(zone, slot) !== undefined) return
    this.tryOpenBed(zone, slot)
  }

  private cancelBedPress(zone: 'fruit' | 'veg', slot: number): void {
    if (this.bedPress?.zone !== zone || this.bedPress.slot !== slot) return
    this.bedPress.timer.remove()
    this.bedPress = undefined
  }

  private bedProducer(zone: 'fruit' | 'veg', slot: number): ProducerState | undefined {
    return this.state.producers.find(
      (producer) =>
        isPlantKind(producer.product) &&
        zoneOf(producer.product) === zone &&
        producer.slot === slot,
    )
  }

  private tryOpenBed(zone: 'fruit' | 'veg', slot: number): void {
    if (this.mode !== 'playing') return
    if (this.plantPicker !== undefined || this.drinkPicker !== undefined) return
    if (this.devPanel !== undefined) return
    if (!this.state.zones[zone]) return
    const planted = this.bedProducer(zone, slot)
    // A bed that already holds a partial payment keeps its dwell-to-pay flow;
    // opening the full chooser here would offer crops the deposit cannot buy.
    if (planted === undefined && slotPlantDeposit(this.state, zone, slot) !== null) return
    this.openPlantPicker(zone, slot)
  }

  private buildHudAndInput(): void {
    const devEnabled = import.meta.env.DEV || this.services.debug
    this.hud = new Hud(this, this.layout, this.services.theme, this.services.i18n, {
      onShop: () => this.openShop(),
      onPause: () => this.pauseGame(),
      ...(devEnabled ? { onDev: () => this.openDevPanel() } : {}),
    })
    this.joystick = new Joystick(this)
    this.tutorial = new TutorialOverlay(this, this.layout, this.services.theme, this.services.i18n)
    this.toast = new Toast(this, this.layout, this.services.theme)
    this.mapOffers = new MapOffers(this, this.layout, this.services.theme, (zone, slot) =>
      this.tryOpenBed(zone, slot),
    )
    this.buffBar = new BuffBar(this, this.layout, this.services.theme, this.services.i18n)
    this.facilityOverlay = new FacilityOverlay(
      this,
      this.layout,
      this.services.theme,
      this.services.i18n,
      { onNudge: () => this.nudgeStaff() },
    )
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
      if (this.devPanel !== undefined) this.closeDevPanel()
      else if (this.drinkPicker !== undefined) this.closeDrinkPicker()
      else if (this.mode === 'shop') this.shopPanel?.close()
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
      if (performance.now() < this.suppressAutoPauseUntil) return
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
    this.fishingView.updateFishing(this.state, time)
    // Container children ignore depth, so sort by the depth values refreshed
    // above to keep actors and scenery layered by their footprint.
    this.world.sort('depth')
    this.hud.update(this.state)
    this.mapOffers?.update(this.state)
    this.coinPile.updatePile(this.state.pendingCoins)
    this.buffBar.update(this.state.buffs)
    this.drinkPicker?.update(this.state)
    this.devPanel?.update(this.state)

    if (this.plantPicker !== undefined && (this.state.player.moving || this.mode !== 'playing')) {
      this.closePlantPicker()
    }
    if (this.pendingDrink) {
      if (this.canOpenDrinkPicker()) {
        this.pendingDrink = false
        this.openDrinkPicker()
      } else if (
        this.mode === 'playing' &&
        distance(this.state.player.pos, this.state.map.facilities.vendingUse) > DRINK_RADIUS
      ) {
        this.pendingDrink = false
      }
    }

    const showTutorial =
      this.mode === 'playing' && this.drinkPicker === undefined && this.devPanel === undefined
    this.tutorial.setVisible(showTutorial)
    if (showTutorial) this.tutorial.update(this.state, time)

    const overlayEnabled =
      this.mode === 'playing' &&
      this.plantPicker === undefined &&
      this.drinkPicker === undefined &&
      this.devPanel === undefined
    this.facilityOverlay.update(this.state, overlayEnabled)

    if (this.mode === 'shop') this.shopPanel?.update(this.state)

    const inputEnabled =
      this.mode === 'playing' && this.drinkPicker === undefined && this.devPanel === undefined
    this.joystick.setEnabled(inputEnabled)
    this.hud.setEnabled(inputEnabled)
  }

  private syncCustomers(alpha: number, time: number): void {
    const alive = new Set<number>()
    for (const customer of this.state.customers) {
      alive.add(customer.id)
      let view = this.customerViews.get(customer.id)
      if (view === undefined) {
        view = new CustomerView(this, this.services.theme, customer.species, this.layout.worldText)
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
        view = new StaffView(this, this.services.theme, member, this.layout.worldText)
        view.hit.on('pointerup', () => this.urgeStaffById(member.id))
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
    this.zoneOverlay.updateZones(this.state)
    const reach = stockReach(this.state)
    for (const zone of ZONE_ORDER) {
      this.shelfViews[zone].updateShelf(this.state.shelves[zone])
      this.shelfViews[zone].setReach(reach.includes(zone))
    }

    const alive = new Set<number>()
    for (const producer of this.state.producers) {
      alive.add(producer.id)
      let view = this.producerViews.get(producer.id)
      if (view === undefined) {
        view = new ProducerView(this, this.services.theme, producer, this.layout.worldText)
        this.world.add(view)
        // The soil bed is a separate ground layer so actors stand on top of it
        // while the crop art still draws over them.
        view.ground.setDepth(1)
        this.world.add(view.ground)
        this.producerViews.set(producer.id, view)
      }
      view.updateProducer(producer)
      const feedReady =
        producer.kind === 'animal' &&
        isAnimalProductKind(producer.product) &&
        producer.product !== 'fish' &&
        feedSpace(producer) > 0 &&
        carriedKinds(this.state.player.carry).some((product) => isPlantKind(product)) &&
        distance(this.state.player.pos, this.state.map.animalAccess[producer.product]) <=
          INTERACT.feedRadius
      view.setFeedActive(feedReady)
      view.setDepth(producer.kind === 'plant' ? producer.pos.y + PLOT_SIZE.h / 2 : producer.pos.y)
    }
    for (const [id, view] of this.producerViews) {
      if (alive.has(id)) continue
      view.ground.destroy()
      view.destroy()
      this.producerViews.delete(id)
    }

    this.staffStations.cashier.updateStaffLevel(this.state.staff.cashier)
    this.staffStations.picker.updateStaffLevel(this.state.staff.picker)
  }

  private readInput(): { moveX: number; moveY: number } {
    if (this.drinkPicker !== undefined || this.devPanel !== undefined) {
      return { moveX: 0, moveY: 0 }
    }
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
        case 'producerMature':
          this.sfx('start', 0.35)
          this.sparkleProducer(event.producerId)
          break
        case 'producerReady':
          break
        case 'producerProduce':
          this.sfx('turn', 0.25)
          if (isProcessedKind(event.product) && !this.announcedProducts.has(event.product)) {
            this.announcedProducts.add(event.product)
            this.toast.show(
              this.services.i18n.t('toast.newProduct', {
                name: this.productName(event.product),
              }),
            )
            this.services.platform.happyTime()
          }
          break
        case 'producerHungry':
          if (!this.hungryNotified.has(event.producerId)) {
            this.hungryNotified.add(event.producerId)
            this.toast.show(
              this.services.i18n.t('toast.hungry', {
                name: this.producerName(event.product),
              }),
            )
          }
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
        case 'producerBought':
          this.saveGame()
          this.showProducerToast(event.product)
          if (event.product === 'fish') {
            this.time.delayedCall(1_200, () => {
              this.toast.show(this.services.i18n.t('toast.fishHint'))
            })
          }
          break
        case 'producerRemoved':
          this.saveGame()
          this.toast.show(
            this.services.i18n.t('toast.producerRemoved', {
              name: this.productName(event.product),
              refund: Math.floor(producerCost(event.product) * 0.5),
            }),
          )
          break
        case 'producerReplaced':
          this.saveGame()
          this.sfx('start', 0.3)
          this.toast.show(
            this.services.i18n.t('toast.producerReplaced', {
              name: this.productName(event.product),
              previous: this.productName(event.previous),
              refund: event.refund,
            }),
          )
          break
        case 'zoneUnlocked':
          this.saveGame()
          this.sfx('start', 0.4)
          this.toast.show(
            this.services.i18n.t('toast.zoneUnlocked', {
              name: this.services.i18n.t(`zone.${event.zone}`),
            }),
          )
          if (event.zone === 'farm' || event.zone === 'kitchen') {
            this.time.delayedCall(1_200, () => {
              this.toast.show(
                this.services.i18n.t(
                  event.zone === 'farm' ? 'toast.farmHint' : 'toast.kitchenHint',
                ),
              )
            })
          }
          this.services.platform.happyTime()
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
        case 'plantPickerReady':
          if (this.mode === 'playing' && this.devPanel === undefined) {
            this.openPlantPicker(event.zone, event.slot)
          }
          break
        case 'plantSwapReady':
          if (this.mode === 'playing' && this.devPanel === undefined) {
            this.openPlantPicker(event.zone, event.slot)
          }
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
        case 'feed':
          this.sfx('eat', 0.3)
          break
        case 'staffFeed':
          this.sfx('eat', 0.18)
          break
        case 'fishCast':
          this.sfx('turn', 0.3)
          this.sfx('click', 0.18)
          break
        case 'fishCaught':
          this.sfx('eat', 0.28)
          this.services.audio.play('boost', { gain: 0.2, pitch: 0.8 })
          this.fishCatchBurst(event.pondId)
          break
        case 'fishFull':
          this.toast.show(this.services.i18n.t('toast.fishFull'))
          break
        case 'discard':
          this.sfx('turn', 0.26)
          this.trashView.playUse()
          this.toast.show(
            this.services.i18n.t('toast.trashed', {
              name: this.productName(event.product),
              count: event.amount,
            }),
          )
          break
        case 'drinkMenuReady':
          if (this.canOpenDrinkPicker()) this.openDrinkPicker()
          else this.pendingDrink = true
          break
        case 'drinkBought':
          playDrinkSfx(this.services, event.drink)
          this.playerView.playDrink(event.drink)
          this.vendingView.playUse()
          this.toast.show(
            this.services.i18n.t('toast.drinkBought', {
              name: this.services.i18n.t(`drink.${event.drink}`),
              seconds: Math.round(DRINKS[event.drink].durationMs / 1000),
            }),
          )
          break
        case 'staffLazy':
          this.sfx('die', 0.22)
          this.toast.show(
            this.services.i18n.t('toast.staffLazy', {
              name: this.services.i18n.t(`staff.${event.kind}`),
            }),
          )
          break
        case 'staffUrged': {
          this.sfx('start', 0.3)
          const member = this.state.staffMembers.find((candidate) => candidate.id === event.staffId)
          if (member !== undefined) {
            this.toast.show(
              this.services.i18n.t('toast.staffUrged', {
                name: this.services.i18n.t(`staff.${member.kind}`),
              }),
            )
          }
          break
        }
        case 'tutorial':
          if (event.step === 'done') {
            this.toast.show(this.services.i18n.t('toast.firstSale'))
            this.services.platform.happyTime()
          }
          break
      }
    }
  }

  private showProducerToast(product: ProductKind): void {
    const count = plantedCount(this.state, product)
    const name = this.producerName(product)
    this.toast.show(
      this.services.i18n.t(count === 1 ? 'toast.producerBought' : 'toast.producerAdded', {
        name,
      }),
    )
    if (count === 1) this.services.platform.happyTime()
  }

  private productName(product: ProductKind): string {
    return this.services.i18n.t(`product.${product}`)
  }

  private producerName(product: ProductKind): string {
    return isPlantKind(product)
      ? this.productName(product)
      : this.services.i18n.t(`producer.${product}`)
  }

  private openPlantPicker(zone: 'fruit' | 'veg', slot: number): void {
    this.closePlantPicker()
    const current = this.state.producers.find(
      (producer) =>
        isPlantKind(producer.product) &&
        zoneOf(producer.product) === zone &&
        producer.slot === slot,
    )
    this.plantPicker = new PlantPicker({
      scene: this,
      layout: this.layout,
      theme: this.services.theme,
      state: this.state,
      zone,
      slot,
      ...(current !== undefined && isPlantKind(current.product)
        ? { current: current.product }
        : {}),
      onSelect: (product) => this.choosePlant(product, slot),
      onClose: () => this.closePlantPicker(),
    })
  }

  private choosePlant(product: PlantKind, slot: number): void {
    const zone = zoneOf(product)
    const existing = this.state.producers.find(
      (producer) =>
        isPlantKind(producer.product) &&
        zoneOf(producer.product) === zone &&
        producer.slot === slot,
    )
    if (existing !== undefined && existing.product === product) {
      this.closePlantPicker()
      return
    }
    const occupied = existing !== undefined
    const outcome = occupied
      ? replacePlantAt(this.state, product, slot)
      : purchasePlantAt(this.state, product, slot, true)
    if (outcome.result === 'ok' || outcome.result === 'deposited') {
      this.state = outcome.state
      this.handleEvents(outcome.events)
      this.saveGame()
      this.updateWorldViews()
      this.hud.update(this.state)
      this.closePlantPicker()
      return
    }
    this.showPurchaseFailure(outcome.result)
  }

  private closePlantPicker(): void {
    this.plantPicker?.destroy()
    this.plantPicker = undefined
  }

  private canOpenDrinkPicker(): boolean {
    return (
      this.mode === 'playing' &&
      this.plantPicker === undefined &&
      this.drinkPicker === undefined &&
      this.devPanel === undefined &&
      distance(this.state.player.pos, this.state.map.facilities.vendingUse) <= DRINK_RADIUS
    )
  }

  private openDrinkPicker(): void {
    if (this.drinkPicker !== undefined) return
    this.closePlantPicker()
    this.resetMovementInput()
    this.vendingView.playUse()
    this.drinkPicker = new DrinkPicker({
      scene: this,
      layout: this.layout,
      theme: this.services.theme,
      i18n: this.services.i18n,
      state: this.state,
      onBuy: (drink) => this.buyDrink(drink),
      onClose: () => this.closeDrinkPicker(),
    })
  }

  private closeDrinkPicker(): void {
    this.drinkPicker?.destroy()
    this.drinkPicker = undefined
    this.resetMovementInput()
  }

  private openDevPanel(): void {
    if (this.devPanel !== undefined || this.mode !== 'playing') return
    this.closePlantPicker()
    this.closeDrinkPicker()
    this.resetMovementInput()
    this.devPanel = new DevPanel({
      scene: this,
      layout: this.layout,
      theme: this.services.theme,
      i18n: this.services.i18n,
      state: this.state,
      onSetCoins: (coins) => {
        this.state = { ...this.state, coins }
        this.hud.update(this.state)
        this.saveGame()
      },
      onClose: () => this.closeDevPanel(),
    })
  }

  private closeDevPanel(): void {
    this.devPanel?.destroy()
    this.devPanel = undefined
    this.resetMovementInput()
  }

  private buyDrink(drink: DrinkKind): void {
    const outcome = purchaseDrink(this.state, drink)
    if (outcome.result !== 'ok') return
    this.state = outcome.state
    this.handleEvents(outcome.events)
    this.saveGame()
    this.hud.update(this.state)
  }

  private nudgeStaff(): void {
    const target = nearestRestingStaff(this.state)
    if (target === null) return
    this.urgeStaffById(target.id)
  }

  private urgeStaffById(staffId: number): void {
    const member = this.state.staffMembers.find((candidate) => candidate.id === staffId)
    if (member === undefined || member.phase !== 'resting') return
    if (distance(this.state.player.pos, member.pos) > REST.urgeRadius) return
    const result = urgeStaff(this.state, staffId)
    this.state = result.state
    this.handleEvents(result.events)
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
    const from = worldToScreen(this.layout, this.layout.map.register)
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
    const from = worldToScreen(this.layout, this.layout.map.register)
    const to = worldToScreen(this.layout, {
      x: this.layout.map.counter.x + this.layout.map.counter.w - 15,
      y: this.layout.map.counter.y + 22,
    })
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
    const point = worldToScreen(this.layout, this.layout.map.register)
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

  private fishCatchBurst(pondId: number): void {
    const pond = this.state.producers.find((producer) => producer.id === pondId)
    if (pond === undefined) return
    const from = worldToScreen(this.layout, pond.pos)
    const to = worldToScreen(this.layout, this.state.player.pos)
    const fish = this.add
      .image(from.x, from.y - 6, productTextureKey('fish'))
      .setScale(0.6)
      .setDepth(6500)
    this.tweens.add({
      targets: fish,
      x: to.x,
      y: to.y - 24,
      angle: 18,
      duration: 480,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: fish,
          y: to.y - 40,
          alpha: 0,
          duration: 180,
          onComplete: () => fish.destroy(),
        })
      },
    })
    for (let index = 0; index < 5; index += 1) {
      const drop = this.add.circle(from.x, from.y, 2.5, 0xbfeaf5, 0.9).setDepth(6499)
      const angle = (Math.PI * 2 * index) / 5
      this.tweens.add({
        targets: drop,
        x: from.x + Math.cos(angle) * 22,
        y: from.y + Math.sin(angle) * 12 - 8,
        alpha: 0,
        duration: 360,
        onComplete: () => drop.destroy(),
      })
    }
  }

  private sparkleProducer(id: number): void {
    const producer = this.state.producers.find((candidate) => candidate.id === id)
    if (producer === undefined) return
    const point = worldToScreen(this.layout, producer.pos)
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
    this.closePlantPicker()
    this.closeDrinkPicker()
    this.closeDevPanel()
    this.mode = 'shop'
    this.hud.setEnabled(false)
    this.joystick.setEnabled(false)
    this.tutorial.setVisible(false)
    this.services.platform.gameplayStop()
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
      onPurchasePlant: (product) => this.applyPurchase(purchasePlant(this.state, product)),
      onPurchaseProducer: (product) => this.applyPurchase(purchaseProducer(this.state, product)),
      onUnlockZone: (zone) => this.applyPurchase(purchaseZone(this.state, zone)),
      onUpgrade: (kind) => this.applyPurchase(purchaseUpgrade(this.state, kind)),
      onStaff: (kind) => this.applyPurchase(purchaseStaff(this.state, kind, false)),
      onRemove: (id) => this.applyPurchase(removeProducer(this.state, id)),
      onClose: () => {
        this.shopPanel = undefined
        this.setPlaying()
      },
    })
  }

  private applyPurchase(outcome: PurchaseOutcome): ShopState {
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
  }

  private showPurchaseFailure(result: PurchaseResult): void {
    if (result === 'noSlot') this.toast.show(this.services.i18n.t('toast.noSlot'))
    else if (result === 'insufficient') this.toast.show(this.services.i18n.t('toast.notEnough'))
    else if (result === 'maxed') this.toast.show(this.services.i18n.t('toast.max'))
    else if (result === 'locked') this.toast.show(this.services.i18n.t('toast.locked'))
    else if (result === 'lockedZone') this.toast.show(this.services.i18n.t('toast.lockedZone'))
    else if (result === 'lastProducer') this.toast.show(this.services.i18n.t('toast.lastProducer'))
  }

  private pauseGame(): void {
    if (this.mode !== 'playing' && this.mode !== 'shop') return
    this.resetMovementInput()
    this.closePlantPicker()
    this.closeDrinkPicker()
    this.closeDevPanel()
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
      onResume: () => this.resumeFromPause(),
      onShop: () => this.openShop(),
      onMenu: () => {
        this.saveGame()
        this.scene.start('Menu')
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
    const next = computeGameLayout(viewport.width, viewport.height, viewport.insets, {
      mobile: isMobileDevice(),
      cssShortSide: readCssShortSide(this),
    })
    if (
      next.width === this.layout.width &&
      next.height === this.layout.height &&
      next.hud.vertical === this.layout.hud.vertical &&
      next.content.x === this.layout.content.x &&
      next.content.y === this.layout.content.y &&
      next.content.w === this.layout.content.w &&
      next.content.h === this.layout.content.h &&
      next.map.id === this.layout.map.id &&
      next.room.x === this.layout.room.x &&
      next.room.y === this.layout.room.y &&
      next.room.w === this.layout.room.w &&
      next.room.h === this.layout.room.h
    ) {
      return
    }
    const previousMode = this.mode
    const mapChanged = next.map.id !== this.layout.map.id

    this.destroyFloatingUi()
    if (mapChanged) this.state = remapShopState(this.state, next.map)
    this.layout = next
    if (mapChanged) this.rebuildWorld()
    this.applyWorldLayout()
    this.tutorial = new TutorialOverlay(this, this.layout, this.services.theme, this.services.i18n)
    this.toast = new Toast(this, this.layout, this.services.theme)
    this.mapOffers = new MapOffers(this, this.layout, this.services.theme, (zone, slot) =>
      this.tryOpenBed(zone, slot),
    )
    this.buffBar = new BuffBar(this, this.layout, this.services.theme, this.services.i18n)
    this.facilityOverlay = new FacilityOverlay(
      this,
      this.layout,
      this.services.theme,
      this.services.i18n,
      { onNudge: () => this.nudgeStaff() },
    )

    if (
      previousMode === 'playing' &&
      mapChanged &&
      performance.now() >= this.suppressAutoPauseUntil
    ) {
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

  private rebuildWorld(): void {
    this.world.destroy(true)
    this.producerViews.clear()
    this.customerViews.clear()
    this.staffViews.clear()
    this.buildWorld()
    this.syncCustomers(1, 0)
    this.syncStaff(1, 0)
    this.coinPile.updatePile(this.state.pendingCoins)
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
    this.closePlantPicker()
    this.closeDrinkPicker()
    this.closeDevPanel()
    this.mapOffers?.destroy()
    this.mapOffers = undefined
    this.facilityOverlay?.destroy()
    this.buffBar?.destroy()
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
