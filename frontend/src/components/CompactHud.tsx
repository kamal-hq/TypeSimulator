import { Expand, Octagon, Pause, Play } from 'lucide-react'
import type { EngineSnapshot } from '../types/engine'
import { StatusPill } from './TopBar'

export function CompactHud({
  mode,
  snapshot,
  onExpand,
  onPlay,
  onPause,
  onAbort,
}: {
  mode: 'web' | 'desktop'
  snapshot: EngineSnapshot
  onExpand: () => void
  onPlay: () => void
  onPause: () => void
  onAbort: () => void
}) {
  const active = ['TYPING', 'COUNTDOWN'].includes(snapshot.state)
  const percent = snapshot.total ? Math.round((snapshot.cursor / snapshot.total) * 100) : 0
  const targetLabel =
    snapshot.targetWindowTitle || (mode === 'desktop' ? 'ACTIVE TARGET WINDOW' : 'SIMULATED TARGET FORM')

  const pill = (
    <div
      className={`flex w-full items-center gap-3 border border-white/10 bg-[#151515]/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl ${
        mode === 'desktop' ? 'h-full rounded-none border-0' : 'max-w-[620px] rounded-2xl'
      }`}
    >
      <StatusPill snapshot={snapshot} />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex justify-between gap-2 font-mono text-[9px] text-zinc-500">
          <span className="truncate uppercase">{targetLabel}</span>
          <span className="tabular-nums">{percent}%</span>
        </div>
        <div className="h-1 overflow-hidden rounded bg-white/5">
          <div
            className={`h-full transition-all duration-150 ${snapshot.state === 'PAUSED' ? 'bg-amber-400' : 'bg-[#C9EF35]'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <span className="whitespace-nowrap font-mono text-[10px] tabular-nums text-zinc-400">
        {snapshot.liveWpm || '—'} WPM · {snapshot.etaSeconds}s
      </span>
      <button onClick={active ? onPause : onPlay} className="hud-btn" title={active ? 'Pause' : 'Start / Resume'}>
        {active ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button onClick={onAbort} className="hud-btn text-red-400" title="Abort">
        <Octagon size={14} />
      </button>
      <button onClick={onExpand} className="hud-btn text-[#C9EF35]" title="Expand to Studio">
        <Expand size={14} />
      </button>
    </div>
  )

  if (mode === 'desktop') {
    return <main className="h-screen w-screen overflow-hidden bg-[#151515]">{pill}</main>
  }

  return <main className="grid min-h-screen place-items-center bg-[#090909] p-4">{pill}</main>
}
