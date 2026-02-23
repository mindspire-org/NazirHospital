import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PrescriptionPdfData } from '../../prescriptionPdf'
import { ensurePoppins } from '../ensurePoppins'
import { ensureUrduNastaleeq } from '../ensureUrduNastaleeq'

export async function buildRxDefault(data: PrescriptionPdfData){
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  await ensurePoppins(pdf)
  await ensureUrduNastaleeq(pdf)
  try { pdf.setFont('Poppins', 'normal') } catch {}
  // Header bar with centered hospital logo + info
  const headerH = 18
  pdf.setFillColor(30, 64, 175)
  pdf.rect(0, 0, pageWidth, headerH, 'F')
  pdf.setTextColor(255,255,255)
  const hosName = String(data.settings?.name || 'Medical Prescription')
  const phoneText = data.settings?.phone ? `Phone: ${data.settings.phone}` : ''
  const addrText = String(data.settings?.address || '')
  const infoLine = [addrText, phoneText].filter(Boolean).join(' • ')

  let yCur = 4
  // Centered logo if provided
  let logo = data.settings?.logoDataUrl
  if (logo) {
    try {
      if (!logo.startsWith('data:')) {
        try {
          const u = logo.startsWith('http') ? logo : `${location.origin}${logo.startsWith('/')?'':'/'}${logo}`
          const resp = await fetch(u)
          const blob = await resp.blob()
          logo = await new Promise<string>(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result||'')); fr.readAsDataURL(blob) })
        } catch {}
      }
      logo = await new Promise<string>((resolve) => {
        const img = new Image()
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            const S = 96
            canvas.width = S; canvas.height = S
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.clearRect(0,0,S,S)
              ctx.drawImage(img, 0, 0, S, S)
            }
            resolve(canvas.toDataURL('image/jpeg', 0.72))
          } catch { resolve(logo!) }
        }
        img.onerror = () => resolve(logo!)
        img.src = logo!
      })
      const imgW = 10, imgH = 10
      pdf.addImage(logo, 'JPEG', (pageWidth/2)-(imgW/2), yCur, imgW, imgH)
      yCur += imgH + 2
    } catch {}
  }
  // Hospital name (center)
  try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica','bold') }
  pdf.setFontSize(12)
  pdf.text(hosName, pageWidth/2, yCur + 12, { align: 'center' })

  pdf.setFontSize(8)
  try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica','normal') }
  if (infoLine) pdf.text(infoLine, pageWidth/2, yCur + 16, { align: 'center' })
  pdf.setTextColor(15,23,42)
  const bodyTop = headerH + 6
  // subtle card background for patient section
  pdf.setFillColor(248, 250, 252)
  pdf.setDrawColor(226, 232, 240)
  pdf.roundedRect(10, bodyTop, pageWidth - 20, 28, 3, 3, 'FD')

  // Doctor + patient details
  let y = bodyTop + 6

  // Doctor (left)
  try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica', 'bold') }
  pdf.setFontSize(14)
  pdf.text(`Dr. ${data.doctor?.name || '-'}`, 14, y)
  try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica', 'normal') }
  pdf.setFontSize(9)
  if (data.doctor?.qualification) { y += 5; pdf.text(`Qualification: ${data.doctor.qualification}`, 14, y) }
  if (data.doctor?.departmentName) { y += 5; pdf.text(`Department: ${data.doctor.departmentName}`, 14, y) }
  if (data.doctor?.phone) { y += 5; pdf.text(`Phone: ${data.doctor.phone}`, 14, y) }

  // Divider
  y = Math.max(y, headerH + 8)
  pdf.line(14, y+2, pageWidth-14, y+2)
  y += 8

  // Patient block
  const createdAt = data.createdAt ? new Date(data.createdAt) : new Date()
  pdf.setFontSize(9)
  pdf.text(`Patient: ${data.patient?.name || '-'}`, 14, y)
  pdf.text(`MR: ${data.patient?.mrn || '-'}`, pageWidth/2, y)
  pdf.text(`Gender: ${data.patient?.gender || '-'}`, pageWidth-14, y, { align: 'right' })
  y += 5
  pdf.text(`Father Name: ${data.patient?.fatherName || '-'}`, 14, y)
  pdf.text(`Age: ${data.patient?.age || '-'}`, pageWidth/2, y)
  pdf.text(`Phone: ${data.patient?.phone || '-'}`, pageWidth-14, y, { align: 'right' })
  y += 5
  pdf.text(`Address: ${data.patient?.address || '-'}`, 14, y)
  y += 5
  pdf.text(`Date: ${createdAt.toLocaleString()}`, 14, y)
  y += 6
  // Sections in simple blocks matching target layout
  const section = (label: string, value?: string) => {
    const v = String(value || '').trim()
    if (!v) return
    try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica', 'bold') }
    pdf.setFontSize(9)
    pdf.text(label, 14, y)
    y += 4
    try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica', 'normal') }
    const lines = pdf.splitTextToSize(v, pageWidth - 28)
    pdf.text(lines, 14, y)
    y += Math.max(6, lines.length * 4 + 2)
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text('Prescription', 14, y)
  y += 6

  // Vitals (table) above Medical History
  try {
    const v = data.vitals
    const hasVitals = v && Object.values(v).some(x => x != null && !(typeof x === 'number' && isNaN(x as any)))
    if (hasVitals){
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.text('Vitals', 14, y)
      y += 4
      const labels: string[] = []
      const values: string[] = []
      const add = (label: string, present: boolean, value: string) => { if (present) { labels.push(label); values.push(value) } }
      add('Pulse', v?.pulse != null, `${v?.pulse}`)
      add('Temp (°C)', v?.temperatureC != null, `${v?.temperatureC}`)
      add('BP (mmHg)', (v?.bloodPressureSys != null || v?.bloodPressureDia != null), `${v?.bloodPressureSys ?? '-'} / ${v?.bloodPressureDia ?? '-'}`)
      add('RR (/min)', v?.respiratoryRate != null, `${v?.respiratoryRate}`)
      add('SpO2 (%)', v?.spo2 != null, `${v?.spo2}`)
      add('Sugar (mg/dL)', v?.bloodSugar != null, `${v?.bloodSugar}`)
      add('Weight (kg)', v?.weightKg != null, `${v?.weightKg}`)
      add('Height (cm)', v?.heightCm != null, `${v?.heightCm}`)
      add('BMI', v?.bmi != null, `${v?.bmi}`)
      add('BSA (m2)', v?.bsa != null, `${v?.bsa}`)
      if (labels.length){
        autoTable(pdf, {
          startY: y,
          margin: { left: 14, right: 14 },
          head: [ labels ],
          body: [ values ],
          styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
          headStyles: { fillColor: [248,250,252], textColor: [15,23,42], fontStyle: 'bold' },
        })
        try { y = Math.max(y, ((pdf as any).lastAutoTable?.finalY || y) + 6) } catch {}
      }
    }
  } catch {}

  section('Medical History', data.history)
  section('Complaint', data.primaryComplaint)
  section('Examination', data.examFindings)
  section('Clinical Notes', data.primaryComplaintHistory || data.treatmentHistory)
  section('Advice', data.advice)

  // Medication table
  try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica', 'bold') }
  pdf.setFontSize(10)
  pdf.text('Medication', 14, y)
  y += 4

  const freqText = (s?: string) => {
    const raw = String(s || '').trim()
    if (!raw) return '-'
    if (raw.includes('/')) {
      const cnt = raw.split('/').map(t => t.trim()).filter(Boolean).length
      if (cnt === 1) return 'Once a day'
      if (cnt === 2) return 'Twice a day'
      if (cnt === 3) return 'Thrice a day'
      if (cnt >= 4) return 'Four times a day'
    }
    return raw
  }
  const durText = (s?: string) => {
    const d = String(s || '').trim()
    if (!d) return '-'
    return d
  }
  const bodyRows = (data.items || []).map((m: any, idx: number) => {
    const notes = String(m?.notes || '').trim()
    const instrDirect = String(m?.instruction || '').trim()
    const routeDirect = String(m?.route || '').trim()
    let instr = instrDirect
    let route = routeDirect
    if (!instr) {
      try { const mi = notes.match(/Instruction:\s*([^;]+)/i); if (mi && mi[1]) instr = mi[1].trim() } catch {}
    }
    if (!route) {
      try { const mr = notes.match(/Route:\s*([^;]+)/i); if (mr && mr[1]) route = mr[1].trim() } catch {}
    }
    return [
      String(idx + 1),
      String(m.name || '-'),
      freqText(m.frequency),
      String(m.dose || '-'),
      durText(m.duration),
      String(instr || '-'),
      String(route || '-')
    ]
  })

  autoTable(pdf, {
    startY: y,
    margin: { left: 14, right: 14, bottom: 10 },
    head: [[ 'Sr.', 'Drug', 'Frequency', 'Dosage', 'Duration', 'ہدایات', 'Route' ]],
    body: bodyRows,
    styles: { fontSize: 9, cellPadding: 2, valign: 'top', font: 'Poppins' as any },
    headStyles: { fillColor: [0,0,0], textColor: [255,255,255], fontStyle: 'bold' },
    columnStyles: {
      5: { halign: 'right' },
    },
    didParseCell: (d) => {
      // Instruction column: render Urdu in Nastaleeq when the font is available.
      if (d.section === 'body' && d.column.index === 5) {
        const txt = String(d.cell.raw || '')
        const hasUrdu = /[\u0600-\u06FF]/.test(txt)
        if (hasUrdu) {
          try { (d.cell.styles as any).font = 'AlQalamTajNastaleeq' } catch {}
          ;(d.cell.styles as any).halign = 'right'
        }
      }
    },
  })

  // Urdu instructions box (ہدایت)
  try {
    const lastY = Number((pdf as any).lastAutoTable?.finalY || y) + 8
    const urdu = String(data.advice || '').trim()
    if (urdu) {
      const boxY = Math.min(lastY, pageHeight - 42)
      const boxH = 30
      pdf.setFillColor(254, 242, 242)
      pdf.setDrawColor(254, 202, 202)
      pdf.roundedRect(14, boxY, pageWidth - 28, boxH, 3, 3, 'FD')

      pdf.setTextColor(185, 28, 28)
      pdf.setFontSize(14)
      try { pdf.setFont('AlQalamTajNastaleeq', 'normal') } catch { try { pdf.setFont('Poppins', 'bold') } catch {} }
      pdf.text('ہدایت', pageWidth - 16, boxY + 9, { align: 'right' })

      pdf.setTextColor(15, 23, 42)
      pdf.setFontSize(12)
      try { pdf.setFont('AlQalamTajNastaleeq', 'normal') } catch { try { pdf.setFont('Poppins', 'normal') } catch {} }
      const lines = pdf.splitTextToSize(urdu, pageWidth - 36)
      pdf.text(lines.slice(0, 3), pageWidth - 16, boxY + 20, { align: 'right' })
    }
  } catch {}

  return pdf
}
