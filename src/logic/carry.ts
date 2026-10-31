import { PRODUCT_ORDER } from './config'
import type { Carry, ProductKind } from './types'

export const EMPTY_CARRY: Carry = {}

/** Total number of goods in the basket, across every kind. */
export function carryTotal(carry: Carry): number {
  let total = 0
  for (const product of PRODUCT_ORDER) total += carry[product] ?? 0
  return total
}

export function carryOf(carry: Carry, product: ProductKind): number {
  return carry[product] ?? 0
}

/** Carried kinds in a stable product order, skipping empty slots. */
export function carriedKinds(carry: Carry): readonly ProductKind[] {
  return PRODUCT_ORDER.filter((product) => (carry[product] ?? 0) > 0)
}

export function addCarry(carry: Carry, product: ProductKind, amount: number): Carry {
  const count = carryOf(carry, product) + amount
  return count > 0 ? { ...carry, [product]: count } : carry
}

export function takeCarry(
  carry: Carry,
  product: ProductKind,
  amount: number,
): { readonly carry: Carry; readonly taken: number } {
  const count = carryOf(carry, product)
  const taken = Math.min(count, Math.max(0, amount))
  if (taken <= 0) return { carry, taken: 0 }
  if (count > taken) return { carry: { ...carry, [product]: count - taken }, taken }
  const next = { ...carry }
  delete next[product]
  return { carry: next, taken }
}

export function removeCarry(carry: Carry, product: ProductKind): Carry {
  if (carryOf(carry, product) <= 0) return carry
  const next = { ...carry }
  delete next[product]
  return next
}
