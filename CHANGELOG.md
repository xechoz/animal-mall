# Changelog

## Unreleased

- Stock shelves from anywhere along the shelf instead of a single access point:
  the trigger is now the shelf rectangle plus a 70-unit margin, so both ends and
  the whole front count. Standing between the fruit and vegetable shelves stocks
  both at once, and a faint outline marks a shelf while there is something to put
  away and room to take it.
- Play a three-gulp CC0 drinking sound and a cup-to-mouth animation when buying
  a drink, with a small fizz burst for the apple soda. The drink machine also
  reacts to the purchase.
- Unlock the farm and kitchen by standing still anywhere inside or next to
  their locked zone for half a second once you can afford it, without opening
  the shop. The zone footprint drives the floor tint and the trigger, and the
  shop keeps its unlock buttons as an alternative.
- Re-arrange the background music from the 85.7 s source loop into a 3:05 loop:
  the recorded 50 bars are resequenced as A–B–C–D–A–B with a low-passed quiet
  section and a two-semitone bridge, still looping seamlessly at 140 BPM. The
  track is re-encoded at 64 kbps stereo, which keeps the bundle under the 2 MB
  first-load budget now allowed by the platform.
- Draw every fruit tree and vegetable with its own silhouette and produce:
  round apple trees, upright pear trees, wide peach canopies, forked cherries, a
  low strawberry bush, a grape trellis, carrot fronds, tomato vines, corn ears,
  ground pumpkins, potato tubers and hanging eggplants. Ripe crops now show the
  items themselves instead of a count badge above the plant.
- Move the portrait shop's fruit and vegetable zones next to the counter and the
  farm and kitchen zones to the back wall, so the opening harvest loop is short.
  Shelves and their access points move with the zones; the landscape plan is
  unchanged.
- Fix the cashier hire sign so it uses the same quick-buy flow as the picker:
  standing near the counter now deposits coins toward the cashier or hires them.
  Staff signs disappear once their station is fully hired, and staff portraits
  now show on their price tags.

## 0.1.0

- Let the player carry several kinds of goods in one basket. Harvesting empties
  the nearest ready producer in one pick, stocking unloads every carried product
  belonging to that shelf's zone, and feeding pours every carried plant into the
  trough. Capacity is still shared across all kinds.
- Scale the whole interface for phones: HUD text, buttons, menus, dialogs, the
  shop panel and in-world labels now grow up to 1.55x on small screens while
  tablets and desktops keep their current layout. The shop panel uses three
  columns and the full viewport in landscape so the larger cards still fit.
- Add strawberry, grape, potato and eggplant, bringing each production zone to
  six plantable crops. The shop and plant chooser lay out six cards per zone.
- Animals no longer eat directly from shelves. Each animal has a trough that the
  player fills by standing near it with produce, or that pickers fill with what
  they harvest. The animal eats the cheapest whole item in the trough each
  production cycle.
- Add a bottom-right trash bin: standing near it for half a second with goods in
  hand discards the whole carried stack, with a progress ring and toast.
- Add a free drink machine for staff breaks and a paid player menu with three
  timed buffs: apple soda (speed), milk tea (carry capacity) and lemon tea
  (scanner speed).
- Staff now work for roughly a minute before walking to the drink machine. They
  return automatically 60% of the time; otherwise they lounge until the player
  walks over and nudges them. Cashiers only leave when the counter is quiet.
- Add a dev-only `DEV` button to the HUD that opens live tuning for product and
  drink sell prices and the current coin balance. It appears on the Vite dev
  server and with `?debug=1`; overrides reset on reload.
- Add logic tests for facility dwell, drink purchases, buff effects, staff
  breaks and nudging.
- Move the mobile landscape HUD into a left vertical rail, freeing the top of
  the screen for the shop; phones and tablets with plenty of vertical space keep
  the existing top bar in portrait and on desktop.
- Shrink mobile edge padding and scale mobile rooms from their walkable bounds,
  so the decorative outer wall is cropped at the screen edge instead of leaving
  wide borders around the shop.
- Enlarge landscape zone headers and dim locked zones with an unlock lock instead
  of leaving only tiny shelf locks. A compact four-zone status strip in the
  mobile rail shows lock state, ready output and hungry producers.
- Make crop beds walkable for the player and NPCs; shelves, animal pens,
  processing stations and the counter still block movement.
- Draw crop beds as a ground layer so the player stands on the soil while the
  plants overlap them, and sort shop objects by footprint depth instead of
  creation order.
- Let customers and picker staff take bounded, seeded scenic detours so the shop
  feels busy instead of everyone walking the same shortest line.
- Support both orientations with dedicated shop plans: the tall plan in
  portrait and a wide four-column plan in landscape. Rotating keeps coins,
  trees, upgrades, deposits and pending counter coins, resets transient
  shoppers and returns the player to the door.
- Expand the shop into four zones: fruit, vegetables, farm and kitchen, with
  fifteen products and a 680×1200 portrait plan.
- Add vegetables, farm animals and ponds. Animals eat fruit or vegetables from
  the shelves and keep one unit for customers; the pond produces fish.
- Add processing stations: the oven turns eggs and milk into cake, the loom
  turns yarn into sweaters and the grill turns fish into grilled fish. Station
  output is collected by the player.
- Add zone unlocks, producer purchases, feed and recipe details, and a
  production-first shop panel with zone tabs.
- Add customer demand for farm and kitchen goods, weighted by zone, and
  generalize picker staff to harvest every producer.
- Add a free vegetable zone after the first sale, farm and kitchen unlock
  costs, and a longer goal chain.
- Bump the save to version 3 with zones and producers; version 2 fruit trees,
  upgrades, staff and deposits migrate automatically.
- Add navigation, production-chain, feeding-reserve, recipe and save migration
  tests.
- Add a looping CC0 background track that follows the sound setting and the
  host mute, and keeps playing across the menu and gameplay.
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
