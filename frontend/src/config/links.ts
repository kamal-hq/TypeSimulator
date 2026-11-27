const DEFAULT_DOWNLOAD_URL =
  'https://github.com/kamal-hq/TypeSimulator/releases/latest/download/TypeSimulator-Setup-v2.0.0.exe'

const DEFAULT_GITHUB_URL = 'https://github.com/kamal-hq/TypeSimulator'

export const CONTACT_EMAIL = 'muhammad.kamal.hq@gmail.com'
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`

function safeHttpsUrl(candidate: string | undefined, fallback: string): string {
  const raw = (candidate || '').trim()
  if (!raw) return fallback
  try {
    const parsed = new URL(raw)
    if (parsed.protocol === 'https:') return parsed.toString()
  } catch {
    // Reject malformed URLs
  }
  return fallback
}

export const RELEASE_DOWNLOAD_URL = safeHttpsUrl(import.meta.env.VITE_DOWNLOAD_URL, DEFAULT_DOWNLOAD_URL)
export const GITHUB_REPO_URL = safeHttpsUrl(import.meta.env.VITE_GITHUB_URL, DEFAULT_GITHUB_URL)

export function isAllowedDesktopExternalUrl(url: string): boolean {
  const raw = (url || '').trim()
  if (!raw) return false
  if (raw.toLowerCase() === CONTACT_MAILTO) return true
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'github.com') return false
    const path = parsed.pathname.toLowerCase()
    return path === '/kamal-hq/typesimulator' || path.startsWith('/kamal-hq/typesimulator/')
  } catch {
    return false
  }
}

export function openExternalUrlSafe(url: string): void {
  if (typeof window === 'undefined') return
  if (window.pywebview?.api?.open_external_url) {
    if (isAllowedDesktopExternalUrl(url)) {
      void window.pywebview.api.open_external_url(url)
    }
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
