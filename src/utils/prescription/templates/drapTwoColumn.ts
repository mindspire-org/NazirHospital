import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PrescriptionPdfData } from '../../prescriptionPdf'
import { ensurePoppins } from '../ensurePoppins'
import { ensureUrduNastaleeq } from '../ensureUrduNastaleeq'

export async function buildDrapTwoColumn(data: PrescriptionPdfData){
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  await ensurePoppins(pdf)
  await ensureUrduNastaleeq(pdf)
  const setPoppins = (style: 'normal'|'bold') => { try { pdf.setFont('Poppins', style) } catch { pdf.setFont('helvetica', style) } }
  const hasUrdu = (s: string) => /[\u0600-\u06FF]/.test(s)
  const setUrdu = () => { try { pdf.setFont('AlQalamTajNastaleeq', 'normal') } catch { setPoppins('normal') } }

  const clinicName = String(data.settings?.name || 'Clinic')
  const createdAt = (() => { try { return (data.createdAt ? new Date(data.createdAt) : new Date()) } catch { return new Date() } })()
  const dateText = (() => { try { return createdAt.toLocaleDateString() } catch { return '' } })()
  const timeText = (() => { try { return createdAt.toLocaleTimeString() } catch { return '' } })()
  const p = data.patient || {}

  const blue = { r: 29, g: 78, b: 216 }

  // Header
  pdf.setFillColor(248, 250, 252)
  pdf.rect(0, 0, pageWidth, 26, 'F')
  pdf.setDrawColor(blue.r, blue.g, blue.b)
  pdf.setLineWidth(0.4)
  pdf.line(0, 26, pageWidth, 26)

  pdf.setTextColor(blue.r, blue.g, blue.b)
  setPoppins('bold')
  pdf.setFontSize(14)
  pdf.text(clinicName, pageWidth/2, 12, { align: 'center' })
  pdf.setTextColor(51, 65, 85)
  setPoppins('normal')
  pdf.setFontSize(9)
  pdf.text('Medical Prescription', pageWidth/2, 18, { align: 'center' })

  // Top info grid
  const infoY = 30
  pdf.setTextColor(15, 23, 42)
  setPoppins('normal')
  pdf.setFontSize(8)

  const leftInfoX = 12
  const rightInfoX = pageWidth/2 + 6
  const rowH = 4.5
  const safe = (v: any) => String(v || '-').trim() || '-'

  pdf.text(`Patient Name:  ${safe(p.name)}`, leftInfoX, infoY)
  pdf.text(`MR Number#:     ${safe(p.mrn)}`, rightInfoX, infoY)
  pdf.text(`Age:            ${safe(p.age)}`, leftInfoX, infoY + rowH)
  pdf.text(`Token #:         ${safe((data as any).tokenNo)}`, rightInfoX, infoY + rowH)
  pdf.text(`Gender:         ${safe(p.gender)}`, leftInfoX, infoY + (rowH*2))
  pdf.text(`Date:            ${dateText}`, rightInfoX, infoY + (rowH*2))
  pdf.text(`Phone:          ${safe(p.phone)}`, leftInfoX, infoY + (rowH*3))
  pdf.text(`Doctor:          ${safe(data.doctor?.name)}`, rightInfoX, infoY + (rowH*3))
  pdf.text(`Address:        ${safe(p.address)}`, leftInfoX, infoY + (rowH*4))
  pdf.text(`Department:      ${safe(data.doctor?.departmentName)}`, rightInfoX, infoY + (rowH*4))

  // Chief Complaints strip
  const ccY = infoY + (rowH*5) + 4
  pdf.setFillColor(254, 243, 199)
  pdf.roundedRect(10, ccY, pageWidth - 20, 10, 2, 2, 'F')
  pdf.setTextColor(15, 23, 42)
  setPoppins('bold')
  pdf.setFontSize(8)
  pdf.text('Chief Complaints / Symptoms:', 14, ccY + 4)
  setPoppins('normal')
  const cc = String(data.primaryComplaint || '').trim()
  if (cc) pdf.text(cc, 14, ccY + 8)

  // Left sidebar (Vitals + Investigations)
  const sideX = 10
  const sideY = ccY + 14
  const sideW = 36
  const sideH = 150
  pdf.setDrawColor(blue.r, blue.g, blue.b)
  pdf.setLineWidth(0.4)
  pdf.roundedRect(sideX, sideY, sideW, sideH, 2, 2, 'S')

  const boxTitle = (t: string, x: number, y: number) => {
    pdf.setTextColor(blue.r, blue.g, blue.b)
    setPoppins('bold')
    pdf.setFontSize(7)
    pdf.text(t, x + 2, y)
  }

  boxTitle('VITAL SIGNS', sideX + 2, sideY + 8)
  pdf.setTextColor(51, 65, 85)
  setPoppins('normal')
  pdf.setFontSize(7)
  const vitals = data.vitals || {}
  const bp = vitals.bloodPressureSys != null || vitals.bloodPressureDia != null
    ? `${vitals.bloodPressureSys ?? '-'} / ${vitals.bloodPressureDia ?? '-'}`
    : '---'
  const pulse = vitals.pulse != null ? String(vitals.pulse) : '---'
  const temp = vitals.temperatureC != null ? String(vitals.temperatureC) : '---'
  const wt = vitals.weightKg != null ? String(vitals.weightKg) : '---'

  const vitRows = [
    ['BP:', bp],
    ['Pulse:', pulse],
    ['Temp:', temp],
    ['Wt:', wt],
  ]
  let vy = sideY + 14
  vitRows.forEach(([k, v]) => {
    pdf.text(k, sideX + 3, vy)
    pdf.text(v, sideX + sideW - 3, vy, { align: 'right' })
    pdf.setDrawColor(226, 232, 240)
    pdf.line(sideX + 2, vy + 1.8, sideX + sideW - 2, vy + 1.8)
    vy += 6
  })

  boxTitle('INVESTIGATION', sideX + 2, vy + 6)
  const invList = [
    'HB',
    'CBC',
    'Blood Group',
    'BSR',
    'ANTI HCV',
    'HBSAG',
    'PT/APTT',
    'LFT/RFTs',
    'Urine',
    'Complete',
  ]
  let iy = vy + 12
  pdf.setTextColor(51, 65, 85)
  setPoppins('normal')
  pdf.setFontSize(6.5)
  invList.forEach((t) => {
    pdf.setDrawColor(203, 213, 225)
    pdf.rect(sideX + 3, iy - 3, 2.5, 2.5)
    pdf.text(t, sideX + 7, iy)
    iy += 5
  })

  // Main Rx writing area
  const rxX = sideX + sideW + 6
  const rxY = sideY
  const rxW = pageWidth - rxX - 10
  const rxH = sideH
  pdf.setDrawColor(blue.r, blue.g, blue.b)
  pdf.setLineWidth(0.6)
  pdf.roundedRect(rxX, rxY, rxW, rxH, 4, 4, 'S')

  pdf.setTextColor(blue.r, blue.g, blue.b)
  setPoppins('bold')
  pdf.setFontSize(14)
  pdf.text('R', rxX + 8, rxY + 18)

  // Medicines list inside Rx area (Urdu if provided)
  const startListY = rxY + 24
  const lineGap = 10
  let my = startListY
  const items = Array.isArray(data.items) ? data.items : []
  items.slice(0, 10).forEach((it, idx) => {
    const name = String(it.name || '').trim()
    const instr = String(it.instruction || '').trim()
    const dur = String(it.duration || '').trim()
    const dose = String(it.dose || it.frequency || '').trim()

    pdf.setTextColor(15, 23, 42)
    setPoppins('bold')
    pdf.setFontSize(8)
    pdf.text(`${idx + 1}.`, rxX + 8, my)

    const nameIsUrdu = hasUrdu(name)
    if (nameIsUrdu) setUrdu(); else setPoppins('bold')
    pdf.setFontSize(nameIsUrdu ? 11 : 9)
    pdf.text(name || '-', rxX + 14, my)

    // right side small meta
    setPoppins('normal')
    pdf.setFontSize(7)
    const meta = [dose, dur].filter(Boolean).join(' • ')
    if (meta) pdf.text(meta, rxX + rxW - 6, my, { align: 'right' })

    if (instr) {
      const instrIsUrdu = hasUrdu(instr)
      if (instrIsUrdu) setUrdu(); else setPoppins('normal')
      pdf.setFontSize(instrIsUrdu ? 10 : 7)
      const lines = pdf.splitTextToSize(instr, rxW - 22)
      const x = instrIsUrdu ? (rxX + rxW - 6) : (rxX + 14)
      const align: any = instrIsUrdu ? 'right' : 'left'
      pdf.text(lines.slice(0, 2), x, my + 5, { align })
    }

    my += lineGap
  })

  // Signature line under Rx
  const sigY = rxY + rxH + 10
  pdf.setDrawColor(blue.r, blue.g, blue.b)
  pdf.setLineWidth(0.4)
  pdf.line(rxX, sigY, rxX + 55, sigY)
  pdf.setTextColor(100, 116, 139)
  setPoppins('normal')
  pdf.setFontSize(7)
  pdf.text('Doctor Signature', rxX, sigY + 4)
  pdf.setTextColor(15, 23, 42)
  setPoppins('normal')
  pdf.text(`${String(data.doctor?.name || '')} ${String(data.doctor?.qualification || '')}`.trim(), rxX, sigY + 8)

  // Not valid for court strip
  const nvY = sigY + 14
  pdf.setFillColor(254, 226, 226)
  pdf.setDrawColor(248, 113, 113)
  pdf.roundedRect(10, nvY, pageWidth - 20, 10, 1.5, 1.5, 'FD')
  pdf.setTextColor(185, 28, 28)
  setPoppins('bold')
  pdf.setFontSize(8)
  pdf.text('⚠ NOT VALID FOR COURT ⚠', pageWidth/2, nvY + 7, { align: 'center' })

  // Contact box
  const cY = nvY + 14
  pdf.setFillColor(224, 242, 254)
  pdf.setDrawColor(147, 197, 253)
  pdf.roundedRect(10, cY, pageWidth - 20, 12, 1.5, 1.5, 'FD')
  pdf.setTextColor(15, 23, 42)
  setPoppins('normal')
  pdf.setFontSize(7)
  const cLine = [data.settings?.phone ? `Phone: ${data.settings.phone}` : '', data.settings?.address ? `Address: ${data.settings.address}` : ''].filter(Boolean).join('   ') 
  pdf.text(cLine || `Phone: -   Address: -`, pageWidth/2, cY + 8, { align: 'center' })

  // Hospital record (cut section)
  const cutY = cY + 22
  pdf.setDrawColor(203, 213, 225)
  pdf.setLineWidth(0.3)
  pdf.setLineDashPattern([2, 2], 0)
  pdf.line(10, cutY, pageWidth - 10, cutY)
  pdf.setLineDashPattern([], 0)

  pdf.setTextColor(100, 116, 139)
  setPoppins('bold')
  pdf.setFontSize(7)
  pdf.text('HOSPITAL RECORD (Cut and keep for records)', pageWidth/2, cutY + 6, { align: 'center' })

  const recX = 20
  const recY = cutY + 10
  const recW = pageWidth - 40
  const recH = 32
  pdf.setDrawColor(203, 213, 225)
  pdf.roundedRect(recX, recY, recW, recH, 2, 2, 'S')

  const cellW = recW / 3
  const cellH = recH / 2
  const recCells = [
    ['Patient name', safe(p.name)],
    ['Age', safe(p.age)],
    ['Gender', safe(p.gender)],
    ['MR Number', safe(p.mrn)],
    ['Phone', safe(p.phone)],
    ['Date', dateText],
  ]
  pdf.setFontSize(6)
  setPoppins('normal')
  recCells.forEach((c, i) => {
    const cx = recX + (i % 3) * cellW
    const cy = recY + (i >= 3 ? cellH : 0)
    pdf.setDrawColor(226, 232, 240)
    pdf.rect(cx, cy, cellW, cellH)
    pdf.setTextColor(100, 116, 139)
    pdf.text(String(c[0]), cx + 2, cy + 6)
    pdf.setTextColor(15, 23, 42)
    pdf.text(String(c[1]), cx + 2, cy + 11)
  })

  // bottom extra two cells similar to screenshot
  const bottomY = recY + recH + 4
  pdf.setFontSize(6)
  pdf.setTextColor(100, 116, 139)
  pdf.text(`Token #`, recX, bottomY + 6)
  pdf.setTextColor(15, 23, 42)
  pdf.text(safe((data as any).tokenNo), recX + 14, bottomY + 6)
  pdf.setTextColor(100, 116, 139)
  pdf.text(`Department`, recX + 70, bottomY + 6)
  pdf.setTextColor(15, 23, 42)
  pdf.text(safe(data.doctor?.departmentName), recX + 92, bottomY + 6)

  // timestamp small
  pdf.setTextColor(148, 163, 184)
  pdf.setFontSize(6)
  pdf.text(timeText, pageWidth - 10, 24, { align: 'right' })

  return pdf
}
