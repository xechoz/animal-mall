import type Phaser from 'phaser'
import { STAFF, STAFF_ORDER } from '../logic/config'
import type { StaffKind } from '../logic/types'
import { ANIMAL_TEXTURE_SIZE, drawClothedBody, drawClothedPortrait } from './animalArt'

/**
 * Staff wear a uniform instead of the player's apron: a coloured torso with a
 * collar, sleeves and role kit, plus a work hat drawn in head coordinates.
 * Everything is baked into 128-unit textures so the rig's gait, turn and
 * seated squash carry the uniform along for free.
 */
interface StaffUniform {
  readonly shirt: number
  readonly shirtDark: number
  readonly trim: number
  readonly trimDark: number
  readonly badge: number
}

const UNIFORM: Readonly<Record<StaffKind, StaffUniform>> = {
  cashier: {
    shirt: 0x5fbf9f,
    shirtDark: 0x4aa98a,
    trim: 0xfff3dd,
    trimDark: 0xd9cbb5,
    badge: 0xf3cf7a,
  },
  picker: {
    shirt: 0x7fa65a,
    shirtDark: 0x5f7d45,
    trim: 0xf0d08a,
    trimDark: 0xb08a62,
    badge: 0xf3cf7a,
  },
  chef: {
    shirt: 0xfffaf0,
    shirtDark: 0xe6ded0,
    trim: 0xffffff,
    trimDark: 0xd9cbb5,
    badge: 0xd97757,
  },
}

export function staffBodyKey(kind: StaffKind): string {
  return `staff-body-${kind}`
}

export function staffPortraitKey(kind: StaffKind): string {
  return `staff-portrait-${kind}`
}

export function staffHatKey(kind: StaffKind): string {
  return `staff-hat-${kind}`
}

export function createStaffTextures(scene: Phaser.Scene): void {
  for (const kind of STAFF_ORDER) {
    const species = STAFF[kind].species
    createTexture(scene, staffBodyKey(kind), () =>
      drawClothedBody(scene, species, (graphics) => drawUniform(graphics, kind)),
    )
    createTexture(scene, staffPortraitKey(kind), () =>
      drawClothedPortrait(scene, species, (graphics) => drawUniform(graphics, kind)),
    )
    createTexture(scene, staffHatKey(kind), () => drawHat(scene, kind))
  }
}

function createTexture(scene: Phaser.Scene, key: string, draw: () => Phaser.GameObjects.Graphics) {
  if (scene.textures.exists(key)) return
  const graphics = draw()
  graphics.generateTexture(key, ANIMAL_TEXTURE_SIZE, ANIMAL_TEXTURE_SIZE)
  graphics.destroy()
}

/**
 * Drawn in body coordinates: the torso ellipse sits at (64, 94) and the chin
 * line is y≈84, so the collar tucks under the head instead of covering it.
 */
function drawUniform(g: Phaser.GameObjects.Graphics, kind: StaffKind): void {
  const u = UNIFORM[kind]

  g.fillStyle(u.shirt, 1)
  g.fillEllipse(64, 94, 46, 32)
  // Shoulder yoke and short sleeves read as clothing even under the big head.
  g.fillRoundedRect(46, 82, 36, 8, 4)
  g.fillStyle(u.shirtDark, 1)
  g.fillRoundedRect(33, 85, 13, 15, 6)
  g.fillRoundedRect(82, 85, 13, 15, 6)

  // Collar: a cream V under the muzzle reads as a shirt worn under the apron.
  g.fillStyle(u.trim, 1)
  g.fillTriangle(57, 78, 71, 78, 64, 90)
  g.lineStyle(1.5, u.trimDark, 0.8)
  g.lineBetween(57, 78, 64, 90)
  g.lineBetween(71, 78, 64, 90)

  if (kind === 'cashier') drawCashierKit(g, u)
  if (kind === 'picker') drawPickerKit(g, u)
  if (kind === 'chef') drawChefKit(g, u)
}

function drawCashierKit(g: Phaser.GameObjects.Graphics, u: StaffUniform): void {
  g.fillStyle(u.trim, 1)
  g.fillRoundedRect(51, 88, 26, 22, 7)
  g.lineStyle(1, u.trimDark, 0.7)
  g.strokeRoundedRect(51, 88, 26, 22, 7)
  g.fillStyle(u.trimDark, 0.55)
  g.fillRoundedRect(58, 97, 12, 8, 3)
  g.fillStyle(u.badge, 1)
  g.fillRoundedRect(70, 90, 7, 6, 2)
  g.fillStyle(0xffffff, 0.75)
  g.fillRect(71, 92, 5, 1.2)
}

