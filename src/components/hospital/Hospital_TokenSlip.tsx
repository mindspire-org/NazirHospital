import { useEffect, useRef, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export type TokenSlipData = {
  tokenNo: string
  departmentName: string
  doctorName?: string
  patientName: string
  phone?: string
  age?: string
  gender?: string
  mrn?: string
  guardianRel?: string
  guardianName?: string
  cnic?: string
  address?: string
  amount: number
  discount: number
  payable: number
  createdAt?: string
  fbr?: { status?: string; qrCode?: string; fbrInvoiceNo?: string; mode?: string; error?: string }
}

let settingsCache: any | null = null

function getCurrentUser(){
  try {
    const h = localStorage.getItem('hospital.session')
    if (h) return (JSON.parse(h)?.username || JSON.parse(h)?.name || '').toString()
  } catch {}
  try {
    const d = localStorage.getItem('doctor.session')
    if (d) return (JSON.parse(d)?.username || JSON.parse(d)?.name || '').toString()
  } catch {}
  return 'admin'
}

export default function Hospital_TokenSlip({ open, onClose, data, autoPrint = false, user }: { open: boolean; onClose: ()=>void; data: TokenSlipData; autoPrint?: boolean; user?: string }){
  const [settings, setSettings] = useState({ name: 'Hospital Name', phone: '', address: '', logoDataUrl: '', slipFooter: 'Powered by Hospital MIS' })
  const printedRef = useRef(false)

  useEffect(() => { printedRef.current = false }, [open])

  useEffect(() => {
    let cancelled = false
    async function load(){
      try {
        if (!settingsCache) settingsCache = await hospitalApi.getSettings()
        if (!cancelled && settingsCache) {
          const s: any = settingsCache
          setSettings({
            name: s.name || 'Hospital Name',
            phone: s.phone || '',
            address: s.address || '',
            logoDataUrl: s.logoDataUrl || '',
            slipFooter: s.slipFooter || 'Powered by Hospital MIS',
          })
        }
      } catch {}
    }
    if (open) load()
    return () => { cancelled = true }
  }, [open])

  useEffect(() => {
    if (!open || !autoPrint || printedRef.current) return
    const t = setTimeout(() => { window.print(); printedRef.current = true }, 300)
    return () => clearTimeout(t)
  }, [open, autoPrint, settings.name, settings.address, settings.phone, settings.logoDataUrl, settings.slipFooter])

  if (!open) return null
  const dt = data.createdAt ? new Date(data.createdAt) : new Date()

  const fbrStatus = String(data?.fbr?.status || '').toUpperCase().trim()
  const isFbrSuccess = fbrStatus === 'SUCCESS' && Boolean(data?.fbr?.qrCode)
  const isFbrDisabled = !data?.fbr || !fbrStatus
  const showFbrSection = !isFbrDisabled

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:bg-white print:static">
      <div id="hospital-receipt" className="max-h-[80vh] w-[360px] overflow-y-auto rounded-md border border-slate-300 bg-white p-4 shadow print:max-h-none print:overflow-visible print:shadow-none print:border-0 print:w-[300px]">
        {/* Header */}
        <div className="text-center">
          {settings.logoDataUrl && <img src={settings.logoDataUrl} alt="logo" className="mx-auto mb-2 h-10 w-10 object-contain" />}
          <div className="text-lg font-extrabold leading-tight">{settings.name}</div>
          <div className="text-xs text-slate-600 print:text-black">{settings.address}</div>
          {settings.phone && <div className="text-xs text-slate-600 print:text-black">Mobile #: {settings.phone}</div>}
        </div>

        <hr className="my-2 border-dashed" />

        <div className="text-center text-sm font-semibold underline">{data.departmentName ? `${data.departmentName} Token` : 'Token'}</div>

        <div className="mt-2 flex flex-wrap justify-between gap-1 text-xs text-slate-700">
          <div>User: {user || getCurrentUser()}</div>
          <div>{dt.toLocaleDateString()} {dt.toLocaleTimeString()}</div>
        </div>

        <hr className="my-2 border-dashed" />

        <div className="space-y-1 text-sm text-slate-800">
          <Row label="Doctor Name:" value={data.doctorName || '-'} />
          <Row label="Department:" value={data.departmentName || '-'} />
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

        <div className="space-y-1 text-sm text-slate-800">
          <Row label="Total Amount:" value={data.amount.toFixed(2)} />
          <Row label="Discount:" value={(data.discount || 0).toFixed(2)} />
          <Row label="Payable Amount:" value={data.payable.toFixed(2)} boldValue />
        </div>

        {showFbrSection ? (
          <>
            <hr className="my-2 border-dashed" />

            <div className="text-center text-sm font-semibold underline">FBR</div>
            <div className="mt-2 text-center">
              {isFbrSuccess ? (
                <img src={data.fbr!.qrCode} alt="FBR QR" className="mx-auto h-24 w-24 object-contain" />
              ) : (
                <div className="text-sm font-semibold text-rose-600 print:text-black">FBR FAILED</div>
              )}
            </div>
            <div className="mt-1 space-y-0.5 text-[11px] text-slate-700 print:text-black">
              <div>FBR No: {data?.fbr?.fbrInvoiceNo || '—'}</div>
              <div>Mode: {data?.fbr?.mode || '—'}</div>
              <div>Error: {data?.fbr?.error || '—'}</div>
            </div>
          </>
        ) : null}

        <hr className="my-2 border-dashed" />

        <div className="text-center text-[11px] text-slate-600">{settings.slipFooter || 'Powered by Hospital MIS'}</div>

        <div className="mt-3 flex items-center justify-end gap-2 print:hidden">
          <button onClick={()=>window.print()} className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white">Print</button>
          <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs">Close</button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        #hospital-receipt { font-family: 'Poppins', Arial, sans-serif }
        @media print {
          @page { size: 58mm auto; margin: 0 }
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact }
          body * { visibility: hidden !important }
          /* print only receipt */
          #hospital-receipt, #hospital-receipt * { visibility: visible !important }
          #hospital-receipt { position: absolute !important; left: 0; right: 0; top: 0; margin: 0 auto !important; padding: 10px 10px 0 10px !important; width: 300px !important; box-sizing: border-box !important; line-height: 1.45; overflow: visible !important; z-index: 2147483647; font-size: 14px !important }
          #hospital-receipt, #hospital-receipt * { color: #000 !important }
          .print\\:hidden { display: none !important }
          #hospital-receipt .text-xs{ font-size: 13px !important }
          #hospital-receipt .text-sm{ font-size: 14px !important }
          #hospital-receipt .text-lg{ font-size: 18px !important }
          #hospital-receipt .text-xl{ font-size: 20px !important }
          #hospital-receipt .row-value{ max-width: 62% !important; word-break: break-word !important; white-space: normal !important; text-align: right !important }
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
