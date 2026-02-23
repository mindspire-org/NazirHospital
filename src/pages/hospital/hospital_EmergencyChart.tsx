import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import DailyMonitoring from '../../components/hospital/Hospital_IpdDailyMonitoring'
import Medication from '../../components/hospital/Hospital_IpdMedication'
import ConsultantNotes from '../../components/hospital/Hospital_IpdConsultantNotes'
import Doctor_IpdReferralForm from '../../components/doctor/Doctor_IpdReferralForm'

import { hospitalApi } from '../../utils/api'

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

  const [openReferral, setOpenReferral] = useState(false)
  const [openCharge, setOpenCharge] = useState(false)

  const [tab, setTab] = useState<'monitoring'|'consult'|'meds'|'billing'>('monitoring')

  const [loadingEnc, setLoadingEnc] = useState(false)
  const [encounterId, setEncounterId] = useState<string>('')
  const [mrn, setMrn] = useState<string>('')
  const [charges, setCharges] = useState<Array<{ id: string; description: string; qty: number; unitPrice: number; amount: number; date?: string }>>([])
  const [loadingCharges, setLoadingCharges] = useState(false)

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

  useEffect(() => { reloadCharges() }, [encounterId])

  const total = useMemo(() => (charges || []).reduce((s, c) => s + Number(c.amount || 0), 0), [charges])

  const goReferral = () => {
    setOpenReferral(true)
  }

  const discharge = () => {
    alert('Discharge forms will be wired after backend confirmation')
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

      {tab==='monitoring' && (<DailyMonitoring encounterId={encounterId} />)}
      {tab==='consult' && (<ConsultantNotes encounterId={encounterId} />)}
      {tab==='meds' && (<Medication encounterId={encounterId} />)}
      {tab==='billing' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="mb-1 text-sm font-semibold text-slate-800">ER Billing</div>
                <div className="text-xs text-slate-500">Token: {tokenId || '-'} {mrn ? `• MRN: ${mrn}` : ''}</div>
              </div>
              <div className="flex items-center gap-2">
                <button disabled={!encounterId || loadingEnc} onClick={()=>setOpenCharge(true)} className="btn disabled:opacity-50">Add Service</button>
                <button disabled={!encounterId || loadingCharges} onClick={reloadCharges} className="btn-outline-navy disabled:opacity-50">Refresh</button>
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
                      <th className="px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loadingCharges ? (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>
                    ) : charges.length === 0 ? (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No services added.</td></tr>
                    ) : charges.map(c => (
                      <tr key={c.id}>
                        <td className="px-3 py-2 text-xs text-slate-500">{c.date ? new Date(c.date).toLocaleString() : '-'}</td>
                        <td className="px-3 py-2">{c.description}</td>
                        <td className="px-3 py-2">{c.qty}</td>
                        <td className="px-3 py-2">Rs{Number(c.unitPrice||0).toFixed(0)}</td>
                        <td className="px-3 py-2 font-medium">Rs{Number(c.amount||0).toFixed(0)}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={async()=>{
                              if (!confirm('Remove this service?')) return
                              try{ await hospitalApi.deleteErCharge(c.id); await reloadCharges() }catch(e:any){ alert(e?.message || 'Failed to remove') }
                            }}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                          >
                            Remove
                          </button>
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
              if (!description){ alert('Service is required'); return }
              try{
                await hospitalApi.createErCharge(encounterId, { type: 'service', description, qty, unitPrice })
                setOpenCharge(false)
                await reloadCharges()
              }catch(err:any){
                alert(err?.message || 'Failed to add service')
              }
            }}
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
          >
            <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Add Service</div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <label className="block text-xs font-medium text-slate-600">Service</label>
              <input name="description" placeholder="Select or type service" className="w-full rounded-md border border-slate-300 px-3 py-2" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Qty</label>
                  <input name="qty" type="number" defaultValue={1} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Rate</label>
                  <input name="unitPrice" type="number" defaultValue={0} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={()=>setOpenCharge(false)} className="btn-outline-navy">Cancel</button>
              <button type="submit" className="btn">Save</button>
            </div>
          </form>
        </div>
      )}

      {openReferral && (
        <div id="referral-print" className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-2 sm:px-4">
          <style>{`@media print { body * { visibility: hidden !important; } #referral-print, #referral-print * { visibility: visible !important; } #referral-print { position: static !important; inset: auto !important; background: transparent !important; } }`}</style>
          <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-base font-semibold text-slate-900">Refer to IPD</div>
              <div className="flex items-center gap-2">
                <button onClick={()=>window.print()} className="btn-outline-navy">Print</button>
                <button onClick={()=>setOpenReferral(false)} className="btn">Close</button>
              </div>
            </div>
            <div className="max-h-[85vh] overflow-y-auto p-3 sm:p-4">
              <Doctor_IpdReferralForm
                mrn={mrn || undefined}
                doctor={undefined}
                onSaved={() => {
                  setOpenReferral(false)
                  try { navigate('/hospital/ipd-referrals') } catch {}
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
