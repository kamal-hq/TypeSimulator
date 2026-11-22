import { Check, ShieldCheck, X } from 'lucide-react'
import type { SanitizeResult } from '../types/engine'

export function SanitizerPopover({
  result,
  preview,
  onPreview,
  onClose,
}: {
  result: SanitizeResult
  preview: boolean
  onPreview: (value: boolean) => void
  onClose: () => void
}) {
  return (
    <div className="absolute left-0 top-10 z-40 w-[340px] rounded-2xl border border-white/10 bg-[#171717] p-4 shadow-2xl shadow-black/60">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="flex items-center gap-2 font-semibold text-white">
            <ShieldCheck size={16} className="text-cyan-400" />Sanitizer report
          </p>
          <p className="mt-1 text-xs text-zinc-500">Strict ASCII-safe normalization</p>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {Object.entries(result.breakdown).map(([key, value]) => (
          <div key={key} className="flex justify-between rounded-lg bg-white/[.04] px-3 py-2 text-xs">
            <span className="capitalize text-zinc-400">{key.replace(/([A-Z])/g, ' $1')}</span>
            <span className="font-mono text-white">{value}</span>
          </div>
        ))}
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-between border-t border-white/8 pt-3 text-sm">
        <span>Preview sanitized text</span>
        <button
          type="button"
          onClick={() => onPreview(!preview)}
          className={`h-6 w-11 rounded-full p-1 transition ${preview ? 'bg-[#C9EF35]' : 'bg-white/10'}`}
        >
          <span className={`block h-4 w-4 rounded-full bg-black transition ${preview ? 'translate-x-5' : ''}`} />
        </button>
      </label>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-500">
        <Check size={12} className="text-[#C9EF35]" />Original source remains untouched
      </p>
    </div>
  )
}
