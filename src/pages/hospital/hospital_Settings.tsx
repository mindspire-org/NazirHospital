import { useEffect, useState } from 'react'
import { logAudit } from '../../utils/hospital_audit'
import { hospitalApi } from '../../utils/api'

type Settings = {
  name: string
  phone: string
  address: string
  logoDataUrl?: string
  code: string
  slipFooter?: string
}

export default function Hospital_Settings() {
  const [settings, setSettings] = useState<Settings>({
    name: 'Mindspire Hospital Management System',
    phone: '+92-320-4090604',
    address: 'Hospital Address, City, Country',
    logoDataUrl: undefined,
    code: 'SAFH',
    slipFooter: 'Powered by Hospital MIS',
  })
  const [savedBanner, setSavedBanner] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    async function load(){
      try {
        const s = await hospitalApi.getSettings() as any
        if (!cancelled && s) setSettings(prev => ({ ...prev, ...s }))
      } catch {}
    }
    load()
    return () => { cancelled = true }
  }, [])

  const update = (k: keyof Settings, v: string) => setSettings(s => ({ ...s, [k]: v }))

  const onUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setSettings(s => ({ ...s, logoDataUrl: String(reader.result || '') }))
    reader.readAsDataURL(file)
  }

  const onRemoveLogo = () => setSettings(s => ({ ...s, logoDataUrl: undefined }))

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await hospitalApi.updateSettings(settings)
      setSavedBanner('Settings saved successfully')
      logAudit('user_edit', 'hospital settings saved')
      setTimeout(() => setSavedBanner(''), 2000)
    } catch (err: any) {
      setSavedBanner(err?.message || 'Failed to save')
      setTimeout(() => setSavedBanner(''), 2500)
    }
  }

  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-500 p-6 text-white shadow">
        <h2 className="text-2xl font-bold">Hospital Settings</h2>
        <p className="opacity-90">Manage hospital information, security, and data.</p>
      </div>

      <form onSubmit={onSave} className="mt-6 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <span>🏥</span>
              <span>Hospital Information</span>
            </div>
          </div>

          <div className="grid gap-4 p-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Hospital Name</label>
              <input value={settings.name} onChange={e=>update('name', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Hospital Phone</label>
              <input value={settings.phone} onChange={e=>update('phone', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Hospital Address</label>
              <input value={settings.address} onChange={e=>update('address', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Token Slip Footer</label>
              <input value={settings.slipFooter || ''} onChange={e=>update('slipFooter', e.target.value)} placeholder="e.g., Powered by Hospital MIS" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              <p className="mt-1 text-xs text-slate-500">Shown at the bottom of printed token slips.</p>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Hospital Logo</label>
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700">
                  <input type="file" accept="image/*" onChange={onUploadLogo} className="hidden" />
                  Upload Logo
                </label>
                {settings.logoDataUrl && (
                  <>
                    <img src={settings.logoDataUrl} alt="Logo" className="h-10 w-10 rounded-full border border-slate-200 object-cover" />
                    <button type="button" onClick={onRemoveLogo} className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Remove</button>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Hospital Code</label>
              <input value={settings.code} onChange={e=>update('code', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
            </div>
            
          </div>

          <div className="border-t border-slate-200 px-4 py-3">
            <button type="submit" className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">Save Information</button>
            {savedBanner && <span className="ml-3 text-sm text-emerald-600">{savedBanner}</span>}
          </div>
        </div>
      </form>
    </div>
  )
}
