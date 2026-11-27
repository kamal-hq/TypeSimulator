import type { EngineSnapshot, RuntimeInfo, SanitizeResult, Snippet, TypingConfig } from '../types/engine'
import type { ClearDataResult } from '../vite-env'

export const MAX_PAYLOAD_CHARS = 100_000
export const MAX_SNIPPETS = 200
export const MAX_SNIPPET_TITLE_CHARS = 120
export const MAX_SNIPPET_TEXT_CHARS = 50_000
export const MAX_SNIPPET_TAGS = 10
export const MAX_TAG_CHARS = 32

export interface ConfigUpdateResult {
  config: TypingConfig
  hotkeyError?: string | null
}

export interface EngineAdapter {
  getRuntimeInfo(): RuntimeInfo
  loadRuntimeInfo(): Promise<RuntimeInfo>
  loadConfig(): Promise<TypingConfig>
  sanitize(text: string, config?: TypingConfig): SanitizeResult
  setStagedText(text: string): void
  start(text: string): void
  pause(reason?: string): void
  resume(): void
  abort(): void
  reset(): void
  updateConfig(config: Partial<TypingConfig>): Promise<ConfigUpdateResult>
  listSnippets(): Promise<Snippet[]>
  saveSnippet(snippet: Omit<Snippet, 'id' | 'createdAt'>): Promise<Snippet>
  deleteSnippet(id: string): Promise<void>
  clearAllData(): Promise<ClearDataResult>
  openExternalUrl(url: string): Promise<void>
  setAlwaysOnTop(value: boolean): Promise<void>
  setCompactHud(value: boolean): Promise<void>
  onSnapshot(listener: (snapshot: EngineSnapshot) => void): () => void
  dispose?(): void
}

export function hasNativePyWebView(): boolean {
  return typeof window !== 'undefined' && Boolean(window.pywebview?.api)
}

export function isDesktopBuildOrHost(): boolean {
  if (typeof window === 'undefined') return false
  return hasNativePyWebView() || import.meta.env.VITE_RUNTIME_MODE === 'desktop'
}
