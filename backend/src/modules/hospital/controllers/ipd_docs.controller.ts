import { Request, Response } from 'express'
import { z } from 'zod'
import { HospitalEncounter } from '../models/Encounter'
import { HospitalIpdDischargeSummary } from '../models/IpdDischargeSummary'
import { HospitalIpdDeathCertificate } from '../models/IpdDeathCertificate'
import { HospitalSettings } from '../models/Settings'
import { HospitalIpdBillingItem } from '../models/IpdBillingItem'
import { HospitalIpdPayment } from '../models/IpdPayment'
import { LabPatient } from '../../lab/models/Patient'
import { HospitalDoctor } from '../models/Doctor'
import { HospitalIpdShortStay } from '../models/IpdShortStay'
import { HospitalIpdReceivedDeath } from '../models/IpdReceivedDeath'
import { HospitalIpdBirthCertificate } from '../models/IpdBirthCertificate'

async function getEncounterOr404(id: string, res: Response){
  const enc: any = await HospitalEncounter.findById(id).lean()
  if (!enc){ res.status(404).json({ error: 'Encounter not found' }); return null }
  if (enc.type !== 'IPD'){ res.status(400).json({ error: 'Not an IPD encounter' }); return null }
  return enc
}

export async function listBirthCertificates(req: Request, res: Response){
  const { q = '', from, to, page = '1', limit = '20' } = req.query as any
  const p = Math.max(1, Number(page)||1)
  const l = Math.max(1, Math.min(200, Number(limit)||20))
  const match: any = {}
  if (from || to){
    match.createdAt = {}
    if (from) match.createdAt.$gte = new Date(String(from))
    if (to) match.createdAt.$lte = new Date(String(to))
  }
  const rx = String(q||'').trim() ? new RegExp(String(q||'').trim(), 'i') : null
  const pipeline: any[] = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $lookup: { from: 'lab_patients', localField: 'patientId', foreignField: '_id', as: 'patient' } },
    { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hospital_encounters', localField: 'encounterId', foreignField: '_id', as: 'enc' } },
    { $unwind: { path: '$enc', preserveNullAndEmptyArrays: true } },
  ]
  if (rx){
    pipeline.push({ $match: { $or: [
      { motherName: rx },
      { mrNumber: rx },
      { phone: rx },
      { 'patient.fullName': rx },
      { 'patient.mrn': rx },
      { 'patient.phoneNormalized': rx },
    ] } })
  }
  pipeline.push({ $facet: {
    results: [
      { $skip: (p-1)*l }, { $limit: l },
      { $project: {
        _id: 1, encounterId: 1, createdAt: 1, srNo: 1,
        motherName: 1, mrNumber: 1, phone: 1, dateOfBirth: 1, timeOfBirth: 1,
      } },
    ],
    total: [ { $count: 'count' } ],
  } })
  pipeline.push({ $project: { results: 1, total: { $ifNull: [ { $arrayElemAt: [ '$total.count', 0 ] }, 0 ] } } })
  const agg = await HospitalIpdBirthCertificate.aggregate(pipeline as any)
  const row = agg[0] || { results: [], total: 0 }
  res.json({ page: p, limit: l, total: row.total, results: row.results })
}

export async function deleteBirthCertificate(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  await HospitalIpdBirthCertificate.deleteOne({ encounterId: enc._id })
  res.json({ ok: true })
}

// Standalone Birth Certificate (no encounter) ---------------------------------
export async function createBirthCertificateStandalone(req: Request, res: Response){
  const data = birthSchema.parse(req.body)
  // Compute monthly serial like YYYYMM_count
  const now = new Date()
  const ym = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 1)
  const cnt = await HospitalIpdBirthCertificate.countDocuments({ createdAt: { $gte: monthStart, $lt: monthEnd } })
  const srNo = `${ym}_${cnt+1}`
  const patch: any = { ...data, srNo }
  if (data.dateOfBirth) patch.dateOfBirth = new Date(data.dateOfBirth)
  if (!patch.bcSerialNo) patch.bcSerialNo = srNo
  const doc = await HospitalIpdBirthCertificate.create(patch)
  res.json({ birthCertificate: doc })
}

export async function updateBirthCertificateStandalone(req: Request, res: Response){
  const { id } = req.params as any
  const data = birthSchema.parse(req.body)
  const patch: any = { ...data }
  if (data.dateOfBirth) patch.dateOfBirth = new Date(data.dateOfBirth)
  const doc = await HospitalIpdBirthCertificate.findByIdAndUpdate(id, patch, { new: true })
  res.json({ birthCertificate: doc })
}

export async function getBirthCertificateById(req: Request, res: Response){
  const { id } = req.params as any
  const doc = await HospitalIpdBirthCertificate.findById(id).lean()
  res.json({ birthCertificate: doc || null })
}

export async function deleteBirthCertificateById(req: Request, res: Response){
  const { id } = req.params as any
  await HospitalIpdBirthCertificate.findByIdAndDelete(id)
  res.json({ ok: true })
}

export async function printBirthCertificateById(req: Request, res: Response){
  const { id } = req.params as any
  const cert: any = await HospitalIpdBirthCertificate.findById(id).lean()
  if (!cert) return res.status(404).send('No birth certificate found')
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = cert.patientId ? await LabPatient.findById(cert.patientId).lean() : null
  const doctor: any = cert.doctorId ? await HospitalDoctor.findById(cert.doctorId).lean() : null
  const html = renderBirthHTML(settings, null, patient, doctor, cert)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}

