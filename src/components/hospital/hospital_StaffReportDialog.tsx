import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'
import Hospital_SalarySlipDialog from './hospital_SalarySlipDialog'

type Attendance = { id?: string; staffId: string; date: string; shiftId?: string; status: 'present'|'absent'|'leave'; clockIn?: string; clockOut?: string; notes?: string }

export type LabStaff = { id: string; name: string; position?: string; shiftId?: string; salary?: number }
export type Shift = { id: string; name: string; start?: string; end?: string; absentCharges?: number; lateDeduction?: number; earlyOutDeduction?: number }

type Props = {
  open: boolean
  onClose: () => void
  staffList: LabStaff[]
  initialMonth?: string
  initialStaffId?: string
}

function formatMonth(yyyyMm: string){ const [y,m] = yyyyMm.split('-').map(Number); const d = new Date(y, (m-1)||0, 1); return d.toLocaleString(undefined, { month: 'long', year: 'numeric' }) }
function toMinutes(hm?: string){ if(!hm) return 0; const [h,m] = (hm||'').split(':').map(n=>parseInt(n||'0')); return (h*60 + m) }
function fmtHours(min: number){ const h = Math.floor(min/60); const m = Math.round(min%60); return `${h}h ${m}m` }
function formatPKR(n: number){ return `${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })} PKR` }

