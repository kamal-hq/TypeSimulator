import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DesktopBridgeAdapter } from '../adapters/desktopBridgeAdapter'
import { hasNativePyWebView, type EngineAdapter } from '../adapters/engineAdapter'
import { defaultConfig } from '../adapters/sanitizeLocal'
import { WebSandboxAdapter } from '../adapters/webSandboxAdapter'
import type { EngineSnapshot, RuntimeInfo, Snippet, TypingConfig } from '../types/engine'

const initialSnapshot: EngineSnapshot = {
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

function matchesHotkey(event: KeyboardEvent, binding: string): boolean {
  const parts = binding.split('+').map((p) => p.trim().toLowerCase())
  const needCtrl = parts.includes('ctrl') || parts.includes('control')
  const needShift = parts.includes('shift')
  const needAlt = parts.includes('alt')
  const mainKey = parts.find((p) => !['ctrl', 'control', 'shift', 'alt', 'meta', 'cmd', 'win'].includes(p))
  if (!mainKey) return false

  if (event.ctrlKey !== needCtrl || event.shiftKey !== needShift || event.altKey !== needAlt) return false
  const pressed = event.key.toLowerCase()
  if (mainKey === 'esc' || mainKey === 'escape') return pressed === 'escape'
  return pressed === mainKey
}

export function useTypingEngine(mode: 'web' | 'desktop', nativeReady: boolean) {
  const adapter: EngineAdapter = useMemo(() => {
    if (mode === 'desktop' && (nativeReady || hasNativePyWebView())) {
      return new DesktopBridgeAdapter()
    }
    return new WebSandboxAdapter(mode)
  }, [mode, nativeReady])

  const [runtime, setRuntime] = useState<RuntimeInfo>(() => adapter.getRuntimeInfo())
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(initialSnapshot)
  const [config, setConfig] = useState<TypingConfig>(defaultConfig)
  const [hotkeyError, setHotkeyError] = useState<string | null>(null)
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false)
  const [payload, setPayloadState] = useState(
    'Hello from TypeSimulator — “precision should still feel human.”\n\nThis text is sanitized, staged, and ready to travel where paste cannot.',
  )
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const prevStateRef = useRef(snapshot.state)

  useEffect(() => {
    const unsubscribe = adapter.onSnapshot(setSnapshot)
    void adapter.loadRuntimeInfo().then((info) => {
      setRuntime(info)
      if (info.hotkeyError) setHotkeyError(info.hotkeyError)
    })
    void adapter.loadConfig().then(setConfig)
    void adapter.listSnippets().then(setSnippets)
    return () => {
      unsubscribe()
      adapter.dispose?.()
    }
  }, [adapter])

  // Sync staged text to Python Desktop backend so global F9 hotkey always has fresh text
  useEffect(() => {
    const handle = window.setTimeout(() => {
      adapter.setStagedText(payload)
    }, 120)
    return () => window.clearTimeout(handle)
  }, [adapter, payload])

  // Honor clearOnComplete ONLY when transitioning cleanly to COMPLETED
  useEffect(() => {
    if (prevStateRef.current !== 'COMPLETED' && snapshot.state === 'COMPLETED' && config.clearOnComplete) {
      setPayloadState('')
    }
    prevStateRef.current = snapshot.state
  }, [snapshot.state, config.clearOnComplete])

  const setPayload = useCallback((text: string) => setPayloadState(text), [])

  const updateConfig = useCallback(
    (patch: Partial<TypingConfig>) => {
      setConfig((prev) => ({
        ...prev,
        ...patch,
        hotkeys: patch.hotkeys ? { ...prev.hotkeys, ...patch.hotkeys } : prev.hotkeys,
      }))
      void adapter.updateConfig(patch).then((result) => {
        setConfig(result.config)
        setHotkeyError(result.hotkeyError ?? null)
      })
    },
    [adapter],
  )

  const saveSnippet = useCallback(
    async (title: string, tags: string[]) => {
      const saved = await adapter.saveSnippet({ title, tags, text: payload })
      setSnippets((prev) => [saved, ...prev])
    },
    [adapter, payload],
  )

  const deleteSnippet = useCallback(
    async (id: string) => {
      await adapter.deleteSnippet(id)
      setSnippets((prev) => prev.filter((item) => item.id !== id))
    },
    [adapter],
  )

  // In-window keyboard shortcuts (Web mode; Desktop mode uses OS-level pynput global hotkeys)
  useEffect(() => {
    if (runtime.mode === 'desktop' && hasNativePyWebView()) return
    const onKey = (event: KeyboardEvent) => {
      if (isRecordingHotkey) return
      if (matchesHotkey(event, config.hotkeys.startResume)) {
        event.preventDefault()
        if (snapshot.state === 'PAUSED') adapter.resume()
        else adapter.start(payload)
      } else if (matchesHotkey(event, config.hotkeys.pause)) {
        event.preventDefault()
        adapter.pause()
      } else if (matchesHotkey(event, config.hotkeys.abort)) {
        event.preventDefault()
        adapter.abort()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adapter, config.hotkeys, isRecordingHotkey, payload, runtime.mode, snapshot.state])

  const sanitizeResult = useMemo(() => adapter.sanitize(payload, config), [adapter, payload, config])

  return {
    adapter,
    runtime,
    snapshot,
    config,
    hotkeyError,
    isRecordingHotkey,
    setIsRecordingHotkey,
    payload,
    setPayload,
    updateConfig,
    sanitizeResult,
    snippets,
    saveSnippet,
    deleteSnippet,
    start: () => adapter.start(payload),
    pause: (reason?: string) => adapter.pause(reason),
    resume: () => adapter.resume(),
    abort: () => adapter.abort(),
    reset: () => adapter.reset(),
  }
}
