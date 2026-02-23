import type { ReactNode } from 'react'

export default function Hospital_Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
        <div className="flex justify-end">
          <button onClick={onClose} className="text-slate-500">✖</button>
        </div>
        {children}
      </div>
    </div>
  )
}
