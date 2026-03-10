import { useEffect, useMemo, useState } from 'react'
import Toast, { type ToastState } from '../../components/ui/Toast'
import { hospitalApi } from '../../utils/api'
import { fmt12, fmtDateTime12 } from '../../utils/timeFormat'
import { 
  RefreshCw, 
  Calendar, 
  Clock, 
  Ticket,
  Stethoscope,
  Bed,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  FileText
} from 'lucide-react'

function currency(n: number){
  return `Rs ${Number(n || 0).toFixed(2)}`
}

function escHtml(v: any){
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c] || c)
}

function money(n: any){
  return `Rs ${Number(n || 0).toFixed(2)}`
}

function buildReportHtml({
  title,
  user,
  mode,
  shift,
  range,
  summary,
  tokens,
  erPayments,
  ipdPayments,
  expenses,
  doctorPayouts,
}: {
  title: string
  user: string
  mode: 'today' | 'shift'
  shift?: any
  range?: any
  summary?: any
  tokens: any[]
  erPayments: any[]
  ipdPayments: any[]
  expenses: any[]
  doctorPayouts: any[]
}){
  const now = new Date()
  const printedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const printedTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const periodLabel = mode === 'today' ? 'Today' : 'Current Shift'
  const shiftLabel = shift ? `${shift.name}: ${fmt12(shift.start)}-${fmt12(shift.end)}` : '-'
  const rangeLabel = `${range?.start ? fmtDateTime12(range.start) : '-'} → ${range?.end ? fmtDateTime12(range.end) : '-'}`

  const table = (label: string, head: string[], bodyRows: string[][]) => {
    const th = head.map(h => `<th>${escHtml(h)}</th>`).join('')
    const rows = (bodyRows || []).map(r => `<tr>${r.map((c, i) => {
      const isMoney = /^(fee|discount|amount|pending|net)$/i.test(String(head[i] || '')) || String(c || '').trim().startsWith('Rs')
      return `<td class="${isMoney ? 'right' : ''}">${escHtml(c)}</td>`
    }).join('')}</tr>`).join('')
    const empty = `<tr><td class="empty" colspan="${head.length}">No rows</td></tr>`
    return `
      <div class="section">
        <div class="section-title">${escHtml(label)}</div>
        <table>
          <thead><tr>${th}</tr></thead>
          <tbody>${rows || empty}</tbody>
        </table>
      </div>
    `
  }

  const summaryNet = Number(summary?.net || 0)
  const netClass = summaryNet > 0 ? 'pos' : (summaryNet < 0 ? 'neg' : 'zero')

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8"/>
      <title>${escHtml(title)}</title>
      <style>
        @page { size: A4 portrait; margin: 10mm }
        *{ box-sizing:border-box }
        body{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0f172a; line-height:1.35; font-size:12px }
        .header{ border:1px solid #e2e8f0; border-radius:10px; padding:14px; margin-bottom:14px }
        .h1{ font-size:18px; font-weight:800; margin:0 0 6px 0 }
        .meta-grid{ display:grid; grid-template-columns: 1fr 1fr; gap:6px 12px }
        .meta{ color:#334155 }
        .meta b{ color:#0f172a }
        .net{ margin-top:10px; display:flex; align-items:baseline; justify-content:space-between; padding-top:10px; border-top:1px solid #e2e8f0 }
        .net .label{ color:#64748b; font-weight:600 }
        .net .value{ font-size:18px; font-weight:900 }
        .pos{ color:#059669 }
        .neg{ color:#dc2626 }
        .zero{ color:#334155 }
        .kpis{ margin-top:10px; display:grid; grid-template-columns: repeat(4, 1fr); gap:8px }
        .kpi{ border:1px solid #e2e8f0; border-radius:10px; padding:10px }
        .kpi .k{ color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.3px }
        .kpi .v{ margin-top:2px; font-size:14px; font-weight:800 }
        .kpi .s{ margin-top:2px; color:#64748b; font-size:11px }
        .section{ margin-top:12px; page-break-inside:avoid }
        .section-title{ font-size:12px; font-weight:800; background:#f1f5f9; border:1px solid #e2e8f0; padding:8px 10px; border-radius:10px; margin-bottom:6px }
        table{ width:100%; border-collapse:collapse; table-layout:fixed }
        th,td{ border:1px solid #e2e8f0; padding:6px 8px; vertical-align:top; word-wrap:break-word }
        th{ background:#f8fafc; font-weight:800; color:#334155 }
        td.right, th.right{ text-align:right }
        .empty{ text-align:center; color:#64748b; padding:10px }
        .footer{ margin-top:14px; color:#94a3b8; font-size:10px; text-align:center }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="h1">My Activity Report</div>
        <div class="meta-grid">
          <div class="meta"><b>User:</b> ${escHtml(user || '-')}</div>
          <div class="meta"><b>Printed:</b> ${escHtml(printedDate)} ${escHtml(printedTime)}</div>
          <div class="meta"><b>Period:</b> ${escHtml(periodLabel)}</div>
          <div class="meta"><b>Shift:</b> ${escHtml(shiftLabel)}</div>
          <div class="meta" style="grid-column: 1 / -1"><b>Range:</b> ${escHtml(rangeLabel)}</div>
        </div>

        <div class="net">
          <div>
            <div class="label">Net Balance</div>
          </div>
          <div class="value ${netClass}">${escHtml(money(summaryNet))}</div>
        </div>

        <div class="kpis">
          <div class="kpi">
            <div class="k">Tokens</div>
            <div class="v">${escHtml(money(summary?.tokens?.revenue || 0))}</div>
            <div class="s">Count: ${escHtml(summary?.tokens?.count ?? 0)} | Discount: ${escHtml(money(summary?.tokens?.discount || 0))}</div>
          </div>
          <div class="kpi">
            <div class="k">ER Payments</div>
            <div class="v">${escHtml(money(summary?.erPayments?.total || 0))}</div>
            <div class="s">Count: ${escHtml(summary?.erPayments?.count ?? 0)}</div>
          </div>
          <div class="kpi">
            <div class="k">IPD Payments</div>
            <div class="v">${escHtml(money(summary?.ipdPayments?.total || 0))}</div>
            <div class="s">Count: ${escHtml(summary?.ipdPayments?.count ?? 0)}</div>
          </div>
          <div class="kpi">
            <div class="k">Outflow</div>
            <div class="v">${escHtml(money((summary?.expenses?.total || 0) + (summary?.doctorPayouts?.total || 0)))}</div>
            <div class="s">Expenses: ${escHtml(money(summary?.expenses?.total || 0))} | Doctor: ${escHtml(money(summary?.doctorPayouts?.total || 0))}</div>
          </div>
        </div>
      </div>

      ${table(
        `Tokens (${tokens.length})`,
        ['Date/Time', 'Token', 'MRN', 'Patient', 'Fee', 'Discount'],
        tokens.map((t: any) => [
          fmtDateTime12(t.createdAt || t.dateIso || new Date().toISOString()),
          String(t.tokenNo || '-'),
          String(t.mrn || '-'),
          String(t.patientName || '-'),
          money(t.fee || 0),
          money(t.discount || 0),
        ])
      )}

      ${table(
        `ER Payments (${erPayments.length})`,
        ['Date/Time', 'Token', 'MRN', 'Patient', 'Method', 'Ref', 'Amount'],
        erPayments.map((p: any) => [
          fmtDateTime12(p.receivedAt || p.createdAt || new Date().toISOString()),
          String(p.tokenNo || p.tokenNoFromToken || p.tokenNoFromTags || '-'),
          String(p.mrn || p.patientMrn || '-'),
          String(p.patientName || p.patient || '-'),
          String(p.method || '-'),
          String(p.refNo || ''),
          money(p.amount || 0),
        ])
      )}

      ${table(
        `IPD Payments (${ipdPayments.length})`,
        ['Date/Time', 'Admission', 'MRN', 'Patient', 'Method', 'Ref', 'Amount', 'Pending'],
        ipdPayments.map((p: any) => [
          fmtDateTime12(p.receivedAt || p.createdAt || new Date().toISOString()),
          String(p.admissionNo || p.admission || '-'),
          String(p.mrn || p.patientMrn || '-'),
          String(p.patientName || p.patient || '-'),
          String(p.method || '-'),
          String(p.refNo || ''),
          money(p.amount || 0),
          money(p.pendingAmount || 0),
        ])
      )}

      ${table(
        `Expenses (${expenses.length})`,
        ['Date/Time', 'Category', 'Method', 'Ref', 'Amount', 'Note'],
        expenses.map((e: any) => [
          fmtDateTime12(e.createdAt || e.dateIso || new Date().toISOString()),
          String(e.category || '-'),
          String(e.method || '-'),
          String(e.ref || e.refNo || ''),
          money(e.amount || 0),
          String(e.note || e.description || ''),
        ])
      )}

      ${table(
        `Doctor Payouts (${doctorPayouts.length})`,
        ['Date', 'Doctor', 'Method', 'Ref', 'Amount', 'Memo'],
        doctorPayouts.map((p: any) => [
          String(p.dateIso || ''),
          String(p.doctorName || p.doctor || '-'),
          String(p.method || '-'),
          String(p.refNo || p.ref || ''),
          money(p.amount || 0),
          String(p.memo || ''),
        ])
      )}

      <div class="footer">Generated by Hospital Management System</div>
    </body>
  </html>`
}

function SummaryCard({ 
  icon: Icon, 
  iconColor, 
  iconBg, 
  label, 
  count, 
  value, 
  subValue 
}: { 
  icon: any
  iconColor: string
  iconBg: string
  label: string
  count: number
  value: string
  subValue?: string
}){
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`h-9 w-9 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="mt-2">
        <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
        <div className="text-base font-bold text-slate-800">{value}</div>
        {subValue && <div className="text-xs text-slate-400 mt-0.5">{subValue}</div>}
      </div>
    </div>
  )
}

function Section({ title, children, icon: Icon }: { title: string; children: any; icon?: any }){
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/50 px-4 py-3 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-slate-500" />}
        <span className="font-semibold text-slate-800">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

export default function Hospital_MyActivityReport(){
  const [mode, setMode] = useState<'today'|'shift'>('today')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [toast, setToast] = useState<ToastState>(null)

  async function load(){
    setLoading(true)
    try{
      const res: any = await hospitalApi.myActivityReport({ mode })
      setData(res || null)
    }catch(e: any){
      setData(null)
      setToast({ type: 'error', message: e?.message || 'Failed to load report' })
    }finally{
      setLoading(false)
    }
  }

  async function downloadPdf(){
    try{
      if (!data) {
        setToast({ type: 'error', message: 'No data to export' })
        return
      }
      const htmlDoc = buildReportHtml({
        title: 'My Activity Report',
        user: data?.user?.username || '-',
        mode,
        shift,
        range,
        summary,
        tokens,
        erPayments,
        ipdPayments,
        expenses,
        doctorPayouts,
      })
      if (!htmlDoc) {
        setToast({ type: 'error', message: 'Nothing to export' })
        return
      }

      const api = (window as any).electronAPI
      if (api && typeof api.printPreviewHtml === 'function'){
        const r = await api.printPreviewHtml(htmlDoc, { printBackground: true, marginsType: 0 })
        if (r && r.ok === false) {
          setToast({ type: 'error', message: r.error || 'Failed to generate PDF' })
          return
        }
        return
      }

      setToast({ type: 'error', message: 'PDF export is only available in the desktop app' })
    }catch(err: any){
      setToast({ type: 'error', message: err?.message || 'Failed to generate PDF' })
    }
  }

  useEffect(()=>{ load().catch(()=>{}) }, [mode])

  const summary = data?.summary || {}
  const range = data?.range || {}
  const shift = data?.shift

  const netTone = useMemo(()=>{
    const v = Number(summary?.net || 0)
    if (v > 0) return 'text-emerald-700'
    if (v < 0) return 'text-rose-700'
    return 'text-slate-700'
  }, [summary?.net])

  const tokens = data?.items?.tokens || []
  const erPayments = data?.items?.erPayments || []
  const ipdPayments = data?.items?.ipdPayments || []
  const expenses = data?.items?.expenses || []
  const doctorPayouts = data?.items?.doctorPayouts || []

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">My Activity Report</div>
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              {mode === 'today' ? 'Today summary' : 'Assigned shift summary'}
              {shift && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                  <Clock className="h-3 w-3" />
                  {shift.name}: {fmt12(shift.start)}-{fmt12(shift.end)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select 
              value={mode} 
              onChange={e=>setMode(e.target.value as any)} 
              className="appearance-none rounded-lg border border-slate-300 bg-white pl-9 pr-8 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="today">Today</option>
              <option value="shift">Current Shift</option>
            </select>
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
          <button 
            onClick={load} 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-50"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button
            onClick={downloadPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!data || loading}
          >
            Export PDF
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading report data...</span>
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/50 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-slate-800">Financial Summary</span>
              </div>
              <div className="text-xs text-slate-500">
                User: <span className="font-medium text-slate-700">{data?.user?.username || '-'}</span>
              </div>
            </div>
            
            <div className="p-4">
              {/* Net Balance Card */}
              <div className={`rounded-xl p-4 mb-4 ${Number(summary?.net || 0) >= 0 ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100' : 'bg-gradient-to-r from-rose-50 to-red-50 border border-rose-100'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-600">Net Balance</div>
                    <div className={`text-3xl font-bold mt-1 ${netTone}`}>
                      {currency(summary?.net || 0)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {range?.start ? fmtDateTime12(range.start) : '-'} → {range?.end ? fmtDateTime12(range.end) : '-'}
                    </div>
                  </div>
                  <div className={`h-14 w-14 rounded-full flex items-center justify-center ${Number(summary?.net || 0) >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                    {Number(summary?.net || 0) >= 0 ? (
                      <ArrowUpRight className={`h-7 w-7 ${Number(summary?.net || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
                    ) : (
                      <ArrowDownRight className="h-7 w-7 text-rose-600" />
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-3 md:grid-cols-4">
                <SummaryCard 
                  icon={Ticket}
                  iconColor="text-blue-600"
                  iconBg="bg-blue-50"
                  label="Tokens"
                  count={summary?.tokens?.count ?? 0}
                  value={currency(summary?.tokens?.revenue || 0)}
                  subValue={`Discount: ${currency(summary?.tokens?.discount || 0)}`}
                />
                <SummaryCard 
                  icon={Stethoscope}
                  iconColor="text-amber-600"
                  iconBg="bg-amber-50"
                  label="ER Payments"
                  count={summary?.erPayments?.count ?? 0}
                  value={currency(summary?.erPayments?.total || 0)}
                />
                <SummaryCard 
                  icon={Bed}
                  iconColor="text-purple-600"
                  iconBg="bg-purple-50"
                  label="IPD Payments"
                  count={summary?.ipdPayments?.count ?? 0}
                  value={currency(summary?.ipdPayments?.total || 0)}
                />
                <SummaryCard 
                  icon={Wallet}
                  iconColor="text-rose-600"
                  iconBg="bg-rose-50"
                  label="Outflow"
                  count={(summary?.expenses?.count ?? 0) + (summary?.doctorPayouts?.count ?? 0)}
                  value={currency((summary?.expenses?.total || 0) + (summary?.doctorPayouts?.total || 0))}
                  subValue={`Exp: ${currency(summary?.expenses?.total || 0)} | Doc: ${currency(summary?.doctorPayouts?.total || 0)}`}
                />
              </div>
              
              {/* Inflow/Outflow Summary */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <ArrowUpRight className="h-4 w-4" />
                    <span className="text-sm font-medium">Total Inflow</span>
                  </div>
                  <div className="text-lg font-bold text-emerald-700 mt-1">{currency(summary?.inflowTotal || 0)}</div>
                </div>
                <div className="rounded-lg bg-rose-50 border border-rose-100 p-3">
                  <div className="flex items-center gap-2 text-rose-700">
                    <ArrowDownRight className="h-4 w-4" />
                    <span className="text-sm font-medium">Total Outflow</span>
                  </div>
                  <div className="text-lg font-bold text-rose-700 mt-1">{currency(summary?.outflowTotal || 0)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Tables */}
          <div className="space-y-4">
            <Section title={`Tokens (${tokens.length})`} icon={Ticket}>
              <SimpleTable
                head={['Date/Time', 'Token', 'MRN', 'Patient', 'Fee', 'Discount']}
                rows={tokens.map((t: any) => [
                  fmtDateTime12(t.createdAt || t.dateIso || new Date().toISOString()),
                  String(t.tokenNo || '-'),
                  String(t.mrn || '-'),
                  String(t.patientName || '-'),
                  currency(Number(t.fee || 0)),
                  currency(Number(t.discount || 0)),
                ])}
              />
            </Section>

            <Section title={`ER Payments (${erPayments.length})`} icon={Stethoscope}>
              <SimpleTable
                head={['Date/Time', 'Token', 'MRN', 'Patient', 'Method', 'Ref', 'Amount']}
                rows={erPayments.map((p: any) => [
                  fmtDateTime12(p.receivedAt || p.createdAt || new Date().toISOString()),
                  String(p.tokenNo || p.tokenNoFromToken || p.tokenNoFromTags || '-'),
                  String(p.mrn || p.patientMrn || '-'),
                  String(p.patientName || p.patient || '-'),
                  String(p.method || '-'),
                  String(p.refNo || ''),
                  currency(Number(p.amount || 0)),
                ])}
              />
            </Section>

            <Section title={`IPD Payments (${ipdPayments.length})`} icon={Bed}>
              <SimpleTable
                head={['Date/Time', 'Admission', 'MRN', 'Patient', 'Method', 'Ref', 'Amount', 'Pending']}
                rows={ipdPayments.map((p: any) => [
                  fmtDateTime12(p.receivedAt || p.createdAt || new Date().toISOString()),
                  String(p.admissionNo || p.admission || '-'),
                  String(p.mrn || p.patientMrn || '-'),
                  String(p.patientName || p.patient || '-'),
                  String(p.method || '-'),
                  String(p.refNo || ''),
                  currency(Number(p.amount || 0)),
                  currency(Number(p.pendingAmount || 0)),
                ])}
              />
            </Section>

            <Section title={`Expenses (${expenses.length})`} icon={Wallet}>
              <SimpleTable
                head={['Date/Time', 'Category', 'Method', 'Ref', 'Amount', 'Note']}
                rows={expenses.map((e: any) => [
                  fmtDateTime12(e.createdAt || e.dateIso || new Date().toISOString()),
                  String(e.category || '-'),
                  String(e.method || '-'),
                  String(e.ref || e.refNo || ''),
                  currency(Number(e.amount || 0)),
                  String(e.note || e.description || ''),
                ])}
              />
            </Section>

            <Section title={`Doctor Payouts (${doctorPayouts.length})`} icon={TrendingUp}>
              <SimpleTable
                head={['Date', 'Doctor', 'Method', 'Ref', 'Amount', 'Memo']}
                rows={doctorPayouts.map((p: any) => [
                  String(p.dateIso || ''),
                  String(p.doctorName || p.doctor || '-'),
                  String(p.method || '-'),
                  String(p.refNo || p.ref || ''),
                  currency(Number(p.amount || 0)),
                  String(p.memo || ''),
                ])}
              />
            </Section>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No data.
        </div>
      )}

      <Toast toast={toast} onClose={()=>setToast(null)} />
    </div>
  )
}

function SimpleTable({ head, rows }: { head: string[]; rows: Array<Array<string>> }){
  const isMoneyCol = (label: string) => {
    const s = String(label || '').toLowerCase()
    return s === 'amount' || s === 'fee' || s === 'discount' || s === 'net' || s === 'pending'
  }
  const isMoneyCell = (v: string) => (String(v || '').trim().startsWith('Rs'))
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm table-fixed">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            {head.map(h => (
              <th
                key={h}
                className={`px-3 py-2 font-medium whitespace-nowrap ${isMoneyCol(h) ? 'text-right' : ''}`}
                style={isMoneyCol(h) ? ({ width: 120 } as any) : undefined}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-slate-700">
          {rows.length === 0 ? (
            <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={head.length}>No rows</td></tr>
          ) : rows.map((r, idx) => (
            <tr key={idx}>
              {r.map((c, i) => (
                <td
                  key={i}
                  className={`px-3 py-2 whitespace-nowrap ${isMoneyCol(head[i] || '') || isMoneyCell(c) ? 'text-right' : ''}`}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
