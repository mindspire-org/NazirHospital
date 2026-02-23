import { useEffect, useMemo, useState } from 'react'
import { pharmacyApi } from '../../utils/api'

type Props = {
  open: boolean
  onClose: () => void
  billNo: string
  customer?: string
  lines: { name: string; qty: number; amount: number }[]
  total: number
  type?: 'Customer'|'Supplier'
}

export default function Pharmacy_ReturnSlipDialog({ open, onClose, billNo, customer, lines, total, type = 'Customer' }: Props){
  const [info, setInfo] = useState<{ name: string; phone: string; address: string; footer: string; logo: string }>({ name: 'PHARMACY', phone: '', address: '', footer: 'Thank you!', logo: '' })

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
          footer: s.billingFooter || 'Thank you!',
          logo: s.logoDataUrl || '',
        })
      } catch {}
    })()
    return ()=>{ mounted = false }
  }, [])

  const sum = useMemo(()=> Math.round((lines || []).reduce((s,l)=>s+Number(l.amount||0),0)*100)/100, [lines])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-6 print:static print:p-0 print:bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        #pharmacy-return-slip { font-family: 'Poppins', Arial, sans-serif }
        .tabular-nums { font-variant-numeric: tabular-nums }
        @media print {
          @page { size: 58mm auto; margin: 0 }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact }
          body * { visibility: hidden !important }
          #pharmacy-return-slip, #pharmacy-return-slip * { visibility: visible !important }
          #pharmacy-return-slip { position: absolute !important; left: 0; right: 0; top: 0; margin: 0 auto !important; padding: 0 6px !important; width: 384px !important; box-sizing: content-box !important; line-height: 1.25; z-index: 2147483647 }
          .no-print { display: none !important }
          #pharmacy-return-slip hr { border-color: #000 !important }
          #pharmacy-return-slip, #pharmacy-return-slip * { color: #000 !important }
          #pharmacy-return-slip .amount { text-align: right; padding-right: 8px !important; font-variant-numeric: tabular-nums; white-space: nowrap }
          #pharmacy-return-slip .amount-h { text-align: right; padding-right: 6px !important; white-space: nowrap }
          #pharmacy-return-slip .qty { text-align: center; font-variant-numeric: tabular-nums }
        }
      `}</style>
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 print:shadow-none print:ring-0 print:rounded-none print:max-w-none">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 print:hidden no-print">
          <div className="font-medium">Return Slip · {billNo}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="btn-outline-navy">Print (Ctrl+P)</button>
            <button onClick={onClose} className="btn-outline-navy">Close</button>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-6 print:p-0 print:overflow-visible">
          <div id="pharmacy-return-slip" className="mx-auto w-[384px] print:w-[384px]">
            <div className="text-center">
              {info.logo ? <img src={info.logo} alt="Logo" className="mx-auto mb-2 h-12 w-12 object-contain" /> : null}
              <div className="text-xl font-bold tracking-wide print:tracking-normal print:text-black">{info.name}</div>
              {info.address && <div className="text-xs text-slate-600 print:text-black">{info.address}</div>}
              {info.phone && <div className="text-xs text-slate-600 print:text-black">PHONE : {info.phone}</div>}
            </div>

            <hr className="my-3 border-dashed" />
            <div className="text-center font-medium print:text-black">{type} Return</div>
            <div className="mt-2 text-xs text-slate-700 print:text-black">
              <div>Date : {new Date().toLocaleString()}</div>
              <div>Party : {customer || 'Walk-in'}</div>
              <div>Bill No: {billNo}</div>
            </div>

            <div className="mt-3 border-t border-dashed pt-2 text-sm print:text-black">
              <div className="grid grid-cols-6 font-medium">
                <div className="col-span-3">Item</div>
                <div className="qty">Qty</div>
                <div className="col-span-2 amount-h">Amt</div>
              </div>
              <div className="mt-2 space-y-1">
                {lines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-6">
                    <div className="col-span-3 truncate">{l.name}</div>
                    <div className="qty tabular-nums">{l.qty}</div>
                    <div className="col-span-2 amount tabular-nums">{Number(l.amount||0).toFixed(2)}</div>
                  </div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-6 border-t border-dashed pt-2">
                <div className="col-span-4 font-semibold">TOTAL RETURN</div>
                <div className="col-span-2 amount font-semibold">Rs {(total || sum).toFixed(2)}</div>
              </div>
            </div>

            <hr className="my-3 border-dashed" />
            <div className="text-center text-xs text-slate-600 print:text-black">{info.footer || 'Thank you!'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
