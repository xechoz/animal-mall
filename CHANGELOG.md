# Changelog

## Unreleased

- Replace the fixed register tile with a counter-wide service area.
- Add icon-only in-world price signs and a fruit chooser for empty plots.
- Add dwell-based quick buying with non-refundable deposits, deposit locking and
  shop-wide deposit reuse.
- Add cashier and picker staff with map hire signs, automatic checkout,
  harvesting and stocking.
- Add counter coin piles: cashier income waits on the counter and is banked with
  a coin-bag cue when the player returns.
- Keep the shop live: simulation continues while it is open and closing it
  resumes immediately without a countdown.
- Reduce main-screen text: icon-based HUD goal, icon-only map signs and shelves,
  one-word tutorial prompts, and an in-world first-tree guide.
- Add last-tree and opening-fund guards so non-refundable deposits cannot strand
  the player.
- Bump the save to version 2 with staff, pending coins and deposits; version 1
  saves migrate automatically.
- Fix joystick input on scaled and High-DPI canvases by converting pointer
  coordinates into design space.
- Replace the fixed joystick with invisible drag-anywhere steering; pressing a
  HUD button still clicks the button instead of steering.
- Reset movement input on focus, visibility, fullscreen and pause transitions so
  a lost key-up can no longer leave the player stuck.

## 0.1.0

- Add the endless animal fruit-shop loop: plant trees, harvest, stock shelves,
  check out customers and reinvest coins.
- Add four fruit trees with shared shelves, three-level tools, refunds and shelf
  locking.
- Add fixed-step simulation, grid A* customer navigation, analog joystick and
  keyboard controls.
- Add procedural shop, animal and fruit art with no external runtime assets.
- Add English and Chinese copy, settings, language picker, fullscreen and
  orientation-safe pause/countdown flow.
- Add versioned progress save with tree, upgrade and customer-count restoration.
- Add Vitest coverage for navigation, purchases, simulation and save migration.
