import { useEffect, useMemo, useState } from 'react'
import { hospitalApi, labApi } from '../../utils/api'
import { previewIpdReferralPdf } from '../../utils/ipdReferralPdf'

export default function Hospital_IPDReferrals(){
  const [status, setStatus] = useState<'New'|'Accepted'|'Rejected'|'Admitted'|''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [openAdmit, setOpenAdmit] = useState<{ open: boolean; id?: string }|null>(null)
  const [admitForm, setAdmitForm] = useState({ departmentId: '', doctorId: '', bedId: '', wardId: '', deposit: '', tokenFee: '' })
  const [deps, setDeps] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [beds, setBeds] = useState<any[]>([])

  useEffect(()=>{ load() }, [status])
  useEffect(()=>{ (async()=>{ try{ const [a,b] = await Promise.all([hospitalApi.listDepartments() as any, hospitalApi.listDoctors() as any]); setDeps((a?.departments||a)||[]); setDocs((b?.doctors||b)||[]);}catch{}})() }, [])
  useEffect(()=>{ if (openAdmit?.open) loadBeds() }, [openAdmit])

  async function loadBeds(){
    try{
      const res = await hospitalApi.listBeds({ status: 'available' }) as any
      setBeds((res?.beds||res||[]) as any[])
    }catch{ setBeds([]) }
  }

  // Removed legacy view dialog; printing goes directly to PDF preview

  async function printReferral(id: string){
    try{
      const s: any = await hospitalApi.getSettings()
      const settings = { name: s?.name || 'Hospital', address: s?.address || '', phone: s?.phone || '', logoDataUrl: s?.logoDataUrl || '' }
      let ref: any = null
      try { const r = await hospitalApi.getIpdReferralById(id) as any; ref = r?.referral || r } catch {}
      if (!ref) {
        ref = rows.find(r=> String(r._id||r.id)===String(id))
        if (!ref){
          try { const arr = JSON.parse(localStorage.getItem('hospital.ipd.referrals')||'[]') as any[]; ref = arr.find(x=> String(x._id||x.id)===String(id)) } catch {}
        }
      }
      if (!ref) { alert('Referral not found'); return }
      const snap = ref.patientSnapshot || ref.patient || {}
      let patient = {
        name: snap.fullName || snap.name || '-',
        mrn: snap.mrn || snap.mrNumber || '-',
        gender: snap.gender || '-',
        fatherName: snap.fatherHusbandName || snap.fatherName || '',
        age: snap.age || '',
        phone: snap.phone || snap.phoneNormalized || '',
        address: snap.address || '',
        cnic: snap.cnic || (snap as any)?.cnicNormalized || '',
      }
      if (!patient.cnic && patient.mrn){
        try { const resp: any = await labApi.getPatientByMrn(patient.mrn); const lp = resp?.patient; if (lp) patient.cnic = lp.cnic || lp.cnicNormalized || patient.cnic; if (!patient.address) patient.address = lp?.address || patient.address; if (!patient.phone) patient.phone = lp?.phone || lp?.phoneNormalized || patient.phone } catch {}
      }
      const referral = {
        date: ref.referralDate || ref.createdAt,
        time: ref.referralTime,
        reason: ref.reasonOfReferral,
        provisionalDiagnosis: ref.provisionalDiagnosis,
        vitals: ref.vitals || {},
        referredTo: { department: ref?.referredTo?.departmentName || '', doctor: ref?.referredTo?.doctorName || '' },
        condition: { stability: ref?.condition?.stability, consciousness: ref?.condition?.consciousness },
        remarks: ref.remarks,
        referredBy: ref?.referredBy?.doctorName,
      }
      await previewIpdReferralPdf({ settings, patient, referral })
    }catch(e:any){ alert(e?.message || 'Failed to open print preview') }
  }

  async function load(){
    setLoading(true)
    try{
      const res = await hospitalApi.listIpdReferrals({ status: status||undefined, q: q||undefined, from: from||undefined, to: to||undefined, limit: 100 }) as any
      const items = (res?.items || res?.referrals || res || []) as any[]
      setRows(items)
    }catch{
      try{
        const raw = localStorage.getItem('hospital.ipd.referrals')||'[]'
        let items = JSON.parse(raw) as any[]
        if (status) items = items.filter(r => r.status === status)
        if (q) { const qq = q.toLowerCase(); items = items.filter(r=>`${r.serial} ${r?.patientSnapshot?.fullName||''} ${r?.patientSnapshot?.mrn||''}`.toLowerCase().includes(qq)) }
        if (from) { const dd = new Date(from).getTime(); items = items.filter(r=> new Date(r.referralDate||r.createdAt).getTime() >= dd) }
        if (to) { const dd = new Date(to).getTime()+86400000-1; items = items.filter(r=> new Date(r.referralDate||r.createdAt).getTime() <= dd) }
        setRows(items)
      }catch{ setRows([]) }
    }finally{ setLoading(false) }
  }

  async function accept(id: string){
    try{ await hospitalApi.updateIpdReferralStatus(id, 'accept'); await load() }catch{ updateLocal(id, { status: 'Accepted' }); await load() }
  }
  async function reject(id: string){
    try{ await hospitalApi.updateIpdReferralStatus(id, 'reject'); await load() }catch{ updateLocal(id, { status: 'Rejected' }); await load() }
  }
  function updateLocal(id: string, patch: any){
    try{
      const key = 'hospital.ipd.referrals'
      const arr = JSON.parse(localStorage.getItem(key)||'[]') as any[]
      const idx = arr.findIndex(x=> String(x._id||x.id)===String(id))
      if (idx>=0){ arr[idx] = { ...arr[idx], ...patch }; localStorage.setItem(key, JSON.stringify(arr)) }
    }catch{}
  }

  function numericDate(s?: string){ if(!s) return ''; const d = new Date(s); return isNaN(d as any) ? '' : d.toLocaleDateString() }
  function formatTime(hm?: string){ return hm || '' }

  const filtered = useMemo(()=> rows, [rows])

  async function admitSubmit(e: React.FormEvent){
    e.preventDefault()
    const id = openAdmit?.id; if (!id) return
    const f = admitForm
    try{
      await hospitalApi.admitFromReferral(id, { departmentId: f.departmentId, doctorId: f.doctorId || undefined, bedId: f.bedId || undefined, wardId: f.wardId || undefined, deposit: f.deposit? Number(f.deposit): undefined, tokenFee: f.tokenFee? Number(f.tokenFee): undefined })
    }catch{
      // fallback: read referral and call admitIPD
      try{
        const ref = rows.find(r=> String(r._id||r.id)===String(id))
        const pid = String(ref?.patientId?._id || ref?.patientId || '')
        if (pid && f.departmentId){ await hospitalApi.admitIPD({ patientId: pid, departmentId: f.departmentId, doctorId: f.doctorId || undefined, bedId: f.bedId || undefined, deposit: f.deposit? Number(f.deposit): undefined }); updateLocal(id, { status: 'Admitted' }) }
      }catch{}
    }
    setOpenAdmit(null); setAdmitForm({ departmentId: '', doctorId: '', bedId: '', wardId: '', deposit: '', tokenFee: '' }); await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold text-slate-900">IPD Referrals</div>
        <div className="text-sm text-slate-600">{loading? 'Loading…' : `${filtered.length} item(s)`}</div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-6 items-end">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Status</label>
            <select value={status} onChange={e=>setStatus(e.target.value as any)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">All</option>
              <option>New</option>
              <option>Accepted</option>
              <option>Rejected</option>
              <option>Admitted</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">From</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">To</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Search</label>
            <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ load() } }} placeholder="serial / patient / MRN" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <button onClick={load} className="btn w-full">Apply</button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-2">Serial</th>
                <th className="px-4 py-2">MRN</th>
                <th className="px-4 py-2">Patient</th>
                <th className="px-4 py-2">Reason</th>
                <th className="px-4 py-2">Diagnosis</th>
                <th className="px-4 py-2">Referred To</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtered.map(r=>{
                const id = String(r._id||r.id)
                const p = r.patientSnapshot || r.patient || {}
                const mrn = p.mrn || p.mrNumber || '-'
                const name = p.fullName || p.name || '-'
                const refTo = r.referredTo?.departmentName || r.referredTo?.doctorName || r.referredTo?.departmentId || r.referredTo?.doctorId || '-'
                return (
                  <tr key={id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-mono text-xs">{r.serial || id.slice(-6)}</td>
                    <td className="px-4 py-2">{mrn}</td>
                    <td className="px-4 py-2 capitalize">{name}</td>
                    <td className="px-4 py-2">{r.reasonOfReferral || '-'}</td>
                    <td className="px-4 py-2">{r.provisionalDiagnosis || '-'}</td>
                    <td className="px-4 py-2">{refTo}</td>
                    <td className="px-4 py-2">{numericDate(r.referralDate || r.createdAt)}</td>
                    <td className="px-4 py-2">{formatTime(r.referralTime)}</td>
                    <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50" onClick={()=>printReferral(id)}>Print</button>
                        {r.status==='New' && (<button className="btn-outline-navy" onClick={()=>accept(id)}>Accept</button>)}
                        {(r.status==='New'||r.status==='Accepted') && (<button className="btn-outline-navy" onClick={()=>reject(id)}>Reject</button>)}
                        {(r.status==='Accepted'||r.status==='New') && (<button className="btn" onClick={()=>{ setOpenAdmit({ open: true, id }); }}>Admit</button>)}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length===0 && (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-500">No referrals</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openAdmit?.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
          <form onSubmit={admitSubmit} className="w-full max-w-md rounded-xl bg-white shadow-xl ring-1 ring-black/5 p-4">
            <div className="text-base font-semibold mb-2">Admit from Referral</div>
            <label className="block text-sm mb-2">
              <span className="block text-slate-600 mb-1">Department</span>
              <select value={admitForm.departmentId} onChange={e=>setAdmitForm(f=>({ ...f, departmentId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
                <option value="">Select department</option>
                {deps.map((d:any)=> (<option key={String(d._id||d.id)} value={String(d._id||d.id)}>{d.name}</option>))}
              </select>
            </label>
            <label className="block text-sm mb-2">
              <span className="block text-slate-600 mb-1">Doctor (optional)</span>
              <select value={admitForm.doctorId} onChange={e=>setAdmitForm(f=>({ ...f, doctorId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2">
                <option value="">Select doctor</option>
                {docs.map((d:any)=> (<option key={String(d._id||d.id)} value={String(d._id||d.id)}>{d.name}</option>))}
              </select>
            </label>
            <div className="grid gap-2">
              <label className="block text-sm"><span className="block text-slate-600 mb-1">Ward ID (optional)</span><input value={admitForm.wardId} onChange={e=>setAdmitForm(f=>({ ...f, wardId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
              <label className="block text-sm">
                <span className="block text-slate-600 mb-1">Bed (available)</span>
                <select value={admitForm.bedId} onChange={e=>{ const v=e.target.value; setAdmitForm(f=>{ const b = beds.find(x=> String(x._id||x.id)===v); return { ...f, bedId: v, tokenFee: (b?.charges!=null? String(b.charges): f.tokenFee) } }) }} className="w-full rounded-md border border-slate-300 px-3 py-2">
                  <option value="">Select bed (optional)</option>
                  {beds.map((b:any)=> (<option key={String(b._id||b.id)} value={String(b._id||b.id)}>{b.label}{b.charges!=null?` — ${b.charges}`:''}</option>))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm"><span className="block text-slate-600 mb-1">Deposit (optional)</span><input type="number" value={admitForm.deposit} onChange={e=>setAdmitForm(f=>({ ...f, deposit: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" /></label>
                <label className="block text-sm"><span className="block text-slate-600 mb-1">Charges (Token Fee)</span><input type="number" value={admitForm.tokenFee} onChange={e=>setAdmitForm(f=>({ ...f, tokenFee: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="auto from bed" /></label>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button type="button" className="btn-outline-navy" onClick={()=>setOpenAdmit(null)}>Cancel</button>
              <button type="submit" className="btn">Admit</button>
            </div>
          </form>
        </div>
      )}

      {/* Legacy view modal removed in favor of direct Print preview */}
    </div>
  )
}

function StatusBadge({ status }: { status?: string }){
  const map: any = { New: 'bg-sky-600', Accepted: 'bg-emerald-600', Rejected: 'bg-rose-600', Admitted: 'bg-slate-700' }
  const cls = map[status||''] || 'bg-slate-500'
  return <span className={`rounded-full px-2 py-0.5 text-white text-xs ${cls}`}>{status||'—'}</span>
}
