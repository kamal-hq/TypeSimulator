import {
  MAX_PAYLOAD_CHARS,
  MAX_SNIPPETS,
  MAX_SNIPPET_TAGS,
  MAX_SNIPPET_TEXT_CHARS,
  MAX_SNIPPET_TITLE_CHARS,
  MAX_TAG_CHARS,
  type ConfigUpdateResult,
  type EngineAdapter,
} from './engineAdapter'
import { defaultConfig, sanitizeLocally } from './sanitizeLocal'
import { openExternalUrlSafe } from '../config/links'
import type { EngineSnapshot, RuntimeInfo, SanitizeResult, Snippet, TypingConfig } from '../types/engine'
import type { ClearDataResult } from '../vite-env'

const SNIPPETS_KEY = 'typesimulator-snippets-v2'
const CONFIG_KEY = 'typesimulator-config-v2'

const QWERTY_NEIGHBORS: Record<string, string> = {
  q: 'wa', w: 'qesa', e: 'wsdr', r: 'edft', t: 'rfgy', y: 'tghu', u: 'yhji',
  i: 'ujko', o: 'iklp', p: 'ol', a: 'qwsz', s: 'qwedxza', d: 'werfcxs',
  f: 'ertgvcd', g: 'rtyhbvf', h: 'tyujnbg', j: 'yuikmnh', k: 'uiolmj',
  l: 'iopk', z: 'asx', x: 'zsdc', c: 'xdfv', v: 'cfgb', b: 'vghn', n: 'bhjm', m: 'njk',
}

