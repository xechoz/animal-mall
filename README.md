# Animal Mall · 动物小商店

A cozy endless fruit-shop game built with Phaser 4 on
[`xechoz/mg-platform`](https://github.com/xechoz/mg-platform).

Plant fruit trees, harvest by walking past them, stock the matching shelves and
serve the neighborhood animals near the counter. Hire a cashier and pickers to
keep the shop running, or use the in-world quick-buy signs to plant and hire
without opening the shop. There is no timer or failure state: customers keep
arriving, and a missed sale only costs that sale.

## Play

- Press and drag anywhere on the play field to move; there is no visible stick.
  WASD / arrow keys also work and take priority while held.
- Harvest, stocking and checkout happen automatically when you are close enough.
  The counter has a wide service area, so you no longer need a single register
  tile.
- Walk to an empty plot and stop to open the icon-only fruit chooser. Tap a
  fruit to plant it. If you cannot afford it, every current coin becomes a
  non-refundable deposit and the remaining price stays on the plot.
- Staff signs near the plots and counter use the same quick-buy flow. A cashier
  serves customers automatically; pickers harvest and stock shelves. Cashier
  income waits as a coin pile on the counter until you walk back to collect it.
- The shop stays live: customers, staff and coin piles keep running while it is
  open. Closing it returns to play immediately.
- Removing a tree refunds half its cost; the last tree cannot be removed if the
  refund would leave you unable to replant. Customers only order fruit that has
  been stocked at least once.

The game starts with 100 coins and an in-world guide for the first apple tree.

## Save and language

- Progress is stored as `mg:animal-mall:progress`, save version `2`.
- Coins, pending counter coins, earned coins, served customers, planted trees,
  tool levels, staff levels and non-refundable deposits persist. The shop
  layout, customers and fruit reset on reload.
- Version 1 saves migrate automatically; stranded deposits are returned to coins
  so an old save cannot lock the player out of planting.
- English is the default language. Chinese is available from the language picker
  or with `?lang=zh`; other supported picker languages fall back to English.
- All art and audio are procedural or generated in code; the runtime makes no
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

- `src/logic/` — pure shop simulation, navigation, purchases, quick-buy
  deposits, staff AI and save migration.
- `src/scenes/` — menu and game scenes; fixed 60 Hz simulation with render
  interpolation and a live shop overlay.
- `src/ui/` — procedural art, layout, joystick, HUD, map offers, fruit chooser,
  staff and coin-pile views, panels and overlays.
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
