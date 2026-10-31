import { describe, expect, it } from 'vitest'
import { gameI18n } from './i18n'
import { PLANT_ORDER, PRODUCT_ORDER } from './logic/config'

describe('game copy', () => {
  it('names every plant in English and Chinese', () => {
    for (const product of PLANT_ORDER) {
      expect(gameI18n.en[`product.${product}`]).toBeTruthy()
      expect(gameI18n.zh[`product.${product}`]).toBeTruthy()
    }
  })

  it('names every product in English and Chinese', () => {
    for (const product of PRODUCT_ORDER) {
      expect(gameI18n.en[`product.${product}`]).toBeTruthy()
      expect(gameI18n.zh[`product.${product}`]).toBeTruthy()
    }
  })

  it('explains trough feeding in both languages', () => {
    expect(gameI18n.en['shop.dietAny']).toBeTruthy()
    expect(gameI18n.zh['shop.dietAny']).toBeTruthy()
    expect(gameI18n.en['toast.hungry']).toContain('trough')
    expect(gameI18n.zh['toast.hungry']).toContain('食槽')
  })
})