const seedSnippets: Snippet[] = [
  {
    id: 'seed-1',
    title: 'VDI SSH Troubleshooting Block',
    text: 'sudo systemctl status sshd\njournalctl -u sshd --since "10 minutes ago"',
    tags: ['VDI', 'SSH'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-2',
    title: 'QA Form Regression Payload',
    text: 'Alex Morgan\nalex.morgan@example.test\nRegression run: required fields and validation states.',
    tags: ['QA', 'Forms'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-3',
    title: 'Live Demo Code Intro',
    text: '// Let’s build this one careful keystroke at a time.\nconst ready = true;',
    tags: ['Demo', 'Code'],
    createdAt: new Date().toISOString(),
  },
]

function boxMullerRandom(): number {
  const u1 = Math.max(1e-7, Math.random())
  const u2 = Math.random()
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
}

export class WebSandboxAdapter implements EngineAdapter {
  private config: TypingConfig = this.readStoredConfig()
  private timer?: number
  private source = ''
  private prevChar: string | null = null
  private charTimestamps: number[] = []
  private listeners = new Set<(snapshot: EngineSnapshot) => void>()
  private snapshot: EngineSnapshot = {
    state: 'IDLE',
    cursor: 0,
    total: 0,
    output: '',
    liveWpm: 0,
    etaSeconds: 0,
    countdownRemaining: 0,
    typoCorrections: 0,
    targetWindowTitle: 'Simulated Target Form',
    wpmHistory: [58, 65, 62, 71, 68, 74, 67, 70],
  }

  constructor(private mode: 'web' | 'desktop' = 'web') {}

  private readStoredConfig(): TypingConfig {
    try {
      const raw = localStorage.getItem(CONFIG_KEY)
      if (!raw) return { ...defaultConfig, hotkeys: { ...defaultConfig.hotkeys } }
      const parsed = JSON.parse(raw) as Partial<TypingConfig>
      return {
        ...defaultConfig,
        ...parsed,
        hotkeys: { ...defaultConfig.hotkeys, ...(parsed.hotkeys || {}) },
      }
    } catch {
      return { ...defaultConfig, hotkeys: { ...defaultConfig.hotkeys } }
    }
  }

  getRuntimeInfo(): RuntimeInfo {
    return {
      mode: this.mode,
      label: this.mode === 'desktop' ? 'Desktop OS Engine' : 'Web Sandbox',
      version: '2.0.0',
      platform: 'browser',
      isElevated: false,
    }
  }

  async loadRuntimeInfo(): Promise<RuntimeInfo> {
    return this.getRuntimeInfo()
  }

  async loadConfig(): Promise<TypingConfig> {
    return { ...this.config, hotkeys: { ...this.config.hotkeys } }
  }

  sanitize(text: string, config = this.config): SanitizeResult {
    return sanitizeLocally(text.slice(0, MAX_PAYLOAD_CHARS), config)
  }

  setStagedText(_text: string): void {
    // Handled locally in React state on Web
  }

  start(text: string) {
    if (this.snapshot.state === 'COUNTDOWN' || this.snapshot.state === 'TYPING') return
    if (text.length > MAX_PAYLOAD_CHARS) {
      this.snapshot = {
        ...this.snapshot,
        errorMessage: `Payload exceeds maximum limit of ${MAX_PAYLOAD_CHARS.toLocaleString()} characters.`,
      }
      this.emit()
      return
    }
    const sanitized = this.sanitize(text).sanitized
    if (!sanitized) return

    this.clearTimer()
    this.source = sanitized
    this.prevChar = null
    this.charTimestamps = []
    this.snapshot = {
      ...this.snapshot,
      state: 'COUNTDOWN',
      cursor: 0,
      total: this.source.length,
      output: '',
      liveWpm: 0,
      etaSeconds: this.estimateEta(this.source.length),
      countdownRemaining: this.config.countdown,
      typoCorrections: 0,
      pauseReason: undefined,
      errorMessage: undefined,
      targetWindowTitle: 'Simulated Target Form',
      wpmHistory: [],
    }
    this.emit()

    if (this.config.countdown <= 0) {
      this.beginTyping()
      return
    }

    const tick = () => {
      if (this.snapshot.state !== 'COUNTDOWN') return
      if (this.snapshot.countdownRemaining <= 1) {
        this.beginTyping()
        return
      }
      this.snapshot = {
        ...this.snapshot,
        countdownRemaining: this.snapshot.countdownRemaining - 1,
      }
      this.emit()
      this.timer = window.setTimeout(tick, 1000)
    }
    this.timer = window.setTimeout(tick, 1000)
  }

  private beginTyping() {
    this.charTimestamps = []
    this.snapshot = {
      ...this.snapshot,
      state: 'TYPING',
      countdownRemaining: 0,
      pauseReason: undefined,
    }
    this.emit()
    this.scheduleNext()
  }

  private computeDelayMs(char: string): number {
    const wpm = Math.max(25, Math.min(150, this.config.targetWpm))
    const baseMs = 12000 / wpm
    const sigma = 0.05 + (Math.max(0, Math.min(100, this.config.variability)) / 100) * 0.4
    const mu = -0.5 * sigma * sigma
    const factor = Math.max(0.45, Math.min(2.4, Math.exp(mu + sigma * boxMullerRandom())))

    let delay = baseMs * factor
    if (char === '\n') delay *= 1.9 + Math.random() * 1.3
    else if (/[.!?]/.test(char)) delay *= 1.7 + Math.random() * 1.2
    else if (/[,;:-]/.test(char)) delay *= 1.25 + Math.random() * 0.7
    else if (char === ' ') delay *= 1.12 + Math.random() * 0.48
    else if (this.prevChar && /[a-z]/i.test(this.prevChar) && /[a-z]/i.test(char)) {
      delay *= 0.78 + Math.random() * 0.3
    }
    return Math.max(14, Math.round(delay))
  }

  private maybeTypo(char: string): string | null {
    if (!this.config.typosEnabled || this.config.errorRate <= 0) return null
    const neighbors = QWERTY_NEIGHBORS[char.toLowerCase()]
    if (!neighbors) return null
    if (Math.random() >= this.config.errorRate / 100) return null
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)]
    return char === char.toUpperCase() ? pick.toUpperCase() : pick
  }

  private scheduleNext() {
    if (this.snapshot.state !== 'TYPING') return
    if (this.snapshot.cursor >= this.source.length) {
      this.snapshot = { ...this.snapshot, state: 'COMPLETED', liveWpm: 0, etaSeconds: 0 }
      this.emit()
      return
    }

    const char = this.source[this.snapshot.cursor]
    const delayMs = this.computeDelayMs(char)
    const wrongChar = this.maybeTypo(char)

    this.timer = window.setTimeout(() => {
      if (this.snapshot.state !== 'TYPING') return
      if (wrongChar) {
        this.snapshot = { ...this.snapshot, output: this.snapshot.output + wrongChar }
        this.emit()
        const reactionMs = 120 + Math.random() * 130
        this.timer = window.setTimeout(() => {
          if (this.snapshot.state !== 'TYPING') return
          this.snapshot = {
            ...this.snapshot,
            output: this.snapshot.output.slice(0, -1),
            typoCorrections: this.snapshot.typoCorrections + 1,
          }
          this.emit()
          const recoveryMs = 55 + Math.random() * 55
          this.timer = window.setTimeout(() => {
            if (this.snapshot.state !== 'TYPING') return
            this.typeCharacter(char)
          }, recoveryMs)
        }, reactionMs)
      } else {
        this.typeCharacter(char)
      }
    }, delayMs)
  }

  private computeLiveWpm(): number {
    if (this.charTimestamps.length < 2) return this.config.targetWpm
    const elapsedSec = (this.charTimestamps[this.charTimestamps.length - 1] - this.charTimestamps[0]) / 1000
    if (elapsedSec <= 0.02) return this.config.targetWpm
    const chars = this.charTimestamps.length - 1
    return Math.max(15, Math.min(240, Math.round((chars / 5) / (elapsedSec / 60))))
  }

  private estimateEta(remainingChars: number): number {
    if (remainingChars <= 0) return 0
    return Math.max(1, Math.ceil(((remainingChars / 5) / Math.max(25, this.config.targetWpm)) * 60 * 1.12))
  }

  private typeCharacter(char: string) {
    const cursor = this.snapshot.cursor + 1
    this.prevChar = char
    this.charTimestamps = [...this.charTimestamps, performance.now()].slice(-12)
    const liveWpm = this.computeLiveWpm()
    const history = [...this.snapshot.wpmHistory, liveWpm].slice(-20)
    const isDone = cursor >= this.source.length

    this.snapshot = {
      ...this.snapshot,
      state: isDone ? 'COMPLETED' : 'TYPING',
      cursor,
      output: this.snapshot.output + char,
      liveWpm: isDone ? 0 : liveWpm,
      wpmHistory: history,
      etaSeconds: isDone ? 0 : this.estimateEta(this.source.length - cursor),
    }
    this.emit()
    if (!isDone) this.scheduleNext()
  }

  pause(reason = 'Paused manually') {
    if (!['TYPING', 'COUNTDOWN'].includes(this.snapshot.state)) return
    this.clearTimer()
    this.snapshot = {
      ...this.snapshot,
      state: 'PAUSED',
      liveWpm: 0,
      countdownRemaining: 0,
      pauseReason: reason,
    }
    this.emit()
  }

  resume() {
    if (this.snapshot.state !== 'PAUSED') return
    this.beginTyping()
  }

  abort() {
    if (!['COUNTDOWN', 'TYPING', 'PAUSED'].includes(this.snapshot.state)) return
    this.clearTimer()
    this.snapshot = {
      ...this.snapshot,
      state: 'ABORTED',
      liveWpm: 0,
      countdownRemaining: 0,
      pauseReason: undefined,
    }
    this.emit()
  }

  reset() {
    this.clearTimer()
    this.prevChar = null
    this.charTimestamps = []
    this.snapshot = {
      ...this.snapshot,
      state: 'IDLE',
      cursor: 0,
      total: this.source.length,
      output: '',
      liveWpm: 0,
      etaSeconds: 0,
      countdownRemaining: 0,
      typoCorrections: 0,
      pauseReason: undefined,
      errorMessage: undefined,
    }
    this.emit()
  }

  async updateConfig(patch: Partial<TypingConfig>): Promise<ConfigUpdateResult> {
    const mergedHotkeys = patch.hotkeys
      ? { ...this.config.hotkeys, ...patch.hotkeys }
      : this.config.hotkeys

    const unique = new Set([
      mergedHotkeys.startResume.toLowerCase(),
      mergedHotkeys.pause.toLowerCase(),
      mergedHotkeys.abort.toLowerCase(),
    ])
    if (unique.size < 3) {
      return {
        config: this.config,
        hotkeyError: 'Global hotkeys must be unique for Start/Resume, Pause, and Abort.',
      }
    }

    this.config = { ...this.config, ...patch, hotkeys: mergedHotkeys }
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config))
    } catch {
      // Ignore quota issues in private browsing
    }
    return { config: this.config, hotkeyError: null }
  }

  async listSnippets() {
    try {
      const stored = localStorage.getItem(SNIPPETS_KEY)
      if (stored) return (JSON.parse(stored) as Snippet[]).slice(0, MAX_SNIPPETS)
      localStorage.setItem(SNIPPETS_KEY, JSON.stringify(seedSnippets))
    } catch {
      // Ignore storage access failures
    }
    return seedSnippets
  }

  async saveSnippet(input: Omit<Snippet, 'id' | 'createdAt'>) {
    if (input.text.length > MAX_SNIPPET_TEXT_CHARS) {
      throw new Error(`Snippet text exceeds maximum limit of ${MAX_SNIPPET_TEXT_CHARS.toLocaleString()} characters.`)
    }
    const snippets = await this.listSnippets()
    if (snippets.length >= MAX_SNIPPETS) {
      throw new Error(`Snippet limit reached (${MAX_SNIPPETS} max). Delete an existing snippet first.`)
    }

    const cleanTags = Array.from(
      new Set(
        input.tags
          .map((t) => t.trim().slice(0, MAX_TAG_CHARS))
          .filter(Boolean),
      ),
    ).slice(0, MAX_SNIPPET_TAGS)

    const snippet: Snippet = {
      title: (input.title.trim() || 'Untitled Snippet').slice(0, MAX_SNIPPET_TITLE_CHARS),
      text: input.text,
      tags: cleanTags,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      createdAt: new Date().toISOString(),
    }
    try {
      localStorage.setItem(SNIPPETS_KEY, JSON.stringify([snippet, ...snippets]))
    } catch {
      // Ignore storage failures
    }
    return snippet
  }

  async deleteSnippet(id: string) {
    const snippets = (await this.listSnippets()).filter((item) => item.id !== id)
    try {
      localStorage.setItem(SNIPPETS_KEY, JSON.stringify(snippets))
    } catch {
      // Ignore storage failures
    }
  }

  async clearAllData(): Promise<ClearDataResult> {
    this.reset()
    this.config = { ...defaultConfig, hotkeys: { ...defaultConfig.hotkeys } }
    try {
      localStorage.removeItem(CONFIG_KEY)
      localStorage.removeItem(SNIPPETS_KEY)
    } catch {
      // Ignore storage failures
    }
    return {
      config: { ...this.config, hotkeys: { ...this.config.hotkeys } },
      snippets: [],
      snapshot: { ...this.snapshot },
      hotkeyError: null,
    }
  }

  async openExternalUrl(url: string): Promise<void> {
    openExternalUrlSafe(url)
  }

  async setAlwaysOnTop(_value: boolean) {}
  async setCompactHud(_value: boolean) {}

  onSnapshot(listener: (snapshot: EngineSnapshot) => void) {
    this.listeners.add(listener)
    listener({ ...this.snapshot })
    return () => {
      this.listeners.delete(listener)
    }
  }

  dispose() {
    this.clearTimer()
    this.listeners.clear()
  }

  private emit() {
    this.listeners.forEach((listener) => listener({ ...this.snapshot }))
  }

  private clearTimer() {
    if (this.timer) {
      window.clearTimeout(this.timer)
      this.timer = undefined
    }
  }
}
