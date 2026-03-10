import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import Doctor_IpdReferralForm from '../../components/doctor/Doctor_IpdReferralForm'
import { X } from 'lucide-react'

import ErDailyMonitoring from '../../components/hospital/Hospital_ErDailyMonitoring'
import ErMedication from '../../components/hospital/Hospital_ErMedication'
import ErConsultantNotes from '../../components/hospital/Hospital_ErConsultantNotes'

function Tab({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-sm ${active ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
    >
      {label}
    </button>
  )
}

export default function Hospital_EmergencyChart(){
  const { id } = useParams()
  const navigate = useNavigate()

  const tokenId = String(id || '')

  const [openCharge, setOpenCharge] = useState(false)
  const [editCharge, setEditCharge] = useState<null | { id: string; description: string; qty: number; unitPrice: number }>(null)

  const [tab, setTab] = useState<'monitoring'|'consult'|'meds'|'billing'>('monitoring')

  const [loadingEnc, setLoadingEnc] = useState(false)
  const [encounterId, setEncounterId] = useState<string>('')
  const [mrn, setMrn] = useState<string>('')
  const [charges, setCharges] = useState<Array<{ id: string; description: string; qty: number; unitPrice: number; amount: number; date?: string }>>([])
  const [loadingCharges, setLoadingCharges] = useState(false)
  const [billingTotals, setBillingTotals] = useState<{ total: number; paid: number; pending: number } | null>(null)

  const [svcCatalog, setSvcCatalog] = useState<Array<{ id: string; name: string; price: number }>>([])

  const [toast, setToast] = useState<{ type: 'success'|'error'|'info'; message: string } | null>(null)
  const [confirmDel, setConfirmDel] = useState<{ open: boolean; chargeId: string } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    let cancelled = false
    async function load(){
      if (!tokenId) return
      setLoadingEnc(true)
      try{
        const res: any = await hospitalApi.getToken(tokenId)
        const t: any = res?.token
        const encId = String(t?.encounterId || '')
        const pmrn = String(t?.patientId?.mrn || t?.mrn || '')
        if (!cancelled){
          setEncounterId(encId)
          setMrn(pmrn)
        }
      }catch{
        if (!cancelled){ setEncounterId(''); setMrn('') }
      }finally{
        if (!cancelled) setLoadingEnc(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [tokenId])

  async function reloadCharges(){
    if (!encounterId) { setCharges([]); return }
    setLoadingCharges(true)
    try{
      const res: any = await hospitalApi.listErCharges(encounterId, { limit: 200 })
      const rows: any[] = res?.charges || []
      setCharges(rows.map((c: any) => ({
        id: String(c._id || c.id),
        description: String(c.description || ''),
        qty: Number(c.qty || 0),
        unitPrice: Number(c.unitPrice || 0),
        amount: Number(c.amount || 0),
        date: c.date ? String(c.date) : (c.createdAt ? String(c.createdAt) : ''),
      })))
    }catch{
      setCharges([])
    }finally{
      setLoadingCharges(false)
    }
  }

  async function reloadBillingSummary(){
    if (!encounterId) { setBillingTotals(null); return }
    try{
      const res: any = await hospitalApi.erBillingSummary(encounterId)
      setBillingTotals(res?.totals || null)
    }catch{
      setBillingTotals(null)
    }
  }

  useEffect(() => { reloadCharges(); reloadBillingSummary() }, [encounterId])

  useEffect(() => {
    if (tab !== 'billing' || !encounterId) return
    const t = setInterval(() => {
      reloadBillingSummary().catch(()=>{})
    }, 5000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, encounterId])

  useEffect(() => {
    let cancelled = false
    async function loadSvc(){
      try{
        const res: any = await hospitalApi.listErServices({ active: true, limit: 200 })
        const rows: any[] = res?.services || []
        if (cancelled) return
        setSvcCatalog(rows.map((r:any)=>({ id: String(r._id||r.id), name: String(r.name||''), price: Number(r.price||0) })))
      }catch{
        if (!cancelled) setSvcCatalog([])
      }
    }
    loadSvc()
    return ()=>{ cancelled = true }
  }, [])

  const total = useMemo(() => (charges || []).reduce((s, c) => s + Number(c.amount || 0), 0), [charges])
  const paid = useMemo(() => Number(billingTotals?.paid ?? 0), [billingTotals])
  const pending = useMemo(() => Number(billingTotals?.pending ?? Math.max(0, total - paid)), [billingTotals, total, paid])
  const shownTotal = useMemo(() => Number(billingTotals?.total ?? total), [billingTotals, total])
  const payStatus = useMemo(() => {
    const t = Number(billingTotals?.total ?? total)
    const p = Number(billingTotals?.paid ?? 0)
    const pen = Number(billingTotals?.pending ?? Math.max(0, t - p))
    if (t <= 0) return 'Unpaid'
    if (pen <= 0) return 'Paid'
    if (p > 0) return 'Partial'
    return 'Unpaid'
  }, [billingTotals, total])

  const goReferral = () => {
    setShowReferralDialog(true)
  }

  const [showReferralDialog, setShowReferralDialog] = useState(false)

  const chargesWithAlloc = useMemo(() => {
    const sorted = [...(charges || [])].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0
      const db = b.date ? new Date(b.date).getTime() : 0
      return da - db
    })
    let remainingPaid = Math.max(0, Number(paid || 0))
    const alloc = sorted.map(c => {
      const amt = Math.max(0, Number(c.amount || 0))
      const paidHere = Math.min(amt, remainingPaid)
      const remaining = Math.max(0, amt - paidHere)
      remainingPaid = Math.max(0, remainingPaid - paidHere)
      const rowStatus = amt <= 0 ? 'Unpaid' : remaining <= 0 ? 'Paid' : paidHere > 0 ? 'Partial' : 'Unpaid'
      return { ...c, rowPaid: paidHere, rowRemaining: remaining, rowStatus }
    })
    const byId = new Map(alloc.map(a => [a.id, a]))
    return (charges || []).map(c => byId.get(c.id) || ({ ...c, rowPaid: 0, rowRemaining: Number(c.amount || 0), rowStatus: 'Unpaid' } as any))
  }, [charges, paid])

  const discharge = () => {
    navigate(`/hospital/discharge/${tokenId || ''}`)
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">Emergency Token #{tokenId || '-'}</div>
            <div className="mt-1 text-sm text-slate-600">This page will use ER encounter APIs after backend confirmation.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={goReferral} className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700">Refer to IPD</button>
            <button onClick={discharge} className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700">Discharge</button>
            <button onClick={()=>navigate('/hospital/emergency')} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back</button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1">
          <Tab label="Daily Monitoring" active={tab==='monitoring'} onClick={()=>setTab('monitoring')} />
          <Tab label="Consultant Notes" active={tab==='consult'} onClick={()=>setTab('consult')} />
          <Tab label="Medication" active={tab==='meds'} onClick={()=>setTab('meds')} />
          <Tab label="Billing" active={tab==='billing'} onClick={()=>setTab('billing')} />
        </div>
      </div>

      {tab==='monitoring' && (<ErDailyMonitoring encounterId={encounterId} />)}
      {tab==='consult' && (<ErConsultantNotes encounterId={encounterId} />)}
      {tab==='meds' && (<ErMedication encounterId={encounterId} />)}
      {tab==='billing' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="mb-1 text-sm font-semibold text-slate-800">ER Billing</div>
                <div className="text-xs text-slate-500">Token: {tokenId || '-'} {mrn ? `• MRN: ${mrn}` : ''}</div>
                {encounterId && (
                  <div className="mt-1 text-xs">
                    <span className="text-slate-500">Status: </span>
                    <span className={payStatus==='Paid' ? 'font-semibold text-emerald-700' : payStatus==='Partial' ? 'font-semibold text-amber-700' : 'font-semibold text-rose-700'}>{payStatus}</span>
                    <span className="ml-2 text-slate-500">(Total Rs{Number(shownTotal||0).toFixed(0)} / Paid Rs{Number(paid||0).toFixed(0)} / Pending Rs{Number(pending||0).toFixed(0)})</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button disabled={!encounterId || loadingEnc} onClick={()=>setOpenCharge(true)} className="btn disabled:opacity-50">Add Service</button>
                <button disabled={!encounterId || loadingCharges} onClick={async()=>{ await reloadCharges(); await reloadBillingSummary() }} className="btn-outline-navy disabled:opacity-50">Refresh</button>
              </div>
            </div>

            {!encounterId ? (
              <div className="mt-3 text-sm text-rose-600">{loadingEnc ? 'Loading encounter…' : 'Encounter not found for this token.'}</div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Service</th>
                      <th className="px-3 py-2 font-medium">Qty</th>
                      <th className="px-3 py-2 font-medium">Rate</th>
                      <th className="px-3 py-2 font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Paid</th>
                      <th className="px-3 py-2 font-medium">Remaining</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loadingCharges ? (
                      <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>
                    ) : chargesWithAlloc.length === 0 ? (
                      <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">No services added.</td></tr>
                    ) : chargesWithAlloc.map((c: any) => (
                      <tr key={c.id}>
                        <td className="px-3 py-2 text-xs text-slate-500">{c.date ? new Date(c.date).toLocaleString() : '-'}</td>
                        <td className="px-3 py-2">{c.description}</td>
                        <td className="px-3 py-2">{c.qty}</td>
                        <td className="px-3 py-2">Rs{Number(c.unitPrice||0).toFixed(0)}</td>
                        <td className="px-3 py-2 font-medium">Rs{Number(c.amount||0).toFixed(0)}</td>
                        <td className="px-3 py-2">Rs{Number(c.rowPaid||0).toFixed(0)}</td>
                        <td className="px-3 py-2">Rs{Number(c.rowRemaining||0).toFixed(0)}</td>
                        <td className="px-3 py-2">
                          <span className={c.rowStatus==='Paid' ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700' : c.rowStatus==='Partial' ? 'rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700' : 'rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700'}>
                            {c.rowStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={()=>setEditCharge({ id: c.id, description: c.description, qty: c.qty, unitPrice: c.unitPrice })}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async()=>{
                                setConfirmDel({ open: true, chargeId: c.id })
                              }}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 flex items-center justify-end gap-3 text-sm">
                  <div className="text-slate-600">Total</div>
                  <div className="text-base font-semibold text-slate-900">Rs{Number(total||0).toFixed(0)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {editCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={async (e)=>{
              e.preventDefault()
              try{
                const fd = new FormData(e.currentTarget)
                const description = String(fd.get('description') || '').trim()
                const qty = Number(fd.get('qty') || 1)
                const unitPrice = Number(fd.get('unitPrice') || 0)
                if (!description){ setToast({ type: 'error', message: 'Service is required' }); return }
                await hospitalApi.updateErCharge(editCharge.id, { description, qty, unitPrice })
                setEditCharge(null)
                await reloadCharges()
                await reloadBillingSummary()
                setToast({ type: 'success', message: 'Service updated' })
              }catch(err:any){
                setToast({ type: 'error', message: err?.message || 'Failed to update service' })
              }
            }}
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
          >
            <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Edit Service</div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <label className="block text-xs font-medium text-slate-600">Service</label>
              <input
                name="description"
                defaultValue={editCharge.description}
                placeholder="Select or type service"
                list="er-service-suggestions"
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                onChange={(e)=>{
                  try{
                    const v = String(e.currentTarget.value||'').trim().toLowerCase()
                    const m = svcCatalog.find(s => String(s.name||'').trim().toLowerCase() === v)
                    if (!m) return
                    const form = e.currentTarget.form
                    const amtEl = form?.querySelector<HTMLInputElement>('input[name="unitPrice"]')
                    if (amtEl && (!amtEl.value || Number(amtEl.value) === 0)) amtEl.value = String(m.price || 0)
                  }catch{}
                }}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Qty</label>
                  <input name="qty" type="number" defaultValue={editCharge.qty} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Rate</label>
                  <input name="unitPrice" type="number" defaultValue={editCharge.unitPrice} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>setEditCharge(null)} className="btn-outline-navy">Cancel</button>
              <button type="submit" className="btn">Save</button>
            </div>
          </form>
        </div>
      )}

      {confirmDel?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Confirm</div>
            <div className="px-5 py-4 text-sm text-slate-700">Delete this service charge?</div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>setConfirmDel(null)} className="btn-outline-navy">Cancel</button>
              <button
                type="button"
                onClick={async()=>{
                  const id = confirmDel.chargeId
                  setConfirmDel(null)
                  try{
                    await hospitalApi.deleteErCharge(id)
                    await reloadCharges()
                    await reloadBillingSummary()
                    setToast({ type: 'success', message: 'Deleted' })
                  }catch(e:any){
                    setToast({ type: 'error', message: e?.message || 'Failed to delete' })
                  }
                }}
                className="btn"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {openCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={async (e)=>{
              e.preventDefault()
              if (!encounterId) return
              const fd = new FormData(e.currentTarget)
              const description = String(fd.get('description') || '').trim()
              const qty = Number(fd.get('qty') || 1)
              const unitPrice = Number(fd.get('unitPrice') || 0)
              if (!description){ setToast({ type: 'error', message: 'Service is required' }); return }
              try{
                await hospitalApi.createErCharge(encounterId, { description, qty, unitPrice, billedBy: 'hospital' })
                setOpenCharge(false)
                await reloadCharges()
                await reloadBillingSummary()
                setToast({ type: 'success', message: 'Service added' })
              }catch(e: any){
                setToast({ type: 'error', message: e?.message || 'Failed to add service' })
              }
            }}
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
          >
            <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Service</div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-600">Service</label>
                <input
                  name="description"
                  placeholder="Select or type service"
                  list="er-service-suggestions"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  onChange={(e)=>{
                    try{
                      const v = String(e.currentTarget.value||'').trim().toLowerCase()
                      const m = svcCatalog.find(s => String(s.name||'').trim().toLowerCase() === v)
                      if (!m) return
                      const form = e.currentTarget.form
                      const amtEl = form?.querySelector<HTMLInputElement>('input[name="unitPrice"]')
                      if (amtEl) amtEl.value = String(m.price || 0)
                    }catch{}
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Qty</label>
                  <input name="qty" type="number" defaultValue={1} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Rate</label>
                  <input name="unitPrice" type="number" defaultValue={0} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>setOpenCharge(false)} className="btn-outline-navy">Cancel</button>
              <button type="submit" className="btn">Add</button>
            </div>
          </form>
        </div>
      )}

      {showReferralDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div className="font-semibold text-slate-800">Refer to IPD</div>
              <button
                type="button"
                onClick={() => setShowReferralDialog(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              <Doctor_IpdReferralForm
                mrn={mrn || ''}
                onSaved={() => {
                  setShowReferralDialog(false)
                  setToast({ type: 'success', message: 'IPD referral created successfully' })
                }}
              />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed right-4 top-16 z-[60] max-w-sm">
          <div className={toast.type==='success' ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow' : toast.type==='error' ? 'rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow' : 'rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow'}>
            <div className="flex items-start justify-between gap-3">
              <div>{toast.message}</div>
              <button type="button" className="text-slate-500 hover:text-slate-700" onClick={()=>setToast(null)}>×</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
