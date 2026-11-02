import { describe, expect, it } from 'vitest'
import { gameI18n } from './i18n'
import { ANIMAL_ORDER, PLANT_ORDER, PROCESSED_ORDER, PRODUCT_ORDER } from './logic/config'

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

  it('names every producer in English and Chinese', () => {
    for (const product of [...ANIMAL_ORDER, ...PROCESSED_ORDER]) {
      expect(gameI18n.en[`producer.${product}`]).toBeTruthy()
      expect(gameI18n.zh[`producer.${product}`]).toBeTruthy()
    }
  })

  it('explains trough feeding in both languages', () => {
    expect(gameI18n.en['shop.dietAny']).toBeTruthy()
    expect(gameI18n.zh['shop.dietAny']).toBeTruthy()
    expect(gameI18n.en['toast.hungry']).toContain('trough')
    expect(gameI18n.zh['toast.hungry']).toContain('食槽')
  })

  it('explains the dining table in both languages', () => {
    for (const key of ['facility.dining', 'dining.title', 'dining.empty', 'dining.stand']) {
      expect(gameI18n.en[key as keyof typeof gameI18n.en]).toBeTruthy()
      expect(gameI18n.zh[key as keyof typeof gameI18n.zh]).toBeTruthy()
    }
  })

  it('names the BBQ grill and its pooled recipe in both languages', () => {
    for (const key of ['product.skewer', 'producer.skewer', 'shop.anyGrill', 'picker.grill']) {
      expect(gameI18n.en[key as keyof typeof gameI18n.en]).toBeTruthy()
      expect(gameI18n.zh[key as keyof typeof gameI18n.zh]).toBeTruthy()
    }
  })
})
