import apiClient from '@/api/apiClient'

// OAuth redirects need the full URL because Cloudflare Pages can't proxy OAuth properly
// For local dev and RPI, this will be empty (relative URLs work via Vite proxy/nginx)
// For Cloudflare Pages, this points to the main backend
const oauthBase = import.meta.env.VITE_OAUTH_BASE_URL || ''

class AuthService {
  async loginWithGoogle() {
    const origin = window.location.origin
    window.location.href = `${oauthBase}/api/auth/oauth-init?provider=google&origin=${encodeURIComponent(origin)}`
  }

  async loginWithGithub() {
    const origin = window.location.origin
    window.location.href = `${oauthBase}/api/auth/oauth-init?provider=github&origin=${encodeURIComponent(origin)}`
  }

  async getCurrentUser() {
    const response = await apiClient.get(`/api/auth/me`)
    return response.data
  }

  async loginWithUsernamePassword(username, password) {
    const response = await apiClient.post(`/api/auth/login`, { username, password })

    // Extract JWT token from Authorization header (format: "Bearer <token>")
    const authHeader = response.headers?.authorization || response.headers?.Authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No authorization token received in response headers')
    }

    const token = authHeader.substring(7) // Strip "Bearer " prefix (7 characters)

    return {
      token,
      user: response.data, // Return user metadata from body (id, username, email, role)
    }
  }
}
export default new AuthService()
