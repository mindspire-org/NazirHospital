import { useEffect, useMemo, useState } from 'react'
import Pharmacy_CashCountSlipDialog, { type CashCountEntry } from '../../components/pharmacy/pharmacy_CashCountSlipDialog'
import { pharmacyApi } from '../../utils/api'

function todayStr(){ const d=new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}` }

export default function Pharmacy_ManagerCashCount(){
  const [date, setDate] = useState<string>(todayStr())
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState<string>('')
  const [receiver, setReceiver] = useState('')
  const [handoverBy, setHandoverBy] = useState('')
  const [list, setList] = useState<CashCountEntry[]>([])
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [openSlip, setOpenSlip] = useState(false)
  const [slipEntry, setSlipEntry] = useState<CashCountEntry | null>(null)
  const [summary, setSummary] = useState<{ amount: number; count: number }>({ amount: 0, count: 0 })

  async function fetchCounts(p=page, l=limit){
    setLoading(true)
    try {
      const res = await pharmacyApi.listCashCounts({ from: from || undefined, to: to || undefined, search: search || undefined, page: p, limit: l })
      const items = Array.isArray(res?.items) ? res.items.map((x:any)=>({
        id: x._id || x.id,
        date: x.date,
        amount: x.amount,
        note: x.note,
        user: x.user,
        receiver: x.receiver,
        handoverBy: x.handoverBy,
      })) : []
      setList(items)
      setTotalPages(Number(res?.totalPages || 1))
    } catch {}
    setLoading(false)
  }
  useEffect(()=>{ fetchCounts(1, limit); setPage(1) }, [from, to, search])
  useEffect(()=>{ fetchCounts(page, limit) }, [page, limit])

  async function fetchSummary(){
    try {
      const s = await pharmacyApi.cashCountSummary({ from: from || undefined, to: to || undefined, search: search || undefined })
      setSummary({ amount: Number(s?.amount || 0), count: Number(s?.count || 0) })
    } catch { setSummary({ amount: 0, count: 0 }) }
  }
  useEffect(()=>{ fetchSummary() }, [from, to, search])

  const add = async () => {
    const amt = parseFloat(String(amount||'').trim())
    if (!isFinite(amt) || amt <= 0) { alert('Enter a valid amount'); return }
    let created: any
    try {
      created = await pharmacyApi.createCashCount({
        date: date || todayStr(),
        amount: +amt.toFixed(2),
        note: note.trim() || undefined,
        receiver: receiver.trim() || undefined,
        handoverBy: handoverBy.trim() || undefined,
      })
    } catch (e) { alert('Failed to save'); return }
    const entry: CashCountEntry = {
      id: created?._id || crypto.randomUUID(),
      date: created?.date || date || todayStr(),
      amount: created?.amount ?? +amt.toFixed(2),
      note: created?.note || (note.trim() || undefined),
      user: created?.user || 'manager',
      receiver: created?.receiver || (receiver.trim() || undefined),
      handoverBy: created?.handoverBy || (handoverBy.trim() || undefined),
    }
    setSlipEntry(entry)
    setOpenSlip(true)
    // reset
    setAmount(''); setNote(''); setReceiver(''); setHandoverBy(''); setDate(todayStr())
    setPage(1)
    fetchCounts(1, limit)
  }

  const filtered = useMemo(()=> list, [list])

  const amountOf = (e: CashCountEntry) => {
    const a = typeof e.amount === 'number' && isFinite(e.amount) ? Number(e.amount) : 0
    if (a > 0) return a
    return Object.entries(e.counts||{}).reduce((s,[den,qty])=> s + Number(den)*Number(qty||0), 0)
  }
  const print = (e: CashCountEntry) => { setSlipEntry(e); setOpenSlip(true) }

  function exportCSV(){
    const rows = [['Date','Amount','Receiver','Handover By','Note'], ...list.map(e=>[e.date, String(amountOf(e)), e.receiver||'', e.handoverBy||'', e.note||''])]
    const csv = rows.map(r=> r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`pharmacy-cash-counts.csv`; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="w-full p-3 sm:p-4">
      <div className="text-xl font-semibold text-slate-800">Manager Cash Count</div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs text-slate-600">Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Amount</label>
            <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Receiver</label>
            <input value={receiver} onChange={e=>setReceiver(e.target.value)} placeholder="Manager name" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Handover By</label>
            <input value={handoverBy} onChange={e=>setHandoverBy(e.target.value)} placeholder="Manager handing over" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-slate-600">Note</label>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          </div>
        </div>
        <div className="mt-2">
          <button type="button" onClick={add} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">Add Count</button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-medium">Cash Count History</div>
          <div className="ml-auto flex items-center gap-2">
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            <input placeholder="date, amount, receiver, handover, note" value={search} onChange={e=>setSearch(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value)||20); setPage(1) }} className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <div className="text-xs text-slate-600">Page {page} / {totalPages}</div>
            <button type="button" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50">Prev</button>
            <button type="button" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50">Next</button>
            <button type="button" onClick={exportCSV} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">CSV</button>
          </div>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Receiver</th>
                <th className="px-3 py-2">Handover By</th>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2">Print Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">{loading? 'Loading...' : 'No records yet.'}</td></tr>
              )}
              {filtered.map(e => (
                <tr key={e.id}>
                  <td className="px-3 py-2">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-right">{amountOf(e).toFixed(2)}</td>
                  <td className="px-3 py-2">{e.receiver || '-'}</td>
                  <td className="px-3 py-2">{e.handoverBy || '-'}</td>
                  <td className="px-3 py-2">{e.note || ''}</td>
                  <td className="px-3 py-2"><button type="button" onClick={()=>print(e)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">Slip</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 text-xs font-medium text-slate-700">
                <td className="px-3 py-2" colSpan={6}>Page Total — PKR {filtered.reduce((s,e)=> s + amountOf(e), 0).toFixed(2)} | Grand Total — PKR {summary.amount.toFixed(2)} (Entries: {summary.count})</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Pharmacy_CashCountSlipDialog open={openSlip} onClose={()=>setOpenSlip(false)} entry={slipEntry} />
    </div>
  )
}
