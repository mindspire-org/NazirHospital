import { useEffect, useMemo, useState } from 'react'
import Pharmacy_CashMovementSlipDialog, { type CashMovementEntry } from '../../components/pharmacy/pharmacy_CashMovementSlipDialog'
import { pharmacyApi } from '../../utils/api'

function todayStr(){ const d=new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}` }

export default function Pharmacy_PayInOut(){
  const [date, setDate] = useState<string>(todayStr())
  const [type, setType] = useState<'IN'|'OUT'>('IN')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState<string>('')
  const [note, setNote] = useState('')
  const [receiver, setReceiver] = useState('')
  const [handoverBy, setHandoverBy] = useState('')
  const [list, setList] = useState<CashMovementEntry[]>([])
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'Any'|'IN'|'OUT'>('Any')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<{IN:number; OUT:number; NET:number}>({ IN: 0, OUT: 0, NET: 0 })
  const [openSlip, setOpenSlip] = useState(false)
  const [slipEntry, setSlipEntry] = useState<CashMovementEntry | null>(null)

  async function fetchMovements(p=page, l=limit){
    setLoading(true)
    try {
      const res = await pharmacyApi.listCashMovements({ from: from || undefined, to: to || undefined, search: search || undefined, type: typeFilter==='Any'? undefined : typeFilter, page: p, limit: l })
      const items = Array.isArray(res?.items) ? res.items.map((x:any)=>({
        id: x._id || x.id,
        date: x.date,
        type: x.type,
        category: x.category,
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
  async function fetchSummary(){
    try {
      const s = await pharmacyApi.cashMovementSummary({ from: from || undefined, to: to || undefined })
      const IN = Number(s?.inAmount || 0)
      const OUT = Number(s?.outAmount || 0)
      setSummary({ IN, OUT, NET: IN - OUT })
    } catch { setSummary({ IN: 0, OUT: 0, NET: 0 }) }
  }
  useEffect(()=>{ fetchMovements(1, limit); setPage(1); fetchSummary() }, [from, to, search, typeFilter])
  useEffect(()=>{ fetchMovements(page, limit) }, [page, limit])

  const add = async () => {
    const amt = parseFloat(String(amount||'').trim())
    if (!isFinite(amt) || amt <= 0) { alert('Enter a valid amount'); return }
    let created: any
    try {
      created = await pharmacyApi.createCashMovement({
        date: date || todayStr(),
        type,
        category: category.trim() || '-',
        amount: +amt.toFixed(2),
        note: note.trim() || undefined,
        receiver: receiver.trim() || undefined,
        handoverBy: handoverBy.trim() || undefined,
      })
    } catch (e){ alert('Failed to save'); return }
    const entry: CashMovementEntry = {
      id: created?._id || crypto.randomUUID(),
      date: created?.date || date || todayStr(),
      type: created?.type || type,
      category: created?.category || (category.trim() || '-'),
      amount: created?.amount ?? +amt.toFixed(2),
      note: created?.note || (note.trim() || undefined),
      user: created?.user || 'admin',
      receiver: created?.receiver || (receiver.trim() || undefined),
      handoverBy: created?.handoverBy || (handoverBy.trim() || undefined),
    }
    setPage(1)
    fetchMovements(1, limit)
    fetchSummary()
    setCategory('')
    setAmount('')
    setNote('')
    setReceiver('')
    setHandoverBy('')
    setType('IN')
    setDate(todayStr())
    setSlipEntry(entry)
    setOpenSlip(true)
  }

  const filtered = useMemo(()=> list, [list])

  const totals = summary

  const print = (e: CashMovementEntry) => { setSlipEntry(e); setOpenSlip(true) }

  function exportCSV(){
    const rows = [['Date','Type','Category','Amount','Receiver','Handover By','Note'], ...list.map(e=>[e.date, e.type, e.category, String(e.amount), e.receiver||'', e.handoverBy||'', e.note||''])]
    const csv = rows.map(r=> r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`pharmacy-cash-movements.csv`; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="w-full p-3 sm:p-4">
      <div className="text-xl font-semibold text-slate-800">Pay In / Pay Out</div>
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-7">
          <div>
            <label className="mb-1 block text-xs text-slate-600">Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Type</label>
            <select value={type} onChange={e=>setType(e.target.value as any)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Category</label>
            <input value={category} onChange={e=>setCategory(e.target.value)} placeholder="Petty cash / ..." className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
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
          <div>
            <label className="mb-1 block text-xs text-slate-600">Note</label>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          </div>
        </div>
        <div className="mt-2">
          <button type="button" onClick={add} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">Add</button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-medium">History</div>
          <div className="ml-auto flex items-center gap-2">
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            <input placeholder="date/type/category/receiver/handover/note" value={search} onChange={e=>setSearch(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value as any)} className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900">
              <option value="Any">Any</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
            <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value)||20); setPage(1) }} className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <div className="text-xs text-slate-600">Page {page} / {totalPages}</div>
            <button type="button" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50">Prev</button>
            <button type="button" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50">Next</button>
            <button type="button" onClick={exportCSV} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">Export CSV</button>
          </div>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Receiver</th>
                <th className="px-3 py-2">Handover By</th>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">{loading? 'Loading...' : 'No data.'}</td></tr>
              )}
              {filtered.map(e => (
                <tr key={e.id}>
                  <td className="px-3 py-2">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{e.type}</td>
                  <td className="px-3 py-2">{e.category}</td>
                  <td className="px-3 py-2 text-right">{e.amount.toFixed(2)}</td>
                  <td className="px-3 py-2">{e.receiver || '-'}</td>
                  <td className="px-3 py-2">{e.handoverBy || '-'}</td>
                  <td className="px-3 py-2">{e.note || ''}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={()=>print(e)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">Slip</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 text-xs font-medium text-slate-700">
                <td className="px-3 py-2" colSpan={8}>Totals — IN: PKR {totals.IN.toFixed(2)} | OUT: PKR {totals.OUT.toFixed(2)} | NET: PKR {totals.NET.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Pharmacy_CashMovementSlipDialog open={openSlip} onClose={()=>setOpenSlip(false)} entry={slipEntry} />
    </div>
  )
}
