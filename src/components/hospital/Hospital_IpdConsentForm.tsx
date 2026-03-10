import { useEffect, useState } from 'react'
import { hospitalApi } from '../../utils/api'

const CONSENT_NOTE_PREFIX = '[CONSENT_FORM]:'

export default function Hospital_IpdConsentForm({ encounterId }: { encounterId: string }){
  const [records, setRecords] = useState<Array<{
    id: string
    recordedAt: string
    guardianName: string
    relation: string
    cnic: string
    contact: string
    staffName: string
    sign: string
    date: string
    time: string
  }>>([])
  const [open, setOpen] = useState(false)

  useEffect(()=>{ if(encounterId){ reload() } }, [encounterId])

  async function reload(){
    try{
      const res = await hospitalApi.listIpdNotes(encounterId, { limit: 200 }) as any
      const items = (res.notes || [])
        .filter((n: any) => n.noteType === 'nursing' && n.text?.startsWith(CONSENT_NOTE_PREFIX))
        .map((n: any) => {
          try {
            const data = JSON.parse(n.text.substring(CONSENT_NOTE_PREFIX.length))
            return {
              id: String(n._id),
              recordedAt: String(n.createdAt || ''),
              guardianName: data.guardianName || '',
              relation: data.relation || '',
              cnic: data.cnic || '',
              contact: data.contact || '',
              staffName: data.staffName || '',
              sign: data.sign || '',
              date: data.date || '',
              time: data.time || '',
            }
          } catch {
            return null
          }
        })
        .filter(Boolean)
      setRecords(items)
    }catch{}
  }

  const add = async (d: {
    guardianName?: string
    patientName?: string
    relation?: string
    cnic?: string
    contact?: string
    staffName?: string
    sign?: string
    date?: string
    time?: string
  }) => {
    try{
      const payload = {
        guardianName: d.guardianName || '',
        relation: d.relation || '',
        cnic: d.cnic || '',
        contact: d.contact || '',
        staffName: d.staffName || '',
        sign: d.sign || '',
        date: d.date || '',
        time: d.time || '',
      }
      await hospitalApi.createIpdNote(encounterId, {
        noteType: 'nursing',
        text: CONSENT_NOTE_PREFIX + JSON.stringify(payload),
      })
      setOpen(false)
      await reload()
    }catch(e: any){ alert(e?.message || 'Failed to add consent form') }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-encounterid={encounterId}>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">رضا مندی فارم / Consent Form</div>
        <button onClick={()=>setOpen(true)} className="btn">Add Form</button>
      </div>

      {records.length === 0 ? (
        <div className="text-slate-500">No consent forms yet.</div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <ConsentFormDisplay
                guardianName={r.guardianName}
                relation={r.relation}
                cnic={r.cnic}
                contact={r.contact}
                staffName={r.staffName}
                sign={r.sign}
                date={r.date}
                time={r.time}
              />
              <div className="mt-2 text-right text-xs text-slate-500">
                Recorded: {new Date(r.recordedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConsentDialog open={open} onClose={()=>setOpen(false)} onSave={add} />
    </div>
  )
}

function ConsentFormDisplay({
  guardianName,
  relation,
  cnic,
  contact,
  staffName,
  sign,
  date,
  time,
}: {
  guardianName: string
  relation: string
  cnic: string
  contact: string
  staffName: string
  sign: string
  date: string
  time: string
}) {
  return (
    <div className="space-y-4" style={{ direction: 'rtl', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' }}>
      {/* Header */}
      <div className="text-center border-b border-slate-300 pb-3">
        <h2 className="text-xl font-bold text-slate-900">رضا مندی فارم</h2>
        <p className="text-sm text-slate-600 mt-1">طبی ادارے کا نام اور پتہ: واصف ایجنسی ہسپتال</p>
      </div>

      {/* Urdu Content */}
      <div className="text-right leading-relaxed text-slate-800 space-y-3 text-sm">
        <p>
          میں علاج کی خاطر سے ہسپتال میں داخل ہوں۔ اس سلسلے میں مریض کے تشخیص کے لیے ہر ممکنہ علاج اور طریقہ علاج کی اجازت دے رہا ہوں اور یہ کہ اس دوران کسی قسم کی پیدا ہونے والی پیچیدگی، ناگہانی موت وغیرہ کا ذمہ دار ہسپتال نہیں ہوگا۔
        </p>

        <p>
          مجھے علاج کے سلسلے میں تفصیلات کے بارے میں بتا دیا گیا ہے اور یہ بتایا گیا ہے کہ علاج کے دوران کوئی ناگہانی تو واقعات میں بھی تبدیلی ہو سکتی ہے۔
        </p>

        <p>
          ہسپتال کا عملہ مریض ہر مریض کے علاج کا ذمہ دار ہے اور صرف اس وجہ سے میرے کوئی جسمانی چیز میں ہسپتال کا عملہ اور ہسپتال ذمہ دار نہیں ہے۔
        </p>

        <p>
          میں ہسپتال کے قوانین کی پابندی کرں گا اور عملے کے ساتھ تعاون کرں گا اور ہسپتال میں قیام کے دوران مندرجہ ذیل قواعد و ضوابط کا پابند رہوں گا۔
        </p>

        <p>
          میں یقینی اشیاء، خصوصاً جہیز یا مہنگی چیزیں حفاظت خود کروں گا اور ہسپتال افراد سے بے جگہ رہوں گا۔
        </p>

        <div className="mt-4 space-y-1">
          <p>میں یہ بھی کہتا ہوں کہ میں نے ہسپتال کے اندر کسی قسم کے دھوکہ، دہشت گردی یا اسلحہ وغیرہ لے کر آؤں گا نہیں۔</p>
          <p>نیز یہ کہ کوئی غیر قانونی کام نہیں کرنا ہے۔</p>
        </div>
      </div>

      {/* Patient/Guardian Details */}
      <div className="grid grid-cols-2 gap-4 mt-6 text-right text-sm" style={{ direction: 'rtl' }}>
        <div>
          <span className="font-semibold">نام مریض/سرپرست: </span>
          <span className="border-b border-slate-400 px-2">{guardianName || '_________________'}</span>
        </div>
        <div>
          <span className="font-semibold">تعلق: </span>
          <span className="border-b border-slate-400 px-2">{relation || '_________________'}</span>
        </div>
        <div>
          <span className="font-semibold">شناختی کارڈ نمبر: </span>
          <span className="border-b border-slate-400 px-2">{cnic || '_________________'}</span>
        </div>
        <div>
          <span className="font-semibold">فون نمبر: </span>
          <span className="border-b border-slate-400 px-2">{contact || '_________________'}</span>
        </div>
      </div>

      {/* Signature Section */}
      <div className="mt-6 border-t border-slate-300 pt-4">
        <table className="w-full text-sm" style={{ direction: 'rtl' }}>
          <tbody>
            <tr className="border border-slate-300">
              <td className="p-2 border-l border-slate-300 font-semibold w-1/4">نام امراضی استری/ڈاکٹر:</td>
              <td className="p-2 border-l border-slate-300">{staffName || ''}</td>
              <td className="p-2 border-l border-slate-300 font-semibold w-16">دستخط:</td>
              <td className="p-2">{sign || ''}</td>
            </tr>
            <tr className="border border-slate-300 border-t-0">
              <td className="p-2 border-l border-slate-300 font-semibold">تاریخ:</td>
              <td className="p-2 border-l border-slate-300">{date || ''}</td>
              <td className="p-2 border-l border-slate-300 font-semibold">Time:</td>
              <td className="p-2">{time || ''}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ConsentDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (d: any) => void
}) {
  const [form, setForm] = useState({
    guardianName: '',
    patientName: '',
    relation: '',
    cnic: '',
    contact: '',
    staffName: '',
    sign: '',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Add Consent Form</h3>

        {/* Urdu Consent Text Display */}
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 max-h-48 overflow-y-auto" style={{ direction: 'rtl', fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' }}>
          <div className="text-right text-sm text-slate-800 space-y-2 leading-relaxed">
            <p className="font-semibold text-center mb-3">رضا مندی فارم</p>
            <p>
              میں علاج کی خاطر سے ہسپتال میں داخل ہوں۔ اس سلسلے میں مریض کے تشخیص کے لیے ہر ممکنہ علاج اور طریقہ علاج کی اجازت دے رہا ہوں اور یہ کہ اس دوران کسی قسم کی پیدا ہونے والی پیچیدگی، ناگہانی موت وغیرہ کا ذمہ دار ہسپتال نہیں ہوگا۔
            </p>
            <p>
              مجھے علاج کے سلسلے میں تفصیلات کے بارے میں بتا دیا گیا ہے اور یہ بتایا گیا ہے کہ علاج کے دوران کوئی ناگہانی تو واقعات میں بھی تبدیلی ہو سکتی ہے۔
            </p>
            <p>
              ہسپتال کا عملہ مریض ہر مریض کے علاج کا ذمہ دار ہے اور صرف اس وجہ سے میرے کوئی جسمانی چیز میں ہسپتال کا عملہ اور ہسپتال ذمہ دار نہیں ہے۔
            </p>
            <p>
              میں ہسپتال کے قوانین کی پابندی کرں گا اور عملے کے ساتھ تعاون کرں گا اور ہسپتال میں قیام کے دوران مندرجہ ذیل قواعد و ضوابط کا پابند رہوں گا۔
            </p>
            <p>
              میں یقینی اشیاء، خصوصاً جہیز یا مہنگی چیزیں حفاظت خود کروں گا اور ہسپتال افراد سے بے جگہ رہوں گا۔
            </p>
            <p>میں یہ بھی کہتا ہوں کہ میں نے ہسپتال کے اندر کسی قسم کے دھوکہ، دہشت گردی یا اسلحہ وغیرہ لے کر آؤں گا نہیں۔</p>
            <p>نیز یہ کہ کوئی غیر قانونی کام نہیں کرنا ہے۔</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Guardian/Patient Name</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.guardianName}
                onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                placeholder="نام مریض/سرپرست"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Relation</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.relation}
                onChange={(e) => setForm({ ...form, relation: e.target.value })}
                placeholder="تعلق"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">CNIC Number</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.cnic}
                onChange={(e) => setForm({ ...form, cnic: e.target.value })}
                placeholder="شناختی کارڈ نمبر"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Contact Number</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="فون نمبر"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Staff Signature</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Staff Name</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.staffName}
                  onChange={(e) => setForm({ ...form, staffName: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Sign</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.sign}
                  onChange={(e) => setForm({ ...form, sign: e.target.value })}
                  placeholder="دستخط"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Time</label>
              <input
                type="time"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
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
