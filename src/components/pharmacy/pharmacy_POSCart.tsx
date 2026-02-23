import { Plus, Minus } from 'lucide-react'

type Product = {
  id: string
  name: string
  genericName?: string
  unitPrice: number
  stock?: number
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

type Props = {
  cart: CartLine[]
  products: Product[]
  productIndex?: Record<string, Product>
  onInc: (id: string) => void
  onDec: (id: string) => void
  onRemove: (id: string) => void
  onClear: () => void
  onSetQty: (id: string, qty: number) => void
  onQtyEnter?: () => void
  onSetLineDiscountPct?: (id: string, discountPct: number) => void
}

export default function Pharmacy_POSCart({ cart, products, productIndex, onInc, onDec, onRemove, onClear, onSetQty, onQtyEnter, onSetLineDiscountPct }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-600">
        <div className="font-medium text-slate-800 dark:text-slate-100">Shopping Cart ({cart.length})</div>
        <button type="button" onClick={onClear} className="btn-outline-navy text-xs">Clear Cart</button>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {cart.length === 0 && <div className="p-4 text-sm text-slate-500 dark:text-slate-400">No items</div>}
        {cart.map(line => {
          const p = (productIndex && productIndex[line.productId]) || products.find(pp => pp.id === line.productId)
          const stock = Number(p?.stock || 0)
          const isLowStock = stock > 0 && stock <= Math.max(10, Math.floor(stock * 0.2))
          const isOutOfStock = stock <= 0
          
          return (
            <div key={line.id} className="flex items-center gap-3 p-4">
              <div className="flex-1">
                <div className="font-medium text-slate-800 capitalize dark:text-slate-100">{p?.name || line.name}</div>
                {p?.genericName ? <div className="text-xs text-slate-500 capitalize dark:text-slate-400">{p.genericName}</div> : null}
                <div className="text-xs text-slate-500 dark:text-slate-400">PKR {Number((p?.unitPrice ?? line.unitPrice) || 0).toFixed(2)} each</div>
                <div className={`text-xs font-medium ${
                  isOutOfStock ? 'text-rose-700' :
                  isLowStock ? 'text-amber-700' :
                  'text-slate-500'
                }`}>
                  {isOutOfStock ? 'Out of Stock' : `Available: ${stock}`}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="block text-xs text-slate-600 dark:text-slate-300">
                    <span className="mb-1 block">Line Discount (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={Number(line.discountPct||0)}
                      onChange={e=> onSetLineDiscountPct?.(line.id, Math.max(0, Math.min(100, parseFloat(e.target.value||'0')||0)))}
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onDec(line.id)} className="rounded-md border border-slate-200 p-1 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Minus className="h-4 w-4" /></button>
                <input
                  id={`pharmacy-pos-qty-${line.id}`}
                  type="number"
                  min={1}
                  value={line.qty}
                  onChange={e=>{
                    const v = parseInt(e.target.value || '1', 10)
                    onSetQty(line.id, isNaN(v)? 1 : v)
                  }}
                  onKeyDown={e=>{
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                      try { (e.target as HTMLInputElement).blur() } catch {}
                      onQtyEnter?.()
                    }
                  }}
                  className="h-8 w-12 rounded-md border border-slate-300 bg-white text-center text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <button type="button" onClick={() => onInc(line.id)} className="rounded-md border border-slate-200 p-1 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Plus className="h-4 w-4" /></button>
                <button type="button" onClick={() => onRemove(line.id)} className="rounded-md border border-rose-200 p-1 text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/30">×</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
