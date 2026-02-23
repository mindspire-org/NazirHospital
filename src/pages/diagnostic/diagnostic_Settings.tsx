import { useEffect, useState } from 'react';
import { diagnosticApi } from '../../utils/api'
import { DiagnosticFormRegistry } from '../../components/diagnostic/registry'

export default function Diagnostic_Settings(){
  const [notice, setNotice] = useState('')

  const [diagnosticName, setDiagnosticName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [reportFooter, setReportFooter] = useState('')
  const [slipFooter, setSlipFooter] = useState('')
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [department, setDepartment] = useState('')
  const [consultantName, setConsultantName] = useState('')
  const [consultantDegrees, setConsultantDegrees] = useState('')
  const [consultantTitle, setConsultantTitle] = useState('')
  const [consultants, setConsultants] = useState<Array<{ name?: string; degrees?: string; title?: string }>>([])
  const [templateMappings, setTemplateMappings] = useState<Array<{ testId: string; testName?: string; templateKey: string }>>([])
  const [tests, setTests] = useState<Array<{ id: string; name: string }>>([])
  const [saving, setSaving] = useState(false)

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const s = await diagnosticApi.getSettings() as any
        if (!mounted) return
        setDiagnosticName(s.diagnosticName || '')
        setPhone(s.phone || '')
        setAddress(s.address || '')
        setEmail(s.email || '')
        setReportFooter(s.reportFooter || '')
        setSlipFooter(s.slipFooter || '')
        setLogoDataUrl(s.logoDataUrl || null)
        setDepartment(s.department || '')
        setConsultantName(s.consultantName || '')
        setConsultantDegrees(s.consultantDegrees || '')
        setConsultantTitle(s.consultantTitle || '')
        setConsultants(Array.isArray(s.consultants) ? s.consultants : [])
        setTemplateMappings(Array.isArray(s.templateMappings) ? s.templateMappings : [])
      } catch {}
    })()
    return ()=>{ mounted = false }
  }, [])

  // Load tests for mapping dropdowns
  useEffect(()=>{ (async()=>{
    try {
      const tr = await diagnosticApi.listTests({ limit: 1000 }) as any
      const items = (tr?.items||tr||[]).map((t:any)=>({ id: String(t._id||t.id), name: String(t.name||'') }))
      setTests(items)
    } catch { setTests([]) }
  })() }, [])

  // System tab removed per request

  const saveDiagnostic = async () => {
    setSaving(true)
    try {
      const payload = {
        diagnosticName,
        phone,
        address,
        email,
        reportFooter,
        slipFooter,
        logoDataUrl: logoDataUrl || undefined,
        department,
        consultantName,
        consultantDegrees,
        consultantTitle,
        consultants: consultants?.slice(0,3)?.map(c=>({
          name: (c.name||'').trim() || undefined,
          degrees: (c.degrees||'').trim() || undefined,
          title: (c.title||'').trim() || undefined,
        })).filter(c => c.name || c.degrees || c.title),
        templateMappings: (templateMappings||[])
          .map(m => ({
            testId: (m.testId||'').trim(),
            testName: tests.find(t=> t.id===m.testId)?.name || m.testName || undefined,
            templateKey: (m.templateKey||'').trim(),
          }))
          .filter(m => m.testId && m.templateKey),
      }
      await diagnosticApi.updateSettings(payload)
      setNotice('Diagnostic settings saved')
      try { setTimeout(()=> setNotice(''), 2500) } catch {}
      try { window.dispatchEvent(new Event('diagnostic:settings-updated')) } catch {}
    } catch {}
    finally { setSaving(false) }
  }

  // No system settings

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-2 text-slate-800">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path fillRule="evenodd" d="M8.841 2.718a2.25 2.25 0 0 1 2.318-.495 2.25 2.25 0 0 0 2.682 1.212 2.25 2.25 0 0 1 2.941 1.424 2.25 2.25 0  0 0 1.765 1.765 2.25 2.25 0  0 1 1.424 2.941 2.25 2.25 0  0 0 1.212 2.682 2.25 2.25 0  0 1-.495 2.318 2.25 2.25 0  0 0-1.212 2.682 2.25 2.25 0  0 1-1.424 2.941 2.25 2.25 0  0 0-1.765 1.765 2.25 2.25 0  0 1-2.941 1.424 2.25 2.25 0  0 0-2.682 1.212 2.25 2.25 0  0 1-2.318-.495 2.25 2.25 0  0 0-3.294 0 2.25 2.25 0  0 1-2.318.495 2.25 2.25 0  0 0-1.212-2.682 2.25 2.25 0  0 1-1.424-2.941 2.25 2.25 0  0 0-1.212-2.682 2.25 2.25 0  0 1 .495-2.318 2.25 2.25 0  0 0 1.212-2.682 2.25 2.25 0  0 1 1.424-2.941 2.25 2.25 0  0 0 1.765-1.765 2.25 2.25 0  0 1 2.941-1.424 2.25 2.25 0  0 0 2.682-1.212 2.25 2.25 0  0 1 2.318.495 2.25 2.25 0  0 0 3.294 0Z" clipRule="evenodd"/></svg>
        <h2 className="text-xl font-bold">Settings</h2>
      </div>
      {notice && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>
      )}

      {/* Single card (no tabs) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-base font-semibold text-slate-800">Diagnostic Profile</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-700">Diagnostic Name</label>
              <input value={diagnosticName} onChange={e=>setDiagnosticName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Phone Number</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="+92-21-1234567" />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Address</label>
              <textarea value={address} onChange={e=>setAddress(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Email Address</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Department</label>
              <input value={department} onChange={e=>setDepartment(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Radiology, Endoscopy, etc." />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Consultant Name</label>
                <input value={consultantName} onChange={e=>setConsultantName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Degrees</label>
                <input value={consultantDegrees} onChange={e=>setConsultantDegrees(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g., M.B.B.S, FCPS" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Title</label>
                <input value={consultantTitle} onChange={e=>setConsultantTitle(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Consultant Radiologist" />
              </div>
            </div>

            <div className="mt-2 rounded-lg border border-slate-200 p-3">
              <div className="mb-2 text-sm font-medium text-slate-800">Additional Consultants (max 2)</div>
              {[0,1].map((i)=>{
                const c = consultants[i] || { name: '', degrees: '', title: '' }
                return (
                  <div key={i} className="mb-3 grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">Name</label>
                      <input value={c.name || ''} onChange={e=>setConsultants(prev=>{ const arr=[...(prev||[])]; arr[i] = { ...(arr[i]||{}), name: e.target.value }; return arr })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">Degrees</label>
                      <input value={c.degrees || ''} onChange={e=>setConsultants(prev=>{ const arr=[...(prev||[])]; arr[i] = { ...(arr[i]||{}), degrees: e.target.value }; return arr })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g., M.B.B.S, FCPS" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">Title</label>
                      <input value={c.title || ''} onChange={e=>setConsultants(prev=>{ const arr=[...(prev||[])]; arr[i] = { ...(arr[i]||{}), title: e.target.value }; return arr })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Consultant" />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-700">Report Footer</label>
              <textarea value={reportFooter} onChange={e=>setReportFooter(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-700">Slip Footer</label>
              <input value={slipFooter} onChange={e=>setSlipFooter(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={e=>{
                  const file = e.target.files?.[0]
                  if (!file) { setLogoDataUrl(null); return }
                  const reader = new FileReader()
                  reader.onload = () => setLogoDataUrl(String(reader.result || ''))
                  reader.readAsDataURL(file)
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:text-slate-700"
              />
              {logoDataUrl && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <img src={logoDataUrl} alt="Logo preview" className="h-10 w-10 rounded border" />
                  <span>Preview</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end">
              <button onClick={saveDiagnostic} disabled={saving} className="btn disabled:opacity-50">{saving? 'Saving...' : 'Save Settings'}</button>
            </div>
          </div>
        </div>

        {/* Report Template Mappings */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Report Template Mappings</div>
          <div className="space-y-4 p-4">
            <div className="text-sm text-slate-600">Select which report template should be used for each diagnostic test.</div>
            <div className="space-y-2">
              {(templateMappings||[]).map((m, idx)=>{
                const selectedTest = m.testId
                return (
                  <div key={idx} className="grid gap-2 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">Test</label>
                      <select value={selectedTest} onChange={e=> setTemplateMappings(prev=>{
                        const arr = prev.slice(); arr[idx] = { ...arr[idx], testId: e.target.value }; return arr
                      })} className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm">
                        <option value="">Select Test…</option>
                        {tests.map(t=> (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-600">Template</label>
                      <select value={m.templateKey||''} onChange={e=> setTemplateMappings(prev=>{
                        const arr = prev.slice(); arr[idx] = { ...arr[idx], templateKey: e.target.value }; return arr
                      })} className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm">
                        <option value="">Select Template…</option>
                        {Object.keys(DiagnosticFormRegistry).map(k=> (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button onClick={()=> setTemplateMappings(prev=> prev.filter((_,i)=> i!==idx))} className="rounded-md border border-slate-300 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50">Remove</button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div>
              <button onClick={()=> setTemplateMappings(prev=> [...(prev||[]), { testId: '', templateKey: '' }])} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">+ Add Mapping</button>
            </div>
            <div className="flex items-center justify-end">
              <button onClick={saveDiagnostic} disabled={saving} className="btn disabled:opacity-50">{saving? 'Saving…' : 'Save Mappings'}</button>
            </div>
          </div>
        </div>
      
    </div>
  )
}