export async function printBirthCertificateByIdPdf(req: Request, res: Response){
  const { id } = req.params as any
  const doc: any = await HospitalIpdBirthCertificate.findById(id).lean()
  if (!doc) return res.status(404).send('No birth certificate found')
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = doc.patientId ? await LabPatient.findById(doc.patientId).lean() : null
  const doctor: any = doc.doctorId ? await HospitalDoctor.findById(doc.doctorId).lean() : null
  const html = renderBirthHTML(settings, null, patient, doctor, doc)
  let puppeteer: any
  try { puppeteer = require('puppeteer') } catch { return res.status(500).send('PDF generator not available') }
  let browser: any = null
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] as any, headless: true })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="birth-certificate-${Date.now()}.pdf"`)
    res.send(pdf)
  } catch {
    res.status(500).send('Failed to render PDF')
  } finally { try { await browser?.close() } catch {} }
}

function renderBirthHTML(settings: any, enc: any, patient: any, doctor: any, b: any){
  const head = `${hdr(settings)}<h2 style="margin:12px 0; text-align:center;">Birth Certificate</h2>`
  const sr = `<div style="margin:4px 0;"><b>Birth Serial No.</b> ${escapeHtml(b?.srNo||b?.bcSerialNo||'')}</div>`
  const row = (label: string, value: any) => `<div style="display:flex;gap:8px;margin:4px 0;"><div style="min-width:180px;"><b>${label}</b></div><div style="flex:1;border-bottom:1px solid #000;">${escapeHtml(String(value||''))}</div></div>`
  const dob = b?.dateOfBirth ? new Date(b.dateOfBirth) : null
  const dobGrid = `
    <table style="width:100%;border-collapse:collapse;margin:8px 0;">
      <tr>
        <td style="border:1px solid #000;padding:4px;text-align:center;min-width:80px;">DATE</td>
        <td style="border:1px solid #000;padding:4px;text-align:center;">Day<br><b>${dob? String(dob.getDate()).padStart(2,'0'):''}</b></td>
        <td style="border:1px solid #000;padding:4px;text-align:center;">Month<br><b>${dob? String(dob.getMonth()+1).padStart(2,'0'):''}</b></td>
        <td style="border:1px solid #000;padding:4px;text-align:center;">Year<br><b>${dob? dob.getFullYear():''}</b></td>
        <td style="border:1px solid #000;padding:4px;text-align:center;min-width:120px;">Time of Birth<br><b>${escapeHtml(b?.timeOfBirth||'')}</b></td>
      </tr>
      <tr>
        <td style="border:1px solid #000;padding:4px;">MODE OF BIRTH</td>
        <td colspan="2" style="border:1px solid #000;padding:4px;">SVD / Instrumental / C/Section</td>
        <td colspan="2" style="border:1px solid #000;padding:4px;">${escapeHtml([b?.deliveryType,b?.deliveryMode].filter(Boolean).join(' / ')) || '&nbsp;'}</td>
      </tr>
    </table>
  `
  const body = [
    sr,
    row('Doctor', doctor?.fullName || doctor?.name || ''),
    row('Mother Name', b?.motherName),
    row('Father Name', b?.fatherName),
    row('Sex of Baby', b?.sexOfBaby),
    row('Name of Baby', b?.babyName),
    row('Address', b?.address),
    dobGrid,
    row('Condition at Birth', b?.conditionAtBirth),
    row('Weight at Birth', b?.weightAtBirth),
    row('Blood Group', b?.bloodGroup),
    row('Birth Mark (If Any)', b?.birthMark),
    row('Congenital Abnormality / Birth Injury (If Any)', b?.congenitalAbnormality),
    row('Baby Handed over to', b?.babyHandedOverTo),
    (b?.notes ? box('Notes', nl2br(escapeHtml(b?.notes))) : ''),
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px;">
        <div style="border-top:1px solid #000;text-align:center;padding-top:6px;">Signature of Parent/Relation${b?.parentSignature?`: ${escapeHtml(b.parentSignature)}`:''}</div>
        <div style="border-top:1px solid #000;text-align:center;padding-top:6px;">Sign. & Stamp of Doctor${b?.doctorSignature?`: ${escapeHtml(b.doctorSignature)}`:''}</div>
     </div>`
  ].join('')
  return wrap(head + body)
}

// Birth Certificate -----------------------------------------------------------
const birthSchema = z.object({
  bcSerialNo: z.string().optional(),
  motherName: z.string().optional(),
  fatherName: z.string().optional(),
  mrNumber: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  babyName: z.string().optional(),
  sexOfBaby: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  timeOfBirth: z.string().optional(),
  deliveryType: z.string().optional(),
  deliveryMode: z.string().optional(),
  conditionAtBirth: z.string().optional(),
  weightAtBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  birthMark: z.string().optional(),
  congenitalAbnormality: z.string().optional(),
  babyHandedOverTo: z.string().optional(),
  notes: z.string().optional(),
  parentSignature: z.string().optional(),
  doctorSignature: z.string().optional(),
  createdBy: z.string().optional(),
})

export async function upsertBirthCertificate(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const data = birthSchema.parse(req.body)
  const patch: any = { ...data }
  if (data.dateOfBirth) patch.dateOfBirth = new Date(data.dateOfBirth)
  patch.patientId = enc.patientId
  patch.doctorId = enc.doctorId
  patch.departmentId = enc.departmentId
  const existing = await HospitalIpdBirthCertificate.findOne({ encounterId: enc._id })
  let doc: any
  if (existing){
    doc = await HospitalIpdBirthCertificate.findOneAndUpdate({ encounterId: enc._id }, patch, { new: true })
  } else {
    doc = await HospitalIpdBirthCertificate.create({ encounterId: enc._id, ...patch })
  }
  res.json({ birthCertificate: doc })
}

export async function getBirthCertificate(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const doc = await HospitalIpdBirthCertificate.findOne({ encounterId: enc._id }).lean()
  res.json({ birthCertificate: doc || null })
}

export async function printBirthCertificate(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const cert: any = await HospitalIpdBirthCertificate.findOne({ encounterId: enc._id }).lean()
  if (!cert) return res.status(404).send('No birth certificate found')
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = await LabPatient.findById(enc.patientId).lean()
  const doctor: any = enc.doctorId ? await HospitalDoctor.findById(enc.doctorId).lean() : null
  const html = renderBirthHTML(settings, enc, patient, doctor, cert)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}

