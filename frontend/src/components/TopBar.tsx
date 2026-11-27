import { Download, LayoutDashboard, Pin, Radio, Shrink } from 'lucide-react'
import { RELEASE_DOWNLOAD_URL } from '../config/links'
import type { EngineSnapshot, RuntimeInfo } from '../types/engine'

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#C9EF35] text-sm font-black text-black shadow-[0_0_24px_rgba(201,239,53,.15)]">
        T<span className="text-[#FF2E93]">S</span>
      </div>
      <span className="font-semibold tracking-tight text-white">TypeSimulator</span>
      <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">v2.0</span>
    </div>
  )
}

const stateColors: Record<string, string> = {
  IDLE: 'bg-zinc-500',
  COUNTDOWN: 'bg-amber-400',
  TYPING: 'bg-[#C9EF35]',
  PAUSED: 'bg-amber-400',
  COMPLETED: 'bg-[#C9EF35]',
  ABORTED: 'bg-red-500',
}

export function StatusPill({ snapshot }: { snapshot: EngineSnapshot }) {
  const label = snapshot.state === 'COUNTDOWN' ? `STARTING IN ${snapshot.countdownRemaining}` : snapshot.state
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[.035] px-3 py-1.5 font-mono text-[10px] font-bold tracking-[.13em] text-zinc-300">
      <span
        className={`h-1.5 w-1.5 rounded-full ${stateColors[snapshot.state]} ${['TYPING', 'COUNTDOWN'].includes(snapshot.state) ? 'animate-pulse' : ''}`}
      />
      {label}
    </div>
  )
}

export function TopBar({
  runtime,
  snapshot,
  alwaysOnTop,
  onPin,
  onCompact,
  onOverview,
}: {
  runtime: RuntimeInfo
  snapshot: EngineSnapshot
  alwaysOnTop: boolean
  onPin: () => void
  onCompact: () => void
  onOverview: () => void
}) {
  return (
    <header
      className={`sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-white/8 bg-[#0B0B0B]/95 px-4 backdrop-blur-xl md:px-6 ${
        runtime.mode === 'desktop' ? 'h-14' : 'h-16'
      }`}
    >
      <div className="flex items-center gap-4">
        <Logo />
        <span
          className={`hidden items-center rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider sm:inline-flex ${
            runtime.mode === 'desktop' ? 'border-[#C9EF35]/30 text-[#C9EF35]' : 'border-cyan-400/20 text-cyan-300'
          }`}
        >
          <Radio size={10} className="mr-1.5" />
          {runtime.label}
        </span>
      </div>

      <StatusPill snapshot={snapshot} />

      <div className="flex items-center gap-1.5">
        <button
          onClick={onPin}
          title={alwaysOnTop ? 'Disable always on top' : 'Pin always on top'}
          className={`icon-btn ${alwaysOnTop ? '!border-[#C9EF35]/40 !bg-[#C9EF35]/10 !text-[#C9EF35]' : ''}`}
        >
          <Pin size={15} />
        </button>
        <button onClick={onCompact} title="Switch to Compact HUD" className="icon-btn">
          <Shrink size={15} />
        </button>
        {runtime.mode === 'web' && (
          <>
            <button
              onClick={onOverview}
              className="ml-2 hidden items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-400 hover:bg-white/5 hover:text-white md:flex"
            >
              <LayoutDashboard size={14} />Overview
            </button>
            <a
              href={RELEASE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-lg bg-[#C9EF35] px-3 py-2 text-xs font-bold text-black hover:bg-[#d8fa55] sm:flex"
            >
              <Download size={14} />Download .exe
            </a>
          </>
        )}
      </div>
    </header>
  )
}
