import { LabCounter } from '../modules/lab/models/Counter'
import { LabPatient } from '../modules/lab/models/Patient'
import { HospitalToken } from '../modules/hospital/models/Token'

/**
 * Generate the next global MRN.
 * - Uses a single atomic counter: lab_counters._id = "mrn_global".
 * - Optional formatting via HospitalSettings.mrFormat.
 *   Supported tokens: {HOSP}, {DEPT}, {YEAR}/{YYYY}, {YY}, {MONTH}/{MM}, {SERIAL}, {SERIAL6} ...
 * - Since MRN is global, {DEPT} is normalized to 'HOSP' to keep MRNs consistent across modules.
 */
export async function nextGlobalMrn(): Promise<string> {
  // Atomic global counter
  const key = 'mrn_global'
  let c: any = await LabCounter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  // If counter was (re)created, align it with existing MRNs so we don't start from 1 again.
  if (c && Number(c.seq) === 1) {
    try {
      const [labPats, hospPats] = await Promise.all([
        LabPatient.find({ mrn: /^MR-\d+$/i }).select('mrn').lean(),
        HospitalToken.find({ mrn: /^MR-\d+$/i }).select('mrn').lean(),
      ])
      const all = [...(labPats || []), ...(hospPats || [])]
      const maxSeq = (all || []).reduce((mx: number, p: any) => {
        try {
          const s = String(p?.mrn || '')
          const n = parseInt(s.replace(/^MR-/i, ''), 10)
          return isNaN(n) ? mx : Math.max(mx, n)
        } catch {
          return mx
        }
      }, 0)
      if (maxSeq > 0) {
        c = await LabCounter.findOneAndUpdate({ _id: key, seq: 1 }, { $set: { seq: maxSeq + 1 } }, { new: true })
      }
    } catch {}
  }

  const seqNum = Number((c as any)?.seq || 1)

  const seq = String(seqNum)
  return `MR-${seq}`
}
