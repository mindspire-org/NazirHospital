import type { Donor } from './BB_AddDonor'

type Props = {
  rows: Donor[]
  onSelect?: (id: string) => void
  selectedId?: string
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onAddToInventory?: (id: string) => void
}

export default function BB_DonorList({ rows, onSelect, selectedId, onView, onEdit, onDelete, onAddToInventory }: Props){
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">Donors</div>
        <div className="text-xs text-slate-500">{rows.length} result(s)</div>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No donors yet. Click "Add Donor" to create one.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Gender</th>
                <th className="px-3 py-2">Blood</th>
                <th className="px-3 py-2">Age</th>
                <th className="px-3 py-2">CNIC</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(r => (
                <tr key={r.id} className={`hover:bg-slate-50 ${selectedId===r.id?'bg-sky-50':''}`} onClick={()=>onSelect?.(r.id)}>
                  <td className="px-3 py-2 font-medium text-slate-700">{(r as any).code || r.id}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.gender}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2">{r.age ?? ''}</td>
                  <td className="px-3 py-2">{r.cnic ?? ''}</td>
                  <td className="px-3 py-2">{r.phone ?? ''}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <button title="View" className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50" onClick={(e)=>{ e.stopPropagation(); onView?.(r.id) }}>View</button>
                      <button title="Edit" className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50" onClick={(e)=>{ e.stopPropagation(); onEdit?.(r.id) }}>Edit</button>
                      <button title="Add to Inventory" className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50" onClick={(e)=>{ e.stopPropagation(); onAddToInventory?.(r.id) }}>Add Bag</button>
                      <button title="Delete" className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50" onClick={(e)=>{ e.stopPropagation(); onDelete?.(r.id) }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
