import { useEffect, useMemo, useState } from 'react'
import { pharmacyApi } from '../../utils/api'
type Line = { name: string; qty: number; price: number; discountRs?: number }

type Props = {
  open: boolean
  onClose: () => void
  receiptNo: string
  method: 'cash' | 'credit'
  lines: Line[]
  discountPct?: number
  lineDiscountRs?: number
  customer?: string
  autoPrint?: boolean
  datetime?: string
  fbr?: { status?: string; qrCode?: string; fbrInvoiceNo?: string; mode?: string; error?: string } | null
}

export default function Pharmacy_POSReceiptDialog({ open, onClose, receiptNo, method, lines, discountPct = 0, customer, autoPrint, datetime, fbr }: Props) {
  if (!open) return null

  const withLineDiscount = useMemo(() => {
    const normalized = (lines || []).map(l => ({
      ...l,
      discountRs: Math.max(0, Number((l as any).discountRs || 0)),
    }))
    const sum = normalized.reduce((s, l) => s + Number(l.discountRs || 0), 0)
    return { lines: normalized, sum: Math.round(sum * 100) / 100 }
  }, [lines])

  const subtotal = withLineDiscount.lines.reduce((s, l) => s + l.price * l.qty, 0)
  const taxPct = 0
  const billDisc = Math.max(0, (subtotal * (discountPct || 0)) / 100)
  const tax = (subtotal - billDisc) * (taxPct / 100)
  const total = subtotal - billDisc + tax
  const [info, setInfo] = useState<{ name: string; phone: string; address: string; footer: string; logo: string }>({ name: 'PHARMACY', phone: '', address: '', footer: 'Thank you for your purchase!', logo: '' })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const s = await pharmacyApi.getSettings()
        if (!mounted) return
        setInfo({
          name: s.pharmacyName || 'PHARMACY',
          phone: s.phone || '',
          address: s.address || '',
          footer: s.billingFooter || 'Thank you for your purchase!',
          logo: s.logoDataUrl || '',
        })
      } catch (e) { console.error(e) }
    })()
    return ()=>{ mounted = false }
  }, [])

  useEffect(() => {
    if (!open) return
    if (!autoPrint) return
    const t = setTimeout(() => {
      try { window.print() } catch {}
    }, 150)
    return () => clearTimeout(t)
  }, [open, autoPrint])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        #pharmacy-receipt { font-family: 'Poppins', Arial, sans-serif }
        .tabular-nums { font-variant-numeric: tabular-nums }
        @media print {
          @page { size: 58mm auto; margin: 0 }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact }
          body * { visibility: hidden !important }
          #pharmacy-receipt, #pharmacy-receipt * { visibility: visible !important }
          #pharmacy-receipt { position: absolute !important; left: 0; right: 0; top: 0; margin: 0 auto !important; padding: 0 6px !important; width: 384px !important; box-sizing: content-box !important; line-height: 1.25; overflow: visible !important; z-index: 2147483647 }
          .no-print { display: none !important }
          .only-print { display: block !important }
          #pharmacy-receipt hr { border-color: #000 !important }
          #pharmacy-receipt, #pharmacy-receipt * { color: #000 !important }
          #pharmacy-receipt .amount { text-align: right; padding-right: 8px !important; font-variant-numeric: tabular-nums; letter-spacing: 0; white-space: nowrap }
          #pharmacy-receipt .amount-h { text-align: right; padding-right: 6px !important; white-space: nowrap }
          #pharmacy-receipt .qty { text-align: center; font-variant-numeric: tabular-nums }
        }
      `}</style>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-6 print:static print:p-0 print:bg-white" role="dialog" aria-modal="true">
        <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 print:shadow-none print:ring-0 print:rounded-none print:max-w-none print:bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 print:hidden no-print">
          <div className="font-medium text-slate-900">Receipt {receiptNo}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="btn-outline-navy">Print (Ctrl+P)</button>
            <button onClick={onClose} className="btn-outline-navy">Close (Ctrl+D)</button>
          </div>
          </div>

          <div className="max-h-[75vh] overflow-y-auto px-6 py-6 print:p-0 print:overflow-visible">
            <div id="pharmacy-receipt" className="mx-auto w-[384px] print:w-[384px]">
              <div className="text-center">
                {info.logo ? <img src={info.logo} alt="Logo" className="mx-auto mb-2 h-12 w-12 object-contain" /> : null}
                <div className="text-xl font-bold tracking-wide print:tracking-normal print:text-black">{info.name}</div>
                {info.address && <div className="text-xs text-slate-600 print:text-black">{info.address}</div>}
                {info.phone && <div className="text-xs text-slate-600 print:text-black">PHONE : {info.phone}</div>}
              </div>

              <hr className="my-3 border-dashed" />
              <div className="text-center font-medium print:text-black">Retail Invoice</div>
              <div className="mt-2 text-xs text-slate-700 print:text-black">
                <div>Date : {(datetime ? new Date(datetime) : new Date()).toLocaleString()}</div>
                <div>Walk-in{customer ? ` - ${customer}` : ''}</div>
                <div>Bill No: {receiptNo}</div>
                <div>Payment Mode: {method}</div>
              </div>

              <div className="mt-3 border-t border-dashed pt-2 text-sm print:text-black">
                <div className="grid grid-cols-6 font-medium">
                  <div className="col-span-3">Item</div>
                  <div className="qty">Qty</div>
                  <div className="col-span-2 amount-h">Amt</div>
                </div>
                <div className="mt-2 space-y-1">
                  {withLineDiscount.lines.map((l, idx) => (
                    <div key={idx} className="grid grid-cols-6">
                      <div className="col-span-3 min-w-0">
                        <div className="truncate">{l.name}</div>
                        {Number(l.discountRs || 0) > 0 ? (
                          <div className="truncate text-[11px] text-emerald-700 print:text-black">(Disc: Rs {Number(l.discountRs || 0).toFixed(2)})</div>
                        ) : null}
                      </div>
                      <div className="qty tabular-nums">{l.qty}</div>
                      <div className="col-span-2 amount tabular-nums">{(l.price * l.qty).toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-6 border-t border-dashed pt-2">
                  <div className="col-span-4">Sub Total</div>
                  <div className="col-span-2 amount tabular-nums">{subtotal.toFixed(2)}</div>
                  {withLineDiscount.sum>0 && (<>
                    <div className="col-span-4">Line Discounts</div>
                    <div className="col-span-2 amount tabular-nums">{withLineDiscount.sum.toFixed(2)}</div>
                  </>)}
                  <div className="col-span-4">(-) Bill Discount ({discountPct}%)</div>
                  <div className="col-span-2 amount tabular-nums">{billDisc.toFixed(2)}</div>
                  <div className="col-span-4">GST ({taxPct}%)</div>
                  <div className="col-span-2 amount tabular-nums">{tax.toFixed(2)}</div>
                  <div className="col-span-4 font-semibold">TOTAL</div>
                  <div className="col-span-2 amount font-semibold tabular-nums">Rs {total.toFixed(2)}</div>
                </div>
              </div>

              <hr className="my-3 border-dashed" />
              {(() => {
                const st = String(fbr?.status || '').toUpperCase().trim()
                const showFbr = Boolean(fbr) && Boolean(st)
                const isSuccess = st === 'SUCCESS' && Boolean(fbr?.qrCode)
                if (!showFbr) return null
                return (
                  <div className="text-xs print:text-black">
                    <div className="text-center font-medium">FBR</div>
                    <div className="mt-1 text-center">
                      {isSuccess ? (
                        <img src={fbr!.qrCode} alt="FBR QR" className="mx-auto h-24 w-24 object-contain" />
                      ) : (
                        <div className="font-semibold text-rose-600 print:text-black">FBR FAILED</div>
                      )}
                    </div>
                    <div className="mt-1 space-y-0.5 text-[11px] text-slate-700 print:text-black">
                      <div>FBR No: {fbr?.fbrInvoiceNo || '—'}</div>
                      <div>Mode: {fbr?.mode || '—'}</div>
                      <div>Error: {fbr?.error || '—'}</div>
                    </div>
                  </div>
                )
              })()}

              <hr className="my-3 border-dashed" />
              <div className="text-center text-xs text-slate-600 print:text-black">{info.footer || 'Thank you for your purchase!'}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
