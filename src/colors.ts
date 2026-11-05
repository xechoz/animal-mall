import type { Theme } from '@mg/core'

/**
 * The UI palette is the single source of truth for interface colour. World art
 * keeps its own wider set below; these tokens are deliberately small so a new
 * control has one obvious choice per role instead of a free colour picker.
 */
const ui = {
  ink: 0x2b241d,
  inkSoft: 0x5f5646,
  cream: 0xfff7e8,
  paper: 0xf6ead2,
  paperRaised: 0xfff8e8,
  paperDeep: 0xe8d3af,
  line: 0xd3bd95,
  bark: 0x4a2f1c,
  hay: 0xf0d08a,
  accent: 0xe0913f,
  accentHover: 0xc9762f,
  accentSoft: 0xf3d6ae,
  leaf: 0x6f9f55,
  berry: 0xc94f45,
  brass: 0xe6b34a,
  /** One cool wash for every locked zone, regardless of its floor tint. */
  lockedScrim: 0x2f4a42,
  overlay: 0x131f19,
} as const

const fontStack =
  '"Nunito", "Noto Sans SC", "PingFang SC", "Hiragino Sans", "Yu Gothic", "Noto Sans JP", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", "Microsoft YaHei", system-ui, sans-serif'

export const gameColors = {
  theme: {
    font: fontStack,
    bg: 0x466a4e,
    bgAlt: 0x557a58,
    board: 0x7a4f2e,
    boardAlt: 0x8f5f38,
    ink: ui.ink,
    accent: ui.accent,
    accentHover: ui.accentHover,
    accentAlt: ui.leaf,
    accentWarm: 0xf3cf7a,
    accentInk: 0x8a4f28,
    onAccent: ui.ink,
    text: '#2b241d',
    textMuted: '#5f5646',
    muted: ui.inkSoft,
    panel: ui.paper,
    borderSoft: ui.line,
    surface: ui.paperRaised,
    surfaceAlt: ui.paperDeep,
    danger: ui.berry,
    dangerHover: 0xd96359,
    onDanger: ui.cream,
    highlight: 0xffffff,
    overlay: ui.overlay,
    shadow: ui.ink,
    // Shared Button radius. It is clamped to half the button height, so this
    // value makes every action bar a capsule while cards keep their own radius.
    radius: 32,
    radiusLarge: 24,
  } satisfies Partial<Theme>,
  ui,
  floor: 0xe3c79a,
  floorLine: 0xcfa974,
  wood: 0x7a4f2e,
  woodDark: 0x5a3a22,
  woodLight: 0x9a6a3f,
  bark: 0x6b4527,
  barkDark: 0x4a2f1c,
  barkLight: 0x8f6038,
  leaf: 0x6fb36a,
  leafDark: 0x4f8a52,
  leafLight: 0x9ed68a,
  fern: 0x6fb36a,
  moss: 0x7fa65a,
  mossDark: 0x5f7d45,
  pine: 0x4f7352,
  canopy: 0x39573f,
  sunbeam: 0xf3cf7a,
  stone: 0x8a9098,
  stoneDark: 0x6f757c,
  straw: 0xd9b25a,
  hay: 0xf0d08a,
  berry: 0xd9574f,
  cream: 0xfff3dd,
  coral: 0xd97757,
  mint: 0x7fae8a,
  sky: 0xa8d8c8,
  water: 0x6fb7b3,
  dirt: 0x8a5f3d,
  dirtDark: 0x6a452c,
} as const
