type Row = {
  invoice: string
  item: string
  category: string
  packs: string | number
  unitsPerPack: string | number
  unitSale: string | number
  salePerPack: string | number
  totalUnits: string | number
  minStock: string | number
  expiry: string
  supplier: string
  draftId?: string
  status?: 'low'|'out'|'expiring'|'expired'
}

const headers = [
  'Invoice #',
  'Item',
  'Category',
  'Packs',
  'Units/Pack',
  'Unit Sale',
  'Sale/Pack',
  'Total Units',
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
  onEdit?: (row: Row) => void
  onDelete?: (row: Row) => void
}

export default function Lab_InventoryTable({ rows = [], pending = false, onApprove, onReject, onApproveAll, onRejectAll, onEdit, onDelete }: Props) {
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
              <tr
                key={i}
                className={`hover:bg-slate-50/50 ${
                  r.status === 'low'
                    ? 'bg-yellow-50/40 border-l-4 border-l-yellow-300'
                    : r.status === 'out'
                    ? 'bg-rose-50/40 border-l-4 border-l-rose-400'
                    : r.status === 'expired'
                    ? 'bg-rose-100/40 border-l-4 border-l-rose-500'
                    : r.status === 'expiring'
                    ? 'bg-orange-50/40 border-l-4 border-l-orange-300'
                    : ''
                }`}
              >
                <td className="px-4 py-2">{r.invoice}</td>
                <td className="px-4 py-2">{r.item}</td>
                <td className="px-4 py-2">{r.category}</td>
                <td className="px-4 py-2">{r.packs}</td>
                <td className="px-4 py-2">{r.unitsPerPack}</td>
                <td className="px-4 py-2">{r.unitSale}</td>
                <td className="px-4 py-2">{r.salePerPack}</td>
                <td className="px-4 py-2">{r.totalUnits}</td>
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
                      <button onClick={() => onEdit?.(r)} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Edit</button>
                      <button onClick={() => onDelete?.(r)} className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700">Delete</button>
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
