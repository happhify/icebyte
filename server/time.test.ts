import { afterAll, expect, it } from 'vitest'
import { site } from '../src/config/site.js'
import { getOpenBatch } from '../src/lib/order.js'
import { nowInJakarta } from './time.js'

const CONFIG_BATCHES = [...site.batches]
site.batches.splice(0, site.batches.length, {
  name: 'Batch Test',
  orderStart: '2026-10-11',
  orderEnd: '2026-10-14',
  fulfillmentDate: '2026-10-18',
})
afterAll(() => {
  site.batches.splice(0, site.batches.length, ...CONFIG_BATCHES)
})

it('23:30 UTC 31 Okt = 06:30 WIB 1 Nov', () => {
  const d = nowInJakarta(new Date('2026-10-31T23:30:00Z'))
  expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 10, 1, 6, 30])
})

it('batas orderEnd mengikuti WIB: 23:30 WIB masih buka, 00:05 WIB besoknya tutup', () => {
  expect(getOpenBatch(nowInJakarta(new Date('2026-10-14T16:30:00Z')))?.name).toBe('Batch Test')
  expect(getOpenBatch(nowInJakarta(new Date('2026-10-14T17:05:00Z')))).toBeUndefined()
})

it('hari pertama batch mulai jam 00:00 WIB, bukan 07:00 WIB', () => {
  // 10 Okt 17:30 UTC = 11 Okt 00:30 WIB
  expect(getOpenBatch(nowInJakarta(new Date('2026-10-10T17:30:00Z')))?.name).toBe('Batch Test')
})
