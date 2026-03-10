import { useEffect, useRef, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export type DoctorPayoutSlipData = {
  doctorId?: string
  doctorName: string
  amount: number
  method?: string
  memo?: string
  createdByUsername?: string
  createdAt?: string
}

let settingsCache: any | null = null

function getHospitalUser(){
  try{
    const s = localStorage.getItem('hospital.session')
    if (!s) return 'hospital'
    const obj = JSON.parse(s)
    return obj?.username || obj?.name || 'hospital'
  }catch{ return 'hospital' }
}

export default function Hospital_DoctorPayoutSlipDialog({
  open,
  onClose,
  data,
  autoPrint = false,
}: {
  open: boolean
  onClose: ()=>void
  data: DoctorPayoutSlipData
  autoPrint?: boolean
}){
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
    const t = setTimeout(() => { try{ window.print() }catch{}; printedRef.current = true }, 300)
    return () => clearTimeout(t)
  }, [open, autoPrint])

  if (!open) return null

  const dt = (()=>{ try{ return data?.createdAt ? new Date(data.createdAt) : new Date() }catch{ return new Date() } })()
  const performedBy = data?.createdByUsername || getHospitalUser()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:bg-white print:static">
      <div id="hospital-doctor-payout-slip" className="w-[720px] max-w-full rounded-md border border-slate-300 bg-white p-6 shadow print:shadow-none print:border-0 print:w-full">
        <div className="flex items-center gap-3">
          {settings.logoDataUrl && (
            <img src={settings.logoDataUrl} alt="logo" className="h-12 w-12 object-contain" />
          )}
          <div className="flex-1 text-center">
            <div className="text-xl font-extrabold leading-tight">{settings.name}</div>
            <div className="text-xs text-slate-600 print:text-black">{settings.address}</div>
            {settings.phone && <div className="text-xs text-slate-600 print:text-black">Ph: {settings.phone}</div>}
          </div>
          <div className="w-12" />
        </div>

        <hr className="my-3" />
        <div className="text-center text-base font-semibold underline">Doctor Payout Slip</div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-800">
          <div><span className="text-slate-600">Doctor:</span> {data?.doctorName || '-'}</div>
          <div className="text-right"><span className="text-slate-600">Date/Time:</span> {dt.toLocaleDateString()} {dt.toLocaleTimeString()}</div>
          <div><span className="text-slate-600">Method:</span> {data?.method || '-'}</div>
          <div className="text-right"><span className="text-slate-600">User:</span> {performedBy || '-'}</div>
          <div className="col-span-2"><span className="text-slate-600">Memo:</span> {data?.memo || '-'}</div>
        </div>

        <div className="my-5 rounded border-2 border-slate-900 p-4 text-center">
          <div className="text-xs uppercase tracking-wide text-slate-600">Paid Amount</div>
          <div className="mt-1 text-3xl font-extrabold">Rs {Number(data?.amount || 0).toFixed(2)}</div>
        </div>

        <div className="text-center text-xs text-slate-600">{settings.slipFooter || 'Powered by Hospital MIS'}</div>

        <div className="mt-4 flex items-center justify-end gap-2 print:hidden">
          <button onClick={()=>window.print()} className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white">Print</button>
          <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs">Close</button>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm }
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact }
          body * { visibility: hidden !important }
          #hospital-doctor-payout-slip, #hospital-doctor-payout-slip * { visibility: visible !important }
          #hospital-doctor-payout-slip { position: absolute !important; left: 0; right: 0; top: 0; margin: 0 auto !important; width: auto !important; max-width: 190mm !important; box-sizing: border-box !important; overflow: visible !important; z-index: 2147483647; color: #000 !important }
          #hospital-doctor-payout-slip, #hospital-doctor-payout-slip * { color: #000 !important }
          .print\\:hidden { display: none !important }
        }
      `}</style>
    </div>
  )
}
