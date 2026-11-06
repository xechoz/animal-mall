# Changelog

## Unreleased

- Trim the world UI: the counter coin pile, animal pens, staff and customer
  hands no longer print quantities, and a full player hand shows `MAX`/`满`
  instead of a count. The shelf keeps its per-bin stock but drops the
  `total/capacity` line, and the day clock updates in quarter-hour steps
  instead of every game minute.

- Close the shop exactly at 21:00. New customers still stop at 20:30, but
  anyone left inside leaves when the clock lands on closing time, so the clock
  and the day report agree and the 90-second closing grace is gone.

- Remove unused drawing/logic exports and stale static i18n keys left behind by
  earlier UI iterations.

- Bake the static menu backdrop, pen fences, producer plots, crop/station art
  and coin piles into cached textures. Phaser was re-walking every Graphics
  command buffer each frame; a loaded shop now renders at 60 fps on the desktop
  test machine instead of 22–30, with no gameplay changes.

- Keep the player on the original waddle. The hop experiment is removed, so the
  shopkeeper walks like the rest of the cast again.

- Draw only three walking views: front for the down family, back for the up
  family and a shallow seven-eighths front view for the horizontal family,
  mirrored on the left. The full side and back-side textures stay in the atlas
  but are no longer selected by movement or staff contexts.

- Keep the horizontal player close to the front. The shopkeeper uses the front
  body and apron with only a slight head turn; customers and staff use the same
  shallow turn. The old strong three-quarter head and torso are removed.

- Keep the walking torso still. Walk and trot no longer bob, sway, rock, squash
  or lag the head, and the tail wag and turn pinch are removed; the feet carry
  the walk. Hop characters keep their bounce.

- Fix the shared walking feet. The stride now follows the facing axis: front and
  back views step on screen Y, left and right views step on screen X. Foot pickup
  is upward. The shallow horizontal view uses the front paw instead of the
  profile leg-and-toe, keeps the same left/right foot spacing as the front view,
  and draws both feet in the front layer so neither hides behind the body. Its
  side step is shortened so it reads as a small 7/8 step, not a full side stride.
  Hop characters keep their full landing splay.

- Refine the interface layer without changing the game rules. The UI now uses a
  bundled Nunito face for Latin/Cyrillic with the system CJK fallback, a shared
  paper-diorama palette, one close-button shape and level pips. The shop keeps
  crop stats and tool effects in the compact landscape layout, puts tools in a
  2×2 grid, shows a portrait staff roster and the live `stock/capacity` line,
  and the world HUD moves its clock off the shop sign. Slot pickers, settings,
  language, pause, drink/food panels and the day report share the same dialog
  shell; the day report explains an empty day instead of printing six zeroes.
  Save data, collision and gameplay tuning are unchanged.

- Rebuild the turned animal bodies as profiles. Side and three-quarter views now
  use a chest/haunch silhouette, one near-side arm and fore/aft legs with a real
  leg-and-foot texture instead of a front torso with a turned head. The support
  foot stays planted, the head is a separate part in every
  view so it can lag and blink, and the staff uniform follows the turned torso.
  Game rules, save data and collision are unchanged.

- Give the player, customers and staff eight-direction bodies. Walking up now
  shows the back of the head and a back view; walking down shows the face, and
  the four diagonals use dedicated three-quarter art. The rig turns through
  intermediate views over a short beat, keeps the last heading when standing
  still, and lets working staff hold a readable three-quarter pose. Front,
  three-quarter, side and back art is generated for all 14 species; shop cards
  and staff portraits stay front-facing. Save data and game rules are unchanged.

- Ground the cast and make the shelves easier to read. The player, staff and
  customers are slightly larger and stand on layered contact/cast shadows; the
  player also gets a soft warm floor marker. A stockable shelf now answers with
  a warm ground halo and a gold rim along its front lip instead of a white
  rounded-rectangle outline. Hit areas, touch sizes, collision and rules are
  unchanged.

- Unify the 2.5D prop kit and give the shop furniture a shared volume language.
  Market stalls gain a back riser, a zone-tinted striped canopy, hanging goods,
  a chalkboard, a produce crate and a sack; the till gains glass jars, a cutting
  board, a bowl stack and a crate; the dining nook gets a table runner, a menu
  card, chair-back spindles and cushions, plus a floor lamp with an evening light
  pool; farm troughs get a front face and feet. Animal contact shadows, the
  vending glass and shop-shelf occluders are deeper to match the taller props.
  Collision, hit areas, save data and game rules are unchanged.

