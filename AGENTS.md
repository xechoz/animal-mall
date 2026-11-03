# Animal Mall — Agent Instructions

This repository contains exactly one game. Shared infrastructure lives in the
`platform/` git submodule (`xechoz/mg-platform`), pinned to `v4.4.0`.

## Read first

1. `platform/AGENTS.md` — platform-wide rules and shared APIs (auto-loaded via
   `opencode.json`).
2. `platform/docs/game-development.md` — game development spec and process
   (auto-loaded via `opencode.json`).
3. This file — game-specific scope.
4. `src/logic` before changing rules; `src/scenes` before changing rendering.

**Never edit files under `platform/` in this repository.** Platform changes go
to `xechoz/mg-platform`, get a new tag, and are pulled in by bumping the
submodule. Do not copy platform source into this repo.

## Layout

- `src/logic/` — pure game rules. No Phaser, no DOM, no audio, no ads.
  Randomness only through `@mg/core/rng`.
- `src/scenes/` — Phaser scenes and rendering. Read state, never write rules.
- `src/ui/` — reusable drawing/interaction helpers.
- `src/main.ts` — `createGame()` composition root.
- `src/i18n.ts`, `src/i18n/`, `src/save.ts` — localized copy (English and
  Chinese in `src/i18n.ts`, the other nine picker languages under `src/i18n/`)
  and versioned save migration.
- `game.manifest.json` — site card metadata. Keep `id` stable.
- `public/` — icons, manifest, static files.

## Hard rules

- Pure logic only accepts input and returns new state plus events.
- No game code may use `window.PokiSDK`, CrazyGames globals or `localStorage`
  directly. Use `services.ads` and `services.createSave()`.
- Runtime must make zero external requests. Ad SDK scripts are injected only by
  the platform's channel builds.
- Fixed-step simulation with interpolation between ticks; never frame-rate
  driven movement.
- Input is queued/buffered; illegal reversals must not be accepted.
- Pause on blur/hidden/tab switch; resume with a 3-2-1 countdown.
- Difficulty, speed and AI tuning belong in configuration, not render code.
- Design space short side is 720 units; `Scale.FIT + CENTER_BOTH`.
- Chinese uses the system font stack; do not bundle CJK fonts.
- Every user-visible string exists in Chinese and English. `game.title` is
  required by the boot scene.
- Default language is English (`defaultLang: 'en'`); Chinese is available
  through the picker and `?lang=zh`.
- Save data has a `version`; changing fields requires a migration.
- Save keys are `mg:<gameId>:<name>`.
- Do not commit `node_modules/`, `dist/`, `release/` or secrets.

## Gameplay interaction rules

- In-world buying is proximity based. A player who stands still inside the
  configured range fills a dwell ring, and the purchase fires when it completes;
  walking resets the ring.
- Zone unlocks never use a single access point. The farm and kitchen unlock when
  the player stands anywhere inside `map.zoneAreas[zone]` or within
  `QUICK_BUY.zoneMargin` of that rectangle. `zoneAreas` is the single source of
  truth for the floor tint, the locked overlay and the trigger area.
- Zone unlocks take 0.5 s (`QUICK_BUY.zoneMs`); other quick buys use the
  thresholds in `src/logic/config.ts`.
- Stocking is area based as well. Standing within `INTERACT.stockMargin` of a
  shelf rectangle puts every carried product of that zone away; the shelf front
  is a band, not a point. `map.shelfAccess` stays the path target for customers,
  staff and the tutorial arrow, so keep every access point inside the margin.
  `stockReach()` in `src/logic/state.ts` drives the shelf highlight.
- The shop panel keeps its unlock buttons as a redundant path. Do not make an
  in-world unlock depend on opening the shop.
- `veg` stays free after the first sale and is not part of the paid zone quick
  buy.
- World captions are reserved for locked zones. `ZoneOverlay` draws the name,
  lock and price inside the world container, so they scale and scroll with the
  room and sit under `DaylightView` instead of floating above the day/night
  wash. The name fades in only when the player is near. Unlocked zones carry no
  text: beds, pens, stations and the shop panel identify them. Do not add
  permanent screen-space zone labels back.
- Onboarding marks the real interaction area, not a route. The guide picks the
  nearest empty bed, ripe crop or shelf with a small switch margin, outlines the
  trigger rectangle, floats a direction arrow beside the player and marks the
  destination with a landing arrow. Empty beds carry no hand: standing still
  opens the crop chooser, and the CC0 pointing hand belongs on the apple card
  inside that chooser. Do not bring back the dashed path or the bed finger. Swap
  tags and their hints stay
  hidden until the first sale, and empty-bed dwells pause after the first plant
  so the chooser cannot cover the stock or checkout prompt. Empty-bed price
  chips sit at the plot centre, and an unaffordable bed never auto-opens the
  chooser from the dwell (tapping it still does). The tutorial clock
  waits for the full fruit set, the first-sale shopper is already queued at the
  till while the tree grows, checkout points at the fence-side standing spot,
  full anger grants `CUSTOMER_TUNING.leaveGraceMs` before a shopper leaves, and
  an empty shelf is browsed for `CUSTOMER_TUNING.shelfWaitMs` before a miss.
