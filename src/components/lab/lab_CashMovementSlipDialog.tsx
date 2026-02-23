import { useEffect, useState } from 'react'
import { labApi } from '../../utils/api'

export type CashMovementEntry = {
  id: string
  date: string
  type: 'IN' | 'OUT'
  category: string
  amount: number
  note?: string
  user?: string
  receiver?: string
  handoverBy?: string
}

type Props = {
  open: boolean
  onClose: () => void
  entry: CashMovementEntry | null
}

export default function Pharmacy_CashMovementSlipDialog({ open, onClose, entry }: Props) {
  const [info, setInfo] = useState<{ name: string; phone: string; address: string; footer: string; logo: string }>({ name: 'LAB', phone: '', address: '', footer: 'Have a nice day!', logo: '' })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const s = await labApi.getSettings()
        if (!mounted) return
        setInfo({
          name: s.labName || 'LAB',
          phone: s.phone || '',
          address: s.address || '',
          footer: s.reportFooter || 'Have a nice day!',
          logo: s.logoDataUrl || '',
        })
      } catch {}
    })()
    return ()=>{ mounted = false }
  }, [])

  if (!open || !entry) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        #cash-slip { font-family: 'Poppins', Arial, sans-serif }
        .tabular-nums { font-variant-numeric: tabular-nums }
        @media print {
          @page { size: 58mm auto; margin: 0 }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact }
          body * { visibility: hidden !important }
          #cash-slip, #cash-slip * { visibility: visible !important }
          #cash-slip { position: absolute !important; left: 0; right: 0; top: 0; margin: 0 auto !important; padding: 0 6px !important; width: 384px !important; box-sizing: content-box !important; line-height: 1.25; overflow: visible !important; z-index: 2147483647 }
          .no-print { display: none !important }
          .only-print { display: block !important }
          #cash-slip hr { border-color: #000 !important }
          #cash-slip, #cash-slip * { color: #000 !important }
        }
      `}</style>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-6 print:static print:p-0 print:bg-white">
        <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 print:shadow-none print:ring-0 print:rounded-none print:max-w-none">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 print:hidden no-print">
            <div className="font-medium">{entry.type === 'IN' ? 'Pay In' : 'Pay Out'} Slip</div>
            <div className="flex items-center gap-2">
              <button onClick={() => window.print()} className="btn-outline-navy">Print</button>
              <button onClick={onClose} className="btn-outline-navy">Close</button>
            </div>
          </div>

          <div className="max-h-[75vh] overflow-y-auto px-6 py-6 print:p-0 print:overflow-visible">
            <div id="cash-slip" className="mx-auto w-[384px] print:w-[384px]">
              <div className="text-center">
                {info.logo ? <img src={info.logo} alt="Logo" className="mx-auto mb-2 h-12 w-12 object-contain" /> : null}
                <div className="text-xl font-bold tracking-wide print:tracking-normal print:text-black">{info.name}</div>
                {info.address && <div className="text-xs text-slate-600 print:text-black">{info.address}</div>}
                {info.phone && <div className="text-xs text-slate-600 print:text-black">PHONE : {info.phone}</div>}
              </div>

              <hr className="my-3 border-dashed" />
              <div className="text-center font-medium print:text-black">{entry.type === 'IN' ? 'PAY IN' : 'PAY OUT'} SLIP</div>
              <div className="mt-2 text-xs text-slate-700 print:text-black">
                <div>Date : {new Date(entry.date || new Date().toISOString()).toLocaleString()}</div>
                <div>Entry ID : {entry.id}</div>
                <div>User : {entry.user || '-'}</div>
              </div>

              <div className="mt-3 text-sm print:text-black space-y-1">
                <div className="flex items-center justify-between"><span className="font-medium">Category</span><span>{entry.category || '-'}</span></div>
                <div className="flex items-center justify-between"><span className="font-medium">Amount</span><span className="tabular-nums">Rs {Number(entry.amount||0).toFixed(2)}</span></div>
                <div className="flex items-center justify-between"><span className="font-medium">Receiver</span><span>{entry.receiver || '-'}</span></div>
                <div className="flex items-center justify-between"><span className="font-medium">Handed Over By</span><span>{entry.handoverBy || '-'}</span></div>
                {entry.note ? <div className="mt-2"><div className="font-medium">Note</div><div className="text-sm">{entry.note}</div></div> : null}
              </div>

              <hr className="my-3 border-dashed" />
              <div className="text-center text-xs text-slate-600 print:text-black">{info.footer}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
