import apiClient from '@/api/apiClient'

/**
 * Journal API calls, scoped to one campaign.
 *
 * A journal is one private book of numbered pages per participant: its owner is
 * the only reader and writer, and the campaign owner and a GM have no access to
 * it either. Every call here is therefore the caller's *own* journal — no
 * endpoint takes a user id.
 *
 * The trailing blank page a reader can always write on is virtual, so opening a
 * journal writes nothing; the journal row itself appears with the first save.
 */
const JournalService = {
  /**
   * Fetch the caller's journal in a campaign. Creates nothing.
   * @param {number|string} campaignId
   * @returns {Promise<object>} JournalDTO
   */
  async fetchJournal(campaignId) {
    const response = await apiClient.get(`api/journals/campaign/${campaignId}`)
    return response.data
  },

  /**
   * Insert a page, at the end of the book (`afterPageId` null) or after a given
   * page, which pushes every later page's number along.
   * @param {number|string} campaignId
   * @param {{afterPageId?: number|string|null, content?: string}} page
   * @returns {Promise<object>} JournalDTO — the whole journal after the change
   */
  async createPage(campaignId, page = {}) {
    const response = await apiClient.post(`api/journals/campaign/${campaignId}/pages`, {
      afterPageId: page.afterPageId ?? null,
      content: page.content ?? '',
    })
    return response.data
  },

  /**
   * Rewrite one page.
   *
   * `version` is required — it is the token from the page as it was loaded, and a
   * stale one is refused with 409 rather than overwriting someone else's save.
   * Clearing the last stored page removes it, which is how the trailing blank
   * page becomes virtual again.
   *
   * @param {number|string} pageId
   * @param {{content: string, version: number}} page
   * @returns {Promise<{page: object|null, pageCount: number}>} JournalPageSaveDTO
   */
  async updatePage(pageId, page) {
    const response = await apiClient.patch(`api/journals/pages/${pageId}`, {
      content: page.content ?? '',
      version: page.version,
    })
    return response.data
  },

  /**
   * Delete one page; the pages after it close the gap.
   * @param {number|string} pageId
   * @returns {Promise<object>} JournalDTO — the whole journal after the change
   */
  async deletePage(pageId) {
    const response = await apiClient.delete(`api/journals/pages/${pageId}`)
    return response.data
  },
}

export default JournalService
