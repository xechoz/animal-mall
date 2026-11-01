# Changelog

## Unreleased

- Simplify the top HUD: the full-width parchment bar is gone, leaving a floating
  coin pill on the left and the shop and pause circles on the right with their
  own shadow and ring. The middle "next purchase" hint, its item icon, price and
  progress bar were removed; the same recommendation now sits on the item that
  fulfils it — a NEXT pill on the plant or tool card, an accent frame on the
  empty pen or station in that zone, an accent row inside the producer picker
  and a dot on the tab or zone chip that leads there. The pill turns muted when
  the player cannot afford it yet. The mobile landscape rail drops its panel and
  its zone overview as well: only the coin pill and the shop and pause circles
  remain, floating over the left edge.

- Rework how animals walk. Gaits are driven by the distance actually travelled,
  so cadence follows the player's speed upgrades and each staff member's pace.
  Rabbits and frogs hop with both feet, bears, pandas and pigs waddle, and cats,
  foxes and dogs trot. Bodies squash and stretch, shadows stay grounded and
  shrink in the air, paws alternate, heads trail the body, tails wag, eyes
  blink, and hopping animals kick up a small landing puff. Walkers now use
  layered body/head/tail/paw textures so those parts can move separately;
  portraits, the menu and the shop cards keep the original single texture.

- Compress the bundled audio: the music is now a 40 kbps stereo MP3 cut down to
  the 109.7 s A-B-C-D loop, and the four WAV effects are 128 kbps mono MP3. The
  web package drops from about 2.1 MB to 1.1 MB, with the same sound keys and
  licences.
- Rebalance the shop floor plan: the four product zones are wider and taller,
  the dirt aisles and service band are narrower, and the dining/rest nook now
  sits fully in the service area instead of overlapping the orchard. Aisles are
  part of the map data, so the floor art and the walkable gaps cannot drift.
- Add a free dining area: a four-seat table in the landscape bottom-right and a
  two-seat nook replacing the portrait rest corner. Tap a chair or stand still
  for half a second while carrying goods to sit, then eat any carried product
  from the food panel with no limit. Fruit extends the speed buff, vegetables
  the carry buff, farm goods the scanning buff, and processed food all three.
  Staff due for a break dine too: carrying pickers and chefs eat one of their
  goods, while empty-handed staff and the cashier fetch one item from a stocked
  shelf. Meals reset the staff break timer; carrying staff with no free chair
  finish their delivery first, and empty-handed staff with no shelf food still
  drink. Dining is transient and leaves the save version unchanged.
- Give table meals the snake game's two CC0 eating-crunch samples under a
  dedicated `diningEat` key; harvest, feed and customer pickups keep the
  original synth cue. Staff drink breaks now play the same gulp sample as the
  vending machine.
- Carried goods now stack up from the player's and staff's hand instead of
  floating above their heads, and the pile flips sides with the character.
- Restyle the game as a sunlit forest market: a lighter layered forest
  backdrop, split-rail fences around the shop and pens, dirt paths, mossy
  organic zone clearings, colourful trees with varied fruit, wildlife such as
  squirrels, hedgehogs, birds, frogs, ants and fireflies, wooden sign tags, and
  parchment/bark frames for the HUD, shop panel and modals. All art stays
  procedural, so there are no new assets or runtime requests.
- Add a chef staff member (800 / 1800 coins) for the kitchen. Chefs carry
  finished dishes from station trays to the kitchen shelf and top up idle
  station hoppers with shelf ingredients; leftovers go back on their shelf.
  The hire sign and shop card only appear once the kitchen is unlocked, two
  chefs claim different stations, and older saves gain a zero-level chef.
- Farm pens and kitchen stations are now generic slots. Any of the six farm
  animals (chicken, cow, sheep, goat, beehive, pond) can go in any of the four
  pens; any of the six machines (oven, loom, grill, juicer, jam pot, churn) in
  any of the four stations. Hold a pen/station or tap its pitchfork/wrench tag
  to swap, or tap/stand at an empty slot to choose. Replacing refunds half of
  the old producer, charges full price for the new one, keeps carried goods and
  shelf stock, and never installs the same product twice.
- Add goats (cheese), beehives (honey), jam pots (jam) and ice-cream churns
  (ice cream). The beehive makes honey on its own and needs no trough; the goat
  eats produce like the other land animals.
