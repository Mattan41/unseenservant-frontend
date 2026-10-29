import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import guestAxios from '@/api/lib/guest-axios.js'
import { seedGuestStorage } from '@/data/demoData.js'
import { useAuthStore } from '@/features/auth/authStore.js'
import { MAX_PAGE_CHARS } from '@/features/journal/journalLimits.js'

/**
 * Guest mode's journal routes: the same rules the backend enforces, so the
 * standalone demo cannot be used to reach another participant's writing.
 *
 * The demo user plays in `guest_campaign_4` (the Offworlders campaign, which the
 * demo-data test pins), so that is the journal these tests open.
 */
const CAMPAIGN = 'guest_campaign_4'

const read = (key) => JSON.parse(localStorage.getItem(key))
const pages = () => read('guest_journal_pages')
const journals = () => read('guest_journals')

function startGuestSession() {
  setActivePinia(createPinia())
  localStorage.clear()
  seedGuestStorage()
  useAuthStore().isGuest = true
}

/** The book as the API answers it. */
const fetchJournal = () => guestAxios.get(`api/journals/campaign/${CAMPAIGN}`).then((r) => r.data)

/** Write a page at the end of the book. */
const appendPage = (content) =>
  guestAxios
    .post(`api/journals/campaign/${CAMPAIGN}/pages`, { afterPageId: null, content })
    .then((r) => r.data)

/** Insert a page after `afterPageId`. */
const insertPage = (afterPageId, content) =>
  guestAxios
    .post(`api/journals/campaign/${CAMPAIGN}/pages`, { afterPageId, content })
    .then((r) => r.data)

/** Rewrite one page. */
const rewritePage = (pageId, content, version) =>
  guestAxios.patch(`api/journals/pages/${pageId}`, { content, version })

