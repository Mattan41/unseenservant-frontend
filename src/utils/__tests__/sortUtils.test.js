import { describe, it, expect } from 'vitest'
import { sortByLastViewed } from '@/utils/sortUtils.js'

const CAMPAIGNS = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Bravo' },
  { id: 3, name: 'Charlie' },
]

describe('sortByLastViewed', () => {
  it('lists the most recently viewed item first', () => {
    const sorted = sortByLastViewed(CAMPAIGNS, { 1: 100, 3: 300 })

    expect(sorted.map((item) => item.id)).toEqual([3, 1, 2])
  })

  it('keeps the incoming order for items that were never viewed', () => {
    expect(sortByLastViewed(CAMPAIGNS, {}).map((item) => item.id)).toEqual([1, 2, 3])
    // The viewed one moves ahead; the rest stay as the server sent them.
    expect(sortByLastViewed(CAMPAIGNS, { 2: 500 }).map((item) => item.id)).toEqual([2, 1, 3])
  })

  it('treats number and string ids as the same key', () => {
    const guestCampaigns = [{ id: 'guest_campaign_1' }, { id: 'guest_campaign_2' }]

    expect(
      sortByLastViewed(guestCampaigns, { guest_campaign_2: 200 }).map((item) => item.id),
    ).toEqual(['guest_campaign_2', 'guest_campaign_1'])
    // The history always stores strings; the items may carry numbers.
    expect(sortByLastViewed(CAMPAIGNS, { 3: 300 }).map((item) => item.id)).toEqual([3, 1, 2])
  })

  it('leaves the input array untouched', () => {
    const input = [...CAMPAIGNS]

    sortByLastViewed(input, { 3: 300 })

    expect(input.map((item) => item.id)).toEqual([1, 2, 3])
  })

  it('returns an empty list for a missing or empty input', () => {
    expect(sortByLastViewed(undefined, {})).toEqual([])
    expect(sortByLastViewed([], { 1: 100 })).toEqual([])
  })

  it('accepts a custom id accessor', () => {
    const rows = [
      { slug: 'a', id: 1 },
      { slug: 'b', id: 2 },
    ]

    const sorted = sortByLastViewed(rows, { b: 200 }, { getId: (row) => row.slug })

    expect(sorted.map((row) => row.slug)).toEqual(['b', 'a'])
  })
})
