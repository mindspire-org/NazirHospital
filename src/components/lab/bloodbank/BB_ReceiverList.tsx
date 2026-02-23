import type { Receiver } from './BB_NewReceiverRequest'

type Props = {
  rows: Receiver[]
  selectedId?: string
  onSelect?: (id: string) => void
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onApprove?: (id: string) => void
  onDispense?: (id: string) => void
}

export default function BB_ReceiverList({ rows, selectedId, onSelect, onView, onEdit, onDelete, onApprove, onDispense }: Props){
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2 text-left font-medium">ID</th>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Blood Type</th>
              <th className="px-3 py-2 text-left font-medium">Units</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">When</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-slate-500" colSpan={7}>No receiver requests yet.</td>
              </tr>
            ) : rows.map(r => (
              <tr key={r.id} className={`${selectedId===r.id?'bg-slate-50':''}`}
                  onClick={()=>onSelect?.(r.id)}>
                <td className="px-3 py-2 align-top">{(r as any).code || r.id}</td>
                <td className="px-3 py-2 align-top">{r.name}</td>
                <td className="px-3 py-2 align-top">{r.type}</td>
                <td className="px-3 py-2 align-top">{r.units}</td>
                <td className="px-3 py-2 align-top">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.status==='URGENT'?'bg-rose-100 text-rose-700': r.status==='PENDING'?'bg-amber-100 text-amber-700': r.status==='APPROVED'?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-700'}`}>{r.status}</span>
                </td>
                <td className="px-3 py-2 align-top">{r.when}</td>
                <td className="px-3 py-2 align-top">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={(e)=>{ e.stopPropagation(); onView?.(r.id) }}
                      className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-50">View</button>
                    <button
                      onClick={(e)=>{ e.stopPropagation(); onEdit?.(r.id) }}
                      className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-50">Edit</button>
                    <button
                      onClick={(e)=>{ e.stopPropagation(); onApprove?.(r.id) }}
                      className="rounded-md border border-emerald-300 px-2 py-1 text-emerald-700 hover:bg-emerald-50">Approve</button>
                    <button
                      onClick={(e)=>{ e.stopPropagation(); onDispense?.(r.id) }}
                      className="rounded-md border border-sky-300 px-2 py-1 text-sky-700 hover:bg-sky-50">Dispense</button>
                    <button
                      onClick={(e)=>{ e.stopPropagation(); onDelete?.(r.id) }}
                      className="rounded-md border border-rose-200 px-2 py-1 text-rose-700 hover:bg-rose-50">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
