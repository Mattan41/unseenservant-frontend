import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useCampaignStore } from '@/features/campaign/campaignStore.js'
import {
  ACTIVITY_POLL_INTERVAL_MS,
  useCampaignActivityPoll,
} from '@/features/campaign/useCampaignActivityPoll.js'

/**
 * A host that joins the shared poll, exactly as the campaign list and a
 * campaign's own view do. Mounting it runs the composable's `onMounted`, so the
 * timer and its ref-count behave as they do in the app.
 */
function mountConsumer() {
  const Host = defineComponent({
    setup() {
      useCampaignActivityPoll()
      return () => h('div')
    },
  })
  return mount(Host)
}

/** jsdom only lets `document.hidden` be flipped by redefining it. */
function setHidden(hidden) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useCampaignActivityPoll', () => {
  let fetchActivity
  const wrappers = []

  const mountTracked = () => {
    const wrapper = mountConsumer()
    wrappers.push(wrapper)
    return wrapper
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    fetchActivity = vi
      .spyOn(useCampaignStore(), 'fetchCampaignActivity')
      .mockResolvedValue(undefined)
    vi.useFakeTimers()
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  })

  afterEach(() => {
    // Unmounting the last consumer stops the shared timer and clears the module
    // ref-count, so the next test starts from a clean slate.
    while (wrappers.length) {
      try {
        wrappers.pop().unmount()
      } catch {
        // Already unmounted inside the test.
      }
    }
    vi.useRealTimers()
  })

  it('reads once on mount and then on every interval', () => {
    mountTracked()

    expect(fetchActivity).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(ACTIVITY_POLL_INTERVAL_MS)
    expect(fetchActivity).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(ACTIVITY_POLL_INTERVAL_MS)
    expect(fetchActivity).toHaveBeenCalledTimes(3)
  })

  it('shares one timer between consumers, so two views do not double the requests', () => {
    mountTracked()
    mountTracked()

    // Only the first consumer read on mount.
    expect(fetchActivity).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(ACTIVITY_POLL_INTERVAL_MS)
    expect(fetchActivity).toHaveBeenCalledTimes(2)
  })

  it('polls nothing while hidden, and refreshes once on return', () => {
    mountTracked()
    expect(fetchActivity).toHaveBeenCalledTimes(1)

    setHidden(true)
    vi.advanceTimersByTime(ACTIVITY_POLL_INTERVAL_MS * 3)
    expect(fetchActivity).toHaveBeenCalledTimes(1)

    setHidden(false)
    // Back in view: one immediate read, then the interval resumes.
    expect(fetchActivity).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(ACTIVITY_POLL_INTERVAL_MS)
    expect(fetchActivity).toHaveBeenCalledTimes(3)
  })

  it('keeps polling while one consumer remains, and stops with the last', () => {
    const first = mountTracked()
    const second = mountTracked()

    first.unmount()
    vi.advanceTimersByTime(ACTIVITY_POLL_INTERVAL_MS)
    expect(fetchActivity).toHaveBeenCalledTimes(2)

    second.unmount()
    vi.advanceTimersByTime(ACTIVITY_POLL_INTERVAL_MS * 2)
    expect(fetchActivity).toHaveBeenCalledTimes(2)
  })
})
