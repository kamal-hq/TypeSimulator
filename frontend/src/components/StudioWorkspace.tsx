import { AlertTriangle, Play, X } from 'lucide-react'
import { useState } from 'react'
import { useTypingEngine } from '../hooks/useTypingEngine'
import { CompactHud } from './CompactHud'
import { EditorStage } from './EditorStage'
import { InspectorSidebar } from './InspectorSidebar'
import type { LegalDoc } from './LegalPage'
import { PasteBlockedSandbox } from './PasteBlockedSandbox'
import { TelemetryStrip } from './TelemetryStrip'
import { TopBar } from './TopBar'
import { TransportDock } from './TransportDock'

export function StudioWorkspace({
  mode,
  nativeReady,
  onOverview,
  onLegal,
}: {
  mode: 'web' | 'desktop'
  nativeReady: boolean
  onOverview: () => void
  onLegal: (doc: LegalDoc) => void
}) {
  const engine = useTypingEngine(mode, nativeReady)
  const [compact, setCompact] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [snippetTitle, setSnippetTitle] = useState('')
  const [snippetTags, setSnippetTags] = useState('Custom')

  const handleCompactToggle = (enabled: boolean) => {
    setCompact(enabled)
    void engine.adapter.setCompactHud(enabled)
  }

  const handleSaveSnippetSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!snippetTitle.trim() || !engine.payload.trim()) return
    const tags = snippetTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    void engine.saveSnippet(snippetTitle.trim(), tags.length ? tags : ['Custom'])
    setSnippetTitle('')
    setSnippetTags('Custom')
    setSaveModalOpen(false)
  }

  if (compact) {
    return (
      <CompactHud
        mode={mode}
        snapshot={engine.snapshot}
        onExpand={() => handleCompactToggle(false)}
        onPlay={engine.snapshot.state === 'PAUSED' ? engine.resume : engine.start}
        onPause={() => engine.pause()}
        onAbort={engine.abort}
      />
    )
  }

  const activeError = engine.snapshot.errorMessage || engine.storageError

  const isDesktop = mode === 'desktop'

  return (
    <div
      className={
        isDesktop
          ? 'flex min-h-screen flex-col bg-[#090909] text-zinc-100 lg:h-screen lg:overflow-hidden'
          : 'min-h-screen bg-[#090909] text-zinc-100'
      }
    >
      <TopBar
        runtime={engine.runtime}
        snapshot={engine.snapshot}
        alwaysOnTop={pinned}
        onPin={() => {
          const next = !pinned
          setPinned(next)
          void engine.adapter.setAlwaysOnTop(next)
        }}
        onCompact={() => handleCompactToggle(true)}
        onOverview={onOverview}
      />

      <main
        className={
          isDesktop
            ? 'grid w-full flex-1 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_360px]'
            : 'mx-auto grid max-w-[1600px] gap-4 p-4 md:p-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(340px,380px)]'
        }
      >
        <div
          className={
            isDesktop
              ? 'min-w-0 space-y-4 p-5 lg:overflow-y-auto'
              : 'min-w-0 space-y-4'
          }
        >
          <div className="flex items-end justify-between px-1">
            <div>
              <p className="mb-1 text-[10px] font-semibold tracking-[.2em] text-[#C9EF35]">AUTOMATION STAGE / 01</p>
              <h1 className="text-2xl font-semibold tracking-tight text-white">Prepare the signal.</h1>
            </div>
            <p className="hidden max-w-[300px] text-right text-xs leading-5 text-zinc-600 md:block">
              Sanitize, calibrate and transmit at a cadence that feels unmistakably human.
            </p>
          </div>

          <EditorStage
            payload={engine.payload}
            onChange={engine.setPayload}
            result={engine.sanitizeResult}
            onSave={() => {
              if (engine.payload.trim()) setSaveModalOpen(true)
            }}
          />

          {activeError && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-200">
              <AlertTriangle size={15} className="shrink-0 text-red-400" />
              <span className="flex-1">{activeError}</span>
            </div>
          )}

          {engine.snapshot.state === 'PAUSED' && engine.snapshot.pauseReason && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[.06] px-4 py-3 text-xs text-amber-200">
              <AlertTriangle size={15} />
              <span className="flex-1">
                {engine.snapshot.pauseReason} — paused at char {engine.snapshot.cursor} for safety.
              </span>
              <button onClick={engine.resume} className="rounded-lg bg-amber-300 px-3 py-1.5 font-bold text-black">
                Resume
              </button>
            </div>
          )}

          <TelemetryStrip snapshot={engine.snapshot} text={engine.payload} targetWpm={engine.config.targetWpm} />

          <TransportDock
            snapshot={engine.snapshot}
            hotkeys={engine.config.hotkeys}
            hasPayload={engine.payload.trim().length > 0}
            onStart={engine.start}
            onPause={() => engine.pause()}
            onResume={engine.resume}
            onAbort={engine.abort}
            onReset={engine.reset}
          />

          {mode === 'web' && ['TYPING', 'COUNTDOWN'].includes(engine.snapshot.state) && (
            <button
              onClick={() => engine.pause('Focus switched to Slack')}
              className="flex items-center gap-2 rounded-lg border border-amber-400/15 px-3 py-2 text-[10px] text-amber-300 hover:bg-amber-400/5"
            >
              <Play size={12} />Simulate focus switch
            </button>
          )}

          {mode === 'web' && <PasteBlockedSandbox output={engine.snapshot.output} />}
        </div>

        <InspectorSidebar
          docked={isDesktop}
          config={engine.config}
          runtime={engine.runtime}
          targetWindowTitle={engine.snapshot.targetWindowTitle}
          hotkeyError={engine.hotkeyError}
          onRecordingChange={engine.setIsRecordingHotkey}
          onConfig={engine.updateConfig}
          snippets={engine.snippets}
          payload={engine.payload}
          onLoad={engine.setPayload}
          onSave={engine.saveSnippet}
          onDelete={engine.deleteSnippet}
          onClearAllData={engine.clearAllData}
          onLegal={onLegal}
        />
      </main>

      {saveModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveSnippetSubmit}
            className="w-full max-w-md rounded-2xl border border-white/12 bg-[#141414] p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="section-label text-[#C9EF35]">SNIPPET LIBRARY</p>
                <h2 className="mt-1 text-base font-semibold text-white">Save current payload</h2>
              </div>
              <button type="button" onClick={() => setSaveModalOpen(false)} className="icon-btn !h-8 !w-8">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[11px] text-zinc-400">Title</label>
                <input
                  autoFocus
                  required
                  maxLength={120}
                  value={snippetTitle}
                  onChange={(e) => setSnippetTitle(e.target.value)}
                  placeholder="e.g. Production SSH Diagnostics"
                  className="input text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] text-zinc-400">Tags (comma separated)</label>
                <input
                  value={snippetTags}
                  onChange={(e) => setSnippetTags(e.target.value)}
                  placeholder="VDI, SSH, Ops"
                  className="input text-zinc-100"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="rounded-lg border border-white/10 px-3.5 py-2 text-xs text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#C9EF35] px-4 py-2 text-xs font-bold text-black hover:bg-[#d8fa55]"
              >
                Save snippet
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
