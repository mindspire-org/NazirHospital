import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'
import Hospital_CashCountSlipDialog, { type CashCountEntry } from '../../components/hospital/hospital_CashCountSlipDialog'

function iso(d: Date){ return d.toISOString().slice(0,10) }

export default function Hospital_CashSessions(){
  // No cash drawer sessions — only Manager Cash Count

  // Manager Cash Count (Hospital)
  const [ccDate, setCcDate] = useState<string>(iso(new Date()))
  const [ccAmount, setCcAmount] = useState<string>('')
  const [ccReceiver, setCcReceiver] = useState('')
  const [ccHandoverBy, setCcHandoverBy] = useState('')
  const [ccNote, setCcNote] = useState('')
  const [ccList, setCcList] = useState<CashCountEntry[]>([])
  const [ccFrom, setCcFrom] = useState<string>('')
  const [ccTo, setCcTo] = useState<string>('')
  const [ccSearch, setCcSearch] = useState<string>('')
  const [ccPage, setCcPage] = useState<number>(1)
  const [ccLimit, setCcLimit] = useState<number>(20)
  const [ccTotalPages, setCcTotalPages] = useState<number>(1)
  const [ccLoading, setCcLoading] = useState<boolean>(false)
  const [openSlip, setOpenSlip] = useState<boolean>(false)
  const [slipEntry, setSlipEntry] = useState<CashCountEntry | null>(null)
  const [ccSummary, setCcSummary] = useState<{ amount: number; count: number }>({ amount: 0, count: 0 })

  // No cash drawer session calls needed

  async function fetchCounts(p=ccPage, l=ccLimit){
    setCcLoading(true)
    try {
      const res: any = await financeApi.listCashCounts({ from: ccFrom || undefined, to: ccTo || undefined, search: ccSearch || undefined, page: p, limit: l })
      const items: CashCountEntry[] = Array.isArray(res?.items) ? res.items.map((x:any)=>({
        id: x._id || x.id,
        date: x.date,
        amount: x.amount,
        note: x.note,
        user: x.user,
        receiver: x.receiver,
        handoverBy: x.handoverBy,
      })) : []
      setCcList(items)
      setCcTotalPages(Number(res?.totalPages || 1))
    } catch { setCcList([]); setCcTotalPages(1) }
    setCcLoading(false)
  }
  useEffect(()=>{ fetchCounts(1, ccLimit); setCcPage(1) }, [ccFrom, ccTo, ccSearch])
  useEffect(()=>{ fetchCounts(ccPage, ccLimit) }, [ccPage, ccLimit])

  async function fetchSummary(){
    try {
      const s: any = await financeApi.cashCountSummary({ from: ccFrom || undefined, to: ccTo || undefined, search: ccSearch || undefined })
      setCcSummary({ amount: Number(s?.amount || 0), count: Number(s?.count || 0) })
    } catch { setCcSummary({ amount: 0, count: 0 }) }
  }
  useEffect(()=>{ fetchSummary() }, [ccFrom, ccTo, ccSearch])

  const addCount = async () => {
    const amt = parseFloat(String(ccAmount||'').trim())
    if (!isFinite(amt) || amt <= 0) { alert('Enter a valid amount'); return }
    let created: any
    try {
      created = await financeApi.createCashCount({
        date: ccDate || iso(new Date()),
        amount: +amt.toFixed(2),
        note: ccNote.trim() || undefined,
        receiver: ccReceiver.trim() || undefined,
        handoverBy: ccHandoverBy.trim() || undefined,
      })
    } catch (e) { alert('Failed to save'); return }
    const entry: CashCountEntry = {
      id: created?._id || crypto.randomUUID(),
      date: created?.date || ccDate || iso(new Date()),
      amount: created?.amount ?? +amt.toFixed(2),
      note: created?.note || (ccNote.trim() || undefined),
      user: created?.user || 'manager',
      receiver: created?.receiver || (ccReceiver.trim() || undefined),
      handoverBy: created?.handoverBy || (ccHandoverBy.trim() || undefined),
    }
    setSlipEntry(entry)
    setOpenSlip(true)
    // reset
    setCcAmount(''); setCcNote(''); setCcReceiver(''); setCcHandoverBy(''); setCcDate(iso(new Date()))
    setCcPage(1)
    fetchCounts(1, ccLimit)
  }

  const ccAmountOf = (e: CashCountEntry) => {
    const a = typeof e.amount === 'number' && isFinite(e.amount) ? Number(e.amount) : 0
    if (a > 0) return a
    return Object.entries(e.counts||{}).reduce((s,[den,qty])=> s + Number(den)*Number(qty||0), 0)
  }
  const printSlip = (e: CashCountEntry) => { setSlipEntry(e); setOpenSlip(true) }

  function exportCSV(){
    const rows = [['Date','Amount','Receiver','Handover By','Note'], ...ccList.map(e=>[e.date, String(ccAmountOf(e)), e.receiver||'', e.handoverBy||'', e.note||''])]
    const csv = rows.map(r=> r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`hospital-cash-counts.csv`; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 1000)
  }

  

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Manager Cash Count</h1>
        <p className="text-slate-600 mt-1">Add manager cash counts, browse history, export CSV, and print slips.</p>
      </div>

      {/* Manager Cash Count */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 text-lg font-semibold text-slate-800">Manager Cash Count</div>
        <div className="grid gap-2 sm:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs text-slate-600">Date</label>
            <input type="date" value={ccDate} onChange={e=>setCcDate(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Amount</label>
            <input value={ccAmount} onChange={e=>setCcAmount(e.target.value)} placeholder="0" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Receiver</label>
            <input value={ccReceiver} onChange={e=>setCcReceiver(e.target.value)} placeholder="Manager name" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Handover By</label>
            <input value={ccHandoverBy} onChange={e=>setCcHandoverBy(e.target.value)} placeholder="Manager handing over" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-slate-600">Note</label>
            <input value={ccNote} onChange={e=>setCcNote(e.target.value)} placeholder="Optional" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          </div>
        </div>
        <div className="mt-2">
          <button type="button" onClick={addCount} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">Add Count</button>
        </div>
      </div>

      {/* Cash Count History */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-medium">Cash Count History</div>
          <div className="ml-auto flex items-center gap-2">
            <input type="date" value={ccFrom} onChange={e=>setCcFrom(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            <input type="date" value={ccTo} onChange={e=>setCcTo(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            <input placeholder="date, amount, receiver, handover, note" value={ccSearch} onChange={e=>setCcSearch(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
            <select value={ccLimit} onChange={e=>{ setCcLimit(parseInt(e.target.value)||20); setCcPage(1) }} className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs text-slate-900">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <div className="text-xs text-slate-600">Page {ccPage} / {ccTotalPages}</div>
            <button type="button" disabled={ccPage<=1} onClick={()=>setCcPage(p=>Math.max(1,p-1))} className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50">Prev</button>
            <button type="button" disabled={ccPage>=ccTotalPages} onClick={()=>setCcPage(p=>Math.min(ccTotalPages,p+1))} className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50">Next</button>
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
              {ccList.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">{ccLoading? 'Loading...' : 'No records yet.'}</td></tr>
              )}
              {ccList.map(e => (
                <tr key={e.id}>
                  <td className="px-3 py-2">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-right">{ccAmountOf(e).toFixed(2)}</td>
                  <td className="px-3 py-2">{e.receiver || '-'}</td>
                  <td className="px-3 py-2">{e.handoverBy || '-'}</td>
                  <td className="px-3 py-2">{e.note || ''}</td>
                  <td className="px-3 py-2"><button type="button" onClick={()=>printSlip(e)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">Slip</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 text-xs font-medium text-slate-700">
                <td className="px-3 py-2" colSpan={6}>Page Total — PKR {ccList.reduce((s,e)=> s + ccAmountOf(e), 0).toFixed(2)} | Grand Total — PKR {ccSummary.amount.toFixed(2)} (Entries: {ccSummary.count})</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>



      <Hospital_CashCountSlipDialog open={openSlip} onClose={()=>setOpenSlip(false)} entry={slipEntry} />
    </div>
  )
}
