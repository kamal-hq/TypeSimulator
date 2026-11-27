/// <reference types="vite/client" />

import type { EngineSnapshot, RuntimeInfo, SanitizeResult, Snippet, TypingConfig } from './types/engine'

interface ImportMetaEnv {
  readonly VITE_RUNTIME_MODE?: 'web' | 'desktop'
  readonly VITE_DOWNLOAD_URL?: string
  readonly VITE_GITHUB_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

export interface ClearDataResult {
  config: TypingConfig
  snippets: Snippet[]
  snapshot: EngineSnapshot
  hotkeyError?: string | null
}

export interface PyWebViewApi {
  get_runtime_info(): Promise<RuntimeInfo>
  get_config(): Promise<TypingConfig>
  update_config(patch: Partial<TypingConfig>): Promise<{ config: TypingConfig; hotkeyError?: string | null }>
  set_staged_text(text: string): Promise<void>
  sanitize(text: string, config?: TypingConfig): Promise<SanitizeResult>
  start(text: string): Promise<EngineSnapshot>
  pause(reason?: string): Promise<EngineSnapshot>
  resume(): Promise<EngineSnapshot>
  abort(): Promise<EngineSnapshot>
  reset(): Promise<EngineSnapshot>
  get_snapshot(): Promise<EngineSnapshot>
  list_snippets(): Promise<Snippet[]>
  save_snippet(title: string, text: string, tags: string[]): Promise<Snippet>
  delete_snippet(snippetId: string): Promise<void>
  clear_all_data(): Promise<ClearDataResult>
  open_external_url(url: string): Promise<boolean>
  set_always_on_top(enabled: boolean): Promise<boolean>
  set_compact_hud(enabled: boolean): Promise<boolean>
}

declare global {
  interface Window {
    pywebview?: {
      api?: PyWebViewApi
    }
    __typeSimulatorOnEvent?: (snapshot: EngineSnapshot) => void
  }
}