describe('guest-axios journal routes', () => {
  beforeEach(startGuestSession)

  it('answers an empty journal and stores nothing for it', async () => {
    const journal = await fetchJournal()

    expect(journal).toMatchObject({ id: null, campaignId: CAMPAIGN, pageCount: 0, pages: [] })
    expect(journals()).toEqual([])
    expect(pages()).toEqual([])
  })

  it('creates the journal with the first write', async () => {
    const journal = await appendPage('Session one')

    expect(journal.pageCount).toBe(1)
    expect(journal.pages[0]).toMatchObject({ pageNumber: 1, content: 'Session one', version: 0 })
    expect(journals()).toHaveLength(1)
    expect(journals()[0]).toMatchObject({ campaignId: CAMPAIGN, userId: 'guest_demo' })
  })

  it('appending a blank page changes nothing at all', async () => {
    const journal = await appendPage('   ')

    expect(journal).toMatchObject({ id: null, pageCount: 0 })
    expect(journals()).toEqual([])
  })

  it('inserting after a page pushes the later numbers along', async () => {
    await appendPage('one')
    await appendPage('two')
    const first = (await fetchJournal()).pages[0]

    const journal = await insertPage(first.id, 'inserted')

    expect(journal.pages.map((page) => [page.pageNumber, page.content])).toEqual([
      [1, 'one'],
      [2, 'inserted'],
      [3, 'two'],
    ])
  })

  it('keeps a blank page inserted in the middle', async () => {
    await appendPage('one')
    const first = (await fetchJournal()).pages[0]
    await appendPage('two')

    const journal = await insertPage(first.id, '')

    expect(journal.pageCount).toBe(3)
    expect(journal.pages[1]).toMatchObject({ pageNumber: 2, content: '' })
  })

  it('clearing the last page removes it, and blank pages before it collapse', async () => {
    await appendPage('one')
    const first = (await fetchJournal()).pages[0]
    await insertPage(first.id, '') // a blank page in the middle
    const last = (await appendPage('three')).pages[2]

    const { data } = await rewritePage(last.id, '', last.version)

    expect(data.page).toBeNull()
    expect(data.pageCount).toBe(1)
    const journal = await fetchJournal()
    expect(journal.pages.map((page) => page.content)).toEqual(['one'])
  })

  it('requires the version token, like the backend', async () => {
    const page = (await appendPage('one')).pages[0]

    await expect(rewritePage(page.id, 'mine', undefined)).rejects.toMatchObject({
      response: { status: 400 },
    })
  })

  it('refuses a stale version with 409 instead of overwriting', async () => {
    const page = (await appendPage('one')).pages[0]
    await rewritePage(page.id, 'first rewrite', page.version)

    await expect(rewritePage(page.id, 'second rewrite', page.version)).rejects.toMatchObject({
      response: { status: 409 },
    })

    const journal = await fetchJournal()
    expect(journal.pages[0].content).toBe('first rewrite')
  })

  it('refuses a page past the character limit', async () => {
    await expect(appendPage('a'.repeat(MAX_PAGE_CHARS + 1))).rejects.toMatchObject({
      response: { status: 400 },
    })
  })

  it('deletes a page and closes the gap in the numbering', async () => {
    await appendPage('one')
    await appendPage('two')
    await appendPage('three')
    const middle = (await fetchJournal()).pages[1]

    const { data } = await guestAxios.delete(`api/journals/pages/${middle.id}`)

    expect(data.pageCount).toBe(2)
    expect(data.pages.map((page) => [page.pageNumber, page.content])).toEqual([
      [1, 'one'],
      [2, 'three'],
    ])
  })

  it('answers 404, like an unknown id, for another participant’s page', async () => {
    // A page in somebody else's journal: it must not be readable or writable.
    localStorage.setItem(
      'guest_journals',
      JSON.stringify([{ id: 'guest_journal_x', campaignId: CAMPAIGN, userId: 'guest_player_1' }]),
    )
    localStorage.setItem(
      'guest_journal_pages',
      JSON.stringify([
        {
          id: 'guest_page_x',
          journalId: 'guest_journal_x',
          content: 'secret',
          position: 1,
          version: 0,
        },
      ]),
    )

    await expect(rewritePage('guest_page_x', 'peeking', 0)).rejects.toMatchObject({
      response: { status: 404 },
    })
    await expect(guestAxios.delete('api/journals/pages/guest_page_x')).rejects.toMatchObject({
      response: { status: 404 },
    })
    expect(pages()[0].content).toBe('secret')
  })

  it('refuses a campaign the guest does not play in', async () => {
    localStorage.setItem(
      'guest_campaigns',
      JSON.stringify([
        ...read('guest_campaigns'),
        {
          id: 'guest_campaign_9',
          name: 'Not Yours',
          ownerId: 'guest_player_1',
          participants: [{ id: 'guest_player_1', nickname: 'User1', role: 'GM' }],
        },
      ]),
    )

    await expect(guestAxios.get('api/journals/campaign/guest_campaign_9')).rejects.toMatchObject({
      response: { status: 403 },
    })
    await expect(
      guestAxios.post('api/journals/campaign/guest_campaign_9/pages', { content: 'mine' }),
    ).rejects.toMatchObject({ response: { status: 403 } })
  })

  it('answers 404 for a campaign that does not exist', async () => {
    await expect(guestAxios.get('api/journals/campaign/guest_campaign_404')).rejects.toMatchObject({
      response: { status: 404 },
    })
  })

  it('never exposes another participant’s journal through a plain read', async () => {
    await appendPage('private notes')
    localStorage.setItem(
      'guest_journals',
      JSON.stringify([
        ...journals(),
        { id: 'guest_journal_y', campaignId: CAMPAIGN, userId: 'guest_player_2' },
      ]),
    )
    localStorage.setItem(
      'guest_journal_pages',
      JSON.stringify([
        ...pages(),
        {
          id: 'guest_page_y',
          journalId: 'guest_journal_y',
          content: 'not yours',
          position: 1,
          version: 0,
        },
      ]),
    )

    const journal = await fetchJournal()

    expect(journal.pageCount).toBe(1)
    expect(journal.pages[0].content).toBe('private notes')
  })
})
