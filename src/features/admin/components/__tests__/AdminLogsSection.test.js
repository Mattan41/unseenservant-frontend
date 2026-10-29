import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import AdminLogsSection from '@/features/admin/components/AdminLogsSection.vue'
import AdminService from '@/features/admin/AdminService.js'
import { formatUtcDateTime } from '@/utils/timestampUtils.js'

/**
 * Admin → Logs, the read-only audit view.
 *
 * What this pins: a row reads as the sentence the backend recorded (including the
 * one shape with no account behind it, a failed sign-in), and the filter sends the
 * type to the backend rather than filtering a page client-side — a client-side
 * filter over the newest 100 rows would show a sparse, dishonest page.
 */
vi.mock('@/features/admin/AdminService.js', () => ({
  default: {
    fetchLogs: vi.fn(),
  },
}))

const ROLE_CHANGE = {
  id: 41,
  type: 'ROLE_CHANGED',
  occurredAt: '2026-10-26T19:04:11',
  actorId: 6,
  actorName: 'admin',
  targetId: 2,
  targetName: 'User2',
  detail: 'USER -> ADMIN',
  clientIp: '203.0.113.7',
}

const FAILED_LOGIN = {
  id: 40,
  type: 'LOGIN_FAILED',
  occurredAt: '2026-10-26T19:03:00',
  actorId: null,
  actorName: 'guessy',
  targetId: null,
  targetName: null,
  detail: 'wrong password or unknown username',
  clientIp: '203.0.113.9',
}

async function mountSection(rows) {
  setActivePinia(createPinia())
  AdminService.fetchLogs.mockResolvedValue(rows)

  const wrapper = mount(AdminLogsSection)
  await flushPromises()
  return wrapper
}

describe('AdminLogsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('says so when nothing has been recorded', async () => {
    const wrapper = await mountSection([])

    expect(wrapper.text()).toContain('Nothing recorded yet.')
    expect(wrapper.find('.badge').exists()).toBe(false)
  })

  it('badges and labels each row', async () => {
    const wrapper = await mountSection([ROLE_CHANGE, FAILED_LOGIN])

    expect(wrapper.findAll('.badge').map((badge) => badge.text())).toEqual([
      'Role changed',
      'Failed sign-in',
    ])
  })

  it('reads as the sentence the event recorded', async () => {
    const wrapper = await mountSection([ROLE_CHANGE])

    expect(wrapper.text()).toContain('admin → User2')
    expect(wrapper.text()).toContain('USER -> ADMIN')
    expect(wrapper.text()).toContain('from 203.0.113.7')
  })

  it('shows a failed attempt with no target, because there is none', async () => {
    const wrapper = await mountSection([FAILED_LOGIN])

    expect(wrapper.text()).toContain('guessy')
    expect(wrapper.text()).not.toContain('→')
  })

  it('renders the timestamp in the reader zone, not the raw UTC string', async () => {
    const wrapper = await mountSection([ROLE_CHANGE])

    expect(wrapper.text()).toContain(formatUtcDateTime(ROLE_CHANGE.occurredAt))
    expect(wrapper.text()).not.toContain(ROLE_CHANGE.occurredAt)
  })

  it('filters on the backend, passing the type as a parameter', async () => {
    const wrapper = await mountSection([ROLE_CHANGE])

    expect(wrapper.get('#audit-log-filter').findAll('option')).toHaveLength(11)
    expect(AdminService.fetchLogs).toHaveBeenCalledWith({ type: undefined, limit: 100 })

    AdminService.fetchLogs.mockResolvedValue([FAILED_LOGIN])
    await wrapper.get('#audit-log-filter').setValue('LOGIN_FAILED')
    await flushPromises()

    expect(AdminService.fetchLogs).toHaveBeenLastCalledWith({ type: 'LOGIN_FAILED', limit: 100 })
    expect(wrapper.findAll('.badge').map((badge) => badge.text())).toEqual(['Failed sign-in'])
  })

  it('offers no paging while the page is short', async () => {
    const wrapper = await mountSection([ROLE_CHANGE])

    expect(wrapper.text()).not.toContain('Load older events')
  })

  it('offers paging once a page comes back full', async () => {
    const fullPage = Array.from({ length: 100 }, (_, index) => ({
      ...ROLE_CHANGE,
      id: 1000 - index,
    }))
    const wrapper = await mountSection(fullPage)

    expect(wrapper.text()).toContain('Load older events')
  })

  it('says what the trail does and does not hold', async () => {
    const wrapper = await mountSection([])

    expect(wrapper.text()).toContain('Campaigns, messages and characters are not recorded here.')
  })
})
