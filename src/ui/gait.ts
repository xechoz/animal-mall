import type { SpeciesId } from '../logic/types'

/**
 * Cosmetic gait engine. All values are design-space units; the renderer owns
 * the actual containers. Phase is driven by travelled distance so the cadence
 * follows the real walking speed instead of wall-clock time.
 */
export type GaitKind = 'waddle' | 'trot' | 'hop'

export interface GaitProfile {
  readonly kind: GaitKind
  /** Design units travelled per full stride. */
  readonly stride: number
  readonly lift: number
  readonly rock: number
  readonly sway: number
  readonly squash: number
  readonly lean: number
  readonly stepReach: number
  readonly stepLift: number
  /** How much the head trails the body, 0..1. */
  readonly headLag: number
  readonly tailWag: number
  /** Shadow shrink per design unit of lift. */
  readonly shadowShrink: number
}

const PROFILES: Readonly<Record<SpeciesId, GaitProfile>> = {
  bear: {
    kind: 'waddle',
    stride: 50,
    lift: 3.4,
    rock: 0.055,
    sway: 1.2,
    squash: 0.062,
    lean: 0.03,
    stepReach: 5,
    stepLift: 2.2,
    headLag: 0.5,
    tailWag: 0.05,
    shadowShrink: 0.02,
  },
  panda: {
    kind: 'waddle',
    stride: 54,
    lift: 2.9,
    rock: 0.06,
    sway: 1.3,
    squash: 0.06,
    lean: 0.028,
    stepReach: 4.6,
    stepLift: 1.9,
    headLag: 0.45,
    tailWag: 0.05,
    shadowShrink: 0.02,
  },
  pig: {
    kind: 'waddle',
    stride: 44,
    lift: 3,
    rock: 0.062,
    sway: 1.1,
    squash: 0.058,
    lean: 0.035,
    stepReach: 4.6,
    stepLift: 2.1,
    headLag: 0.5,
    tailWag: 0.08,
    shadowShrink: 0.022,
  },
  cat: {
    kind: 'trot',
    stride: 34,
    lift: 2.6,
    rock: 0.026,
    sway: 0.6,
    squash: 0.05,
    lean: 0.035,
    stepReach: 4.6,
    stepLift: 2.5,
    headLag: 0.5,
    tailWag: 0.11,
    shadowShrink: 0.025,
  },
  fox: {
    kind: 'trot',
    stride: 38,
    lift: 3,
    rock: 0.024,
    sway: 0.6,
    squash: 0.055,
    lean: 0.04,
    stepReach: 5,
    stepLift: 2.7,
    headLag: 0.55,
    tailWag: 0.12,
    shadowShrink: 0.025,
  },
  dog: {
    kind: 'trot',
    stride: 40,
    lift: 3,
    rock: 0.03,
    sway: 0.8,
    squash: 0.05,
    lean: 0.04,
    stepReach: 5,
    stepLift: 2.6,
    headLag: 0.5,
    tailWag: 0.14,
    shadowShrink: 0.025,
  },
  squirrel: {
    kind: 'hop',
    stride: 36,
    lift: 7.5,
    rock: 0.016,
    sway: 0.5,
    squash: 0.08,
    lean: 0.045,
    stepReach: 0,
    stepLift: 0,
    headLag: 0.55,
    tailWag: 0.08,
    shadowShrink: 0.03,
  },
  hedgehog: {
    kind: 'waddle',
    stride: 38,
    lift: 2.2,
    rock: 0.05,
    sway: 1,
    squash: 0.05,
    lean: 0.025,
    stepReach: 4,
    stepLift: 1.8,
    headLag: 0.4,
    tailWag: 0,
    shadowShrink: 0.02,
  },
  raccoon: {
    kind: 'trot',
    stride: 36,
    lift: 2.7,
    rock: 0.028,
    sway: 0.7,
    squash: 0.05,
    lean: 0.035,
    stepReach: 4.6,
    stepLift: 2.4,
    headLag: 0.5,
    tailWag: 0.1,
    shadowShrink: 0.025,
  },
  deer: {
    kind: 'trot',
    stride: 46,
    lift: 3.6,
    rock: 0.022,
    sway: 0.5,
    squash: 0.05,
    lean: 0.05,
    stepReach: 6,
    stepLift: 2.8,
    headLag: 0.55,
    tailWag: 0.06,
    shadowShrink: 0.025,
  },
  owl: {
    kind: 'waddle',
    stride: 42,
    lift: 2.2,
    rock: 0.04,
    sway: 1,
    squash: 0.05,
    lean: 0.02,
    stepReach: 3.5,
    stepLift: 1.6,
    headLag: 0.35,
    tailWag: 0,
    shadowShrink: 0.02,
  },
  duck: {
    kind: 'waddle',
    stride: 40,
    lift: 2.4,
    rock: 0.06,
    sway: 1.4,
    squash: 0.055,
    lean: 0.03,
    stepReach: 4.4,
    stepLift: 1.8,
    headLag: 0.45,
    tailWag: 0.04,
    shadowShrink: 0.02,
  },
  rabbit: {
    kind: 'hop',
    stride: 44,
    lift: 10.5,
    rock: 0.014,
    sway: 0.4,
    squash: 0.1,
    lean: 0.05,
    stepReach: 0,
    stepLift: 0,
    headLag: 0.6,
    tailWag: 0,
    shadowShrink: 0.03,
  },
  frog: {
    kind: 'hop',
    stride: 40,
    lift: 9,
    rock: 0.012,
    sway: 0.45,
    squash: 0.11,
    lean: 0.04,
    stepReach: 0,
    stepLift: 0,
    headLag: 0.55,
    tailWag: 0,
    shadowShrink: 0.03,
  },
}

