import axios from 'axios'

/**
 * Open5e Axios Instance
 *
 * Dedicated Axios instance for Open5e API v2 calls.
 * No auth headers or interceptors needed for this public API.
 *
 * Base URL: https://api.open5e.com/v2/
 */
const open5eAxios = axios.create({
  baseURL: 'https://api.open5e.com/v2/',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default open5eAxios
