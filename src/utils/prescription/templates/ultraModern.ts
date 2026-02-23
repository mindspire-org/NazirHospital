import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PrescriptionPdfData } from '../../prescriptionPdf'
import { ensurePoppins } from '../ensurePoppins'

export async function buildUltraModern(data: PrescriptionPdfData){
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  await ensurePoppins(pdf)
  try { pdf.setFont('Poppins', 'normal') } catch {}

  // Background + page container
  pdf.setFillColor(238, 241, 247)
  pdf.rect(0, 0, pageWidth, pageHeight, 'F')

  const pageX = 8
  const pageY = 8
  const pageW = pageWidth - (pageX * 2)
  const pageH = pageHeight - (pageY * 2)

  // Subtle "shadow" behind page
  pdf.setFillColor(220, 225, 235)
  pdf.roundedRect(pageX + 0.8, pageY + 1, pageW, pageH, 8, 8, 'F')
  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(pageX, pageY, pageW, pageH, 8, 8, 'F')

  // Header area (like screenshot)
  const headerY = pageY + 8
  const logoX = pageX + 10
  const logoY = headerY
  const logoS = 18

  // Fake gradient logo using two overlays
  pdf.setFillColor(34, 197, 94)
  pdf.roundedRect(logoX, logoY, logoS, logoS, 5, 5, 'F')
  pdf.setFillColor(6, 182, 212)
  pdf.roundedRect(logoX + (logoS * 0.35), logoY, logoS * 0.65, logoS, 5, 5, 'F')
  pdf.setFillColor(79, 70, 229)
  pdf.roundedRect(logoX + (logoS * 0.6), logoY + (logoS * 0.35), logoS * 0.4, logoS * 0.65, 5, 5, 'F')

  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text('H+', logoX + (logoS/2), logoY + 11, { align: 'center' })

  const hosName = String(data.settings?.name || 'Hospital')
  const hosSubtitle = String(data.settings?.address || '')
  const hosContact = String(data.settings?.phone || '')

  pdf.setTextColor(15, 23, 42)
  try { pdf.setFont('Poppins', 'bold') } catch { pdf.setFont('helvetica', 'bold') }
  pdf.setFontSize(14)
  pdf.text(hosName, logoX + logoS + 10, headerY + 6)

  pdf.setTextColor(107, 114, 128)
  try { pdf.setFont('Poppins', 'normal') } catch { pdf.setFont('helvetica', 'normal') }
  pdf.setFontSize(8)
  if (hosSubtitle) pdf.text(hosSubtitle, logoX + logoS + 10, headerY + 11)
  if (hosContact) pdf.text(hosContact, logoX + logoS + 10, headerY + 15)

  // Doctor meta (top-right)
  const docName = data.doctor?.name || 'Dr. Sara Ahmed'
  const docReg = String(data.doctor?.qualification || '')
  const visitDate = (() => { try { return (data.createdAt ? new Date(data.createdAt) : new Date()).toLocaleDateString() } catch { return '' } })()
  pdf.setTextColor(107, 114, 128)
  pdf.setFontSize(8)
  pdf.text(docName, pageX + pageW - 12, headerY + 5, { align: 'right' })
  if (docReg) pdf.text(docReg, pageX + pageW - 12, headerY + 9, { align: 'right' })
  pdf.text(visitDate, pageX + pageW - 12, headerY + 13, { align: 'right' })

  // Patient strip with gradient (approx)
  const stripX = pageX + 10
  const stripY = headerY + 24
  const stripW = pageW - 20
  const stripH = 28

  // gradient approximation: left indigo, right cyan
  pdf.setFillColor(79, 70, 229)
  pdf.roundedRect(stripX, stripY, stripW, stripH, 6, 6, 'F')
  pdf.setFillColor(6, 182, 212)
  pdf.roundedRect(stripX + (stripW * 0.55), stripY, stripW * 0.45, stripH, 6, 6, 'F')

  const patientName = data.patient?.name || 'Ali Khan'
  const patientAgeSex = `${data.patient?.age || '45'} / ${data.patient?.gender || 'M'}`
  const patientMrn = data.patient?.mrn || 'GVH-000124'
  const diagnosis = String(data.diagnosis || 'Hypertension')

  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.text(`Patient: ${patientName}`, stripX + 6, stripY + 8)
  pdf.text(`Age / sex: ${patientAgeSex}`, stripX + 6, stripY + 13)
  pdf.text(`MRN: ${patientMrn}`, stripX + 6, stripY + 18)
  pdf.text(`Diagnosis: ${diagnosis}`, stripX + 6, stripY + 23)

  // Vitals pills on right
  const vitals = data.vitals || {}
  const bp = vitals.bloodPressureSys && vitals.bloodPressureDia ? `${vitals.bloodPressureSys}/${vitals.bloodPressureDia}` : '120/78'
  const hr = vitals.pulse || 76
  const temp = vitals.temperatureC ? `${vitals.temperatureC}°C` : '98.6°F'
  const rr = vitals.respiratoryRate || 18

  const pills = [
    { label: 'BP', value: bp },
    { label: 'HR', value: hr },
    { label: 'Temp', value: temp },
    { label: 'RR', value: rr },
  ]
  const pillW = 14
  const pillH = 18
  const pillGap = 3
  const pillsW = (pillW * pills.length) + (pillGap * (pills.length - 1))
  let pillX = stripX + stripW - 6 - pillsW
  const pillY = stripY + 5

  pills.forEach((p, i) => {
    const x = pillX + (i * (pillW + pillGap))
    pdf.setFillColor(255, 255, 255)
    pdf.setDrawColor(255, 255, 255)
    pdf.roundedRect(x, pillY, pillW, pillH, 4, 4, 'F')
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.text(String(p.value), x + (pillW/2), pillY + 8, { align: 'center' })
    pdf.setTextColor(107, 114, 128)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6)
    pdf.text(p.label, x + (pillW/2), pillY + 14, { align: 'center' })
  })

  // Main content card
  const cardX = pageX + 10
  const cardY = stripY + stripH + 12
  const cardW = pageW - 20
  const cardH = 125

  // light shadow
  pdf.setFillColor(225, 230, 240)
  pdf.roundedRect(cardX + 0.8, cardY + 1, cardW, cardH, 10, 10, 'F')
  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(cardX, cardY, cardW, cardH, 10, 10, 'F')

  // Rx badge overlapping card
  pdf.setFillColor(239, 68, 68)
  pdf.roundedRect(cardX + cardW - 24, cardY - 6, 20, 12, 4, 4, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.text('Rx', cardX + cardW - 14, cardY + 2, { align: 'center' })

  const leftW = Math.floor(cardW * 0.72)
  const rightW = cardW - leftW - 8
  const leftX = cardX + 8
  const rightX = leftX + leftW + 8

  // Medicine table (left)
  const medicineY = cardY + 12
  const medicineData = data.items || []
  const tableData = medicineData.map(item => [
    item.name || '',
    item.dose || item.frequency || '',
    item.duration || '',
  ])

  autoTable(pdf, {
    startY: medicineY,
    head: [['Medicine', 'Dosage', 'Duration']],
    body: tableData.length ? tableData : [['', '', '']],
    theme: 'plain',
    tableWidth: leftW,
    styles: { fontSize: 8, cellPadding: 2, textColor: [15, 23, 42] },
    headStyles: { textColor: [107, 114, 128], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: leftW * 0.55 },
      1: { cellWidth: leftW * 0.23 },
      2: { cellWidth: leftW * 0.22 },
    },
    margin: { left: leftX, right: pageX + 10 },
    didDrawCell: (d) => {
      if (d.section === 'head') {
        pdf.setDrawColor(226, 232, 240)
        pdf.setLineWidth(0.3)
        pdf.line(leftX, d.cell.y + d.cell.height, leftX + leftW, d.cell.y + d.cell.height)
      }
      if (d.section === 'body' && d.row.index >= 0) {
        pdf.setDrawColor(241, 245, 249)
        pdf.setLineWidth(0.2)
        pdf.line(leftX, d.cell.y + d.cell.height, leftX + leftW, d.cell.y + d.cell.height)
      }
    },
  })

  const tableEndY = (pdf as any).lastAutoTable?.finalY ? Number((pdf as any).lastAutoTable.finalY) : (medicineY + 25)

  // Ruled area lines under table
  const ruledTop = Math.max(tableEndY + 4, medicineY + 26)
  const ruledBottom = cardY + cardH - 10
  pdf.setDrawColor(239, 242, 248)
  pdf.setLineWidth(0.2)
  for (let y = ruledTop; y < ruledBottom; y += 6) {
    pdf.line(leftX, y, leftX + leftW, y)
  }

  // Right side stacked panels
  const panelGap = 8
  const panelH = 22
  const panel1Y = cardY + 20
  const panels = [
    { title: 'Instructions', body: String(data.advice || 'Low salt diet • Daily BP log • Avoid NSAIDs') },
    { title: 'Follow-up', body: 'After 4 weeks or earlier if symptoms worsen' },
    { title: 'Allergies', body: String(data.allergyHistory || 'None reported') },
  ]

  panels.forEach((p, idx) => {
    const y = panel1Y + idx * (panelH + panelGap)
    pdf.setFillColor(248, 250, 255)
    pdf.setDrawColor(241, 245, 249)
    pdf.roundedRect(rightX, y, rightW, panelH, 6, 6, 'FD')
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.text(p.title, rightX + 5, y + 7)
    pdf.setTextColor(107, 114, 128)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    const body = String(p.body || '')
    const lines = pdf.splitTextToSize(body, rightW - 10)
    pdf.text(lines.slice(0, 3), rightX + 5, y + 13)
  })

  // Footer (like screenshot)
  const footerY = pageY + pageH - 28
  pdf.setTextColor(107, 114, 128)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.text('This is a digitally generated prescription. Valid only with hospital stamp.', pageX + 10, footerY)

  // Signature area on right
  pdf.setTextColor(15, 23, 42)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.text(docName, pageX + pageW - 10, footerY - 2, { align: 'right' })
  pdf.setDrawColor(156, 163, 175)
  pdf.setLineWidth(0.4)
  const sigLineY = footerY + 10
  pdf.line(pageX + pageW - 70, sigLineY, pageX + pageW - 10, sigLineY)
  pdf.setTextColor(107, 114, 128)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.text('Signature', pageX + pageW - 10, sigLineY + 5, { align: 'right' })

  return pdf
}
