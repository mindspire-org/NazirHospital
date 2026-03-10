import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import Hospital_AddExpenseDialog from '../../components/hospital/hospital_AddExpenseDialog'
import Hospital_EditExpenseDialog from '../../components/hospital/hospital_EditExpenseDialog'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

 type ExpenseTxn = {
  id: string
  datetime: string // ISO date or datetime
  type: 'Expense'
  category: 'Rent' | 'Utilities' | 'Supplies' | 'Salaries' | 'Maintenance' | 'Other'
  description: string
  amount: number
  method?: 'cash' | 'bank' | 'card'
  ref?: string
  module?: string
  department?: string
  createdBy?: string
}

// Fetch from backend only

function toCsv(rows: ExpenseTxn[]) {
  const headers = ['datetime','department','user','category','description','method','ref','amount']
  const body = rows.map(r => [r.datetime, r.department ?? '', r.createdBy ?? '', r.category, r.description, r.method ?? '', r.ref ?? '', r.amount])
  return [headers, ...body].map(arr => arr.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export default function Finance_ExpenseHistory() {
  const [deptList, setDeptList] = useState<Array<{ id: string; name: string }>>([])
  const [all, setAll] = useState<ExpenseTxn[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseTxn | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dept, setDept] = useState<'All' | string>('All')
  const [cat, setCat] = useState<'All' | ExpenseTxn['category']>('All')
  const [method, setMethod] = useState<'All' | NonNullable<ExpenseTxn['method']>>('All')
  const [user, setUser] = useState<'All' | string>('All')
  const [q, setQ] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res: any = await hospitalApi.listExpenses({ from: from || '1900-01-01', to: to || '2100-01-01' })
        const list: Array<any> = Array.isArray(res?.expenses) ? res.expenses : []
        const depMap: Record<string,string> = Object.fromEntries((deptList||[]).map(d => [d.id, d.name]))
        const rows: ExpenseTxn[] = list.map(r => ({
          id: String(r._id || r.id),
          datetime: r.createdAt ? String(r.createdAt) : `${r.dateIso || ''}T00:00:00`,
          type: 'Expense',
          category: r.category as any,
          description: String(r.note || ''),
          amount: Number(r.amount) || 0,
          method: (r.method ? String(r.method) : undefined) as any,
          ref: r.ref ? String(r.ref) : undefined,
          module: 'Hospital',
          department: String(r.departmentName || '') || depMap[String(r.departmentId || '')] || String(r.departmentId || ''),
          createdBy: r.createdByUsername ? String(r.createdByUsername) : (r.createdBy ? String(r.createdBy) : undefined),
        }))
        if (!cancelled) setAll(rows)
      } catch {
        if (!cancelled) setAll([])
      }
    })()
    return () => { cancelled = true }
  }, [from, to, tick, deptList])

  // Refresh when salary payments trigger a global event
  useEffect(()=>{
    const onRefresh = () => setTick(t=>t+1)
    try { window.addEventListener('hospital:expenses:refresh', onRefresh as any) } catch {}
    return () => { try { window.removeEventListener('hospital:expenses:refresh', onRefresh as any) } catch {} }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res: any = await hospitalApi.listDepartments()
        const list: Array<{ id: string; name: string }> = (res?.departments || res || []).map((d: any) => ({ id: String(d._id || d.id), name: d.name }))
        if (!cancelled) setDeptList(list)
      } catch {
        if (!cancelled) setDeptList([])
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const fromDate = from ? new Date(from) : null
    const toDate = to ? new Date(new Date(to).getTime() + 24*60*60*1000 - 1) : null
    return all.filter(r => {
      if (fromDate && new Date(r.datetime) < fromDate) return false
      if (toDate && new Date(r.datetime) > toDate) return false
      if (dept !== 'All' && (r.department ?? '') !== dept) return false
      if (cat !== 'All' && r.category !== cat) return false
      if (method !== 'All' && (r.method ?? '') !== method) return false
      if (user !== 'All' && (r.createdBy ?? '') !== user) return false
      if (q) {
        const hay = `${r.description} ${r.ref ?? ''} ${r.department ?? ''} ${r.createdBy ?? ''}`.toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [all, from, to, dept, cat, method, user, q])

  const total = useMemo(() => filtered.reduce((sum, r) => sum + (r.amount || 0), 0), [filtered])

  const handleEdit = (expense: ExpenseTxn) => {
    setEditingExpense(expense)
    setEditOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await hospitalApi.deleteExpense(id)
      setTick(t => t + 1)
      setDeleteConfirm(null)
    } catch (err: any) {
      alert(err?.message || 'Failed to delete expense')
    }
  }

  const exportCsv = () => {
    const csv = toCsv(filtered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const title = 'Expense History'
    doc.setFontSize(14)
    doc.text(title, 14, 12)
    doc.setFontSize(9)
    const filterLine = `From: ${from || '-'}   To: ${to || '-'}   Dept: ${dept}   Category: ${cat}   Method: ${method}   User: ${user}   Search: ${q || '-'}`
    doc.text(filterLine, 14, 18)

    const head = [[ 'Date/Time', 'Department', 'User', 'Category', 'Description', 'Method', 'Ref', 'Amount' ]]
    const body = filtered.map(r => [
      new Date(r.datetime).toLocaleString(),
      r.department || '-',
      r.createdBy || '-',
      r.category,
      r.description,
      r.method || '-',
      r.ref || '-',
      `Rs ${Number(r.amount || 0).toFixed(2)}`,
    ])

    autoTable(doc as any, {
      head,
      body,
      startY: 22,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      columnStyles: {
        0: { cellWidth: 36 },
        1: { cellWidth: 32 },
        2: { cellWidth: 28 },
        3: { cellWidth: 24 },
        4: { cellWidth: 90 },
        5: { cellWidth: 18 },
        6: { cellWidth: 22 },
        7: { cellWidth: 22, halign: 'right' },
      },
    })

    const finalY = (doc as any).lastAutoTable?.finalY
    const y = typeof finalY === 'number' ? finalY + 6 : 22
    doc.setFontSize(10)
    doc.text(`Total: Rs ${total.toFixed(2)}`, 14, y)
    doc.save(`expenses_${new Date().toISOString().slice(0,10)}.pdf`)
  }

  const departmentNames = deptList.map(d => d.name)
  const userNames = useMemo(() => {
    const set = new Set<string>()
    for (const r of all) {
      if (r.createdBy) set.add(r.createdBy)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [all])

  return (
    <div className="w-full px-6 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-800">Expense History</div>
          <div className="text-sm text-slate-500">Department-wise expense records</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setTick(t=>t+1)} className="btn-outline-navy">Refresh</button>
          <button onClick={exportCsv} className="btn-outline-navy">Download CSV</button>
          <button onClick={exportPdf} className="btn-outline-navy">Download PDF</button>
          <button onClick={()=>setAddOpen(true)} className="btn">+ Add Expense</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid items-end gap-3 md:grid-cols-9">
          <div>
            <label className="mb-1 block text-sm text-slate-700">From</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">To</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Department</label>
            <select value={dept} onChange={e=>setDept(e.target.value as any)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-w-[180px]">
              <option>All</option>
              {departmentNames.map(d => (<option key={d}>{d}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Category</label>
            <select value={cat} onChange={e=>setCat(e.target.value as any)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option>All</option>
              <option>Rent</option>
              <option>Utilities</option>
              <option>Supplies</option>
              <option>Salaries</option>
              <option>Maintenance</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Method</label>
            <select value={method} onChange={e=>setMethod(e.target.value as any)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option>All</option>
              <option>cash</option>
              <option>bank</option>
              <option>card</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">User</label>
            <select value={user} onChange={e=>setUser(e.target.value as any)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-w-[160px]">
              <option>All</option>
              {userNames.map(u => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Search</label>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="description, ref, dept" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Rows</label>
            <select value={rowsPerPage} onChange={e=>setRowsPerPage(parseInt(e.target.value))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Results</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-2 font-medium">Date/Time</th>
                <th className="px-4 py-2 font-medium">Department</th>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium">Method</th>
                <th className="px-4 py-2 font-medium">Ref</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtered.slice(0, rowsPerPage).map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">{new Date(r.datetime).toLocaleString()}</td>
                  <td className="px-4 py-2">{r.department || '-'}</td>
                  <td className="px-4 py-2">{r.createdBy || '-'}</td>
                  <td className="px-4 py-2">{r.category}</td>
                  <td className="px-4 py-2">{r.description}</td>
                  <td className="px-4 py-2">{r.method || '-'}</td>
                  <td className="px-4 py-2">{r.ref || '-'}</td>
                  <td className="px-4 py-2">Rs {r.amount.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(r)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                      <button onClick={() => setDeleteConfirm(r.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">No expenses</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <div>Showing {Math.min(rowsPerPage, filtered.length)} of {filtered.length}</div>
          <div className="font-medium">Total: Rs {total.toFixed(2)}</div>
        </div>
      </div>
      <Hospital_AddExpenseDialog open={addOpen} onClose={()=>setAddOpen(false)} onSaved={()=>setTick(t=>t+1)} />
      
      {/* Edit Dialog */}
      {editOpen && editingExpense && (
        <Hospital_EditExpenseDialog
          expense={editingExpense}
          open={editOpen}
          onClose={() => { setEditOpen(false); setEditingExpense(null) }}
          onSaved={() => { setTick(t => t + 1); setEditOpen(false); setEditingExpense(null) }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3">
              <div className="text-lg font-semibold text-slate-800">Confirm Delete</div>
            </div>
            <div className="px-5 py-4">
              <p className="text-slate-700">Are you sure you want to delete this expense? This action cannot be undone.</p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-outline-navy">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn bg-red-600 hover:bg-red-700 text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
