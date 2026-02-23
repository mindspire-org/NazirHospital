import { useEffect, useMemo, useRef, useState } from 'react'
import { Columns2, Plus, Trash2 } from 'lucide-react'
import ConfirmDialog from '../../components/pharmacy/pharmacy_ConfirmDialog'
import SuggestField from '../../components/SuggestField'
import { diagnosticApi, pharmacyApi } from '../../utils/api'

type ProcedurePicture = { id: string; dataUrl: string; name?: string }

type ProcedureExpense = { description: string; amount: number; category: string }

type ProcedurePharmacyConsumption = {
  itemKey?: string
  itemName: string
  quantity: number
  batch?: string
}

type PharmacyInventoryItem = {
  _id?: string
  key?: string
  name?: string
  genericName?: string
  category?: string
  onHand?: number
  lastInvoice?: string
  lastInvoiceDate?: string
  lastExpiry?: string
  earliestExpiry?: string
}

type Procedure = {
  id: string
  name: string
  price: number
  category: string
  status?: 'active' | 'inactive'
  templateHtml?: string
  picturesEnabled?: boolean
  pictures?: ProcedurePicture[]
  expense?: ProcedureExpense
  pharmacyConsumption?: ProcedurePharmacyConsumption[]
}

const DEFAULT_PROCEDURE_TEMPLATE = `<p><br/></p>`

const FIELD_TEMPLATE_MARKER = 'HMS_FIELD_TEMPLATE'

type FieldTemplateRow = { id: string; label: string; parts: number }

