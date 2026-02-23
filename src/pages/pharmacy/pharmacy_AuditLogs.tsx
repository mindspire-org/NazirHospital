import { useEffect, useMemo, useState } from 'react'
import { pharmacyApi } from '../../utils/api'

type Log = {
  id: string
  actor: string
  action: string
  label?: string
  method?: string
  path?: string
  at: string
  detail?: string
}

export default function Pharmacy_AuditLogs() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState<string>('All Actions')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [logs, setLogs] = useState<Log[]>([])
  const [actions, setActions] = useState<string[]>(['All Actions'])
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [limit, setLimit] = useState<number>(10)
  const baselineActions = [
    'All Actions',
    'Login',
    'Logout',
    'Add Inventory',
    'Edit Inventory',
    'Delete Inventory',
    'Add Customer',
    'Edit Customer',
    'Delete Customer',
    'Add Supplier',
    'Edit Supplier',
    'Delete Supplier',
    'Add Expense',
    'Add User',
    // extra domain actions also supported
    'Sale',
    'Customer Return',
    'Supplier Return',
  ]
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await pharmacyApi.listAuditLogs({
        search: search || undefined,
        action: action && action !== 'All Actions' ? action : undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit,
      } as any)
      const items: Log[] = (res.items || []).map((x:any)=>({ id: x._id, actor: x.actor, action: x.action, label: x.label, method: x.method, path: x.path, at: x.at, detail: x.detail }))
      setLogs(items)
      setTotalPages(Number(res.totalPages || 1))
      const acts = Array.from(new Set([...
        baselineActions,
        ...items.map(i=>i.action).filter(Boolean)
      ])).sort((a,b)=> a.localeCompare(b))
      setActions(acts)
    } catch(e){ console.error(e) }
    setLoading(false)
  }

  useEffect(()=>{ refresh() }, [])
  useEffect(()=>{ refresh() }, [page, limit])

  const filtered = useMemo(() => logs, [logs])

  const exportPdf = async () => {
    try {
      setLoading(true)
      // Fetch all logs that match the current filters
      const res = await pharmacyApi.listAuditLogs({
        search: search || undefined,
        action: action && action !== 'All Actions' ? action : undefined,
        from: from || undefined,
        to: to || undefined,
        page: 1,
        limit: 1000, // Adjust based on expected maximum
      } as any)
      
      const items: Log[] = (res.items || []).map((x: any) => ({
        id: x._id,
        actor: x.actor,
        action: x.action,
        label: x.label || '',
        method: x.method || '',
        path: x.path || '',
        at: x.at,
        detail: x.detail || ''
      }));

      // Import jsPDF dynamically to avoid SSR issues
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      
      // Create a new PDF document
      const doc = new jsPDF()
      
      // Add title
      doc.setFontSize(18)
      doc.text('Audit Logs', 14, 22)
      
      // Add date range if specified
      if (from || to) {
        doc.setFontSize(11)
        let dateRange = 'Date range: '
        if (from) dateRange += `From ${new Date(from).toLocaleDateString()} `
        if (to) dateRange += `To ${new Date(to).toLocaleDateString()}`
        doc.text(dateRange, 14, 30)
      }
      
      // Add action filter if specified
      if (action && action !== 'All Actions') {
        doc.setFontSize(11)
        doc.text(`Action: ${action}`, 14, 38)
      }
      
      // Add table
      autoTable(doc, {
        startY: 50,
        head: [['Date/Time', 'Actor', 'Action', 'Details', 'Method', 'Path']],
        body: items.map(log => [
          new Date(log.at).toLocaleString(),
          log.actor,
          log.action,
          log.detail || log.label || '',
          log.method || '',
          log.path || ''
        ]),
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 2,
          overflow: 'linebreak',
          lineWidth: 0.1
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 45 },
          4: { cellWidth: 15 },
          5: { cellWidth: 25 }
        },
        margin: { top: 10 }
      })
      
      // Save the PDF
      const date = new Date().toISOString().split('T')[0]
      doc.save(`audit-logs-${date}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const exportExcel = async () => {
    try {
      setLoading(true)
      // Fetch all logs that match the current filters
      const res = await pharmacyApi.listAuditLogs({
        search: search || undefined,
        action: action && action !== 'All Actions' ? action : undefined,
        from: from || undefined,
        to: to || undefined,
        page: 1,
        limit: 1000, // Adjust based on expected maximum
      } as any)
      
      const items: Log[] = (res.items || []).map((x: any) => ({
        id: x._id,
        actor: x.actor,
        action: x.action,
        label: x.label || '',
        method: x.method || '',
        path: x.path || '',
        at: x.at,
        detail: x.detail || ''
      }));

      // Import XLSX dynamically to avoid SSR issues
      const XLSX = await import('xlsx')
      
      // Prepare the data for Excel
      const data = [
        ['Date/Time', 'Actor', 'Action', 'Details', 'Method', 'Path'],
        ...items.map(log => [
          new Date(log.at).toLocaleString(),
          log.actor,
          log.action,
          log.detail || log.label || '',
          log.method || '',
          log.path || ''
        ])
      ]
      
      // Create a new workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(data)
      
      // Set column widths
      const wscols = [
        { wch: 20 }, // Date/Time
        { wch: 25 }, // Actor
        { wch: 25 }, // Action
        { wch: 50 }, // Details
        { wch: 15 }, // Method
        { wch: 40 }  // Path
      ]
      ws['!cols'] = wscols
      
      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs')
      
      // Generate the Excel file
      const date = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, `audit-logs-${date}.xlsx`)
    } catch (error) {
      console.error('Error generating Excel:', error)
      alert('Failed to generate Excel file. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-slate-800">Audit Logs</div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_200px_1fr_1fr_auto_auto_auto] items-end">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Search logs...</label>
            <input value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" placeholder="Search logs..." />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Action</label>
            <select value={action} onChange={e=>setAction(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
              {actions.map(a => (<option key={a} value={a}>{a}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">From</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">To</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" />
          </div>
          <div className="flex items-end">
            <select value={limit} onChange={e=>{ setLimit(parseInt(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <button type="button" onClick={refresh} className="btn" disabled={loading}>{loading? 'Loading...' : 'Refresh'}</button>
          <div className="flex gap-2">
            <button type="button" onClick={exportPdf} className="btn-outline-navy" disabled={loading}>
            {loading ? 'Generating...' : 'Export Logs PDF'}
          </button>
          <button type="button" onClick={exportExcel} className="btn-outline-navy" disabled={loading}>
            {loading ? 'Generating...' : 'Export Logs Excel'}
          </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-slate-700">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-slate-500"><path d="M8.25 13.5a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5ZM3.75 12a4.5 4.5 0 1 0 9 0 4.5 4.5 0 0 0-9 0Z"/><path d="M17.25 8.25a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Z"/><path d="M17.25 15.75a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z"/></svg>
          <div className="font-medium">System Activity</div>
        </div>

        <div className="space-y-3">
          {filtered.map(l => (
            <div key={l.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-100" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <div className="font-semibold text-slate-800">{l.actor}</div>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{l.label}</span>
                    {l.method && <span className="rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-700">{l.method}</span>}
                    {l.path && <span className="truncate text-xs text-slate-500">{l.path}</span>}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">{new Date(l.at).toLocaleString()} {l.detail ? ` — ${l.detail}` : ''}</div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-slate-500">No logs found</div>
          )}
          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <div className="text-xs text-slate-600">Page {page} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={()=> setPage(p=> Math.max(1, p-1))} disabled={page<=1} className="rounded-md border border-slate-200 px-2 py-1 text-sm disabled:opacity-50">Prev</button>
              <button type="button" onClick={()=> setPage(p=> Math.min(totalPages, p+1))} disabled={page>=totalPages} className="rounded-md border border-slate-200 px-2 py-1 text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
