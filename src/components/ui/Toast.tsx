import { useEffect } from 'react'

export type ToastState = { type: 'success'|'error'|'info'; message: string } | null

type Props = {
  toast: ToastState
  onClose: () => void
  durationMs?: number
}

export default function Toast({ toast, onClose, durationMs = 3000 }: Props){
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => onClose(), durationMs)
    return () => window.clearTimeout(t)
  }, [toast, durationMs, onClose])

  if (!toast) return null

  const cls =
    toast.type === 'success'
      ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow'
      : toast.type === 'error'
        ? 'rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow'
        : 'rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow'

  return (
    <div className="fixed right-4 top-16 z-[60] max-w-sm">
      <div className={cls}>
        <div className="flex items-start justify-between gap-3">
          <div>{toast.message}</div>
          <button type="button" className="text-slate-500 hover:text-slate-700" onClick={onClose}>×</button>
        </div>
      </div>
    </div>
  )
}
