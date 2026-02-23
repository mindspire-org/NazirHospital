import { useEffect, useState } from 'react'
import { aestheticApi } from '../../utils/api'

export default function Pharmacy_Settings() {
  const [activeTab, setActiveTab] = useState<'pharmacy' | 'system'>('pharmacy')

  // Pharmacy Settings form state
  const [pharmacyName, setPharmacyName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [billingFooter, setBillingFooter] = useState('')
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)

  // System Settings form state
  const [taxRate, setTaxRate] = useState<number>(0)
  const [discountRate, setDiscountRate] = useState<number>(0)
  const [currency, setCurrency] = useState<string>('PKR')
  const [dateFormat, setDateFormat] = useState<string>('DD/MM/YYYY')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const s = await aestheticApi.getSettings()
        if (!mounted) return
        setPharmacyName(s.pharmacyName || '')
        setPhone(s.phone || '')
        setAddress(s.address || '')
        setEmail(s.email || '')
        setBillingFooter(s.billingFooter || '')
        setLogoDataUrl(s.logoDataUrl || null)
      } catch (e) {
        console.error(e)
      }
    })()
    return () => { mounted = false }
  }, [])

  const savePharmacy = async () => {
    await aestheticApi.updateSettings({ pharmacyName, phone, address, email, billingFooter, logoDataUrl: logoDataUrl || '' })
    alert('Pharmacy settings saved')
  }

  const saveSystem = () => {
    // TODO: integrate API later
    console.log({ taxRate, discountRate, currency, dateFormat })
    alert('System settings saved (demo)')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-800">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path fillRule="evenodd" d="M8.841 2.718a2.25 2.25 0 0 1 2.318-.495 2.25 2.25 0 0 0 2.682 1.212 2.25 2.25 0 0 1 2.941 1.424 2.25 2.25 0 0 0 1.765 1.765 2.25 2.25 0 0 1 1.424 2.941 2.25 2.25 0 0 0 1.212 2.682 2.25 2.25 0 0 1-.495 2.318 2.25 2.25 0 0 0-1.212 2.682 2.25 2.25 0 0 1-1.424 2.941 2.25 2.25 0 0 0-1.765 1.765 2.25 2.25 0 0 1-2.941 1.424 2.25 2.25 0 0 0-2.682 1.212 2.25 2.25 0 0 1-2.318-.495 2.25 2.25 0 0 0-3.294 0 2.25 2.25 0 0 1-2.318.495 2.25 2.25 0 0 0-1.212-2.682 2.25 2.25 0 0 1-1.424-2.941 2.25 2.25 0 0 0-1.212-2.682 2.25 2.25 0 0 1 .495-2.318 2.25 2.25 0 0 0 1.212-2.682 2.25 2.25 0 0 1 1.424-2.941 2.25 2.25 0 0 0 1.765-1.765 2.25 2.25 0 0 1 2.941-1.424 2.25 2.25 0 0 0 2.682-1.212 2.25 2.25 0 0 1 2.318.495 2.25 2.25 0 0 0 3.294 0Z" clipRule="evenodd"/></svg>
        <h2 className="text-xl font-bold">Settings</h2>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setActiveTab('pharmacy')} className={`rounded-md border px-3 py-1.5 text-sm ${activeTab==='pharmacy' ? 'border-slate-300 bg-white text-slate-900' : 'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Pharmacy Settings</button>
        <button onClick={() => setActiveTab('system')} className={`rounded-md border px-3 py-1.5 text-sm ${activeTab==='system' ? 'border-slate-300 bg-white text-slate-900' : 'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>System Settings</button>
      </div>

      {activeTab === 'pharmacy' && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">Pharmacy Settings</div>
          <div className="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Pharmacy Name</label>
                <input value={pharmacyName} onChange={e=>setPharmacyName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Phone Number</label>
                <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="+92-21-1234567" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Pharmacy Address</label>
              <textarea value={address} onChange={e=>setAddress(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Email Address</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Billing Footer</label>
              <textarea value={billingFooter} onChange={e=>setBillingFooter(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-700">Pharmacy Logo</label>
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
              <button onClick={savePharmacy} className="btn">Save Settings</button>
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
                <label className="mb-1 block text-sm text-slate-700">Tax Rate (%)</label>
                <input type="number" value={taxRate} onChange={e=>setTaxRate(parseFloat(e.target.value || '0'))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Discount Rate (%)</label>
                <input type="number" value={discountRate} onChange={e=>setDiscountRate(parseFloat(e.target.value || '0'))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Currency</label>
                <input value={currency} onChange={e=>setCurrency(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
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
