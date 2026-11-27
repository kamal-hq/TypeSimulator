import { AlertTriangle, Check, Gauge, Library, Plus, Search, Shield, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { HotkeyBindings, RuntimeInfo, Snippet, TypingConfig } from '../types/engine'
import type { LegalDoc } from './LegalPage'

const Toggle = ({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`h-6 w-11 shrink-0 rounded-full p-1 transition ${value ? 'bg-[#C9EF35]' : 'bg-white/10'}`}
  >
    <span className={`block h-4 w-4 rounded-full bg-black transition ${value ? 'translate-x-5' : ''}`} />
  </button>
)

const Slider = ({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  unit: string
  onChange: (value: number) => void
}) => (
  <label className="block">
    <span className="mb-2 flex justify-between text-xs text-zinc-400">
      <span>{label}</span>
      <span className="font-mono tabular-nums text-zinc-100">
        {value}
        {unit}
      </span>
    </span>
    <input
      className="range"
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </label>
)

const PRESETS: Record<'Natural' | 'Fast' | 'Thoughtful' | 'Steady', { targetWpm: number; variability: number }> = {
  Natural: { targetWpm: 68, variability: 34 },
  Fast: { targetWpm: 105, variability: 24 },
  Thoughtful: { targetWpm: 48, variability: 58 },
  Steady: { targetWpm: 75, variability: 10 },
}

function formatKeyEvent(event: KeyboardEvent): string | null {
  const key = event.key
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return null

  const parts: string[] = []
  if (event.ctrlKey) parts.push('Ctrl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')

  let label = key
  if (key === 'Escape') label = 'Esc'
  else if (key === ' ') label = 'Space'
  else if (/^f\d+$/i.test(key)) label = key.toUpperCase()
  else if (key.length === 1) label = key.toUpperCase()

  parts.push(label)
  return parts.join('+')
}

export function InspectorSidebar({
  config,
  runtime,
  targetWindowTitle,
  hotkeyError,
  onRecordingChange,
  onConfig,
  snippets,
  payload,
  onLoad,
  onSave,
  onDelete,
  onClearAllData,
  onLegal,
}: {
  config: TypingConfig
  runtime: RuntimeInfo
  targetWindowTitle?: string
  hotkeyError?: string | null
  onRecordingChange: (recording: boolean) => void
  onConfig: (value: Partial<TypingConfig>) => void
  snippets: Snippet[]
  payload: string
  onLoad: (value: string) => void
  onSave: (title: string, tags: string[]) => void
  onDelete: (id: string) => void
  onClearAllData: () => Promise<void>
  onLegal: (doc: LegalDoc) => void
}) {
  const [tab, setTab] = useState<'cadence' | 'safety' | 'snippets'>('cadence')
  const [search, setSearch] = useState('')
  const [recordingField, setRecordingField] = useState<keyof HotkeyBindings | null>(null)
  const [showAddSnippet, setShowAddSnippet] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newTags, setNewTags] = useState('Custom')
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearedNotice, setClearedNotice] = useState(false)

  const filtered = useMemo(
    () =>
      snippets.filter((item) =>
        `${item.title} ${item.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [snippets, search],
  )

  useEffect(() => {
    onRecordingChange(recordingField !== null)
    if (!recordingField) return

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const combo = formatKeyEvent(event)
      if (!combo) return
      onConfig({ hotkeys: { ...config.hotkeys, [recordingField]: combo } })
      setRecordingField(null)
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [recordingField, config.hotkeys, onConfig, onRecordingChange])

  const activeTargetLabel =
    targetWindowTitle || (runtime.mode === 'desktop' ? 'Waiting for active target window' : 'Simulated Target Form')

  const handleInlineSnippetSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !payload.trim()) return
    const tags = newTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    onSave(newTitle.trim(), tags.length ? tags : ['Custom'])
    setNewTitle('')
    setNewTags('Custom')
    setShowAddSnippet(false)
  }

  const handleConfirmClearAll = async () => {
    await onClearAllData()
    setConfirmClear(false)
    setClearedNotice(true)
    window.setTimeout(() => setClearedNotice(false), 3500)
  }

  return (
    <aside className="h-fit overflow-hidden rounded-2xl border border-white/8 bg-[#111] xl:sticky xl:top-20">
      <div className="grid grid-cols-3 border-b border-white/8 p-1.5">
        {([
          ['cadence', Gauge],
          ['safety', Shield],
          ['snippets', Library],
        ] as const).map(([key, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-semibold uppercase tracking-wider transition ${
              tab === key ? 'bg-[#242424] text-white' : 'text-zinc-600 hover:text-zinc-300'
            }`}
          >
            <Icon size={13} />
            {key}
          </button>
        ))}
      </div>

      <div className="max-h-[calc(100vh-105px)] space-y-6 overflow-y-auto p-4">
        {tab === 'cadence' && (
          <>
            <div>
              <p className="section-label">CADENCE PROFILE</p>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {(Object.entries(PRESETS) as [keyof typeof PRESETS, { targetWpm: number; variability: number }][]).map(
                  ([name, preset]) => (
                    <button
                      key={name}
                      onClick={() =>
                        onConfig({ preset: name, targetWpm: preset.targetWpm, variability: preset.variability })
                      }
                      className={`rounded-lg border px-2 py-2.5 text-left transition ${
                        config.preset === name
                          ? 'border-[#C9EF35]/40 bg-[#C9EF35]/8'
                          : 'border-white/8 bg-white/[.02] hover:border-white/15'
                      }`}
                    >
                      <span className="block text-[10px] font-semibold">{name}</span>
                      <span className="mt-1 block font-mono text-[9px] text-zinc-600">{preset.targetWpm} WPM</span>
                    </button>
                  ),
                )}
                <button
                  onClick={() => onConfig({ preset: 'Custom' })}
                  className={`rounded-lg border px-2 py-2.5 text-left ${
                    config.preset === 'Custom'
                      ? 'border-[#FF2E93]/40 bg-[#FF2E93]/8 text-[#FF2E93]'
                      : 'border-white/8 text-zinc-500'
                  }`}
                >
                  <span className="text-[10px] font-semibold">Custom</span>
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <Slider
                label="Target speed"
                value={config.targetWpm}
                min={25}
                max={150}
                unit=" WPM"
                onChange={(targetWpm) => onConfig({ targetWpm, preset: 'Custom' })}
              />
              <Slider
                label="Cadence variability"
                value={config.variability}
                min={0}
                max={100}
                unit="%"
                onChange={(variability) => onConfig({ variability, preset: 'Custom' })}
              />
              <Slider
                label="Pre-start countdown"
                value={config.countdown}
                min={0}
                max={5}
                unit="s"
                onChange={(countdown) => onConfig({ countdown })}
              />
            </div>

            <div className="setting-card">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold">Typo simulator</p>
                  <p className="mt-1 max-w-[220px] text-[10px] leading-4 text-zinc-500">
                    Adjacent QWERTY errors with natural backspace correction.
                  </p>
                </div>
                <Toggle value={config.typosEnabled} onChange={(typosEnabled) => onConfig({ typosEnabled })} />
              </div>
              {config.typosEnabled && (
                <div className="mt-4">
                  <Slider
                    label="Error rate"
                    value={config.errorRate}
                    min={0}
                    max={8}
                    unit="%"
                    onChange={(errorRate) => onConfig({ errorRate })}
                  />
                </div>
              )}
            </div>

            <div>
              <p className="section-label">KEY &amp; SANITIZATION RULES</p>
              <div className="mt-3 space-y-3">
                <div>
                  <span className="mb-1.5 block text-[10px] text-zinc-500">Newline keystroke</span>
                  <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/8 bg-[#0c0c0c] p-1">
                    {([
                      ['enter', 'Enter'],
                      ['shift-enter', 'Shift + Enter'],
                    ] as const).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => onConfig({ newlines: val })}
                        className={`rounded-lg py-1.5 text-[10px] font-semibold transition ${
                          config.newlines === val ? 'bg-[#C9EF35] text-black' : 'text-zinc-500 hover:text-zinc-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <select
                  value={config.tabs}
                  onChange={(e) => onConfig({ tabs: e.target.value as TypingConfig['tabs'] })}
                  className="select"
                >
                  <option value="4-spaces">Tabs → 4 spaces</option>
                  <option value="2-spaces">Tabs → 2 spaces</option>
                  <option value="strip">Strip tabs</option>
                  <option value="send-tab">Send Tab key</option>
                </select>

                {(
                  [
                    ['Strip markdown', 'stripMarkdown'],
                    ['Clear editor on complete', 'clearOnComplete'],
                  ] as const
                ).map(([label, key]) => (
                  <label key={key} className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{label}</span>
                    <Toggle value={config[key]} onChange={(value) => onConfig({ [key]: value })} />
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'safety' && (
          <>
            <div className="setting-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold">Active-window Focus Guard</p>
                  <p className="mt-1 text-[10px] leading-4 text-zinc-500">
                    Pauses before a character can reach the wrong window.
                  </p>
                </div>
                <Toggle value={config.focusGuard} onChange={(focusGuard) => onConfig({ focusGuard })} />
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2 text-[10px] text-zinc-400">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9EF35]" />
                <span className="truncate">{activeTargetLabel}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="section-label">GLOBAL HOTKEYS</p>
                <span className="font-mono text-[9px] text-zinc-600">CLICK TO REBIND</span>
              </div>
              <div className="mt-3 divide-y divide-white/8 rounded-xl border border-white/8">
                {(
                  [
                    ['Start / Resume', 'startResume'],
                    ['Pause', 'pause'],
                    ['Emergency Abort', 'abort'],
                  ] as const
                ).map(([label, field]) => {
                  const isRecording = recordingField === field
                  return (
                    <button
                      key={field}
                      type="button"
                      onClick={() => setRecordingField(isRecording ? null : field)}
                      className={`flex w-full items-center justify-between px-3 py-3 text-xs transition hover:bg-white/[.03] ${
                        isRecording ? 'bg-[#C9EF35]/8 text-[#C9EF35]' : 'text-zinc-400'
                      }`}
                    >
                      <span>{label}</span>
                      <kbd className={isRecording ? '!border-[#C9EF35]/50 !text-[#C9EF35]' : ''}>
                        {isRecording ? 'Press keys…' : config.hotkeys[field]}
                      </kbd>
                    </button>
                  )
                })}
              </div>
              {hotkeyError && (
                <p className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] text-red-300">
                  {hotkeyError}
                </p>
              )}
            </div>

            <div className="flex gap-2 rounded-xl border border-amber-400/15 bg-amber-400/5 p-3 text-[10px] leading-4 text-amber-200/75">
              <AlertTriangle size={15} className="shrink-0" />
              <span>
                Elevated Administrator windows require running TypeSimulator as Administrator.
                {runtime.mode === 'desktop' && (
                  <strong className="mt-1 block font-mono text-[9px] text-amber-200">
                    Current privilege: {runtime.isElevated ? 'Administrator' : 'Standard User'}
                  </strong>
                )}
              </span>
            </div>

            <div className="setting-card space-y-3">
              <div>
                <p className="text-xs font-semibold text-zinc-200">Local data &amp; privacy</p>
                <p className="mt-1 text-[10px] leading-4 text-zinc-500">
                  {runtime.mode === 'desktop'
                    ? 'Removes config.json and snippets.json from %APPDATA%\\TypeSimulator\\ and resets defaults.'
                    : 'Clears saved snippets and settings from browser localStorage and resets defaults.'}
                </p>
              </div>

              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/10 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                >
                  <Trash2 size={13} />Clear all local data
                </button>
              ) : (
                <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-[10px] leading-4 text-red-200">
                    Permanently delete all saved snippets, custom hotkeys, and preferences on this device?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="flex-1 rounded-lg border border-white/10 py-1.5 text-[10px] text-zinc-300 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleConfirmClearAll()}
                      className="flex-1 rounded-lg bg-red-500 py-1.5 text-[10px] font-bold text-white hover:bg-red-400"
                    >
                      Confirm delete
                    </button>
                  </div>
                </div>
              )}

              {clearedNotice && (
                <p className="flex items-center gap-1.5 text-[10px] text-[#C9EF35]">
                  <Check size={12} />All local data cleared and defaults restored.
                </p>
              )}

              <div className="flex items-center justify-between border-t border-white/8 pt-3 text-[10px] text-zinc-500">
                <button type="button" onClick={() => onLegal('privacy')} className="hover:text-white">
                  Privacy Policy
                </button>
                <button type="button" onClick={() => onLegal('terms')} className="hover:text-white">
                  Terms of Service
                </button>
              </div>
            </div>
          </>
        )}

        {tab === 'snippets' && (
          <>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-zinc-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search snippets or tags…"
                className="input pl-9"
              />
            </div>

            {!showAddSnippet ? (
              <button
                onClick={() => setShowAddSnippet(true)}
                disabled={!payload.trim()}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#C9EF35] py-2.5 text-xs font-bold text-black hover:bg-[#d8fa55] disabled:opacity-30"
              >
                <Plus size={14} />Save current text
              </button>
            ) : (
              <form onSubmit={handleInlineSnippetSave} className="setting-card space-y-2.5">
                <input
                  autoFocus
                  required
                  maxLength={120}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Snippet title…"
                  className="input text-zinc-100"
                />
                <input
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="Tags (e.g. VDI, QA)"
                  className="input text-zinc-100"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSnippet(false)}
                    className="flex-1 rounded-lg border border-white/10 py-1.5 text-[10px] text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-[#C9EF35] py-1.5 text-[10px] font-bold text-black"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {filtered.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/8 bg-white/[.02] p-3">
                  <div className="flex justify-between gap-3">
                    <p className="text-xs font-semibold text-zinc-200">{item.title}</p>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-zinc-700 hover:text-[#FF2E93]"
                      title="Delete snippet"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className="mt-2 line-clamp-2 font-mono text-[10px] leading-4 text-zinc-600">{item.text}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-1">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded bg-white/5 px-1.5 py-1 text-[8px] uppercase text-zinc-500">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => onLoad(item.text)}
                      className="text-[10px] font-semibold text-[#C9EF35] hover:underline"
                    >
                      LOAD →
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="py-6 text-center text-xs text-zinc-600">No snippets match your search.</p>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
