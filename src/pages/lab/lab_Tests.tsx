import { useEffect, useMemo, useState } from 'react'
import { DollarSign, Search, Edit2, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from 'lucide-react'
import Lab_AddTestModal from '../../components/lab/lab_AddTestModal'
import type { LabTestFormValues } from '../../components/lab/lab_AddTestModal'
import { labApi } from '../../utils/api'

type LabTest = {
  id: string
  name: string
  price: number
  parameter?: string
  unit?: string
  normalRangeMale?: string
  normalRangeFemale?: string
  normalRangePediatric?: string
  parameters?: Array<{ name: string; unit?: string; normalRangeMale?: string; normalRangeFemale?: string; normalRangePediatric?: string }>
  consumables?: Array<{ item: string; qty: number }>
  createdAt: string
}

function formatPKR(n: number) {
  try { return n.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }) } catch { return `PKR ${n.toFixed(2)}` }
}

export default function Lab_Tests() {
  const [tests, setTests] = useState<LabTest[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [openModal, setOpenModal] = useState(false)
  const [editing, setEditing] = useState<LabTest | null>(null)

  const [q, setQ] = useState('')
  const [pageSize, setPageSize] = useState(12)
  const [page, setPage] = useState(1)
  const [tick, setTick] = useState(0)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ text: string; kind: 'success'|'error' } | null>(null)

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const res = await labApi.listTests({ q: q || undefined, page, limit: pageSize })
        if (!mounted) return
        const list: LabTest[] = (res.items||[]).map((x:any)=>({
          id: x._id,
          name: x.name,
          price: Number(x.price||0),
          parameter: x.parameter,
          unit: x.unit,
          normalRangeMale: x.normalRangeMale,
          normalRangeFemale: x.normalRangeFemale,
          normalRangePediatric: x.normalRangePediatric,
          parameters: Array.isArray(x.parameters)? x.parameters : [],
          consumables: Array.isArray(x.consumables)? x.consumables : [],
          createdAt: x.createdAt || new Date().toISOString(),
        }))
        setTests(list)
        setTotal(Number(res.total||list.length||0))
        setTotalPages(Number(res.totalPages||1))
      } catch (e){ console.error(e); setTests([]); setTotal(0); setTotalPages(1) }
    })()
    return ()=>{ mounted = false }
  }, [q, page, pageSize, tick])

  const filtered = useMemo(() => tests, [tests])

  const pageCount = totalPages
  const currentPage = Math.min(page, pageCount)
  const start = Math.min((currentPage - 1) * pageSize + 1, total)
  const end = Math.min((currentPage - 1) * pageSize + filtered.length, total)
  const pageItems = filtered

  const onSave = async (values: LabTestFormValues) => {
    if (editing) {
      await labApi.updateTest(editing.id, {
        name: values.name,
        price: Number(values.price || 0),
        parameter: values.parameter,
        unit: values.unit,
        normalRangeMale: values.normalRangeMale,
        normalRangeFemale: values.normalRangeFemale,
        normalRangePediatric: values.normalRangePediatric,
        parameters: values.parameters || [],
        consumables: values.consumables || [],
      })
      setEditing(null)
    } else {
      await labApi.createTest({
        name: values.name,
        price: Number(values.price || 0),
        parameter: values.parameter,
        unit: values.unit,
        normalRangeMale: values.normalRangeMale,
        normalRangeFemale: values.normalRangeFemale,
        normalRangePediatric: values.normalRangePediatric,
        parameters: values.parameters || [],
        consumables: values.consumables || [],
      })
    }
    setOpenModal(false)
    setTick(t=>t+1)
  }

  const requestDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true) }
  const performDelete = async () => {
    const id = deleteId; if (!id) { setDeleteOpen(false); return }
    try { await labApi.deleteTest(id); setTick(t=>t+1); setNotice({ text: 'Test deleted', kind: 'success' }) }
    catch(e){ console.error(e); setNotice({ text: 'Failed to delete test', kind: 'error' }) }
    finally { setDeleteOpen(false); setDeleteId(null); try { setTimeout(()=> setNotice(null), 2500) } catch {} }
  }

  const loadAllForExport = async (): Promise<LabTest[]> => {
    const limit = 200
    let p = 1
    const all: LabTest[] = []
    while (true) {
      try {
        const res: any = await labApi.listTests({ q: q || undefined, page: p, limit })
        const items = res?.items || []
        const mapped: LabTest[] = items.map((x: any) => ({
          id: x._id,
          name: x.name,
          price: Number(x.price || 0),
          parameter: x.parameter,
          unit: x.unit,
          normalRangeMale: x.normalRangeMale,
          normalRangeFemale: x.normalRangeFemale,
          normalRangePediatric: x.normalRangePediatric,
          parameters: Array.isArray(x.parameters) ? x.parameters : [],
          createdAt: x.createdAt || new Date().toISOString(),
        }))
        all.push(...mapped)
        const totalPages = Number(res?.totalPages || 1)
        if (p >= totalPages || items.length === 0) break
        p++
      } catch {
        break
      }
    }
    return all
  }

  const exportCSV = async () => {
    const escape = (v: any) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const data = await loadAllForExport().then(r=> r.length? r : pageItems).catch(()=> pageItems)
    const header = ['Name','Parameter','Unit','Price','Created At'].map(escape).join(',')
    const lines = data.map(t => [t.name, t.parameter || '', t.unit || '', (t.price ?? 0).toFixed(2), new Date(t.createdAt).toLocaleString()].map(escape).join(',')).join('\n')
    const csv = header + '\n' + lines
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lab-tests-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = async () => {
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
    const cols = [
      { key: 'name', title: 'Name', width: 90 },
      { key: 'parameter', title: 'Parameter', width: 50 },
      { key: 'unit', title: 'Unit', width: 22 },
      { key: 'price', title: 'Price', width: 28 },
      { key: 'created', title: 'Created At', width: 50 },
    ] as const
    const drawHeader = (y: number) => {
      doc.setFontSize(12)
      doc.text('Lab Tests', margin, y)
      y += 6
      doc.setFontSize(9)
      let x = margin
      cols.forEach(c => { doc.text(c.title, x + 1, y); x += c.width })
      y += 2
      doc.setLineWidth(0.2)
      doc.line(margin, y, pageW - margin, y)
      return y + 4
    }
    let y = drawHeader(margin)
    doc.setFontSize(8)
    const dataRows: LabTest[] = await loadAllForExport().then(r=> r.length? r : pageItems).catch(()=> pageItems)
    for (const t of dataRows) {
      const data = [t.name, t.parameter || '', t.unit || '', `Rs ${(t.price ?? 0).toFixed(2)}`, new Date(t.createdAt).toLocaleString()]
      const lines = data.map((v, i) => (doc as any).splitTextToSize(v, cols[i].width - 2)) as string[][]
      const maxLines = Math.max(1, ...lines.map(a => a.length))
      if (y + maxLines * 4 + 6 > pageH - margin) {
        doc.addPage()
        y = drawHeader(margin)
      }
      let x = margin
      for (let i = 0; i < cols.length; i++) {
        const colLines = lines[i]
        for (let j = 0; j < maxLines; j++) {
          const txt = colLines[j] || ''
          doc.text(txt, x + 1, y + j * 4 + 3)
        }
        x += cols[i].width
      }
      y += maxLines * 4 + 2
      doc.line(margin, y, pageW - margin, y)
    }
    doc.save(`lab-tests-${new Date().toISOString().slice(0,10)}.pdf`)
  }

  return (
    <div className="space-y-4">
      {notice && (
        <div className={`rounded-md border px-3 py-2 text-sm ${notice.kind==='success'? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{notice.text}</div>
      )}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={q} onChange={e=>{ setQ(e.target.value); setPage(1) }} placeholder="Search tests.." className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-2 text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          </div>
          <select value={pageSize} onChange={e=>{ setPageSize(Number(e.target.value)); setPage(1) }} className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900">
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
          </select>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={exportCSV} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">Download CSV</button>
            <button onClick={exportPDF} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">Download PDF</button>
            <button onClick={()=>{ setEditing(null); setOpenModal(true) }} className="inline-flex items-center gap-2 rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white hover:bg-violet-800">
              <Plus className="h-4 w-4" /> Add Test
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pageItems.map(t => (
          <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-base font-semibold text-slate-900">{t.name}</div>
                <div className="text-xs text-slate-500">{t.parameter || '—'}</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-700">
              <div className="inline-flex items-center gap-2"><DollarSign className="h-4 w-4" /> {formatPKR(t.price)}</div>
            </div>

            <div className="mt-3 flex gap-2">
              <button onClick={()=>{ setEditing(t); setOpenModal(true) }} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"><Edit2 className="h-4 w-4" /> Edit</button>
              <button onClick={()=> requestDelete(t.id)} className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"><Trash2 className="h-4 w-4" /> Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <div>{total === 0 ? '0' : `${start}-${end}`} of {total}</div>
        <div className="flex items-center gap-1">
          <button onClick={()=>setPage(1)} disabled={currentPage===1} className="rounded-md border border-slate-300 p-1 disabled:opacity-40 dark:border-slate-600"><ChevronsLeft className="h-4 w-4"/></button>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={currentPage===1} className="rounded-md border border-slate-300 p-1 disabled:opacity-40 dark:border-slate-600"><ChevronLeft className="h-4 w-4"/></button>
          <span className="px-2">Page {currentPage} / {pageCount}</span>
          <button onClick={()=>setPage(p=>Math.min(pageCount,p+1))} disabled={currentPage===pageCount} className="rounded-md border border-slate-300 p-1 disabled:opacity-40 dark:border-slate-600"><ChevronRight className="h-4 w-4"/></button>
          <button onClick={()=>setPage(pageCount)} disabled={currentPage===pageCount} className="rounded-md border border-slate-300 p-1 disabled:opacity-40 dark:border-slate-600"><ChevronsRight className="h-4 w-4"/></button>
        </div>
      </div>

      <Lab_AddTestModal
        open={openModal}
        onClose={() => { setOpenModal(false); setEditing(null) }}
        onSave={onSave}
        initial={editing ? {
          name: editing.name,
          price: String(editing.price ?? 0),
          parameter: editing.parameter,
          unit: editing.unit,
          normalRangeMale: editing.normalRangeMale,
          normalRangeFemale: editing.normalRangeFemale,
          normalRangePediatric: editing.normalRangePediatric,
          parameters: editing.parameters || [],
          consumables: editing.consumables || [],
        } : undefined}
      />

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Confirm Delete</div>
            <div className="px-5 py-4 text-sm text-slate-700">Delete this test?</div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={()=>{ setDeleteOpen(false); setDeleteId(null) }} className="btn-outline-navy">Cancel</button>
              <button onClick={performDelete} className="btn bg-rose-600 hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