- Dress the four shop zones as places instead of tinted rectangles. Seedbeds
  gain a low timber/earth lip and a seed packet clipped to the front edge, pen
  fences are taller with ground shadows, and the orchard, field, farm and
  scullery use layered lawn, furrow, straw and checker-tile textures. Soft
  patch edges and a few ground props (produce crates, burlap sacks, buckets)
  break up the large empty areas. Collision, hit areas, save data and game
  rules are unchanged.

- Turn the game scene into a cutaway 2.5D stage. A wooden platform base, a
  vertical plank back wall, deeper floor grain, warm/cool floor light, baked
  contact and cast shadows, and a screen vignette now frame the existing
  top-down layout. The shop sign hangs from the new wall; locked zones use a
  softer shade plus a hanging wooden price board; kitchen work pads have a
  shallow stone plinth. Collision, hit areas, save data and game rules are
  unchanged.

- Move onboarding out of the world view and unify the world-facing UI. The
  tutorial is now a compact parchment ribbon on the bottom rail in landscape
  (top in portrait), and its target uses a tinted patch with corner ticks
  instead of a heavy selection box. HUD plates gain a thin bark lip; world
  price chips, swap badges, shelf upgrade tags, staff signboards and
  locked-zone prices use the wooden-tag material; the floating DINING label is
  gone. No gameplay, save or audio change.

- Celebrate each caught fish with a brief delighted face. The player's eyes
  close into happy arcs, the cheeks flush, an open smile with a pink tongue
  replaces the resting mouth, and a small heart bobs above the head. The overlay
  is anchored to the rig's eye positions and fades after about a second. No
  logic, save or audio change.

- Rebuild the fishing presentation. The rod is now a tapered bowed curve held in
  the player's paw, extending with the cast instead of a two-segment straight
  line, and the orange progress ring around the pond is gone. The bite is
  carried by a dipping bobber, stronger ripples and a flexing rod. A caught fish
  now leaps out of the water with a splash, hangs on a taut line while the rod
  lifts, and arcs into the player's hand. The lift is a short cosmetic timer
  started by the `fishCaught` event, so it also plays when the basket fills on
  that catch. No logic, save or audio change.

- Keep shop cards readable when the panel is short. The grid still hands each
  card whatever height is left over, but below 150 UI units a card drops its
  secondary copy (tool descriptions, staff bios and deposits on top of the crop
  stats that already went) and below 112 it scales as a whole, so the price
  button can no longer ride up into the name on a short landscape phone. Tap
  targets stay at 64 units.

- Paint an inline HTML/CSS splash before the game module loads. First visits used
  to show a blank page while Phaser and the boot audio downloaded; the splash now
  covers that window with the forest-green background, the cream wordmark and
  three bouncing dots, then fades out on the platform's `mg:game-ready` event
  once the menu scene starts. It is skipped for `prefers-reduced-motion`, keeps
  `pointer-events: none` so the first tap still unlocks audio, and falls back to
  a 30 s timeout if boot never reports ready. No gameplay, save or audio change.

- Unify the in-game top bar on one frosted parchment plate. The coin purse, the
  day clock and the shop/pause buttons now share the same cream, hairline border
  and top light; the readouts keep a slightly denser alpha so a world label
  sliding under them cannot compete with the clock or the purse. The coin purse
  grows to 56 so it reads as a peer of the clock and the buttons.

- Remove the moss-green rounded lip that framed the shop from outside the fence.
  The room now meets the canopy directly; the trees, ferns and lanterns still
  separate it from the backdrop.

- Restyle every dialog heading. The moss-green ribbon behind "Paused", "Shop"
  and the day report is gone: headings are plain ink on the parchment, so they
  stop reading as a fourth button and the real actions own the only filled
  shapes. The shop heading row now holds the title, the balance and the close
  button, its tabs are bare labels with an accent underline instead of a second
  pill row, and the zone chips stay the only capsule row. Pause uses one button
  size for all three choices (Resume filled, Shop outlined, Main Menu quiet) and
  the card is sized to its content instead of a fixed 390 with dead space at the
  bottom. Settings and Language share the bark-and-leaf panel frame, add the
  missing close button, and hug their content.

- Move the day clock to the horizontal centre and turn it into a dotted
  sunrise-to-sunset dial. A sun (or moon after 19:30) rides the arc from 09:00
  to 21:00, five hollow milestone rings split it into equal steps and warm up
  as the day advances, the passed dots and the rim follow the world lighting
  curve, each phase change pulses once, and the rim breathes amber after
  20:30. Day and time stay dark on the cream pill, so night never trades away
  legibility.

- Move the development FPS chip from the bottom-right corner to the top-right,
  below the pause/DEV stack in the game and below the gear in the menu.

## 0.2.0

- Show only the nearest empty bed's price chip when the player is near. The
  tilled soil and seed packet remain the always-on "plantable" cue, the compact
  far-away sticker is gone, and the chip fades in within roughly 145 units of the
  bed rectangle. Tapping the bed and the 500 ms dwell are unchanged.