export async function printBirthCertificatePdf(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const doc: any = await HospitalIpdBirthCertificate.findOne({ encounterId: enc._id }).lean()
  if (!doc) return res.status(404).send('No birth certificate found')
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = await LabPatient.findById(enc.patientId).lean()
  const doctor: any = enc.doctorId ? await HospitalDoctor.findById(enc.doctorId).lean() : null
  const html = renderBirthHTML(settings, enc, patient, doctor, doc)
  let puppeteer: any
  try { puppeteer = require('puppeteer') } catch { return res.status(500).send('PDF generator not available') }
  let browser: any = null
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] as any, headless: true })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="birth-certificate-${Date.now()}.pdf"`)
    res.send(pdf)
  } catch {
    res.status(500).send('Failed to render PDF')
  } finally { try { await browser?.close() } catch {} }
}

const dischargeSchema = z.object({
  diagnosis: z.string().optional(),
  courseInHospital: z.string().optional(),
  procedures: z.array(z.string()).optional(),
  conditionAtDischarge: z.string().optional(),
  medications: z.array(z.string()).optional(),
  advice: z.string().optional(),
  followUpDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
})

// Short Stay form: flexible payload with optional structured times
const shortStaySchema = z.object({
  admittedAt: z.string().datetime().optional(),
  dischargedAt: z.string().datetime().optional(),
  data: z.any().optional(),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
})

// Short Stay: upsert and get
export async function upsertShortStay(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const data = shortStaySchema.parse(req.body)
  const patch: any = { ...data }
  if (data.admittedAt) patch.admittedAt = new Date(data.admittedAt)
  if (data.dischargedAt) patch.dischargedAt = new Date(data.dischargedAt)
  patch.encounterId = enc._id
  patch.patientId = enc.patientId
  patch.doctorId = enc.doctorId
  patch.departmentId = enc.departmentId
  const existing = await HospitalIpdShortStay.findOne({ encounterId: enc._id })
  let doc: any
  if (existing){
    doc = await HospitalIpdShortStay.findOneAndUpdate({ encounterId: enc._id }, patch, { new: true })
  } else {
    doc = await HospitalIpdShortStay.create(patch)
  }
  res.json({ shortStay: doc })
}

export async function getShortStay(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const doc = await HospitalIpdShortStay.findOne({ encounterId: enc._id }).lean()
  res.json({ shortStay: doc || null })
}

export async function upsertDischargeSummary(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const data = dischargeSchema.parse(req.body)
  const patch: any = { ...data }
  if (data.followUpDate) patch.followUpDate = new Date(data.followUpDate)
  patch.patientId = enc.patientId
  patch.doctorId = enc.doctorId
  patch.departmentId = enc.departmentId
  if (!enc.endAt) { try { patch.dischargeDate = new Date() } catch {} }
  const existing = await HospitalIpdDischargeSummary.findOne({ encounterId: enc._id })
  let doc: any
  if (existing){
    doc = await HospitalIpdDischargeSummary.findOneAndUpdate({ encounterId: enc._id }, patch, { new: true })
  } else {
    doc = await HospitalIpdDischargeSummary.create({ encounterId: enc._id, ...patch })
  }
  res.json({ summary: doc })
}

export async function getDischargeSummary(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const doc = await HospitalIpdDischargeSummary.findOne({ encounterId: enc._id }).lean()
  res.json({ summary: doc || null })
}

export async function printDischargeSummary(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const summary: any = await HospitalIpdDischargeSummary.findOne({ encounterId: enc._id }).lean()
  if (!summary) return res.status(404).send('No discharge summary found')
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = await LabPatient.findById(enc.patientId).lean()
  const doctor: any = enc.doctorId ? await HospitalDoctor.findById(enc.doctorId).lean() : null
  const html = renderDischargeHTML(settings, enc, patient, doctor, summary)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}
// Received Death (clean structured form)
const receivedDeathSchema = z.object({
  srNo: z.string().optional(),
  patientCnic: z.string().optional(),
  relative: z.string().optional(),
  ageSex: z.string().optional(),
  emergencyReportedDate: z.string().datetime().optional(),
  emergencyReportedTime: z.string().optional(),
  receiving: z.object({
    pulse: z.string().optional(),
    bloodPressure: z.string().optional(),
    respiratoryRate: z.string().optional(),
    pupils: z.string().optional(),
    cornealReflex: z.string().optional(),
    ecg: z.string().optional(),
  }).partial().optional(),
  diagnosis: z.string().optional(),
  attendantName: z.string().optional(),
  attendantRelative: z.string().optional(),
  attendantRelation: z.string().optional(),
  attendantAddress: z.string().optional(),
  attendantCnic: z.string().optional(),
  deathDeclaredBy: z.string().optional(),
  chargeNurseName: z.string().optional(),
  doctorName: z.string().optional(),
  createdBy: z.string().optional(),
})

export async function upsertReceivedDeath(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const data = receivedDeathSchema.parse(req.body)
  const patch: any = { ...data }
  if (data.emergencyReportedDate) patch.emergencyReportedDate = new Date(data.emergencyReportedDate)
  patch.patientId = enc.patientId
  patch.doctorId = enc.doctorId
  patch.departmentId = enc.departmentId
  const existing = await HospitalIpdReceivedDeath.findOne({ encounterId: enc._id })
  let doc: any
  if (existing){
    doc = await HospitalIpdReceivedDeath.findOneAndUpdate({ encounterId: enc._id }, patch, { new: true })
  } else {
    doc = await HospitalIpdReceivedDeath.create({ encounterId: enc._id, ...patch })
  }
  res.json({ receivedDeath: doc })
}

export async function getReceivedDeath(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const doc = await HospitalIpdReceivedDeath.findOne({ encounterId: enc._id }).lean()
  res.json({ receivedDeath: doc || null })
}

export async function printReceivedDeath(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const cert: any = await HospitalIpdReceivedDeath.findOne({ encounterId: enc._id }).lean()
  if (!cert) return res.status(404).send('No received death document found')
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = await LabPatient.findById(enc.patientId).lean()
  const doctor: any = enc.doctorId ? await HospitalDoctor.findById(enc.doctorId).lean() : null
  const html = renderReceivedDeathHTML(settings, enc, patient, doctor, cert)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}

export async function printReceivedDeathPdf(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const doc: any = await HospitalIpdReceivedDeath.findOne({ encounterId: enc._id }).lean()
  if (!doc) return res.status(404).send('No received death document found')
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = await LabPatient.findById(enc.patientId).lean()
  const doctor: any = enc.doctorId ? await HospitalDoctor.findById(enc.doctorId).lean() : null
  const html = renderReceivedDeathHTML(settings, enc, patient, doctor, doc)
  let puppeteer: any
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    puppeteer = require('puppeteer')
  } catch {
    return res.status(500).send('PDF generator not available')
  }
  let browser: any = null
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] as any, headless: true })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="received-death-${Date.now()}.pdf"`)
    res.send(pdf)
  } catch {
    res.status(500).send('Failed to render PDF')
  } finally {
    try { await browser?.close() } catch {}
  }
}

