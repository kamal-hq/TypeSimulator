import type { EngineSnapshot } from '../types/engine'

function Sparkline({ values }: { values: number[] }) {
  const series = values.length >= 2 ? values : [60, 65, 61, 70]
  const points = series
    .map((value, index, arr) => {
      const clamped = Math.max(25, Math.min(150, value))
      const x = (index / Math.max(1, arr.length - 1)) * 120
      const y = 36 - ((clamped - 25) / 125) * 30
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg viewBox="0 0 120 40" className="h-9 w-full overflow-visible">
      <polyline points={points} fill="none" stroke="#C9EF35" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <polyline points={`0,40 ${points} 120,40`} fill="url(#spark)" stroke="none" />
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#C9EF35" stopOpacity=".18" />
          <stop offset="1" stopColor="#C9EF35" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function TelemetryStrip({
  snapshot,
  text,
  targetWpm,
}: {
  snapshot: EngineSnapshot
  text: string
  targetWpm: number
}) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const estEta =
    snapshot.etaSeconds > 0
      ? snapshot.etaSeconds
      : text.length > 0
        ? Math.max(1, Math.ceil(((text.length / 5) / Math.max(25, targetWpm)) * 60 * 1.12))
        : 0

  const metrics: [string, string | number][] = [
    ['CHARACTERS', text.length],
    ['WORDS', words],
    ['EST. DURATION', `${estEta}s`],
    ['LIVE WPM', snapshot.liveWpm || '—'],
  ]

  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/8 bg-[#111111] md:grid-cols-[repeat(4,1fr)_1.4fr]">
      {metrics.map(([label, value]) => (
        <div key={label} className="border-b border-r border-white/8 px-4 py-3.5 md:border-b-0">
          <p className="text-[9px] font-semibold tracking-[.16em] text-zinc-600">{label}</p>
          <p className="mt-1 font-mono text-lg tabular-nums text-zinc-100">{value}</p>
        </div>
      ))}
      <div className="col-span-2 flex items-center gap-3 px-4 py-2 md:col-span-1">
        <div className="w-full">
          <p className="mb-1 text-[9px] font-semibold tracking-[.16em] text-zinc-600">CADENCE / 20</p>
          <Sparkline values={snapshot.wpmHistory} />
        </div>
      </div>
    </div>
  )
}
