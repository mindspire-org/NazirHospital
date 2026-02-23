import { Phone, MapPin, User, Building2, CalendarDays, ClipboardList } from 'lucide-react'
import type { Customer } from './pharmacy_AddCustomer'

export default function Pharmacy_CustomerCard({ c, onPayBill, onEdit, onDelete }: { c: Customer; onPayBill?: (c: Customer) => void; onEdit?: (c: Customer) => void; onDelete?: (c: Customer) => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500">
          <User className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-slate-900">{c.name || '—'}</div>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Bronze</span>
          </div>
          <div className="mt-2 space-y-1 text-sm text-slate-700">
            {c.phone && (
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> {c.phone}</div>
            )}
            {c.company && (
              <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-slate-400" /> {c.company}</div>
            )}
            {c.address && (
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /> {c.address}</div>
            )}
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" /> Last Purchase: {c.lastPurchaseAt ? new Date(c.lastPurchaseAt).toLocaleDateString() : '—'}</div>
            {c.mrNumber && (
              <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-slate-400" /> MR Number: {c.mrNumber}</div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2">Total Spent: {c.totalSpent != null ? `Rs ${c.totalSpent.toFixed(2)}` : '—'}</div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2">Sales Count: {c.salesCount ?? 0}</div>
          </div>

          

          <div className="mt-3 flex items-center gap-2">
            <div className="text-xs text-slate-500">ID: {c.id}</div>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={()=> onPayBill?.(c)} className="btn-outline-navy">Pay Bill</button>
              <button onClick={()=> onEdit?.(c)} className="rounded-md border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50">Edit</button>
              <button onClick={()=> onDelete?.(c)} className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-sm text-rose-700 hover:bg-rose-100">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
