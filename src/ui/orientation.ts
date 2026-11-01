export interface LandscapePolicy {
  readonly mobile: boolean
  readonly embedded: boolean
  readonly lockSupported: boolean
}

/**
 * Mobile play defaults to landscape, but only when the page can actually
 * rotate itself. Embedded portals own their player chrome, and browsers
 * without the Screen Orientation API must keep the portrait layout.
 */
export function shouldPreferLandscape(policy: LandscapePolicy): boolean {
  return policy.mobile && !policy.embedded && policy.lockSupported
}
