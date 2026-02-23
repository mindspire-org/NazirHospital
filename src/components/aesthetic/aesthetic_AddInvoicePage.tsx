import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { aestheticApi } from '../../utils/api'
import { ArrowLeft, Plus, Edit2, Trash2, Save, ChevronDown, ChevronUp, Package } from 'lucide-react'
import Pharmacy_AddSupplierDialog, { type Supplier } from '../../components/aesthetic/aesthetic_AddSupplierDialog'

type ItemRow = {
  id: string
  name?: string
  genericName?: string
  expiry?: string
  packs?: number
  unitsPerPack?: number
  buyPerPack?: number
  salePerPack?: number
  totalItems?: number
  buyPerUnit?: number
  salePerUnit?: number
  lineTaxType?: 'percent' | 'fixed'
  lineTaxValue?: number
  category?: string
  barcode?: string
  minStock?: number
  collapsed?: boolean
  inventoryKey?: string
}

type InvoiceTax = {
  id: string
  name?: string
  value?: number
  type?: 'percent' | 'fixed'
  applyOn?: 'gross' | 'net'
}

export default function Pharmacy_AddInvoicePage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<ItemRow[]>([{ id: crypto.randomUUID() }])
  const [invoiceTaxes, setInvoiceTaxes] = useState<InvoiceTax[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [addSupplierOpen, setAddSupplierOpen] = useState(false)
  const [allMedicines, setAllMedicines] = useState<Array<{ id: number; name: string }>>([])
  const [supplierId, setSupplierId] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [showTaxSection, setShowTaxSection] = useState(false)
  
  // Autocomplete state
  const [suggestions, setSuggestions] = useState<Array<{ id: number; name: string }>>([])
  const [showSuggestions, setShowSuggestions] = useState<string | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const barcodeTimersRef = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({})

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
    setToast({ type, message })
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 3000)
  }

  const autofillFromInventoryByName = async (name: string | undefined, rowId: string) => {
    const q = String(name || '').trim()
    if (!q) return
    try {
      const res: any = await aestheticApi.listInventory({ search: q, limit: 1 })
      const it = (res?.items || [])[0]
      if (!it) return
      const normQ = q.toLowerCase()
      const normIt = String(it.key || it.name || '').trim().toLowerCase()
      if (normIt !== normQ) return
      const units = Number(it.unitsPerPack || 1)
      const directSaleUnit = (it.lastSalePerUnit != null) ? Number(it.lastSalePerUnit) : undefined
      const directSalePack = (it.lastSalePerPack != null) ? Number(it.lastSalePerPack) : undefined
      const saleUnit = (directSaleUnit != null) ? directSaleUnit : (units ? (Number(directSalePack || 0) / units) : 0)
      const salePack = (directSalePack != null) ? directSalePack : ((saleUnit || 0) * units)
      const directBuyUnit = (it.lastBuyPerUnit != null) ? Number(it.lastBuyPerUnit) : undefined
      const directBuyPack = (it.lastBuyPerPack != null) ? Number(it.lastBuyPerPack) : undefined
      const buyUnit = (directBuyUnit != null) ? directBuyUnit : (units ? (Number(directBuyPack || 0) / units) : 0)
      const buyPack = (directBuyPack != null) ? directBuyPack : ((buyUnit || 0) * units)
      const gen = it.lastGenericName || it.genericName || ''
      const key = String(it.key || it._id || it.name || '')
      setItems(prev => prev.map(r => r.id === rowId ? {
        ...r,
        unitsPerPack: units || r.unitsPerPack,
        category: it.category ?? r.category,
        minStock: (it.minStock != null) ? Number(it.minStock) : r.minStock,
        barcode: it.barcode || r.barcode,
        buyPerPack: buyPack || r.buyPerPack,
        buyPerUnit: buyUnit || r.buyPerUnit,
        salePerPack: salePack || r.salePerPack,
        salePerUnit: saleUnit || r.salePerUnit,
        genericName: gen || r.genericName,
        inventoryKey: key || r.inventoryKey,
        expiry: (it.lastExpiry || it.earliestExpiry || r.expiry || ''),
        totalItems: (r.packs || 0) * (units || r.unitsPerPack || 1),
      } : r))
    } catch {}
  }

  const autofillFromInventoryByBarcode = async (code: string | undefined, rowId: string) => {
    const q = String(code || '').trim()
    if (!q) return
    try {
      const res: any = await aestheticApi.listInventory({ search: q, limit: 1 })
      const it = (res?.items || [])[0]
      if (!it) return
      const itemBarcode = String(it.barcode || '').trim()
      const norm = (s: string) => String(s || '').replace(/\D/g, '')
      if (!itemBarcode || norm(itemBarcode) !== norm(q)) return
      const units = Number(it.unitsPerPack || 1)
      const directSaleUnit = (it.lastSalePerUnit != null) ? Number(it.lastSalePerUnit) : undefined
      const directSalePack = (it.lastSalePerPack != null) ? Number(it.lastSalePerPack) : undefined
      const saleUnit = (directSaleUnit != null) ? directSaleUnit : (units ? (Number(directSalePack || 0) / units) : 0)
      const salePack = (directSalePack != null) ? directSalePack : ((saleUnit || 0) * units)
      const directBuyUnit = (it.lastBuyPerUnit != null) ? Number(it.lastBuyPerUnit) : undefined
      const directBuyPack = (it.lastBuyPerPack != null) ? Number(it.lastBuyPerPack) : undefined
      const buyUnit = (directBuyUnit != null) ? directBuyUnit : (units ? (Number(directBuyPack || 0) / units) : 0)
      const buyPack = (directBuyPack != null) ? directBuyPack : ((buyUnit || 0) * units)
      const gen = it.lastGenericName || it.genericName || ''
      const key = String(it.key || it._id || it.name || '')
      setItems(prev => prev.map(r => r.id === rowId ? {
        ...r,
        name: it.name || r.name,
        unitsPerPack: units || r.unitsPerPack,
        category: it.category ?? r.category,
        minStock: (it.minStock != null) ? Number(it.minStock) : r.minStock,
        barcode: itemBarcode,
        buyPerPack: buyPack || r.buyPerPack,
        buyPerUnit: buyUnit || r.buyPerUnit,
        salePerPack: salePack || r.salePerPack,
        salePerUnit: saleUnit || r.salePerUnit,
        genericName: gen || r.genericName,
        inventoryKey: key || r.inventoryKey,
        expiry: (it.lastExpiry || it.earliestExpiry || r.expiry || ''),
        totalItems: (r.packs || 0) * (units || r.unitsPerPack || 1),
      } : r))
    } catch {}
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
        toastTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    let mounted = true
    aestheticApi.listSuppliers().then((res: any) => {
      if (!mounted) return
      const list = res?.items ?? res ?? []
      setSuppliers(list)
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  // Global scanner listener (works when no input is focused). Detects fast key bursts and Enter or inactivity timeout.
  const scanBufRef = useRef<{ buf: string; last: number; timer?: ReturnType<typeof setTimeout> | null }>({ buf: '', last: 0, timer: null })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const tag = (t?.tagName || '').toLowerCase()
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || !!t?.isContentEditable
      if (isTyping) return
      const now = Date.now()
      if (now - scanBufRef.current.last > 120) scanBufRef.current.buf = ''
      scanBufRef.current.last = now
      if (scanBufRef.current.timer) { try { clearTimeout(scanBufRef.current.timer) } catch {} }
      if (e.key === 'Enter') {
        const code = scanBufRef.current.buf.trim()
        scanBufRef.current.buf = ''
        if (!code) return
        // Put scanned barcode into the last row (or create one) and autofill
        const targetId = (items[items.length - 1]?.id) || crypto.randomUUID()
        if (!items.length) setItems([{ id: targetId }])
        setItems(prev => prev.map((it, i) => (i === prev.length - 1 ? { ...it, barcode: code } : it)))
        setTimeout(() => autofillFromInventoryByBarcode(code, targetId), 0)
        return
      }
      if (e.key && e.key.length === 1) {
        scanBufRef.current.buf += e.key
      }
      // Commit after brief inactivity if buffer looks like a barcode (length >= 6)
      scanBufRef.current.timer = setTimeout(() => {
        const code = scanBufRef.current.buf.trim()
        scanBufRef.current.buf = ''
        if (!code || code.length < 6) return
        const targetId = (items[items.length - 1]?.id) || crypto.randomUUID()
        if (!items.length) setItems([{ id: targetId }])
        setItems(prev => prev.map((it, i) => (i === prev.length - 1 ? { ...it, barcode: code } : it)))
        setTimeout(() => autofillFromInventoryByBarcode(code, targetId), 0)
      }, 180)
    }
    window.addEventListener('keydown', handler as any)
    return () => window.removeEventListener('keydown', handler as any)
  }, [items])

  const refreshSuppliers = async () => {
    const res: any = await aestheticApi.listSuppliers()
    const list = res?.items ?? res ?? []
    setSuppliers(list)
    return list as any[]
  }

  const addSupplier = async (s: Supplier) => {
    try {
      const created: any = await aestheticApi.createSupplier({
        name: s.name,
        company: s.company,
        phone: s.phone,
        address: s.address,
        taxId: s.taxId,
        status: s.status,
      })
      const list = await refreshSuppliers()
      const newId = String(created?._id || created?.id || '')
      if (newId) {
        setSupplierId(newId)
        const found = list.find((x: any) => String(x._id) === newId)
        setSupplierName(found?.name || s.name || '')
      } else {
        setSupplierId('')
        setSupplierName(s.name || '')
      }
      showToast('success', 'Supplier added')
    } catch {
      showToast('error', 'Failed to add supplier')
    }
  }

  useEffect(() => {
    let mounted = true
    aestheticApi.getAllMedicines().then((res: any) => {
      if (!mounted) return
      const meds = res?.medicines ?? res ?? []
      if (Array.isArray(meds)) setAllMedicines(meds)
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  const searchMedicines = async (query: string, rowId: string) => {
    if (!query.trim()) {
      setSuggestions([])
      setShowSuggestions(null)
      return
    }

    try {
      const res: any = await aestheticApi.searchMedicines(query, 20)
      if (res?.suggestions && Array.isArray(res.suggestions)) {
        setSuggestions(res.suggestions)
        setShowSuggestions(rowId)
      }
    } catch (error) {
      console.error('Error searching medicines:', error)
    }
  }

  const handleMedicineInput = (value: string, rowId: string) => {
    setItems(prev => prev.map(it => it.id === rowId ? { ...it, name: value } : it))
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchMedicines(value, rowId)
    }, 300)
  }

  const selectSuggestion = (suggestion: { id: number; name: string }, rowId: string) => {
    setItems(prev => prev.map(it => it.id === rowId ? { ...it, name: suggestion.name } : it))
    setShowSuggestions(null)
    setSuggestions([])
    ;(async () => {
      try {
        const res: any = await aestheticApi.listInventory({ search: suggestion.name, limit: 1 })
        const it = (res?.items || [])[0]
        if (!it) return
        const units = Number(it.unitsPerPack || 1)
        const directSaleUnit = (it.lastSalePerUnit != null) ? Number(it.lastSalePerUnit) : undefined
        const directSalePack = (it.lastSalePerPack != null) ? Number(it.lastSalePerPack) : undefined
        const saleUnit = (directSaleUnit != null) ? directSaleUnit : (units ? (Number(directSalePack || 0) / units) : 0)
        const salePack = (directSalePack != null) ? directSalePack : ((saleUnit || 0) * units)
        const directBuyUnit = (it.lastBuyPerUnit != null) ? Number(it.lastBuyPerUnit) : undefined
        const directBuyPack = (it.lastBuyPerPack != null) ? Number(it.lastBuyPerPack) : undefined
        const buyUnit = (directBuyUnit != null) ? directBuyUnit : (units ? (Number(directBuyPack || 0) / units) : 0)
        const buyPack = (directBuyPack != null) ? directBuyPack : ((buyUnit || 0) * units)
        const gen = it.lastGenericName || it.genericName || ''
        const key = String(it.key || it._id || it.name || '')
        setItems(prev => prev.map(r => r.id === rowId ? {
          ...r,
          unitsPerPack: units || r.unitsPerPack,
          category: it.category ?? r.category,
          minStock: (it.minStock != null) ? Number(it.minStock) : r.minStock,
          barcode: it.barcode || r.barcode,
          buyPerPack: buyPack || r.buyPerPack,
          buyPerUnit: buyUnit || r.buyPerUnit,
          salePerPack: salePack || r.salePerPack,
          salePerUnit: saleUnit || r.salePerUnit,
          genericName: gen || r.genericName,
          inventoryKey: key || r.inventoryKey,
          expiry: (it.lastExpiry || it.earliestExpiry || r.expiry || ''),
          totalItems: (r.packs || 0) * (units || r.unitsPerPack || 1),
        } : r))
      } catch {}
    })()
  }

  const collapseItem = (id: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, collapsed: true } : it))
  }

  const expandItem = (id: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, collapsed: false } : it))
  }

  // derived totals
  const gross = items.reduce((sum, r) => sum + (r.buyPerPack || 0) * (r.packs || 0), 0)
  const lineTaxesTotal = items.reduce((sum, r) => {
    const base = (r.buyPerPack || 0) * (r.packs || 0)
    const t = r.lineTaxType || 'percent'
    const v = r.lineTaxValue || 0
    const tax = t === 'percent' ? base * (v / 100) : v
    return sum + tax
  }, 0)
  const discount = 0
  const taxableBase = Math.max(0, gross - discount)
  const invoiceTaxesTotal = invoiceTaxes.reduce((sum, t) => {
    const type = t.type || 'percent'
    const v = t.value || 0
    const applyOn = t.applyOn || 'gross'
    const base = applyOn === 'gross' ? taxableBase : (taxableBase + lineTaxesTotal)
    const amt = type === 'percent' ? base * (v / 100) : v
    return sum + amt
  }, 0)
  const netTotal = taxableBase + lineTaxesTotal + invoiceTaxesTotal
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {toast && (
        <div className="fixed right-4 top-4 z-[60] w-[min(92vw,420px)]">
          <div
            className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg ring-1 ring-black/5 dark:ring-white/10 ${toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-900/30 dark:text-emerald-100'
              : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-900/30 dark:text-rose-100'
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' ? (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L9.25 10.69 7.28 8.72a.75.75 0 0 0-1.06 1.06l2.5 2.5c.3.3.77.3 1.06 0l4-4Z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-4a.75.75 0 0 0-.75.75v4.5c0 .414.336.75.75.75h.01a.75.75 0 0 0 .74-.75v-4.5A.75.75 0 0 0 10 6Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{toast.type === 'success' ? 'Success' : 'Error'}</div>
              <div className="mt-0.5 text-sm opacity-90">{toast.message}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (toastTimerRef.current) {
                  window.clearTimeout(toastTimerRef.current)
                  toastTimerRef.current = null
                }
                setToast(null)
              }}
              className="ml-1 rounded-md p-1 opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/aesthetic/inventory')}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Inventory
              </button>
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-indigo-600" />
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Add Purchase Invoice</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/aesthetic/inventory')}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const lines = items
                    .filter(r => (r.name || '').trim() && (r.packs || 0) > 0)
                    .map(r => ({
                      name: (r.name || '').trim(),
                      genericName: r.genericName || undefined,
                      unitsPerPack: r.unitsPerPack || 1,
                      packs: r.packs || 0,
                      totalItems: (r.totalItems != null) ? r.totalItems : ((r.unitsPerPack || 1) * (r.packs || 0)),
                      buyPerPack: r.buyPerPack || 0,
                      buyPerUnit: (r.buyPerUnit != null) ? r.buyPerUnit : ((r.buyPerPack || 0) / Math.max(1, (r.unitsPerPack || 1))),
                      salePerPack: r.salePerPack || 0,
                      salePerUnit: (r.salePerUnit != null) ? r.salePerUnit : ((r.salePerPack || 0) / Math.max(1, (r.unitsPerPack || 1))),
                      category: r.category || undefined,
                      barcode: r.barcode || undefined,
                      minStock: r.minStock != null ? r.minStock : undefined,
                      lineTaxType: r.lineTaxType || undefined,
                      lineTaxValue: r.lineTaxValue || undefined,
                      expiry: r.expiry || undefined,
                      inventoryKey: r.inventoryKey || undefined,
                    }))
                  
                  if (!invoiceNo.trim() || !invoiceDate) {
                    showToast('error', 'Invoice No and Invoice Date are required')
                    return
                  }
                  if (!lines.length) {
                    showToast('error', 'Add at least one medicine with Qty (Packs)')
                    return
                  }
                  const invalidLine = items.find(r => {
                    const hasName = !!String(r.name || '').trim()
                    const packsOk = Number(r.packs || 0) > 0
                    const unitsOk = Number(r.unitsPerPack || 0) > 0
                    return (hasName && (!packsOk || !unitsOk))
                  })
                  if (invalidLine) {
                    showToast('error', 'Each medicine must have Qty (Packs) and Units/Pack greater than 0')
                    return
                  }
                  
                  try {
                    await aestheticApi.createPurchaseDraft({
                      date: invoiceDate,
                      invoice: invoiceNo,
                      supplierId: supplierId || undefined,
                      supplierName: supplierName || undefined,
                      invoiceTaxes: invoiceTaxes
                        .filter(t => (t.name || '').trim() && (t.value || 0) > 0)
                        .map(t => ({
                          name: (t.name || '').trim(),
                          value: t.value || 0,
                          type: t.type || 'percent',
                          applyOn: t.applyOn || 'gross'
                        })),
                      discount,
                      lines: lines,
                    })
                    showToast('success', 'Invoice saved successfully')
                    setTimeout(() => navigate('/aesthetic/inventory'), 350)
                  } catch (error) {
                    console.error('Error saving invoice:', error)
                    showToast('error', 'Failed to save invoice. Please try again.')
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-lg"
              >
                <Save className="h-4 w-4" />
                Save Invoice
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Invoice Details & Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Invoice Details</h2>
              </div>
              <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Supplier</label>
                    <div className="flex gap-2">
                      <select 
                        value={supplierId} 
                        onChange={e => { 
                          setSupplierId(e.target.value)
                          const s = suppliers.find((x: any) => x._id === e.target.value)
                          setSupplierName(s?.name || '') 
                        }} 
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="">Select supplier</option>
                        {suppliers.map((s: any) => (
                          <option key={s._id} value={s._id}>{s.name}{s.company ? ` — ${s.company}` : ''}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => setAddSupplierOpen(true)} className="btn-outline-navy whitespace-nowrap">+ Add</button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Invoice No *</label>
                    <input 
                      value={invoiceNo} 
                      onChange={e => setInvoiceNo(e.target.value)} 
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                      placeholder="INV-001"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Invoice Date *</label>
                    <input 
                      type="date" 
                      value={invoiceDate} 
                      onChange={e => setInvoiceDate(e.target.value)} 
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Items Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Medicine Items ({items.length})</h2>
                  <button
                    type="button"
                    onClick={() => setItems(prev => [...prev, { id: crypto.randomUUID() }])}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {items.map((row, idx) => (
                    <div key={row.id} className={`rounded-lg border ${row.collapsed ? 'border-slate-200 bg-slate-50' : 'border-indigo-200 bg-white'} p-4 dark:border-slate-700 dark:bg-slate-800`}>
                      {row.collapsed ? (
                        // Collapsed View
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold dark:bg-indigo-900/30 dark:text-indigo-300">#{idx + 1}</span>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{row.name || 'Unnamed'}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{row.packs || 0} packs × PKR {row.buyPerPack || 0}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">PKR {((row.buyPerPack || 0) * (row.packs || 0)).toFixed(2)}</span>
                            <button
                              type="button"
                              onClick={() => expandItem(row.id)}
                              className="rounded p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setItems(prev => prev.filter(it => it.id !== row.id))}
                                className="rounded p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        // Expanded View
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Item #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => collapseItem(row.id)}
                              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                            >
                              <Save className="h-4 w-4" />
                              Save & Collapse
                            </button>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {/* Medicine Name with Autocomplete */}
                            <div className="relative lg:col-span-2">
                              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Medicine Name *</label>
                              <input
                                list="aesthetic-medicine-list"
                                value={row.name || ''}
                                onChange={e => handleMedicineInput(e.target.value, row.id)}
                                onFocus={() => {
                                  if (row.name && row.name.trim()) {
                                    searchMedicines(row.name, row.id)
                                  }
                                }}
                                onBlur={() => autofillFromInventoryByName(row.name, row.id)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                placeholder="Type to search medicines..."
                              />
                              <datalist id="aesthetic-medicine-list">
                                {allMedicines.map(m => (
                                  <option key={m.id} value={m.name} />
                                ))}
                              </datalist>
                              {showSuggestions === row.id && suggestions.length > 0 && (
                                <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto dark:border-slate-700 dark:bg-slate-800">
                                  {suggestions.map((sug) => (
                                    <button
                                      key={sug.id}
                                      type="button"
                                      onClick={() => selectSuggestion(sug, row.id)}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
                                    >
                                      {sug.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Generic Name</label>
                              <input 
                                value={row.genericName || ''} 
                                onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, genericName: e.target.value } : it))} 
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Barcode</label>
                              <input 
                                value={row.barcode || ''} 
                                onChange={e => {
                                  const v = e.target.value
                                  setItems(prev => prev.map(it => it.id === row.id ? { ...it, barcode: v } : it))
                                  const t = barcodeTimersRef.current[row.id]
                                  if (t) try { clearTimeout(t) } catch {}
                                  barcodeTimersRef.current[row.id] = setTimeout(() => {
                                    const code = v?.trim()
                                    if (code && code.length >= 6) autofillFromInventoryByBarcode(code, row.id)
                                  }, 220)
                                }} 
                                onBlur={() => autofillFromInventoryByBarcode(row.barcode, row.id)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                                placeholder="Scan or enter barcode"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                              <input 
                                value={row.category || ''} 
                                onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, category: e.target.value } : it))} 
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Expiry Date</label>
                              <input 
                                type="date" 
                                value={row.expiry || ''} 
                                onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, expiry: e.target.value } : it))} 
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Qty (Packs) *</label>
                              <input 
                                type="number"
                                value={row.packs ?? ''} 
                                onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, packs: Number(e.target.value || 0), totalItems: Number(e.target.value || 0) * Math.max(1, row.unitsPerPack || 1) } : it))} 
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Units/Pack *</label>
                              <input 
                                type="number"
                                value={row.unitsPerPack ?? ''} 
                                onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, unitsPerPack: Number(e.target.value || 0), buyPerUnit: (row.buyPerPack || 0) / Math.max(1, Number(e.target.value || 0)), salePerUnit: (row.salePerPack || 0) / Math.max(1, Number(e.target.value || 0)), totalItems: (row.packs || 0) * Math.max(1, Number(e.target.value || 0)) } : it))} 
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Buy/Pack *</label>
                              <input 
                                type="number"
                                step="0.01"
                                value={row.buyPerPack ?? ''} 
                                onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, buyPerPack: Number(e.target.value || 0), buyPerUnit: Math.max(0, Number(e.target.value || 0)) / Math.max(1, row.unitsPerPack || 1) } : it))} 
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Sale/Pack *</label>
                              <input 
                                type="number"
                                step="0.01"
                                value={row.salePerPack ?? ''} 
                                onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, salePerPack: Number(e.target.value || 0), salePerUnit: Math.max(0, Number(e.target.value || 0)) / Math.max(1, row.unitsPerPack || 1) } : it))} 
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Buy/Unit</label>
                              <input 
                                type="number"
                                step="0.01"
                                value={row.buyPerUnit ?? ''} 
                                onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, buyPerUnit: Number(e.target.value || 0), buyPerPack: Number(e.target.value || 0) * Math.max(1, row.unitsPerPack || 1) } : it))} 
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Sale/Unit</label>
                              <input 
                                type="number"
                                step="0.01"
                                value={row.salePerUnit ?? ''} 
                                onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, salePerUnit: Number(e.target.value || 0), salePerPack: Number(e.target.value || 0) * Math.max(1, row.unitsPerPack || 1) } : it))} 
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Total Items</label>
                              <input 
                                type="number"
                                value={row.totalItems ?? ((row.unitsPerPack || 1) * (row.packs || 0))} 
                                onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, totalItems: Number(e.target.value || 0), packs: Math.ceil(Number(e.target.value || 0) / Math.max(1, row.unitsPerPack || 1)) } : it))} 
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Min Stock</label>
                              <input 
                                type="number"
                                value={row.minStock ?? ''} 
                                onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, minStock: Number(e.target.value || 0) } : it))} 
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" 
                              />
                            </div>

                            {/* Line Tax */}
                            <div className="lg:col-span-3">
                              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Line Tax (Optional)</label>
                              <div className="flex gap-2">
                                <select
                                  value={(row.lineTaxType || 'percent') === 'percent' ? '%' : 'PKR'}
                                  onChange={e => {
                                    const val = e.target.value === '%' ? 'percent' : 'fixed'
                                    setItems(prev => prev.map(it => it.id === row.id ? { ...it, lineTaxType: val as 'percent' | 'fixed' } : it))
                                  }}
                                  className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                >
                                  <option>%</option>
                                  <option>PKR</option>
                                </select>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={row.lineTaxValue ?? ''}
                                  onChange={e => setItems(prev => prev.map(it => it.id === row.id ? { ...it, lineTaxValue: Number(e.target.value || 0) } : it))}
                                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-700/50">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Line Total:</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">PKR {((row.buyPerPack || 0) * (row.packs || 0)).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Summary & Taxes */}
          <div className="space-y-6">
            {/* Invoice-Level Taxes */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setShowTaxSection(!showTaxSection)}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Invoice-Level Taxes ({invoiceTaxes.length})</h2>
                {showTaxSection ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
              </button>
              
              {showTaxSection && (
                <div className="border-t border-slate-200 dark:border-slate-700">
                  <div className="p-6 space-y-3">
                    {invoiceTaxes.map(t => (
                      <div key={t.id} className="space-y-2">
                        <input
                          value={t.name || ''}
                          onChange={e => setInvoiceTaxes(prev => prev.map(x => x.id === t.id ? { ...x, name: e.target.value } : x))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          placeholder="Tax name (e.g., GST)"
                        />
                        <div className="grid gap-2 sm:grid-cols-4">
                          <select
                            value={(t.type || 'percent') === 'percent' ? '%' : 'PKR'}
                            onChange={e => {
                              const val = e.target.value === '%' ? 'percent' : 'fixed'
                              setInvoiceTaxes(prev => prev.map(x => x.id === t.id ? { ...x, type: val as 'percent' | 'fixed' } : x))
                            }}
                            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          >
                            <option>%</option>
                            <option>PKR</option>
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            value={t.value ?? ''}
                            onChange={e => setInvoiceTaxes(prev => prev.map(x => x.id === t.id ? { ...x, value: Number(e.target.value || 0) } : x))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            placeholder="Value"
                          />
                          <select
                            value={t.applyOn || 'gross'}
                            onChange={e => setInvoiceTaxes(prev => prev.map(x => x.id === t.id ? { ...x, applyOn: e.target.value as 'gross' | 'net' } : x))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          >
                            <option value="gross">On Gross</option>
                            <option value="net">On Net</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => setInvoiceTaxes(prev => prev.filter(x => x.id !== t.id))}
                            className="w-full rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setInvoiceTaxes(prev => [...prev, { id: crypto.randomUUID(), type: 'percent', applyOn: 'gross' }])}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-400"
                    >
                      <Plus className="h-4 w-4" />
                      Add Invoice Tax
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Totals Summary */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-sm border border-emerald-200 dark:from-emerald-900/20 dark:to-emerald-900/30 dark:border-emerald-800">
              <div className="px-6 py-4">
                <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">Invoice Summary</h2>
              </div>
              <div className="px-6 pb-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-700 dark:text-emerald-300">Gross Amount:</span>
                  <span className="font-medium text-emerald-900 dark:text-emerald-100">PKR {gross.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-700 dark:text-emerald-300">Line Taxes:</span>
                  <span className="font-medium text-emerald-900 dark:text-emerald-100">PKR {lineTaxesTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-700 dark:text-emerald-300">Invoice Taxes:</span>
                  <span className="font-medium text-emerald-900 dark:text-emerald-100">PKR {invoiceTaxesTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-emerald-300 dark:border-emerald-700">
                  <span className="text-lg font-bold text-emerald-800 dark:text-emerald-200">Net Total:</span>
                  <span className="text-xl font-black text-emerald-900 dark:text-emerald-100">PKR {netTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Pharmacy_AddSupplierDialog
        open={addSupplierOpen}
        onClose={() => setAddSupplierOpen(false)}
        onSave={addSupplier}
      />
    </div>
  )
}
