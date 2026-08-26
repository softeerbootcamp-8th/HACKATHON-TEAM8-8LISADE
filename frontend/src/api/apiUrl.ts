/**
 * Uses Vite's local proxy when no API origin is configured, and the deployed
 * API endpoint when the app is built for Vercel or Capacitor.
 */
export function resolveApiUrl(path: string, apiBaseUrl: string | undefined): string {
  if (!apiBaseUrl) {
    return path
  }

  return `${apiBaseUrl.replace(/\/$/, '')}${path}`
}

export function apiUrl(path: string): string {
  return resolveApiUrl(path, import.meta.env.VITE_API_BASE_URL)
}
