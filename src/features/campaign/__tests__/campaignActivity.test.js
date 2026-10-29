import { describe, it, expect } from 'vitest'
import {
  campaignHasActivity,
  changedSince,
  currentMarkers,
  newestMessageStamp,
  sectionAlerts,
  unreadMessageCount,
} from '@/features/campaign/campaignActivity.js'

/**
 * The badge decision in one place: what the backend reports as changed, against
 * what the client remembers having seen. Pure, so it needs neither a store nor a
 * DOM — the views only assemble its arguments.
 */

const ME = 3
const SOMEONE_ELSE = 4

/** A message as the API sends it: UTC wall clock, no offset. */
const message = (userId, createdAt) => ({ userId, createdAt })

describe('newestMessageStamp', () => {
  it('answers the newest stamp, normalised to UTC ISO-8601', () => {
    expect(
      newestMessageStamp([
        message(SOMEONE_ELSE, '2026-10-29T09:00:00'),
        message(ME, '2026-10-29T11:30:00'),
        message(SOMEONE_ELSE, '2026-10-29T10:00:00'),
      ]),
    ).toBe('2026-10-29T11:30:00.000Z')
  })

  it('reads a zone-less backend stamp as UTC, not as local time', () => {
    expect(newestMessageStamp([message(ME, '2026-10-29T09:00:00')])).toBe(
      '2026-10-29T09:00:00.000Z',
    )
  })

  it('falls back when there is no usable stamp at all', () => {
    expect(newestMessageStamp([], 'fallback')).toBe('fallback')
    expect(newestMessageStamp([message(ME, null), message(ME, 'nonsense')], 'fallback')).toBe(
      'fallback',
    )
    expect(newestMessageStamp([], null)).toBeNull()
  })
})

describe('currentMarkers', () => {
  it('takes each stamp from its own area', () => {
    expect(
      currentMarkers({
        campaign: { updatedAt: '2026-10-29T08:00:00' },
        ship: { updatedAt: '2026-10-30T08:00:00' },
        messages: [message(SOMEONE_ELSE, '2026-10-31T08:00:00')],
        now: 'now',
      }),
    ).toEqual({
      messages: '2026-10-31T08:00:00.000Z',
      lore: '2026-10-29T08:00:00',
      ship: '2026-10-30T08:00:00',
    })
  })

  it('uses the fallback for an area the campaign does not have', () => {
    expect(currentMarkers({ campaign: null, ship: null, messages: [], now: 'now' })).toEqual({
      messages: 'now',
      lore: 'now',
      ship: 'now',
    })
  })
})

describe('unreadMessageCount', () => {
  const messages = [
    message(SOMEONE_ELSE, '2026-10-29T09:00:00'),
    message(SOMEONE_ELSE, '2026-10-29T11:00:00'),
    message(ME, '2026-10-29T12:00:00'),
  ]

  it('counts the messages of others written after the marker', () => {
    expect(unreadMessageCount(messages, ME, '2026-10-29T08:00:00Z')).toBe(2)
    expect(unreadMessageCount(messages, ME, '2026-10-29T10:00:00Z')).toBe(1)
  })

  it('never counts the user as unread for their own posts', () => {
    // Only my own message is newer than this marker.
    expect(unreadMessageCount(messages, ME, '2026-10-29T11:30:00Z')).toBe(0)
  })

  it('counts nothing without a usable marker', () => {
    expect(unreadMessageCount(messages, ME, null)).toBe(0)
    expect(unreadMessageCount(messages, ME, 'nonsense')).toBe(0)
    expect(unreadMessageCount([], ME, '2026-10-29T08:00:00Z')).toBe(0)
  })
})

