# Animal Mall · 动物小商店

A cozy endless management game built with Phaser 4 on
[`xechoz/mg-platform`](https://github.com/xechoz/mg-platform).

Grow six fruits and six vegetables, raise chickens, cows, sheep and pond fish,
then turn their produce into cakes, sweaters and grilled fish. Stock four zone
shelves and serve the neighborhood animals at the counter. Each animal has a
trough: put produce in it yourself or let a picker fill it, and the animal eats
the cheapest item first. Hire a cashier and pickers to keep the shop running, or
use the in-world quick-buy signs to buy without opening the shop. There is no
timer or failure state: customers keep arriving, and a missed sale only costs
that sale.

## Play

- Press and drag anywhere on the play field to move; there is no visible stick.
  WASD / arrow keys also work and take priority while held.
- The shop adapts to both orientations: a tall plan in portrait and four zones
  in a row in landscape. On phones and tablets the landscape HUD becomes a left
  vertical rail; desktop keeps the top bar. Rotating pauses and remaps the run
  without losing coins, plants, upgrades or deposits. Each zone has one shelf
  for its products.
- Harvest, stocking and checkout happen automatically when you are close enough.
  The counter has a wide service area.
- Walk to an empty plot and stop to open the plant chooser. Fruit trees and
  vegetable crops grow on their own; harvested goods go to the matching shelf.
- Every animal has a trough in front of its pen. Carry fruit or vegetables to
  the trough and stand still to drop them in one by one; pickers also fill
  troughs with produce they harvest. Animals eat the cheapest item in the
  trough, one whole item per production cycle. An empty trough shows a feed
  icon and the animal waits until you or a picker fills it. Trough contents are
  not saved and reset on reload.
- Kitchen stations pull eggs, milk, yarn or fish from the farm shelf and leave
  one of each for customers. Finished cakes, sweaters and grilled fish wait on
  the station tray; walk up to collect them and stock the kitchen shelf.
- Staff signs use the same quick-buy flow. A cashier serves customers
  automatically; pickers harvest fruit, vegetables and animal products, but not
  station output. Cashier income waits as a coin pile on the counter.
- Staff take breaks at the free drink machine in the bottom-left corner. After
  roughly a minute they walk over, drink for a few seconds and then either
  return on their own or lounge until you walk up and nudge them. A cashier only
  leaves when the counter is quiet.
- Stand in front of the drink machine for half a second to open the paid drink
  menu: apple soda (+15% move speed), milk tea (+3 carry capacity) or lemon tea
  (+25% scanning speed), each for 45 seconds. Drinks are free for staff; player
  drinks cost coins and refresh their timer when bought again.
- The trash bin is in the bottom-right corner. Stand near it with goods in hand
  for half a second and the whole carried stack is discarded automatically.
- The shop stays live while open. Removing a plant refunds half its cost; the
  last producer cannot be removed if the refund would leave you unable to
  replant. Customers only order products that have been stocked at least once.

The game starts with 100 coins and an in-world guide for the first apple tree.
Fruits are apple, pear, peach, cherry, strawberry and grape; vegetables are
carrot, tomato, corn, pumpkin, potato and eggplant. Vegetables unlock
automatically after the first sale; the farm and kitchen are bought in the shop.

## Save and language

- Progress is stored as `mg:animal-mall:progress`, save version `3`.
- Coins, pending counter coins, earned coins, served customers, zones, planted
  crops, animals, stations, tool levels, staff levels and non-refundable
  deposits persist. Shelf stock, trough contents, station progress, customers,
  staff break state and temporary drink buffs reset on reload.
- Version 2 fruit-tree saves migrate automatically: old trees become producers,
  vegetables unlock if the save has served customers, and stranded deposits are
  returned to coins.
- English is the default language. Chinese is available from the language picker
  or with `?lang=zh`; other supported picker languages fall back to English.
- All art is drawn procedurally with Phaser Graphics; the soundtrack is a CC0
  loop (see `src/assets/audio/joyful-jungle.LICENSE.txt`). The runtime makes no
  external requests.

## Development

The platform is a git submodule pinned at `v4.1.0`:

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