- Plant beds are area triggers too: `distanceToRect(player, plotRect) <=
  QUICK_BUY.plotMargin`, never centre-point distance. A player standing between
  two rows must still reach both beds.
- Planting grids live in `PLANT_FIELDS` / the `fruitField` and `vegField` layout
  entries in `src/logic/shopMap.ts`. Fruit and vegetables may use different
  `cols × rows`; save validation reads `plantSlotCount`, so never hard-code a
  slot limit elsewhere.
- The pond is not an animal pen. Fishing triggers when the player stands still
  within `FISHING.margin` of the pond rectangle (`pondRect` in
  `src/logic/fishing.ts`), not at a single access point. After a catch the loop
  re-arms itself and keeps fishing while the player stays; only movement,
  leaving the rectangle or a full basket stops it. Fish never eat trough feed
  and pickers must skip them.
- Contact transfers (harvesting, stocking, feeding a trough and loading a
  kitchen station) fire while walking, with short cooldowns in `INTERACT`.
  They must never require the player to stop.
- Dwell interactions are reserved for purchases, menus and irreversible choices:
  quick buys, zone unlocks, plant chooser, staff nudges, the drink menu and the
  dining table. Free/contextual dwells use 500 ms; paid purchases use the
  one-second dwell.
  Every dwell must cancel on movement and show a visible ring. A dwell must never
  fire because the world changed under a stationary player, and it must never
  replace an existing crop: proximity advertises, it does not destroy.
- Every unavailable action answers a tap. Locked zone areas, staff signs,
  planted beds, disabled chooser cards, maxed or shortfall shop buttons and
  unaffordable drinks show a toast explaining the requirement; they never
  swallow the tap. A tap on a locked zone or staff sign only explains the
  gesture, it does not purchase: the dwell remains the purchase path.
- Toasts draw above every modal and picker and size themselves to their wrapped
  copy, so a failure caused inside the shop is still visible.
- Long action bars use capsule corners (`height / 2`). Product cards, chooser
  tiles and list rows keep the card radius; do not turn content cards into pills.
- Kitchen hoppers buffer `STATION_BUFFER_BATCHES` production batches per input
  slot. Walking past a machine pours matching carried goods in until the buffer
  is full; the output tray is collected on contact.
- The dining table is free and always unlocked: landscape uses the bottom-right
  four-seat table, portrait reuses the rest nook with a two-seat table. Tap a
  free chair, or stand still for `DINING.dwellMs` while carrying goods, to sit.
  The food panel lists every carried `ProductKind`; all 24 products are edible,
  each bite consumes one and stacks the `FOOD_BUFF` category time onto the shared
  drink timers (processed food adds all three). There is no per-visit limit.
  Seats are exclusive, and a seated player skips harvest, stock, feed, facility,
  fishing and quick-buy triggers until standing. Closing the panel stands up.
- Staff due for a break eat at the table. A carrying picker or chef eats one
  carried unit and keeps the rest; empty-handed staff, including the cashier,
  fetch one item from a stocked shelf and eat it. A meal resets their work timer
  and returns them to work. A carrying worker with no free seat keeps its load
  and finishes the delivery first; an empty-handed worker with no seat or no
  shelf food still drinks at the rest corner. Dining state is transient; it must
  not change the save version or shelf stock except for the fetched meal.
- The shop runs in five-minute working days (`DAY` in `src/logic/config.ts`),
  displayed as 09:00–21:00. The lighting curve in `src/ui/lighting.ts` starts the
  golden hour at 17:00 and deepens every hour to a full grey night at 21:00. The
  wash and practical-light pools sit at depth 3900–3904; `NightLife` fireflies,
  moths and the bat sit around 3910. All of it stays below the tutorial arrows,
  map offers and HUD. Fence lanterns are unlit by day and light with the same
  curve; never bring back the stacked coloured ellipse glow.
  New customers stop at `DAY.lastSpawnMs` (20:30), and the report appears only
  after the last shopper leaves. A 90 s grace clears a shopper stuck after
  closing. The report pauses the simulation, pays the tip and starts the next
  morning; there is no rent, quota or failure state. The clock only advances in
  `playing`/`shop` mode, so pause, blur and the report all stop the day.
- Daily counters (`revenue`, `served`, `entered`, `missed`, `scoreSum`) are
  transient. Save version 8 stores only `day`; reloading starts that morning
  again. `remapShopState` must subtract unserved shoppers cleared by a rotation
  from `day.entered`, otherwise rotating invents lost customers.