- The pond is now a farm-slot option rather than a fixed pen. Installing it in
  any slot moves the fishing spot; replacing it removes fishing until the pond
  is installed again.
- Save version 7 stores the producer slot for pens and stations, rejects a
  duplicate product and relocates a repeated slot. Older fixed-pen saves keep
  their slot index 1:1.
- Crop swapping is explicit only. Standing next to a planted bed no longer opens
  the chooser after 500 ms: a harvest empties the bed under the player, so the
  old dwell fired on almost every pick. Hold the bed or tap its shovel badge
  instead.
- The crop chooser is a real modal now: movement is locked while it is open,
  `×`, the backdrop and Esc close it, tapping the panel padding no longer closes
  it, and it shows the current crop, its refund and a check on the planted one.
  Long presses show a "Hold to swap" cue, bed touch areas stop at half the row
  gap instead of overlapping the next vegetable row, and the shovel badge pulses
  when the player is close.
- Swap tags are now a single round shovel badge at the base of every planted bed,
  including mature crops. It fades in only after the player stops, uses a
  badge-only touch target, and sits just above the soil instead of over the
  canopy, so walking past or tapping the crop no longer opens the chooser.
- Swapping a crop lifts the old crop off the bed and floats the refund over the
  plot before the new sapling appears.
- Default mobile play to landscape: tapping Start now requests fullscreen and
  tries to lock the screen orientation to landscape. The lock is best-effort;
  iOS Safari, browsers without the Screen Orientation API and embedded portals
  keep the portrait layout, and exiting fullscreen returns control to the
  device orientation.
- Touch presses on the play field now draw a floating joystick ring and knob
  under the finger; mouse drags stay invisible on desktop.
- Rework the orchard and vegetable plots: rectangular tilled beds, seed holes
  and a small seed-packet marker on every empty slot, a proper grass lawn with
  tufts around planted fruit trees, and a darker, mostly bare vegetable field
  with far less grass. Empty-bed price chips now sit just above the soil, and
  the old elliptical soil placeholders are gone.
- Kitchen stations now load carried ingredients on contact while walking, with
  no dwell, and buffer three production batches per input slot. Output is still
  collected on contact, and the input chips show `have/capacity`.
- Feeding is also a contact transfer now: walking past a trough fills it with
  the cheapest carried produce, and standing at the trough collects the animal's
  finished egg, milk or yarn.
- Give each kitchen station its own three-quarter-view machine and work mat:
  brick oven, wooden loom, stone grill and metal juicer, with small animated
  glow, smoke, shuttle and bubble details.
- Add indoor farm-market scenery: grass and tilled soil in the growing zones,
  stone kitchen tiles, a garden strip, flowers, pebbles, mushrooms, potted trees,
  ladybug/snail details and animated butterflies, bees and a dragonfly. The
  outdoor backdrop gains a soft sky, grass lip and distant trees without
  changing the shop footprint.
- Show the actual contents of every trough with produce icons, pulse an empty
  trough while an animal is hungry, and replace the ambiguous `!` with a local
  `Feed me!` bubble. Input chips now show the multi-batch hopper capacity.
- Rework the fishing samples with soft fade-ins and tails, lower playback gain
  and slight pitch variation so repeated casts and catches are less abrupt.
- Add a juicer station and Fresh Juice to the kitchen. The recipe accepts any
  one fruit and any one vegetable, and the station pulls them from the matching
  shelves; the juicer has its own art, product icon and save slot.
- Let kitchen stations start a batch with exactly the listed ingredients
  (`AUTO_RESERVE` removed), show live `have/need` counts on every input, and
  report a full output tray. The hand-loaded hopper is filled on contact instead
  of after a dwell, and now holds several batches.
- Keep shelf stock when a crop or machine is swapped or removed. Customers now
  order both producible goods and clearance stock, and every customer considers
  at least one clearance item so old stock cannot sit forever. Fruit and
  vegetable shelves show all six possible bins, including leftover stock.
- Replace the single global shelf upgrade with per-zone shelf levels. Each
  shelf shows a tap-to-buy upgrade arrow only while the next level is
  affordable, and the shop's zone tab includes the same upgrade as a redundant
  path. Save version 5 copies the old global level onto every zone.
