# Animal Mall — Agent Instructions

This repository contains exactly one game. Shared infrastructure lives in the
`platform/` git submodule (`xechoz/mg-platform`), pinned to `v4.1.0`.

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
- `src/i18n.ts`, `src/save.ts` — localized copy and versioned save migration.
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

## Commands

```bash
npm ci
npm run dev          # local dev server
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
