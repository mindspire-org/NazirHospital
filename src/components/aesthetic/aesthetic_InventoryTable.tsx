type Row = {
  invoice: string
  medicine: string
  generic?: string
  category: string
  packs: string | number
  unitsPerPack: string | number
  unitSale: string | number
  totalItems: string | number
  minStock: string | number
  expiry: string
  supplier: string
  draftId?: string
}

const headers = [
  'Invoice #',
  'Medicine',
  'Generic',
  'Category',
  'Packs',
  'Units/Pack',
  'Unit Sale',
  'Total Items',
  'Min Stock',
  'Expiry',
  'Supplier',
  'Actions',
]

type Props = {
  rows?: Row[]
  pending?: boolean
  onApprove?: (id: string)=>void
  onReject?: (id: string)=>void
  onApproveAll?: ()=>void
  onRejectAll?: ()=>void
  onEdit?: (medicine: string)=>void
  onDelete?: (medicine: string)=>void
}

export default function Pharmacy_InventoryTable({ rows = [], pending = false, onApprove, onReject, onApproveAll, onRejectAll, onEdit, onDelete }: Props) {
  const hasRows = rows.length > 0
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="text-sm text-slate-600">Rows per page</div>
        <div className="flex items-center gap-2">
          {pending && (
            <>
              <button onClick={onApproveAll} className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700">Approve All</button>
              <button onClick={onRejectAll} className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700">Reject All</button>
            </>
          )}
          <select className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700">
            <option>10</option>
            <option>25</option>
            <option>50</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              {headers.map(h => (
                <th key={h} className="whitespace-nowrap px-4 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {!hasRows && (
              <tr>
                <td colSpan={headers.length} className="px-4 py-12 text-center text-slate-500">
                  No inventory items
                </td>
              </tr>
            )}
            {hasRows && rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/50">
                <td className="px-4 py-2">{r.invoice}</td>
                <td className="px-4 py-2">{r.medicine}</td>
                <td className="px-4 py-2">{r.generic || '-'}</td>
                <td className="px-4 py-2">{r.category}</td>
                <td className="px-4 py-2">{r.packs}</td>
                <td className="px-4 py-2">{r.unitsPerPack}</td>
                <td className="px-4 py-2">{r.unitSale}</td>
                <td className="px-4 py-2">{r.totalItems}</td>
                <td className="px-4 py-2">{r.minStock}</td>
                <td className="px-4 py-2">
                  {String(r.expiry ?? '-')
                    .split('\n')
                    .map((line, idx) => (
                      <div key={idx} className={idx === 0 ? '' : 'text-xs text-slate-500'}>
                        {line}
                      </div>
                    ))}
                </td>
                <td className="px-4 py-2">{r.supplier}</td>
                <td className="px-4 py-2">
                  {pending ? (
                    <div className="flex gap-2">
                      <button onClick={()=> r.draftId && onApprove?.(r.draftId)} className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700">Approve</button>
                      <button onClick={()=> r.draftId && onReject?.(r.draftId)} className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700">Reject</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={()=> onEdit?.(r.medicine)} className="rounded-md bg-blue-800 px-2 py-1 text-xs text-white hover:bg-blue-900">Edit</button>
                      <button onClick={()=> onDelete?.(r.medicine)} className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700">Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
        <div>Page 1 of 1</div>
        <div className="flex items-center gap-2">
          <button className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50">Prev</button>
          <button className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50">Next</button>
        </div>
      </div>
    </div>
  )
}
