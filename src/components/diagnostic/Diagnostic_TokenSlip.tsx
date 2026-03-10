import { useEffect, useRef, useState } from 'react'
import { diagnosticApi } from '../../utils/api'

export type DiagnosticTokenSlipData = {
  tokenNo: string
  patientName: string
  phone?: string
  age?: string
  gender?: string
  mrn?: string
  guardianRel?: string
  guardianName?: string
  cnic?: string
  address?: string
  tests: Array<{ name: string; price: number }>
  subtotal: number
  discount: number
  payable: number
  createdAt?: string
}

function getCurrentUser(){
  try { const s = localStorage.getItem('diagnostic.session'); if (s) return (JSON.parse(s)?.username || JSON.parse(s)?.name || '').toString() } catch {}
  return 'admin'
}

export default function Diagnostic_TokenSlip({ open, onClose, data, autoPrint = false, user }: { open: boolean; onClose: ()=>void; data: DiagnosticTokenSlipData; autoPrint?: boolean; user?: string }){
  const [settings, setSettings] = useState({ name: 'Diagnostic Center', phone: '', address: '', logoDataUrl: '', slipFooter: 'Powered by Hospital MIS' })
  const printedRef = useRef(false)

  useEffect(()=>{ printedRef.current = false }, [open])
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const s = await diagnosticApi.getSettings() as any
        if (!mounted) return
        setSettings({
          name: s?.diagnosticName || 'Diagnostic Center',
          phone: s?.phone || '',
          address: s?.address || '',
          logoDataUrl: s?.logoDataUrl || '',
          slipFooter: s?.reportFooter || 'Powered by Hospital MIS',
        })
      } catch {}
    })()
    return ()=>{ mounted = false }
  }, [])
  useEffect(()=>{ if (!open || !autoPrint || printedRef.current) return; const t = setTimeout(()=>{ window.print(); printedRef.current = true }, 300); return ()=>clearTimeout(t) }, [open, autoPrint])
  if (!open) return null
  const dt = data.createdAt ? new Date(data.createdAt) : new Date()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:bg-white print:static">
      <div id="diagnostic-receipt" className="w-[384px] rounded-md border border-slate-300 bg-white p-4 shadow print:shadow-none print:border-0 print:w-[300px]">
        <div className="text-center">
          {settings.logoDataUrl && <img src={settings.logoDataUrl} alt="logo" className="mx-auto mb-2 h-10 w-10 object-contain" />}
          <div className="text-lg font-extrabold leading-tight">{settings.name}</div>
          <div className="text-xs text-slate-600 print:text-black">{settings.address}</div>
          {settings.phone && <div className="text-xs text-slate-600 print:text-black">Mobile #: {settings.phone}</div>}
        </div>

        <hr className="my-2 border-dashed" />
        <div className="text-center text-sm font-semibold underline">Diagnostic Token</div>

        <div className="mt-2 flex flex-wrap justify-between gap-1 text-xs text-slate-700">
          <div>User: {user || getCurrentUser()}</div>
          <div>{dt.toLocaleDateString()} {dt.toLocaleTimeString()}</div>
        </div>

        <hr className="my-2 border-dashed" />

        <div className="space-y-1 text-sm text-slate-800">
          <Row label="Patient Name:" value={data.patientName || '-'} />
          <Row label="Mobile #:" value={data.phone || '-'} boldValue />
          {data.mrn && <Row label="MR #:" value={data.mrn} />}
          {data.age && <Row label="Age:" value={data.age} />}
          {data.gender && <Row label="Sex:" value={data.gender} />}        
          {(data.guardianName || data.guardianRel) && <Row label="Guardian:" value={`${data.guardianRel ? data.guardianRel + ' ' : ''}${data.guardianName || ''}`.trim()} />}
          {data.cnic && <Row label="CNIC:" value={data.cnic} />}
          {data.address && <Row label="Address:" value={data.address} />}
        </div>

        <div className="my-3 rounded border border-slate-800 p-3 text-center text-xl font-extrabold tracking-widest">{data.tokenNo}</div>

        <div className="mb-2 text-sm font-semibold">Tests</div>
        <div className="mb-2 divide-y divide-slate-200 text-sm">
          {data.tests.map((t, i)=>(
            <div key={i} className="flex items-center justify-between py-1.5">
              <div className="test-item-name">{t.name}</div>
              <div>PKR {Number(t.price||0).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div className="space-y-1 text-sm text-slate-800">
          <Row label="Total Amount:" value={`PKR ${data.subtotal.toLocaleString()}`} />
          <Row label="Discount:" value={`PKR ${Number(data.discount||0).toLocaleString()}`} />
          <Row label="Payable Amount:" value={`PKR ${data.payable.toLocaleString()}`} boldValue />
        </div>

        <hr className="my-2 border-dashed" />
        <div className="text-center text-[11px] text-slate-600 print:text-black">{settings.slipFooter}</div>

        <div className="mt-3 flex items-center justify-end gap-2 print:hidden">
          <button onClick={()=>window.print()} className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white">Print</button>
          <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs">Close</button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        #diagnostic-receipt { font-family: 'Poppins', Arial, sans-serif }
        @media print {
          @page { size: 58mm auto; margin: 0 }
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact }
          body * { visibility: hidden !important }
          /* Print only the slip */
          #diagnostic-receipt, #diagnostic-receipt * { visibility: visible !important }
          /* Keep within printable width: include padding inside width */
          #diagnostic-receipt { position: absolute !important; left: 0; right: 0; top: 0; margin: 0 auto !important; padding: 10px 10px 0 10px !important; width: 300px !important; box-sizing: border-box !important; line-height: 1.45; overflow: visible !important; z-index: 2147483647; font-size: 14px !important }
          /* Force crisp black text for thermal */
          #diagnostic-receipt, #diagnostic-receipt * { color: #000 !important }
          /* Utility to hide elements marked as print:hidden */
          .print\\:hidden { display: none !important }
          /* Slightly upscale common text utility sizes for clarity on thermal */
          #diagnostic-receipt .text-xs{ font-size: 13px !important }
          #diagnostic-receipt .text-sm{ font-size: 14px !important }
          #diagnostic-receipt .text-lg{ font-size: 18px !important }
          #diagnostic-receipt .text-xl{ font-size: 20px !important }
          /* Ensure right column wraps instead of being cut off */
          #diagnostic-receipt .row-value{ max-width: 62% !important; word-break: break-word !important; white-space: normal !important; text-align: right !important }
          #diagnostic-receipt .test-item-name{ max-width: 64% !important; word-break: break-word !important; white-space: normal !important }
          hr { border-color: #000 !important }
        }
      `}</style>
    </div>
  )
}

function Row({ label, value, boldValue }: { label: string; value: string; boldValue?: boolean }){
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2">
      <div className="text-slate-700">{label}</div>
      <div className={`${boldValue ? 'font-semibold ' : ''}row-value min-w-0 break-words text-right`}>{value}</div>
    </div>
  )
}
