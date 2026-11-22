import { Octagon, Pause, Play, RotateCcw } from 'lucide-react'
import type { EngineSnapshot, HotkeyBindings } from '../types/engine'

const Key = ({ children }: { children: React.ReactNode }) => (
  <span className="ml-2 rounded border border-black/15 bg-black/10 px-1.5 py-0.5 font-mono text-[9px]">
    {children}
  </span>
)

const DarkKey = ({ children }: { children: React.ReactNode }) => (
  <span className="ml-1.5 rounded border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400">
    {children}
  </span>
)

export function TransportDock({
  snapshot,
  hotkeys,
  hasPayload,
  onStart,
  onPause,
  onResume,
  onAbort,
  onReset,
}: {
  snapshot: EngineSnapshot
  hotkeys: HotkeyBindings
  hasPayload: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onAbort: () => void
  onReset: () => void
}) {
  const active = ['TYPING', 'COUNTDOWN'].includes(snapshot.state)
  const canAbort = ['TYPING', 'COUNTDOWN', 'PAUSED'].includes(snapshot.state)
  const pct = snapshot.total ? Math.round((snapshot.cursor / snapshot.total) * 100) : 0

  return (
    <div className="rounded-2xl border border-white/8 bg-[#111] p-3">
      <div className="mb-3 flex items-center gap-3 px-1">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
          <div
            className={`h-full rounded-full transition-all duration-200 ${
              snapshot.state === 'PAUSED'
                ? 'bg-amber-400'
                : snapshot.state === 'ABORTED'
                  ? 'bg-red-500'
                  : 'bg-[#C9EF35]'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-12 text-right font-mono text-xs tabular-nums text-zinc-400">{pct}%</span>
        <span className="font-mono text-[10px] tabular-nums text-zinc-600">
          {snapshot.cursor}/{snapshot.total}
        </span>
        {snapshot.typoCorrections > 0 && (
          <span title="Simulated typo corrections" className="font-mono text-[10px] text-[#FF2E93]">
            ↺{snapshot.typoCorrections}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          disabled={active || (!hasPayload && snapshot.state !== 'PAUSED')}
          onClick={snapshot.state === 'PAUSED' ? onResume : onStart}
          className="flex flex-1 items-center justify-center rounded-xl bg-[#C9EF35] px-4 py-3 text-xs font-bold text-black transition hover:bg-[#d6f85a] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play size={15} fill="currentColor" />
          <span className="ml-2">
            {snapshot.state === 'PAUSED'
              ? `Resume from char ${snapshot.cursor}`
              : snapshot.state === 'COUNTDOWN'
                ? `Starting in ${snapshot.countdownRemaining}s…`
                : 'Start typing'}
          </span>
          <Key>{hotkeys.startResume}</Key>
        </button>

        <button disabled={!active} onClick={onPause} className="transport-secondary text-amber-300 disabled:opacity-30">
          <Pause size={15} />Pause<DarkKey>{hotkeys.pause}</DarkKey>
        </button>

        <button disabled={!canAbort} onClick={onAbort} className="transport-secondary text-red-400 disabled:opacity-30">
          <Octagon size={15} />Abort<DarkKey>{hotkeys.abort}</DarkKey>
        </button>

        <button onClick={onReset} className="icon-btn !h-auto !w-11" title="Reset cursor & progress">
          <RotateCcw size={15} />
        </button>
      </div>
    </div>
  )
}
