import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PrescriptionPdfData } from '../../prescriptionPdf'

export async function buildRxVitalsLeft(data: PrescriptionPdfData){
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  
  // Try to use Poppins font, fallback to helvetica
  try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica','normal') }
  
  // Modern gradient header background
  const headerX = 10
  const headerY = 8
  let headerH = 35
  
  // Modern header with gradient effect
  pdf.setFillColor(59, 130, 246) // Blue gradient start
  pdf.rect(headerX, headerY, pageWidth - headerX*2, headerH, 'F')
  pdf.setFillColor(147, 197, 253) // Light blue gradient end
  pdf.rect(headerX, headerY + headerH - 8, pageWidth - headerX*2, 8, 'F')
  
  // White text on blue header
  pdf.setTextColor(255, 255, 255)
  
  const hosName = String(data.settings?.name || 'Medical Prescription')
  const phoneText = data.settings?.phone ? `Phone: ${data.settings.phone}` : ''
  const addrText = String(data.settings?.address || '')
  const infoLine = [addrText, phoneText].filter(Boolean).join(' • ')

  let yCursor = headerY + 8
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
      const imgW = 14, imgH = 14
      pdf.addImage(logo, 'JPEG', (pageWidth/2) - (imgW/2), yCursor, imgW, imgH)
      yCursor += imgH + 3
    } catch {}
  }
  
  // Hospital name with modern styling
  try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica','bold') }
  pdf.setFontSize(15)
  pdf.text(hosName, pageWidth/2, yCursor + 6, { align: 'center' })
  yCursor += 10
  
  // Address + Phone with better spacing
  if (infoLine) {
    try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica','normal') }
    pdf.setFontSize(10)
    pdf.text(infoLine, pageWidth/2, yCursor, { align: 'center' })
    yCursor += 8
  }
  
  // Reset text color for rest of document
  pdf.setTextColor(0, 0, 0)

  const leftX = 12
  const gap = 0

  // Modern patient info card with subtle shadow
  const bandY = headerY + headerH + 8
  let bandH = 38
  
  // Card background with modern styling
  pdf.setFillColor(248, 250, 252) // Very light gray
  pdf.roundedRect(leftX, bandY, pageWidth - leftX*2, bandH, 3, 3, 'F')
  
  // Card border with modern color
  pdf.setDrawColor(226, 232, 240)
  pdf.setLineWidth(0.5)
  pdf.roundedRect(leftX, bandY, pageWidth - leftX*2, bandH, 3, 3)
  
  // Patient info with modern fonts
  try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica','bold') }
  pdf.setFontSize(10)
  pdf.setTextColor(59, 130, 246) // Blue accent for headers
  let ty = bandY + 8
  let maxBandY = ty
  const colSplit = leftX + (pageWidth - leftX*2) / 2
  
  const l = (label: string, value?: string) => {
    pdf.setTextColor(59, 130, 246)
    pdf.text(label, leftX + 4, ty)
    pdf.setTextColor(15, 23, 42) // Dark slate for values
    try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica','normal') }
    pdf.text(String(value||'-'), leftX + 32, ty)
    ty += 5
    if (ty > maxBandY) maxBandY = ty
  }
  
  const r = (label: string, value?: string, dy = 0) => {
    const y = ty + dy
    pdf.setTextColor(59, 130, 246)
    pdf.text(label, colSplit + 4, y)
    pdf.setTextColor(15, 23, 42)
    try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica','normal') }
    pdf.text(String(value||'-'), colSplit + 32, y)
    if (y > maxBandY) maxBandY = y
  }
  
  const createdAt = data.createdAt ? new Date(data.createdAt) : new Date()
  l('Patient Name:', data.patient?.name)
  l('Age:', data.patient?.age)
  l('Gender:', data.patient?.gender)
  l('Phone:', data.patient?.phone)
  l('Address:', data.patient?.address)
  r('MR Number:', data.patient?.mrn, -18)
  r('Token #:', (data as any).tokenNo || undefined, -13)
  r('Date:', createdAt.toLocaleDateString(), -8)
  r('Doctor:', (data.doctor?.name ? `Dr. ${data.doctor.name}` : undefined), -3)
  r('Department:', data.doctor?.departmentName, 2)

  // Layout below band with modern vitals card
  const leftY = bandY + bandH + 8
  
  // Modern vitals card with gradient background
  const vitalsCardY = leftY
  const vitalsCardH = 45
  pdf.setFillColor(240, 249, 255) // Very light blue
  pdf.roundedRect(leftX, vitalsCardY, 35, vitalsCardH, 3, 3, 'F')
  pdf.setDrawColor(147, 197, 253)
  pdf.setLineWidth(0.5)
  pdf.roundedRect(leftX, vitalsCardY, 35, vitalsCardH, 3, 3)
  
  // Vitals header with modern styling
  try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica','bold') }
  pdf.setFontSize(11)
  pdf.setTextColor(59, 130, 246)
  pdf.text('VITAL SIGNS', leftX + 3, vitalsCardY + 8)
  
  let vy = vitalsCardY + 14
  pdf.setTextColor(15, 23, 42)
  try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica','normal') }
  pdf.setFontSize(9)
  
  const vit = data.vitals || {}
  const dashed = (s?: string) => (s && s.trim()) ? s : '— — —'
  let leftTextMaxW = 0
  const recordWidth = (tx: string) => { try { const w = pdf.getTextWidth(tx); if (w > leftTextMaxW) leftTextMaxW = w } catch {} }
  recordWidth('VITAL SIGNS')
  
  const putV = (label: string, present: boolean, value: string) => {
    if (!present) return
    const line = `${label}: ${value}`
    recordWidth(line)
    pdf.setTextColor(59, 130, 246)
    pdf.text(label, leftX + 3, vy)
    pdf.setTextColor(15, 23, 42)
    pdf.text(value, leftX + 15, vy)
    vy += 6
  }
  
  // Enhanced vitals display with better formatting
  putV('BP', (vit.bloodPressureSys != null || vit.bloodPressureDia != null), `${vit.bloodPressureSys ?? '—'} / ${vit.bloodPressureDia ?? '—'}`)
  putV('Pulse', true, dashed(vit.pulse!=null?String(vit.pulse):''))
  putV('Temp', true, dashed(vit.temperatureC!=null?String(vit.temperatureC):''))
  putV('Weight', true, dashed(vit.weightKg!=null?String(vit.weightKg):''))
  putV('RR', vit.respiratoryRate != null, String(vit.respiratoryRate))
  putV('SpO2', vit.spo2 != null, String(vit.spo2))
  putV('Sugar', vit.bloodSugar != null, String(vit.bloodSugar))
  putV('Height', vit.heightCm != null, String(vit.heightCm))
  putV('BMI', vit.bmi != null, String(vit.bmi))

  // Modern lab and diagnostic tests section
  vy += 4
  const renderList = (label: string, items?: string[]) => {
    const list = Array.isArray(items) ? items.map(t => String(t || '').trim()).filter(Boolean) : []
    if (!list.length) return
    
    // Modern card for test lists
    const listY = vy
    const listH = Math.max(20, list.length * 6 + 12)
    pdf.setFillColor(249, 250, 251) // Very light gray
    pdf.roundedRect(leftX, listY, 35, listH, 2, 2, 'F')
    pdf.setDrawColor(229, 231, 235)
    pdf.setLineWidth(0.3)
    pdf.roundedRect(leftX, listY, 35, listH, 2, 2)
    
    try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica','bold') }
    pdf.setFontSize(10)
    pdf.setTextColor(59, 130, 246)
    pdf.text(label, leftX + 3, listY + 8)
    recordWidth(label)
    
    vy = listY + 14
    pdf.setTextColor(15, 23, 42)
    try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica','normal') }
    pdf.setFontSize(8)
    
    list.forEach(t => {
      const line = `• ${t}`
      recordWidth(line)
      pdf.text(line, leftX + 3, vy)
      vy += 5
    })
    vy += 2
  }
  renderList('LAB TESTS', data.labTests)
  renderList('DIAGNOSTIC TESTS', data.diagnosticTests)

  // Modern Rx box with enhanced styling
  const minLeftW = 18
  const maxLeftW = 32
  const pad = 6
  const leftW = Math.ceil(Math.max(minLeftW, Math.min(maxLeftW, leftTextMaxW + pad)))
  const rxX = leftX + leftW + gap
  const rxY = leftY
  const rxW = pageWidth - rxX - 12

  // Modern Rx mark with gradient effect
  pdf.setDrawColor(59, 130, 246)
  pdf.setLineWidth(0.6)
  
  // Enhanced Rx symbol with modern styling
  try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica','bold') }
  pdf.setFontSize(24)
  pdf.setTextColor(59, 130, 246)
  pdf.text('R', rxX + 8, rxY + 18)
  pdf.setTextColor(0, 0, 0)

  // Modern Rx content area
  const contentX = rxX + 18
  let y = rxY + 16
  try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica','normal') }
  pdf.setFontSize(9)

  // Enhanced clinical details with modern styling
  const wrapRx = (txt: string) => pdf.splitTextToSize(txt, rxW - ((contentX - rxX) + 12))
  const section = (label: string, value?: string) => {
    const v = String(value || '').trim()
    if (!v) return
    
    // Section header with blue accent
    pdf.setTextColor(59, 130, 246)
    try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica','bold') }
    pdf.text(label, contentX, y)
    y += 5
    
    // Section content with better spacing
    pdf.setTextColor(15, 23, 42)
    try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica','normal') }
    const lines = wrapRx(v)
    pdf.text(lines, contentX, y)
    y += Math.max(7, lines.length * 4.5 + 3)
  }
  
  section('Primary Complaint', data.primaryComplaint)
  section('History', data.primaryComplaintHistory)
  section('Allergies', data.allergyHistory)
  section('Examination', data.examFindings)
  section('Family History', data.familyHistory)
  section('Treatment History', data.treatmentHistory || (data as any).history)
  section('Diagnosis', data.diagnosis)
  section('Advice', data.advice)
  y += 3

  // Modern medication table
  const medRows = (data.items || []).map((m: any, idx: number) => {
    return [ String(idx+1), String(m.name||'-'), String(m.frequency||'-'), String(m.dose||'-'), String(m.duration||'-'), String(m.instruction||'-'), String(m.route||'-') ]
  })
  
  try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica','bold') }
  pdf.setFontSize(11)
  pdf.setTextColor(59, 130, 246)
  pdf.text('MEDICATION', contentX, y)
  y += 6
  
  autoTable(pdf, {
    startY: y,
    margin: { left: contentX, right: 12 },
    head: [[ 'Sr.', 'Drug Name', 'Frequency', 'Dosage', 'Duration', 'Instructions', 'Route' ]],
    body: medRows,
    styles: { 
      fontSize: 9, 
      cellPadding: 3, 
      valign: 'top',
      fillColor: [249, 250, 251]
    },
    headStyles: { 
      fillColor: [59, 130, 246], 
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      font: 'Poppins'
    },
    columnStyles: {
      0: { cellWidth: 8, fontStyle: 'bold' },
      1: { cellWidth: 25 },
      2: { cellWidth: 15 },
      3: { cellWidth: 12 },
      4: { cellWidth: 12 },
      5: { cellWidth: 20 },
      6: { cellWidth: 10 }
    }
  })
  try { y = Math.max(y, ((pdf as any).lastAutoTable?.finalY || y) + 6) } catch {}

  // Modern Rx box border with enhanced styling
  const rxContentBottom = y + 8
  const rxBoxHeight = Math.max(30, rxContentBottom - rxY)
  pdf.setDrawColor(59, 130, 246)
  pdf.setLineWidth(0.8)
  pdf.roundedRect(rxX, rxY, rxW, rxBoxHeight, 3, 3)

  // Modern footer with enhanced styling
  const footerY = pageHeight - 30
  
  // Modern footer background
  pdf.setFillColor(248, 250, 252)
  pdf.roundedRect(12, footerY, pageWidth - 24, 18, 2, 2, 'F')
  
  // Footer separator line
  pdf.setDrawColor(59, 130, 246)
  pdf.setLineWidth(0.5)
  pdf.line(12, footerY - 2, pageWidth - 12, footerY - 2)
  
  // Doctor signature area with modern styling
  try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica','bold') }
  pdf.setFontSize(10)
  pdf.setTextColor(59, 130, 246)
  pdf.text('DOCTOR SIGNATURE', 15, footerY + 6)
  
  // Signature line with modern styling
  pdf.setDrawColor(59, 130, 246)
  pdf.setLineWidth(0.8)
  pdf.line(45, footerY + 4, 120, footerY + 4)
  
  // Doctor name with modern font
  if (data.doctor?.name) {
    pdf.setTextColor(15, 23, 42)
    try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica','normal') }
    pdf.setFontSize(9)
    pdf.text(`Dr. ${data.doctor.name}`, 45, footerY + 10)
  }
  
  // Qualification and contact info
  if (data.doctor?.qualification) {
    pdf.setTextColor(100, 116, 139)
    try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica','normal') }
    pdf.setFontSize(8)
    pdf.text(data.doctor.qualification, 45, footerY + 14)
  }
  
  if (data.doctor?.phone) {
    pdf.setTextColor(100, 116, 139)
    pdf.text(`Contact: ${data.doctor.phone}`, 45, footerY + 17)
  }
  
  // Modern disclaimer with better styling
  pdf.setTextColor(190, 18, 60)
  try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica','bold') }
  pdf.setFontSize(9)
  pdf.text('NOT VALID FOR COURT OF LAW', pageWidth/2, pageHeight - 12, { align: 'center' })
  
  // Reset text color
  pdf.setTextColor(0, 0, 0)

  return pdf
}
