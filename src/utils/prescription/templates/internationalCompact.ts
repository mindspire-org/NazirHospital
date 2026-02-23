import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PrescriptionPdfData } from '../../prescriptionPdf'
import { ensurePoppins } from '../ensurePoppins'
import { ensureUrduNastaleeq } from '../ensureUrduNastaleeq'

export async function buildInternationalCompact(data: PrescriptionPdfData){
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const pageWidth = pdf.internal.pageSize.getWidth()

  await ensurePoppins(pdf)
  await ensureUrduNastaleeq(pdf)
  
  const setPoppins = (style: 'normal'|'bold') => { try { pdf.setFont('Poppins', style) } catch { pdf.setFont('helvetica', style) } }
  const hasUrdu = (s: string) => /[\u0600-\u06FF]/.test(s)
  const setUrdu = () => { try { pdf.setFont('AlQalamTajNastaleeq', 'normal') } catch { setPoppins('normal') } }

  // Compact header for international use
  pdf.setFillColor(245, 247, 250)
  pdf.rect(0, 0, pageWidth, 16, 'F')
  pdf.setDrawColor(200, 205, 215)
  pdf.setLineWidth(0.3)
  pdf.line(0, 16, pageWidth, 16)

  // Hospital info (compact)
  pdf.setTextColor(60, 65, 75)
  setPoppins('bold')
  pdf.setFontSize(11)
  pdf.text(String(data.settings?.name || 'Medical Center'), 12, 8)
  
  pdf.setTextColor(120, 125, 135)
  setPoppins('normal')
  pdf.setFontSize(7)
  const contactInfo = [data.settings?.address, data.settings?.phone].filter(Boolean).join(' • ')
  if (contactInfo) pdf.text(contactInfo, 12, 13)

  // Doctor and Patient info (side by side)
  const infoY = 22
  pdf.setTextColor(45, 50, 60)
  setPoppins('normal')
  pdf.setFontSize(8)

  // Doctor info (left)
  const docName = data.doctor?.name || 'Dr.'
  const docQual = data.doctor?.qualification || ''
  pdf.text(`Dr: ${docName}`, 12, infoY)
  if (docQual) pdf.text(`Qual: ${docQual}`, 12, infoY + 4)

  // Patient info (right)
  const patientName = data.patient?.name || '-'
  const patientAge = data.patient?.age || '-'
  const patientGender = data.patient?.gender || '-'
  const patientMrn = data.patient?.mrn || '-'
  
  pdf.text(`Pt: ${patientName}`, pageWidth/2, infoY)
  pdf.text(`Age/Sex: ${patientAge}/${patientGender}`, pageWidth/2, infoY + 4)
  pdf.text(`MRN: ${patientMrn}`, pageWidth/2, infoY + 8)

  // Date and visit info
  const visitDate = (() => { try { return (data.createdAt ? new Date(data.createdAt) : new Date()).toLocaleDateString() } catch { return '' } })()
  pdf.text(`Date: ${visitDate}`, pageWidth - 12, infoY, { align: 'right' })

  // Prescription section
  const rxY = infoY + 12
  pdf.setDrawColor(180, 185, 195)
  pdf.setLineWidth(0.4)
  pdf.rect(10, rxY, pageWidth - 20, 8, 'S')
  
  pdf.setTextColor(220, 50, 50)
  setPoppins('bold')
  pdf.setFontSize(12)
  pdf.text('R/', 12, rxY + 6)

  // Medicines list (compact format)
  const items = Array.isArray(data.items) ? data.items : []
  let currentY = rxY + 14
  
  items.slice(0, 8).forEach((item, idx) => {
    const name = String(item.name || '').trim()
    const dose = String(item.dose || item.frequency || '').trim()
    const duration = String(item.duration || '').trim()
    const instruction = String(item.instruction || '').trim()

    // Medicine name (with Urdu support)
    const nameIsUrdu = hasUrdu(name)
    if (nameIsUrdu) setUrdu(); else setPoppins('bold')
    pdf.setFontSize(nameIsUrdu ? 9 : 8)
    pdf.text(`${idx + 1}. ${name || '-'}`, 12, currentY)

    // Instructions (right aligned if Urdu)
    if (instruction) {
      const instrIsUrdu = hasUrdu(instruction)
      if (instrIsUrdu) setUrdu(); else setPoppins('normal')
      pdf.setFontSize(instrIsUrdu ? 8 : 7)
      const instrLines = pdf.splitTextToSize(instruction, pageWidth - 80)
      const x = instrIsUrdu ? (pageWidth - 12) : 12
      const align: any = instrIsUrdu ? 'right' : 'left'
      pdf.text(instrLines.slice(0, 2), x, currentY, { align })
    }

    // Dose and duration (small text below)
    setPoppins('normal')
    pdf.setFontSize(6)
    pdf.setTextColor(100, 105, 115)
    const meta = [dose, duration].filter(Boolean).join(' • ')
    if (meta) pdf.text(meta, 12, currentY + 3)

    currentY += 8
  })

  // Diagnosis section (if provided)
  const diagnosis = String(data.diagnosis || '').trim()
  if (diagnosis) {
    currentY += 4
    pdf.setTextColor(60, 65, 75)
    setPoppins('bold')
    pdf.setFontSize(8)
    pdf.text('Dx:', 12, currentY)
    setPoppins('normal')
    pdf.setFontSize(7)
    const diagLines = pdf.splitTextToSize(diagnosis, pageWidth - 30)
    pdf.text(diagLines.slice(0, 2), 25, currentY)
    currentY += 8
  }

  // Advice section
  const advice = String(data.advice || '').trim()
  if (advice) {
    currentY += 2
    pdf.setTextColor(60, 65, 75)
    setPoppins('bold')
    pdf.setFontSize(8)
    pdf.text('Advice:', 12, currentY)
    setPoppins('normal')
    pdf.setFontSize(7)
    const adviceLines = pdf.splitTextToSize(advice, pageWidth - 30)
    pdf.text(adviceLines.slice(0, 3), 12, currentY + 4)
    currentY += 12
  }

  // Signature area (compact)
  const sigY = Math.min(currentY + 8, 270)
  pdf.setDrawColor(180, 185, 195)
  pdf.setLineWidth(0.3)
  pdf.line(pageWidth - 60, sigY, pageWidth - 12, sigY)
  
  pdf.setTextColor(100, 105, 115)
  setPoppins('normal')
  pdf.setFontSize(6)
  pdf.text('Signature', pageWidth - 12, sigY + 4, { align: 'right' })
  
  pdf.setTextColor(60, 65, 75)
  setPoppins('bold')
  pdf.setFontSize(7)
  pdf.text(docName, pageWidth - 12, sigY - 2, { align: 'right' })

  return pdf
}
