import { useEffect, useMemo, useState } from 'react'

type AlertState = { open: boolean; title?: string; message: string }

type ConfirmState = { open: boolean; title?: string; message: string; confirmText?: string; resolve?: (v: boolean) => void }

export default function AppDialogs() {
  const [alertState, setAlertState] = useState<AlertState>({ open: false, message: '' })
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false, message: '' })

  useEffect(() => {
    const prevAlert = window.alert
    const prevConfirm = window.confirm

    window.alert = (message?: any) => {
      setAlertState({ open: true, title: 'Alert', message: String(message ?? '') })
    }

    window.confirm = (message?: any) => {
      return new Promise<boolean>((resolve) => {
        setConfirmState({ open: true, title: 'Confirm', message: String(message ?? ''), confirmText: 'Confirm', resolve })
      }) as any
    }

    return () => {
      window.alert = prevAlert
      window.confirm = prevConfirm
    }
  }, [])

  const alertOpen = alertState.open
  const confirmOpen = confirmState.open

  const closeAlert = () => setAlertState(s => ({ ...s, open: false }))

  const cancelConfirm = () => {
    const r = confirmState.resolve
    setConfirmState(s => ({ ...s, open: false, resolve: undefined }))
    try { r?.(false) } catch {}
  }

  const acceptConfirm = () => {
    const r = confirmState.resolve
    setConfirmState(s => ({ ...s, open: false, resolve: undefined }))
    try { r?.(true) } catch {}
  }

  const modalShellClass = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4'
  const panelClass = 'w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5'

  return (
    <>
      {alertOpen && (
        <div className={modalShellClass}>
          <div className={panelClass}>
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">{alertState.title || 'Alert'}</div>
            <div className="px-5 py-4 text-sm text-slate-700">{alertState.message}</div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={closeAlert} className="btn">OK</button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className={modalShellClass}>
          <div className={panelClass}>
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">{confirmState.title || 'Confirm'}</div>
            <div className="px-5 py-4 text-sm text-slate-700">{confirmState.message}</div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={cancelConfirm} className="btn-outline-navy">Cancel</button>
              <button onClick={acceptConfirm} className="btn">{confirmState.confirmText || 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
