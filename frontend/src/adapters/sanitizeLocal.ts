import type { SanitizeBreakdown, SanitizeResult, TypingConfig } from '../types/engine'

export const defaultConfig: TypingConfig = {
  preset: 'Natural',
  targetWpm: 68,
  variability: 34,
  countdown: 3,
  typosEnabled: true,
  errorRate: 2,
  newlines: 'enter',
  tabs: '4-spaces',
  stripMarkdown: false,
  clearOnComplete: false,
  focusGuard: true,
  hotkeys: {
    startResume: 'F9',
    pause: 'F10',
    abort: 'Ctrl+Shift+Esc',
  },
}

/** Deterministic local sanitizer aligned 1:1 with backend/sanitizer.py */
export function sanitizeLocally(text: string, config: TypingConfig = defaultConfig): SanitizeResult {
  const breakdown: SanitizeBreakdown = {
    smartQuotes: (text.match(/[“”„‟‘’‚‛]/g) || []).length,
    dashes: (text.match(/[—–−]/g) || []).length,
    ellipses: (text.match(/…/g) || []).length,
    nbsp: (text.match(/[\u00a0\u2000-\u200a\u202f\u205f\u3000]/g) || []).length,
    zeroWidth: (text.match(/[\u200B-\u200D\uFEFF\u2060]/g) || []).length,
    bullets: (text.match(/[•◦▪▫]/g) || []).length,
    lineEndings: (text.match(/\r\n|\r/g) || []).length,
  }

  let sanitized = text
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[—–−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[\u00a0\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, '')
    .replace(/[•◦▪▫]\s*/g, '- ')
    .replace(/\r\n|\r/g, '\n')

  if (config.stripMarkdown) {
    sanitized = sanitized
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/(\*\*\*|___)(.+?)\1/g, '$2')
      .replace(/(\*\*|__)(.+?)\1/g, '$2')
      .replace(/(?<!\w)(\*|_)(.+?)\1(?!\w)/g, '$2')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
  }

  if (config.tabs === '4-spaces') sanitized = sanitized.replace(/\t/g, '    ')
  else if (config.tabs === '2-spaces') sanitized = sanitized.replace(/\t/g, '  ')
  else if (config.tabs === 'strip') sanitized = sanitized.replace(/\t/g, '')

  const totalArtifacts = Object.values(breakdown).reduce((sum, count) => sum + count, 0)
  return { original: text, sanitized, totalArtifacts, breakdown }
}
