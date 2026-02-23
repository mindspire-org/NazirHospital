import { useEffect, useState } from 'react'
import { labApi } from '../../utils/api'

export default function Lab_Settings() {
  const [activeTab, setActiveTab] = useState<'lab' | 'system'>('lab')

  // Lab Settings form state
  const [labName, setLabName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [reportFooter, setReportFooter] = useState('')
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [department, setDepartment] = useState('')
  const [reportTemplate, setReportTemplate] = useState<'classic'|'tealGradient'|'modern'>('classic')
  const [slipTemplate, setSlipTemplate] = useState<'thermal'|'a4Bill'>('thermal')
  const [consultantName, setConsultantName] = useState('')
  const [consultantDegrees, setConsultantDegrees] = useState('')
  const [consultantTitle, setConsultantTitle] = useState('')
  const [consultants, setConsultants] = useState<Array<{ name?: string; degrees?: string; title?: string }>>([])
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try {
        const s = await labApi.getSettings()
        if (!mounted) return
        setLabName(s.labName || '')
        setPhone(s.phone || '')
        setAddress(s.address || '')
        setEmail(s.email || '')
        setReportFooter(s.reportFooter || '')
        setLogoDataUrl(s.logoDataUrl || null)
        setDepartment(s.department || '')
        setReportTemplate((s.reportTemplate === 'tealGradient' ? 'tealGradient' : (s.reportTemplate === 'modern' ? 'modern' : 'classic')))
        setSlipTemplate((s.slipTemplate === 'a4Bill' ? 'a4Bill' : 'thermal'))
        setConsultantName(s.consultantName || '')
        setConsultantDegrees(s.consultantDegrees || '')
        setConsultantTitle(s.consultantTitle || '')
        setConsultants(Array.isArray(s.consultants) ? s.consultants : [])
      } catch (e) { /* ignore */ }
    })()
    return ()=>{ mounted = false }
  }, [])

  // System Settings form state
  const [dateFormat, setDateFormat] = useState<string>(localStorage.getItem('lab.dateFormat') || 'DD/MM/YYYY')
  const [currency, setCurrency] = useState<string>(localStorage.getItem('lab.currency') || 'PKR')

  const saveLab = async () => {
    setSaving(true)
    try {
      await labApi.updateSettings({
        labName,
        phone,
        address,
        email,
        reportFooter,
        logoDataUrl: logoDataUrl || undefined,
        department,
        reportTemplate,
        slipTemplate,
        consultantName,
        consultantDegrees,
        consultantTitle,
        consultants: consultants?.slice(0,3)?.map(c=>({
          name: (c.name||'').trim() || undefined,
          degrees: (c.degrees||'').trim() || undefined,
          title: (c.title||'').trim() || undefined,
        })).filter(c => c.name || c.degrees || c.title),
      })
      setNotice('Lab settings saved')
      try { setTimeout(()=> setNotice(''), 2500) } catch {}
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const saveSystem = () => {
    try {
      localStorage.setItem('lab.dateFormat', dateFormat)
      localStorage.setItem('lab.currency', currency)
      setNotice('System settings saved')
      try { setTimeout(()=> setNotice(''), 2500) } catch {}
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-800">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path fillRule="evenodd" d="M8.841 2.718a2.25 2.25 0 0 1 2.318-.495 2.25 2.25 0 0 0 2.682 1.212 2.25 2.25 0 0 1 2.941 1.424 2.25 2.25 0 0 0 1.765 1.765 2.25 2.25 0 0 1 1.424 2.941 2.25 2.25 0 0 0 1.212 2.682 2.25 2.25 0 0 1-.495 2.318 2.25 2.25 0 0 0-1.212 2.682 2.25 2.25 0 0 1-1.424 2.941 2.25 2.25 0 0 0-1.765 1.765 2.25 2.25 0 0 1-2.941 1.424 2.25 2.25 0 0 0-2.682 1.212 2.25 2.25 0 0 1-2.318-.495 2.25 2.25 0 0 0-3.294 0 2.25 2.25 0 0 1-2.318.495 2.25 2.25 0 0 0-1.212-2.682 2.25 2.25 0 0 1-1.424-2.941 2.25 2.25 0 0 0-1.212-2.682 2.25 2.25 0 0 1 .495-2.318 2.25 2.25 0 0 0 1.212-2.682 2.25 2.25 0 0 1 1.424-2.941 2.25 2.25 0  0 0 1.765-1.765 2.25 2.25 0 0 1 2.941-1.424 2.25 2.25 0 0 0 2.682-1.212 2.25 2.25 0  0 1 2.318.495 2.25 2.25 0 0 0 3.294 0Z" clipRule="evenodd"/></svg>
        <h2 className="text-xl font-bold">Settings</h2>
      </div>
      {notice && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>
      )}

      <div className="flex items-center gap-2">
        <button onClick={() => setActiveTab('lab')} className={`rounded-md border px-3 py-1.5 text-sm ${activeTab==='lab' ? 'border-slate-300 bg-white text-slate-900' : 'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Lab Settings</button>
        <button onClick={() => setActiveTab('system')} className={`rounded-md border px-3 py-1.5 text-sm ${activeTab==='system' ? 'border-slate-300 bg-white text-slate-900' : 'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>System Settings</button>
      </div>

      {activeTab === 'lab' && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Lab Settings</div>
          <div className="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Lab Name</label>
                <input value={labName} onChange={e=>setLabName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Phone Number</label>
                <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="+92-21-1234567" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Lab Address</label>
              <textarea value={address} onChange={e=>setAddress(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Email Address</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Department (e.g., Department of Pathology)</label>
              <input value={department} onChange={e=>setDepartment(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Department of Pathology" />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Report Template</label>
              <select value={reportTemplate} onChange={e=> setReportTemplate((e.target.value as 'classic'|'tealGradient'|'modern') || 'classic')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="classic">Classic</option>
                <option value="tealGradient">Teal Gradient</option>
                <option value="modern">Modern (International)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Slip Template</label>
              <select value={slipTemplate} onChange={e=> setSlipTemplate((e.target.value as 'thermal'|'a4Bill') || 'thermal')} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="thermal">Thermal (58mm)</option>
                <option value="a4Bill">A4 Bill</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Consultant/Pathologist Name</label>
                <input value={consultantName} onChange={e=>setConsultantName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Degrees</label>
                <input value={consultantDegrees} onChange={e=>setConsultantDegrees(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g., M.B.B.S, M.Phil (Microbiology)" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Title</label>
                <input value={consultantTitle} onChange={e=>setConsultantTitle(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Consultant Pathologist" />
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
                      <input value={c.title || ''} onChange={e=>setConsultants(prev=>{ const arr=[...(prev||[])]; arr[i] = { ...(arr[i]||{}), title: e.target.value }; return arr })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Consultant Pathologist" />
                    </div>
                  </div>
                )
              })}
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Report Footer</label>
              <textarea value={reportFooter} onChange={e=>setReportFooter(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Lab Logo</label>
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
              <button onClick={saveLab} disabled={saving} className="btn disabled:opacity-50">{saving? 'Saving...' : 'Save Settings'}</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">System Settings</div>
          <div className="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Currency</label>
                <input value={currency} onChange={e=>setCurrency(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Date Format</label>
                <select value={dateFormat} onChange={e=>setDateFormat(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button onClick={saveSystem} className="btn">Save Settings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
