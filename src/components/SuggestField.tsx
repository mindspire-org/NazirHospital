import { useEffect, useMemo, useRef, useState } from 'react'

export default function SuggestField({
  value,
  onChange,
  suggestions,
  placeholder,
  rows = 2,
  className = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm',
  mode = 'default',
  as = 'textarea',
  onBlurValue,
}: {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  placeholder?: string
  rows?: number
  className?: string
  mode?: 'default' | 'lab-tests'
  as?: 'textarea' | 'input'
  onBlurValue?: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)

  const query = useMemo(() => {
    if (mode === 'lab-tests') {
      const idx = Math.max(value.lastIndexOf(','), value.lastIndexOf('\n'))
      return value.slice(idx + 1).trim()
    }
    return value.trim()
  }, [value, mode])

  const list = useMemo(() => {
    const uniq = Array.from(new Set((suggestions || []).map(s => (s || '').trim()).filter(Boolean)))
    if (!query) return uniq.slice(0, 8)
    const q = query.toLowerCase()
    return uniq.filter(s => s.toLowerCase().includes(q)).slice(0, 8)
  }, [suggestions, query])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const choose = (s: string) => {
    if (mode === 'lab-tests') {
      const idxComma = value.lastIndexOf(',')
      const idxNL = value.lastIndexOf('\n')
      const idx = Math.max(idxComma, idxNL)
      const sep = idx === idxComma ? ',' : (idx === idxNL ? '\n' : '')
      let prefix = idx >= 0 ? value.slice(0, idx + 1) : ''
      if (sep === ',') {
        // ensure a single space after comma
        prefix = prefix.replace(/\s*$/, '')
        if (!prefix.endsWith(',')) prefix += ','
        prefix += ' '
      }
      onChange(prefix + s)
    } else {
      onChange(s)
    }
    setOpen(false)
    setActive(0)
    setTimeout(() => (inputRef.current as any)?.focus?.(), 0)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive(a => Math.min((list.length || 1) - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => Math.max(0, a - 1))
    } else if ((e.key === 'Enter' || e.key === 'Tab') && open && list[active]) {
      e.preventDefault()
      choose(list[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      {as === 'textarea' ? (
        <textarea
          ref={inputRef as any}
          rows={rows}
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={(e)=> onBlurValue?.(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={className}
        />
      ) : (
        <input
          ref={inputRef as any}
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={(e)=> onBlurValue?.(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={className}
        />
      )}
      {open && list.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {list.map((s, i) => (
            <div
              key={`${s}-${i}`}
              onMouseDown={e => e.preventDefault()}
              onClick={() => choose(s)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? 'bg-slate-100' : ''}`}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
