import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import SuggestField from '../SuggestField'

type DisplayVitals = {
  pulse?: string
  temperature?: string
  bloodPressureSys?: string
  bloodPressureDia?: string
  respiratoryRate?: string
  bloodSugar?: string
  weightKg?: string
  height?: string
  spo2?: string
}

type NormalizedVitals = {
  pulse?: number
  temperatureC?: number
  bloodPressureSys?: number
  bloodPressureDia?: number
  respiratoryRate?: number
  bloodSugar?: number
  weightKg?: number
  heightCm?: number
  bmi?: number
  bsa?: number
  spo2?: number
}

type VitalSuggestions = {
  pulse?: string[]
  temperature?: string[]
  bloodPressureSys?: string[]
  bloodPressureDia?: string[]
  respiratoryRate?: string[]
  bloodSugar?: string[]
  weightKg?: string[]
  height?: string[]
  spo2?: string[]
}

type Props = { initial?: DisplayVitals; suggestions?: VitalSuggestions; onBlurStore?: (field: keyof DisplayVitals, value: string) => void }

export default forwardRef(function PrescriptionVitals({ initial, suggestions, onBlurStore }: Props, ref) {
  const [v, setV] = useState<DisplayVitals>({
    pulse: initial?.pulse || '',
    temperature: initial?.temperature || '',
    bloodPressureSys: initial?.bloodPressureSys || '',
    bloodPressureDia: initial?.bloodPressureDia || '',
    respiratoryRate: initial?.respiratoryRate || '',
    bloodSugar: initial?.bloodSugar || '',
    weightKg: initial?.weightKg || '',
    height: initial?.height || '',
    spo2: initial?.spo2 || '',
  })
  const [tempUnit, setTempUnit] = useState<'C'|'F'>('C')
  const [heightUnit, setHeightUnit] = useState<'cm'|'ft'>('cm')

  const num = (x?: string) => {
    const n = parseFloat(String(x||'').trim())
    return isFinite(n) ? n : undefined
  }
  const heightCm = useMemo(() => {
    const h = num(v.height)
    if (h == null) return undefined
    return heightUnit === 'cm' ? h : (h * 30.48)
  }, [v.height, heightUnit])
  const temperatureC = useMemo(() => {
    const t = num(v.temperature)
    if (t == null) return undefined
    return tempUnit === 'C' ? t : ((t - 32) * 5/9)
  }, [v.temperature, tempUnit])
  const weightKg = useMemo(() => num(v.weightKg), [v.weightKg])
  const bmi = useMemo(() => {
    if (weightKg == null || heightCm == null || heightCm <= 0) return undefined
    const m = heightCm / 100
    const b = weightKg / (m*m)
    return isFinite(b) ? +b.toFixed(2) : undefined
  }, [weightKg, heightCm])
  const bsa = useMemo(() => {
    if (weightKg == null || heightCm == null || heightCm <= 0) return undefined
    const val = Math.sqrt((weightKg * heightCm) / 3600)
    return isFinite(val) ? +val.toFixed(2) : undefined
  }, [weightKg, heightCm])

  useImperativeHandle(ref, () => ({
    getNormalized(): NormalizedVitals {
      return {
        pulse: num(v.pulse),
        temperatureC,
        bloodPressureSys: num(v.bloodPressureSys),
        bloodPressureDia: num(v.bloodPressureDia),
        respiratoryRate: num(v.respiratoryRate),
        bloodSugar: num(v.bloodSugar),
        weightKg,
        heightCm,
        bmi,
        bsa,
        spo2: num(v.spo2),
      }
    },
    getDisplay(): DisplayVitals { return v },
    setDisplay(next: DisplayVitals){ setV(next) },
  }))

  return (
    <div>
      <div className="mb-1 block text-sm font-semibold text-slate-700">Vitals</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-slate-600">Pulse</label>
          <SuggestField as="input" value={v.pulse||''} onChange={(val)=>setV(x=>({ ...x, pulse: val }))} onBlurValue={(val)=>onBlurStore?.('pulse', val)} placeholder="bpm" suggestions={suggestions?.pulse || []} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-xs text-slate-600">Temperature</label>
            <button type="button" className="text-xs text-sky-600 hover:underline" onClick={()=>setTempUnit(u=>u==='C'?'F':'C')}>{tempUnit==='C'?'°C → °F':'°F → °C'}</button>
          </div>
          <SuggestField as="input" value={v.temperature||''} onChange={(val)=>setV(x=>({ ...x, temperature: val }))} onBlurValue={(val)=>onBlurStore?.('temperature', val)} placeholder={tempUnit==='C'?"e.g. 37":"e.g. 98.6"} suggestions={suggestions?.temperature || []} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">Systolic BP</label>
          <SuggestField as="input" value={v.bloodPressureSys||''} onChange={(val)=>setV(x=>({ ...x, bloodPressureSys: val }))} onBlurValue={(val)=>onBlurStore?.('bloodPressureSys', val)} placeholder="mmHg" suggestions={suggestions?.bloodPressureSys || []} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">Diastolic BP</label>
          <SuggestField as="input" value={v.bloodPressureDia||''} onChange={(val)=>setV(x=>({ ...x, bloodPressureDia: val }))} onBlurValue={(val)=>onBlurStore?.('bloodPressureDia', val)} placeholder="mmHg" suggestions={suggestions?.bloodPressureDia || []} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">Respiratory rate</label>
          <SuggestField as="input" value={v.respiratoryRate||''} onChange={(val)=>setV(x=>({ ...x, respiratoryRate: val }))} onBlurValue={(val)=>onBlurStore?.('respiratoryRate', val)} placeholder="/min" suggestions={suggestions?.respiratoryRate || []} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">Blood sugar</label>
          <SuggestField as="input" value={v.bloodSugar||''} onChange={(val)=>setV(x=>({ ...x, bloodSugar: val }))} onBlurValue={(val)=>onBlurStore?.('bloodSugar', val)} placeholder="mg/dL" suggestions={suggestions?.bloodSugar || []} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">Weight (kg)</label>
          <SuggestField as="input" value={v.weightKg||''} onChange={(val)=>setV(x=>({ ...x, weightKg: val }))} onBlurValue={(val)=>onBlurStore?.('weightKg', val)} placeholder="e.g. 70" suggestions={suggestions?.weightKg || []} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-xs text-slate-600">Height</label>
            <button type="button" className="text-xs text-sky-600 hover:underline" onClick={()=>setHeightUnit(u=>u==='cm'?'ft':'cm')}>{heightUnit==='cm'?"Feet ↔ Cm":"Cm ↔ Feet"}</button>
          </div>
          <SuggestField as="input" value={v.height||''} onChange={(val)=>setV(x=>({ ...x, height: val }))} onBlurValue={(val)=>onBlurStore?.('height', val)} placeholder={heightUnit==='cm'?"cm":"feet"} suggestions={suggestions?.height || []} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">Oxygen Saturation</label>
          <SuggestField as="input" value={v.spo2||''} onChange={(val)=>setV(x=>({ ...x, spo2: val }))} onBlurValue={(val)=>onBlurStore?.('spo2', val)} placeholder="%" suggestions={suggestions?.spo2 || []} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">BMI</label>
          <input className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm" value={bmi!=null?String(bmi):''} readOnly disabled />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">BSA</label>
          <input className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm" value={bsa!=null?String(bsa):''} readOnly disabled />
        </div>
      </div>
    </div>
  )
})
