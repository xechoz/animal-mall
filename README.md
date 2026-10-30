# Animal Mall · 动物小商店

A cozy endless management game built with Phaser 4 on
[`xechoz/mg-platform`](https://github.com/xechoz/mg-platform).

Grow fruit and vegetables, raise chickens, cows, sheep and pond fish, then turn
their produce into cakes, sweaters and grilled fish. Stock four zone shelves and
serve the neighborhood animals at the counter. Animals eat fruit or vegetables
from the shelves, so the four production chains feed each other. Hire a cashier
and pickers to keep the shop running, or use the in-world quick-buy signs to buy
without opening the shop. There is no timer or failure state: customers keep
arriving, and a missed sale only costs that sale.

## Play

- Press and drag anywhere on the play field to move; there is no visible stick.
  WASD / arrow keys also work and take priority while held.
- The shop is a single portrait screen with four zones: fruit (top-left),
  vegetables (top-right), farm (bottom-left) and kitchen (bottom-right). Each
  zone has one shelf for its products.
- Harvest, stocking and checkout happen automatically when you are close enough.
  The counter has a wide service area.
- Walk to an empty plot and stop to open the plant chooser. Fruit trees and
  vegetable crops grow on their own; harvested goods go to the matching shelf.
- Animals eat fruit or vegetables from the shelves. Each animal keeps one unit
  for customers, so a shelf needs more than one unit before it can feed a
  producer. A hungry animal waits and shows a feed icon until you restock.
- Kitchen stations pull eggs, milk, yarn or fish from the farm shelf and leave
  one of each for customers. Finished cakes, sweaters and grilled fish wait on
  the station tray; walk up to collect them and stock the kitchen shelf.
- Staff signs use the same quick-buy flow. A cashier serves customers
  automatically; pickers harvest fruit, vegetables and animal products, but not
  station output. Cashier income waits as a coin pile on the counter.
- The shop stays live while open. Removing a plant refunds half its cost; the
  last producer cannot be removed if the refund would leave you unable to
  replant. Customers only order products that have been stocked at least once.

The game starts with 100 coins and an in-world guide for the first apple tree.
Vegetables unlock automatically after the first sale; the farm and kitchen are
bought in the shop.

## Save and language

- Progress is stored as `mg:animal-mall:progress`, save version `3`.
- Coins, pending counter coins, earned coins, served customers, zones, planted
  crops, animals, stations, tool levels, staff levels and non-refundable
  deposits persist. Shelf stock, station progress and customers reset on reload.
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

Source layout:

- `src/logic/` — pure shop simulation, navigation, purchases, production,
  feeding, quick-buy deposits, staff AI and save migration.
- `src/scenes/` — menu and game scenes; fixed 60 Hz simulation with render
  interpolation and a live shop overlay.
- `src/ui/` — procedural art, portrait layout, joystick, HUD, map offers, plant
  chooser, producer/shelf views, staff and coin-pile views, panels and overlays.
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
