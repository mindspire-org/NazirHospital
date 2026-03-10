import { labApi } from '../../api'

export type LabReportRow = { test: string; normal?: string; unit?: string; value?: string; prevValue?: string; flag?: 'normal'|'high'|'low'|'abnormal'|'critical'; comment?: string }

export type LabReportInput = {
  tokenNo: string
  barcode?: string
  createdAt: string
  sampleTime?: string
  reportingTime?: string
  patient: { fullName: string; phone?: string; mrn?: string; age?: string; gender?: string; address?: string }
  rows: LabReportRow[]
  interpretation?: string
  printedBy?: string
  referringConsultant?: string
  profileLabel?: string
  approvedBy?: { name?: string; pmdcNumber?: string; signatureDataUrl?: string }
}

async function makeBarcodePng(value: string): Promise<string> {
  try {
    const mod: any = await import('jsbarcode')
    const JsBarcode = mod?.default || mod
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, value, { format: 'CODE128', displayValue: false, margin: 0, height: 40 })
    return canvas.toDataURL('image/png')
  } catch {
    return ''
  }
}

async function ensurePngDataUrl(src: string): Promise<string> {
  try {
    if (/^data:image\/(png|jpeg)/i.test(src)) return src
    return await new Promise<string>((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth || img.width || 200
          canvas.height = img.naturalHeight || img.height || 200
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0)
          const out = canvas.toDataURL('image/png')
          resolve(out || src)
        } catch { resolve(src) }
      }
      img.onerror = () => resolve(src)
      img.src = src
    })
  } catch { return src }
}

function fmtDateTime(iso?: string){
  if (!iso) return '-'
  if (/^\d{1,2}:\d{2}$/.test(String(iso))) return String(iso)
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return String(iso)
    return d.toLocaleDateString() + ', ' + d.toLocaleTimeString()
  } catch { return String(iso) }
}

function pickColumns(rows: LabReportRow[]) {
  // Filter out empty rows
  const nonEmptyRows = (rows||[]).filter(r =>
    (r.value || '').trim().length > 0 ||
    (r.normal || '').trim().length > 0 ||
    (r.unit || '').trim().length > 0 ||
    (r.flag || '').trim().length > 0 ||
    (r.comment || '').trim().length > 0
  )
  const hasPrev = nonEmptyRows.some(r => (r.prevValue || '').trim().length > 0)
  const hasFlag = nonEmptyRows.some(r => (r.flag || '').length > 0)
  const hasComment = nonEmptyRows.some(r => (r.comment || '').trim().length > 0)
  const hasNormal = nonEmptyRows.some(r => (r.normal || '').trim().length > 0)
  const hasUnit = nonEmptyRows.some(r => (r.unit || '').trim().length > 0)
  const head = [
    ['Test', ...(hasNormal? ['Normal Value'] : []), ...(hasUnit? ['Unit'] : []), ...(hasPrev? ['Previous'] : []), 'Result', ...(hasFlag? ['Flag'] : []), ...(hasComment? ['Comment'] : [])]
  ]
  const body = nonEmptyRows.map(r => [
    r.test||'', ...(hasNormal? [r.normal||''] : []), ...(hasUnit? [r.unit||''] : []), ...(hasPrev? [r.prevValue||''] : []), r.value||'', ...(hasFlag? [r.flag||''] : []), ...(hasComment? [r.comment||''] : [])
  ])
  let idx = 1
  if (hasNormal) idx++
  if (hasUnit) idx++
  const idxPrev = hasPrev ? idx++ : -1
  const idxFlag = hasFlag ? idx + 1 : -1
  return { head, body, idxPrev, idxFlag }
}

