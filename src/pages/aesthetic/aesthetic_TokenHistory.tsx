import { useEffect, useMemo, useState } from 'react'
import { aestheticApi } from '../../utils/api'
import Aesthetic_TokenSlip, { type TokenSlipData } from '../../components/aesthetic/aesthetic_TokenSlip'

type Row = {
  number: number
  date: string
  patientName?: string
  phone?: string
  age?: string
  gender?: string
  mrNumber?: string
  address?: string
  doctorId?: string
  fee?: number
  discount?: number
  payable?: number
  status?: 'queued'|'in-progress'|'completed'|'returned'|'cancelled'
  // Optional procedure breakdown from backend
  procedurePrice?: number
  procedureDiscount?: number
  procedurePaidToday?: number
  procedurePaidToDate?: number
  procedureBalanceAfter?: number
}

export default function Aesthetic_TokenHistoryPage(){
  const today = new Date().toISOString().slice(0,10)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [query, setQuery] = useState('')
  const [doctor, setDoctor] = useState<string>('All')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [showSlip, setShowSlip] = useState(false)
  const [slipData, setSlipData] = useState<TokenSlipData | null>(null)

  const [doctors, setDoctors] = useState<Array<{ id: string; name: string }>>([])
  useEffect(()=>{
    let cancelled = false
    ;(async()=>{
      try {
        const res: any = await aestheticApi.listDoctors({ limit: 1000 })
        const items: any[] = res?.doctors || res?.items || res || []
        const mapped = items.map((d:any)=> ({ id: String(d._id||d.id), name: String(d.name||'') }))
        if (!cancelled) setDoctors(mapped)
      } catch { if (!cancelled) setDoctors([]) }
    })()
    return ()=>{ cancelled = true }
  }, [])
  const doctorMap = useMemo(()=> Object.fromEntries(doctors.map(d => [d.id, d.name])), [doctors])

  const [rows, setRows] = useState<Row[]>([])
  useEffect(()=>{
    let cancelled = false
    ;(async()=>{
      try{
        const res: any = await aestheticApi.listTokens({ from, to, doctorId: doctor==='All'? undefined : doctor, page: 1, limit: 1000 })
        const items: any[] = res?.items || []
        // Sort newest first
        const sorted: Row[] = items.slice().sort((a,b)=> new Date(b.date).getTime()-new Date(a.date).getTime())
        if (!cancelled) setRows(sorted)
      } catch { if (!cancelled) setRows([]) }
    })()
    return ()=>{ cancelled = true }
  }, [from, to, doctor])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const start = new Date(from)
    const end = new Date(to)
    end.setHours(23,59,59,999)
    return rows.filter(r => {
      const d = new Date(r.date)
      if (d < start || d > end) return false
      if (doctor !== 'All' && r.doctorId !== doctor) return false
      if (!q) return true
      return [r.patientName, r.number, r.phone, r.mrNumber, doctorMap[r.doctorId||'']]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    })
  }, [rows, query, from, to, doctor, doctorMap])

  const totalTokens = filtered.length
  const totalRevenue = filtered.reduce((s, r) => s + Number(r.payable ?? r.fee ?? 0), 0)
  const returnedPatients = filtered.filter(r=>r.status==='returned').length

  function printSlip(t: Row){
    const slip: TokenSlipData = {
      tokenNo: String(t.number),
      departmentName: 'Aesthetic',
      doctorName: doctorMap[t.doctorId || ''] || '-',
      patientName: t.patientName || '-',
      phone: t.phone || '',
      mrn: t.mrNumber || undefined,
      age: t.age,
      gender: t.gender,
      address: t.address,
      amount: Number(t.fee || 0),
      discount: Number(t.discount || 0),
      payable: Number(t.payable ?? (Number(t.fee||0) - Number(t.discount||0))),
      createdAt: t.date,
      procedurePrice: t.procedurePrice,
      procedureDiscount: t.procedureDiscount,
      procedurePaidToday: t.procedurePaidToday,
      procedurePaidToDate: t.procedurePaidToDate,
      procedureBalanceAfter: t.procedureBalanceAfter,
    }
    setSlipData(slip)
    setShowSlip(true)
  }

  const startIdx = (page - 1) * rowsPerPage
  const pageRows = filtered.slice(startIdx, startIdx + rowsPerPage)
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))

  const exportCSV = () => {
    const header = ['Date','Time','Token','Patient','Phone','Doctor','Amount','Discount','Payable']
    const rowsCsv = filtered.map(t => {
      const dt = new Date(t.date)
      return [
        dt.toLocaleDateString(),
        dt.toLocaleTimeString(),
        t.number,
        t.patientName || '',
        t.phone || '',
        doctorMap[t.doctorId || ''] || '',
        Number(t.fee||0).toFixed(2),
        Number(t.discount||0).toFixed(2),
        Number(t.payable ?? (Number(t.fee||0) - Number(t.discount||0))).toFixed(2),
      ]
    })
    const escape = (v:any) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const csv = header.map(escape).join(',') + '\n' + rowsCsv.map(r=> r.map(escape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aesthetic-token-history-${from}_to_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Token History <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">{filtered.length}</span></h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input type="date" value={from} onChange={e=>{setFrom(e.target.value); setPage(1)}} className="rounded-md border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          <span>to</span>
          <input type="date" value={to} onChange={e=>{setTo(e.target.value); setPage(1)}} className="rounded-md border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          <select value={doctor} onChange={e=>{setDoctor(e.target.value); setPage(1)}} className="rounded-md border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            <option value="All">All Doctors</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button onClick={exportCSV} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800">Export CSV</button>
        </div>
      </div>

      <div className="mt-4">
        <input
          value={query}
          onChange={(e)=>{setQuery(e.target.value); setPage(1)}}
          placeholder="Search by name, token#, phone, or doctor..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Date" value={from === to ? from : `${from} → ${to}`} tone="amber" />
        <StatCard title="Total Tokens" value={totalTokens} tone="green" />
        <StatCard title="Revenue" value={`Rs. ${Math.round(totalRevenue).toLocaleString()}`} tone="violet" />
        <StatCard title="Returned" value={returnedPatients} tone="amber" />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr className="text-left text-slate-600 dark:text-slate-300">
              <Th>Date</Th>
              <Th>Time</Th>
              <Th>Token #</Th>
              <Th>MR #</Th>
              <Th>Patient</Th>
              <Th>Age</Th>
              <Th>Gender</Th>
              <Th>Phone</Th>
              <Th>Doctor</Th>
              <Th>Department</Th>
              <Th>Fee</Th>
              <Th>Print</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {pageRows.map((t, idx) => {
              const dt = new Date(t.date)
              return (
                <tr key={idx} className="text-slate-700 dark:text-slate-200">
                  <Td>{dt.toLocaleDateString()}</Td>
                  <Td>{dt.toLocaleTimeString()}</Td>
                  <Td>{t.number}</Td>
                  <Td>{t.mrNumber || '-'}</Td>
                  <Td className="font-medium">{t.patientName || '-'}</Td>
                  <Td>{t.age || '-'}</Td>
                  <Td>{t.gender || '-'}</Td>
                  <Td>{t.phone || '-'}</Td>
                  <Td>{doctorMap[t.doctorId || ''] || '-'}</Td>
                  <Td>Aesthetic</Td>
                  <Td className="font-semibold text-emerald-600">Rs. {Number(t.payable ?? t.fee ?? 0).toLocaleString()}</Td>
                  <Td><button onClick={()=>printSlip(t)} className="text-sky-600 dark:text-sky-400 hover:underline">Print Slip</button></Td>
                </tr>
              )
            })}
            {pageRows.length === 0 && (
              <tr><td className="px-4 py-6 text-center text-slate-500 dark:text-slate-400" colSpan={12}>No tokens</td></tr>
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
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2 font-medium">{children}</th>
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>
}

function StatCard({ title, value, tone }: { title: string; value: React.ReactNode; tone: 'blue'|'green'|'violet'|'amber' }) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
    violet: 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800',
    amber: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
  }
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="text-sm opacity-80">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      <div className="text-xs opacity-60">Server data</div>
    </div>
  )
}
