type Props = {
  open: boolean
  title?: string
  message?: string
  confirmText?: string
  onCancel: () => void
  onConfirm: () => void
}

export default function Pharmacy_ConfirmDialog({ open, title, message, confirmText, onCancel, onConfirm }: Props){
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
        <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-100">{title || 'Confirm'}</div>
        <div className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">{message || 'Are you sure?'}</div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
          <button type="button" onClick={onCancel} className="btn-outline-navy">Cancel</button>
          <button type="button" onClick={onConfirm} className="btn">{confirmText || 'Confirm'}</button>
        </div>
      </div>
    </div>
  )
}