async function buildAdlDoc(input: LabReportInput){
  const s: any = await labApi.getSettings().catch(()=>({}))
  const address = s?.address || '-'
  const phone = s?.phone || ''
  const email = s?.email || ''
  const logo = s?.logoDataUrl || ''
  const department = s?.department || 'Department of Pathology'
  
  const primaryConsultant = { name: s?.consultantName || '', degrees: s?.consultantDegrees || '', title: s?.consultantTitle || '' }
  const extraConsultants: Array<{ name?: string; degrees?: string; title?: string }> = Array.isArray(s?.consultants) ? s.consultants : []
  const consultantsList = [primaryConsultant, ...extraConsultants]
    .filter(c => (c?.name||'').trim() || (c?.degrees||'').trim() || (c?.title||'').trim())
    .slice(0,3)

  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default as any
  const doc = new jsPDF('p','pt','a4')
  
  const pageW = 595
  const pageH = 842
  const marginX = 36
  
  // Header with blue line
  const headerY = 30
  const headerH = 118
  
  // Thin barcode at top right (like reference image)
  const barcodeH = 14
  const barcodeW = 75
  const barcodeX = pageW - marginX - barcodeW - 5
  const barcodeY = headerY + 5

  // Logo area on left
  if (logo) {
    try {
      const normalized = await ensurePngDataUrl(logo)
      doc.addImage(normalized, 'PNG' as any, marginX, headerY, 150, 62, undefined, 'FAST')
    } catch {}
  } else {
    // Draw ADL text logo if no logo image
    doc.setTextColor(0, 51, 102) // Dark blue
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(28)
    doc.text('ADL', marginX, headerY + 25)
    doc.setFontSize(8)
    doc.text('APEX DIAGNOSTIC LABORATORY', marginX, headerY + 40)
  }
  
  // Draw actual CODE128 barcode at top right (prefer input.barcode, fallback to token)
  try {
    const b = String((input as any).barcode || input.tokenNo || '').trim()
    if (b) {
      const png = await makeBarcodePng(b)
      if (png) {
        doc.addImage(png, 'PNG' as any, barcodeX, barcodeY, barcodeW, barcodeH, undefined, 'FAST')
      }
    }
  } catch {}
  
  // Patient info on right side - moved up closer to barcode
  const infoX = marginX + 240
  const infoY = headerY + 20
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)
  
  const drawInfoLine = (label: string, value: string, y: number) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label + ':', infoX, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value || '-', infoX + 80, y, { maxWidth: 210 } as any)
  }
  
  drawInfoLine('MR #', String(input.patient.mrn || ''), infoY + 4)
  drawInfoLine('Patient Name', String(input.patient.fullName || ''), infoY + 16)
  drawInfoLine('Age/gender', `${String(input.patient.age || '-')} / ${String(input.patient.gender || '-')}`, infoY + 28)
  drawInfoLine('Address', String(input.patient.address || '-'), infoY + 40)
  drawInfoLine('Contact #', String(input.patient.phone || ''), infoY + 52)
  drawInfoLine('Referred By', String(input.referringConsultant || '-'), infoY + 64)
  drawInfoLine('Reg. & Sample time', fmtDateTime(input.sampleTime || input.createdAt), infoY + 76)
  drawInfoLine('Reporting time', fmtDateTime(input.reportingTime), infoY + 88)
  
  // Blue horizontal line under header
  doc.setDrawColor(0, 102, 204)
  doc.setLineWidth(1.5)
  const headerLineY = headerY + headerH
  doc.line(marginX, headerLineY, pageW - marginX, headerLineY)
  
  // Department section header (like reference image - Hematology, Chemistry, etc.)
  const deptY = headerLineY + 22
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(0, 51, 102)
  doc.text(department.toUpperCase(), pageW / 2, deptY, { align: 'center' })
  
  const tableStartY = deptY + 20
  
  const { head, body, idxPrev, idxFlag } = pickColumns(input.rows)
  
  autoTable(doc, {
    startY: tableStartY,
    head,
    body,
    theme: 'plain',
    styles: { 
      font: 'helvetica', 
      fontSize: 9, 
      cellPadding: 3,
      lineWidth: 0.3,
      lineColor: [200, 200, 200],
      halign: 'left',
    },
    headStyles: { 
      fillColor: [240, 248, 255], 
      textColor: [0, 51, 102], 
      fontStyle: 'bold',
      lineWidth: 0.5,
      lineColor: [0, 102, 204]
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: marginX, right: marginX, bottom: 140 },
    didParseCell: (hookData: any) => {
      if (hookData.section !== 'body') return
      if (hookData.column.index === idxPrev || hookData.column.index === idxFlag) {
        hookData.cell.styles.fontStyle = 'bold'
      }
    },
  })
  
  // Footer
  const baseY = pageH - 90
  
  // Three Pathologist signature boxes attached together (no gap like reference image)
  const totalBoxW = 500
  const sigBoxW = totalBoxW / 3
  const startX = (pageW - totalBoxW) / 2
  
  // Draw outer rectangle for all 3 boxes
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.rect(startX, baseY, totalBoxW, 55)
  
  // Draw vertical divider lines between boxes
  for (let i = 1; i < 3; i++) {
    const x = startX + i * sigBoxW
    doc.line(x, baseY, x, baseY + 55)
  }
  
  for (let i = 0; i < 3; i++) {
    const x = startX + i * sigBoxW
    
    // Consultant info if available
    const consultant = consultantsList[i]
    if (consultant) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      if (consultant.name) {
        doc.text(consultant.name, x + sigBoxW/2, baseY + 20, { align: 'center' })
      }
      if (consultant.degrees) {
        doc.setFontSize(8)
        doc.text(consultant.degrees, x + sigBoxW/2, baseY + 32, { align: 'center' })
      }
    }
    
    // Pathologist label at bottom of box
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text('Pathologist', x + sigBoxW/2, baseY + 48, { align: 'center' })
  }
  
  // Horizontal line below boxes
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(marginX, baseY + 65, pageW - marginX, baseY + 65)
  
  // Contact info at bottom with drawn icons (like reference image)
  const contactY = baseY + 78
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  
  // Helper to draw professional phone icon (simple filled style like other icons)
  const drawPhoneIcon = (x: number, y: number) => {
    doc.setFillColor(80, 80, 80)
    doc.setDrawColor(80, 80, 80)
    
    // Simple filled phone icon - matches envelope/location style
    // Outer rounded rectangle
    doc.roundedRect(x + 1, y - 6, 10, 14, 2, 2, 'FD')
    
    // Inner white area (screen)
    doc.setFillColor(220, 220, 220)
    doc.rect(x + 3, y - 4, 6, 8, 'F')
  }
  
  // Helper to draw professional envelope icon
  const drawEnvelopeIcon = (x: number, y: number) => {
    doc.setFillColor(240, 240, 240)
    doc.setDrawColor(100, 100, 100)
    doc.setLineWidth(0.5)
    // Envelope body
    doc.rect(x, y - 6, 12, 10, 'FD')
    // Envelope flap lines
    doc.line(x, y - 6, x + 6, y - 1)
    doc.line(x + 12, y - 6, x + 6, y - 1)
    doc.line(x, y - 6, x + 12, y - 6)
  }
  
  // Helper to draw professional location pin icon
  const drawLocationIcon = (x: number, y: number) => {
    doc.setFillColor(220, 60, 60)
    doc.setDrawColor(150, 40, 40)
    doc.setLineWidth(0.5)
    // Pin head - filled circle
    doc.ellipse(x + 5, y - 5, 4, 4, 'FD')
    // Pin center dot
    doc.setFillColor(255, 255, 255)
    doc.ellipse(x + 5, y - 5, 1.5, 1.5, 'F')
    // Pin point triangle
    doc.setFillColor(220, 60, 60)
    doc.triangle(x + 2, y - 2, x + 5, y + 4, x + 8, y - 2, 'FD')
  }
  
  // Calculate positions for 3 columns
  const col1X = marginX + 25
  const col3X = pageW - marginX - 20
  
  // Phone with icon
  if (phone) {
    drawPhoneIcon(col1X - 20, contactY)
    doc.text(phone, col1X, contactY)
  }
  
  // Email with icon (blue and underlined style)
  if (email) {
    doc.setTextColor(0, 102, 204) // Blue color for email
    const emailWidth = doc.getTextWidth(email)
    const iconW = 12
    const gap = 6
    const midStart = col1X + 120
    const midEnd = col3X - 120
    const midW = Math.max(60, midEnd - midStart)
    const groupW = iconW + gap + emailWidth
    const groupStart = midStart + Math.max(0, (midW - groupW) / 2)
    const iconX = groupStart
    const textX = groupStart + iconW + gap

    drawEnvelopeIcon(iconX, contactY)
    doc.text(email, textX, contactY)
    // Underline the email
    doc.setDrawColor(0, 102, 204)
    doc.setLineWidth(0.5)
    doc.line(textX, contactY + 2, textX + emailWidth, contactY + 2)
    doc.setTextColor(0, 0, 0) // Reset to black
  }
  
  // Address with icon
  if (address) {
    const addrText = address
    const addrWidth = doc.getTextWidth(addrText)
    drawLocationIcon(col3X - addrWidth - 25, contactY)
    doc.text(addrText, col3X - addrWidth, contactY)
  }
  
  return doc
}

export async function previewLabReportPdfAdl(input: LabReportInput){
  const doc = await buildAdlDoc(input)
  try{
    const api = (window as any).electronAPI
    if (api && typeof api.printPreviewPdf === 'function'){
      const dataUrl = doc.output('datauristring') as string
      await api.printPreviewPdf(dataUrl)
      return
    }
  }catch{}

  doc.autoPrint()
  const blob = doc.output('blob') as Blob
  const url = URL.createObjectURL(blob)
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.visibility = 'hidden'
  iframe.onload = () => {
    try { iframe.contentWindow?.focus(); iframe.contentWindow?.print() } catch {}
    setTimeout(()=>{ try { URL.revokeObjectURL(url); iframe.remove() } catch {} }, 10000)
  }
  iframe.src = url
  document.body.appendChild(iframe)
}

export async function downloadLabReportPdfAdl(input: LabReportInput){
  const doc = await buildAdlDoc(input)
  const fileName = `lab-report-${(input.patient.mrn || '').replace(/\s+/g,'') || input.tokenNo}.pdf`
  doc.save(fileName)
}
