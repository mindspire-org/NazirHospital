import type { Receiver } from './BB_NewReceiverRequest'

type Props = {
  open: boolean
  onClose: () => void
  receiver?: Receiver
}

export default function BB_ReceiverProfile({ open, onClose, receiver }: Props){
  if (!open) return null
  const r = receiver
  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">Receiver Profile</div>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
        </div>

        {!r ? (
          <div className="py-16 text-center text-sm text-slate-500">No data</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <div className="text-xs text-slate-500 mb-1">Identity</div>
              <div className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between"><div className="font-medium">{r.name}</div><div className="text-xs text-slate-500">{r.id}</div></div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div><span className="text-slate-500">Gender:</span> {r.gender || '-'}</div>
                  <div><span className="text-slate-500">Age:</span> {r.age ?? '-'}</div>
                  <div><span className="text-slate-500">PID:</span> {r.pid || '-'}</div>
                  <div><span className="text-slate-500">Ward:</span> {r.ward || '-'}</div>
                  <div><span className="text-slate-500">MR #:</span> {r.mrNumber || '-'}</div>
                  <div><span className="text-slate-500">CNIC:</span> {r.cnic || '-'}</div>
                  <div><span className="text-slate-500">Phone:</span> {r.phone || '-'}</div>
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Request</div>
              <div className="rounded-md border border-slate-200 p-3">
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div><span className="text-slate-500">Blood Type:</span> {r.type}</div>
                  <div><span className="text-slate-500">Units:</span> {r.units}</div>
                  <div><span className="text-slate-500">Status:</span> {r.status}</div>
                  <div><span className="text-slate-500">When:</span> {r.when}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-end">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Close</button>
        </div>
      </div>
    </div>
  )
}