export async function printDischargeSummaryPdf(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const summary: any = await HospitalIpdDischargeSummary.findOne({ encounterId: enc._id }).lean()
  if (!summary) return res.status(404).send('No discharge summary found')
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = await LabPatient.findById(enc.patientId).lean()
  const doctor: any = enc.doctorId ? await HospitalDoctor.findById(enc.doctorId).lean() : null
  const html = renderDischargeHTML(settings, enc, patient, doctor, summary)
  let puppeteer: any
  try {
    // Lazy require so server can start even if puppeteer isn't installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    puppeteer = require('puppeteer')
  } catch {
    return res.status(500).send('PDF generator not available')
  }
  let browser: any = null
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] as any, headless: true })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="discharge-summary-${Date.now()}.pdf"`)
    res.send(pdf)
  } catch (e) {
    res.status(500).send('Failed to render PDF')
  } finally {
    try { await browser?.close() } catch {}
  }
}

const deathSchema = z.object({
  // Existing simple fields
  dateOfDeath: z.string().datetime().optional(),
  timeOfDeath: z.string().optional(),
  causeOfDeath: z.string().optional(),
  placeOfDeath: z.string().optional(),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
  // New structured fields from redesigned form
  dcNo: z.string().optional(),
  mrNumber: z.string().optional(),
  relative: z.string().optional(),
  ageSex: z.string().optional(),
  address: z.string().optional(),
  presentingComplaints: z.string().optional(),
  diagnosis: z.string().optional(),
  primaryCause: z.string().optional(),
  secondaryCause: z.string().optional(),
  receiverName: z.string().optional(),
  receiverRelation: z.string().optional(),
  receiverIdCard: z.string().optional(),
  receiverDate: z.string().datetime().optional(),
  receiverTime: z.string().optional(),
  staffName: z.string().optional(),
  staffSignDate: z.string().datetime().optional(),
  staffSignTime: z.string().optional(),
  doctorName: z.string().optional(),
  doctorSignDate: z.string().datetime().optional(),
  doctorSignTime: z.string().optional(),
})

export async function upsertDeathCertificate(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const data = deathSchema.parse(req.body)
  const patch: any = { ...data }
  if (data.dateOfDeath) patch.dateOfDeath = new Date(data.dateOfDeath)
  if (data.receiverDate) patch.receiverDate = new Date(data.receiverDate)
  if (data.staffSignDate) patch.staffSignDate = new Date(data.staffSignDate)
  if (data.doctorSignDate) patch.doctorSignDate = new Date(data.doctorSignDate)
  patch.patientId = enc.patientId
  patch.doctorId = enc.doctorId
  patch.departmentId = enc.departmentId
  const existing = await HospitalIpdDeathCertificate.findOne({ encounterId: enc._id })
  let doc: any
  if (existing){
    doc = await HospitalIpdDeathCertificate.findOneAndUpdate({ encounterId: enc._id }, patch, { new: true })
  } else {
    doc = await HospitalIpdDeathCertificate.create({ encounterId: enc._id, ...patch })
  }
  res.json({ certificate: doc })
}

export async function getDeathCertificate(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const doc = await HospitalIpdDeathCertificate.findOne({ encounterId: enc._id }).lean()
  res.json({ certificate: doc || null })
}

export async function printDeathCertificate(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const cert: any = await HospitalIpdDeathCertificate.findOne({ encounterId: enc._id }).lean()
  if (!cert) return res.status(404).send('No death certificate found')
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = await LabPatient.findById(enc.patientId).lean()
  const doctor: any = enc.doctorId ? await HospitalDoctor.findById(enc.doctorId).lean() : null
  const html = renderDeathHTML(settings, enc, patient, doctor, cert)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}

export async function printDeathCertificatePdf(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const doc: any = await HospitalIpdDeathCertificate.findOne({ encounterId: enc._id }).lean()
  if (!doc) return res.status(404).send('No death certificate found')
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = await LabPatient.findById(enc.patientId).lean()
  const doctor: any = enc.doctorId ? await HospitalDoctor.findById(enc.doctorId).lean() : null
  const html = renderDeathHTML(settings, enc, patient, doctor, doc)
  let puppeteer: any
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    puppeteer = require('puppeteer')
  } catch {
    return res.status(500).send('PDF generator not available')
  }
  let browser: any = null
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] as any, headless: true })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="death-certificate-${Date.now()}.pdf"`)
    res.send(pdf)
  } catch {
    res.status(500).send('Failed to render PDF')
  } finally {
    try { await browser?.close() } catch {}
  }
}

export async function getFinalInvoice(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const items: any[] = await HospitalIpdBillingItem.find({ encounterId: enc._id }).sort({ date: 1 }).lean()
  const payments: any[] = await HospitalIpdPayment.find({ encounterId: enc._id }).sort({ receivedAt: 1 }).lean()
  const subtotal = items.reduce((s,i)=> s + Number(i.amount||0), 0)
  const paid = payments.reduce((s,p)=> s + Number(p.amount||0), 0)
  const deposit = Number(enc.deposit||0)
  const totalPaid = paid + deposit
  const balance = Math.max(0, subtotal - totalPaid)
  res.json({
    encounterId: String(enc._id),
    admissionNo: enc.admissionNo,
    startAt: enc.startAt,
    endAt: enc.endAt,
    subtotal,
    deposit,
    paid,
    totalPaid,
    balance,
    items,
    payments,
  })
}

export async function printFinalInvoice(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  const items: any[] = await HospitalIpdBillingItem.find({ encounterId: enc._id }).sort({ date: 1 }).lean()
  const payments: any[] = await HospitalIpdPayment.find({ encounterId: enc._id }).sort({ receivedAt: 1 }).lean()
  const settings: any = await HospitalSettings.findOne({}).lean()
  const patient: any = await LabPatient.findById(enc.patientId).lean()
  const doctor: any = enc.doctorId ? await HospitalDoctor.findById(enc.doctorId).lean() : null
  const html = renderInvoiceHTML(settings, enc, patient, doctor, items, payments)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}

