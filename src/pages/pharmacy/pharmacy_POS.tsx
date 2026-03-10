import { useEffect, useMemo, useState, useRef } from 'react'
import { Plus, Grid, List, Trash2 } from 'lucide-react'
import Pharmacy_POSCart from '../../components/pharmacy/pharmacy_POSCart'
import Pharmacy_ProcessPaymentDialog from '../../components/pharmacy/pharmacy_ProcessPaymentDialog'
import Pharmacy_POSReceiptDialog from '../../components/pharmacy/pharmacy_POSReceiptDialog'
import { pharmacyApi } from '../../utils/api'

type Product = {
  id: string
  name: string
  genericName?: string
  salePerPack: number
  unitsPerPack: number
  unitPrice: number
  stock: number
  barcode?: string
  defaultDiscountPct?: number
}

type CartLine = {
  id: string
  productId: string
  name: string
  unitPrice: number
  qty: number
  discountRs?: number
  discountPct?: number
}

export default function Pharmacy_POS() {
  const [query, setQuery] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [cart, setCart] = useState<CartLine[]>([])
  const [payOpen, setPayOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [payment, setPayment] = useState<{ method: 'cash' | 'credit'; customer?: string; customerId?: string } | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [productIndex, setProductIndex] = useState<Record<string, Product>>({})
  const [busy, setBusy] = useState(false)
  const [receiptNo, setReceiptNo] = useState('')
  const [receiptFbr, setReceiptFbr] = useState<any>(null)
  const [view, setView] = useState<'grid'|'list'>('list')
  const [sel, setSel] = useState(0)
  
  const [receiptItems, setReceiptItems] = useState<Array<{ name: string; qty: number; price: number }>>([])
  const [billDiscountPct, setBillDiscountPct] = useState<number>(0)
  // Current pharmacy username to stamp sales
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('pharmacy.user')
      if (raw) {
        const u = JSON.parse(raw)
        if (u && typeof u.username === 'string') return u.username
      }
    } catch {}
    try { return localStorage.getItem('pharma_user') || '' } catch { return '' }
  }, [])

  // Held bills (server-side persistence)
  type HeldBill = { _id: string; createdAtIso?: string; createdAt?: string; billDiscountPct?: number; lines?: Array<{ medicineId: string; name: string; unitPrice: number; qty: number; discountRs?: number }> }
  const [heldOpen, setHeldOpen] = useState(false)
  const [heldBills, setHeldBills] = useState<HeldBill[]>([])
  const refreshHeld = async ()=>{
    try { const r:any = await pharmacyApi.listHoldSales(); setHeldBills(r?.items||[]) } catch { setHeldBills([]) }
  }
  useEffect(()=>{ if (heldOpen) { refreshHeld() } }, [heldOpen])
  const holdBill = async ()=>{
    if (cart.length===0) return
    try {
      const payload = { billDiscountPct: billDiscountPct||0, lines: cart.map(l=> {
        const sub = Number(l.unitPrice||0) * Number(l.qty||0)
        const disc = Math.max(0, Math.min(100, Number(l.discountPct||0))) * sub / 100
        return { medicineId: l.productId, name: l.name, unitPrice: Number(l.unitPrice||0), qty: l.qty, discountRs: Number(disc.toFixed(2)) }
      }) }
      await pharmacyApi.createHoldSale(payload)
      setCart([])
      showToast('success', 'Bill held successfully')
      if (heldOpen) refreshHeld()
    } catch { showToast('error', 'Failed to hold bill') }
  }
  const restoreHeld = async (id: string)=>{
    try {
      const r:any = await pharmacyApi.getHoldSale(id)
      const doc = r || {}
      const lines = (doc.lines||[]) as Array<{ medicineId: string; name: string; unitPrice: number; qty: number; discountRs?: number }>
      setCart(lines.map(l=> {
        const sub = Number(l.unitPrice||0) * Number(l.qty||0)
        const rs = Number(l.discountRs||0)
        const pct = sub>0 ? (rs / sub) * 100 : 0
        return { id: crypto.randomUUID(), productId: l.medicineId, name: l.name, unitPrice: Number(l.unitPrice||0), qty: Number(l.qty||0), discountPct: Number(pct.toFixed(4)) }
      }))
      setBillDiscountPct(Number(doc.billDiscountPct||0))
      await pharmacyApi.deleteHoldSale(id)
      await refreshHeld()
      setHeldOpen(false)
    } catch { showToast('error', 'Failed to restore held bill') }
  }
  const deleteHeld = async (id: string)=>{ try { await pharmacyApi.deleteHoldSale(id); await refreshHeld() } catch {} }

  // Enhanced POS UX state
  const [searchOpen, setSearchOpen] = useState(false)
  const [suggestionSel, setSuggestionSel] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const outOfStockOkRef = useRef<HTMLButtonElement>(null)
  const pendingFocusLineIdRef = useRef<string | null>(null)
  const [outOfStockItem, setOutOfStockItem] = useState<Product | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const [lowStockItems, setLowStockItems] = useState<Set<string>>(new Set())
  const scanRef = useRef<{ buf: string; last: number; timer?: ReturnType<typeof setTimeout> | null }>({ buf: '', last: 0, timer: null })
  // Stable refs to ensure instant Shift+Enter without stale closures
  const cartRef = useRef<CartLine[]>([])
  const payOpenRef = useRef(false)
  const receiptOpenRef = useRef(false)
  useEffect(() => { cartRef.current = cart }, [cart])
  useEffect(() => { payOpenRef.current = payOpen }, [payOpen])
  useEffect(() => { receiptOpenRef.current = receiptOpen }, [receiptOpen])

  // Dedicated Shift+Enter handler in capture phase for instant response
  useEffect(() => {
    const onShiftEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        if (!payOpenRef.current && !receiptOpenRef.current && cartRef.current.length > 0) {
          try { searchInputRef.current?.blur() } catch {}
          setPayOpen(true)
        }
      }
    }
    window.addEventListener('keydown', onShiftEnter as any, true)
    return () => window.removeEventListener('keydown', onShiftEnter as any, true)
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await pharmacyApi.listInventory({ search: query || undefined, page, limit: rowsPerPage })
        if (!mounted) return
        const mapped: Product[] = (res.items || []).map((it: any) => ({
          id: it._id || it.key || it.name,
          name: it.name,
          genericName: it.genericName || it.lastGenericName || undefined,
          salePerPack: Number(it.lastSalePerPack || 0),
          unitsPerPack: Number(it.unitsPerPack || 1),
          unitPrice: Number(it.lastSalePerUnit || ((it.unitsPerPack && it.lastSalePerPack) ? it.lastSalePerPack/it.unitsPerPack : 0)),
          stock: Number(it.onHand || 0),
          barcode: it.barcode || undefined,
          defaultDiscountPct: Number(it.defaultDiscountPct || 0),
        }))
        setProducts(mapped)
        setProductIndex(prev => {
          const next = { ...prev }
          for (const p of mapped) next[p.id] = p
          return next
        })
        const tp = Number(res?.totalPages || 1)
        if (!isNaN(tp)) setTotalPages(tp)
        
        // Check for stock alerts after loading products
        checkStockAlerts(mapped)
      } catch (e) { console.error(e) }
    })()
    return ()=>{ mounted = false }
  }, [query, page, rowsPerPage])

  const filtered = useMemo(() => products, [products])
  const visible = useMemo(() => filtered, [filtered])

  const suggestions = useMemo(() => {
    const list = visible.slice(0, 8)
    if (!query.trim()) return [] as Product[]
    return list
  }, [visible, query])

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

  const getStock = (productId: string) => {
    const p = productIndex[productId] || products.find(pp => pp.id === productId)
    return Number(p?.stock || 0)
  }

  // Check for low stock items and generate alerts
  const checkStockAlerts = (productsList: Product[]) => {
    const lowStockSet = new Set<string>()
    
    productsList.forEach(p => {
      const stock = Number(p.stock || 0)
      // Consider low stock if <= 10 units or 20% of typical daily sales
      const lowStockThreshold = Math.max(10, Math.floor(stock * 0.2))
      if (stock > 0 && stock <= lowStockThreshold) {
        lowStockSet.add(p.id)
      }
    })
    
    setLowStockItems(lowStockSet)
    
    // Show alert for critically low stock items
    
  }

  const addToCart = (pid: string, opts?: { focusQty?: boolean }) => {
    const p = productIndex[pid] || products.find(pp => pp.id === pid)
    if (!p) return
    if (!p.stock || p.stock <= 0) { setOutOfStockItem(p); return }
    setCart(prev => {
      const found = prev.find(l => l.productId === pid)
      if (found) {
        const max = Number(p.stock || 0)
        if (found.qty + 1 > max) { showToast('error', `Only ${max} in stock for ${p.name}`); return prev }
        if (opts?.focusQty !== false) { pendingFocusLineIdRef.current = found.id } else { pendingFocusLineIdRef.current = null }
        return prev.map(l => (l.productId === pid ? { ...l, qty: l.qty + 1 } : l))
      }
      const id = crypto.randomUUID()
      if (opts?.focusQty !== false) { pendingFocusLineIdRef.current = id } else { pendingFocusLineIdRef.current = null }
      return [...prev, { id, productId: pid, name: p.name, unitPrice: p.unitPrice, qty: 1, discountPct: Math.max(0, Math.min(100, Number(p.defaultDiscountPct||0))) }]
    })
  }

  const inc = (id: string) => {
    setCart(prev => {
      const line = prev.find(l => l.id === id)
      if (!line) return prev
      const max = getStock(line.productId)
      if (max > 0 && line.qty + 1 > max) {
        const p = products.find(pp => pp.id === line.productId)
        showToast('error', `Only ${max} in stock for ${p?.name || 'this item'}`)
        return prev
      }
      return prev.map(l => (l.id === id ? { ...l, qty: l.qty + 1 } : l))
    })
  }
  const dec = (id: string) => setCart(prev => prev.map(l => (l.id === id ? { ...l, qty: Math.max(1, l.qty - 1) } : l)))
  const remove = (id: string) => setCart(prev => prev.filter(l => l.id !== id))
  const clear = () => setCart([])
  const setQty = (id: string, qty: number) => {
    setCart(prev => {
      const line = prev.find(l => l.id === id)
      if (!line) return prev
      const max = getStock(line.productId)
      const safe = Math.max(1, qty | 0)
      if (max > 0 && safe > max) {
        const p = products.find(pp => pp.id === line.productId)
        showToast('error', `Max available is ${max} for ${p?.name || 'this item'}`)
        return prev.map(l => (l.id === id ? { ...l, qty: max } : l))
      }
      return prev.map(l => (l.id === id ? { ...l, qty: safe } : l))
    })
  }

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, line) => {
      const price = Number(line.unitPrice ?? (productIndex[line.productId]?.unitPrice) ?? 0)
      return sum + price * line.qty
    }, 0)
    const lineDiscount = cart.reduce((s, l)=> {
      const price = Number(l.unitPrice||0) * Number(l.qty||0)
      const pct = Number(l.discountPct||0)
      const disc = Math.max(0, Math.min(100, pct)) * price / 100
      return s + disc
    }, 0)
    const billPct = billDiscountPct || 0
    const billDiscount = Math.max(0, ((subtotal - lineDiscount) * billPct) / 100)
    const tax = 0
    const total = subtotal - lineDiscount - billDiscount + tax
    return { subtotal, lineDiscount, billDiscount, tax, total }
  }, [cart, billDiscountPct, productIndex])

  const refreshCartStocks = async () => {
    try {
      const fresh: Product[] = []
      for (const l of cart) {
        try {
          const res: any = await pharmacyApi.listInventory({ search: l.name, page: 1, limit: 1 })
          const it = (res?.items || [])[0]
          if (!it) continue
          const mapped: Product = {
            id: it._id || it.key || it.name,
            name: it.name,
            genericName: it.genericName || it.lastGenericName || undefined,
            salePerPack: Number(it.lastSalePerPack || 0),
            unitsPerPack: Number(it.unitsPerPack || 1),
            unitPrice: Number(it.lastSalePerUnit || ((it.unitsPerPack && it.lastSalePerPack) ? it.lastSalePerPack/it.unitsPerPack : 0)),
            stock: Number(it.onHand || 0),
            barcode: it.barcode || undefined,
            defaultDiscountPct: Number(it.defaultDiscountPct || 0),
          }
          fresh.push(mapped)
        } catch {}
      }
      if (fresh.length) {
        setProductIndex(prev => {
          const next = { ...prev }
          for (const p of fresh) next[p.id] = p
          // Ensure current cart productIds also point to fresh by-name entries
          for (const l of cart) {
            const byName = fresh.find(f => f.name === l.name)
            if (byName) next[l.productId] = byName as any
          }
          return next
        })
      }
    } catch (e) { console.error('refreshCartStocks error', e) }
  }

  const openPayment = () => { try { searchInputRef.current?.blur() } catch {}; setPayOpen(true) }
  const confirmPayment = async (data: { method: 'cash' | 'credit'; customer?: string; customerId?: string }) => {
    setPayment(data)
    setPayOpen(false)
    try {
      setBusy(true)
      await refreshCartStocks()
      const bad = cart.find(l => {
        const max = getStock(l.productId)
        return max > 0 && Number(l.qty || 0) > max
      })
      if (bad) {
        const p = productIndex[bad.productId] || products.find(pp => pp.id === bad.productId)
        const max = getStock(bad.productId)
        showToast('error', `${p?.name || bad.name || 'Item'} quantity exceeds available stock${max>0?` (max ${max})`:''}`)
        setReceiptOpen(false)
        setBusy(false)
        return
      }
      const itemsForReceipt = cart.map(l => {
        const unit = Number(l.unitPrice || 0)
        const pct = Math.max(0, Math.min(100, Number(l.discountPct || 0)))
        const effectiveUnit = unit * (1 - pct / 100)
        const lineSub = unit * Number(l.qty || 0)
        const lineDisc = Math.max(0, Math.min(100, pct)) * lineSub / 100
        return { name: l.name, qty: l.qty, price: Math.round(effectiveUnit * 100) / 100, discountRs: Math.round(lineDisc * 100) / 100 }
      })
      const lines = cart.map(l => {
        const lineSub = Number(l.unitPrice||0) * Number(l.qty||0)
        const lineDisc = Math.max(0, Math.min(100, Number(l.discountPct||0))) * lineSub / 100
        return { medicineId: l.productId, name: l.name, unitPrice: Number(l.unitPrice || 0), qty: l.qty, discountRs: Number(lineDisc.toFixed(2)) }
      })
      const payload = {
        customer: data.customer,
        customerId: data.customerId,
        payment: data.method === 'cash' ? 'Cash' : 'Credit',
        discountPct: Number(billDiscountPct||0),
        lineDiscountTotal: cart.reduce((s,l)=> {
          const sub = Number(l.unitPrice||0) * Number(l.qty||0)
          const disc = Math.max(0, Math.min(100, Number(l.discountPct||0))) * sub / 100
          return s + disc
        }, 0),
        lines,
        createdBy: currentUser || undefined,
      }
      const created = await pharmacyApi.createSale(payload)
      setReceiptNo(created.billNo)
      setReceiptFbr({
        status: created?.fbrStatus || created?.fbr?.status,
        qrCode: created?.fbrQrCode || created?.qrCode || created?.fbr?.qrCode,
        fbrInvoiceNo: created?.fbrInvoiceNo || created?.fbr?.fbrInvoiceNo || created?.fbr?.invoiceNumber,
        mode: created?.fbrMode || created?.fbr?.mode,
        error: created?.fbrError || created?.fbr?.error,
      })
      setReceiptItems(itemsForReceipt)
      setReceiptOpen(true)
      setCart([])
      try { window.dispatchEvent(new CustomEvent('pharmacy:sale', { detail: created })) } catch {}
      // Refresh inventory so stock reflects the sale
      try {
        const res: any = await pharmacyApi.listInventory({ search: query || undefined, page, limit: rowsPerPage })
        const mapped: Product[] = (res.items || []).map((it: any) => ({
          id: it._id || it.key || it.name,
          name: it.name,
          genericName: it.genericName || it.lastGenericName || undefined,
          salePerPack: Number(it.lastSalePerPack || 0),
          unitsPerPack: Number(it.unitsPerPack || 1),
          unitPrice: Number(it.lastSalePerUnit || ((it.unitsPerPack && it.lastSalePerPack) ? it.lastSalePerPack/it.unitsPerPack : 0)),
          stock: Number(it.onHand || 0),
        }))
        setProducts(mapped)
        setProductIndex(prev => {
          const next = { ...prev }
          for (const p of mapped) next[p.id] = p
          return next
        })
        const tp = Number(res?.totalPages || 1)
        if (!isNaN(tp)) setTotalPages(tp)
        
        // Check for stock alerts after refreshing inventory post-sale
        checkStockAlerts(mapped)
      } catch (e) { console.error('Failed to refresh inventory after sale', e) }
    } catch (e) {
      console.error(e)
      showToast('error', 'Failed to process payment')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    setSel(s => Math.max(0, Math.min(s, visible.length - 1)))
  }, [visible.length])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (payOpen || receiptOpen) return
      const t = e.target as HTMLElement | null
      const tag = (t?.tagName || '').toLowerCase()
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || !!t?.isContentEditable

      // When search dropdown is open and search input is focused, do not handle here.
      // The input's onKeyDownCapture manages ArrowUp/Down and Enter to avoid double increments.
      const searchFocused = document.activeElement === searchInputRef.current
      if (searchOpen && searchFocused) { return }

      if (e.key === 'Enter' && e.shiftKey) { if (!payOpen && !receiptOpen && cart.length > 0) { e.preventDefault(); openPayment() } return }
      if (isTyping) return

      if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, visible.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); return }
      if (e.key === 'Enter') { const item = visible[sel]; if (item) { e.preventDefault(); addToCart(item.id, { focusQty: false }) } return }
      if (e.key === 'Delete') { if (cart.length>0) { e.preventDefault(); const id = cart[cart.length-1].id; remove(id) } return }
      if (e.key === '+' || e.key === '=') { if (cart.length>0) { e.preventDefault(); const id = cart[cart.length-1].id; inc(id) } return }
      if (e.key === '-' || e.key === '_') { if (cart.length>0) { e.preventDefault(); const id = cart[cart.length-1].id; dec(id) } return }
    }
    const onPay = () => openPayment()
    const onAdd = async (ev: any) => {
      try {
        const lines: Array<{ name: string; productId?: string; qty: number }> = ev?.detail?.lines || []
        for (const ln of lines) {
          let pid = ln.productId || ''
          let product = pid ? products.find(p => p.id === pid) : undefined
          if (!product) {
            // Try to fetch by name from inventory
            try {
              const inv: any = await pharmacyApi.listInventory({ search: ln.name, page: 1, limit: 1 })
              const it = (inv.items || [])[0]
              if (it) {
                pid = it._id || it.key || it.name
                product = {
                  id: pid,
                  name: it.name,
                  genericName: it.genericName || it.lastGenericName || undefined,
                  salePerPack: Number(it.lastSalePerPack || 0),
                  unitsPerPack: Number(it.unitsPerPack || 1),
                  unitPrice: Number(it.lastSalePerUnit || ((it.unitsPerPack && it.lastSalePerPack) ? it.lastSalePerPack/it.unitsPerPack : 0)),
                  stock: Number(it.onHand || 0),
                }
                setProducts(prev => {
                  if (prev.some(p => p.id === product!.id)) return prev
                  return [product!, ...prev]
                })
                setProductIndex(prev => ({ ...prev, [product!.id]: product! }))
              }
            } catch {}
          }
          if (!pid || !product) {
            showToast('error', `Item not found in inventory: ${ln.name}`)
            continue
          }
          // Add qty times with resolved details
          setCart(prev => {
            const found = prev.find(l => l.productId === pid)
            if (found) return prev.map(l => (l.productId === pid ? { ...l, qty: l.qty + Math.max(1, ln.qty|0) } : l))
            return [...prev, { id: crypto.randomUUID(), productId: pid, name: product!.name, unitPrice: product!.unitPrice, qty: Math.max(1, ln.qty|0) }]
          })
        }
      } catch {}
    }
    window.addEventListener('keydown', onKeyDown as any, true)
    window.addEventListener('pharmacy:pos:pay' as any, onPay as any)
    window.addEventListener('pharmacy:pos:add' as any, onAdd as any)
    return () => {
      window.removeEventListener('keydown', onKeyDown as any, true)
      window.removeEventListener('pharmacy:pos:pay' as any, onPay as any)
      window.removeEventListener('pharmacy:pos:add' as any, onAdd as any)
    }
  }, [visible, sel, cart, products, searchOpen, suggestions, suggestionSel, payOpen, receiptOpen])

  // Process pending add lines (if navigated from prescription page)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pharmacy.pos.pendingAddLines')
      if (!raw) return
      localStorage.removeItem('pharmacy.pos.pendingAddLines')
      const lines = JSON.parse(raw) as Array<{ name: string; productId?: string; qty: number }>
      const ev = new CustomEvent('pharmacy:pos:add', { detail: { lines } })
      window.dispatchEvent(ev)
    } catch {}
  }, [])

  // Focus search input on mount and when dialogs close
  useEffect(() => { try { searchInputRef.current?.focus() } catch {} }, [])
  useEffect(() => {
    if (!searchInputRef.current) return
    if (payOpen || receiptOpen) return
    const t = setTimeout(() => { try { searchInputRef.current?.focus() } catch {} }, 0)
    return () => clearTimeout(t)
  }, [payOpen, receiptOpen])

  // Focus qty input after add
  useEffect(() => {
    const id = pendingFocusLineIdRef.current
    if (!id) return
    pendingFocusLineIdRef.current = null
    const t = setTimeout(() => {
      const el = document.getElementById(`pharmacy-pos-qty-${id}`) as HTMLInputElement | null
      if (!el) return
      try { el.focus(); el.select() } catch {}
    }, 0)
    return () => clearTimeout(t)
  }, [cart])

  // Out of stock modal focus / escape
  useEffect(() => {
    if (!outOfStockItem) return
    const t = setTimeout(() => { try { outOfStockOkRef.current?.focus() } catch {} }, 0)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOutOfStockItem(null) }
    window.addEventListener('keydown', onKey as any)
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey as any) }
  }, [outOfStockItem])

  // Global scanner buffer (when no input focused)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (payOpen || receiptOpen) return
      const t = e.target as HTMLElement | null
      const tag = (t?.tagName || '').toLowerCase()
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || !!t?.isContentEditable
      const activeId = (t as any)?.id ? String((t as any).id) : ''
      const isQtyInput = activeId.startsWith('pharmacy-pos-qty-')
      // Do not intercept typing in inputs (including quantity field). Scanner works only when no input is focused.
      if (isTyping) return
      const now = Date.now()
      if (now - scanRef.current.last > 120) scanRef.current.buf = ''
      scanRef.current.last = now
      if (scanRef.current.timer) { try { clearTimeout(scanRef.current.timer) } catch {} }
      const commit = () => {
        const code = scanRef.current.buf.trim()
        scanRef.current.buf = ''
        if (!code || code.length < 6) return
        const norm = (s: string) => String(s || '').replace(/\D/g, '')
        const p = products.find(pp => norm(pp.barcode || '') === norm(code))
        if (p) {
          addToCart(p.id, { focusQty: false })
          try {
            setQuery(''); setSearchOpen(false)
            // Blur qty input if focused, and refocus search box for continuous scanning
            if (isQtyInput && t && 'blur' in t) { (t as any).blur?.() }
            searchInputRef.current?.focus(); searchInputRef.current?.select()
          } catch {}
        } else {
          setQuery(code)
          setSearchOpen(true)
        }
      }
      if (e.key === 'Enter' && !e.shiftKey) { commit(); return }
      if (e.key && e.key.length === 1) scanRef.current.buf += e.key
      scanRef.current.timer = setTimeout(commit, 180)
    }
    window.addEventListener('keydown', handler as any, true)
    return () => window.removeEventListener('keydown', handler as any, true)
  }, [products, payOpen, receiptOpen])

  // Clean up toast timer
  useEffect(() => () => { if (toastTimerRef.current) { window.clearTimeout(toastTimerRef.current); toastTimerRef.current = null } }, [])

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setSearchOpen(true); setSuggestionSel(s => Math.min(s + 1, Math.max(0, suggestions.length - 1))); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setSearchOpen(true); setSuggestionSel(s => Math.max(s - 1, 0)); return }
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault(); e.stopPropagation();
      if (cart.length > 0 && !payOpen && !receiptOpen) {
        openPayment()
      }
      return
    }
    if (e.key === 'Enter') {
      const code = query.trim()
      if (code) {
        const byBarcode = products.find(p => (p.barcode || '') === code)
        if (byBarcode) { e.preventDefault(); e.stopPropagation(); addToCart(byBarcode.id, { focusQty: false }); setQuery(''); setSearchOpen(false); try { searchInputRef.current?.focus(); searchInputRef.current?.select() } catch {}; return }
      }
      const item = suggestions[suggestionSel]
      if (item) { e.preventDefault(); e.stopPropagation(); addToCart(item.id, { focusQty: false }); setQuery(''); setSearchOpen(false); try { searchInputRef.current?.focus(); searchInputRef.current?.select() } catch {} }
      return
    }
    if (e.key === 'Escape') { e.stopPropagation(); setSearchOpen(false) }
  }

  const receiptLines = receiptItems

  const computedReceiptNo = useMemo(() => receiptNo || `B-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${String(receiptItems.length).padStart(3,'0')}`,[receiptNo, receiptItems])

  return (
    <div className={"grid gap-4 lg:grid-cols-3"}>
      {toast && (
        <div className="fixed right-4 top-4 z-70 w-[min(92vw,420px)]">
          <div className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg ring-1 ring-black/5 ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`} role="status" aria-live="polite">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{toast.type === 'success' ? 'Success' : 'Error'}</div>
              <div className="mt-0.5 text-sm opacity-90">{toast.message}</div>
            </div>
            <button type="button" onClick={() => { if (toastTimerRef.current) { window.clearTimeout(toastTimerRef.current); toastTimerRef.current = null }; setToast(null) }} className="ml-1 rounded-md p-1 opacity-70 hover:opacity-100" aria-label="Dismiss">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
            </button>
          </div>
        </div>
      )}

      {outOfStockItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Out of stock" onClick={() => setOutOfStockItem(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold text-slate-900">Out of stock</div>
            <div className="mt-2 text-sm text-slate-600"><span className="font-medium text-slate-800 capitalize">{outOfStockItem.name}</span> is currently out of stock and can’t be added to the cart.</div>
            <div className="mt-5 flex justify-end"><button type="button" ref={outOfStockOkRef} className="btn" onClick={() => setOutOfStockItem(null)}>OK</button></div>
          </div>
        </div>
      ) : null}

      <div className="lg:col-span-2 space-y-3">
          <div className="flex flex-col gap-3">
            <div className="relative w-full">
              <input
                ref={searchInputRef}
                id="pharmacy-pos-search"
                value={query}
                onChange={e => { setQuery(e.target.value); setSearchOpen(true); setSuggestionSel(0) }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => { setTimeout(() => setSearchOpen(false), 150) }}
                onKeyDownCapture={onSearchKeyDown}
                className="w-full rounded-2xl border border-slate-300 px-5 py-4 pr-14 text-lg shadow-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-200/60"
                placeholder="Search / scan barcode…"
              />

              <button type="button" onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-2 text-rose-600 shadow-sm hover:bg-rose-50" aria-label="Clear cart" title="Clear cart">
                <Trash2 className="h-5 w-5" />
              </button>

              {searchOpen && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                  {suggestions.map((p, i) => (
                    <button type="button" key={p.id} onMouseEnter={() => setSuggestionSel(i)} onClick={() => { addToCart(p.id, { focusQty: false }); setQuery(''); setSearchOpen(false); try { searchInputRef.current?.focus(); searchInputRef.current?.select() } catch {} }} className={`relative flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${i === suggestionSel ? 'bg-sky-100/80 text-slate-900 ring-1 ring-sky-200' : 'hover:bg-slate-50'}`}>
                      {i === suggestionSel ? <span className="absolute left-0 top-0 h-full w-1 bg-sky-600" /> : null}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-slate-900">{p.name}</div>
                        <div className="truncate text-xs text-slate-500">{p.genericName || ''}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-semibold text-slate-700">PKR {p.unitPrice.toFixed(2)}</div>
                        <div className={`text-[11px] ${p.stock <= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{p.stock <= 0 ? 'Out' : `Stock ${p.stock}`}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={()=> setView('grid')} className={`flex-1 sm:flex-none rounded-xl border px-4 py-2 text-sm font-semibold transition ${view==='grid' ? 'border-navy-600 bg-navy-50 text-navy-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <Grid className="mr-2 inline h-4 w-4" /> Grid View
              </button>
              <button type="button" onClick={()=> setView('list')} className={`flex-1 sm:flex-none rounded-xl border px-4 py-2 text-sm font-semibold transition ${view==='list' ? 'border-navy-600 bg-navy-50 text-navy-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <List className="mr-2 inline h-4 w-4" /> List View
              </button>
              <div className="ml-auto flex items-center gap-2">
                <div className="text-sm text-slate-700">Rows per page</div>
                <select value={rowsPerPage} onChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(1) }} className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700">
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <div className="text-xs text-slate-600 ml-2">Page {page} of {totalPages}</div>
                <button type="button" onClick={()=> setPage(p => Math.max(1, p-1))} disabled={page<=1} className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-50">Prev</button>
                <button type="button" onClick={()=> setPage(p => Math.min(totalPages, p+1))} disabled={page>=totalPages} className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-50">Next</button>
              </div>
            </div>
          </div>

          {view==='grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((p) => {
                const stock = Number(p.stock || 0)
                const isLowStock = lowStockItems.has(p.id)
                const isOutOfStock = stock <= 0
                
                return (
                  <div key={p.id} className={`rounded-xl border p-4 ${
                    isOutOfStock ? 'border-rose-200 bg-rose-50/30' :
                    isLowStock ? 'border-amber-200 bg-amber-50/30' :
                    'border-slate-200 bg-white'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-slate-800 capitalize">{p.name}</div>
                        {p.genericName ? <div className="text-xs text-slate-500 capitalize">{p.genericName}</div> : null}
                      </div>
                      <div className={`rounded-full px-2 py-1 text-xs font-medium ${
                        isOutOfStock ? 'bg-rose-100 text-rose-800' :
                        isLowStock ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {isOutOfStock ? 'Out of Stock' : `Stock: ${stock}`}
                      </div>
                    </div>
                  <div className="mt-1 text-xs text-slate-500">Sale/Pack: PKR {p.salePerPack.toFixed(2)}</div>
                  <div className="text-xs text-slate-500">Units/Pack: {p.unitsPerPack}</div>
                  <div className="mt-3 text-lg font-semibold text-slate-900">PKR {p.unitPrice.toFixed(2)}</div>
                  <div className="mt-3">
                    <button onClick={() => addToCart(p.id, { focusQty: false })} className="btn inline-flex items-center gap-2"><Plus className="h-4 w-4" /> Add to Cart</button>
                  </div>
                </div>
                )
              })}
            </div>
          ) : (
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {visible.map((p, i) => {
                const stock = Number(p.stock || 0)
                const isLowStock = lowStockItems.has(p.id)
                const isOutOfStock = stock <= 0
                
                return (
                  <div key={p.id} className={`flex items-center gap-3 p-3 ${
                    isOutOfStock ? 'bg-rose-50/30' :
                    isLowStock ? 'bg-amber-50/30' :
                    i===sel? 'bg-navy-50' : ''
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 capitalize truncate">{p.name}</div>
                      <div className="text-xs text-slate-500 capitalize truncate">{p.genericName || ''}</div>
                      <div className="text-xs text-slate-500">Sale/Pack: PKR {p.salePerPack.toFixed(2)} · Units/Pack: {p.unitsPerPack}</div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-slate-800 w-24 text-right">PKR {p.unitPrice.toFixed(2)}</div>
                    <div className={`shrink-0 w-24 text-right text-xs font-medium ${
                      isOutOfStock ? 'text-rose-700' :
                      isLowStock ? 'text-amber-700' :
                      'text-slate-600'
                    }`}>
                      {isOutOfStock ? 'Out' : `Stock ${stock}`}
                    </div>
                    <div className="shrink-0">
                      <button type="button" onClick={() => addToCart(p.id, { focusQty: false })} className="btn inline-flex items-center gap-2"><Plus className="h-4 w-4" /> Add to Cart</button>
                    </div>
                  </div>
                )
              })}
              {filtered.length===0 && <div className="p-4 text-sm text-slate-500">No items</div>}
            </div>
          )}
        </div>

      <div className="space-y-4">
        <Pharmacy_POSCart
          cart={cart}
          products={products}
          productIndex={productIndex}
          onInc={inc}
          onDec={dec}
          onRemove={remove}
          onClear={clear}
          onSetQty={setQty}
          onQtyEnter={() => {
            try {
              searchInputRef.current?.focus()
              searchInputRef.current?.select()
              setSearchOpen(true)
            } catch {}
          }}
          onSetLineDiscountPct={(id, pct)=> setCart(prev=> prev.map(l=> l.id===id ? { ...l, discountPct: isNaN(pct)?0:Math.max(0, Math.min(100, pct)) } : l))}
        />

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Bill Summary</div>
          <div className="space-y-2 p-4 text-sm text-slate-700">
            <div className="flex items-center justify-between"><span>Subtotal:</span><span>PKR {totals.subtotal.toFixed(2)}</span></div>
            <div className="flex items-center justify-between"><span>Line Discounts:</span><span>PKR {totals.lineDiscount.toFixed(2)}</span></div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-slate-600">
                <span className="mb-1 block">Bill Discount (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={Number(billDiscountPct||0)}
                  onChange={e=> setBillDiscountPct(Math.max(0, Math.min(100, parseFloat(e.target.value)||0)))}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
                />
              </label>
              <label className="block text-xs text-slate-600">
                <span className="mb-1 block">Bill Discount (Rs)</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={Math.max(0, (totals.subtotal - totals.lineDiscount) * (Number(billDiscountPct||0)) / 100).toFixed(2)}
                  onChange={e=>{
                    const base = Math.max(0, totals.subtotal - totals.lineDiscount)
                    const rs = Math.max(0, parseFloat(e.target.value)||0)
                    const pct = base>0 ? (rs / base) * 100 : 0
                    setBillDiscountPct(Math.max(0, Math.min(100, Number(pct.toFixed(6)))))
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900  "
                />
              </label>
            </div>
            <div className="flex items-center justify-between"><span>Sales Tax (0%):</span><span>PKR {totals.tax.toFixed(2)}</span></div>
            <div className="mt-2 flex items-center justify-between text-base font-semibold text-navy"><span>Total Amount:</span><span>PKR {totals.total.toFixed(2)}</span></div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button type="button" onClick={holdBill} disabled={cart.length===0} className="rounded-md bg-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Hold Bill</button>
              <button type="button" onClick={()=> setHeldOpen(true)} className="rounded-md bg-navy px-3 py-2 text-sm font-semibold text-white">Held Bills</button>
              <button type="button" disabled={busy || cart.length===0} onClick={openPayment} className="btn w-full disabled:opacity-50">{busy? 'Processing...' : 'Process Payment'}</button>
            </div>
          </div>
        </div>

        <Pharmacy_ProcessPaymentDialog open={payOpen} onClose={()=>setPayOpen(false)} onConfirm={confirmPayment} />
        <Pharmacy_POSReceiptDialog
          open={receiptOpen}
          onClose={()=>{ setReceiptOpen(false); setCart([]) }}
          receiptNo={computedReceiptNo}
          method={payment?.method || 'cash'}
          lines={receiptLines}
          discountPct={billDiscountPct}
          lineDiscountRs={cart.reduce((s,l)=> {
            const sub = Number(l.unitPrice||0) * Number(l.qty||0)
            const disc = Math.max(0, Math.min(100, Number(l.discountPct||0))) * sub / 100
            return s + disc
          }, 0)}
          customer={payment?.customer}
          autoPrint={true}
          datetime={new Date().toISOString()}
          fbr={receiptFbr}
        />

        {heldOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-lg font-semibold text-slate-800">Held Bills</div>
                <button type="button" onClick={()=> setHeldOpen(false)} className="btn-outline-navy">Close</button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto divide-y">
                {heldBills.length===0 && <div className="p-4 text-sm text-slate-500">No held bills</div>}
                {heldBills.map(h=> (
                  <div key={String((h as any)._id||'')}
                    className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div>
                      <div className="font-medium text-slate-800">{String((h as any)._id||'')}</div>
                      <div className="text-slate-600">{new Date(String(h.createdAtIso||h.createdAt||new Date().toISOString())).toLocaleString()} • Items: {(h.lines||[]).length} • Bill Disc: {Number(h.billDiscountPct||0)}%</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={()=> restoreHeld(String((h as any)._id||''))} className="btn">Restore</button>
                      <button type="button" onClick={()=> deleteHeld(String((h as any)._id||''))} className="btn-outline-navy">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
