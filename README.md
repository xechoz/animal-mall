# Animal Mall · 动物小商店

A cozy endless management game built with Phaser 4 on
[`xechoz/mg-platform`](https://github.com/xechoz/mg-platform).

Grow six fruits and six vegetables, raise chickens, cows, sheep, goats and bees,
then fish at the pond and turn the produce into cakes, sweaters, grilled fish,
juice, jam and ice cream. Stock four zone shelves and serve the neighborhood
animals at the counter. Each land animal has a trough: put produce in it
yourself or let a picker fill it, and the animal eats the cheapest item first.
Hire a cashier and pickers to keep the shop running, or use the in-world
quick-buy signs to buy without opening the shop. There is no timer or failure
state: customers keep arriving, and a missed sale only costs that sale.

## Play

- Press and drag anywhere on the play field to move; there is no visible stick.
  WASD / arrow keys also work and take priority while held.
- The shop adapts to both orientations: a tall plan in portrait and four zones
  in a row in landscape. On phones and tablets the landscape HUD becomes a
  floating left column — a coin pill at the top and the shop and pause buttons
  at the bottom, with no panel behind them; desktop and portrait keep the coin
  pill on the left and the buttons on the right.
  The shop recommends the next purchase with a `NEXT` pill on the matching card
  and a dot on the zone or tab that leads there. Phones also scale the interface
  up
  (`src/ui/scale.ts`) so HUD text, buttons and in-world labels stay readable;
  tablets and desktops keep 1:1 design units. Rotating pauses and remaps the run
  without losing coins, plants, upgrades or deposits. On phones, tapping Start
  requests fullscreen and tries to lock the screen to landscape; the lock is
  best-effort, so iOS Safari, browsers without the Screen Orientation API and
  embedded portals keep the portrait plan, and exiting fullscreen returns
  control to the device orientation. Each zone has one shelf for its products.
- Harvest, stocking and checkout happen automatically when you are close enough.
  The counter has a wide service area.
- The locked farm and kitchen zones can be bought in place: stand still anywhere
  inside one, or just next to it, for half a second once you can afford it. The
  shop still lists both zones as an alternative.
- Every empty plot shows a coin price sticker, so bare soil never looks dead.
  Tap the plot (or its sticker) to open the plant chooser immediately, or just
  stop next to it for half a second. Fruit uses a 2×3 field and vegetables a 3×4
  field; both grids are configuration in `src/logic/shopMap.ts`, so the counts
  can be tuned without touching save or UI code. Fruit trees and vegetable crops
  grow on their own; harvested goods go to the matching shelf.
- Hold a finger on a planted bed, or tap its round shovel badge, to open the crop
  chooser and swap it. Standing next to it never does: a harvest empties the bed
  under your feet, so a proximity chooser would fire on every pick. Every planted
  bed shows the badge just above its base; it fades in after you stop and only
  the badge itself is tappable, so walking past or tapping the crop does nothing.
  The old crop refunds half its cost and the new one costs full price. The
  chooser is modal: movement is locked until you close it with `×`, the backdrop
  or Esc, and it shows the current crop and its refund. The shop's production tab
  still has the remove button as a fallback. Partial payments stay on the bed
  where they were paid; other beds keep their normal price instead of all showing
  the same deposit ring.
- The farm has four animal slots and the kitchen four machine slots. Any farm
  animal, including the pond, can go in any farm slot; any machine can go in any
  kitchen slot. Empty slots show a plus sticker: tap it or stand still for half a
  second to choose. To change an installed one, hold the pen/station or tap its
  pitchfork/wrench tag. The chooser is modal, shows the current product and
  refund, refunds half of the old one and charges full price for the new one.
  Carried goods and shelf stock survive a swap, and the same animal or machine
  cannot be installed twice.
- Land animals have a trough in front of their pen. Walking close with fruit or
  vegetables fills it automatically, cheapest produce first; pickers also fill
  troughs with produce they harvest. The trough shows each item currently
  inside, and a hungry animal asks for food with a local bubble. Animals eat
  the cheapest item in the trough, one whole item per production cycle. Trough
  contents are not saved and reset on reload. The goat works like the other
  trough animals; the beehive is the exception and makes honey on its own.
- The pond is one of the farm-slot options, not a fixed pen: install it in any
  empty farm slot and the fishing spot moves with it. Stand anywhere around it
  without moving for half a second to cast; half a second later the line bites
  and one fish goes into your basket. Keep standing and the loop repeats
  automatically (cast, catch, short pause, cast again). Moving, leaving the pond
  or filling the basket stops it; freeing basket space resumes it without
  walking away. Pickers do not fish and the pond has no trough. Replacing the
  pond removes fishing until it is installed again.
- Kitchen stations pull eggs, milk, yarn, fish, fruit or vegetables from the
  matching shelf and leave one of each for customers. Walking past a machine with
  matching goods loads its hopper automatically, up to three production batches;
  finished cakes, sweaters, grilled fish, juice, jam and ice cream wait on the
  station tray and are collected on contact, ready to stock the kitchen shelf. A hired chef does
  that loop for you: finished dishes go to the kitchen shelf, and idle stations
  get their hoppers topped up from shelf stock.
- Staff signs use the same quick-buy flow and disappear once their station is
  fully staffed. A cashier serves customers
  automatically; pickers harvest fruit, vegetables and land-animal products, but
  not station output or the pond. Chefs only work once the kitchen is unlocked.
  Cashier income waits as a coin pile on the counter.
- Staff take breaks at the dining table or the free drink machine in the
  bottom-left corner. After roughly a minute they eat when a chair is free and
  they have food (their carried load, or one item fetched from a stocked shelf);
  otherwise they drink. A meal returns them to work, while a drink break can end
  with them lounging on a stool until you walk up and nudge them. Tap a resting
  character or stand next to them for half a second; the HUD button remains as a
  fallback. A cashier only leaves when the counter is quiet.
- Stand in front of the drink machine for half a second to open the paid drink
  menu: apple soda (+15% move speed), milk tea (+3 carry capacity) or lemon tea
  (+25% scanning speed), each for 45 seconds. Drinks are free for staff; player
  drinks cost coins and refresh their timer when bought again. Buying one makes
  the bear raise a cup, take a sip and swallow, with a fizz bubble burst for the
  apple soda.
- The dining table is free and always available. Landscape puts a four-seat
  table in the bottom-right; portrait reuses the bottom-left rest nook with a
  smaller two-seat table. Tap a free chair, or stand still for half a second
  while carrying goods, to sit. The panel lists every carried product — fruit,
  vegetables, animal goods, cakes, even sweaters and yarn — and each tap eats
  one with no limit. Food adds the matching drink buff: fruit speed, vegetables
  carry capacity, farm goods scanning, processed food all three. Stand up with
  the button, `×`, the backdrop or `Esc`, or press a movement key.
- Staff who are due for a break eat at the table. Pickers and chefs eat one of
  the goods they are already carrying and keep the rest; empty-handed staff,
  including the cashier, walk to a stocked shelf, fetch one item and eat it. A
  meal resets their break timer and returns them to work. If the table is full
  or the shelves are empty they still use the drink machine.
- The trash bin is in the bottom-right corner. Stand near it with goods in hand
  for half a second and the whole carried stack is discarded automatically.
- The shop stays live while open. Removing a plant refunds half its cost; the
  last producer cannot be removed if the refund would leave you unable to
  replant. Customers only order products that have been stocked at least once.
- Standing still is the main interaction verb. Free/contextual actions resolve
  after 500 ms (open a bed, pen or station chooser, unlock a zone, fish, open the
  drink menu, nudge staff, discard goods); paid purchases keep the longer
  one-second dwell so a passing tap cannot spend coins. Crop and animal/machine
  swapping is the exception: it is explicit only, via a long press or the
  shovel/pitchfork/wrench tag, because a harvest or a swap would otherwise fire
  under a stationary player. Walking always cancels the ring.
- Beds, pens, stations and offer labels are tappable as well. A short tap plants
  or opens an empty slot, a `INTERACTION.holdMs` long press swaps with a "Hold to
  swap" cue, and dragging farther than `INTERACTION.tapSlop` cancels both.
  Empty-bed price stickers and labels get extra touch padding from
  `INTERACTION`; the bed touch area stops at half the row gap so neighbouring
  plots never overlap.
- Unhappy customers show it: a missing product, a long queue or a slow checkout
  turns the patience bar red, adds angry brows and cheeks, a comic anger vein on
  the temple and flickering flames over the head with rising embers. The thought
  bubble gives way to the fire while they are angry. They still leave normally;
  there is no failure state.

The game starts with 100 coins and an in-world guide for the first apple tree.
Fruits are apple, pear, peach, cherry, strawberry and grape; vegetables are
carrot, tomato, corn, pumpkin, potato and eggplant. Vegetables unlock
automatically after the first sale; stand anywhere inside the locked farm or
kitchen zone for half a second to buy it, or unlock it in the shop. Farm
animals are chicken, cow, sheep, goat, beehive and the pond; kitchen machines
are oven, loom, grill, juicer, jam pot and churn.

## Save and language

- Progress is stored as `mg:animal-mall:progress`, save version `7`.
- Coins, pending counter coins, earned coins, served customers, zones, planted
  crops, animals, stations, tool levels, per-zone shelf levels, staff levels and
  non-refundable deposits persist. Shelf stock, station hoppers, trough contents,
  fishing state, station progress, customers, staff break state and temporary
  drink buffs reset on reload.
- Version 2–4 saves migrate automatically: old trees become producers,
  vegetables unlock if the save has served customers, stranded deposits are
  returned to coins, and the expanded planting slots start empty. Version 5
  copies the old global shelf level onto every zone. Version 6 adds the chef
  staff slot at level 0. Version 7 makes pens and stations generic slots: old
  fixed pens keep their slot index 1:1, duplicate products are rejected and a
  repeated slot is moved to the first free pen or station.
- English is the default language. Chinese is available from the language picker
  or with `?lang=zh`; other supported picker languages fall back to English.
- All art is drawn procedurally with Phaser Graphics; the soundtrack, drink
  gulp, fish cast and fish splash are CC0 audio assets (see
  `src/assets/audio/*.LICENSE.txt`). The runtime makes no external requests.

## Development

The platform is a git submodule pinned at `v4.3.0`:

```bash
git clone --recurse-submodules <this-repo>
npm ci
npm run dev
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on port `5176` |
| `npm run check` | Typecheck, Biome and game boundary checks |
| `npm run test` | Vitest rules and save-migration tests |
| `npm run build` | Production self-hosted build |
| `npm run package:web` | `<id>-web.zip` release asset |
| `npm run package:poki` | Poki build |
| `npm run package:crazy:basic` | CrazyGames lifecycle build |
| `npm run package:crazy:full` | CrazyGames lifecycle + ads build |

### Dev tuning

On `npm run dev` (or with `?debug=1`) the HUD shows a small `DEV` button. It
opens a live panel for the current coin balance and the sell price of every
product and drink. Price changes apply immediately to checkout and the drink
menu; they are intentionally in-memory only and reset on reload. The button is
not shown in production builds unless `?debug=1` is present.

Source layout:

- `src/logic/` — pure shop simulation, the portrait and landscape floor plans,
  navigation, purchases, production, feeding, quick-buy deposits, facilities,
  staff AI and save migration.
- `src/scenes/` — menu and game scenes; fixed 60 Hz simulation with render
  interpolation and a live shop overlay.
- `src/ui/` — procedural art, responsive layout, joystick, HUD, map offers, plant
  chooser, producer/shelf views, staff and coin-pile views, facility and drink
  overlays, the dev tuning panel, panels and dialogues.
- `src/i18n.ts` — English and Chinese copy.
- `src/save.ts` — versioned save adapter.

## Platform updates

```bash
cd platform
git fetch --tags
git checkout vX.Y.Z
cd ..
npm install
git add platform package-lock.json
git commit -m "chore: platform vX.Y.Z"
```

Do not edit `platform/` in place; changes belong in the platform repository.
