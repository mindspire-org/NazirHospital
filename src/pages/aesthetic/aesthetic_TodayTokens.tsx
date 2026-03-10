import { useEffect, useMemo, useState } from 'react'
import { aestheticApi } from '../../utils/api'
import Aesthetic_TokenSlip, { type TokenSlipData } from '../../components/aesthetic/aesthetic_TokenSlip'
import Toast, { type ToastState } from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

interface TokenRow {
  _id: string
  time: string
  number: number
  mrNumber?: string
  patientName?: string
  age?: string
  gender?: string
  phone?: string
  doctorId?: string
  fee: number
  discount: number
  payable: number
  status: 'queued'|'in-progress'|'completed'|'returned'|'cancelled'
  date: string
}

export default function Aesthetic_TodayTokens(){
  const [rows, setRows] = useState<TokenRow[]>([])
  const [query, setQuery] = useState('')
  const [doctorId, setDoctorId] = useState<string>('All')
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string }>>([])
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [showSlip, setShowSlip] = useState(false)
  const [slipData, setSlipData] = useState<TokenSlipData | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>('')

  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TokenRow | null>(null)
  const [editDiscount, setEditDiscount] = useState('')

  useEffect(()=>{
    ;(async()=>{
      try {
        const res: any = await aestheticApi.listDoctors({ limit: 1000 })
        const items: any[] = res?.doctors || res?.items || res || []
        setDoctors(items.map((d:any)=> ({ id: String(d._id||d.id), name: String(d.name||'') })))
      } catch {
        setDoctors([])
      }
    })()
  }, [])

  const doctorMap = useMemo(()=> Object.fromEntries(doctors.map(d=>[d.id,d.name])), [doctors])

  useEffect(()=>{ load() }, [doctorId])

  async function load(){
    const today = new Date().toISOString().slice(0,10)
    const params: any = { from: today, to: today, page: 1, limit: 200 }
    if (doctorId !== 'All') params.doctorId = doctorId
    const res: any = await aestheticApi.listTokens(params)
    const items: any[] = res?.items || []
    const mapped: TokenRow[] = items
      .filter((t:any)=> String(t?.status||'') !== 'cancelled')
      .map((t:any) => ({
        _id: String(t._id),
        time: t.date ? new Date(t.date).toLocaleTimeString() : '',
        number: Number(t.number || 0),
        mrNumber: t.mrNumber,
        patientName: t.patientName,
        age: t.age,
        gender: t.gender,
        phone: t.phone,
        doctorId: t.doctorId,
        fee: Number(t.fee || 0),
        discount: Number(t.discount || 0),
        payable: Number(t.payable ?? Math.max(Number(t.fee||0) - Number(t.discount||0), 0)),
        status: (t.status || 'queued'),
        date: String(t.date || ''),
      }))
    setRows(mapped)
    setPage(1)
  }

  const filtered = useMemo(()=>{
    const q = query.trim().toLowerCase()
    const base = rows.filter(r => (doctorId === 'All' ? true : r.doctorId === doctorId))
    if (!q) return base
    return base.filter(r =>
      [r.number, r.patientName, r.phone, r.mrNumber, doctorMap[r.doctorId || '']]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    )
  }, [rows, query, doctorId, doctorMap])

  const start = (page - 1) * rowsPerPage
  const pageRows = filtered.slice(start, start + rowsPerPage)
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))

  function printSlip(r: TokenRow){
    const slip: TokenSlipData = {
      tokenNo: String(r.number),
      departmentName: 'Aesthetic',
      doctorName: doctorMap[r.doctorId || ''] || '-',
      patientName: r.patientName || '-',
      phone: r.phone || '',
      mrn: r.mrNumber || undefined,
      age: r.age,
      gender: r.gender,
      amount: Number(r.fee || 0),
      discount: Number(r.discount || 0),
      payable: Number(r.payable || 0),
      createdAt: r.date,
    }
    setSlipData(slip)
    setShowSlip(true)
  }

  function openEdit(r: TokenRow){
    setEditTarget(r)
    setEditDiscount(String(r.discount || 0))
    setEditOpen(true)
  }

  async function saveEdit(){
    if (!editTarget) return
    const disc = Math.max(0, Number(editDiscount || 0))
    try {
      setActioningId(editTarget._id)
      await aestheticApi.updateToken(editTarget._id, { discount: disc })
      setEditOpen(false)
      await load()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to update token' })
    } finally {
      setActioningId(null)
    }
  }

  async function setStatus(r: TokenRow, status: TokenRow['status']){
    try {
      setActioningId(r._id)
      await aestheticApi.updateTokenStatus(r._id, status)
      await load()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to update status' })
    } finally {
      setActioningId(null)
    }
  }

  async function doDelete(r: TokenRow){
    setConfirmDeleteId(String(r._id))
  }

  async function confirmDelete(){
    const id = confirmDeleteId
    setConfirmDeleteId('')
    if (!id) return
    try {
      setActioningId(id)
      await aestheticApi.deleteToken(id)
      await load()
    } catch (e: any) {
      setToast({ type: 'error', message: e?.message || 'Failed to delete token' })
    } finally {
      setActioningId(null)
    }
  }

  return (
    <>
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Today's Tokens <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">{filtered.length}</span></h2>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          value={query}
          onChange={(e)=>{ setQuery(e.target.value); setPage(1) }}
          placeholder="Search by name, token#, phone, MR#, or doctor..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <select value={doctorId} onChange={(e)=>{ setDoctorId(e.target.value); setPage(1) }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
          <option value="All">All Doctors</option>
          {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <button onClick={load} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800">Refresh</button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr className="text-left text-slate-600 dark:text-slate-300">
              <Th>Time</Th>
              <Th>Token #</Th>
              <Th>MR #</Th>
              <Th>Patient</Th>
              <Th>Phone</Th>
              <Th>Doctor</Th>
              <Th>Payable</Th>
              <Th>Print</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {pageRows.map(r => (
              <tr key={r._id} className={`text-slate-700 dark:text-slate-200 ${r.status === 'returned' ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`}>
                <Td>{r.time}</Td>
                <Td>{r.number}</Td>
                <Td>{r.mrNumber || '-'}</Td>
                <Td className="font-medium">{r.patientName || '-'}</Td>
                <Td>{r.phone || '-'}</Td>
                <Td>{doctorMap[r.doctorId || ''] || '-'}</Td>
                <Td className="font-semibold text-emerald-600 dark:text-emerald-300">Rs. {Number(r.payable || 0).toLocaleString()}</Td>
                <Td><button onClick={()=>printSlip(r)} className="text-sky-600 dark:text-sky-400 hover:underline">Print Slip</button></Td>
                <Td>
                  <div className="flex gap-2">
                    <button disabled={actioningId===r._id} onClick={()=>openEdit(r)} title="Edit" className="text-sky-600 hover:text-sky-800 disabled:opacity-50">✏️</button>
                    <button disabled={actioningId===r._id} onClick={()=>setStatus(r, r.status === 'returned' ? 'queued' : 'returned')} title="Return" className={`hover:text-amber-800 ${r.status === 'returned' ? 'text-amber-800' : 'text-amber-600'} disabled:opacity-50`}>↩️</button>
                    <button disabled={actioningId===r._id} onClick={()=>doDelete(r)} title="Delete" className="text-rose-600 hover:text-rose-800 disabled:opacity-50">🗑️</button>
                  </div>
                </Td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td className="px-4 py-6 text-center text-slate-500 dark:text-slate-400" colSpan={9}>No tokens</td></tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-slate-200 p-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <select value={rowsPerPage} onChange={e=>{setRowsPerPage(parseInt(e.target.value)); setPage(1)}} className="rounded-md border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
              {[10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>Page {page} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50 dark:border-slate-600">Prev</button>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50 dark:border-slate-600">Next</button>
          </div>
        </div>
      </div>

      {showSlip && slipData && (
        <Aesthetic_TokenSlip open={showSlip} onClose={()=>setShowSlip(false)} data={slipData} autoPrint={false} />
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100">Edit Token</div>
            <div className="space-y-3 p-5 text-sm">
              <div>
                <label className="mb-1 block text-slate-700 dark:text-slate-300">Discount (PKR)</label>
                <input type="number" min={0} value={editDiscount} onChange={(e)=>setEditDiscount(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
              <button onClick={()=>setEditOpen(false)} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">Cancel</button>
              <button disabled={!!actioningId} onClick={saveEdit} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
    <ConfirmDialog
      open={!!confirmDeleteId}
      title="Confirm"
      message="Delete this token?"
      confirmText="Delete"
      onCancel={()=>setConfirmDeleteId('')}
      onConfirm={confirmDelete}
    />
    <Toast toast={toast} onClose={()=>setToast(null)} />
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2 font-medium">{children}</th>
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>
}
