import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PrescriptionPdfData } from '../../prescriptionPdf'
import { ensurePoppins } from '../ensurePoppins'

export async function buildDrapStandard(data: PrescriptionPdfData){
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const pageWidth = pdf.internal.pageSize.getWidth()

  await ensurePoppins(pdf)
  try { pdf.setFont('Poppins', 'normal') } catch {}
  
  // Header
  pdf.setFillColor(15, 23, 42)
  pdf.rect(0, 0, pageWidth, 18, 'F')
  pdf.setTextColor(255, 255, 255)
  try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica', 'bold') }
  pdf.setFontSize(12)
  pdf.text(String(data.settings?.name || 'Hospital'), 12, 11)
  try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica', 'normal') }
  pdf.setFontSize(8)
  const hdr2 = [data.settings?.address, data.settings?.phone].filter(Boolean).join(' • ')
  if (hdr2) pdf.text(String(hdr2), 12, 15)

  // Doctor
  pdf.setTextColor(15, 23, 42)
  try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica', 'bold') }
  pdf.setFontSize(10)
  pdf.text(String(data.doctor?.name || 'Doctor'), 12, 26)
  try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica', 'normal') }
  pdf.setFontSize(8)
  const docLine = [data.doctor?.qualification, data.doctor?.departmentName, data.doctor?.phone].filter(Boolean).join(' • ')
  if (docLine) pdf.text(String(docLine), 12, 30)

  // Patient block (international / DRAP-style: identity + date)
  const y0 = 36
  pdf.setDrawColor(226, 232, 240)
  pdf.setFillColor(248, 250, 252)
  pdf.roundedRect(10, y0, pageWidth - 20, 18, 3, 3, 'FD')

  const patientName = data.patient?.name || '-'
  const mrn = data.patient?.mrn || '-'
  const age = data.patient?.age || '-'
  const gender = data.patient?.gender || '-'
  const phone = data.patient?.phone || '-'
  const dateText = (() => {
    try {
      const d = data.createdAt ? new Date(data.createdAt) : new Date()
      return d.toLocaleDateString()
    } catch { return '' }
  })()

  pdf.setTextColor(15, 23, 42)
  try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica', 'bold') }
  pdf.setFontSize(9)
  pdf.text(`Patient: ${patientName}`, 14, y0 + 7)
  try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica', 'normal') }
  pdf.setFontSize(8)
  pdf.text(`MRN: ${mrn}`, 14, y0 + 12)
  pdf.text(`Age/Sex: ${age} / ${gender}`, 70, y0 + 12)
  pdf.text(`Phone: ${phone}`, 120, y0 + 12)
  pdf.text(`Date: ${dateText}`, pageWidth - 14, y0 + 7, { align: 'right' })

  // Diagnosis + Rx
  const diag = String(data.diagnosis || '').trim()
  let y = y0 + 26
  if (diag) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(15, 23, 42)
    pdf.text('Diagnosis:', 12, y)
    try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica', 'normal') }
    pdf.setFontSize(9)
    pdf.text(pdf.splitTextToSize(diag, pageWidth - 30), 35, y)
    y += 10
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.setTextColor(239, 68, 68)
  pdf.text('℞', 12, y)

  const rows = (data.items || []).map((it) => [
    String(it.name || ''),
    String(it.dose || it.frequency || ''),
    String(it.duration || ''),
    String(it.instruction || ''),
  ])

  autoTable(pdf, {
    startY: y + 4,
    head: [['Medicine (Generic/Brand)', 'Dose/Frequency', 'Duration', 'Instructions']],
    body: rows.length ? rows : [['', '', '', '']],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [15, 23, 42] },
    headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 65 }, 1: { cellWidth: 35 }, 2: { cellWidth: 22 }, 3: { cellWidth: 55 } },
    margin: { left: 12, right: 12 },
  })

  const yAfter = (pdf as any).lastAutoTable?.finalY ? Number((pdf as any).lastAutoTable.finalY) : (y + 40)

  // Advice
  const advice = String(data.advice || '').trim()
  if (advice) {
    const ay = Math.min(yAfter + 8, 250)
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.text('Advice:', 12, ay)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.text(pdf.splitTextToSize(advice, pageWidth - 26), 12, ay + 5)
  }

  // Footer signature
  const footerY = 280
  pdf.setDrawColor(203, 213, 225)
  pdf.line(pageWidth - 70, footerY, pageWidth - 12, footerY)
  pdf.setTextColor(15, 23, 42)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.text(String(data.doctor?.name || 'Doctor'), pageWidth - 12, footerY - 2, { align: 'right' })
  pdf.setTextColor(100, 116, 139)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.text('Signature / Stamp', pageWidth - 12, footerY + 5, { align: 'right' })

  return pdf
}
