import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

export default function Hospital_IpdOperationConsent({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    mrNumber: string
    patientName: string
    date: string
    doctorName: string
    sign: string
    anesthesiaDate: string
    anesthesiaTime: string
    operationDate: string
    operationTime: string
    bloodDate: string
    bloodTime: string
  }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdClinicalNotes(encounterId, { type: 'operation-consent', limit: 200 }) as any
      const items = (res.notes || []).map((n: any) => ({
        id: String(n._id),
        recordedAt: String(n.recordedAt || n.createdAt || ''),
        mrNumber: n.data?.mrNumber || '',
        patientName: n.data?.patientName || '',
        date: n.data?.date || '',
        doctorName: n.data?.doctorName || '',
        sign: n.sign || '',
        anesthesiaDate: n.data?.anesthesiaDate || '',
        anesthesiaTime: n.data?.anesthesiaTime || '',
        operationDate: n.data?.operationDate || '',
        operationTime: n.data?.operationTime || '',
        bloodDate: n.data?.bloodDate || '',
        bloodTime: n.data?.bloodTime || '',
      }))
      setRecords(items)
    }catch{}
  }

  const add = async (d: any) => {
    try{
      await hospitalApi.createIpdClinicalNote(encounterId, {
        type: 'operation-consent',
        sign: d.sign || '',
        data: d,
      })
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to save consent form') }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Consent Forms (انesthesia/Operation/Blood)</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Form</button>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-500">No consent records yet.</div>
      ) : (
        <div className="space-y-6">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <OperationConsentDisplay data={r} />
              <div className="mt-2 text-right text-xs text-slate-500">
                Recorded: {new Date(r.recordedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <OperationConsentDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function OperationConsentDisplay({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center border-b border-slate-300 pb-3">
        <h2 className="text-xl font-bold text-slate-900">Surgicare Hospital & Maternity Center Karor Lal Eason</h2>
      </div>

      {/* Top Info */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="flex gap-2">
          <span className="font-semibold">MR Number:</span>
          <span className="border-b border-slate-400 flex-1">{data.mrNumber || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Patient Name:</span>
          <span className="border-b border-slate-400 flex-1">{data.patientName || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Date:</span>
          <span className="border-b border-slate-400 flex-1">{data.date || ''}</span>
        </div>
      </div>

      {/* Form 1: Anesthesia Consent */}
      <div className="border border-slate-300 rounded-lg p-4" style={{ direction: 'rtl', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' }}>
        <h3 className="text-center font-bold text-lg mb-4 border-b pb-2">اجازت نامہ برائے بیہوشی</h3>
        <div className="text-right space-y-2 text-sm leading-relaxed">
          <p>میں اس بات کی اجازت دیتا ہوں کہ میرے مریض کا آپریشن کیا جائے۔ بے ہوشی کا عمل کیا جائے اور ضرورت پڑنے پر انجیکشن اور دوائیاں دی جائیں۔</p>
          <p>آپریشن کے دوران کسی قسم کی ناخوشگوار صورتحال پیش آ سکتی ہے جو مریض کے لیے خطرناک ثابت ہو سکتی ہے ہسپتال اس صورتحال کے لیے ذمہ دار نہیں ہوگا۔</p>
          <p>میں یہ اعلان کرتا ہوں کہ میں نے بے ہوشی کے طریقہ کار کے بارے میں ڈاکٹر سے تمام ضروری معلومات حاصل کر لی ہیں۔</p>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm pt-4 border-t border-slate-300">
          <div className="flex gap-2">
            <span className="font-semibold">والد/بستی/سرپرست:</span>
            <span className="border-b border-slate-400 flex-1"></span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold">دستخط:</span>
            <span className="border-b border-slate-400 flex-1"></span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold">Date:</span>
            <span className="border-b border-slate-400 flex-1">{data.anesthesiaDate || ''}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold">Time:</span>
            <span className="border-b border-slate-400 flex-1">{data.anesthesiaTime || ''}</span>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
          <div className="flex gap-2">
            <span className="font-semibold">Doctor Name:</span>
            <span className="border-b border-slate-400 flex-1">{data.doctorName || ''}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold">Sign:</span>
            <span className="border-b border-slate-400 flex-1">{data.sign || ''}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold">Date:</span>
            <span className="border-b border-slate-400 flex-1">{data.date || ''}</span>
          </div>
        </div>
      </div>

      {/* Form 2: Operation Consent */}
      <div className="border border-slate-300 rounded-lg p-4" style={{ direction: 'rtl', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' }}>
        <h3 className="text-center font-bold text-lg mb-4 border-b pb-2">اجازت نامہ برائے آپریشن</h3>
        <div className="text-right space-y-2 text-sm leading-relaxed">
          <p>میں اس بات کی اجازت دیتا ہوں کہ میرے مریض کا آپریشن کیا جائے۔</p>
          <p>آپریشن کے دوران کسی قسم کی ناخوشگوار صورتحال پیش آسکتی ہے جیسے خون کا اخراج، علاج کی ناکامی، آلہ (Ventilator) کی ضرورت اور ایسی دیگر پیچیدگیاں جو مریض کے لیے خطرناک ثابت ہو سکتی ہیں۔</p>
          <p>میں یہ اعلان کرتا ہوں کہ ڈاکٹر نے تمام معلومات سے آگاہ کر دیا ہے۔</p>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm pt-4 border-t border-slate-300">
          <div className="flex gap-2">
            <span className="font-semibold">والد/بستی/سرپرست:</span>
            <span className="border-b border-slate-400 flex-1"></span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold">دستخط:</span>
            <span className="border-b border-slate-400 flex-1"></span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold">Date:</span>
            <span className="border-b border-slate-400 flex-1">{data.operationDate || ''}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold">Time:</span>
            <span className="border-b border-slate-400 flex-1">{data.operationTime || ''}</span>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
          <div className="flex gap-2">
            <span className="font-semibold">Doctor Name:</span>
            <span className="border-b border-slate-400 flex-1">{data.doctorName || ''}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold">Sign:</span>
            <span className="border-b border-slate-400 flex-1">{data.sign || ''}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold">Date:</span>
            <span className="border-b border-slate-400 flex-1">{data.date || ''}</span>
          </div>
        </div>
      </div>

      {/* Form 3: Blood Transfusion Consent */}
      <div className="border border-slate-300 rounded-lg p-4" style={{ direction: 'rtl', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' }}>
        <h3 className="text-center font-bold text-lg mb-4 border-b pb-2">اجازت نامہ برائے انتقال خون/مزید</h3>
        <div className="text-right space-y-2 text-sm leading-relaxed">
          <p>میں اس بات کی اجازت دیتا ہوں کہ میرے مریض کو علاج کے دوران خون یا خون کے کسی جزو کی ضرورت پیش آئے تو منتقل کیا جائے۔</p>
          <p>میں نے طبی عملے کو آگاہ کر دیا ہے کہ میرے مریض کو کسی قسم کی الرجی یا خون کے اجزاء سے کوئی رد عمل نہیں ہے۔</p>
          <p>میں یہ اعلان کرتا ہوں کہ اس دوران پیش آنے والی کسی بھی پیچیدگی کے لیے ہسپتال/ڈاکٹر ذمہ دار نہیں ہوں گے۔</p>
          <p>کیے جانے والے علاج کے لیے ہم نے ہسپتال کے عملے سے رضا مندی ظاہر کی ہے اور رضا مندی ہم پر لاگو ہوگی۔</p>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm pt-4 border-t border-slate-300">
          <div className="flex gap-2">
            <span className="font-semibold">والد/بستی/سرپرست:</span>
            <span className="border-b border-slate-400 flex-1"></span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold">دستخط:</span>
            <span className="border-b border-slate-400 flex-1"></span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold">Date:</span>
            <span className="border-b border-slate-400 flex-1">{data.bloodDate || ''}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold">Time:</span>
            <span className="border-b border-slate-400 flex-1">{data.bloodTime || ''}</span>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
          <div className="flex gap-2">
            <span className="font-semibold">Doctor Name:</span>
            <span className="border-b border-slate-400 flex-1">{data.doctorName || ''}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold">Sign:</span>
            <span className="border-b border-slate-400 flex-1">{data.sign || ''}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold">Date:</span>
            <span className="border-b border-slate-400 flex-1">{data.date || ''}</span>
          </div>
        </div>
      </div>

      {/* Final Doctor Signature */}
      <div className="grid grid-cols-3 gap-4 text-sm pt-4 border-t border-slate-300">
        <div className="flex gap-2">
          <span className="font-semibold">Doctor Name:</span>
          <span className="border-b border-slate-400 flex-1">{data.doctorName || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Signature:</span>
          <span className="border-b border-slate-400 flex-1">{data.sign || ''}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold">Date:</span>
          <span className="border-b border-slate-400 flex-1">{data.date || ''}</span>
        </div>
      </div>
    </div>
  )
}

function OperationConsentDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (d: any) => void
}) {
  const [form, setForm] = useState({
    mrNumber: '',
    patientName: '',
    date: new Date().toISOString().slice(0, 10),
    doctorName: '',
    sign: '',
    anesthesiaGuardian: '',
    anesthesiaSign: '',
    anesthesiaDate: new Date().toISOString().slice(0, 10),
    anesthesiaTime: new Date().toTimeString().slice(0, 5),
    operationGuardian: '',
    operationSign: '',
    operationDate: new Date().toISOString().slice(0, 10),
    operationTime: new Date().toTimeString().slice(0, 5),
    bloodGuardian: '',
    bloodSign: '',
    bloodDate: new Date().toISOString().slice(0, 10),
    bloodTime: new Date().toTimeString().slice(0, 5),
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Add Operation Consent Forms</h3>

        <div className="space-y-6">
          {/* Top Info */}
          <div className="border-b border-slate-200 pb-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Patient Information</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">MR Number</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.mrNumber}
                  onChange={(e) => setForm({ ...form, mrNumber: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Patient Name</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.patientName}
                  onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Anesthesia Consent Section */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">1. Anesthesia Consent (اجازت نامہ برائے بیہوشی)</h4>
            {/* Urdu Text Display */}
            <div className="mb-3 rounded border border-slate-200 bg-white p-3 text-right text-xs text-slate-700 leading-relaxed" style={{ direction: 'rtl', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' }}>
              <p>میں اس بات کی اجازت دیتا ہوں کہ میرے مریض کا آپریشن کیا جائے۔ بے ہوشی کا عمل کیا جائے اور ضرورت پڑنے پر انجیکشن اور دوائیاں دی جائیں۔</p>
              <p className="mt-1">آپریشن کے دوران کسی قسم کی ناخوشگوار صورتحال پیش آ سکتی ہے جو مریض کے لیے خطرناک ثابت ہو سکتی ہے ہسپتال اس صورتحال کے لیے ذمہ دار نہیں ہوگا۔</p>
              <p className="mt-1">میں یہ اعلان کرتا ہوں کہ میں نے بے ہوشی کے طریقہ کار کے بارے میں ڈاکٹر سے تمام ضروری معلومات حاصل کر لی ہیں۔</p>
            </div>
            {/* Guardian/Signature Row */}
            <div className="mb-3 grid grid-cols-4 gap-3 border-t border-slate-200 pt-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Guardian (والد/بستی/سرپرست)</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.anesthesiaGuardian}
                  onChange={(e) => setForm({ ...form, anesthesiaGuardian: e.target.value })}
                  placeholder="نام"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Sign (دستخط)</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.anesthesiaSign}
                  onChange={(e) => setForm({ ...form, anesthesiaSign: e.target.value })}
                  placeholder="دستخط"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.anesthesiaDate}
                  onChange={(e) => setForm({ ...form, anesthesiaDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Time</label>
                <input
                  type="time"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.anesthesiaTime}
                  onChange={(e) => setForm({ ...form, anesthesiaTime: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Operation Consent Section */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">2. Operation Consent (اجازت نامہ برائے آپریشن)</h4>
            {/* Urdu Text Display */}
            <div className="mb-3 rounded border border-slate-200 bg-white p-3 text-right text-xs text-slate-700 leading-relaxed" style={{ direction: 'rtl', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' }}>
              <p>میں اس بات کی اجازت دیتا ہوں کہ میرے مریض کا آپریشن کیا جائے۔</p>
              <p className="mt-1">آپریشن کے دوران کسی قسم کی ناخوشگوار صورتحال پیش آسکتی ہے جیسے خون کا اخراج، علاج کی ناکامی، آلہ (Ventilator) کی ضرورت اور ایسی دیگر پیچیدگیاں جو مریض کے لیے خطرناک ثابت ہو سکتی ہیں۔</p>
              <p className="mt-1">میں یہ اعلان کرتا ہوں کہ ڈاکٹر نے تمام معلومات سے آگاہ کر دیا ہے۔</p>
            </div>
            {/* Guardian/Signature Row */}
            <div className="mb-3 grid grid-cols-4 gap-3 border-t border-slate-200 pt-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Guardian (والد/بستی/سرپرست)</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.operationGuardian}
                  onChange={(e) => setForm({ ...form, operationGuardian: e.target.value })}
                  placeholder="نام"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Sign (دستخط)</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.operationSign}
                  onChange={(e) => setForm({ ...form, operationSign: e.target.value })}
                  placeholder="دستخط"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.operationDate}
                  onChange={(e) => setForm({ ...form, operationDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Time</label>
                <input
                  type="time"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.operationTime}
                  onChange={(e) => setForm({ ...form, operationTime: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Blood Transfusion Consent Section */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">3. Blood Transfusion Consent (اجازت نامہ برائے انتقال خون)</h4>
            {/* Urdu Text Display */}
            <div className="mb-3 rounded border border-slate-200 bg-white p-3 text-right text-xs text-slate-700 leading-relaxed" style={{ direction: 'rtl', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' }}>
              <p>میں اس بات کی اجازت دیتا ہوں کہ میرے مریض کو علاج کے دوران خون یا خون کے کسی جزو کی ضرورت پیش آئے تو منتقل کیا جائے۔</p>
              <p className="mt-1">میں نے طبی عملے کو آگاہ کر دیا ہے کہ میرے مریض کو کسی قسم کی الرجی یا خون کے اجزاء سے کوئی رد عمل نہیں ہے۔</p>
              <p className="mt-1">میں یہ اعلان کرتا ہوں کہ اس دوران پیش آنے والی کسی بھی پیچیدگی کے لیے ہسپتال/ڈاکٹر ذمہ دار نہیں ہوں گے۔</p>
              <p className="mt-1">کیے جانے والے علاج کے لیے ہم نے ہسپتال کے عملے سے رضا مندی ظاہر کی ہے اور رضا مندی ہم پر لاگو ہوگی۔</p>
            </div>
            {/* Guardian/Signature Row */}
            <div className="mb-3 grid grid-cols-4 gap-3 border-t border-slate-200 pt-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Guardian (والد/بستی/سرپرست)</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.bloodGuardian}
                  onChange={(e) => setForm({ ...form, bloodGuardian: e.target.value })}
                  placeholder="نام"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Sign (دستخط)</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.bloodSign}
                  onChange={(e) => setForm({ ...form, bloodSign: e.target.value })}
                  placeholder="دستخط"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.bloodDate}
                  onChange={(e) => setForm({ ...form, bloodDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Time</label>
                <input
                  type="time"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  value={form.bloodTime}
                  onChange={(e) => setForm({ ...form, bloodTime: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Doctor Signature */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Doctor</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Doctor Name</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.doctorName}
                  onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Signature</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.sign}
                  onChange={(e) => setForm({ ...form, sign: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
