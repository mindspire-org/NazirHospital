import { useEffect, useMemo, useRef, useState } from 'react'

type Option = { value: string; label: string }

type Props = {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function SearchableSelect({ value, onChange, options, placeholder = 'Type to search...', disabled, className }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as any)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const selected = useMemo(() => options.find(o => o.value === value), [options, value])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return options
    return options.filter(o => o.label.toLowerCase().includes(s))
  }, [options, q])

  return (
    <div ref={wrapRef} className={`relative ${className || ''}`}>
      <input
        disabled={disabled}
        value={open ? q : (selected?.label || '')}
        onChange={e => { setQ(e.target.value); if (!open) setOpen(true) }}
        onFocus={() => { if (!disabled) { setOpen(true); setQ('') } }}
        placeholder={placeholder}
        className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${disabled ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-slate-300 bg-white text-slate-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-200'}`}
      />
      {open && !disabled && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">No results</div>
          ) : (
            filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); setQ('') }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 ${o.value === value ? 'bg-violet-50 text-violet-700' : 'text-slate-700'}`}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <span className="text-xs">Selected</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