- Give pen animals idle, walking and lying-down behaviour inside their pens,
  plus a hungry stomp toward the trough, species calls, angry brows and
  periodic speech bubbles. The cow, chicken and sheep calls are trimmed from
  free Mixkit recordings (see the adjacent `*.LICENSE.txt` files). All of it is
  cosmetic and leaves simulation positions untouched.

- Upgrade the platform submodule to v4.3.0, whose `AudioManager` accepts
  game-specific sound keys instead of only the eight built-in `SfxName` values.
  Animal Mall registers two dedicated fishing sounds: `fishCast` and
  `fishSplash`, both generated locally as CC0 WAV files.
- Give animals, shelves and facilities a second art pass: shaded customer/staff
  sprites with curved tails and species details, pen animals with feathers,
  wool and cow markings, market-stall shelves with wicker baskets, and more
  detailed counters, hire signs, vending machines, bins and stations.
- Add one-shot tutorial hints for tapping/dwelling on a bed, long-press crop
  swapping and the fishing loop, and centralise tap/long-press thresholds,
  touch padding and drag cancellation in `INTERACTION`.
- Expand the vegetable field to 3×4 (12 beds) and keep fruit at 2×3; empty-bed
  price chips shrink to fit the denser grid, and save validation follows
  `plantSlotCount` without a version bump.
- Redraw the orchard and vegetable art: organic lobed canopies with asymmetric
  silhouettes, tapered trunks with roots and bark marks, species-specific
  foliage palettes, and extra flowers, runners, tendrils and leaf highlights.
- Turn the fish pond into an active fishing spot: stand still anywhere near its
  rectangle (not one access point) and the 0.5s cast / 0.5s catch loop repeats
  automatically until you move, leave the pond or fill the basket. A full basket
  pauses and resumes once there is room, a range ring plus progress arc shows
  the state, and the pond draws a rod, line, bobber and ripples with cast/catch
  sounds. Fish no longer eat trough feed and pickers skip them.
- Show a coin price sticker on every empty crop bed so it is obvious the bed is
  plantable, and let a tap on the bed or its sticker open the plant chooser.
- Open the crop swap chooser after a 500 ms dwell once the bed is empty, or by
  holding a finger on the bed; previously swapping required a one-second dwell
  and empty hands, which automatic harvesting made hard to reach.
- Draw flickering anger flames, rising embers and a comic anger vein above an
  upset customer instead of a plain `!` bubble.
- Replace the fixed four-plot fields with configurable grids. Save version 4
  keeps old slots valid and leaves the new slots empty.
- Make crop beds area triggers instead of centre-point triggers, so standing
  between two rows still finds a bed. Empty beds are distance-gated so six
  labels no longer cover the shop.
- Allow swapping a planted crop by standing on its bed for half a second once
  nothing is ready to harvest; the old crop refunds half and the new one costs
  full price. The shop's remove button remains as a fallback.
- Bind partial plant payments to the bed that received them, so the remaining
  beds stop showing another bed's deposit ring.
- Let the player walk through animal pens and kitchen stations while customers
  and staff still route around them, and add station input icons and feed
  choices so both flows are readable.
- Unify the menu into one gear settings card (sound, fullscreen, language),
  remove the menu stat line, and strip sound/fullscreen from the pause card.
- Ignore the blur that fullscreen emits while a run is starting, so tapping
  Open Shop no longer lands on the pause card.
- Show angry customer faces for missed products and long queues, add resting
  stools, click-to-nudge staff, path/finger tutorial hints, and an early-game
  economy pass.
- Move the portrait shop's cashier hire sign to the right of the counter, just
  above the trash bin, so checking out at the counter no longer deposits the
  earnings toward the cashier. The wide plan moves its sign to the counter's
  right side too; the cashier still works from the same spot.
- Stock shelves from anywhere along the shelf instead of a single access point:
  the trigger is now the shelf rectangle plus a 70-unit margin, so both ends and
  the whole front count. Standing between the fruit and vegetable shelves stocks
  both at once, and a faint outline marks a shelf while there is something to put
  away and room to take it.
- Play a CC0 sip-and-swallow drinking sound and a cup-to-mouth animation when
  buying a drink, with a small fizz burst for the apple soda. The drink machine
  also reacts to the purchase.
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
