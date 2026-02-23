import { useEffect, useState } from 'react'

type Props = {
  open: boolean
  title?: string
  placeholder?: string
  confirmText?: string
  onConfirm: (note: string) => void
  onClose: () => void
}

export default function Lab_ReasonDialog({ open, title = 'Reason', placeholder = 'Reason (optional)', confirmText = 'Confirm', onConfirm, onClose }: Props){
  const [note, setNote] = useState('')
  useEffect(() => { if (!open) setNote('') }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="font-medium">{title}</div>
          <button onClick={onClose} className="btn-outline-navy">Close</button>
        </div>
        <div className="p-4">
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder={placeholder} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
            <button onClick={()=>onConfirm(note)} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white">{confirmText}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
