import { useEffect, useState } from 'react'
import { getSavedPrescriptionPdfTemplate, previewPrescriptionPdf } from '../../utils/prescriptionPdf'
import type { PrescriptionPdfTemplate } from '../../utils/prescriptionPdf'
import { hospitalApi } from '../../utils/api'

type DoctorDetails = {
  name: string
  qualification: string
  designation: string
  departmentName: string
  phone: string
}

type HospitalSettings = {
  name: string
  phone: string
  address: string
  logoDataUrl?: string
}

export default function Doctor_Settings(){
  type DoctorSession = { id: string; name?: string; username?: string }
  const [doc, setDoc] = useState<DoctorSession | null>(null)
  const [tpl, setTpl] = useState<PrescriptionPdfTemplate>('default')
  const [mode, setMode] = useState<'electronic'|'manual'>('electronic')
  const [doctorDetails, setDoctorDetails] = useState<DoctorDetails>({
    name: '',
    qualification: '',
    designation: '',
    departmentName: '',
    phone: ''
  })
  const [hospitalSettings, setHospitalSettings] = useState<HospitalSettings>({
    name: 'Hospital',
    phone: '',
    address: '',
    logoDataUrl: undefined
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('doctor.session')
      const sess = raw ? JSON.parse(raw) : null
      setDoc(sess)
      setTpl(getSavedPrescriptionPdfTemplate(sess?.id))
      const mk = `doctor.rx.mode.${sess?.id || 'anon'}`
      const mv = localStorage.getItem(mk)
      if (mv === 'manual' || mv === 'electronic') setMode(mv)
      
      // Load doctor details from localStorage
      const dk = `doctor.details.${sess?.id || 'anon'}`
      const dRaw = localStorage.getItem(dk)
      if (dRaw) {
        try {
          const details = JSON.parse(dRaw)
          setDoctorDetails(prev => ({ ...prev, ...details }))
        } catch {}
      }
      
      // Load hospital settings
      ;(async () => {
        try {
          const s = await hospitalApi.getSettings() as any
          if (s) {
            setHospitalSettings({
              name: s.name || 'Hospital',
              phone: s.phone || '',
              address: s.address || '',
              logoDataUrl: s.logoDataUrl
            })
          }
        } catch {}
      })()
    } catch {}
  }, [])

  const save = () => {
    try {
      const k = `doctor.rx.template.${doc?.id || 'anon'}`
      localStorage.setItem(k, tpl)
      const mk = `doctor.rx.mode.${doc?.id || 'anon'}`
      localStorage.setItem(mk, mode)
      
      // Save doctor details
      const dk = `doctor.details.${doc?.id || 'anon'}`
      localStorage.setItem(dk, JSON.stringify(doctorDetails))
      
      setSaved(true)
      setTimeout(()=>setSaved(false), 1500)
    } catch {}
  }

  const previewSample = async () => {
    // Minimal sample preview just to visualize layout
    await previewPrescriptionPdf({
      doctor: { 
        name: doctorDetails.name || doc?.name || 'Doctor', 
        qualification: doctorDetails.qualification || 'MBBS, FCPS', 
        departmentName: doctorDetails.departmentName || 'OPD', 
        phone: doctorDetails.phone || '' 
      },
      settings: { 
        name: hospitalSettings.name || 'Hospital', 
        address: hospitalSettings.address || 'Address Hospital Address City, Country', 
        phone: hospitalSettings.phone || '0300-0000000', 
        logoDataUrl: hospitalSettings.logoDataUrl || '' 
      },
      patient: { name: 'John Doe', mrn: 'MR0001', gender: 'M', age: '30', phone: '0300-1234567', address: 'Street, City' },
      vitals: { pulse: 76, temperatureC: 36.9, bloodPressureSys: 120, bloodPressureDia: 80, respiratoryRate: 18, spo2: 98 },
      items: [
        { name: 'Tab. Paracetamol 500mg', frequency: 'morning / night', duration: '5 days', dose: '1 tablet', instruction: 'After meals', route: 'Oral' },
        { name: 'Cap. Omeprazole 20mg', frequency: 'once a day', duration: '7 days', dose: '1 capsule', instruction: 'Before breakfast', route: 'Oral' },
      ],
      labTests: ['CBC', 'LFT'],
      labNotes: 'Fasting',
      diagnosticTests: ['Ultrasound Abdomen'],
      diagnosticNotes: 'ASAP',
      createdAt: new Date(),
    }, tpl)
  }

  return (
    <div className="w-full px-2 sm:px-4">
      <div className="text-xl font-semibold text-slate-800">Doctor Settings</div>
      
      {/* Doctor Details Section */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <span>👨‍⚕️</span>
          <span>Doctor Details</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Doctor Name</label>
            <input 
              value={doctorDetails.name} 
              onChange={e=>setDoctorDetails(d=>({ ...d, name: e.target.value }))}
              placeholder="Dr. John Smith" 
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" 
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Qualification</label>
            <input 
              value={doctorDetails.qualification} 
              onChange={e=>setDoctorDetails(d=>({ ...d, qualification: e.target.value }))}
              placeholder="MBBS, FCPS, MD" 
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" 
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Designation</label>
            <input 
              value={doctorDetails.designation} 
              onChange={e=>setDoctorDetails(d=>({ ...d, designation: e.target.value }))}
              placeholder="Consultant Physician" 
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" 
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Department</label>
            <input 
              value={doctorDetails.departmentName} 
              onChange={e=>setDoctorDetails(d=>({ ...d, departmentName: e.target.value }))}
              placeholder="Internal Medicine" 
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" 
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Phone Number</label>
            <input 
              value={doctorDetails.phone} 
              onChange={e=>setDoctorDetails(d=>({ ...d, phone: e.target.value }))}
              placeholder="+92-300-1234567" 
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" 
            />
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          These details will appear on prescription templates. Hospital details are automatically loaded from hospital settings.
        </div>
      </div>

      {/* Prescription Settings Section */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <span>📋</span>
          <span>Prescription Settings</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Prescription Print Template</label>
            <select value={tpl} onChange={(e)=>setTpl(e.target.value as PrescriptionPdfTemplate)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="default">Standard</option>
              <option value="rx-vitals-left">Vitals Left (Rx Box)</option>
              <option value="modern-prescription">Modern Prescription</option>
              <option value="ultra-modern">Ultra Modern</option>
              <option value="drap-standard">DRAP Standard</option>
              <option value="drap-two-column">DRAP Two Column</option>
              <option value="international-compact">International Compact</option>
              <option value="european-standard">European Standard</option>
            </select>
            <div className="mt-1 text-xs text-slate-500">This choice is saved per-doctor and used by Print in Prescription and Prescription History pages.</div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Prescription Mode</label>
            <select value={mode} onChange={(e)=>setMode(e.target.value as any)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="electronic">E-Prescription (System)</option>
              <option value="manual">Manual Prescription (Attach PDF/Image)</option>
            </select>
            <div className="mt-1 text-xs text-slate-500">If Manual is selected, you will attach a scanned prescription PDF/image when saving prescriptions.</div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={save} className="btn">Save</button>
          <button type="button" onClick={previewSample} className="btn-outline-navy">Preview Sample</button>
          {saved && <div className="text-sm text-emerald-600">Saved</div>}
        </div>
      </div>
    </div>
  )
}
