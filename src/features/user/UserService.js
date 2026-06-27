import apiClient from '@/api/apiClient'
const UserService = {
  async fetchCurrentUserInfo() {
    const response = await apiClient.get(`api/users/me`, {})
    return response.data
  },

  async fetchUser(userId) {
    const response = await apiClient.get(`api/users/${userId}`, {})
    return response.data
  },

  async updateProfile(userId, data) {
    const response = await apiClient.put(`api/users/${userId}`, data, {})
    return response.data
  },

  async updateProfileField(userId, field, value) {
    const response = await apiClient.patch(
      `api/users/${userId}`,
      {
        [field]: value,
      },
      {},
    )

    return response.data
  },
}

export default UserService
