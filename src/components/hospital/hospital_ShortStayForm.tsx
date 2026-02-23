import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'

type ShortStayForm = {
  patientName?: string
  mrn?: string
  age?: string
  sex?: 'M'|'F'|''
  address?: string
  dateIn?: string
  timeIn?: string
  dateOut?: string
  timeOut?: string
  isOpd?: boolean
  isShortStay?: boolean
  isReferred?: boolean
  admissionTo?: string
  presentingComplaints?: string
  briefHistory?: string
  anyProcedure?: string
  finalDiagnosis?: string
  consultant?: string
  vitals?: { bp?: string; hr?: string; spo2?: string; temp?: string; fhr?: string }
  tests?: { hb?: string; bilirubin?: string; bsr?: string; urea?: string; screat?: string }
  treatmentGiven?: string
  treatmentAtDischarge?: string
  referralCenter?: string
  referralContact?: string
  referralReason?: string
  conditionAtDischarge?: 'Satisfactory'|'Fair'|'Poor'|''
  responseOfTreatment?: 'Excellent'|'Good'|'Average'|'Poor'|''
  followUpInstructions?: string
  doctorName?: string
  signDate?: string
  signTime?: string
}

// UI uses app's standard form styling in-screen; print layout remains custom HTML in printView

type Props = { encounterId?: string; patient?: { name?: string; mrn?: string; address?: string; admitted?: string; endAt?: string } }