function drawPickerKit(g: Phaser.GameObjects.Graphics, u: StaffUniform): void {
  // Overalls: a darker bib, two shoulder straps and a belt.
  g.lineStyle(4, u.shirtDark, 1)
  g.lineBetween(56, 80, 53, 91)
  g.lineBetween(72, 80, 75, 91)
  g.fillStyle(u.shirtDark, 1)
  g.fillRoundedRect(53, 86, 22, 17, 4)
  g.fillStyle(u.trim, 1)
  g.fillRoundedRect(58, 95, 12, 7, 3)
  g.fillStyle(u.trimDark, 1)
  g.fillRoundedRect(45, 102, 38, 5, 2)
  g.fillStyle(u.badge, 1)
  g.fillCircle(53, 87, 2.2)
  g.fillCircle(75, 87, 2.2)
}

function drawChefKit(g: Phaser.GameObjects.Graphics, u: StaffUniform): void {
  g.fillStyle(u.trimDark, 0.5)
  g.fillRoundedRect(40, 90, 48, 14, 7)
  g.fillStyle(u.shirt, 1)
  g.fillRoundedRect(42, 88, 44, 18, 8)

  for (let row = 0; row < 3; row += 1) {
    const y = 92 + row * 7
    g.fillStyle(row % 2 === 0 ? u.badge : 0x6fae5e, 1)
    g.fillCircle(57, y, 2.2)
    g.fillStyle(row % 2 === 0 ? 0x6fae5e : u.badge, 1)
    g.fillCircle(71, y, 2.2)
  }

  // Neckerchief: the one saturated accent on an all-white jacket.
  g.fillStyle(u.badge, 1)
  g.fillTriangle(56, 79, 72, 79, 64, 95)
  g.fillStyle(0xfff3dd, 0.85)
  g.fillCircle(64, 94, 2.6)
}

/** Hats are drawn in head coordinates and layered behind the head texture. */
function drawHat(scene: Phaser.Scene, kind: StaffKind): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics()
  if (kind === 'cashier') drawBucketCap(g)
  if (kind === 'picker') drawStrawHat(g)
  if (kind === 'chef') drawToque(g)
  return g
}

function drawBucketCap(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x4aa98a, 1)
  g.fillEllipse(64, 32, 64, 15)
  g.fillStyle(0x3d8a76, 1)
  g.fillEllipse(64, 35, 58, 10)
  g.fillStyle(0x5fbf9f, 1)
  g.fillEllipse(64, 14, 48, 26)
  g.fillStyle(0xffffff, 0.18)
  g.fillEllipse(55, 7, 16, 8)
  g.fillStyle(0xfff3dd, 1)
  g.fillRoundedRect(42, 18, 44, 7, 3)
  g.fillCircle(64, 3, 3.2)
}

function drawStrawHat(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0xc69440, 1)
  g.fillEllipse(64, 34, 94, 22)
  g.fillStyle(0xa87c31, 1)
  g.fillEllipse(64, 38, 88, 14)
  g.fillStyle(0xd9b25a, 1)
  g.fillEllipse(64, 12, 54, 26)
  g.fillStyle(0xffffff, 0.22)
  g.fillEllipse(54, 5, 18, 8)
  g.fillStyle(0x6fae5e, 1)
  g.fillRoundedRect(40, 18, 48, 7, 3)
  g.fillStyle(0x6fb36a, 1)
  g.fillEllipse(88, 8, 13, 6)
  g.fillEllipse(82, 13, 10, 5)
  g.lineStyle(1.2, 0x4f8a52, 0.9)
  g.lineBetween(85, 10, 93, 7)
}

function drawToque(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0xfffaf0, 1)
  g.fillRoundedRect(45, 15, 38, 10, 4)
  g.lineStyle(1.5, 0xd9cbb5, 0.9)
  g.strokeRoundedRect(45, 15, 38, 10, 4)
  g.fillStyle(0xfffaf0, 1)
  g.fillCircle(55, 10, 8)
  g.fillCircle(73, 10, 8)
  g.fillCircle(64, 8, 9.5)
  g.fillStyle(0xffffff, 0.5)
  g.fillCircle(60, 6, 3.2)
  g.lineStyle(1.2, 0xe0d8ca, 0.85)
  for (const x of [55, 64, 73]) g.lineBetween(x, 12, x, 16)
}