function parseFieldTemplateFromHtml(html: string): null | { fields: FieldTemplateRow[] }{

  try {

    const s = String(html || '')

    const idx = s.indexOf(`<!--${FIELD_TEMPLATE_MARKER}:`)

    if (idx < 0) return null

    const end = s.indexOf('-->', idx)

    if (end < 0) return null

    const json = s.slice(idx + (`<!--${FIELD_TEMPLATE_MARKER}:`).length, end).trim()

    const parsed = JSON.parse(json)

    const fieldsIn = Array.isArray(parsed?.fields) ? parsed.fields : []

    const fields = fieldsIn

      .map((x: any) => ({ id: String(x?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`), label: String(x?.label || ''), parts: Math.max(1, Math.min(6, Number(x?.parts || 1))) }))

      .filter((x: any) => x && typeof x.label === 'string')

    return { fields: fields.length ? fields : [{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, label: '', parts: 1 }] }

  } catch { return null }

}

function escapeHtml(s: string){

  return String(s || '')

    .replaceAll('&', '&amp;')

    .replaceAll('<', '&lt;')

    .replaceAll('>', '&gt;')

    .replaceAll('"', '&quot;')

    .replaceAll("'", '&#39;')

}

function buildFieldTemplateHtml(fields: Array<{ id: string; label: string; parts?: number }>){

  const clean = (fields || []).map(f => ({ id: String(f.id || ''), label: String(f.label || ''), parts: Math.max(1, Math.min(6, Number((f as any)?.parts || 1))) }))

  const marker = `<!--${FIELD_TEMPLATE_MARKER}:${JSON.stringify({ fields: clean })}-->`

  const rows = clean

    .filter(f => (f.label || '').trim().length > 0)

    .map(f => {

      const label = escapeHtml(f.label.trim())

      const parts = Math.max(1, Math.min(6, Number((f as any)?.parts || 1)))

      const innerCells = Array.from({ length: parts }).map((_, idx) => {

        const borderLeft = idx > 0 ? 'border-left:1px solid #94a3b8;' : ''

        return `<td style="${borderLeft} padding:10px;"><br/></td>`

      }).join('')

      return `<tr><td style="border:1px solid #94a3b8; padding:10px; width:45%; font-weight:600; background:#f8fafc;">${label}</td><td style="border:1px solid #94a3b8; padding:0;"><table style="width:100%; border-collapse:collapse; table-layout:fixed;"><tr>${innerCells}</tr></table></td></tr>`

    })

    .join('')

  const body = rows || `<tr><td style="border:1px solid #94a3b8; padding:10px; width:45%; font-weight:600; background:#f8fafc;">Field</td><td style="border:1px solid #94a3b8; padding:10px;"><br/></td></tr>`

  return `${marker}<table style="width:100%; border-collapse:collapse; table-layout:fixed;">${body}</table><p><br/></p>`

}

export default function Diagnostic_Procedures() {
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [proceduresLoading, setProceduresLoading] = useState(false)
  const [proceduresError, setProceduresError] = useState('')

  const [proceduresQ, setProceduresQ] = useState('')
  const [proceduresStatusFilter, setProceduresStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const proceduresDebounceRef = useRef<number | null>(null)

  const [showProcedureModal, setShowProcedureModal] = useState(false)
  const [procedureEditId, setProcedureEditId] = useState<string | null>(null)
  const [procedureDeleteId, setProcedureDeleteId] = useState<string | null>(null)

  const [procedureName, setProcedureName] = useState('')
  const [procedurePrice, setProcedurePrice] = useState('')
  const [procedureDepartment, setProcedureDepartment] = useState('')
  const [procedureStatus, setProcedureStatus] = useState<'active' | 'inactive'>('active')

  const [templateMode, setTemplateMode] = useState<'table' | 'field'>('table')
  const [fieldTemplateRows, setFieldTemplateRows] = useState<FieldTemplateRow[]>([{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, label: '', parts: 1 }])

  const [showExpense, setShowExpense] = useState(false)
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('')

  const [showPharmacyConsumption, setShowPharmacyConsumption] = useState(false)
  const [pharmacyConsumptions, setPharmacyConsumptions] = useState<
    { id: string; itemKey: string; itemName: string; quantity: string; batch: string }[]
  >([])

  const [pharmacyInventory, setPharmacyInventory] = useState<PharmacyInventoryItem[]>([])
  const [pharmacyInventoryLoading, setPharmacyInventoryLoading] = useState(false)

  const [procedureTemplateHtml, setProcedureTemplateHtml] = useState(DEFAULT_PROCEDURE_TEMPLATE)
  const procedureTemplateRef = useRef<HTMLDivElement>(null)

  const [showProcedurePictures, setShowProcedurePictures] = useState(false)
  const [procedurePictures, setProcedurePictures] = useState<ProcedurePicture[]>([])

  const [tablePickerOpen, setTablePickerOpen] = useState(false)
  const [tablePickerRows, setTablePickerRows] = useState(0)
  const [tablePickerCols, setTablePickerCols] = useState(0)
  const tablePickerWrapRef = useRef<HTMLDivElement>(null)

  const [tableToolsOpen, setTableToolsOpen] = useState(false)
  const [tableToolsPos, setTableToolsPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const tableToolsRef = useRef<HTMLDivElement>(null)
  const selectedTableCellRef = useRef<HTMLTableCellElement | null>(null)
  const lastHighlightedCellRef = useRef<HTMLElement | null>(null)

  const lastSelectionRangeRef = useRef<Range | null>(null)
  const [fontSizePx, setFontSizePx] = useState('14')

  const loadProcedures = async (opts?: { q?: string; status?: 'all' | 'active' | 'inactive' }) => {
    try {
      setProceduresLoading(true)
      setProceduresError('')
      const q = String(opts?.q ?? '').trim()
      const statusParam = opts?.status && opts.status !== 'all' ? opts.status : undefined
      const res: any = await diagnosticApi.listTests({ q: q || undefined, status: statusParam as any, limit: 200, lite: true })
      const items: any[] = res?.items ?? res ?? []
      const mapped: Procedure[] = (items || []).map((p: any) => ({
        id: String(p._id || p.id || ''),
        name: String(p.name || ''),
        price: Number(p.price || 0),
        category: String(p.category || p.department || ''),
        status: (p.status || 'active') as any,
        templateHtml: '',
        picturesEnabled: false,
        pictures: [],
        expense: undefined,
        pharmacyConsumption: [],
      }))
      const status = opts?.status || 'all'
      const filtered = status === 'all' ? mapped : mapped.filter(p => (p.status || 'active') === status)
      setProcedures(filtered)
    } catch (e: any) {
      setProcedures([])
      setProceduresError(String(e?.message || 'Failed to load tests'))
    } finally {
      setProceduresLoading(false)
    }
  }

  useEffect(() => {
    if (proceduresDebounceRef.current) window.clearTimeout(proceduresDebounceRef.current)
    proceduresDebounceRef.current = window.setTimeout(() => {
      loadProcedures({ q: proceduresQ, status: proceduresStatusFilter })
    }, 250)
    return () => {
      if (proceduresDebounceRef.current) window.clearTimeout(proceduresDebounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proceduresQ, proceduresStatusFilter])

  useEffect(() => {
    if (!showProcedureModal) return
    try {
      const el = procedureTemplateRef.current
      if (!el) return
      const next = procedureTemplateHtml || DEFAULT_PROCEDURE_TEMPLATE
      if ((el.innerHTML || '') !== next) el.innerHTML = next
    } catch {}
  }, [showProcedureModal, procedureTemplateHtml])

  useEffect(() => {
    if (!tablePickerOpen) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as any
      const wrap = tablePickerWrapRef.current
      if (wrap && t && wrap.contains(t)) return
      setTablePickerOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTablePickerOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [tablePickerOpen])

  useEffect(() => {
    if (!showProcedureModal) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as any
      const editor = procedureTemplateRef.current
      const tools = tableToolsRef.current
      if (editor && t && editor.contains(t)) return
      if (tools && t && tools.contains(t)) return
      selectedTableCellRef.current = null
      try {
        if (lastHighlightedCellRef.current) {
          lastHighlightedCellRef.current.style.outline = ''
          lastHighlightedCellRef.current.style.outlineOffset = ''
        }
      } catch {}
      lastHighlightedCellRef.current = null
      setTableToolsOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
    }
  }, [showProcedureModal])

  const toggleExpense = () => {
    setShowExpense(v => !v)
  }

  const togglePharmacyConsumption = () => {
    setShowPharmacyConsumption(v => {
      const next = !v
      if (next) {
        setPharmacyConsumptions(prev =>
          prev.length
            ? prev
            : [{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, itemKey: '', itemName: '', quantity: '', batch: '' }]
        )
      }
      return next
    })
  }

  const addPharmacyConsumptionRow = (afterId?: string) => {
    const row = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, itemKey: '', itemName: '', quantity: '', batch: '' }
    setPharmacyConsumptions(prev => {
      if (!afterId) return [...prev, row]
      const idx = prev.findIndex(r => r.id === afterId)
      if (idx < 0) return [...prev, row]
      return [...prev.slice(0, idx + 1), row, ...prev.slice(idx + 1)]
    })
  }

  const removePharmacyConsumptionRow = (id: string) => {
    setPharmacyConsumptions(prev => {
      const next = prev.filter(r => r.id !== id)
      if (next.length === 0) setShowPharmacyConsumption(false)
      return next
    })
  }

  const updatePharmacyConsumptionRow = (
    id: string,
    patch: Partial<{ itemKey: string; itemName: string; quantity: string; batch: string }>
  ) => {
    setPharmacyConsumptions(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
  }

  useEffect(() => {
    if (!showProcedureModal) return
    if (!showPharmacyConsumption) return
    let mounted = true
    ;(async () => {
      try {
        setPharmacyInventoryLoading(true)
        // Inventory endpoint is paginated; fetch enough pages for dropdown usage
        const pageSize = 200
        const maxPages = 10
        let page = 1
        let totalPages = 1
        const all: PharmacyInventoryItem[] = []
        while (page <= totalPages && page <= maxPages) {
          const res: any = await pharmacyApi.listInventory({ page, limit: pageSize })
          const items: PharmacyInventoryItem[] = (res?.items || res || []) as any
          const tp = Number(res?.totalPages || 1)
          if (!Number.isNaN(tp) && tp > 0) totalPages = tp
          all.push(...items)
          page += 1
        }
        if (!mounted) return
        setPharmacyInventory(all)
      } catch {
        if (!mounted) return
        setPharmacyInventory([])
      } finally {
        if (!mounted) return
        setPharmacyInventoryLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [showProcedureModal, showPharmacyConsumption])

  const pharmacyInventoryOptions = useMemo(() => {
    const list = (pharmacyInventory || []).filter(it => Number(it.onHand || 0) > 0)
    return list
      .map(it => {
        const key = String(it._id || it.key || it.name || '')
        return {
          key,
          name: String(it.name || ''),
          lastInvoice: String(it.lastInvoice || ''),
          lastExpiry: String(it.lastExpiry || it.earliestExpiry || ''),
        }
      })
      .filter(x => x.key && x.name)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [pharmacyInventory])

  const openAddProcedure = () => {
    setProcedureEditId(null)
    setProcedureName('')
    setProcedurePrice('')
    setProcedureDepartment('')
    setProcedureStatus('active')

    setTemplateMode('table')

    setFieldTemplateRows([{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, label: '', parts: 1 }])

    setShowExpense(false)
    setExpenseDescription('')
    setExpenseAmount('')
    setExpenseCategory('')

    setShowPharmacyConsumption(false)
    setPharmacyConsumptions([])

    setProcedureTemplateHtml(DEFAULT_PROCEDURE_TEMPLATE)
    setShowProcedurePictures(false)
    setProcedurePictures([])
    setShowProcedureModal(true)
  }

  const openEditProcedure = (id: string) => {
    ;(async () => {
      try {
        const base = procedures.find(x => x.id === id)
        if (!base) return
        const full: any = await (diagnosticApi as any).getTest?.(id)
        const p = full || base
        setProcedureEditId(id)
        setProcedureName(String(p.name || ''))
        setProcedurePrice(String(p.price || 0))
        setProcedureDepartment(String(p.category || p.department || ''))
        setProcedureStatus((p.status || 'active') as any)

        const parsedField = parseFieldTemplateFromHtml(String(p.templateHtml || ''))
        if (parsedField) {
          setTemplateMode('field')
          setFieldTemplateRows((parsedField.fields || []).map((x: any) => ({ id: String(x.id || ''), label: String(x.label || ''), parts: Math.max(1, Math.min(6, Number((x as any).parts || 1))) })))
        } else {
          setTemplateMode('table')
          setFieldTemplateRows([{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, label: '', parts: 1 }])
        }

        setShowExpense(!!p.expense)
        setExpenseDescription(p.expense?.description || '')
        setExpenseAmount(p.expense?.amount != null ? String(p.expense.amount) : '')
        setExpenseCategory(p.expense?.category || '')

        const pcAny: any = (p as any).pharmacyConsumption
        const pcList: ProcedurePharmacyConsumption[] = Array.isArray(pcAny) ? pcAny : pcAny ? [pcAny] : []
        setShowPharmacyConsumption(pcList.length > 0)
        setPharmacyConsumptions(
          pcList.map((it: any) => ({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            itemKey: String(it.itemKey || ''),
            itemName: String(it.itemName || ''),
            quantity: it.quantity != null ? String(it.quantity) : '',
            batch: String(it.batch || ''),
          }))
        )

        setProcedureTemplateHtml(p.templateHtml || DEFAULT_PROCEDURE_TEMPLATE)
        setShowProcedurePictures(!!(p.picturesEnabled || (p.pictures && p.pictures.length)))
        setProcedurePictures(
          Array.isArray(p.pictures)
            ? p.pictures.map((x: any) => ({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, dataUrl: String(x.dataUrl || ''), name: String(x.name || '') }))
            : []
        )
        setShowProcedureModal(true)
      } catch {
        // Fallback to existing behavior if full fetch fails
        const p = procedures.find(x => x.id === id)
        if (!p) return
        setProcedureEditId(id)
        setProcedureName(p.name || '')
        setProcedurePrice(String(p.price || 0))
        setProcedureDepartment(p.category || '')
        setProcedureStatus((p.status || 'active') as any)
        setTemplateMode('table')
        setFieldTemplateRows([{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, label: '', parts: 1 }])
        setShowExpense(false)
        setShowPharmacyConsumption(false)
        setProcedureTemplateHtml(DEFAULT_PROCEDURE_TEMPLATE)
        setShowProcedurePictures(false)
        setProcedurePictures([])
        setShowProcedureModal(true)
      }
    })()
  }

  const openPictureUploader = () => {
    setShowProcedurePictures(true)
  }

  const appendPictureFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const list = Array.from(files)
    const readOne = (file: File) =>
      new Promise<ProcedurePicture>(resolve => {
        const reader = new FileReader()
        reader.onload = () =>
          resolve({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            dataUrl: String(reader.result || ''),
            name: file.name,
          })
        reader.readAsDataURL(file)
      })
    const items = await Promise.all(list.map(readOne))
    setProcedurePictures(prev => [...prev, ...items])
  }

  const removePicture = (id: string) => {
    setProcedurePictures(prev => {
      const next = prev.filter(p => p.id !== id)
      if (next.length === 0) setShowProcedurePictures(false)
      return next
    })
  }

  const saveProcedure = async () => {
    if (!procedureName || !procedurePrice || !procedureDepartment) return
    const priceNum = Number(procedurePrice) || 0
    const templateHtml = templateMode === 'field'

      ? buildFieldTemplateHtml(fieldTemplateRows)

      : (procedureTemplateRef.current?.innerHTML || procedureTemplateHtml || '')

    const expense: ProcedureExpense | undefined = showExpense
      ? {
          description: expenseDescription,
          amount: Number(expenseAmount || 0),
          category: expenseCategory,
        }
      : undefined

    const pharmacyConsumption: ProcedurePharmacyConsumption[] | undefined = showPharmacyConsumption
      ? (pharmacyConsumptions || []).map(r => ({
          itemKey: r.itemKey || undefined,
          itemName: r.itemName,
          quantity: Number(r.quantity || 0),
          batch: r.batch || undefined,
        }))
      : undefined

    try {
      const payload: any = {
        name: procedureName,
        price: priceNum,
        category: procedureDepartment,
        status: procedureStatus,
        templateHtml,
        picturesEnabled: !!(showProcedurePictures || (procedurePictures || []).length > 0),
        pictures: (procedurePictures || []).map(p => ({ dataUrl: p.dataUrl, name: p.name || '' })),
        expense: expense || null,
        pharmacyConsumption: pharmacyConsumption || [],
      }
      if (procedureEditId) {
        await diagnosticApi.updateTest(procedureEditId, payload)
      } else {
        await diagnosticApi.createTest(payload)
      }
      setProcedureEditId(null)
      setShowProcedureModal(false)
      await loadProcedures()
    } catch {}
  }

  const focusProcedureTemplate = () => {
    try {
      procedureTemplateRef.current?.focus()
    } catch {}
  }

  const exec = (cmd: 'bold' | 'underline') => {
    focusProcedureTemplate()
    try {
      document.execCommand(cmd)
    } catch {}
  }

  const buildTableHtml = (rows: number, cols: number) => {
    const r = Math.max(1, Math.min(20, Math.floor(rows || 0)))
    const c = Math.max(1, Math.min(20, Math.floor(cols || 0)))
    const td = 'border:1px solid #94a3b8; padding:12px; vertical-align:top; word-break:break-word; overflow-wrap:anywhere;'
    const tr = Array.from({ length: c })
      .map(() => `<td style="${td}"><br/></td>`)
      .join('')
    const body = Array.from({ length: r })
      .map(() => `<tr>${tr}</tr>`)
      .join('\n')
    return `<table style="width:100%; border-collapse:collapse; table-layout:fixed;">${body}</table><p><br/></p>`
  }

  const insertTableSize = (rows: number, cols: number) => {
    focusProcedureTemplate()
    const html = buildTableHtml(rows, cols)
    try {
      document.execCommand('insertHTML', false, html)
    } catch {
      try {
        const el = procedureTemplateRef.current
        if (el) el.innerHTML = (el.innerHTML || '') + html
      } catch {}
    }
    try {
      const el = procedureTemplateRef.current
      if (el) setProcedureTemplateHtml(el.innerHTML || '')
    } catch {}
  }

  const syncTemplateHtmlFromDom = () => {
    try {
      const el = procedureTemplateRef.current
      if (el) setProcedureTemplateHtml(el.innerHTML || '')
    } catch {}
  }

  const captureSelectionRange = () => {
    try {
      const root = procedureTemplateRef.current
      if (!root) return
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
      const range = sel.getRangeAt(0)
      const startNode = range.startContainer
      const endNode = range.endContainer
      if (!root.contains(startNode) || !root.contains(endNode)) return
      lastSelectionRangeRef.current = range.cloneRange()
    } catch {}
  }

  const applyFontSizeToSelection = (px: string) => {
    const size = Number(px)
    if (!Number.isFinite(size) || size <= 0) return

    const root = procedureTemplateRef.current
    const saved = lastSelectionRangeRef.current
    if (!root || !saved) return

    try {
      const sel = window.getSelection()
      if (!sel) return
      sel.removeAllRanges()
      sel.addRange(saved)

      const range = sel.getRangeAt(0)
      if (range.collapsed) return

      const span = document.createElement('span')
      span.style.fontSize = `${size}px`

      const frag = range.extractContents()
      span.appendChild(frag)
      range.insertNode(span)

      sel.removeAllRanges()
      const after = document.createRange()
      after.setStartAfter(span)
      after.collapse(true)
      sel.addRange(after)

      lastSelectionRangeRef.current = null
      syncTemplateHtmlFromDom()
    } catch {}
  }

  const openTablePicker = () => {
    setTablePickerOpen(v => {
      const nv = !v
      if (nv) {
        setTablePickerRows(0)
        setTablePickerCols(0)
      }
      return nv
    })
  }

  const updateTableToolsFromEventTarget = (target: EventTarget | null) => {
    const t0 = target as any
    const t: HTMLElement | null = t0?.closest
      ? (t0 as HTMLElement)
      : (t0?.parentElement as HTMLElement | null)

    const anyCell = t?.closest?.('td,th') as HTMLTableCellElement | null

    const splitTable = t?.closest?.('table[data-split]') as HTMLTableElement | null
    const splitEditable = splitTable ? (t?.closest?.('div[contenteditable="true"]') as HTMLElement | null) : null
    const outerCell = splitTable ? ((splitTable.parentElement?.closest?.('td,th') as HTMLTableCellElement | null) || null) : anyCell
    const highlightEl: HTMLElement | null = splitEditable || outerCell

    if (!outerCell || !highlightEl) {
      selectedTableCellRef.current = null
      try {
        if (lastHighlightedCellRef.current) {
          lastHighlightedCellRef.current.style.outline = ''
          lastHighlightedCellRef.current.style.outlineOffset = ''
        }
      } catch {}
      lastHighlightedCellRef.current = null
      setTableToolsOpen(false)
      return
    }

    selectedTableCellRef.current = outerCell
    try {
      if (lastHighlightedCellRef.current && lastHighlightedCellRef.current !== highlightEl) {
        lastHighlightedCellRef.current.style.outline = ''
        lastHighlightedCellRef.current.style.outlineOffset = ''
      }
      highlightEl.style.outline = '2px solid #2563eb'
      highlightEl.style.outlineOffset = '-2px'
      lastHighlightedCellRef.current = highlightEl
    } catch {}

    try {
      const rect = outerCell.getBoundingClientRect()
      setTableToolsPos({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX })
    } catch {}
    setTableToolsOpen(true)
  }

  const withSelectedCell = (fn: (cell: HTMLTableCellElement, table: HTMLTableElement, rowIndex: number, colIndex: number) => void) => {
    const cell = selectedTableCellRef.current
    if (!cell) return
    const table = cell.closest('table') as HTMLTableElement | null
    const row = cell.parentElement as HTMLTableRowElement | null
    if (!table || !row) return
    const rowIndex = Array.from(table.rows).indexOf(row)
    const colIndex = Array.from(row.cells).indexOf(cell)
    if (rowIndex < 0 || colIndex < 0) return
    fn(cell, table, rowIndex, colIndex)
    syncTemplateHtmlFromDom()
  }

  const tableAddRowBelow = () => {
    withSelectedCell((_cell, table, rowIndex) => {
      const srcRow = table.rows[rowIndex]
      const newRow = srcRow.cloneNode(true) as HTMLTableRowElement
      Array.from(newRow.cells).forEach(c => {
        c.innerHTML = '<br/>'
      })
      const ref = table.rows[rowIndex + 1] || null
      if (ref) table.tBodies[0]?.insertBefore(newRow, ref)
      else table.tBodies[0]?.appendChild(newRow)
    })
  }

  const tableAddColRight = () => {
    withSelectedCell((_cell, table, _rowIndex, colIndex) => {
      Array.from(table.rows).forEach(r => {
        const newCell = r.insertCell(colIndex + 1)
        newCell.innerHTML = '<br/>'
        newCell.setAttribute('style', 'border:1px solid #94a3b8; padding:12px; vertical-align:top; word-break:break-word; overflow-wrap:anywhere;')
      })
    })
  }

  const tableDeleteRow = () => {
    withSelectedCell((_cell, table, rowIndex) => {
      if (table.rows.length <= 1) {
        table.remove()
        setTableToolsOpen(false)
        return
      }
      table.deleteRow(rowIndex)
    })
  }

  const tableDeleteCol = () => {
    withSelectedCell((_cell, table, _rowIndex, colIndex) => {
      const cols = table.rows[0]?.cells.length || 0
      if (cols <= 1) {
        table.remove()
        setTableToolsOpen(false)
        return
      }
      Array.from(table.rows).forEach(r => {
        if (r.cells[colIndex]) r.deleteCell(colIndex)
      })
    })
  }

  const tableDeleteTable = () => {
    withSelectedCell((_cell, table) => {
      table.remove()
      setTableToolsOpen(false)
    })
  }

  const tableToggleHeaderTop = () => {
    withSelectedCell((_cell, table) => {
      const firstRow = table.rows[0] || null
      if (!firstRow) return

      const cells = Array.from(firstRow.cells || [])
      const isHeader = cells.length > 0 && cells.every(c => c.tagName === 'TH')

      if (isHeader) {
        table.deleteRow(0)
        return
      }

      const cols = firstRow.cells.length || 0
      if (!cols) return

      const headerRow = document.createElement('tr')
      for (let i = 0; i < cols; i++) {
        const th = document.createElement('th')
        th.innerHTML = '<br/>'
        th.setAttribute(
          'style',
          'border:1px solid #94a3b8; padding:12px; vertical-align:top; word-break:break-word; overflow-wrap:anywhere; background:#f1f5f9; font-weight:600;'
        )
        headerRow.appendChild(th)
      }

      const body = table.tBodies[0] || table
      body.insertBefore(headerRow, firstRow)
    })
  }

  const splitSelectedCellVertical = () => {
    withSelectedCell(cell => {
      try {
        const existing = (cell.innerHTML || '').trim() || '<br/>'
        const already = cell.querySelector?.('[data-split="v"]') as HTMLElement | null
        if (already) return

        cell.style.backgroundImage =
          'linear-gradient(to right, transparent calc(50% - 0.5px), #94a3b8 calc(50% - 0.5px), #94a3b8 calc(50% + 0.5px), transparent calc(50% + 0.5px))'
        cell.style.backgroundRepeat = 'no-repeat'
        cell.style.backgroundSize = '100% 100%'
        cell.style.backgroundPosition = 'center'
        cell.style.padding = '0'

        cell.innerHTML = `
<table data-split="v" contenteditable="false" style="width:100%; height:100%; border-collapse:collapse; table-layout:fixed; border:none;">
  <tr style="height:100%;">
    <td style="width:50%; height:100%; padding:8px; vertical-align:top; border:none;">
      <div contenteditable="true" style="min-height:16px; outline:none; word-break:break-word; overflow-wrap:anywhere;">${existing}</div>
    </td>
    <td style="width:50%; height:100%; padding:8px; vertical-align:top; border:none;">
      <div contenteditable="true" style="min-height:16px; outline:none; word-break:break-word; overflow-wrap:anywhere;"><br/></div>
    </td>
  </tr>
</table>`
      } catch {}
    })
  }

  const splitSelectedCellHorizontal = () => {
    withSelectedCell(cell => {
      try {
        const existing = (cell.innerHTML || '').trim() || '<br/>'
        const already = cell.querySelector?.('[data-split="h"]') as HTMLElement | null
        if (already) return

        cell.style.backgroundImage = ''
        cell.style.backgroundRepeat = ''
        cell.style.backgroundSize = ''
        cell.style.backgroundPosition = ''
        cell.style.padding = '0'

        cell.innerHTML = `
<table data-split="h" contenteditable="false" style="width:100%; height:100%; border-collapse:collapse; table-layout:fixed; border:none;">
  <tr>
    <td style="padding:8px; vertical-align:top; border:none; border-bottom:1px solid #94a3b8;">
      <div contenteditable="true" style="min-height:16px; outline:none; word-break:break-word; overflow-wrap:anywhere;">${existing}</div>
    </td>
  </tr>
  <tr>
    <td style="padding:8px; vertical-align:top; border:none;">
      <div contenteditable="true" style="min-height:16px; outline:none; word-break:break-word; overflow-wrap:anywhere;"><br/></div>
    </td>
  </tr>
</table>`
      } catch {}
    })
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Test Catalog</h2>
        <button onClick={openAddProcedure} className="flex items-center gap-2 rounded-md border border-navy bg-white px-3 py-2 text-sm font-medium text-navy hover:bg-navy/10">
          <Plus className="h-4 w-4" />
          Add Test
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[240px] flex-1">
            <input
              value={proceduresQ}
              onChange={e => setProceduresQ(e.target.value)}
              placeholder="Search test name or category..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-slate-600">Status</div>
            <select
              value={proceduresStatusFilter}
              onChange={e => setProceduresStatusFilter(e.target.value as any)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setProceduresQ('')
              setProceduresStatusFilter('all')
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
        {proceduresError && <div className="mt-2 text-sm text-rose-700">{proceduresError}</div>}
        {proceduresLoading && <div className="mt-2 text-sm text-slate-500">Loading...</div>}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {procedures.map(procedure => (
            <div key={procedure.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-slate-900">{procedure.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">{procedure.category}</span>
                    <span className={`rounded-full px-2 py-0.5 ${procedure.status === 'inactive' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {procedure.status || 'active'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500">Price</div>
                  <div className="text-lg font-semibold text-slate-900">PKR {Number(procedure.price || 0).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditProcedure(procedure.id)} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Edit</button>
                  <button onClick={() => setProcedureDeleteId(procedure.id)} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">Delete</button>
                </div>
              </div>
            </div>
          ))}

          {procedures.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-500">
              <div className="text-sm">No tests added yet</div>
              <button onClick={openAddProcedure} className="mt-2 text-sm text-navy hover:text-navy/80 underline">
                Add your first test
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!procedureDeleteId}
        title="Delete Test"
        message="Are you sure you want to delete this test?"
        confirmText="Delete"
        onCancel={() => setProcedureDeleteId(null)}
        onConfirm={async () => {
          if (!procedureDeleteId) return
          const id = procedureDeleteId
          setProcedureDeleteId(null)
          try {
            await diagnosticApi.deleteTest(id)
          } catch {}
          await loadProcedures({ q: proceduresQ, status: proceduresStatusFilter })
        }}
      />

      {showProcedureModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-2 sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-start justify-between">
              <div className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-slate-800">{procedureEditId ? 'Edit Test' : 'Add Test'}</h3>
                <p className="text-sm text-slate-600">Enter test details.</p>
              </div>
              <button onClick={() => setShowProcedureModal(false)} className="p-4 sm:p-6 text-slate-500 hover:text-slate-700 text-xl">✖</button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                  <input value={procedureName} onChange={e => setProcedureName(e.target.value)} placeholder="Test Name" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Price</label>
                  <input type="number" value={procedurePrice} onChange={e => setProcedurePrice(e.target.value)} placeholder="Price" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                  <input type="text" value={procedureDepartment} onChange={e => setProcedureDepartment(e.target.value)} placeholder="Enter category" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                  <select value={procedureStatus} onChange={e => setProcedureStatus(e.target.value as any)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateMode('table')}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${templateMode === 'table' ? 'border-violet-700 bg-violet-50 text-violet-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  Table Template
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateMode('field')}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${templateMode === 'field' ? 'border-violet-700 bg-violet-50 text-violet-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  Field Template
                </button>
              </div>

              {templateMode === 'field' && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Field Template</div>
                      <div className="text-xs text-slate-500">Add fields below (these will appear on the report template).</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFieldTemplateRows(prev => [...prev, { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, label: '', parts: 1 }])}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      title="Add field"
                      aria-label="Add field"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {fieldTemplateRows.map((row, idx) => (
                      <div key={row.id} className="flex items-center gap-2">
                        <div className="w-10 text-xs text-slate-500">#{idx + 1}</div>
                        <input
                          value={row.label}
                          onChange={e => setFieldTemplateRows(prev => prev.map(x => x.id === row.id ? { ...x, label: e.target.value } : x))}
                          placeholder="Field name (e.g., Hemoglobin)"
                          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFieldTemplateRows(prev => prev.map(x => {
                              if (x.id !== row.id) return x
                              const cur = Number(x.parts || 1)
                              return { ...x, parts: cur === 2 ? 1 : 2 }
                            }))
                          }}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-md border ${Number(row.parts || 1) === 2 ? 'border-violet-700 bg-violet-50 text-violet-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                          title={Number(row.parts || 1) === 2 ? 'Unsplit (back to single field)' : 'Split into 2 parts (25/75)'}
                          aria-label="Toggle split"
                        >
                          <Columns2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newRow = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, label: '', parts: 1 }
                            setFieldTemplateRows(prev => {
                              const i = prev.findIndex(x => x.id === row.id)
                              if (i < 0) return [...prev, newRow]
                              return [...prev.slice(0, i + 1), newRow, ...prev.slice(i + 1)]
                            })
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          title="Add below"
                          aria-label="Add below"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFieldTemplateRows(prev => {
                              const next = prev.filter(x => x.id !== row.id)
                              return next.length ? next : [{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, label: '', parts: 1 }]
                            })
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
                          title="Delete field"
                          aria-label="Delete field"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {templateMode === 'table' && (
            <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-2">
                <button type="button" onClick={() => exec('bold')} className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-slate-200" aria-label="Bold">
                  <span className="font-bold">B</span>
                </button>
                <button type="button" onClick={() => exec('underline')} className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-slate-200" aria-label="Underline">
                  <span className="underline">U</span>
                </button>
                <div ref={tablePickerWrapRef} className="relative">
                  <button type="button" onClick={openTablePicker} className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-slate-200" aria-label="Insert table">
                    <span className="text-sm">▦</span>
                  </button>
                  {tablePickerOpen && (
                    <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                      <div className="mb-2 text-center text-sm font-semibold text-slate-800">{Math.max(1, tablePickerRows)} × {Math.max(1, tablePickerCols)}</div>
                      <div className="grid grid-cols-10 gap-1">
                        {Array.from({ length: 100 }).map((_, idx) => {
                          const r = Math.floor(idx / 10) + 1
                          const c = (idx % 10) + 1
                          const active = r <= Math.max(1, tablePickerRows) && c <= Math.max(1, tablePickerCols)
                          return (
                            <button
                              key={idx}
                              type="button"
                              onMouseEnter={() => {
                                setTablePickerRows(r)
                                setTablePickerCols(c)
                              }}
                              onClick={() => {
                                insertTableSize(r, c)
                                setTablePickerOpen(false)
                              }}
                              className={`h-5 w-5 rounded-sm border ${active ? 'border-sky-600 bg-sky-200' : 'border-slate-300 bg-white'} hover:border-sky-600`}
                              aria-label={`Insert ${r} by ${c} table`}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="ml-2 flex items-center gap-2">
                  <span className="text-xs text-slate-600">A:</span>
                  <select
                    value={fontSizePx}
                    onChange={e => {
                      const v = e.target.value
                      setFontSizePx(v)
                      applyFontSizeToSelection(v)
                    }}
                    className="h-8 rounded border border-slate-300 bg-white px-2 text-sm"
                  >
                    <option value="12">12</option>
                    <option value="14">14</option>
                    <option value="16">16</option>
                    <option value="18">18</option>
                    <option value="20">20</option>
                    <option value="24">24</option>
                  </select>
                </div>
              </div>
              <div className="p-3 overflow-x-auto">
                <div
                  ref={procedureTemplateRef}
                  contentEditable
                  suppressContentEditableWarning
                  onClick={e => updateTableToolsFromEventTarget(e.target)}
                  onKeyUp={e => {
                    updateTableToolsFromEventTarget(e.target)
                    captureSelectionRange()
                  }}
                  onMouseUp={() => captureSelectionRange()}
                  onInput={e => {
                    const html = (e.currentTarget as HTMLDivElement).innerHTML
                    setProcedureTemplateHtml(html)
                  }}
                  className="min-h-[220px] w-full bg-white text-sm outline-none"
                />
              </div>
            </div>

            )}

            {(templateMode === 'table' || templateMode === 'field') && (

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button type="button" onClick={openPictureUploader} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Add Picture
                </button>
                {(showProcedurePictures || procedurePictures.length > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProcedurePictures(false)
                      setProcedurePictures([])
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-rose-700 hover:bg-rose-50"
                    title="Remove pictures"
                    aria-label="Remove pictures"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="text-xs text-slate-500">Optional (add one or more images)</div>
            </div>

            )}

            {showProcedurePictures && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => {
                    appendPictureFiles(e.target.files)
                    e.currentTarget.value = ''
                  }}
                  className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                />

                {procedurePictures.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {procedurePictures.map(img => (
                      <div key={img.id} className="relative">
                        <img src={img.dataUrl} alt={img.name || 'procedure'} className="h-16 w-16 rounded border border-slate-200 object-cover" />
                        <button
                          type="button"
                          onClick={() => removePicture(img.id)}
                          className="absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-700 shadow-sm hover:bg-rose-50"
                          title="Remove"
                          aria-label="Remove picture"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {templateMode === 'table' && tableToolsOpen && (
              <div ref={tableToolsRef} className="fixed z-[60] w-[340px] rounded-lg border border-slate-200 bg-white p-2 shadow-lg" style={{ top: tableToolsPos.top, left: tableToolsPos.left }}>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={tableAddRowBelow} className="inline-flex h-9 w-9 items-center justify-center rounded hover:bg-slate-100" title="Add row">
                    <span className="text-sm">▦+</span>
                  </button>
                  <button type="button" onClick={tableAddColRight} className="inline-flex h-9 w-9 items-center justify-center rounded hover:bg-slate-100" title="Add column">
                    <span className="text-sm">▥+</span>
                  </button>
                  <button type="button" onClick={tableToggleHeaderTop} className="inline-flex h-9 w-9 items-center justify-center rounded hover:bg-slate-100" title="Toggle header row">
                    <span className="text-sm">H+</span>
                  </button>
                  <button type="button" onClick={splitSelectedCellVertical} className="inline-flex h-9 w-9 items-center justify-center rounded hover:bg-slate-100" title="Split cell vertically">
                    <span className="text-sm">↔</span>
                  </button>
                  <button type="button" onClick={splitSelectedCellHorizontal} className="inline-flex h-9 w-9 items-center justify-center rounded hover:bg-slate-100" title="Split cell horizontally">
                    <span className="text-sm">↕</span>
                  </button>
                  <button type="button" onClick={tableDeleteRow} className="inline-flex h-9 w-9 items-center justify-center rounded hover:bg-slate-100" title="Delete row">
                    <span className="text-sm">─✖</span>
                  </button>
                  <button type="button" onClick={tableDeleteCol} className="inline-flex h-9 w-9 items-center justify-center rounded hover:bg-slate-100" title="Delete column">
                    <span className="text-sm">│✖</span>
                  </button>
                  <button type="button" onClick={tableDeleteTable} className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded hover:bg-rose-50" title="Delete table">
                    <span className="text-sm text-rose-600">🗑</span>
                  </button>
                </div>
              </div>
            )}

            {templateMode === 'table' && (

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleExpense}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${showExpense ? 'border-violet-700 bg-violet-50 text-violet-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                Add Expense
              </button>
              <button
                type="button"
                onClick={togglePharmacyConsumption}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${showPharmacyConsumption ? 'border-violet-700 bg-violet-50 text-violet-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                Add Pharmacy Consumption
              </button>
            </div>

            )}

            {templateMode === 'table' && showExpense && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                    <input
                      value={expenseDescription}
                      onChange={e => setExpenseDescription(e.target.value)}
                      placeholder="Expense description"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
                    <input
                      type="number"
                      value={expenseAmount}
                      onChange={e => setExpenseAmount(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                    <input
                      value={expenseCategory}
                      onChange={e => setExpenseCategory(e.target.value)}
                      placeholder="Category"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {templateMode === 'table' && showPharmacyConsumption && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="space-y-3">
                  {pharmacyConsumptions.map(row => (
                    <div key={row.id} className="flex items-end gap-2">
                      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">Item</label>
                          <SuggestField
                            as="input"
                            value={row.itemName}
                            onChange={name => {
                              const found = pharmacyInventoryOptions.find(x => x.name.toLowerCase() === name.toLowerCase())
                              updatePharmacyConsumptionRow(row.id, {
                                itemName: name,
                                itemKey: found?.key || '',
                                batch: found && !row.batch ? found.lastInvoice || '' : row.batch,
                              })
                            }}
                            suggestions={pharmacyInventoryOptions.map(x => x.name)}
                            placeholder={pharmacyInventoryLoading ? 'Loading medicines...' : 'Type to search medicine'}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">Quantity</label>
                          <input
                            type="number"
                            value={row.quantity}
                            onChange={e => updatePharmacyConsumptionRow(row.id, { quantity: e.target.value })}
                            placeholder="0"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">Invoice</label>
                          <input
                            value={row.batch}
                            onChange={e => updatePharmacyConsumptionRow(row.id, { batch: e.target.value })}
                            placeholder="Invoice"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1 pb-1">
                        <button
                          type="button"
                          onClick={() => addPharmacyConsumptionRow(row.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          title="Add item"
                          aria-label="Add item"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removePharmacyConsumptionRow(row.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-rose-700 hover:bg-rose-50"
                          title="Remove item"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowProcedureModal(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={saveProcedure}
                className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 transition-colors"
              >
                {procedureEditId ? 'Save Test' : 'Add Test'}
              </button>
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  )
}
