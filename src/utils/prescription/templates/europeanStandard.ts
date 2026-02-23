import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PrescriptionPdfData } from '../../prescriptionPdf'
import { ensurePoppins } from '../ensurePoppins'
import { ensureUrduNastaleeq } from '../ensureUrduNastaleeq'

export async function buildEuropeanStandard(data: PrescriptionPdfData){
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const pageWidth = pdf.internal.pageSize.getWidth()

  await ensurePoppins(pdf)
  await ensureUrduNastaleeq(pdf)
  
  const setPoppins = (style: 'normal'|'bold') => { try { pdf.setFont('Poppins', style) } catch { pdf.setFont('helvetica', style) } }
  const hasUrdu = (s: string) => /[\u0600-\u06FF]/.test(s)
  const setUrdu = () => { try { pdf.setFont('AlQalamTajNastaleeq', 'normal') } catch { setPoppins('normal') } }

  // European style header with institutional branding
  const headerH = 22
  pdf.setFillColor(250, 252, 255)
  pdf.rect(0, 0, pageWidth, headerH, 'F')
  
  // Left institutional info
  pdf.setTextColor(40, 45, 55)
  setPoppins('bold')
  pdf.setFontSize(12)
  pdf.text(String(data.settings?.name || 'European Medical Center'), 12, 10)
  
  pdf.setTextColor(100, 105, 115)
  setPoppins('normal')
  pdf.setFontSize(8)
  const address = String(data.settings?.address || '')
  if (address) pdf.text(address, 12, 16)
  
  // Right side doctor info
  const docName = data.doctor?.name || 'Dr.'
  const docQual = data.doctor?.qualification || ''
  const visitDate = (() => { try { return (data.createdAt ? new Date(data.createdAt) : new Date()).toLocaleDateString('en-GB') } catch { return '' } })()
  
  pdf.setTextColor(60, 65, 75)
  setPoppins('normal')
  pdf.setFontSize(8)
  pdf.text(docName, pageWidth - 12, 8, { align: 'right' })
  if (docQual) pdf.text(docQual, pageWidth - 12, 12, { align: 'right' })
  pdf.text(visitDate, pageWidth - 12, 16, { align: 'right' })

  // Patient identification strip
  const stripY = headerH + 6
  pdf.setFillColor(245, 248, 252)
  pdf.setDrawColor(220, 225, 235)
  pdf.roundedRect(10, stripY, pageWidth - 20, 20, 2, 2, 'FD')

  const patientName = data.patient?.name || '-'
  const patientAge = data.patient?.age || '-'
  const patientGender = data.patient?.gender || '-'
  const patientMrn = data.patient?.mrn || '-'
  const patientPhone = data.patient?.phone || '-'

  pdf.setTextColor(50, 55, 65)
  setPoppins('bold')
  pdf.setFontSize(9)
  pdf.text('PATIENT IDENTIFICATION', 14, stripY + 6)

  pdf.setTextColor(80, 85, 95)
  setPoppins('normal')
  pdf.setFontSize(8)
  pdf.text(`Name: ${patientName}`, 14, stripY + 12)
  pdf.text(`Age/Sex: ${patientAge}/${patientGender}`, 70, stripY + 12)
  pdf.text(`MRN: ${patientMrn}`, 130, stripY + 12)
  pdf.text(`Phone: ${patientPhone}`, pageWidth - 14, stripY + 12, { align: 'right' })

  // Chief complaints section
  const complaintsY = stripY + 26
  const complaints = String(data.primaryComplaint || '').trim()
  if (complaints) {
    pdf.setFillColor(255, 248, 225)
    pdf.setDrawColor(245, 200, 100)
    pdf.roundedRect(10, complaintsY, pageWidth - 20, 12, 2, 2, 'FD')
    
    pdf.setTextColor(120, 85, 25)
    setPoppins('bold')
    pdf.setFontSize(8)
    pdf.text('CHIEF COMPLAINTS:', 14, complaintsY + 6)
    
    pdf.setTextColor(80, 65, 45)
    setPoppins('normal')
    pdf.setFontSize(7)
    const complaintLines = pdf.splitTextToSize(complaints, pageWidth - 40)
    pdf.text(complaintLines.slice(0, 2), 14, complaintsY + 10)
  }

  // Diagnosis section
  const diagnosis = String(data.diagnosis || '').trim()
  let currentY = complaintsY + 18
  if (diagnosis) {
    pdf.setTextColor(50, 55, 65)
    setPoppins('bold')
    pdf.setFontSize(9)
    pdf.text('DIAGNOSIS:', 12, currentY)
    
    pdf.setTextColor(80, 85, 95)
    setPoppins('normal')
    pdf.setFontSize(8)
    const diagLines = pdf.splitTextToSize(diagnosis, pageWidth - 30)
    pdf.text(diagLines.slice(0, 3), 12, currentY + 5)
    currentY += 15
  }

  // Prescription section with European formatting
  pdf.setTextColor(220, 50, 50)
  setPoppins('bold')
  pdf.setFontSize(14)
  pdf.text('℞', 12, currentY)

  // Medicine table (European style)
  const items = Array.isArray(data.items) ? data.items : []
  const tableData = items.map(item => [
    item.name || '',
    item.dose || item.frequency || '',
    item.duration || '',
    item.instruction || ''
  ])

  if (tableData.length > 0) {
    autoTable(pdf, {
      startY: currentY + 4,
      head: [['Medicine', 'Dosage', 'Duration', 'Instructions']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, textColor: [50, 55, 65] },
      headStyles: { fillColor: [245, 248, 252], textColor: [80, 85, 95], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 52 }
      },
      margin: { left: 12, right: 12 },
    })
  }

  const tableEndY = (pdf as any).lastAutoTable?.finalY ? Number((pdf as any).lastAutoTable.finalY) : (currentY + 40)

  // Advice section
  const advice = String(data.advice || '').trim()
  if (advice) {
    const adviceY = Math.min(tableEndY + 8, 240)
    pdf.setTextColor(50, 55, 65)
    setPoppins('bold')
    pdf.setFontSize(9)
    pdf.text('TREATMENT ADVICE:', 12, adviceY)
    
    pdf.setTextColor(80, 85, 95)
    setPoppins('normal')
    pdf.setFontSize(8)
    const adviceLines = pdf.splitTextToSize(advice, pageWidth - 30)
    pdf.text(adviceLines.slice(0, 4), 12, adviceY + 5)
  }

  // Vitals section (if provided)
  const vitals = data.vitals || {}
  const hasVitals = vitals.pulse || vitals.bloodPressureSys || vitals.temperatureC
  if (hasVitals) {
    const vitalsY = 200
    pdf.setFillColor(248, 250, 252)
    pdf.setDrawColor(220, 225, 235)
    pdf.roundedRect(10, vitalsY, pageWidth - 20, 25, 2, 2, 'FD')
    
    pdf.setTextColor(50, 55, 65)
    setPoppins('bold')
    pdf.setFontSize(9)
    pdf.text('VITAL SIGNS:', 14, vitalsY + 6)
    
    pdf.setTextColor(80, 85, 95)
    setPoppins('normal')
    pdf.setFontSize(8)
    const bp = vitals.bloodPressureSys && vitals.bloodPressureDia ? `${vitals.bloodPressureSys}/${vitals.bloodPressureDia}` : '-'
    const pulse = vitals.pulse || '-'
    const temp = vitals.temperatureC ? `${vitals.temperatureC}°C` : '-'
    
    pdf.text(`BP: ${bp}`, 14, vitalsY + 12)
    pdf.text(`Pulse: ${pulse}`, 70, vitalsY + 12)
    pdf.text(`Temp: ${temp}`, 120, vitalsY + 12)
  }

  // European footer with institutional info
  const footerY = 270
  pdf.setDrawColor(200, 205, 215)
  pdf.setLineWidth(0.3)
  pdf.line(12, footerY, pageWidth - 12, footerY)
  
  pdf.setTextColor(100, 105, 115)
  setPoppins('normal')
  pdf.setFontSize(7)
  const footerText = [data.settings?.phone ? `Tel: ${data.settings.phone}` : '', data.settings?.address ? `Addr: ${data.settings.address}` : ''].filter(Boolean).join(' • ')
  if (footerText) pdf.text(footerText, pageWidth/2, footerY + 5, { align: 'center' })

  // Signature area
  pdf.setTextColor(50, 55, 65)
  setPoppins('bold')
  pdf.setFontSize(8)
  pdf.text(docName, pageWidth - 12, footerY - 2, { align: 'right' })
  
  pdf.setTextColor(100, 105, 115)
  setPoppins('normal')
  pdf.setFontSize(7)
  pdf.text('Medical Practitioner Signature', pageWidth - 12, footerY + 5, { align: 'right' })

  return pdf
}