const PLAYER_PROFILE: GaitProfile = {
  kind: 'waddle',
  stride: 56,
  lift: 3.8,
  rock: 0.048,
  sway: 1,
  squash: 0.065,
  lean: 0.032,
  stepReach: 5.4,
  stepLift: 2.4,
  headLag: 0.55,
  tailWag: 0.04,
  shadowShrink: 0.02,
}

export function gaitProfile(species: SpeciesId, player = false): GaitProfile {
  return player ? PLAYER_PROFILE : PROFILES[species]
}

export interface FootPose {
  readonly x: number
  readonly y: number
  readonly rotation: number
  readonly scaleY: number
}

export interface GaitFrame {
  readonly phase: number
  readonly lift: number
  readonly squashX: number
  readonly squashY: number
  readonly rock: number
  readonly sway: number
  /** Forward lean magnitude; the renderer multiplies by facing. */
  readonly lean: number
  readonly headX: number
  readonly headY: number
  readonly tailWag: number
  readonly footLeft: FootPose
  readonly footRight: FootPose
  readonly shadowScale: number
  readonly shadowAlpha: number
  readonly turn: number
  readonly speed: number
  readonly weight: number
  readonly landed: boolean
  readonly blink: boolean
}

const ZERO_FOOT: FootPose = { x: 0, y: 0, rotation: 0, scaleY: 1 }
const TAU = Math.PI * 2

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Deterministic 0..1 hash so every actor keeps its own rhythm and blink. */
function hash(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

export class GaitAnimator {
  private readonly profile: GaitProfile
  private readonly seed: number
  private readonly motionScale: number
  private phaseValue: number
  private weight = 0
  private speed = 0
  private lastX = 0
  private lastY = 0
  private lastNow = Number.NaN
  private lastFacing: -1 | 1 | null = null
  private turnAt = Number.NEGATIVE_INFINITY
  private nextBlinkAt = Number.POSITIVE_INFINITY
  private blinkUntil = 0
  private blinkCount = 0
  private landing = false

  constructor(profile: GaitProfile, seed: number, motionScale = 1) {
    this.profile = profile
    this.seed = seed
    this.motionScale = motionScale
    this.phaseValue = hash(seed)
  }

  /** Called every rendered frame with the interpolated ground position. */
  update(x: number, y: number, now: number, facing: -1 | 1, load = 0): GaitFrame {
    if (Number.isNaN(this.lastNow)) {
      this.lastNow = now
      this.lastX = x
      this.lastY = y
      this.lastFacing = facing
      this.nextBlinkAt = now + 2_400 + hash(this.seed + 1.7) * 3_600
      return this.frame(now, load)
    }

    const dt = clamp(now - this.lastNow, 0, 64)
    this.lastNow = now
    const distance = Math.hypot(x - this.lastX, y - this.lastY)
    const teleport = distance > 64
    const moved = teleport ? 0 : distance
    this.lastX = x
    this.lastY = y

    if (dt > 0 && !teleport) {
      const instant = moved / (dt / 1000)
      this.speed += (instant - this.speed) * Math.min(1, dt / 70)
    }
    if (teleport) {
      this.phaseValue = hash(this.seed + 3.3)
      this.speed = 0
    }
    this.speed = clamp(this.speed, 0, 700)

    const target = this.speed > 8 ? 1 : 0
    this.weight += (target - this.weight) * Math.min(1, dt / 110)

    const previousPhase = this.phaseValue
    if (moved > 0) this.phaseValue = (this.phaseValue + moved / this.profile.stride) % 1
    const wrapped = moved > 0 && this.phaseValue < previousPhase
    this.landing = this.profile.kind === 'hop' && wrapped && this.weight > 0.35

    if (facing !== this.lastFacing) {
      this.turnAt = now
      this.lastFacing = facing
    }
    if (now >= this.nextBlinkAt) {
      this.blinkUntil = now + 110
      this.blinkCount += 1
      this.nextBlinkAt = now + 2_500 + hash(this.seed + this.blinkCount * 7.3) * 4_200
    }

    return this.frame(now, load)
  }

  private frame(now: number, load: number): GaitFrame {
    const profile = this.profile
    const weight = this.weight
    const cargo = clamp(load, 0, 1)
    const weightScale = weight * (1 - 0.25 * cargo)
    const phase = this.phaseValue
    const wave = Math.sin(phase * TAU)
    const air = profile.kind === 'hop' ? Math.sin(phase * Math.PI) : Math.abs(wave)
    const contact =
      profile.kind === 'hop' ? Math.abs(Math.cos(phase * Math.PI)) : 1 - Math.abs(wave)
    const impact = contact ** 8
    const idle = 1 - weight
    const breath = Math.sin(now * 0.0016 + this.seed * TAU) * 0.012 * idle
    const lift = air * profile.lift * this.motionScale * weightScale
    const squash = profile.squash * weight
    const squashY = 1 - squash * impact + squash * 0.45 * air + breath
    const squashX = 1 + squash * impact * 0.55 - squash * 0.2 * air - breath * 0.5
    const rock = wave * profile.rock * weight
    const sway =
      -wave * profile.sway * this.motionScale * weight +
      Math.sin(now * 0.0009 + this.seed * TAU) * 0.5 * idle * this.motionScale
    const speedNorm = clamp(this.speed / 140, 0, 1)
    const lean = profile.lean * speedNorm * weight + 0.02 * cargo

    const liftAt = (value: number): number => {
      const wrapped = ((value % 1) + 1) % 1
      return profile.kind === 'hop'
        ? Math.sin(wrapped * Math.PI)
        : Math.abs(Math.sin(wrapped * TAU))
    }
    const headY =
      (liftAt(phase - 0.1) - liftAt(phase)) *
      profile.lift *
      this.motionScale *
      weightScale *
      profile.headLag
    const headX =
      -sway * 0.3 + Math.sin(now * 0.0011 + this.seed * TAU) * 0.6 * idle * this.motionScale
    const tailWag =
      profile.kind === 'hop'
        ? 0
        : Math.sin(phase * TAU * 2 + this.seed * TAU) * profile.tailWag * weight +
          Math.sin(now * 0.0013 + this.seed * TAU) * profile.tailWag * 0.6 * idle

    let footLeft: FootPose = ZERO_FOOT
    let footRight: FootPose = ZERO_FOOT
    if (profile.kind === 'hop') {
      const splay = impact * 2.2 * this.motionScale * weight
      footLeft = {
        x: -splay,
        y: 0,
        rotation: -0.03 * impact,
        scaleY: 1 - 0.08 * impact,
      }
      footRight = {
        x: splay,
        y: 0,
        rotation: 0.03 * impact,
        scaleY: 1 - 0.08 * impact,
      }
    } else {
      const reach = profile.stepReach * this.motionScale * weight
      const stepLift = profile.stepLift * this.motionScale * weight
      const cos = Math.cos(phase * TAU)
      footLeft = {
        x: wave * reach,
        y: Math.max(0, cos) * stepLift,
        rotation: Math.max(0, cos) * 0.09,
        scaleY: 1,
      }
      footRight = {
        x: -wave * reach,
        y: Math.max(0, -cos) * stepLift,
        rotation: -Math.max(0, -cos) * 0.09,
        scaleY: 1,
      }
    }

    const turnProgress = (now - this.turnAt) / 150
    const turn =
      turnProgress >= 0 && turnProgress < 1 ? 1 - 0.16 * Math.sin(Math.PI * turnProgress) : 1

    return {
      phase,
      lift,
      squashX,
      squashY,
      rock,
      sway,
      lean,
      headX,
      headY,
      tailWag,
      footLeft,
      footRight,
      shadowScale: Math.max(0.55, 1 - lift * profile.shadowShrink),
      shadowAlpha: Math.max(0.3, 1 - lift * 0.025),
      turn,
      speed: this.speed,
      weight,
      landed: this.landing && weight > 0.35,
      blink: now < this.blinkUntil,
    }
  }
}