describe('changedSince', () => {
  it('is true only when the change is strictly newer than the marker', () => {
    expect(changedSince('2026-10-29T10:00:00', '2026-10-29T09:00:00')).toBe(true)
    expect(changedSince('2026-10-29T09:00:00', '2026-10-29T09:00:00')).toBe(false)
    expect(changedSince('2026-10-29T08:00:00', '2026-10-29T09:00:00')).toBe(false)
  })

  it('is false when either side is missing', () => {
    expect(changedSince(null, '2026-10-29T09:00:00')).toBe(false)
    expect(changedSince('2026-10-29T09:00:00', null)).toBe(false)
    expect(changedSince(undefined, undefined)).toBe(false)
  })
})

describe('sectionAlerts', () => {
  const campaign = { updatedAt: '2026-10-29T10:00:00' }
  const ship = { updatedAt: '2026-10-29T10:00:00' }
  const messages = [message(SOMEONE_ELSE, '2026-10-29T11:00:00')]

  it('counts the messages of others written after the Messages marker', () => {
    const alerts = sectionAlerts({
      campaign,
      ship,
      messages,
      userId: ME,
      markers: { messages: '2026-10-29T10:00:00Z' },
    })

    expect(alerts.messages).toEqual({ count: 1 })
    // The lore and the ship have never been opened here, and an unopened section
    // is seeded rather than badged — see the "unmarked campaign" case below.
    expect(alerts.lore).toEqual({ isNew: false })
    expect(alerts.ship).toEqual({ isNew: false })
  })

  it('dots the lore and the ship once their stamps move past their markers', () => {
    const alerts = sectionAlerts({
      campaign,
      ship,
      messages,
      userId: ME,
      markers: {
        messages: '2026-10-29T11:00:00Z',
        lore: '2026-10-29T09:00:00Z',
        ship: '2026-10-29T09:00:00Z',
      },
    })

    expect(alerts).toEqual({
      messages: { count: 0 },
      lore: { isNew: true },
      ship: { isNew: true },
    })
  })

  it('is quiet for a section the user has just marked as seen', () => {
    const markers = {
      messages: '2026-10-29T11:00:00Z',
      lore: '2026-10-29T10:00:00Z',
      ship: '2026-10-29T10:00:00Z',
    }

    expect(sectionAlerts({ campaign, ship, messages, userId: ME, markers })).toEqual({
      messages: { count: 0 },
      lore: { isNew: false },
      ship: { isNew: false },
    })
  })

  it('badges nothing for an unmarked campaign, so a first visit is quiet', () => {
    expect(sectionAlerts({ campaign, ship, messages, userId: ME, markers: {} })).toEqual({
      messages: { count: 0 },
      lore: { isNew: false },
      ship: { isNew: false },
    })
  })

  it('survives a half-loaded campaign', () => {
    expect(sectionAlerts({ campaign: null, ship: null, userId: ME })).toEqual({
      messages: { count: 0 },
      lore: { isNew: false },
      ship: { isNew: false },
    })
  })
})

describe('campaignHasActivity', () => {
  const activity = {
    campaignUpdatedAt: '2026-10-29T09:00:00',
    lastMessageAt: '2026-10-29T11:00:00',
    shipUpdatedAt: '2026-10-29T12:00:00',
  }

  it('is true when any of the three areas is newer than its marker', () => {
    expect(campaignHasActivity(activity, { lore: '2026-10-29T08:00:00Z' })).toBe(true)
    expect(campaignHasActivity(activity, { messages: '2026-10-29T10:00:00Z' })).toBe(true)
    expect(campaignHasActivity(activity, { ship: '2026-10-29T11:00:00Z' })).toBe(true)
  })

  it('is false once every area has been seen', () => {
    const markers = {
      lore: '2026-10-29T09:00:00Z',
      messages: '2026-10-29T11:00:00Z',
      ship: '2026-10-29T12:00:00Z',
    }

    expect(campaignHasActivity(activity, markers)).toBe(false)
  })

  it('is false for a campaign with no activity row or no markers', () => {
    expect(campaignHasActivity(null, { lore: '2026-10-29T08:00:00Z' })).toBe(false)
    expect(campaignHasActivity(activity, {})).toBe(false)
  })
})
