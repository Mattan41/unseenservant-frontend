/**
 * A random, URL-safe token for ids the client mints and the backend only stores
 * (a section, a guest-mode record).
 *
 * `crypto.randomUUID` needs a secure context, so a page served over plain HTTP
 * falls back to `crypto.getRandomValues`, which does not.
 */
export function randomToken() {
  const cryptoApi = globalThis.crypto
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID()
  const bytes = cryptoApi.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
