import { useEffect, useMemo, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export type SalarySlipExpense = {
  id?: string
  _id?: string
  dateIso?: string
  datetime?: string
  category?: string
  description?: string
  note?: string
  amount?: number
  createdBy?: string
}

type Props = {
  open: boolean
  onClose: () => void
  expense: SalarySlipExpense | null
  staffName?: string
  month?: string
  basicSalary?: number
  netSalary?: number
  paidToDate?: number
}

export default function Hospital_SalarySlipDialog({ open, onClose, expense, staffName, month, basicSalary, netSalary, paidToDate }: Props){
  const [info, setInfo] = useState<{ name: string; phone: string; address: string; footer: string; logo: string }>({ name: 'HOSPITAL', phone: '', address: '', footer: '', logo: '' })

  useEffect(()=>{
    if (!open) return
    let mounted = true
    ;(async()=>{
      try {
        const s: any = await hospitalApi.getSettings()
        if (!mounted) return
        setInfo({
          name: s?.name || 'HOSPITAL',
          phone: s?.phone || '',
          address: s?.address || '',
          footer: s?.slipFooter || '',
          logo: s?.logoDataUrl || '',
        })
      } catch {}
    })()
    return ()=>{ mounted = false }
  }, [open])

  const eid = useMemo(()=> String((expense?._id || expense?.id) || ''), [expense])
  const createdBy = useMemo(()=> String(expense?.createdBy || ''), [expense])
  const parsedFromNote = useMemo(()=>{
    const note = String(expense?.note || expense?.description || '')
    const m = note.match(/Salary\s*\((?:full|half|custom)\)\s*for\s*(.+?)\s*—\s*(\d{4}-\d{2})/i)
    return { staff: m?.[1]?.trim(), mon: m?.[2] }
  }, [expense])
  const staff = useMemo(()=> staffName || parsedFromNote.staff || '', [staffName, parsedFromNote])
  const mon = useMemo(()=> month || parsedFromNote.mon || '', [month, parsedFromNote])
  const dateStr = useMemo(()=> {
    if ((expense as any)?.date) return (expense as any).date
    if (expense?.dateIso) return expense.dateIso
    if (expense?.datetime) try { return new Date(expense.datetime).toISOString().slice(0,10) } catch {}
    return new Date().toISOString().slice(0,10)
  }, [expense])
  const paid = useMemo(()=> Number(expense?.amount || 0), [expense])
  const remaining = useMemo(()=> {
    const net = Number(netSalary ?? 0)
    const pd = Number(paidToDate ?? 0)
    if (!net) return undefined as number | undefined
    return Math.max(0, net - pd)
  }, [netSalary, paidToDate])

  if (!open) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        #hospital-salary-slip { font-family: 'Poppins', Arial, sans-serif }
        .tabular-nums { font-variant-numeric: tabular-nums }
        @media print {
          @page { size: 80mm auto; margin: 0 }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact }
          body * { visibility: hidden !important }
          #hospital-salary-slip, #hospital-salary-slip * { visibility: visible !important }
          #hospital-salary-slip { position: absolute !important; left: 0; right: 0; top: 0; margin: 0 auto !important; padding: 0 6px !important; width: 440px !important; box-sizing: content-box !important; line-height: 1.25; overflow: visible !important; z-index: 2147483647 }
          .no-print { display: none !important }
          .only-print { display: block !important }
          #hospital-salary-slip hr { border-color: #000 !important }
          #hospital-salary-slip, #hospital-salary-slip * { color: #000 !important }
        }
      `}</style>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-6 print:static print:p-0 print:bg-white" role="dialog" aria-modal="true">
        <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 print:shadow-none print:ring-0 print:rounded-none print:max-w-none print:bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 print:hidden no-print">
            <div className="font-medium text-slate-900">Salary Payment Slip</div>
            <div className="flex items-center gap-2">
              <button onClick={() => window.print()} className="btn-outline-navy">Print</button>
              <button onClick={onClose} className="btn-outline-navy">Close</button>
            </div>
          </div>

          <div className="max-h-[75vh] overflow-y-auto px-6 py-6 print:p-0 print:overflow-visible">
            <div id="hospital-salary-slip" className="mx-auto w-[440px] print:w-[440px]">
              <div className="text-center">
                {info.logo ? <img src={info.logo} alt="Logo" className="mx-auto mb-2 h-12 w-12 object-contain" /> : null}
                <div className="text-xl font-bold tracking-wide print:text-black">{info.name}</div>
                {info.address && <div className="text-xs text-slate-600 print:text-black">{info.address}</div>}
                {info.phone && <div className="text-xs text-slate-600 print:text-black">PHONE : {info.phone}</div>}
              </div>

              <hr className="my-3 border-dashed" />
              <div className="text-center font-medium print:text-black">Salary Payment Slip</div>

              <div className="mt-2 text-xs text-slate-700 print:text-black space-y-1">
                <div className="flex items-center justify-between"><div>Date</div><div>{dateStr}</div></div>
                {mon && (<div className="flex items-center justify-between"><div>Month</div><div>{mon}</div></div>)}
                {staff && (<div className="flex items-center justify-between"><div>Staff</div><div>{staff}</div></div>)}
                {eid ? (<div className="flex items-center justify-between"><div>Expense ID</div><div className="font-mono text-[11px]">{eid}</div></div>) : null}
                {createdBy ? (<div className="flex items-center justify-between"><div>User</div><div>{createdBy}</div></div>) : null}
              </div>

              <div className="mt-3 border-t border-dashed pt-2 text-sm print:text-black space-y-1">
                {basicSalary!=null ? (<div className="flex items-center justify-between"><div>Basic Salary</div><div className="font-medium">PKR {Number(basicSalary||0).toLocaleString()}</div></div>) : null}
                {netSalary!=null ? (<div className="flex items-center justify-between"><div>Net Salary</div><div className="font-semibold text-emerald-700">PKR {Number(netSalary||0).toLocaleString()}</div></div>) : null}
                <div className="flex items-center justify-between"><div>Amount Paid</div><div className="font-semibold">PKR {Number(paid||0).toLocaleString()}</div></div>
                {paidToDate!=null ? (<div className="flex items-center justify-between"><div>Paid To Date</div><div>PKR {Number(paidToDate||0).toLocaleString()}</div></div>) : null}
                {remaining!=null ? (<div className="flex items-center justify-between"><div>Remaining</div><div>PKR {Number(remaining||0).toLocaleString()}</div></div>) : null}
              </div>

              {(expense?.note || expense?.description) ? (
                <div className="mt-3 border-t border-dashed pt-2 text-xs text-slate-700 break-words print:text-black">{expense?.note || expense?.description}</div>
              ) : null}

              {info.footer ? (
                <>
                  <hr className="my-3 border-dashed" />
                  <div className="text-center text-xs text-slate-600 print:text-black">{info.footer}</div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