export default function Hospital_ShortStayForm(props: Props){
  const { id: routeId = '' } = useParams()
  const [encounterId, setEncounterId] = useState('')
  const [form, setForm] = useState<ShortStayForm>({ vitals: {}, tests: {}, isShortStay: true })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<any>(null)

  useEffect(()=>{ (async()=>{
    try {
      setLoading(true)
      // Prefer encounterId passed from parent (wizard)
      let encId = props.encounterId || ''
      if (encId){
        setEncounterId(encId)
        // Prefill from provided patient snapshot
        setForm(v=>({
          ...v,
          patientName: v.patientName || props.patient?.name || '',
          mrn: v.mrn || props.patient?.mrn || '',
          address: v.address || props.patient?.address || '',
          dateIn: v.dateIn || (props.patient?.admitted ? String(props.patient.admitted).slice(0,10) : ''),
          timeIn: v.timeIn || (props.patient?.admitted ? new Date(props.patient.admitted as any).toISOString().slice(11,16) : ''),
        }))
        // Fetch encounter to enrich with patient age/sex and discharge date
        const e: any = await hospitalApi.getIPDAdmissionById(encId).catch(()=>null)
        const enc = e?.encounter
        const p = enc?.patientId || {}
        if (enc){
          setForm(v=>({
            ...v,
            dateOut: v.dateOut || (enc.endAt? String(enc.endAt).slice(0,10):''),
            timeOut: v.timeOut || (enc.endAt? new Date(enc.endAt).toISOString().slice(11,16):''),
            age: v.age || (p.age || ''),
            sex: v.sex ? v.sex : normSex(p.gender),
          }))
        }
        const ss: any = await hospitalApi.getIpdShortStay(encId).catch(()=>null)
        const data = ss?.shortStay?.data
        if (data) setForm(prev => ({ ...prev, ...data }))
        return
      }
      // Fallback: resolve from route id
      if (!routeId) return
      const e: any = await hospitalApi.getIPDAdmissionById(routeId).catch(()=>null)
      const enc = e?.encounter
      if (enc){
        encId = String(enc._id)
        setEncounterId(encId)
        setForm(v=>({
          ...v,
          patientName: v.patientName || enc.patientId?.fullName || '',
          mrn: v.mrn || enc.patientId?.mrn || '',
          address: v.address || enc.patientId?.address || '',
          dateIn: v.dateIn || (enc.startAt? String(enc.startAt).slice(0,10):''),
          timeIn: v.timeIn || (enc.startAt? new Date(enc.startAt).toISOString().slice(11,16):''),
          dateOut: v.dateOut || (enc.endAt? String(enc.endAt).slice(0,10):''),
          timeOut: v.timeOut || (enc.endAt? new Date(enc.endAt).toISOString().slice(11,16):''),
          age: v.age || (enc.patientId?.age || ''),
          sex: v.sex ? v.sex : normSex(enc.patientId?.gender),
        }))
        const ss: any = await hospitalApi.getIpdShortStay(encId).catch(()=>null)
        const data = ss?.shortStay?.data
        if (data){ setForm(prev => ({ ...prev, ...data })) }
      }
    } finally { setLoading(false) }
  })() }, [props.encounterId, props.patient, routeId])

  // Load hospital settings for print header
  useEffect(()=>{ (async()=>{
    try { const s = await hospitalApi.getSettings().catch(()=>null); if (s) setSettings(s) } catch {}
  })() }, [])

  const admittedAtIso = useMemo(()=>combineIso(form.dateIn, form.timeIn), [form.dateIn, form.timeIn])
  const dischargedAtIso = useMemo(()=>combineIso(form.dateOut, form.timeOut), [form.dateOut, form.timeOut])

  async function save(){
    if (!encounterId) return
    setSaving(true)
    try {
      await hospitalApi.upsertIpdShortStay(encounterId, {
        admittedAt: admittedAtIso,
        dischargedAt: dischargedAtIso,
        data: form,
      })
    } finally { setSaving(false) }
  }

  function printView(){
    const w = window.open('', '_blank'); if (!w) return
    const style = `
      <style>@page{size:A4;margin:12mm}
      body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#111}
      .page{border:2px solid #222;padding:16px}
      .grid{display:grid;gap:8px;align-items:end}
      .line{border-bottom:1px solid #222;min-height:20px}
      .title{font-weight:900;text-align:center;margin:6px 0}
      .t{border:1px solid #222}
      .row2{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:end}
      .lbl{font-weight:700}
      .inline{display:inline-block;border-bottom:1px solid #222;min-height:0;padding:0 2px;width:max-content}
      </style>
    `
    const F = form
    const S = settings||{}
    const logo = S?.logoDataUrl ? `<img src="${S.logoDataUrl}" style="height:60px; object-fit:contain;" />` : ''
    const hdr = `
      <div style="display:grid; grid-template-columns:auto 1fr auto; align-items:center;">
        <div style="justify-self:start;">${logo}</div>
        <div style="text-align:center;">
          <div style="font-size:18px; font-weight:800;">${esc(S?.name||'')}</div>
          <div style="font-size:12px; color:#333;">${esc(S?.address||'')}</div>
          <div style="font-size:12px; color:#333;">${[S?.phone, S?.email].filter(Boolean).map(esc).join(' | ')}</div>
        </div>
        <div></div>
      </div>`
    const lv = (l:string, v?:string)=>`<div class="row2"><div class="lbl">${l}</div><div class="line">${esc(v)}</div></div>`
    const html = `<!doctype html><html><head><meta charset="utf-8"/>${style}</head><body>
      <div class="page">
        ${hdr}
        <div class="title">SHORT STAY FORM</div>
        <div class="grid" style="grid-template-columns:auto 1fr auto 160px auto 100px auto 100px;margin-top:8px"><div class="lbl">Patient's Name:</div><div class="line">${esc(F.patientName)}</div><div class="lbl">MR#</div><div class="line">${esc(F.mrn)}</div><div class="lbl">Age:</div><div class="line">${esc(F.age)}</div><div class="lbl">Sex:</div><div class="line">${esc(F.sex)}</div></div>
        <div class="grid" style="grid-template-columns:auto 1fr auto 160px auto 160px;margin-top:8px"><div class="lbl">Address:</div><div class="line">${esc(F.address)}</div><div class="lbl">Date & Time in</div><div class="line">${esc(fmtDateTime(F.dateIn,F.timeIn))}</div><div class="lbl">Date & time out</div><div class="line">${esc(fmtDateTime(F.dateOut,F.timeOut))}</div></div>
        <div class="grid" style="grid-template-columns:auto 1fr auto 1fr auto 1fr;align-items:center;column-gap:10px;margin-top:8px"><div class="lbl">OPD ${F.isOpd?'☑':'☐'}</div><div></div><div class="lbl">Short Stay ${F.isShortStay?'☑':'☐'}</div><div></div><div class="lbl">Referred ${F.isReferred?'☑':'☐'}</div></div>
        ${lv('Admission to:', F.admissionTo)}${lv('Presenting Complains:', F.presentingComplaints)}${lv('Brief History:', F.briefHistory)}${lv('Any procedure:', F.anyProcedure)}
        <div class="grid" style="grid-template-columns:auto 1fr auto 200px;margin-top:8px"><div class="lbl">Final diagnosis:</div><div class="line">${esc(F.finalDiagnosis)}</div><div class="lbl">Consultant:</div><div class="line">${esc(F.consultant)}</div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">
          <div class="t">${vRow('BP',F.vitals?.bp)}${vRow('HR',F.vitals?.hr)}${vRow('SPO2',F.vitals?.spo2)}${vRow('Temp',F.vitals?.temp)}${vRow('FHR',F.vitals?.fhr)}</div>
          <div class="t"><div style="display:grid;grid-template-columns:1fr 120px"><div style="border-right:1px solid #222;padding:4px 6px;font-weight:700;border-bottom:1px solid #222">Test</div><div style="padding:4px 6px;text-align:center;font-weight:700;border-bottom:1px solid #222">Results</div></div>${tRow('Hb',F.tests?.hb)}${tRow('Bilirubin D/Ind',F.tests?.bilirubin)}${tRow('BSR',F.tests?.bsr)}${tRow('Urea',F.tests?.urea)}${tRow('S,Creat',F.tests?.screat)}</div>
        </div>
        ${lv('Treatment Given at Hospital:', F.treatmentGiven)}${lv('Treatment at Discharge:', F.treatmentAtDischarge)}
        <div class="grid" style="grid-template-columns:auto 1fr auto 200px;margin-top:8px"><div class="lbl">Referred to / center name:</div><div class="line">${esc(F.referralCenter)}</div><div class="lbl">Contact No:</div><div class="line">${esc(F.referralContact)}</div></div>
        ${lv('Reason for referral:', F.referralReason)}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px"><div class="t" style="padding:6px"><div style="font-weight:700;margin-bottom:6px">Condition at Discharge:</div><div>${['Satisfactory','Fair','Poor'].map(x=>`${F.conditionAtDischarge===x?'☑':'☐'} ${x}`).join('  ')}</div></div><div class="t" style="padding:6px"><div style="font-weight:700;margin-bottom:6px">Response of Treatment:</div><div>${['Excellent','Good','Average','Poor'].map(x=>`${F.responseOfTreatment===x?'☑':'☐'} ${x}`).join('  ')}</div></div></div>
        ${lv('Follow up Instructions:', F.followUpInstructions)}
        <div style="display:grid;grid-template-columns:1fr 320px;column-gap:10px;margin-top:10px">
          <div style="display:grid;grid-template-rows:auto auto;row-gap:6px">
            <div class="row2"><div class="lbl">Doctor Name:</div><div class="line">${esc(F.doctorName)}</div></div>
            <div style="display:flex;align-items:end;gap:4px"><div class="lbl">Stamp:</div><div class="line" style="width:110px"></div></div>
          </div>
          <div style="display:grid;grid-template-rows:auto auto;row-gap:6px">
            <div style="display:flex;align-items:end;gap:4px"><div class="lbl">Sign:</div><div class="line" style="width:130px"></div></div>
            <div style="display:flex;align-items:end;gap:8px"><div class="lbl">Date:</div><div class="inline">${esc(fmtDate(F.signDate))}</div><div class="lbl">Time:</div><div class="inline">${esc(fmtTime(F.signTime))}</div></div>
          </div>
        </div>
        <div style="text-align:right;margin-top:8px;font-size:12px">32</div>
      </div>
      <script>window.print && setTimeout(()=>window.print(),200)</script>
    </body></html>`
    w.document.write(html); w.document.close(); w.focus()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button onClick={save} disabled={saving||loading} className="btn-outline-navy disabled:opacity-50 text-sm">{saving? 'Saving...':'Save'}</button>
        <button onClick={printView} className="btn text-sm">Print</button>
      </div>


      <div className="grid md:grid-cols-5 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-800 mb-1">Patient's Name</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.patientName||''} onChange={e=>setForm(v=>({ ...v, patientName: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">MR#</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.mrn||''} onChange={e=>setForm(v=>({ ...v, mrn: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Age</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.age||''} onChange={e=>setForm(v=>({ ...v, age: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Sex</label>
          <select className="w-full border rounded-md px-2 py-1 text-sm" value={form.sex||''} onChange={e=>setForm(v=>({ ...v, sex: (e.target.value as any) }))}>
            <option value="">-</option>
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-800 mb-1">Address</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.address||''} onChange={e=>setForm(v=>({ ...v, address: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Date & Time in</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className="w-full border rounded-md px-2 py-1 text-sm" value={form.dateIn||''} onChange={e=>setForm(v=>({ ...v, dateIn: e.target.value }))} />
            <input type="time" className="w-full border rounded-md px-2 py-1 text-sm" value={form.timeIn||''} onChange={e=>setForm(v=>({ ...v, timeIn: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Date & Time out</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className="w-full border rounded-md px-2 py-1 text-sm" value={form.dateOut||''} onChange={e=>setForm(v=>({ ...v, dateOut: e.target.value }))} />
            <input type="time" className="w-full border rounded-md px-2 py-1 text-sm" value={form.timeOut||''} onChange={e=>setForm(v=>({ ...v, timeOut: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 text-sm">
        <label className="inline-flex items-center gap-2 font-bold text-slate-800"><input type="checkbox" checked={!!form.isOpd} onChange={e=>setForm(v=>({ ...v, isOpd: e.target.checked }))} /> OPD</label>
        <label className="inline-flex items-center gap-2 font-bold text-slate-800"><input type="checkbox" checked={!!form.isShortStay} onChange={e=>setForm(v=>({ ...v, isShortStay: e.target.checked }))} /> Short Stay</label>
        <label className="inline-flex items-center gap-2 font-bold text-slate-800"><input type="checkbox" checked={!!form.isReferred} onChange={e=>setForm(v=>({ ...v, isReferred: e.target.checked }))} /> Referred</label>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">Admission to</label>
        <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.admissionTo||''} onChange={e=>setForm(v=>({ ...v, admissionTo: e.target.value }))} />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Presenting Complaints</label>
          <textarea className="w-full border rounded-md px-2 py-1 text-sm h-24" value={form.presentingComplaints||''} onChange={e=>setForm(v=>({ ...v, presentingComplaints: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Reason of Admission / Brief History</label>
          <textarea className="w-full border rounded-md px-2 py-1 text-sm h-24" value={form.briefHistory||''} onChange={e=>setForm(v=>({ ...v, briefHistory: e.target.value }))} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">Any procedure</label>
        <textarea className="w-full border rounded-md px-2 py-1 text-sm h-20" value={form.anyProcedure||''} onChange={e=>setForm(v=>({ ...v, anyProcedure: e.target.value }))} />
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <div className="md:col-span-3">
          <label className="block text-sm font-bold text-slate-800 mb-1">Final diagnosis</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.finalDiagnosis||''} onChange={e=>setForm(v=>({ ...v, finalDiagnosis: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Consultant</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.consultant||''} onChange={e=>setForm(v=>({ ...v, consultant: e.target.value }))} />
        </div>
      </div>

      <div>
        <div className="text-sm font-bold text-slate-800 mb-2">Vitals</div>
        <div className="grid md:grid-cols-5 gap-3">
          {vitalInput('BP','bp')}
          {vitalInput('HR','hr')}
          {vitalInput('SPO2','spo2')}
          {vitalInput('Temp','temp')}
          {vitalInput('FHR','fhr')}
        </div>
      </div>

      <div>
        <div className="text-sm font-bold text-slate-800 mb-2">Investigations</div>
        <div className="grid md:grid-cols-5 gap-3">
          {testInput('Hb','hb')}
          {testInput('Bilirubin D/Ind','bilirubin')}
          {testInput('BSR','bsr')}
          {testInput('Urea','urea')}
          {testInput('S,Creat','screat')}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Treatment Given at Hospital</label>
          <textarea className="w-full border rounded-md px-2 py-1 text-sm h-40" value={form.treatmentGiven||''} onChange={e=>setForm(v=>({ ...v, treatmentGiven: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Treatment at Discharge</label>
          <textarea className="w-full border rounded-md px-2 py-1 text-sm h-40" value={form.treatmentAtDischarge||''} onChange={e=>setForm(v=>({ ...v, treatmentAtDischarge: e.target.value }))} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-slate-800 mb-1">Referred to / center name</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.referralCenter||''} onChange={e=>setForm(v=>({ ...v, referralCenter: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Contact No</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.referralContact||''} onChange={e=>setForm(v=>({ ...v, referralContact: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">Reason for referral</label>
        <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.referralReason||''} onChange={e=>setForm(v=>({ ...v, referralReason: e.target.value }))} />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="border border-slate-200 rounded-md p-3">
          <div className="text-sm font-bold text-slate-800 mb-2">Condition at Discharge</div>
          <div className="flex flex-wrap gap-4 text-sm">
            {(['Satisfactory','Fair','Poor'] as const).map(opt=> (
              <label key={opt} className="inline-flex items-center gap-2">
                <input type="radio" name="cond" checked={form.conditionAtDischarge===opt} onChange={()=> setForm(v=>({ ...v, conditionAtDischarge: opt }))} /> {opt}
              </label>
            ))}
          </div>
        </div>
        <div className="border border-slate-200 rounded-md p-3">
          <div className="text-sm font-bold text-slate-800 mb-2">Response of Treatment</div>
          <div className="flex flex-wrap gap-4 text-sm">
            {(['Excellent','Good','Average','Poor'] as const).map(opt=> (
              <label key={opt} className="inline-flex items-center gap-2">
                <input type="radio" name="resp" checked={form.responseOfTreatment===opt} onChange={()=> setForm(v=>({ ...v, responseOfTreatment: opt }))} /> {opt}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">Follow up Instructions</label>
        <textarea className="w-full border rounded-md px-2 py-1 text-sm h-24" value={form.followUpInstructions||''} onChange={e=>setForm(v=>({ ...v, followUpInstructions: e.target.value }))} />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">Doctor Name</label>
          <input className="w-full border rounded-md px-2 py-1 text-sm" value={form.doctorName||''} onChange={e=>setForm(v=>({ ...v, doctorName: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Sign Date</label>
            <input type="date" className="w-full border rounded-md px-2 py-1 text-sm" value={form.signDate||''} onChange={e=>setForm(v=>({ ...v, signDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Sign Time</label>
            <input type="time" className="w-full border rounded-md px-2 py-1 text-sm" value={form.signTime||''} onChange={e=>setForm(v=>({ ...v, signTime: e.target.value }))} />
          </div>
        </div>
      </div>
    </div>
  )

  function vitalInput(lbl:string, key:keyof NonNullable<ShortStayForm['vitals']>){
    return (
      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">{lbl}</label>
        <input className="w-full border rounded-md px-2 py-1 text-sm" value={(form.vitals?.[key] as string)||''} onChange={e=> setForm(v=> ({ ...v, vitals: { ...v.vitals, [key]: e.target.value } }))} />
      </div>
    )
  }

  function testInput(lbl:string, key:keyof NonNullable<ShortStayForm['tests']>){
    return (
      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">{lbl}</label>
        <input className="w-full border rounded-md px-2 py-1 text-sm" value={(form.tests?.[key] as string)||''} onChange={e=> setForm(v=> ({ ...v, tests: { ...v.tests, [key]: e.target.value } }))} />
      </div>
    )
  }
  function normSex(g?: string): 'M'|'F'|'' {
    const s = String(g||'').trim().toLowerCase()
    if (!s) return ''
    if (s.startsWith('m')) return 'M'
    if (s.startsWith('f')) return 'F'
    return ''
  }
}

function combineIso(d?:string, t?:string){ try { if (!d) return undefined; const dd = new Date(d); if (t){ const [hh,mm] = String(t).split(':'); dd.setHours(Number(hh)||0, Number(mm)||0, 0, 0) } return dd.toISOString() } catch { return undefined } }
function fmtDate(d?: string){
  if (!d) return ''
  const s = String(d)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  try { const x = new Date(s); if (!isNaN(x.getTime())){ const dd = String(x.getDate()).padStart(2,'0'); const mm = String(x.getMonth()+1).padStart(2,'0'); const yy = x.getFullYear(); return `${dd}/${mm}/${yy}` } } catch {}
  return s
}
function fmtTime(t?: string){
  if (!t) return ''
  const s = String(t)
  const m = s.match(/^(\d{1,2}):(\d{2})/)
  if (m){ let hh = parseInt(m[1],10); const mm = m[2]; const ap = hh>=12? 'PM':'AM'; hh = hh%12 || 12; return `${hh}:${mm} ${ap}` }
  try { const x = new Date(s); if (!isNaN(x.getTime())) return x.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) } catch {}
  return s
}
function fmtDateTime(d?: string, t?: string){
  const a = fmtDate(d)
  const b = fmtTime(t)
  return [a,b].filter(Boolean).join(' ')
}
function vRow(lbl?:string, val?:string){ return `<div style=\"display:grid;grid-template-columns:80px 1fr\"><div style=\"padding:4px 6px;font-weight:700;border-right:1px solid #222;border-bottom:1px solid #222\">${esc(lbl)}<\/div><div style=\"border-bottom:1px solid #222;padding:4px 6px\">${esc(val)}<\/div><\/div>` }
function tRow(lbl?:string, val?:string){ return `<div style=\"display:grid;grid-template-columns:1fr 120px\"><div style=\"border-right:1px solid #222;border-bottom:1px solid #222;padding:4px 6px\">${esc(lbl)}<\/div><div style=\"border-bottom:1px solid #222;padding:4px 6px\">${esc(val)}<\/div><\/div>` }
function esc(s?:string){ return String(s??'').replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'} as any)[c]) }
