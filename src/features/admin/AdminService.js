import apiClient from '@/api/apiClient'

/**
 * Administrator endpoints (`/api/admin/**`, ROLE_ADMIN only).
 *
 * Three concerns live behind one prefix: the account list with its role
 * changes, the email whitelist that gates OAuth logins, and the audit trail
 * those changes write to. Every call is refused by the backend for a
 * non-administrator, so the UI gate is a convenience, not the security
 * boundary.
 */
const AdminService = {
  async fetchUsers() {
    const response = await apiClient.get(`api/admin/users`, {})
    return response.data
  },

  /** Change one account's role (`USER` | `ADMIN`). */
  async updateUserRole(userId, role) {
    const response = await apiClient.patch(`api/admin/users/${userId}/role`, { role }, {})
    return response.data
  },

  /** Every whitelist row, active and revoked. */
  async fetchWhitelist() {
    const response = await apiClient.get(`api/admin/whitelist`, {})
    return response.data
  },

  /** Admit an address; an address that was revoked is re-activated instead. */
  async addWhitelistEntry(email, role) {
    const response = await apiClient.post(`api/admin/whitelist`, { email, role }, {})
    return response.data
  },

  /** Partial update: `{ role }`, `{ active }` or both. */
  async updateWhitelistEntry(id, patch) {
    const response = await apiClient.patch(`api/admin/whitelist/${id}`, patch, {})
    return response.data
  },

  /** Soft delete — the row is kept but stops admitting logins. */
  async removeWhitelistEntry(id) {
    await apiClient.delete(`api/admin/whitelist/${id}`, {})
  },

  /**
   * The audit trail, newest first.
   *
   * @param {object} [params]
   * @param {string} [params.type] Only this event type; omitted means all of them
   * @param {number} [params.beforeId] Cursor: the id of the last row of the page before
   * @param {number} [params.limit] Rows per page; the backend clamps it
   * @returns {Promise<Array>} Array of AuditEventDTO
   */
  async fetchLogs({ type, beforeId, limit } = {}) {
    const response = await apiClient.get(`api/admin/logs`, {
      params: { type, beforeId, limit },
    })
    return response.data
  },
}

export default AdminService
