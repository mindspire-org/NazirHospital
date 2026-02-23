import { useEffect, useState } from 'react'
import { Download, Plus, Search } from 'lucide-react'
import Pharmacy_AddCustomer, { type Customer } from '../../components/pharmacy/pharmacy_AddCustomer'
import Pharmacy_EditCustomer from '../../components/pharmacy/pharmacy_EditCustomer'
import Pharmacy_CustomerCard from '../../components/pharmacy/pharmacy_CustomerCard'
import Pharmacy_PayBill from '../../components/pharmacy/pharmacy_PayBill'
import Pharmacy_ConfirmDialog from '../../components/pharmacy/pharmacy_ConfirmDialog'
import { pharmacyApi } from '../../utils/api'

export default function Pharmacy_Customers() {
  const [addOpen, setAddOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [payBillOpen, setPayBillOpen] = useState(false)
  const [paying, setPaying] = useState<Customer | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState<Customer | null>(null)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [exporting, setExporting] = useState(false)

  const exportCsv = async () => {
    try {
      setExporting(true)
      const pageLimit = 1000
      const first: any = await pharmacyApi.listCustomers({ q: q || undefined, page: 1, limit: pageLimit })
      let items: any[] = (first.items || [])
      const tp = Number(first.totalPages || totalPages || 1)
      const effLimit = items.length > 0 ? items.length : pageLimit
      if (tp > 1) {
        const pages = Array.from({ length: tp - 1 }, (_, i) => i + 2)
        const results = await Promise.all(pages.map(p => pharmacyApi.listCustomers({ q: q || undefined, page: p, limit: effLimit })))
        for (const r of results) items = items.concat(((r as any).items || []))
      }
      const headers = [
        'Name','Company','Phone','Address','CNIC','MR Number','Total Spent','Sales Count','Last Purchase At'
      ]
      const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const rows = items.map((x:any)=>[
        x.name, x.company, x.phone, x.address, x.cnic, x.mrNumber, x.totalSpent, x.salesCount, x.lastPurchaseAt
      ].map(esc).join(','))
      const csv = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const d = new Date()
      const y = d.getFullYear()
      const m = String(d.getMonth()+1).padStart(2,'0')
      const day = String(d.getDate()).padStart(2,'0')
      a.href = url
      a.download = `customers_${y}-${m}-${day}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      try {
        // Fallback: export currently loaded page
        const headers = [
          'Name','Company','Phone','Address','CNIC','MR Number','Total Spent','Sales Count','Last Purchase At'
        ]
        const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
        const rows = customers.map((x:any)=>[
          x.name, x.company, x.phone, x.address, x.cnic, x.mrNumber, x.totalSpent, x.salesCount, x.lastPurchaseAt
        ].map(esc).join(','))
        const csv = [headers.join(','), ...rows].join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const d = new Date()
        const y = d.getFullYear()
        const m = String(d.getMonth()+1).padStart(2,'0')
        const day = String(d.getDate()).padStart(2,'0')
        a.href = url
        a.download = `customers_page_${page}_${y}-${m}-${day}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch {
        alert('Failed to export customers')
      }
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res: any = await pharmacyApi.listCustomers({ q: q || undefined, page, limit })
        if (!mounted) return
        const mapped: Customer[] = (res.items || []).map((x: any) => ({
          id: x._id,
          name: x.name,
          company: x.company,
          phone: x.phone,
          address: x.address,
          cnic: x.cnic,
          mrNumber: x.mrNumber,
          totalSpent: x.totalSpent,
          salesCount: x.salesCount,
          lastPurchaseAt: x.lastPurchaseAt,
        }))
        setCustomers(mapped)
        setTotal(Number(res.total || 0))
        setTotalPages(Number(res.totalPages || 1))
      } catch (e) {
        console.error(e)
      }
    }
    load()
    const handler = () => load()
    try { window.addEventListener('pharmacy:sale', handler as any) } catch {}
    return () => { mounted = false; try { window.removeEventListener('pharmacy:sale', handler as any) } catch {} }
  }, [q, page, limit])

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-medium text-slate-700">Customer Management</h2>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={exportCsv} disabled={exporting} className="btn-outline-navy disabled:opacity-60">
              <Download className="h-4 w-4" /> {exporting ? 'Exporting...' : 'Export Report'}
            </button>
            <button onClick={() => setAddOpen(true)} className="btn"><Plus className="h-4 w-4" /> Add Customer</button>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm"
                placeholder="Search customers..."
                value={q}
                onChange={e=> { setQ(e.target.value); setPage(1) }}
              />
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 space-y-3">
          <div className="text-xs text-slate-500">{total>0 ? `Showing ${(total===0)?0:((page-1)*limit+1)}-${Math.min(page*limit, total)} of ${total}` : 'Showing 0 of 0'}</div>
          {customers.map(c => (
            <Pharmacy_CustomerCard
              key={c.id}
              c={c}
              onPayBill={(cc)=>{ setPaying(cc); setPayBillOpen(true) }}
              onEdit={(cc)=>{ setEditing(cc); setEditOpen(true) }}
              onDelete={(cc)=>{ setDeleting(cc); setConfirmOpen(true) }}
            />
          ))}

          <div className="flex items-center justify-end gap-2 text-sm">
            <select value={limit} onChange={e=> { setLimit(parseInt(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 px-2 py-1">
              <option value={6}>6</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
            <button onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={page<=1} className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Prev</button>
            <div className="text-slate-600">Page {page} of {totalPages}</div>
            <button onClick={()=> setPage(p=> Math.min(totalPages, p+1))} disabled={page>=totalPages} className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      <Pharmacy_AddCustomer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={async (c) => {
          await pharmacyApi.createCustomer({
            name: c.name,
            company: c.company,
            phone: c.phone,
            address: c.address,
            cnic: c.cnic,
            mrNumber: c.mrNumber,
          })
          // Reload current page
          try {
            const res: any = await pharmacyApi.listCustomers({ q: q || undefined, page, limit })
            const mapped: Customer[] = (res.items || []).map((x: any) => ({
              id: x._id,
              name: x.name,
              company: x.company,
              phone: x.phone,
              address: x.address,
              cnic: x.cnic,
              mrNumber: x.mrNumber,
              totalSpent: x.totalSpent,
              salesCount: x.salesCount,
              lastPurchaseAt: x.lastPurchaseAt,
            }))
            setCustomers(mapped)
            setTotal(Number(res.total || 0))
            setTotalPages(Number(res.totalPages || 1))
          } catch {}
        }}
      />
      <Pharmacy_EditCustomer
        open={editOpen}
        customer={editing}
        onClose={()=>{ setEditOpen(false); setEditing(null) }}
        onSave={async (c)=>{
          await pharmacyApi.updateCustomer(c.id, {
            name: c.name,
            company: c.company,
            phone: c.phone,
            address: c.address,
            cnic: c.cnic,
            mrNumber: c.mrNumber,
          })
          try {
            const res: any = await pharmacyApi.listCustomers({ q: q || undefined, page, limit })
            const mapped: Customer[] = (res.items || []).map((x: any) => ({
              id: x._id,
              name: x.name,
              company: x.company,
              phone: x.phone,
              address: x.address,
              cnic: x.cnic,
              mrNumber: x.mrNumber,
              totalSpent: x.totalSpent,
              salesCount: x.salesCount,
              lastPurchaseAt: x.lastPurchaseAt,
            }))
            setCustomers(mapped)
            setTotal(Number(res.total || 0))
            setTotalPages(Number(res.totalPages || 1))
          } catch {}
          setEditOpen(false)
          setEditing(null)
        }}
      />
      <Pharmacy_ConfirmDialog
        open={confirmOpen}
        title="Delete Customer"
        message={`Are you sure you want to delete ${deleting?.name || 'this customer'}?`}
        onCancel={()=>{ setConfirmOpen(false); setDeleting(null) }}
        onConfirm={async ()=>{
          if (!deleting) return
          await pharmacyApi.deleteCustomer(deleting.id)
          try {
            const res: any = await pharmacyApi.listCustomers({ q: q || undefined, page, limit })
            const mapped: Customer[] = (res.items || []).map((x: any) => ({
              id: x._id,
              name: x.name,
              company: x.company,
              phone: x.phone,
              address: x.address,
              cnic: x.cnic,
              mrNumber: x.mrNumber,
              totalSpent: x.totalSpent,
              salesCount: x.salesCount,
              lastPurchaseAt: x.lastPurchaseAt,
            }))
            setCustomers(mapped)
            setTotal(Number(res.total || 0))
            setTotalPages(Number(res.totalPages || 1))
          } catch {}
          setConfirmOpen(false)
          setDeleting(null)
        }}
      />
      <Pharmacy_PayBill open={payBillOpen} onClose={() => { setPayBillOpen(false); setPaying(null) }} customer={paying} />
    </div>
  )
}
