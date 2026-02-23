import { useEffect, useMemo, useRef, useState } from 'react'
import { logAudit } from '../../utils/hospital_audit'
import { adminApi } from '../../utils/api'

const LAST_BACKUP_KEY = 'hospital_last_backup'
const AUTO_SETTINGS_KEY = 'hospital_backup_settings'

type AutoSettings = {
  enabled: boolean
  minutes: number
  folderPath: string
  adminKey?: string
}

export default function Hospital_Backup() {
  const [lastBackup, setLastBackup] = useState<string | null>(localStorage.getItem(LAST_BACKUP_KEY))
  const [settings, setSettings] = useState<AutoSettings>(() => {
    try {
      const raw = localStorage.getItem(AUTO_SETTINGS_KEY)
      return raw ? JSON.parse(raw) : { enabled: false, minutes: 60, folderPath: '', adminKey: '' }
    } catch {
      return { enabled: false, minutes: 60, folderPath: '', adminKey: '' }
    }
  })
  const [banner, setBanner] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const nextBackup = useMemo(() => {
    if (!settings.enabled || !lastBackup) return 'Not scheduled'
    const last = new Date(lastBackup)
    if (Number.isNaN(last.getTime())) return 'Not scheduled'
    const next = new Date(last.getTime() + settings.minutes * 60 * 1000)
    return next.toLocaleString()
  }, [settings.enabled, settings.minutes, lastBackup])

  // Auto backup timer (page-scope)
  useEffect(() => {
    if (!settings.enabled) return
    const id = setInterval(() => doBackup(true), Math.max(1, settings.minutes) * 60 * 1000)
    return () => clearInterval(id)
  }, [settings.enabled, settings.minutes])

  const showBanner = (msg: string) => {
    setBanner(msg)
    setTimeout(() => setBanner(''), 2000)
  }

  const doBackup = async (isAuto = false) => {
    try {
      const payload = await adminApi.exportAll() as any
      const ts = String(payload?._meta?.ts || new Date().toISOString())
      const stamp = ts.replace(/[:T]/g, '-').slice(0, 19)
      const dbName = String(payload?._meta?.db || 'hospital_dev')
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `backup-${dbName}-${stamp}.json`
      a.click()
      URL.revokeObjectURL(a.href)

      localStorage.setItem(LAST_BACKUP_KEY, ts)
      setLastBackup(ts)
      if (!isAuto) showBanner('Backup created')
      logAudit('user_edit', isAuto ? 'auto backup created' : 'backup created')
    } catch (e:any) {
      showBanner('Backup failed')
    }
  }

  const triggerRestore = () => fileInputRef.current?.click()

  const onRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await adminApi.restoreAll(data)
      showBanner('Backup restored')
      logAudit('user_edit', 'backup restored (DB)')
    } catch (err:any) {
      showBanner('Invalid backup file or restore failed')
    } finally {
      e.target.value = ''
    }
  }

  const deleteAll = async () => {
    if (!confirm('Delete ALL data from the database (ALL modules)?')) return
    try {
      await adminApi.purgeAll()
      setLastBackup(null)
      showBanner('All data cleared (DB)')
      logAudit('user_delete', 'purge all data (DB)')
      setTimeout(() => { try { window.location.reload() } catch {} }, 600)
    } catch(e:any){
      showBanner('Delete failed')
    }
  }

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem(AUTO_SETTINGS_KEY, JSON.stringify(settings))
    showBanner('Settings saved')
  }

  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-xl font-semibold text-slate-800">Backup & Security</div>
        <p className="mt-1 text-sm text-slate-600">Manage your application data. It's recommended to create backups regularly.</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={() => doBackup(false)} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90">Backup Now</button>
          <button onClick={triggerRestore} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">Restore from Backup</button>
          <button onClick={deleteAll} className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">Delete All Data</button>
          <input ref={fileInputRef} onChange={onRestoreFile} type="file" accept="application/json" className="hidden" />
        </div>

        <div className="mt-2 text-xs text-slate-600">
          Last Backup: <span className="font-medium">{lastBackup ? new Date(lastBackup).toLocaleString() : 'Never'}</span>
          <span className="mx-2">•</span>
          Next Backup: <span className="font-medium">{nextBackup}</span>
        </div>

        <form onSubmit={saveSettings} className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">Auto Backup</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={settings.enabled} onChange={e=>setSettings(s=>({ ...s, enabled: e.target.checked }))} />
                Enable Auto Backup
              </label>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Interval (minutes)</label>
              <input value={settings.minutes} onChange={e=>setSettings(s=>({ ...s, minutes: Number(e.target.value)||0 }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Backup Folder Path</label>
              <input value={settings.folderPath} onChange={e=>setSettings(s=>({ ...s, folderPath: e.target.value }))} placeholder="e.g. C:\\HospitalBackups" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              <p className="mt-1 text-xs text-slate-500">Note: Browsers download to your default folder; this is for reference only.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Admin Key (for server admin endpoints)</label>
              <input value={settings.adminKey||''} onChange={e=>setSettings(s=>({ ...s, adminKey: e.target.value }))} placeholder="Set to match backend ADMIN_KEY" className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              <p className="mt-1 text-xs text-slate-500">Stored locally and sent as header x-admin-key.</p>
            </div>
          </div>

          <div className="mt-4">
            <button type="submit" className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">Save Settings</button>
            {banner && <span className="ml-3 text-sm text-emerald-600">{banner}</span>}
          </div>
        </form>
      </div>
    </div>
  )
}
