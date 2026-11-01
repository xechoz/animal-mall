import {
  cssColor,
  displayTextStyle,
  type GameServices,
  getServices,
  isMobileDevice,
  onAppHidden,
  onLayoutChange,
  readViewport,
  type SoundName,
  textStyle,
  type Viewport,
} from '@mg/core'
import { createRng, type Rng, randomSeed } from '@mg/core/rng'
import Phaser from 'phaser'
import { animalSfxName, playAnimalSfx } from '../audio/animalSfx'
import { playDiningEatSfx } from '../audio/diningSfx'
import { playDrinkSfx, playGulpSfx } from '../audio/drinkSfx'
import { startMusic } from '../audio/music'
import { gameColors } from '../colors'
import { carriedKinds } from '../logic/carry'
import { distance } from '../logic/collision'
import {
  DRINK_RADIUS,
  DRINKS,
  FISHING,
  INTERACT,
  INTERACTION,
  isAnimalProductKind,
  isPlantKind,
  isProcessedKind,
  PEN_SIZE,
  PLANT_FIELDS,
  PLOT_SIZE,
  producerCost,
  REST,
  STAFF_ORDER,
  STATION_SIZE,
  shelfUpgradeCost,
  ZONE_ORDER,
  zoneOf,
} from '../logic/config'
import { eatCarried, sitAtSeat, standUp } from '../logic/dining'
import { nearestRestingStaff, purchaseDrink } from '../logic/facilities'
import { feedSpace } from '../logic/production'
import {
  installProducerAt,
  type PurchaseOutcome,
  type PurchaseResult,
  plantedCount,
  producerAtSlot,
  purchasePlant,
  purchasePlantAt,
  purchaseShelfUpgrade,
  purchaseStaff,
  purchaseUpgrade,
  purchaseZone,
  removeProducer,
  replacePlantAt,
  slotPlantDeposit,
} from '../logic/purchase'
import { nearestOffer } from '../logic/quickBuy'
import { urgeStaff } from '../logic/staff'
import { createShopState, remapShopState, stepShop, stockReach, toSave } from '../logic/state'
import type {
  DrinkKind,
  GameEvent,
  Plot,
  ProducerState,
  ProductKind,
  ShopState,
  StaffKind,
  Vec2,
  ZoneId,
} from '../logic/types'
import { progressSave } from '../save'
import { createAnimalTextures } from '../ui/animalArt'
import { BuffBar } from '../ui/BuffBar'
import { CoinPileView } from '../ui/CoinPileView'
import { CustomerView } from '../ui/CustomerView'
import { DevPanel } from '../ui/DevPanel'
import { DiningView } from '../ui/DiningView'
import { DrinkPicker } from '../ui/DrinkPicker'
import { FacilityOverlay } from '../ui/FacilityOverlay'
import { FacilityView } from '../ui/FacilityView'
import { FishingView } from '../ui/FishingView'
import { FoodPicker } from '../ui/FoodPicker'
import {
  drawCanopyBand,
  drawFern,
  drawFirefly,
  drawMushroomCluster,
  drawRock,
  drawSunShaft,
  drawTree,
} from '../ui/forestArt'
import { coinTextureKey } from '../ui/fruitArt'
import { Hud } from '../ui/Hud'
import { Joystick } from '../ui/Joystick'
import { computeGameLayout, type GameLayout } from '../ui/layout'
import { MapOffers } from '../ui/MapOffers'
import { PauseOverlay } from '../ui/PauseOverlay'
import { PlantBedView } from '../ui/PlantBedView'
import { PlayerView } from '../ui/PlayerView'
import { ProducerView } from '../ui/ProducerView'
import { createProductTextures, productTextureKey } from '../ui/productArt'
import { ShelfView } from '../ui/ShelfView'
import { ShopPanel } from '../ui/ShopPanel'
import { SlotPicker } from '../ui/SlotPicker'
import { StaffStationView } from '../ui/StaffStationView'
import { StaffView } from '../ui/StaffView'
import { readCssShortSide } from '../ui/scale'
import { SceneryView } from '../ui/scenery'
import { createShopBackground } from '../ui/shopArt'
import { Toast } from '../ui/Toast'
import { TutorialOverlay } from '../ui/TutorialOverlay'
import {
  createWorldCamera,
  followWorldCamera,
  snapWorldCamera,
  type WorldCamera,
  worldToScreen,
} from '../ui/worldCamera'
import { ZoneOverlay } from '../ui/ZoneOverlay'

