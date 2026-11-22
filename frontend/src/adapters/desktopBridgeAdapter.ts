import type { ConfigUpdateResult, EngineAdapter } from './engineAdapter'
import { defaultConfig, sanitizeLocally } from './sanitizeLocal'
import type { EngineSnapshot, RuntimeInfo, SanitizeResult, Snippet, TypingConfig } from '../types/engine'
import type { PyWebViewApi } from '../vite-env'

export class DesktopBridgeAdapter implements EngineAdapter {
  private listeners = new Set<(snapshot: EngineSnapshot) => void>()
  private runtime: RuntimeInfo = {
    mode: 'desktop',
    label: 'Desktop OS Engine',
    version: '2.0.0',
    platform: 'win32',
    isElevated: false,
  }
  private config: TypingConfig = { ...defaultConfig, hotkeys: { ...defaultConfig.hotkeys } }
  private snapshot: EngineSnapshot = {
    state: 'IDLE',
    cursor: 0,
    total: 0,
    output: '',
    liveWpm: 0,
    etaSeconds: 0,
    countdownRemaining: 0,
    typoCorrections: 0,
    wpmHistory: [],
  }

  constructor() {
    window.__typeSimulatorOnEvent = (incoming: EngineSnapshot) => {
      this.snapshot = { ...incoming }
      this.listeners.forEach((listener) => listener(this.snapshot))
    }
  }

  private get api(): PyWebViewApi | undefined {
    return window.pywebview?.api
  }

  getRuntimeInfo(): RuntimeInfo {
    return this.runtime
  }

  async loadRuntimeInfo(): Promise<RuntimeInfo> {
    if (this.api) {
      const info = await this.api.get_runtime_info()
      this.runtime = info
    }
    return this.runtime
  }

  async loadConfig(): Promise<TypingConfig> {
    if (this.api) {
      const loaded = await this.api.get_config()
      this.config = {
        ...defaultConfig,
        ...loaded,
        hotkeys: { ...defaultConfig.hotkeys, ...(loaded.hotkeys || {}) },
      }
      const snap = await this.api.get_snapshot()
      this.snapshot = snap
      this.listeners.forEach((listener) => listener(snap))
    }
    return this.config
  }

  sanitize(text: string, config = this.config): SanitizeResult {
    // Synchronous mirror of backend/sanitizer.py for zero-latency UI badge updates
    return sanitizeLocally(text, config)
  }

  setStagedText(text: string): void {
    void this.api?.set_staged_text(text)
  }

  start(text: string): void {
    void this.api?.start(text).then((snap) => this.handleSnapshot(snap))
  }

  pause(reason?: string): void {
    void this.api?.pause(reason).then((snap) => this.handleSnapshot(snap))
  }

  resume(): void {
    void this.api?.resume().then((snap) => this.handleSnapshot(snap))
  }

  abort(): void {
    void this.api?.abort().then((snap) => this.handleSnapshot(snap))
  }

  reset(): void {
    void this.api?.reset().then((snap) => this.handleSnapshot(snap))
  }

  async updateConfig(patch: Partial<TypingConfig>): Promise<ConfigUpdateResult> {
    if (!this.api) {
      this.config = { ...this.config, ...patch }
      return { config: this.config, hotkeyError: null }
    }
    const res = await this.api.update_config(patch)
    this.config = res.config
    return res
  }

  async listSnippets(): Promise<Snippet[]> {
    if (!this.api) return []
    return this.api.list_snippets()
  }

  async saveSnippet(input: Omit<Snippet, 'id' | 'createdAt'>): Promise<Snippet> {
    if (!this.api) throw new Error('PyWebView API unavailable')
    return this.api.save_snippet(input.title, input.text, input.tags)
  }

  async deleteSnippet(id: string): Promise<void> {
    await this.api?.delete_snippet(id)
  }

  async setAlwaysOnTop(value: boolean): Promise<void> {
    await this.api?.set_always_on_top(value)
  }

  async setCompactHud(value: boolean): Promise<void> {
    await this.api?.set_compact_hud(value)
  }

  onSnapshot(listener: (snapshot: EngineSnapshot) => void): () => void {
    this.listeners.add(listener)
    listener({ ...this.snapshot })
    return () => {
      this.listeners.delete(listener)
    }
  }

  dispose(): void {
    this.listeners.clear()
    if (window.__typeSimulatorOnEvent) {
      delete window.__typeSimulatorOnEvent
    }
  }

  private handleSnapshot(snap?: EngineSnapshot) {
    if (!snap) return
    this.snapshot = snap
    this.listeners.forEach((listener) => listener(snap))
  }
}
