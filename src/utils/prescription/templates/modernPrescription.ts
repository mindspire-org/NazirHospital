import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PrescriptionPdfData } from '../../prescriptionPdf'
import { ensurePoppins } from '../ensurePoppins'

export async function buildModernPrescription(data: PrescriptionPdfData){
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  await ensurePoppins(pdf)
  try { pdf.setFont('Poppins', 'normal') } catch {}
  
  // Header with modern gradient styling
  const headerH = 20
  pdf.setFillColor(0, 102, 255) // Primary blue
  pdf.rect(0, 0, pageWidth, headerH, 'F')
  
  // Hospital logo area (modern rounded square)
  pdf.setFillColor(123, 97, 255) // Accent violet
  pdf.roundedRect(8, 4, 12, 12, 2, 2, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('H+', 14, 13)
  
  // Hospital info
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(12)
  try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica', 'bold') }
  pdf.text(String(data.settings?.name || 'Green Valley Hospital'), 25, 10)
  
  pdf.setFontSize(8)
  try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica', 'normal') }
  const hosAddr = String(data.settings?.address || '')
  const hosPhone = data.settings?.phone ? `Tel: ${data.settings.phone}` : ''
  const infoLine = [hosAddr, hosPhone].filter(Boolean).join(' • ')
  pdf.text(infoLine, 25, 15)
  
  // Doctor info
  const docInfo = `Department: ${data.doctor?.departmentName || '-'} • Doctor: ${data.doctor?.name || '-'}`
  pdf.setFontSize(7)
  pdf.text(docInfo, 25, 19)
  
  // Patient Information Card
  const cardY = 25
  pdf.setFillColor(255, 255, 255)
  pdf.setDrawColor(240, 240, 240)
  pdf.roundedRect(8, cardY, pageWidth - 16, 25, 3, 3, 'FD')
  
  pdf.setTextColor(51, 65, 85)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Patient Information', 12, cardY + 6)
  
  // Patient grid
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(107, 114, 128)
  
  const patientName = data.patient?.name || '-'
  const patientAgeSex = `${data.patient?.age || '-'} / ${data.patient?.gender || '-'}`
  const patientMrn = data.patient?.mrn || '-'
  const visitDate = (() => { try { return (data.createdAt ? new Date(data.createdAt) : new Date()).toLocaleDateString() } catch { return '' } })()
  const patientPhone = data.patient?.phone || '-'
  const wardBed = data.doctor?.departmentName || 'OPD'
  
  pdf.text(`Name: ${patientName}`, 12, cardY + 12)
  pdf.text(`Age/Sex: ${patientAgeSex}`, 60, cardY + 12)
  pdf.text(`MRN: ${patientMrn}`, 108, cardY + 12)
  
  pdf.text(`Visit Date: ${visitDate}`, 12, cardY + 18)
  pdf.text(`Contact: ${patientPhone}`, 60, cardY + 18)
  pdf.text(`Ward/Bed: ${wardBed}`, 108, cardY + 18)
  
  // Vitals box
  const vitalsX = pageWidth - 65
  pdf.setFillColor(248, 250, 252)
  pdf.setDrawColor(226, 232, 240)
  pdf.roundedRect(vitalsX, cardY, 57, 25, 3, 3, 'FD')
  
  pdf.setTextColor(51, 65, 85)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Vital Signs', vitalsX + 4, cardY + 6)
  
  // Vitals data
  const vitals = data.vitals || {}
  const bp = vitals.bloodPressureSys && vitals.bloodPressureDia ? `${vitals.bloodPressureSys}/${vitals.bloodPressureDia}` : '120/78'
  const hr = vitals.pulse || 76
  const temp = vitals.temperatureC ? `${vitals.temperatureC}°C` : '98.6°F'
  const rr = vitals.respiratoryRate || 18
  
  pdf.setFontSize(7)
  pdf.setTextColor(107, 114, 128)
  pdf.text(`BP: ${bp}`, vitalsX + 4, cardY + 12)
  pdf.text(`HR: ${hr} bpm`, vitalsX + 4, cardY + 18)
  pdf.text(`Temp: ${temp}`, vitalsX + 30, cardY + 12)
  pdf.text(`RR: ${rr}`, vitalsX + 30, cardY + 18)
  
  // Rx Section
  const rxY = cardY + 30
  pdf.setFillColor(255, 255, 255)
  pdf.setDrawColor(240, 240, 240)
  pdf.roundedRect(8, rxY, pageWidth - 16, 60, 3, 3, 'FD')
  
  // Rx badge
  pdf.setFillColor(214, 69, 69)
  pdf.roundedRect(pageWidth - 25, rxY - 3, 17, 8, 1, 1, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Rx', pageWidth - 20, rxY + 2)
  
  // Rx header
  pdf.setTextColor(51, 65, 85)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Prescription', 12, rxY + 6)
  
  pdf.setFontSize(7)
  pdf.setTextColor(107, 114, 128)
  pdf.setFont('helvetica', 'normal')
  const diag = String(data.diagnosis || '').trim()
  if (diag) pdf.text(`Diagnosis: ${diag}`, 12, rxY + 12)
  
  // Medicine table
  const tableY = rxY + 18
  const tableData = (data.items || []).map(item => [
    item.name || '',
    item.dose || item.frequency || '',
    item.route || '',
    item.duration || ''
  ])
  
  if (tableData.length > 0) {
    autoTable(pdf, {
      startY: tableY,
      head: [['Medicine', 'Dose/Frequency', 'Route', 'Duration']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [248, 250, 252], textColor: [107, 114, 128], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 30 },
        2: { cellWidth: 15 },
        3: { cellWidth: 25 }
      },
      margin: { left: 12, right: 12 }
    })
  } else {
    // Empty prescription area
    pdf.setDrawColor(226, 232, 240)
    pdf.setFillColor(248, 250, 252)
    pdf.roundedRect(12, tableY, pageWidth - 24, 25, 2, 2, 'FD')
    pdf.setTextColor(156, 163, 175)
    pdf.setFontSize(9)
    pdf.text('No medications prescribed', pageWidth/2 - 25, tableY + 15)
  }
  
  // Footer
  const footerY = pageHeight - 25
  pdf.setTextColor(107, 114, 128)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Pharmacy Notes: Dispense generic where possible. Counselling provided.', 12, footerY)
  pdf.text('This is a computer-generated prescription. For emergencies contact the hospital immediately.', 12, footerY + 5)
  
  // Doctor signature area
  pdf.setTextColor(51, 65, 85)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  const docName = data.doctor?.name || 'Dr. Sara Ahmed'
  const docQual = data.doctor?.qualification || 'MBBS, MD (Medicine)'
  pdf.text(docName, pageWidth - 60, footerY)
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.text(docQual, pageWidth - 60, footerY + 4)
  
  // Signature line
  pdf.setDrawColor(156, 163, 175)
  pdf.setLineWidth(0.5)
  pdf.line(pageWidth - 60, footerY + 8, pageWidth - 20, footerY + 8)
  pdf.setFontSize(6)
  pdf.text("Doctor's Signature", pageWidth - 60, footerY + 12)
  
  return pdf
}