const STEP_MS = 1000 / 60
const SAVE_EVERY_MS = 5_000
/** Hold this long on a planted bed to open the crop swap chooser. */

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
  private viewCamera!: WorldCamera
  private backdrop!: Phaser.GameObjects.Graphics
  private world!: Phaser.GameObjects.Container
  private shelfViews!: Record<ZoneId, ShelfView>
  private producerViews = new Map<number, ProducerView>()
  private playerView!: PlayerView
  private customerViews = new Map<number, CustomerView>()
  private staffViews = new Map<number, StaffView>()
  private staffStations!: Record<StaffKind, StaffStationView>
  private zoneOverlay!: ZoneOverlay
  private sceneryView!: SceneryView
  private plantBeds!: PlantBedView
  private coinPile!: CoinPileView
  private fishingView!: FishingView
  private trashView!: FacilityView
  private vendingView!: FacilityView
  private facilityOverlay!: FacilityOverlay
  private buffBar!: BuffBar
  private mapOffers?: MapOffers
  private bedHits: Phaser.GameObjects.Zone[] = []
  private bedPress?: {
    readonly zone: ZoneId
    readonly slot: number
    readonly timer: Phaser.Time.TimerEvent
    readonly startX: number
    readonly startY: number
    readonly startedAt: number
    fired: boolean
  }
  private bedPressRing?: Phaser.GameObjects.Graphics
  private bedPressLabel?: Phaser.GameObjects.Text
  private slotPicker?: SlotPicker
  private drinkPicker?: DrinkPicker
  private foodPicker?: FoodPicker
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
  private hintTapBed = false
  private hintSwap = false
  private hintAnimalSwap = false
  private hintMachineSwap = false
  private hintFish = false
  private hintDining = false
  private countdownMs = 0
  private countdownShown = 0
  private accumulator = 0
  private saveTimer = 0
  /**
   * Fullscreen requests, the mobile landscape lock and the first frame of a
   * scene start can emit a window blur or an orientation resize. Ignore
   * auto-pause for a moment so tapping "Open Shop" never lands on the pause
   * card while the shop is still settling.
   */
  private suppressAutoPauseUntil = 0
  private removeHidden?: () => void
  private readonly heldMoveKeys = new Set<string>()
  private inputCleanup?: () => void
  private readonly announcedProducts = new Set<ProductKind>()
  private readonly hungryNotified = new Set<number>()
  private readonly hungryCueAt = new Map<number, number>()

  constructor() {
    super('Game')
  }

  create(): void {
    this.services = getServices()
    this.suppressAutoPauseUntil = performance.now() + 2_500
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
    this.viewCamera = createWorldCamera(this.layout, this.state.player.pos)
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
        const allowAutoSit =
          this.mode === 'playing' &&
          this.slotPicker === undefined &&
          this.drinkPicker === undefined &&
          this.devPanel === undefined
        const result = stepShop(
          this.state,
          { ...this.readInput(), allowAutoSit },
          this.rng,
          STEP_MS,
        )
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
    this.render(alpha, time, delta)
  }

  private drawBackdrop(): void {
    const g = this.add.graphics().setDepth(-100)
    const { width, height } = this.layout
    const room = this.layout.room
    g.fillStyle(gameColors.canopy, 1)
    g.fillRect(0, 0, width, height)
    g.fillStyle(gameColors.pine, 0.9)
    g.fillRect(0, 0, width, Math.max(0, room.y + 24))
    g.fillStyle(this.services.theme.bgAlt, 0.85)
    g.fillRect(0, height * 0.7, width, height * 0.3)

    // A canopy band frames the top edge; the room still owns its exact footprint.
    drawCanopyBand(g, -30, -20, width + 60, Math.max(72, room.y + 18), 11)
    drawSunShaft(g, width * 0.12, Math.max(24, room.y - 18), 70, height * 0.55, 0.05)
    drawSunShaft(g, width * 0.66, Math.max(18, room.y - 30), 52, height * 0.5, 0.04)

    // Mossy clearing lip behind the shop, visible only in the screen margins.
    g.fillStyle(gameColors.mossDark, 0.55)
    g.fillRoundedRect(room.x - 14, room.y - 14, room.w + 28, room.h + 28, 24)
    g.fillStyle(gameColors.moss, 0.32)
    g.fillRoundedRect(room.x - 6, room.y - 6, room.w + 12, room.h + 12, 18)

    const leftTree = room.x - 32
    if (leftTree > 16) drawTree(g, leftTree, room.y + room.h * 0.34, 0.9, 'oak', 'olive')
    const rightTree = room.x + room.w + 32
    if (rightTree < width - 16) drawTree(g, rightTree, room.y + room.h * 0.54, 0.85, 'pine', 'teal')

    drawFern(g, Math.max(18, room.x - 22), room.y + room.h - 34, 0.9, 1)
    drawFern(g, Math.min(width - 18, room.x + room.w + 22), room.y + room.h - 40, 0.9, -1)
    drawRock(g, Math.max(22, room.x - 20), room.y + room.h - 70, 0.8)
    drawMushroomCluster(g, Math.min(width - 26, room.x + room.w + 24), room.y + room.h - 76, 0.85)

    for (let index = 0; index < 6; index += 1) {
      const x = width * (0.07 + index * 0.16)
      const y = height * (0.14 + ((index * 19) % 30) / 100)
      drawFirefly(g, x, y, index * 1.7)
    }
    this.backdrop = g
  }

  private buildWorld(): void {
    const { theme, i18n } = this.services
    this.bedHits = []
    this.bedPress = undefined
    this.destroyBedPressRing()
    this.world = this.add.container(this.viewCamera.x, this.viewCamera.y)
    this.world.setScale(this.viewCamera.scale)

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

    this.plantBeds = new PlantBedView(this)
    this.plantBeds.setDepth(1)
    this.world.add(this.plantBeds)

    this.sceneryView = new SceneryView(this, this.layout.map)
    this.sceneryView.setDepth(2)
    this.world.add(this.sceneryView)

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

    const diningView = new DiningView(
      this,
      theme,
      this.layout.map,
      i18n.t('facility.dining'),
      this.layout.worldText,
      (seat) => this.trySit(seat),
    )
    diningView.addTo(this.world)

    this.shelfViews = Object.fromEntries(
      ZONE_ORDER.map((zone) => {
        const view = new ShelfView(this, theme, zone, this.layout.map, this.layout.worldText, () =>
          this.buyShelfUpgrade(zone),
        )
        const rect = this.layout.map.shelves[zone]
        view.setDepth(rect.y + rect.h)
        this.world.add(view)
        return [zone, view]
      }),
    ) as Record<ZoneId, ShelfView>

    this.staffStations = Object.fromEntries(
      STAFF_ORDER.map((kind) => {
        const view = new StaffStationView(this, theme, kind, this.layout.map)
        view.setDepth(this.layout.map.staffStations[kind].station.y + 26)
        this.world.add(view)
        return [kind, view]
      }),
    ) as Record<StaffKind, StaffStationView>

    this.coinPile = new CoinPileView(this, theme, this.layout.map)
    this.world.add(this.coinPile)
    this.fishingView = new FishingView(this, theme)
    this.world.add(this.fishingView)
    this.time.delayedCall(1_400, () => {
      if (this.mode !== 'playing' || this.hintTapBed || this.state.tutorial !== 'buyTree') return
      this.hintTapBed = true
      this.toast.show(this.services.i18n.t('toast.tapBed'))
    })

    this.playerView = new PlayerView(this, theme)
    this.playerView.landHandler = (x, y) => this.spawnDust(x, y)
    this.world.add(this.playerView)
    this.buildSlotHits()
    this.updateWorldViews()
  }

  /**
   * Every growing bed, farm pen and kitchen station is tappable. A short tap
   * opens the chooser on an empty slot, while holding the finger down opens the
   * swap chooser on an occupied one. This is the touch-friendly twin of the
   * half-second dwell.
   */
  private buildSlotHits(): void {
    for (const zone of ['fruit', 'veg'] as const) {
      const height = this.bedHitHeight(zone)
      for (const plot of this.layout.map.plantSlots[zone]) {
        this.addSlotHit(zone, plot, PLOT_SIZE.w, height)
      }
    }
    this.addProducerHits('farm', this.layout.map.animalPens, PEN_SIZE.w, PEN_SIZE.h)
    this.addProducerHits('kitchen', this.layout.map.stationSlots, STATION_SIZE.w, STATION_SIZE.h)
  }

  private addProducerHits(
    zone: 'farm' | 'kitchen',
    slots: readonly Plot[],
    width: number,
    height: number,
  ): void {
    const padding = INTERACTION.plotHitPadding
    for (const slot of slots) {
      this.addSlotHit(zone, slot, width + padding * 2, height + padding * 2)
    }
  }

  private addSlotHit(
    zone: ZoneId,
    slot: { readonly index: number; readonly x: number; readonly y: number },
    width: number,
    height: number,
  ): void {
    const hit = this.add.zone(slot.x, slot.y, width, height).setInteractive({ useHandCursor: true })
    hit.on('pointerdown', (pointer: Phaser.Input.Pointer) =>
      this.beginBedPress(zone, slot.index, pointer),
    )
    hit.on('pointerup', (pointer: Phaser.Input.Pointer) =>
      this.endBedPress(zone, slot.index, pointer),
    )
    hit.on('pointerout', () => this.cancelBedPress(zone, slot.index))
    this.bedHits.push(hit)
    this.world.add(hit)
  }

  /**
   * A fixed padding overlaps the next row on the tight vegetable grid, so the
   * touch area grows only as far as the real row gap allows.
   */
  private bedHitHeight(zone: 'fruit' | 'veg'): number {
    const plots = this.layout.map.plantSlots[zone]
    const first = plots[0]
    const below = plots[PLANT_FIELDS[zone].cols]
    if (first === undefined || below === undefined) return PLOT_SIZE.h
    const rowGap = Math.abs(below.y - first.y)
    const padding = Math.max(
      0,
      Math.min(INTERACTION.plotHitPadding, (rowGap - PLOT_SIZE.h) / 2 - 1),
    )
    return PLOT_SIZE.h + padding * 2
  }

  private beginBedPress(zone: ZoneId, slot: number, pointer: Phaser.Input.Pointer): void {
    this.cancelBedPress(zone, slot)
    const startedAt = this.time.now
    const timer = this.time.delayedCall(INTERACTION.holdMs, () => {
      if (this.bedPress?.timer !== timer) return
      this.bedPress.fired = true
      this.tryOpenSlot(zone, slot)
    })
    this.bedPress = {
      zone,
      slot,
      timer,
      startX: pointer.x,
      startY: pointer.y,
      startedAt,
      fired: false,
    }
    this.bedPressRing ??= this.add.graphics().setDepth(6500)
    if (this.bedPressLabel === undefined) {
      const ui = this.layout.worldUi
      this.bedPressLabel = this.add
        .text(0, 0, '', textStyle(this.services.theme, 12 * ui, this.services.theme.text, true))
        .setOrigin(0.5, 1)
        .setDepth(6500)
        .setStroke(cssColor(this.services.theme.panel), 3 * ui)
        .setVisible(false)
    }
  }

  private endBedPress(zone: ZoneId, slot: number, pointer: Phaser.Input.Pointer): void {
    const press = this.bedPress
    this.bedPress = undefined
    this.destroyBedPressRing()
    if (press === undefined || press.zone !== zone || press.slot !== slot) return
    press.timer.remove()
    if (press.fired) return
    if (Math.hypot(pointer.x - press.startX, pointer.y - press.startY) > INTERACTION.tapSlop) return
    // A short tap only opens an empty slot. Replacing an existing crop, animal
    // or machine needs the hold (or its tool tag), so a stray tap while
    // harvesting never opens a paid chooser.
    if (this.producerAt(zone, slot) !== undefined) return
    if ((zone === 'fruit' || zone === 'veg') && slotPlantDeposit(this.state, zone, slot) !== null) {
      return
    }
    this.tryOpenSlot(zone, slot)
  }

  private cancelBedPress(zone: ZoneId, slot: number): void {
    if (this.bedPress?.zone !== zone || this.bedPress.slot !== slot) return
    this.bedPress.timer.remove()
    this.bedPress = undefined
    this.destroyBedPressRing()
  }

  private destroyBedPressRing(): void {
    this.bedPressRing?.destroy()
    this.bedPressRing = undefined
    this.bedPressLabel?.destroy()
    this.bedPressLabel = undefined
  }

  private drawBedPressRing(time: number): void {
    const press = this.bedPress
    const ring = this.bedPressRing
    if (press === undefined || ring === undefined) return
    const slot = this.slotAt(press.zone, press.slot)
    if (slot === undefined) return
    const point = worldToScreen(this.viewCamera, slot)
    const ui = this.layout.worldUi
    const size =
      press.zone === 'farm' ? PEN_SIZE.w : press.zone === 'kitchen' ? STATION_SIZE.w : PLOT_SIZE.w
    const radius = (size / 2 + 4) * this.viewCamera.scale
    const ratio = Math.min(1, (time - press.startedAt) / INTERACTION.holdMs)
    ring.clear()
    ring.lineStyle(4 * ui, this.services.theme.ink, 0.18)
    ring.strokeCircle(point.x, point.y - 4 * ui, radius)
    ring.lineStyle(4 * ui, this.services.theme.accentAlt, 0.95)
    ring.beginPath()
    ring.arc(point.x, point.y - 4 * ui, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio)
    ring.strokePath()

    const label = this.bedPressLabel
    if (label !== undefined) {
      const show = time - press.startedAt >= INTERACTION.holdMs * 0.25
      label.setVisible(show)
      if (show) {
        label.setFontSize(12 * ui)
        label.setPosition(point.x, point.y - radius - 6 * ui)
        label.setText(this.services.i18n.t('bed.holdSwap'))
      }
    }
  }

  private slotAt(zone: ZoneId, slot: number): { x: number; y: number } | undefined {
    if (zone === 'fruit' || zone === 'veg') return this.layout.map.plantSlots[zone][slot]
    if (zone === 'farm') return this.layout.map.animalPens[slot]
    return this.layout.map.stationSlots[slot]
  }

  private producerAt(zone: ZoneId, slot: number): ProducerState | undefined {
    if (zone === 'fruit' || zone === 'veg') {
      return this.state.producers.find(
        (producer) =>
          isPlantKind(producer.product) &&
          zoneOf(producer.product) === zone &&
          producer.slot === slot,
      )
    }
    return producerAtSlot(this.state, zone, slot)
  }

  private tryOpenSlot(zone: ZoneId, slot: number): void {
    if (this.mode !== 'playing' && this.mode !== 'shop') return
    if (
      this.slotPicker !== undefined ||
      this.drinkPicker !== undefined ||
      this.foodPicker !== undefined
    ) {
      return
    }
    if (this.devPanel !== undefined) return
    if (this.state.dining.playerSeat !== null) return
    if (!this.state.zones[zone]) return
    const current = this.producerAt(zone, slot)
    // A bed that already holds a partial payment keeps its dwell-to-pay flow;
    // opening the full chooser here would offer crops the deposit cannot buy.
    if (
      current === undefined &&
      (zone === 'fruit' || zone === 'veg') &&
      slotPlantDeposit(this.state, zone, slot) !== null
    ) {
      return
    }
    this.openSlotPicker(zone, slot, this.mode === 'shop')
  }

  private buildHudAndInput(): void {
    const devEnabled = import.meta.env.DEV || this.services.debug
    this.hud = new Hud(this, this.layout, this.services.theme, {
      onShop: () => this.openShop(),
      onPause: () => this.pauseGame(),
      ...(devEnabled ? { onDev: () => this.openDevPanel() } : {}),
    })
    this.joystick = new Joystick(this, this.services.theme)
    this.tutorial = new TutorialOverlay(
      this,
      this.layout,
      this.viewCamera,
      this.services.theme,
      this.services.i18n,
    )
    this.toast = new Toast(this, this.layout, this.services.theme)
    this.mapOffers = new MapOffers(
      this,
      this.layout,
      this.viewCamera,
      this.services.theme,
      (zone, slot) => this.tryOpenSlot(zone, slot),
    )
    this.buffBar = new BuffBar(this, this.layout, this.services.theme, this.services.i18n)
    this.facilityOverlay = new FacilityOverlay(
      this,
      this.layout,
      this.viewCamera,
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
      else if (this.slotPicker !== undefined) this.closeSlotPicker()
      else if (this.foodPicker !== undefined) this.closeFoodPicker()
      else if (this.drinkPicker !== undefined) this.closeDrinkPicker()
      else if (this.mode === 'shop') this.shopPanel?.close()
      else toggle()
    }
    keyboard.on('keydown-P', toggle)
    keyboard.on('keydown-ESC', escapeKey)

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const code = moveKeyCode(event)
      if (code === null) return
      if (this.foodPicker !== undefined) this.closeFoodPicker()
      this.heldMoveKeys.add(code)
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

  private render(alpha: number, time: number, delta: number): void {
    this.playerView.updatePlayer(
      this.state.player,
      alpha,
      time,
      this.state.dining.playerSeat !== null,
    )
    followWorldCamera(
      this.layout,
      this.viewCamera,
      { x: this.playerView.x, y: this.playerView.y },
      delta,
    )
    this.world.setPosition(this.viewCamera.x, this.viewCamera.y)
    this.world.setScale(this.viewCamera.scale)
    this.playerView.setDepth(this.state.player.pos.y + 1)
    this.syncCustomers(alpha, time)
    this.syncStaff(alpha, time)
    this.updateWorldViews()
    this.updateHungryCues(this.time.now)
    this.sceneryView.updateScenery(time)
    this.fishingView.updateFishing(this.state, time)
    // Container children ignore depth, so sort by the depth values refreshed
    // above to keep actors and scenery layered by their footprint.
    this.world.sort('depth')
    this.hud.update(this.state)
    this.mapOffers?.update(this.state)
    this.drawBedPressRing(time)
    this.showContextHints()
    this.coinPile.updatePile(this.state.pendingCoins)
    this.buffBar.update(this.state.buffs)
    this.drinkPicker?.update(this.state)
    this.foodPicker?.update(this.state)
    this.devPanel?.update(this.state)

    if (this.slotPicker !== undefined && this.mode !== 'playing' && this.mode !== 'shop') {
      this.closeSlotPicker()
    }
    if (this.foodPicker !== undefined && this.mode !== 'playing') {
      this.closeFoodPicker()
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
    if (this.state.dining.playerSeat !== null) this.openFoodPickerIfPossible()

    const showTutorial =
      this.mode === 'playing' &&
      this.slotPicker === undefined &&
      this.drinkPicker === undefined &&
      this.foodPicker === undefined &&
      this.devPanel === undefined
    this.tutorial.setVisible(showTutorial)
    if (showTutorial) this.tutorial.update(this.state, time)

    const overlayEnabled =
      this.mode === 'playing' &&
      this.slotPicker === undefined &&
      this.drinkPicker === undefined &&
      this.foodPicker === undefined &&
      this.devPanel === undefined
    this.facilityOverlay.update(this.state, overlayEnabled)

    if (this.mode === 'shop') this.shopPanel?.update(this.state)

    const inputEnabled =
      this.mode === 'playing' &&
      this.slotPicker === undefined &&
      this.drinkPicker === undefined &&
      this.foodPicker === undefined &&
      this.devPanel === undefined
    this.joystick.setEnabled(inputEnabled)
    this.hud.setEnabled(inputEnabled)
  }

  private syncCustomers(alpha: number, time: number): void {
    const alive = new Set<number>()
    for (const customer of this.state.customers) {
      alive.add(customer.id)
      let view = this.customerViews.get(customer.id)
      if (view === undefined) {
        view = new CustomerView(
          this,
          this.services.theme,
          customer.species,
          this.layout.worldText,
          customer.id,
        )
        view.landHandler = (x, y) => this.spawnDust(x, y)
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
        view.landHandler = (x, y) => this.spawnDust(x, y)
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

  /** A tiny puff of floor dust where a hopping animal lands. */
  private spawnDust(x: number, y: number): void {
    const side = Math.floor(x + y) % 2 === 0 ? -1 : 1
    const puff = this.add.circle(x, y + 1, 2.4, 0xdcc8a4, 0.4)
    this.world.add(puff)
    puff.setDepth(y - 2)
    this.tweens.add({
      targets: puff,
      x: x + side * 5,
      y: y - 7,
      scale: 2.1,
      alpha: 0,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => puff.destroy(),
    })
  }

  private updateWorldViews(): void {
    this.zoneOverlay.updateZones(this.state)
    this.plantBeds.updateBeds(this.state)
    const reach = stockReach(this.state)
    for (const zone of ZONE_ORDER) {
      this.shelfViews[zone].updateShelf(this.state.shelves[zone])
      this.shelfViews[zone].setReach(reach.includes(zone))
      const level = this.state.shelfLevels[zone]
      const cost = shelfUpgradeCost(level)
      const canUpgrade =
        this.mode === 'playing' &&
        this.state.zones[zone] &&
        cost !== null &&
        this.state.coins >= cost
      this.shelfViews[zone].setUpgrade(canUpgrade ? cost : null)
    }

    const alive = new Set<number>()
    for (const producer of this.state.producers) {
      alive.add(producer.id)
      let view = this.producerViews.get(producer.id)
      if (view === undefined) {
        view = new ProducerView(
          this,
          this.services.theme,
          producer,
          this.layout.worldText,
          this.services.i18n,
        )
        this.world.add(view)
        // The soil bed is a separate ground layer so actors stand on top of it
        // while the crop art still draws over them.
        view.ground.setDepth(1)
        this.world.add(view.ground)
        this.producerViews.set(producer.id, view)
      }
      view.updateProducer(producer, this.state.shelves)
      view.updateAnimal(producer, this.time.now, this.mode === 'playing')
      view.updateStation(producer, this.time.now, this.mode === 'playing')
      const feedReady =
        producer.kind === 'animal' &&
        isAnimalProductKind(producer.product) &&
        producer.product !== 'fish' &&
        feedSpace(producer) > 0 &&
        carriedKinds(this.state.player.carry).some((product) => isPlantKind(product)) &&
        distance(this.state.player.pos, this.state.map.animalAccess[producer.slot]) <=
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

    for (const kind of STAFF_ORDER) {
      const available = kind !== 'chef' || this.state.zones.kitchen
      this.staffStations[kind].updateStaffLevel(this.state.staff[kind], available)
    }
  }

  private readInput(): { moveX: number; moveY: number } {
    if (
      this.slotPicker !== undefined ||
      this.drinkPicker !== undefined ||
      this.foodPicker !== undefined ||
      this.devPanel !== undefined
    ) {
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
          playAnimalSfx(this.services, event.product, 0.62)
          this.hungryCueAt.set(event.producerId, this.time.now + 4_500)
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
          if (isPlantKind(event.previous)) {
            const zone = zoneOf(event.previous)
            if (zone === 'fruit' || zone === 'veg') {
              const at = this.state.map.plantSlots[zone][event.slot]
              if (at !== undefined) {
                this.floatOldCrop(event.previous, at)
                this.floatRefund(at, event.refund)
              }
            }
          }
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
        case 'shelfUpgraded':
          this.saveGame()
          this.sfx('start', 0.35)
          this.toast.show(
            this.services.i18n.t('toast.shelfUpgraded', {
              zone: this.services.i18n.t(`zone.${event.zone}`),
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
        case 'plantSwapReady':
        case 'producerPickerReady':
          // Always go through the slot guard so a second dwell cannot replace
          // an already open chooser while the shop keeps simulating behind it.
          this.tryOpenSlot(event.zone, event.slot)
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
          this.sfx('eat', 0.34, 0.96 + (event.producerId % 5) * 0.02)
          this.hungryNotified.delete(event.producerId)
          this.floatGoods(event.product, this.producerFloatAnchor(event.producerId), event.amount)
          break
        case 'stationLoad':
          this.sfx('click', 0.24, 0.98 + (event.producerId % 4) * 0.02)
          this.floatGoods(event.product, this.producerFloatAnchor(event.producerId), event.amount)
          break
        case 'staffFeed':
          this.sfx('eat', 0.18)
          break
        case 'fishCast':
          this.sfx('fishCast', 0.42, 0.97 + ((this.time.now % 300) / 300) * 0.06)
          break
        case 'fishCaught':
          this.sfx('fishSplash', 0.52, 0.98 + ((this.time.now % 240) / 240) * 0.05)
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
        case 'diningReady':
          this.openFoodPickerIfPossible()
          break
        case 'ate':
          playDiningEatSfx(this.services, 0.55)
          this.playerView.playEat(event.product)
          this.toast.show(
            this.services.i18n.t('toast.ate', { name: this.productName(event.product) }),
          )
          break
        case 'staffMeal':
          playDiningEatSfx(this.services, 0.35, 0.98 + (event.staffId % 4) * 0.02)
          break
        case 'staffDrink':
          playGulpSfx(this.services, 0.97 + (event.staffId % 4) * 0.02)
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

  private openSlotPicker(zone: ZoneId, slot: number, centered: boolean): void {
    this.closeSlotPicker()
    this.resetMovementInput()
    // A hold that opened the chooser must not leave its ring under the modal.
    this.bedPress?.timer.remove()
    this.bedPress = undefined
    this.destroyBedPressRing()
    const current = this.producerAt(zone, slot)
    this.slotPicker = new SlotPicker({
      scene: this,
      layout: this.layout,
      camera: this.viewCamera,
      theme: this.services.theme,
      i18n: this.services.i18n,
      state: this.state,
      zone,
      slot,
      ...(current !== undefined ? { current: current.product } : {}),
      ...(centered ? { centered: true } : {}),
      onSelect: (product) => this.chooseSlotProduct(zone, slot, product),
      onClose: () => this.closeSlotPicker(),
    })
  }

  private chooseSlotProduct(zone: ZoneId, slot: number, product: ProductKind): void {
    const current = this.producerAt(zone, slot)
    if (current !== undefined && current.product === product) {
      this.closeSlotPicker()
      return
    }

    let outcome: PurchaseOutcome
    if (zone === 'fruit' || zone === 'veg') {
      if (!isPlantKind(product)) return
      outcome =
        current !== undefined
          ? replacePlantAt(this.state, product, slot)
          : purchasePlantAt(this.state, product, slot, true)
    } else {
      outcome = installProducerAt(this.state, product, slot)
    }

    if (outcome.result === 'ok' || outcome.result === 'deposited') {
      this.state = outcome.state
      this.handleEvents(outcome.events)
      this.saveGame()
      this.updateWorldViews()
      this.hud.update(this.state)
      this.shopPanel?.setState(this.state)
      this.closeSlotPicker()
      return
    }
    this.showPurchaseFailure(outcome.result)
  }

  private closeSlotPicker(): void {
    if (this.slotPicker === undefined) return
    this.slotPicker.destroy()
    this.slotPicker = undefined
    this.resetMovementInput()
  }

  private canOpenDrinkPicker(): boolean {
    return (
      this.mode === 'playing' &&
      this.state.dining.playerSeat === null &&
      this.slotPicker === undefined &&
      this.drinkPicker === undefined &&
      this.foodPicker === undefined &&
      this.devPanel === undefined &&
      distance(this.state.player.pos, this.state.map.facilities.vendingUse) <= DRINK_RADIUS
    )
  }

  private openDrinkPicker(): void {
    if (this.drinkPicker !== undefined) return
    this.closeSlotPicker()
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

  private trySit(seatIndex: number): void {
    if (this.mode !== 'playing') return
    if (
      this.slotPicker !== undefined ||
      this.drinkPicker !== undefined ||
      this.foodPicker !== undefined ||
      this.devPanel !== undefined
    ) {
      return
    }
    const outcome = sitAtSeat(this.state, seatIndex)
    if (outcome.result === 'ok') {
      this.state = outcome.state
      this.openFoodPicker()
      return
    }
    if (outcome.result === 'taken') {
      this.toast.show(this.services.i18n.t('toast.diningTaken'))
    } else if (outcome.result === 'far') {
      this.toast.show(this.services.i18n.t('toast.diningFar'))
    }
  }

  private openFoodPickerIfPossible(): void {
    if (this.mode !== 'playing' || this.state.dining.playerSeat === null) return
    if (this.foodPicker !== undefined) return
    if (
      this.slotPicker !== undefined ||
      this.drinkPicker !== undefined ||
      this.devPanel !== undefined ||
      this.shopPanel !== undefined ||
      this.pauseOverlay !== undefined
    ) {
      return
    }
    this.openFoodPicker()
  }

  private openFoodPicker(): void {
    if (this.foodPicker !== undefined) return
    this.closeSlotPicker()
    this.closeDrinkPicker()
    this.closeDevPanel()
    this.resetMovementInput()
    this.foodPicker = new FoodPicker({
      scene: this,
      layout: this.layout,
      theme: this.services.theme,
      i18n: this.services.i18n,
      state: this.state,
      onEat: (product) => this.eat(product),
      onClose: () => this.closeFoodPicker(),
    })
  }

  private closeFoodPicker(): void {
    this.foodPicker?.destroy()
    this.foodPicker = undefined
    if (this.state.dining.playerSeat !== null) {
      this.state = standUp(this.state)
      this.hud.update(this.state)
    }
    this.resetMovementInput()
  }

  private eat(product: ProductKind): void {
    const outcome = eatCarried(this.state, product)
    if (outcome.events.length === 0) return
    this.state = outcome.state
    this.handleEvents(outcome.events)
    this.hud.update(this.state)
    this.foodPicker?.update(this.state)
  }

  private openDevPanel(): void {
    if (this.devPanel !== undefined || this.mode !== 'playing') return
    this.closeSlotPicker()
    this.closeDrinkPicker()
    this.closeFoodPicker()
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
    const from = worldToScreen(this.viewCamera, this.layout.map.register)
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
    const from = worldToScreen(this.viewCamera, this.layout.map.register)
    const to = worldToScreen(this.viewCamera, {
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
    const point = worldToScreen(this.viewCamera, this.layout.map.register)
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

  /** World-space anchor used by floating transfer feedback. */
  private producerFloatAnchor(producerId: number): Vec2 {
    const producer = this.state.producers.find((candidate) => candidate.id === producerId)
    if (producer === undefined) return this.state.player.pos
    if (
      producer.kind === 'animal' &&
      isAnimalProductKind(producer.product) &&
      producer.product !== 'fish'
    ) {
      return this.state.map.animalAccess[producer.slot]
    }
    return producer.pos
  }

  /** Small "+1" that confirms an automatic feed or station load. */
  private floatGoods(product: ProductKind, at: Vec2, amount: number): void {
    const screen = worldToScreen(this.viewCamera, at)
    const icon = this.add
      .image(screen.x - 12, screen.y - 34, productTextureKey(product))
      .setScale(0.42)
      .setDepth(6500)
    const label = this.add
      .text(
        screen.x + 8,
        screen.y - 34,
        `+${amount}`,
        textStyle(this.services.theme, 12, this.services.theme.text, true),
      )
      .setOrigin(0.5)
      .setDepth(6500)
    this.tweens.add({
      targets: [icon, label],
      y: '-=24',
      alpha: 0,
      duration: 700,
      ease: 'Quad.out',
      onComplete: () => {
        icon.destroy()
        label.destroy()
      },
    })
  }

  /** The replaced crop lifts off the bed before the new sapling takes its place. */
  private floatOldCrop(product: ProductKind, at: Vec2): void {
    const screen = worldToScreen(this.viewCamera, at)
    const icon = this.add
      .image(screen.x, screen.y - 34, productTextureKey(product))
      .setScale(0.55)
      .setDepth(6500)
    this.tweens.add({
      targets: icon,
      y: '-=22',
      alpha: 0,
      angle: 14,
      scale: 0.4,
      duration: 480,
      ease: 'Quad.out',
      onComplete: () => icon.destroy(),
    })
  }

  /** Half of the old crop's cost comes back, so show the refund on the bed. */
  private floatRefund(at: Vec2, refund: number): void {
    if (refund <= 0) return
    const screen = worldToScreen(this.viewCamera, at)
    const coin = this.add
      .image(screen.x - 14, screen.y - 14, coinTextureKey())
      .setScale(0.4)
      .setDepth(6500)
    const label = this.add
      .text(
        screen.x + 6,
        screen.y - 14,
        `+${refund}`,
        textStyle(this.services.theme, 13, cssColor(this.services.theme.accentAlt), true),
      )
      .setOrigin(0.5)
      .setDepth(6500)
    this.tweens.add({
      targets: [coin, label],
      y: '-=28',
      alpha: 0,
      duration: 800,
      ease: 'Quad.out',
      onComplete: () => {
        coin.destroy()
        label.destroy()
      },
    })
  }

  private fishCatchBurst(pondId: number): void {
    const pond = this.state.producers.find((producer) => producer.id === pondId)
    if (pond === undefined) return
    const from = worldToScreen(this.viewCamera, pond.pos)
    const to = worldToScreen(this.viewCamera, this.state.player.pos)
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
    const point = worldToScreen(this.viewCamera, producer.pos)
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

  private sfx(name: SoundName, gain = 1, pitch = 1): void {
    this.services.audio.play(name, { gain, pitch })
  }

  /**
   * Repeats a quiet species call while an animal stays hungry. Cues are
   * staggered per producer and never run while the shop, pause card or an
   * overlay owns the screen.
   */
  private updateHungryCues(time: number): void {
    if (this.mode !== 'playing') return
    const hungry = new Set<number>()
    for (const producer of this.state.producers) {
      if (!producer.hungry) continue
      hungry.add(producer.id)
      if (producer.product === 'fish') continue
      if (animalSfxName(producer.product) === null) continue
      if (time < (this.hungryCueAt.get(producer.id) ?? 0)) continue
      playAnimalSfx(this.services, producer.product, 0.5, 0.96 + (producer.id % 4) * 0.025)
      this.hungryCueAt.set(producer.id, time + 4_600 + (producer.id % 5) * 700)
    }
    for (const id of this.hungryCueAt.keys()) {
      if (!hungry.has(id)) this.hungryCueAt.delete(id)
    }
    for (const id of this.hungryNotified) {
      if (!hungry.has(id)) this.hungryNotified.delete(id)
    }
  }

  private showContextHints(): void {
    if (this.mode !== 'playing' || this.slotPicker !== undefined || this.foodPicker !== undefined) {
      return
    }
    if (!this.hintDining && this.state.dining.targetSeat !== null) {
      this.hintDining = true
      this.toast.show(this.services.i18n.t('toast.diningHint'))
    }
    const offer = nearestOffer(this.state, this.state.player.pos)
    if (!this.hintSwap && offer?.type === 'swap') {
      this.hintSwap = true
      this.toast.show(this.services.i18n.t('toast.swapHint'))
    }
    if (!this.hintAnimalSwap && offer?.type === 'producerSwap' && offer.zone === 'farm') {
      this.hintAnimalSwap = true
      this.toast.show(this.services.i18n.t('toast.animalSwapHint'))
    }
    if (!this.hintMachineSwap && offer?.type === 'producerSwap' && offer.zone === 'kitchen') {
      this.hintMachineSwap = true
      this.toast.show(this.services.i18n.t('toast.machineSwapHint'))
    }
    if (this.hintFish) return
    const pond = this.state.producers.find((producer) => producer.product === 'fish')
    if (pond === undefined) return
    const access = this.state.map.animalAccess[pond.slot]
    if (distance(this.state.player.pos, access) > FISHING.margin + 80) return
    this.hintFish = true
    this.toast.show(this.services.i18n.t('toast.fishHint'))
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
    this.closeSlotPicker()
    this.closeDrinkPicker()
    this.closeFoodPicker()
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
      onOpenProducerPicker: (zone, slot) => this.openSlotPicker(zone, slot, true),
      onUnlockZone: (zone) => this.applyPurchase(purchaseZone(this.state, zone)),
      onUpgrade: (kind) => this.applyPurchase(purchaseUpgrade(this.state, kind)),
      onShelfUpgrade: (zone) => this.applyPurchase(purchaseShelfUpgrade(this.state, zone)),
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

  private buyShelfUpgrade(zone: ZoneId): void {
    if (this.mode !== 'playing') return
    this.applyPurchase(purchaseShelfUpgrade(this.state, zone))
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
    this.closeSlotPicker()
    this.closeDrinkPicker()
    this.closeFoodPicker()
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
      next.room.h === this.layout.room.h &&
      next.worldZoom === this.layout.worldZoom
    ) {
      return
    }
    const previousMode = this.mode
    const mapChanged = next.map.id !== this.layout.map.id

    this.destroyFloatingUi()
    if (mapChanged) this.state = remapShopState(this.state, next.map)
    this.layout = next
    snapWorldCamera(this.layout, this.viewCamera, this.state.player.pos)
    if (mapChanged) this.rebuildWorld()
    this.applyWorldLayout()
    this.tutorial = new TutorialOverlay(
      this,
      this.layout,
      this.viewCamera,
      this.services.theme,
      this.services.i18n,
    )
    this.toast = new Toast(this, this.layout, this.services.theme)
    this.mapOffers = new MapOffers(
      this,
      this.layout,
      this.viewCamera,
      this.services.theme,
      (zone, slot) => this.tryOpenSlot(zone, slot),
    )
    this.buffBar = new BuffBar(this, this.layout, this.services.theme, this.services.i18n)
    this.facilityOverlay = new FacilityOverlay(
      this,
      this.layout,
      this.viewCamera,
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
    snapWorldCamera(this.layout, this.viewCamera, this.state.player.pos)
    this.world.setPosition(this.viewCamera.x, this.viewCamera.y)
    this.world.setScale(this.viewCamera.scale)
    this.hud.relayout(this.layout)
    this.joystick.reset()
  }

  private destroyFloatingUi(): void {
    this.pauseOverlay?.destroy()
    this.pauseOverlay = undefined
    this.shopPanel?.destroy()
    this.shopPanel = undefined
    this.closeSlotPicker()
    this.closeDrinkPicker()
    this.closeFoodPicker()
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