// Lists for standalone pages --------------------------------------------------
export async function listReceivedDeaths(req: Request, res: Response){
  const { q = '', from, to, page = '1', limit = '20' } = req.query as any
  const p = Math.max(1, Number(page)||1)
  const l = Math.max(1, Math.min(200, Number(limit)||20))
  const match: any = {}
  if (from || to){
    match.createdAt = {}
    if (from) match.createdAt.$gte = new Date(String(from))
    if (to) match.createdAt.$lte = new Date(String(to))
  }
  const rx = String(q||'').trim() ? new RegExp(String(q||'').trim(), 'i') : null
  const pipeline: any[] = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $lookup: { from: 'lab_patients', localField: 'patientId', foreignField: '_id', as: 'patient' } },
    { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hospital_encounters', localField: 'encounterId', foreignField: '_id', as: 'enc' } },
    { $unwind: { path: '$enc', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hospital_departments', localField: 'enc.departmentId', foreignField: '_id', as: 'dept' } },
    { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
  ]
  if (rx){
    pipeline.push({ $match: { $or: [
      { srNo: rx },
      { 'patient.fullName': rx },
      { 'patient.mrn': rx },
      { 'patient.cnicNormalized': rx },
      { 'patient.phoneNormalized': rx },
      { 'dept.name': rx },
    ] } })
  }
  pipeline.push({ $facet: {
    results: [
      { $skip: (p-1)*l }, { $limit: l },
      { $project: {
        _id: 1, encounterId: 1, createdAt: 1, srNo: 1,
        patientName: '$patient.fullName', mrn: '$patient.mrn', cnic: '$patient.cnicNormalized', phone: '$patient.phoneNormalized', department: '$dept.name',
      } },
    ],
    total: [ { $count: 'count' } ],
  } })
  pipeline.push({ $project: { results: 1, total: { $ifNull: [ { $arrayElemAt: [ '$total.count', 0 ] }, 0 ] } } })
  const agg = await HospitalIpdReceivedDeath.aggregate(pipeline as any)
  const row = agg[0] || { results: [], total: 0 }
  res.json({ page: p, limit: l, total: row.total, results: row.results })
}

export async function listDeathCertificates(req: Request, res: Response){
  const { q = '', from, to, page = '1', limit = '20' } = req.query as any
  const p = Math.max(1, Number(page)||1)
  const l = Math.max(1, Math.min(200, Number(limit)||20))
  const match: any = {}
  if (from || to){
    match.createdAt = {}
    if (from) match.createdAt.$gte = new Date(String(from))
    if (to) match.createdAt.$lte = new Date(String(to))
  }
  const rx = String(q||'').trim() ? new RegExp(String(q||'').trim(), 'i') : null
  const pipeline: any[] = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $lookup: { from: 'lab_patients', localField: 'patientId', foreignField: '_id', as: 'patient' } },
    { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hospital_encounters', localField: 'encounterId', foreignField: '_id', as: 'enc' } },
    { $unwind: { path: '$enc', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hospital_departments', localField: 'enc.departmentId', foreignField: '_id', as: 'dept' } },
    { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
  ]
  if (rx){
    pipeline.push({ $match: { $or: [
      { 'patient.fullName': rx },
      { 'patient.mrn': rx },
      { 'patient.cnicNormalized': rx },
      { 'patient.phoneNormalized': rx },
      { 'dept.name': rx },
    ] } })
  }
  pipeline.push({ $facet: {
    results: [
      { $skip: (p-1)*l }, { $limit: l },
      { $project: {
        _id: 1, encounterId: 1, createdAt: 1,
        patientName: '$patient.fullName', mrn: '$patient.mrn', cnic: '$patient.cnicNormalized', phone: '$patient.phoneNormalized', department: '$dept.name',
      } },
    ],
    total: [ { $count: 'count' } ],
  } })
  pipeline.push({ $project: { results: 1, total: { $ifNull: [ { $arrayElemAt: [ '$total.count', 0 ] }, 0 ] } } })
  const agg = await HospitalIpdDeathCertificate.aggregate(pipeline as any)
  const row = agg[0] || { results: [], total: 0 }
  res.json({ page: p, limit: l, total: row.total, results: row.results })
}

export async function listShortStays(req: Request, res: Response){
  const { q = '', from, to, page = '1', limit = '20' } = req.query as any
  const p = Math.max(1, Number(page)||1)
  const l = Math.max(1, Math.min(200, Number(limit)||20))
  const match: any = {}
  if (from || to){
    match.createdAt = {}
    if (from) match.createdAt.$gte = new Date(String(from))
    if (to) match.createdAt.$lte = new Date(String(to))
  }
  const rx = String(q||'').trim() ? new RegExp(String(q||'').trim(), 'i') : null
  const pipeline: any[] = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $lookup: { from: 'lab_patients', localField: 'patientId', foreignField: '_id', as: 'patient' } },
    { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hospital_encounters', localField: 'encounterId', foreignField: '_id', as: 'enc' } },
    { $unwind: { path: '$enc', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hospital_departments', localField: 'enc.departmentId', foreignField: '_id', as: 'dept' } },
    { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
  ]
  if (rx){
    pipeline.push({ $match: { $or: [
      { 'patient.fullName': rx },
      { 'patient.mrn': rx },
      { 'patient.cnicNormalized': rx },
      { 'patient.phoneNormalized': rx },
      { 'dept.name': rx },
    ] } })
  }
  pipeline.push({ $facet: {
    results: [
      { $skip: (p-1)*l }, { $limit: l },
      { $project: {
        _id: 1, encounterId: 1, createdAt: 1,
        patientName: '$patient.fullName', mrn: '$patient.mrn', cnic: '$patient.cnicNormalized', phone: '$patient.phoneNormalized', department: '$dept.name',
      } },
    ],
    total: [ { $count: 'count' } ],
  } })
  pipeline.push({ $project: { results: 1, total: { $ifNull: [ { $arrayElemAt: [ '$total.count', 0 ] }, 0 ] } } })
  const agg = await HospitalIpdShortStay.aggregate(pipeline as any)
  const row = agg[0] || { results: [], total: 0 }
  res.json({ page: p, limit: l, total: row.total, results: row.results })
}

export async function listDischargeSummaries(req: Request, res: Response){
  const { q = '', from, to, page = '1', limit = '20' } = req.query as any
  const p = Math.max(1, Number(page)||1)
  const l = Math.max(1, Math.min(200, Number(limit)||20))
  const match: any = {}
  if (from || to){
    match.createdAt = {}
    if (from) match.createdAt.$gte = new Date(String(from))
    if (to) match.createdAt.$lte = new Date(String(to))
  }
  const rx = String(q||'').trim() ? new RegExp(String(q||'').trim(), 'i') : null
  const pipeline: any[] = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $lookup: { from: 'lab_patients', localField: 'patientId', foreignField: '_id', as: 'patient' } },
    { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hospital_encounters', localField: 'encounterId', foreignField: '_id', as: 'enc' } },
    { $unwind: { path: '$enc', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hospital_departments', localField: 'enc.departmentId', foreignField: '_id', as: 'dept' } },
    { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
  ]
  if (rx){
    pipeline.push({ $match: { $or: [
      { 'patient.fullName': rx },
      { 'patient.mrn': rx },
      { 'patient.cnicNormalized': rx },
      { 'patient.phoneNormalized': rx },
      { 'dept.name': rx },
    ] } })
  }
  pipeline.push({ $facet: {
    results: [
      { $skip: (p-1)*l }, { $limit: l },
      { $project: {
        _id: 1, encounterId: 1, createdAt: 1,
        patientName: '$patient.fullName', mrn: '$patient.mrn', cnic: '$patient.cnicNormalized', phone: '$patient.phoneNormalized', department: '$dept.name',
      } },
    ],
    total: [ { $count: 'count' } ],
  } })
  pipeline.push({ $project: { results: 1, total: { $ifNull: [ { $arrayElemAt: [ '$total.count', 0 ] }, 0 ] } } })
  const agg = await HospitalIpdDischargeSummary.aggregate(pipeline as any)
  const row = agg[0] || { results: [], total: 0 }
  res.json({ page: p, limit: l, total: row.total, results: row.results })
}

// Deletes (by encounter)
export async function deleteReceivedDeath(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  await HospitalIpdReceivedDeath.deleteOne({ encounterId: enc._id })
  res.json({ ok: true })
}

export async function deleteDeathCertificate(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  await HospitalIpdDeathCertificate.deleteOne({ encounterId: enc._id })
  res.json({ ok: true })
}

export async function deleteShortStay(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  await HospitalIpdShortStay.deleteOne({ encounterId: enc._id })
  res.json({ ok: true })
}

export async function deleteDischargeSummary(req: Request, res: Response){
  const { id } = req.params as any
  const enc = await getEncounterOr404(String(id), res)
  if (!enc) return
  await HospitalIpdDischargeSummary.deleteOne({ encounterId: enc._id })
  res.json({ ok: true })
}

function hdr(settings: any){
  const name = settings?.name || 'HospitalCare'
  const addr = settings?.address || ''
  const phone = settings?.phone || ''
  const logo = settings?.logoDataUrl ? `<img src="${settings.logoDataUrl}" style="height:40px;" />` : ''
  return `<div style="display:grid; grid-template-columns:1fr auto 1fr; align-items:center;">
    <div style="justify-self:start;">${logo}</div>
    <div style="justify-self:center; text-align:center;">
      <div style="font-size:18px; font-weight:700;">${escapeHtml(name)}</div>
      <div style="font-size:11px; color:#555;">${escapeHtml(addr)} ${phone?(' | '+escapeHtml(phone)) : ''}</div>
    </div>
    <div></div>
  </div>`
}

function box(title: string, body: string){
  return `<div style="border:1px solid #e5e7eb; border-radius:6px; padding:10px; margin-top:8px;">
    <div style="font-weight:600; margin-bottom:4px;">${escapeHtml(title)}</div>
    <div>${body}</div>
  </div>`
}

function renderDischargeHTML(settings: any, enc: any, patient: any, doctor: any, s: any){
  const pInfo = `
    <table style="width:100%; border-collapse:separate; border-spacing:6px 2px; font-size:11.5px; line-height:1.25;">
      <tbody>
        <tr>
          <td style="font-weight:700; color:#334155; width:120px;">Patient</td>
          <td style="border-bottom:1px solid #e5e7eb; padding:2px 6px;">${escapeHtml(patient?.fullName||'')}</td>
          <td style="font-weight:700; color:#334155; width:120px;">MRN</td>
          <td style="border-bottom:1px solid #e5e7eb; padding:2px 6px;">${escapeHtml(patient?.mrn||'')}</td>
        </tr>
        <tr>
          <td style="font-weight:700; color:#334155;">Doctor</td>
          <td style="border-bottom:1px solid #e5e7eb; padding:2px 6px;">${escapeHtml(doctor?.fullName||doctor?.name||'')}</td>
          <td style="font-weight:700; color:#334155;">Admission No</td>
          <td style="border-bottom:1px solid #e5e7eb; padding:2px 6px;">${escapeHtml(enc?.admissionNo||'')}</td>
        </tr>
        <tr>
          <td style="font-weight:700; color:#334155;">Admitted</td>
          <td style="border-bottom:1px solid #e5e7eb; padding:2px 6px;">${fmt(enc?.startAt)}</td>
          <td style="font-weight:700; color:#334155;">Discharged</td>
          <td style="border-bottom:1px solid #e5e7eb; padding:2px 6px;">${fmt(enc?.endAt)}</td>
        </tr>
      </tbody>
    </table>
  `

  // Parse enhanced fields (when front-end sends composed text)
  const course = String(s.courseInHospital||'')
  const lines = course.split(/\n+/).map((t:string)=>t.trim()).filter(Boolean)
  const findPref = (p:string)=> lines.find(l=> l.toLowerCase().startsWith(p.toLowerCase()))?.split(':').slice(1).join(':').trim() || ''
  const presentingComplaints = findPref('Presenting Complaints')
  const reasonOfAdmission = findPref('Reason of Admission')
  const treatment = findPref('Treatment')
  const flags = [
    lines.find(l=> /Discharge advised by Doctor/i.test(l)) ? 'Discharge advised by Doctor: Yes' : '',
    lines.find(l=> /^LAMA$/i.test(l)) ? 'LAMA' : '',
    lines.find(l=> /DDR Consent/i.test(l)) ? 'DDR Consent: Yes' : '',
  ].filter(Boolean).join('<br/>')

  const notes = String(s.notes||'')
  const nlines = notes.split(/\n+/).map((t:string)=>t.trim()).filter(Boolean)
  const responseOfTreatment = (nlines.find(l=> l.toLowerCase().startsWith('response of treatment'))||'').split(':').slice(1).join(':').trim()
  const investigationsLine = (nlines.find(l=> l.toLowerCase().startsWith('investigations'))||'')
  const investigations = investigationsLine ? investigationsLine.replace(/^investigations:?\s*/i,'') : ''
  const doctorName = (nlines.find(l=> l.toLowerCase().startsWith('doctor:'))||'').split(':').slice(1).join(':').trim()
  const doctorSign = (nlines.find(l=> l.toLowerCase().startsWith('doctor sign'))||'').split(':').slice(1).join(':').trim()
  const amount = (nlines.find(l=> l.toLowerCase().startsWith('amount'))||'').split(':').slice(1).join(':').trim()
  const discount = (nlines.find(l=> l.toLowerCase().startsWith('discount'))||'').split(':').slice(1).join(':').trim()

  const invMap: any = {}
  String(investigations||'').split(',').map((t:string)=>t.trim()).filter(Boolean).forEach((kv:string)=>{
    const [k, ...rest] = kv.split(':')
    const key = String(k||'').toUpperCase().replace(/\s+/g,'')
    const val = rest.join(':').trim()
    if (key) invMap[key] = val
  })
  const invOrder = ['HB','UREA','HCV','NA','PLATELETS','CREATININE','HBSAG','K','TLC','ALT','HIV','CA']
  const invBlocks = invOrder.map(lbl => (
    `<div><div style="font-size:11px;color:#334155;font-weight:600;margin-bottom:2px;">${escapeHtml(lbl)}</div><div style="border:1px solid #e5e7eb;border-radius:6px;padding:6px;min-height:20px;">${escapeHtml(invMap[lbl]||'')}</div></div>`
  )).join('')
  const investGrid = `<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;">${invBlocks}</div>`

  const medsRows = (Array.isArray(s.medications) ? s.medications : String(s.medications||'').split('\n'))
    .map((m:string)=>{
      const parts = m.split('|').map(x=>x.trim())
      return { name: parts[0]||'', dose: parts[1]||'', route: parts[2]||'', freq: parts[3]||'', timing: parts[4]||'', duration: parts[5]||'' }
    })
    .filter((row:any)=> Object.values(row).some(v=> String(v||'').trim()))
  const medsTable = `
    <table style="width:100%; border-collapse:collapse; font-size:11.5px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="text-align:left; padding:4px; border:1px solid #e5e7eb;">Sr</th>
          <th style="text-align:left; padding:4px; border:1px solid #e5e7eb;">Medicine</th>
          <th style="text-align:left; padding:4px; border:1px solid #e5e7eb;">Strength/Dose</th>
          <th style="text-align:left; padding:4px; border:1px solid #e5e7eb;">Route</th>
          <th style="text-align:left; padding:4px; border:1px solid #e5e7eb;">Frequency</th>
          <th style="text-align:left; padding:4px; border:1px solid #e5e7eb;">Timing</th>
          <th style="text-align:left; padding:4px; border:1px solid #e5e7eb;">Duration</th>
        </tr>
      </thead>
      <tbody>
        ${medsRows.map((r:any, i:number)=>`<tr>
          <td style=\"padding:4px; border:1px solid #e5e7eb;\">${i+1}</td>
          <td style=\"padding:4px; border:1px solid #e5e7eb;\">${escapeHtml(r.name)}</td>
          <td style=\"padding:4px; border:1px solid #e5e7eb;\">${escapeHtml(r.dose)}</td>
          <td style=\"padding:4px; border:1px solid #e5e7eb;\">${escapeHtml(r.route)}</td>
          <td style=\"padding:4px; border:1px solid #e5e7eb;\">${escapeHtml(r.freq)}</td>
          <td style=\"padding:4px; border:1px solid #e5e7eb;\">${escapeHtml(r.timing)}</td>
          <td style=\"padding:4px; border:1px solid #e5e7eb;\">${escapeHtml(r.duration)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  `

  const procBody = Array.isArray(s.procedures) ? `<ul>${s.procedures.map((x:string)=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>` : nl2br(escapeHtml(String(s.procedures||'')))
  const paired1 = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${box('Presenting Complaints', nl2br(escapeHtml(presentingComplaints||'')))}${box('Reason of Admission / Brief History / Examination', nl2br(escapeHtml(reasonOfAdmission||'')))}</div>`
  const paired2 = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${box('Final Diagnosis', nl2br(escapeHtml(s.diagnosis||'')))}${box('Any Procedure During Stay & Outcome', procBody)}</div>`
  const statusGrid = `<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;\">${box('Condition at Discharge', nl2br(escapeHtml(s.conditionAtDischarge||'')))}${box('Response of Treatment', escapeHtml(responseOfTreatment||''))}</div>`
  const docGrid = `<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;\">${box('Doctor Name', escapeHtml(doctorName||doctor?.name||''))}${box('Sign Date', fmt(s.followUpDate))}${box('Doctor Sign (text)', escapeHtml(doctorSign||''))}</div>`
  const sections = [
    box('Patient Info', pInfo),
    paired1,
    paired2,
    box('Treatment in Hospital', nl2br(escapeHtml(treatment||''))),
    box('Investigations Significant Results', investGrid),
    box('Medicines given on Discharge', medsTable),
    statusGrid,
    box('Follow-up Instructions', nl2br(escapeHtml(s.advice||''))),
    docGrid,
  ].join('')
  return wrap(`${hdr(settings)}<h2 style="margin:12px 0 8px; font-size:22px; font-weight:800;">Discharge Summary</h2>${sections}`)
}

function renderDeathHTML(settings: any, enc: any, patient: any, doctor: any, c: any){
  const head = `${hdr(settings)}<h2 style="margin:12px 0;">Death Certificate</h2>`
  const pInfo = `
    <div><b>Patient:</b> ${escapeHtml(patient?.fullName||'')}</div>
    <div><b>MRN:</b> ${escapeHtml(patient?.mrn||'')}</div>
    <div><b>Doctor:</b> ${escapeHtml(doctor?.name||'')}</div>
    <div><b>Admission No:</b> ${escapeHtml(enc?.admissionNo||'')}</div>
  `
  const idRow = `
    <div><b>DC No:</b> ${escapeHtml(c?.dcNo||'')}</div>
    <div><b>Relative:</b> ${escapeHtml(c?.relative||'')}</div>
    <div><b>Age/Sex:</b> ${escapeHtml(c?.ageSex||'')}</div>
    <div><b>Address:</b> ${escapeHtml(c?.address||'')}</div>
  `
  const details = `
    <div><b>Date of Death:</b> ${fmt(c?.dateOfDeath)}</div>
    <div><b>Time of Death:</b> ${escapeHtml(c?.timeOfDeath||'')}</div>
    <div><b>Primary Cause of Death:</b> ${nl2br(escapeHtml(c?.primaryCause||c?.causeOfDeath||''))}</div>
    <div><b>Secondary Cause of Death:</b> ${nl2br(escapeHtml(c?.secondaryCause||''))}</div>
    <div><b>Place of Death:</b> ${escapeHtml(c?.placeOfDeath||'')}</div>
  `
  const medical = [
    c?.presentingComplaints? box('Presenting Complaints', nl2br(escapeHtml(c.presentingComplaints))) : '',
    c?.diagnosis? box('Diagnosis', nl2br(escapeHtml(c.diagnosis))) : '',
  ].join('')
  const receiver = `
    <div><b>Dead Body Received By Name:</b> ${escapeHtml(c?.receiverName||'')}</div>
    <div><b>Relation:</b> ${escapeHtml(c?.receiverRelation||'')}</div>
    <div><b>ID Card No:</b> ${escapeHtml(c?.receiverIdCard||'')}</div>
    <div><b>Date & Time:</b> ${fmt(c?.receiverDate)} ${escapeHtml(c?.receiverTime||'')}</div>
  `
  const staff = `
    <div><b>Staff Name:</b> ${escapeHtml(c?.staffName||'')}</div>
    <div><b>Sign Date & Time:</b> ${fmt(c?.staffSignDate)} ${escapeHtml(c?.staffSignTime||'')}</div>
  `
  const docSec = `
    <div><b>Doctor Name:</b> ${escapeHtml(c?.doctorName||'')}</div>
    <div><b>Sign Date & Time:</b> ${fmt(c?.doctorSignDate)} ${escapeHtml(c?.doctorSignTime||'')}</div>
  `
  const notes = c?.notes ? box('Notes', nl2br(escapeHtml(c.notes))) : ''
  const body = [
    box('Patient Info', pInfo),
    box('Identifiers', idRow),
    box('Details', details),
    medical,
    box('Received By', receiver),
    box('Staff', staff),
    box('Doctor', docSec),
    notes,
  ].join('')
  return wrap(head + body)
}

function renderReceivedDeathHTML(settings: any, enc: any, patient: any, doctor: any, d: any){
  const head = `${hdr(settings)}<div style="text-align:center; font-weight:800; margin:10px 0;">EMERGENCY WARD</div>`
  const line = (v?:string)=> (String(v||'').trim() ? `<span style="display:inline-block; border-bottom:1px solid #0f172a; line-height:18px; vertical-align:baseline; white-space:nowrap;">${escapeHtml(v||'')}</span>` : '')
  const linePad = (v?:string)=> (String(v||'').trim() ? `<span style="display:inline-block; border-bottom:1px solid #0f172a; line-height:18px; vertical-align:baseline; white-space:nowrap; padding-right:72px; max-width:100%; overflow:hidden; text-overflow:clip;">${escapeHtml(v||'')}</span>` : '')
  const row2 = (l1:string,v1?:string,l2?:string,v2?:string)=>`<div style="display:grid; grid-template-columns:auto 1fr auto 1fr; gap:8px; align-items:baseline; margin-top:6px;"><div style="font-weight:700;">${escapeHtml(l1)}</div><div>${line(v1)}</div>${l2?`<div style=\"font-weight:700;\">${escapeHtml(l2)}</div><div>${line(v2)}</div>`:''}</div>`
  const row3 = (l1:string,v1?:string,l2?:string,v2?:string,l3?:string,v3?:string)=>`<div style="display:grid; grid-template-columns:auto 1fr auto 1fr auto 1fr; gap:8px; align-items:baseline; margin-top:6px;"><div style="font-weight:700;">${escapeHtml(l1)}</div><div>${line(v1)}</div><div style="font-weight:700;">${escapeHtml(l2||'')}</div><div>${line(v2)}</div><div style="font-weight:700;">${escapeHtml(l3||'')}</div><div>${line(v3)}</div></div>`

  const top = [
    row2('MR #', patient?.mrn, 'Patient CNIC (if available)', d?.patientCnic),
    row3('Patient Name', patient?.fullName||patient?.name, 'Relation', d?.relative, 'Age/Sex', d?.ageSex),
    row2('Reported Date (Emergency)', fmt(d?.emergencyReportedDate), 'Time', d?.emergencyReportedTime),
    row2('Address', patient?.address, 'Phone', patient?.phoneNormalized),
  ].join('')

  const recv = `
    <div style="font-weight:800; margin-top:10px;">RECEIVING PARAMETERS:</div>
    <ul style="margin-top:6px; padding-left:20px; line-height:1.9;">
      <li style="display:grid; grid-template-columns:200px minmax(160px, 1fr); column-gap:8px; align-items:baseline;"><span>Pulse</span><span>${linePad(d?.receiving?.pulse)}</span></li>
      <li style="display:grid; grid-template-columns:200px minmax(160px, 1fr); column-gap:8px; align-items:baseline;"><span>Blood Pressure</span><span>${linePad(d?.receiving?.bloodPressure)}</span></li>
      <li style="display:grid; grid-template-columns:200px minmax(160px, 1fr); column-gap:8px; align-items:baseline;"><span>Respiratory Rate</span><span>${linePad(d?.receiving?.respiratoryRate)}</span></li>
      <li style="display:grid; grid-template-columns:200px minmax(160px, 1fr); column-gap:8px; align-items:baseline;"><span>Pupils</span><span>${linePad(d?.receiving?.pupils)}</span></li>
      <li style="display:grid; grid-template-columns:200px minmax(160px, 1fr); column-gap:8px; align-items:baseline;"><span>Corneal Reflex</span><span>${linePad(d?.receiving?.cornealReflex)}</span></li>
      <li style="display:grid; grid-template-columns:200px minmax(160px, 1fr); column-gap:8px; align-items:baseline;"><span>ECG</span><span>${linePad(d?.receiving?.ecg)}</span></li>
    </ul>
  `

  const diagnosis = row2('Diagnosis:', d?.diagnosis)

  const rdTitle = `<div style="font-weight:800; margin-top:12px;">Received Dead</div>`
  const attRows = [
    row2('Attendant Name', d?.attendantName),
    row2('Relation with the patient', d?.attendantRelation),
    row2('Attendant CNIC', d?.attendantCnic),
    row2('Death Declared By / Doctors', d?.deathDeclaredBy),
    row2('Doctor Name', d?.doctorName || doctor?.name, 'Admission No', enc?.admissionNo),
  ].join('')

  const footer = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:24px;">
      <div>
        <div style="font-weight:700;">Signature / Name Designation / Stamp</div>
        <div style="border-bottom:1px solid #0f172a; height:22px;"></div>
      </div>
      <div>
        <div style="font-weight:700; text-align:right;">Charge Nurse Name & Signature</div>
        <div style="border-bottom:1px solid #0f172a; height:22px;"></div>
        <div style="text-align:right; font-size:12px; color:#334155; margin-top:4px;">${escapeHtml(d?.chargeNurseName||'')}</div>
      </div>
    </div>
  `

  const body = `<div style="border:1px solid #e5e7eb; border-radius:8px; padding:12px;">${top}${recv}${diagnosis}${rdTitle}${attRows}${footer}</div>`
  return wrap(head + body)
}

function renderInvoiceHTML(settings: any, enc: any, patient: any, doctor: any, items: any[], payments: any[]){
  const sub = items.reduce((s,i)=> s + Number(i.amount||0), 0)
  const paid = payments.reduce((s,p)=> s + Number(p.amount||0), 0)
  const deposit = Number(enc.deposit||0)
  const totalPaid = deposit + paid
  const balance = Math.max(0, sub - totalPaid)
  const head = `${hdr(settings)}<h2 style=\"margin:12px 0;\">Final Invoice</h2>`
  const pInfo = `
    <div><b>Patient:</b> ${escapeHtml(patient?.fullName||'')} (${escapeHtml(patient?.mrn||'')})</div>
    <div><b>Doctor:</b> ${escapeHtml(doctor?.name||'')}</div>
    <div><b>Admission No:</b> ${escapeHtml(enc?.admissionNo||'')}</div>
    <div><b>Admitted:</b> ${fmt(enc?.startAt)} | <b>Discharged:</b> ${fmt(enc?.endAt)}</div>
  `
  const itemsTbl = `<table style=\"width:100%; border-collapse:collapse; margin-top:8px;\">
    <thead><tr><th style=\"text-align:left; border-bottom:1px solid #e5e7eb; padding:6px;\">Description</th><th style=\"text-align:right; border-bottom:1px solid #e5e7eb; padding:6px;\">Qty</th><th style=\"text-align:right; border-bottom:1px solid #e5e7eb; padding:6px;\">Unit</th><th style=\"text-align:right; border-bottom:1px solid #e5e7eb; padding:6px;\">Amount</th></tr></thead>
    <tbody>
      ${items.map(i=>`<tr>
        <td style=\"padding:6px; border-bottom:1px solid #f1f5f9;\">${escapeHtml(i.description||'')}</td>
        <td style=\"padding:6px; text-align:right; border-bottom:1px solid #f1f5f9;\">${Number(i.qty||1)}</td>
        <td style=\"padding:6px; text-align:right; border-bottom:1px solid #f1f5f9;\">${Number(i.unitPrice||0).toFixed(2)}</td>
        <td style=\"padding:6px; text-align:right; border-bottom:1px solid #f1f5f9;\">${Number(i.amount||0).toFixed(2)}</td>
      </tr>`).join('')}
    </tbody>
  </table>`
  const payTbl = `<table style=\"width:100%; border-collapse:collapse; margin-top:8px;\">
    <thead><tr><th style=\"text-align:left; border-bottom:1px solid #e5e7eb; padding:6px;\">Payment</th><th style=\"text-align:right; border-bottom:1px solid #e5e7eb; padding:6px;\">Amount</th></tr></thead>
    <tbody>
      <tr><td style=\"padding:6px; border-bottom:1px solid #f1f5f9;\">Deposit</td><td style=\"padding:6px; text-align:right; border-bottom:1px solid #f1f5f9;\">${deposit.toFixed(2)}</td></tr>
      ${payments.map(p=>`<tr>
        <td style=\"padding:6px; border-bottom:1px solid #f1f5f9;\">${escapeHtml(p.method||'')} ${p.refNo?('('+escapeHtml(p.refNo)+')'):''} - ${fmt(p.receivedAt)}</td>
        <td style=\"padding:6px; text-align:right; border-bottom:1px solid #f1f5f9;\">${Number(p.amount||0).toFixed(2)}</td>
      </tr>`).join('')}
    </tbody>
  </table>`
  const totals = `<div style=\"margin-top:8px; text-align:right;\">
    <div><b>Subtotal:</b> ${sub.toFixed(2)}</div>
    <div><b>Total Paid:</b> ${totalPaid.toFixed(2)}</div>
    <div><b>Balance:</b> ${balance.toFixed(2)}</div>
  </div>`
  const body = [box('Patient Info', pInfo), box('Items', itemsTbl), box('Payments', payTbl), totals].join('')
  return wrap(head + body)
}

function wrap(inner: string){
  return `<!doctype html><html><head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>Print</title>
  <style>
    body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#0f172a; padding:12px; background:#ffffff; font-size:12px; line-height:1.35;}
    .page{max-width:780px; margin:0 auto;}
    @media print { body { padding: 0; } .page{margin:0 auto;} }
  </style>
  </head><body>
  <div class="page">${inner}</div>
  <script>window.print && setTimeout(()=>window.print(), 300)</script>
  </body></html>`
}

function fmt(d: any){ try { const x = new Date(d); if (!x || isNaN(x.getTime())) return ''; return x.toLocaleString() } catch { return '' } }
function nl2br(s: string){ return String(s||'').replace(/\n/g, '<br/>') }
function escapeHtml(s: any){ return String(s??'').replace(/[&<>"']/g, (c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'} as any)[c]) }