export default function Hospital_StaffReportDialog({ open, onClose, staffList, initialMonth, initialStaffId }: Props){
  const [query, setQuery] = useState('')
  const [month, setMonth] = useState<string>(initialMonth || new Date().toISOString().slice(0,7))
  const [selectedId, setSelectedId] = useState<string>(initialStaffId || (staffList[0]?.id ?? ''))
  const [att, setAtt] = useState<Attendance[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [earnings, setEarnings] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [payAmount, setPayAmount] = useState<number>(0)
  const [payNote, setPayNote] = useState<string>('')
  const [slipOpen, setSlipOpen] = useState(false)
  const [slipExpense, setSlipExpense] = useState<any>(null)
  const [slipPaidToDate, setSlipPaidToDate] = useState<number | undefined>(undefined)

  const currentUser = useMemo(() => {
    try {
      const s = localStorage.getItem('hospital.session')
      if (s) { const u = JSON.parse(s); return (u?.username || u?.name || '').toString() }
    } catch {}
    return 'admin'
  }, [])

  const filtered = useMemo(()=> staffList.filter(s => s.name.toLowerCase().includes(query.toLowerCase())), [staffList, query])
  const selected = useMemo(()=> staffList.find(s => s.id === selectedId) ?? filtered[0] ?? null, [selectedId, staffList, filtered])
  const shiftById = useMemo(()=> Object.fromEntries(shifts.map(s => [s.id, s] as const)), [shifts])
  const shiftName = (id?: string)=> id? (shiftById[id]?.name || '—') : '—'

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const [shiftRes, settingsRes] = await Promise.all([
          hospitalApi.listShifts(),
          hospitalApi.getSettings().catch(()=>null),
        ])
        if (!mounted) return
        setShifts((shiftRes.items||[]).map((x:any)=>({ id: x._id, name: x.name, start: x.start, end: x.end, absentCharges: x.absentCharges, lateDeduction: x.lateDeduction, earlyOutDeduction: x.earlyOutDeduction })))
        if (settingsRes) setSettings(settingsRes)
      } catch {}
    })()
    return ()=>{ mounted = false }
  }, [open])

  useEffect(()=>{ if (!open) return; if (initialStaffId && initialStaffId !== selectedId) setSelectedId(initialStaffId); if (initialMonth && initialMonth !== month) setMonth(initialMonth) }, [open, initialStaffId, initialMonth])

  useEffect(()=>{
    if (!selected) { setAtt([]); setEarnings([]); return }
    let mounted = true
    ;(async()=>{
      try {
        const from = `${month}-01`
        const dt = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0)
        const to = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
        const [attH, earnH] = await Promise.all([
          hospitalApi.listAttendance({ from, to, staffId: selected.id }),
          hospitalApi.listStaffEarnings({ from, to, staffId: selected.id, limit: 1000 }),
        ])
        if (!mounted) return
        setAtt((attH.items||[]).map((x:any)=>({ id: x._id, staffId: x.staffId, date: x.date, shiftId: x.shiftId, status: x.status, clockIn: x.clockIn, clockOut: x.clockOut, notes: x.notes })))
        setEarnings((earnH.items||[]))
      } catch { setAtt([]); setEarnings([]) }
    })()
    return ()=>{ mounted = false }
  }, [selectedId, month, open])

  // Load salary payments (expenses) for selected staff/month
  useEffect(()=>{
    if (!selected) { setPayments([]); return }
    let mounted = true
    ;(async()=>{
      try {
        const from = `${month}-01`
        const dt = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0)
        const to = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
        const res: any = await hospitalApi.listExpenses({ from, to })
        const list: any[] = Array.isArray(res?.expenses) ? res.expenses : []
        const sal = list.filter(x => String(x.category||'')==='Salaries' && String(x.note||x.description||'').includes(selected.name))
        if (!mounted) return
        setPayments(sal)
      } catch { setPayments([]) }
    })()
    return ()=>{ mounted = false }
  }, [selectedId, month, open])

  const daily = useMemo(()=>{
    if (!selected) return [] as Array<{ date: string; shift?: string; status: string; clockIn?: string; clockOut?: string; minutes: number }>
    const from = `${month}-01`
    const dt = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0)
    const to = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
    const recs = att.filter(a=> a.staffId===selected.id && a.date && a.date >= from && a.date <= to)
    const list = recs.map(r => {
      const ci = toMinutes(r.clockIn), co = toMinutes(r.clockOut)
      const diff = (ci && co) ? (co>=ci ? (co-ci) : (24*60 - ci + co)) : 0
      const normalizedStatus = (r.status==='leave') ? 'leave' : ((r.status==='present' || r.clockIn || r.clockOut) ? 'present' : 'absent')
      return { date: r.date, shift: r.shiftId, status: normalizedStatus as 'present'|'absent'|'leave', clockIn: r.clockIn, clockOut: r.clockOut, minutes: diff }
    })
    list.sort((a,b)=> a.date<b.date? -1 : a.date>b.date? 1 : 0)
    return list
  }, [att, selectedId, month])

  const stats = useMemo(()=>{
    const presentDates = new Set(daily.filter(d=>d.status==='present').map(d=>d.date))
    const leaveDates = new Set(daily.filter(d=>d.status==='leave').map(d=>d.date))
    const totalMinutes = daily.reduce((s,d)=> s + (d.status==='present'? d.minutes : 0), 0)
    const [y,m] = month.split('-').map(n=>parseInt(n||'0'))
    const today = new Date(); const curKey = today.getFullYear()*100 + (today.getMonth()+1); const targetKey = (y||0)*100 + (m||0)
    const endOfMonth = new Date(y, m, 0).getDate()
    const workingDays = targetKey < curKey ? endOfMonth : targetKey > curKey ? 0 : today.getDate()
    let late = 0, early = 0
    for (const r of daily){
      if (r.status !== 'present') continue
      const sh = r.shift ? shiftById[r.shift] || (selected?.shiftId ? shiftById[selected.shiftId] : undefined) : (selected?.shiftId ? shiftById[selected.shiftId] : undefined)
      if (!sh) continue
      const grace = 0
      if (r.clockIn && sh.start){ if (toMinutes(r.clockIn) > toMinutes(sh.start) + grace) late++ }
      if (r.clockOut && sh.end){ if (toMinutes(r.clockOut) < toMinutes(sh.end)) early++ }
    }
    const absentDays = Math.max(0, workingDays - presentDates.size - leaveDates.size)
    return { presentDays: presentDates.size, leaveDays: leaveDates.size, absentDays, totalMinutes, late, early, workingDays }
  }, [daily, shiftById, selected?.shiftId, month])

  const basicSalary = selected?.salary || 0
  const staffShift = selected?.shiftId ? shiftById[selected.shiftId] : undefined
  const absentRate = Number(staffShift?.absentCharges ?? 0)
  const lateRate = Number(staffShift?.lateDeduction ?? 0)
  const earlyRate = Number(staffShift?.earlyOutDeduction ?? 0)
  const absentDeduction = stats.absentDays * absentRate
  const lateDeduction = stats.late * lateRate
  const earlyDeduction = stats.early * earlyRate
  const totalDeductions = absentDeduction + lateDeduction + earlyDeduction
  const additionalEarnings = useMemo(()=> (earnings||[]).reduce((s,n)=> s + Number(n?.amount||0), 0), [earnings])
  const netSalary = Math.max(0, basicSalary - totalDeductions + additionalEarnings)

  const paidSoFar = useMemo(()=> (payments||[]).reduce((s,n)=> s + Number(n?.amount||0), 0), [payments])
  const remaining = Math.max(0, netSalary - paidSoFar)

  const createSalaryExpense = async (amount: number, mode: 'full'|'half'|'custom', extraNote?: string) => {
    if (!selected) return
    if (!amount || amount <= 0) return
    try {
      const today = new Date().toISOString().slice(0,10)
      const created: any = await hospitalApi.createExpense({
        dateIso: today,
        category: 'Salaries',
        amount: Number(amount),
        note: `Salary (${mode}) for ${selected.name} — ${month}${extraNote? ' — '+extraNote : ''}`,
        method: 'cash',
        ref: 'salary',
        createdBy: currentUser,
      } as any)
      setPayments(p => [ ...(p||[]), created ])
      setSlipExpense(created)
      const newPaid = paidSoFar + Number(amount)
      setSlipPaidToDate(newPaid)
      setSlipOpen(true)
      try { window.dispatchEvent(new Event('hospital:expenses:refresh')) } catch {}
    } catch {}
  }

  const handlePay = async (mode: 'full'|'half') => {
    const amt = mode === 'full' ? remaining : Math.max(0, Math.round(remaining / 2))
    await createSalaryExpense(amt, mode)
  }

  const [customPayOpen, setCustomPayOpen] = useState(false)
  const confirmCustomPay = async () => {
    const amt = Number(payAmount || 0)
    if (!amt || amt <= 0) return
    const bounded = remaining ? Math.min(amt, remaining) : amt
    setCustomPayOpen(false)
    await createSalaryExpense(bounded, 'custom', payNote || undefined)
    setPayNote('')
  }

  const exportCsv = () => {
    const rows = [['Month','Staff','Date','Status','Clock In','Clock Out','Hours']]
    for (const r of daily){
      const minutes = (r.status==='present' && r.clockIn && r.clockOut) ? Math.max(0, toMinutes(r.clockOut) - toMinutes(r.clockIn)) : 0
      rows.push([month, selected?.name||'', r.date, r.status, r.clockIn||'', r.clockOut||'', fmtHours(minutes)])
    }
    const csv = rows.map(r=> r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `lab_monthly_${month}_${selected?.name||''}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  const exportPdf = async () => {
    const staffName = selected?.name || ''
    const loadJsPDF = () => new Promise<any>((resolve, reject) => {
      const w: any = window as any
      if (w.jspdf && w.jspdf.jsPDF) return resolve(w.jspdf)
      const s = document.createElement('script')
      s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
      s.onload = () => resolve((window as any).jspdf)
      s.onerror = reject
      document.head.appendChild(s)
    })
    const jspdf = await loadJsPDF()
    const { jsPDF } = jspdf
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const margin = 10
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    doc.setFont('courier', 'normal')
    doc.setFontSize(14)
    doc.text(String(settings?.name || 'Hospital'), margin, margin + 4)
    doc.setFontSize(9)
    let topY = margin + 10
    const rightX = pageW - margin
    doc.text(`Month: ${formatMonth(month)}`, rightX - 60, margin + 4)
    doc.text(`Staff: ${staffName}`, rightX - 60, margin + 9)
    doc.setLineWidth(0.2)
    doc.line(margin, topY, pageW - margin, topY)
    topY += 6
    doc.setFontSize(12)
    doc.text('Staff Report', margin, topY)
    topY += 6
    // Attendance cards
    doc.setFontSize(9)
    const cardW = 40, gap = 6
    const cards = [
      { label: 'Present', val: String(stats.presentDays) },
      { label: 'Absents', val: String(stats.absentDays) },
      { label: 'Late Arrivals', val: String(stats.late) },
      { label: 'Working Days', val: String(stats.workingDays) },
    ]
    let x = margin
    for (const c of cards){ doc.rect(x, topY, cardW, 16); doc.text(c.val, x+2, topY+6); doc.text(c.label, x+2, topY+12); x += cardW + gap }
    topY += 22
    // Salary summary
    const lines: Array<[string,string]> = []
    lines.push(['Basic Salary', `${Number(basicSalary).toLocaleString()} PKR`])
    lines.push([`Late Arrivals (${stats.late})`, `- ${Number(lateDeduction).toLocaleString()} PKR`])
    lines.push([`Absents (${stats.absentDays})`, `- ${Number(absentDeduction).toLocaleString()} PKR`])
    lines.push([`Early Out (${stats.early})`, `- ${Number(earlyDeduction).toLocaleString()} PKR`])
    lines.push(['Total Deductions', `- ${Number(totalDeductions).toLocaleString()} PKR`])
    lines.push(['Additional Earnings', `+ ${Number(additionalEarnings).toLocaleString()} PKR`])
    lines.push(['Net Salary', `${Number(netSalary).toLocaleString()} PKR`])
    let y = topY
    const colX = pageW/2
    doc.setFontSize(10); doc.text('Salary Summary', margin, y); y += 4; doc.setFontSize(9)
    for (const [k,v] of lines){ doc.text(k, margin+2, y); doc.text(v, colX-2, y, { align: 'right' as any }); y += 5 }
    topY = y + 4
    // Table
    const cols = [
      { title: 'Date', width: 26 },
      { title: 'Shift', width: 34 },
      { title: 'Status', width: 26 },
      { title: 'Clock In', width: 26 },
      { title: 'Clock Out', width: 26 },
      { title: 'Hours', width: 26 },
    ] as const
    const drawHeader = (y0: number) => { doc.setFontSize(10); doc.text('Daily Attendance', margin, y0); y0+=4; doc.setFontSize(9); let xx = margin; for (const c of cols){ doc.text(c.title, xx+1, y0); xx += c.width } y0+=2; doc.setLineWidth(0.2); doc.line(margin, y0, pageW-margin, y0); return y0+4 }
    y = drawHeader(topY)
    doc.setFontSize(8)
    for (const r of daily){
      const data = [r.date, shiftName(r.shift), r.status, r.clockIn||'', r.clockOut||'', (r.status==='present'? fmtHours(r.minutes) : '—')]
      let xx = margin
      for (let i=0;i<cols.length;i++){ doc.text(String(data[i]||''), xx+1, y+3); xx += cols[i].width }
      y += 5
      if (y > pageH - margin - 10){ doc.addPage(); y = drawHeader(margin) }
    }
    doc.save(`hospital-staff-report-${staffName}-${month}.pdf`)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-800">Staff Report</h3>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="btn-outline-navy">Export CSV</button>
            <button onClick={()=>exportPdf()} className="btn-outline-navy">Export PDF</button>
            <button onClick={onClose} className="btn-outline-navy">Close</button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex flex-wrap items-end gap-3">
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search staff by name..." className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <select value={selected?.id ?? ''} onChange={e=>setSelectedId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              {filtered.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {selected ? (
            <div className="space-y-4">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="font-medium text-slate-800">{selected.name}</div>
                <div className="text-sm text-slate-600">{selected.position || '—'}</div>
              </div>

              <div className="text-sm text-slate-700">Monthly Report - {formatMonth(month)}</div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="font-semibold text-slate-800 mb-2">Attendance</div>
                  <div className="grid grid-cols-4 gap-3">
                    <StatCard label="Present" value={stats.presentDays} color="bg-green-50 text-green-700" />
                    <StatCard label="Absents" value={stats.absentDays} color="bg-rose-50 text-rose-700" />
                    <StatCard label="Late Arrivals" value={stats.late} color="bg-amber-50 text-amber-700" />
                    <StatCard label="Working Days" value={stats.workingDays} color="bg-slate-50 text-slate-700" />
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-slate-800 mb-2">Salary</div>
                  <div className="rounded-lg border border-slate-200 p-4 text-sm">
                    <div className="flex items-center justify-between"><div>Basic Salary</div><div className="font-medium">{formatPKR(basicSalary)}</div></div>
                    <div className="flex items-center justify-between mt-2"><div className="text-slate-600">Deductions:</div><div></div></div>
                    <div className="flex items-center justify-between text-rose-700"><div>Late Arrivals ({stats.late})</div><div>-{formatPKR(lateDeduction)}</div></div>
                    <div className="flex items-center justify-between text-rose-700"><div>Absents ({stats.absentDays})</div><div>-{formatPKR(absentDeduction)}</div></div>
                    <div className="flex items-center justify-between text-rose-700"><div>Early Out ({stats.early})</div><div>-{formatPKR(earlyDeduction)}</div></div>
                    <div className="mt-1 flex items-center justify-between font-medium"><div>Total Deductions</div><div className="text-rose-600">-{formatPKR(totalDeductions)}</div></div>
                    <div className="mt-3 flex items-center justify-between font-semibold"><div>Net Salary</div><div className="text-emerald-600">{formatPKR(netSalary)}</div></div>
                    <div className="mt-1 flex items-center justify-between"><div>Paid This Month</div><div className="text-emerald-700">+{formatPKR(paidSoFar)}</div></div>
                    <div className="mt-1 flex items-center justify-between font-medium"><div>Remaining</div><div className="text-slate-800">{formatPKR(remaining)}</div></div>
                    <div className="mt-3 flex items-center gap-2">
                      <button disabled={remaining<=0} onClick={()=>handlePay('full')} className="btn">Pay Full</button>
                      <button disabled={remaining<=0} onClick={()=>handlePay('half')} className="btn-outline-navy">Pay Half</button>
                      <button disabled={netSalary<=0} onClick={()=>{ setPayAmount(Math.max(0, remaining || netSalary)); setCustomPayOpen(true) }} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">Pay Custom</button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 font-semibold text-slate-800">Daily Attendance</div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Shift</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Clock In</th>
                        <th className="px-3 py-2 font-medium">Clock Out</th>
                        <th className="px-3 py-2 font-medium">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {daily.map((r,idx)=> (
                        <tr key={idx}>
                          <td className="px-3 py-2">{r.date}</td>
                          <td className="px-3 py-2">{shiftName(r.shift)}</td>
                          <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-xs ${r.status==='present'?'bg-emerald-100 text-emerald-700': r.status==='absent'?'bg-rose-100 text-rose-700':'bg-amber-100 text-amber-700'}`}>{r.status}</span></td>
                          <td className="px-3 py-2">{r.clockIn || '—'}</td>
                          <td className="px-3 py-2">{r.clockOut || '—'}</td>
                          <td className="px-3 py-2">{r.status==='present'? fmtHours(r.minutes) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-500">No staff found.</div>
          )}
        </div>
      </div>
      {customPayOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-xl">
            <div className="mb-3 text-base font-semibold text-slate-800">Pay Salary (Custom)</div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Amount</label>
                <input type="number" value={payAmount} onChange={e=>setPayAmount(parseFloat(e.target.value||'0'))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Amount" />
                <div className="mt-1 text-xs text-slate-500">Remaining: {formatPKR(remaining)}</div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Note (optional)</label>
                <input value={payNote} onChange={e=>setPayNote(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Note" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button onClick={()=>setCustomPayOpen(false)} className="btn-outline-navy">Cancel</button>
                <button disabled={!payAmount || payAmount<=0} onClick={confirmCustomPay} className="btn">Pay</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Hospital_SalarySlipDialog open={slipOpen} onClose={()=>setSlipOpen(false)} expense={slipExpense} staffName={selected?.name} month={month} basicSalary={basicSalary} netSalary={netSalary} paidToDate={slipPaidToDate} />
    </div>
  )
}

function StatCard({ label, value, valueDisplay, color }: { label: string; value?: number; valueDisplay?: string; color: string }){
  return (
    <div className={`rounded-lg p-4 text-center ${color}`}>
      <div className="text-2xl font-bold">{valueDisplay ?? value ?? 0}</div>
      <div className="text-sm">{label}</div>
    </div>
  )
}