- After 19:30 the customer mix is weighted toward owl, raccoon, hedgehog and fox
  through `NIGHT_SPECIES_WEIGHT` and `pickCustomerSpecies`. The 7 s spawn
  cadence, the customer/queue caps and the "must have sellable stock" spawn gate
  stay unchanged; the seeded RNG keeps a replay deterministic.
- Satisfaction is scored per completed checkout: 100 minus 20 per skipped item
  and 20 when patience is below 30% at the till. Shoppers who leave without
  paying contribute 0 through the `entered` denominator. Tips are 2/5/8% at
  75/85/95 and only ever reward; low satisfaction never blocks customers or
  content. Do not show net profit in the report: one-off purchases would make
  every investment day look like a loss.
- Empty beds always show a compact coin price chip and are tappable: a short tap
  (or 500 ms dwell) opens the plant chooser. The chip shrinks to a small sticker
  sitting on the soil until the player is near.
- Crop swapping is explicit only: a long press on the bed (`INTERACTION.holdMs`)
  or a tap on its round shovel badge opens the chooser. Standing next to a bed never
  swaps, because a harvest empties the bed under the player's feet and an
  automatic chooser would fire on every pick. Every planted bed advertises a small
  round shovel badge just above its base: it fades in after the player stops for
  ~250 ms, only appears within ~130 units, and only the badge itself is tappable.
  The chooser is modal: movement input is locked until it closes through `×`, the
  backdrop or `Esc`, and it shows the planted crop and its refund. The old crop
  refunds half, and the new crop costs full price.
- Farm pens and kitchen stations are generic slots. `map.animalPens` and
  `map.stationSlots` are arrays; every farm product (including the pond) can be
  installed in any pen and every processed product in any station.
  `producerPosition` and `producerAccess` index by `slot`, never by product.
  Save version 7 stores the slot, rejects a duplicate product and relocates a
  duplicate slot instead of losing the producer.
- The kitchen's BBQ grill is the only pooled recipe: one batch consumes any two
  of the six vegetables, fish, eggs or cheese, may mix them, and always produces
  `skewer`. Save version 9 renames the old `grilledFish` producer to `skewer`;
  keep that alias in `migrateSave`.
- Producer swapping follows the crop rule: long press the pen/station or tap its
  pitchfork/wrench tag, never a proximity dwell. The tag appears after the
  player stops, fades over the last ~35 units, and only the tag itself is
  tappable. An empty slot opens the chooser after 500 ms or a short tap. The old
  producer refunds half, the new one costs full price, the player keeps carried
  goods and shelf stock, and a product can only be installed once.
- The beehive is the one farm producer without a trough (`ANIMALS.honey.feed` is
  `none`); the pond is manual. `feedSpace` returns 0 for both, and staff/pickers
  must skip them when looking for a trough.
- Plant deposits are per bed (`plant:<kind>:<slot>`). Never use one global
  deposit key for every slot; legacy `plant:<kind>` keys are read only on the
  first empty bed.
- Tap/long-press thresholds live in `INTERACTION` (`src/logic/config.ts`):
  `tapSlop`, `holdMs`, `plotHitPadding`, `labelHitPadding`. Drags beyond
  `tapSlop` must cancel a tap or long press. Do not hard-code these in scenes.
  A hold shows the `bed.holdSwap` cue after a quarter of `holdMs`, and the bed
  hit area never grows past the midpoint of the real row gap.
- Game-specific audio keys are registered through `audioSamples` and are not
  limited to the platform `SfxName` union; use `SoundName` for helper
  signatures. Fishing uses `fishCast` and `fishSplash`. Table meals use the
  dedicated `diningEat` key with two CC0 crunches copied from `xechoz/snake`
  (see `src/assets/audio/eat-crunches.LICENSE.txt`); harvest, feed and customer
  pickups keep the platform's synth `eat` cue. Staff drink breaks reuse the
  vending machine's gulp sample.
- Mobile defaults to landscape: the menu's Start button requests fullscreen and
  a best-effort `screen.orientation.lock('landscape')`. The lock stays optional:
  iOS Safari, browsers without the Screen Orientation API and embedded portals
  keep the portrait plan, and exiting fullscreen returns control to the device
  orientation.

## Commands

```bash
npm ci
npm run dev          # local dev server
# Dev builds and ?debug=1 show a bottom-right FPS chip in Menu and Game;
# release packages do not.
npm run check        # tsc + biome + game boundary checks
npm run test
npm run build
npm run package:web
npm run package:poki
npm run package:crazy:basic
npm run package:crazy:full
```

## Release

Push a `vX.Y.Z` tag. CI runs checks, builds all four flavors and creates a
GitHub Release with:

- `<id>-web.zip`
- `<id>-poki.zip`
- `<id>-crazygames-basic.zip`
- `<id>-crazygames-full.zip`

After the release, update `site/games.json` in `xechoz/mini-games` to the new
version. Do not commit or tag without an explicit request.
