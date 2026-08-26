/**
 * Uses Vite's local proxy when no API origin is configured, and the deployed
 * API endpoint when the app is built for Vercel or Capacitor.
 */
export function resolveApiUrl(path: string, apiBaseUrl: string | undefined, localDebug = false): string {
  if (!apiBaseUrl) {
    return path
  }

  const url = new URL(apiBaseUrl)
  const localhost = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.username || url.password || (url.protocol !== 'https:' && !(localDebug && url.protocol === 'http:' && localhost))) {
    throw new Error('HTTPS API 주소가 필요합니다.')
  }

  return `${apiBaseUrl.replace(/\/$/, '')}${path}`
}

export function apiUrl(path: string): string {
  return resolveApiUrl(path, import.meta.env.VITE_API_BASE_URL, import.meta.env.DEV)
}