- Make stocking readable in the world. Carried goods now leave the hand one
  by one, arc into their shelf basket and make the basket icon and count pop on
  landing; a full load sends up to three staggered items so the amount reads
  without clutter. Each landing plays a new procedurally generated CC0
  wicker/wooden drop (two takes picked at random), replacing the generic `turn`
  click for player stocking.

- Rework dusk and night lighting. The old flat blue tint and four hard-edged
  centre ellipses are gone: `dayLighting` interpolates hourly keyframes from a
  17:00 golden hour to full grey night at 21:00, the screen gets a neutral grey
  multiply plus a combined veil/vignette, and soft camera-tracked pools sit on
  the canopy lanterns, six new fence lanterns, the vending machine, installed
  kitchen stations and the register. Fence lanterns stay unlit by day and light
  with the same curve.

- Add night-only wildlife: fireflies along the zone edges and forest margins,
  moths around the lanterns and a low-contrast bat crossing the canopy. Daytime
  butterflies, the bee and the dragonfly disappear after dark. After 19:30 the
  shopper mix is weighted toward owl, raccoon, hedgehog and fox; spawn cadence,
  queue limits and the sellable-stock gate are unchanged.

- Show a small FPS chip in the bottom-right safe area in development builds and
  `?debug=1`. It reads `game.loop.actualFps` four times per second; release
  packages do not create it.

- Make every unavailable action answer a tap. Locked zones, staff signs, planted
  beds, chooser cards, maxed or shortfall shop buttons and unaffordable drinks
  now explain themselves with a toast instead of swallowing the click. Toasts
  render above the shop and pickers and grow with wrapped copy, so failures
  inside a modal are finally visible.

- Use capsule corners for long action bars across the menu, pause, settings, day
  report, shop tabs and purchase rows. Product cards, chooser tiles and list
  rows keep the card radius.

- Sit empty-bed price chips on the soil at the plot centre instead of floating
  above the bed. The automatic 500 ms dwell no longer opens the crop chooser
  when the player cannot afford the cheapest crop in that zone; tapping the bed
  remains an explicit way to inspect the options.

- Hold the first-sale loop until the tree has its full fruit set. While the tree
  ripens, a clock card beside it counts down the remaining real seconds instead
  of showing the destination arrow. The tutorial shopper is placed at the till
  as soon as the crop is planted, so the counter is never empty when the player
  arrives, and checkout now guides to the standing spot on the fence side of the
  counter rather than the register inside the solid counter. A shopper at full
  anger also gets a five-second grace before walking out, and an empty shelf is
  browsed for ten seconds before the item is marked missed. The apple sale price
  rises from 6 to 10 so the first tree can fund the next unlock within the
  opening day instead of stalling new players.

- Rebuild the first-sale onboarding around the nearest target. The dashed path
  and the hand-drawn finger are gone: the guide now outlines the real trigger
  area, floats a short direction arrow beside the player, and marks the
  destination with a landing arrow. The bed itself has no hand because standing
  still opens the crop chooser; the CC0 pointing hand now marks the apple card
  inside that chooser, where the player actually has to tap. It picks the
  closest empty bed or ripe crop with a small switch margin instead of the first
  plot in the array, keeps the prompt under the HUD with a
  four-step progress row, and moves transient toasts to the bottom while
  onboarding is active so they no longer cover the prompt. Swap tags and their
  hints stay hidden until the first sale. Tool upgrades can no longer spend the
  opening fund before the first plant, the first crop ripens twice as fast, and
  empty-bed dwells pause after the first plant so the plant chooser cannot cover
  the stock prompt.

- Stop painting four permanent zone captions over the shop. The always-on
  "Fruit / Vegetables / Farm / Kitchen" tags were screen-space chrome that slid
  away from their zone, sat above the day/night overlay and repeated what the
  beds, pens, stations and shop panel already said. Locked zones now carry their
  name, lock and price inside the world container, the name fades in only within
  ~260 units, and unlocking a zone removes the caption for good. Portrait hangs
  the name and price under its locked shelf instead of duplicating the shelf
  lock mid-zone. Zone names stay in the shop panel, goals and toasts.

- Bake the static shop art into textures instead of keeping it live. Phaser walks
  a Graphics command buffer on every rendered frame, and the floor plan alone was
  about 193k buffer entries, so the renderer rebuilt the whole map, shelves, beds,
  lock overlays, facility props and tool badges every frame. Those
  layers now render as a handful of textured quads: ~258k entries per frame drop
  to ~10k, which removes the sustained frame-time spike on desktop and the heavy
  stutter on phones. Re-baked only when the art actually changes (zone unlock,
  planted bed, layout change).

