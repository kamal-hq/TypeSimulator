export type EngineState = 'IDLE' | 'COUNTDOWN' | 'TYPING' | 'PAUSED' | 'COMPLETED' | 'ABORTED'

export type CadencePreset = 'Natural' | 'Fast' | 'Thoughtful' | 'Steady' | 'Custom'

export interface HotkeyBindings {
  startResume: string
  pause: string
  abort: string
}

export interface TypingConfig {
  preset: CadencePreset
  targetWpm: number
  variability: number
  countdown: number
  typosEnabled: boolean
  errorRate: number
  newlines: 'enter' | 'shift-enter'
  tabs: '4-spaces' | '2-spaces' | 'strip' | 'send-tab'
  stripMarkdown: boolean
  clearOnComplete: boolean
  focusGuard: boolean
  hotkeys: HotkeyBindings
}

export interface EngineSnapshot {
  state: EngineState
  cursor: number
  total: number
  output: string
  liveWpm: number
  etaSeconds: number
  countdownRemaining: number
  typoCorrections: number
  pauseReason?: string
  targetWindowTitle?: string
  wpmHistory: number[]
  errorMessage?: string
}

export interface SanitizeBreakdown {
  smartQuotes: number
  dashes: number
  ellipses: number
  nbsp: number
  zeroWidth: number
  bullets: number
  lineEndings: number
}

export interface SanitizeResult {
  original: string
  sanitized: string
  totalArtifacts: number
  breakdown: SanitizeBreakdown
}

export interface Snippet {
  id: string
  title: string
  text: string
  tags: string[]
  createdAt: string
}

export interface RuntimeInfo {
  mode: 'web' | 'desktop'
  label: 'Web Sandbox' | 'Desktop OS Engine'
  version: string
  platform?: string
  isElevated?: boolean
  hotkeyError?: string | null
}