- Match baked texture density to the screen instead of the design space. The
  canvas backing store is 1.5-3x the design resolution and the world container
  adds its own scale, so the first bake pass drew price chips and shop art
  1.5-1.7x larger than their textures, which read as soft and stair-stepped on
  desktop and phones. UI badges now bake at twice the physical density (a Render
  Texture has no MSAA) and world layers at the world scale times the physical
  density; the price chip body is vector again so its rounded corners stay
  crisp. Badge caches are keyed by appearance rather than price, so they no
  longer grow with gameplay, and moving the window to a denser display rebuilds
  the world.

- Let the steering stick start on beds, pens, stations and price chips. Touching
  inside any of the four product bays used to be swallowed by the slot hit area,
  so the long press blocked movement; those world tap targets now let the drag
  through, and crossing `INTERACTION.tapSlop` cancels the hold ring instead of
  opening the chooser.
- Drop the landscape-phone HUD rail: every layout now shares one floating top
  row with the coin pill on the left and the day clock, shop and pause buttons
  anchored to the top-right safe-area corner. Landscape phones lose the reserved
  column, so the world uses the full width, and the row floats over the map's
  decorative edge instead of pushing it down.
- Give the two in-game round buttons a light, 78%-opaque glass plate so they stay
  readable over grass and floor, and stop the bag/pause glyphs from clearing the
  plate they are drawn on. The "can afford something" dot now sits on the rim
  instead of floating between the two buttons.
- Replace the fish-only kitchen grill with a BBQ grill. One batch takes any two
  vegetables, fish, eggs or cheese in any mix and always produces skewers, so
  the kitchen gains a flexible sink for garden and farm surplus. Existing saves
  migrate the old grill in place to the `skewer` product (save version 9).
- Spread the landscape shop across a wider 1280-unit room: the four product
  bays keep their 240-unit footprint while the aisles between them grow from
  56 to 80 units, so Fruit, Vegetables, Farm and Kitchen read as separate zones
  instead of one packed counter. Shelves, beds, pens, stations, staff signs and
  the cross aisle follow the new bay grid; the portrait plan is unchanged.
- Give the staff a real uniform instead of the flat apron rectangle. The
  cashier wears a teal shirt with a cream apron and name badge, the picker green
  overalls, and the chef a white double-breasted jacket with a coral neckerchief;
  the clothing is baked into the body texture so it turns, bobs and squashes
  with the gait. Every role also gets a work hat (bucket cap, straw hat, toque)
  layered behind the head so the ears stay in front, and the same dressed
  portrait now appears on the shop cards, the map offers and the staff signs.

- Redraw every shop animal with a species-specific silhouette instead of one
  shared body template. Customers and staff now split into body/head/tail/paw
  textures so the existing gait rig keeps working while each species gets its
  own proportions, ears, muzzle, markings and props. Add six new customer
  species (squirrel, hedgehog, raccoon, deer, owl, duck) with their own gaits,
  and prefer a species that is not already in the shop when spawning a shopper.
- Rework the farm pens: the chicken gets a comb, wattle, tail feathers and a
  pecking idle; the cow gets horns, black patches, an udder, tail swishes and
  cud chewing; the sheep gets cloud wool, a dark face and grazing; the goat gets
  curved horns, a beard, long ears and hoof scraping. Each land pen also shows
  a cosmetic chick, calf, lamb or kid, and the pond gains a jumping koi and
  lily flower.

- Add a working-day cycle. A shift lasts five minutes of shop time shown as
  09:00–21:00; dawn, dusk and night tint the forest, the shop gets a warm lamp
  pool after 19:30, and a floating clock shows the day and time. New customers
  stop at 20:30, the last shopper finishes, and a report card totals revenue,
  served and lost customers, out-of-stock items, average spend, satisfaction and
  the service tip. Satisfaction starts at 100 per checkout, loses 20 per skipped
  item and 20 for a nearly expired patience bar; 75/85/95 ratings pay 2/5/8%
  tips. The report pauses the simulation, and the next morning starts on a
  button or `Esc`. There is no rent, quota or failure state. Save version 8 adds
  the day counter; daily counters restart in the morning, so reloading never
  keeps a half-finished report.

- Zoom the shop on phones. The world renders at up to 1.45x and the camera
  follows the player with a central dead zone, so characters, beds, pens and
  price tags stay readable on a 390px screen. Tablets and desktops keep the
  full-map 1:1 view. Camera-aware overlays keep price chips, swap tags,
  tutorial markers and world effects attached to their objects; the tutorial
  marker clamps to the play area when its target is off-screen, and rotating or
  resizing snaps the camera instead of panning across the shop.

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
