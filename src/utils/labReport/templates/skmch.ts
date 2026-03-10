import { labApi } from '../../api'

export type LabReportRow = { test: string; normal?: string; unit?: string; value?: string; prevValue?: string; flag?: 'normal'|'high'|'low'|'abnormal'|'critical'; comment?: string }

function interpretationToBulletLines(text: string): string[] {
  const raw = String(text || '')
  const t = raw.replace(/\r\n/g, '\n').trim()
  if (!t) return []
  const lines = t.split('\n').map(s => s.trim()).filter(Boolean)
  if (!lines.length) return []
  if (lines.length === 1) return [lines[0]]
  return lines
    .map(l => l.replace(/^([•\-*]|\d+[\.)])\s+/, '').trim())
    .filter(Boolean)
}

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
    JsBarcode(canvas, String(value || ''), { format: 'CODE128', displayValue: false, margin: 0, height: 40 })
    return canvas.toDataURL('image/png')
  } catch {}
  return ''
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
    ['Test(s)', ...(hasNormal? ['Normal'] : []), ...(hasUnit? ['Unit(s)'] : []), ...(hasPrev? ['Previous'] : []), 'Result', ...(hasFlag? ['Flag'] : []), ...(hasComment? ['Comment'] : [])]
  ]
  const body = nonEmptyRows.map(r => [
    r.test||'', ...(hasNormal? [r.normal||''] : []), ...(hasUnit? [r.unit||''] : []), ...(hasPrev? [r.prevValue||''] : []), r.value||'', ...(hasFlag? [r.flag||''] : []), ...(hasComment? [r.comment||''] : [])
  ])
  let idx = 1
  if (hasNormal) idx++
  if (hasUnit) idx++
  const idxPrev = hasPrev ? idx++ : -1
  const idxFlag = hasFlag ? idx + 1 : -1
  return { head, body, idxPrev, idxFlag, hasPrev, hasFlag, hasComment, hasNormal, hasUnit }
}

async function buildSkmchDoc(input: LabReportInput){
  const s: any = await labApi.getSettings().catch(()=>({}))
  const labName = s?.labName || ''
  const address = s?.address || '-'
  const phone = s?.phone || ''
  const email = s?.email || ''
  const department = s?.department || 'Department of Pathology'
  const logo = s?.logoDataUrl || ''
  const reportFooter = s?.reportFooter || 'NOTE: Lab values should always be correlated with clinical picture. \nNormal Range (F) and (M) shown are for most recent results.'

  const primaryConsultant = { name: s?.consultantName || '', degrees: s?.consultantDegrees || '', title: s?.consultantTitle || '' }
  const extraConsultants: Array<{ name?: string; degrees?: string; title?: string }> = Array.isArray(s?.consultants) ? s.consultants : []
  const consultantsList = [primaryConsultant, ...extraConsultants]
    .filter(c => (c?.name||'').trim() || (c?.degrees||'').trim() || (c?.title||'').trim())
    .slice(0,4)

  const approver = input.approvedBy || {}
  const approverSig = String(approver.signatureDataUrl || '').trim()
  let approverSigPng = ''
  if (approverSig){
    try { approverSigPng = await ensurePngDataUrl(approverSig) } catch {}
  }

  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default as any
  const doc = new jsPDF('p','pt','a4')
  doc.setFont('helvetica','normal')

  const pageW = 595
  const pageH = 842
  const marginX = 36

  // Draw heart logo helper
  const drawHeartLogo = (x: number, y: number, size: number) => {
    doc.setFillColor(200, 50, 50)
    const scale = size / 50
    doc.ellipse(x + 15*scale, y + 15*scale, 15*scale, 12*scale, 'F')
    doc.ellipse(x + 35*scale, y + 15*scale, 15*scale, 12*scale, 'F')
    const topY = y + 12*scale
    const bottomY = y + 40*scale
    doc.triangle(x + 8*scale, topY, x + 42*scale, topY, x + 25*scale, bottomY, 'F')
    doc.setFillColor(255, 255, 255)
    doc.ellipse(x + 25*scale, y + 15*scale, 4*scale, 3*scale, 'F')
  }

  // Header area
  let y = 30

  // Logo area - right side (positioned BEFORE red line, higher up)
  if (logo) {
    try {
      const normalized = await ensurePngDataUrl(logo)
      doc.addImage(normalized, 'PNG' as any, pageW - marginX - 70, y, 55, 45, undefined, 'FAST')
    } catch {
      drawHeartLogo(pageW - marginX - 55, y + 5, 40)
    }
  } else {
    drawHeartLogo(pageW - marginX - 55, y + 5, 40)
  }

  // Hospital name centered
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text(labName, pageW/2, y + 20, { align: 'center' })

  // Department name
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(department, pageW/2, y + 36, { align: 'center' })

  // Contact info (address/phone/email)
  const contactLine = [address, phone ? `Ph: ${phone}` : '', email ? `Email: ${email}` : '']
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .join('  |  ')
  if (contactLine){
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 41, 59)
    doc.text(contactLine, pageW/2, y + 50, { align: 'center' })
    doc.setTextColor(15, 23, 42)

    // Barcode should appear after phone/email/address (centered, in its own space)
    try {
      const b = String((input as any).barcode || input.tokenNo || '').trim()
      if (b) {
        const png = await makeBarcodePng(b)
        if (png) {
          const bw = 240
          const bh = 30
          const bx = (pageW - bw) / 2
          const by = y + 60
          doc.addImage(png, 'PNG' as any, bx, by, bw, bh, undefined, 'FAST')
        }
      }
    } catch {}

    y += 98
  } else {
    y += 50
  }

  // Thick red line under header
  doc.setDrawColor(180, 40, 40)
  doc.setLineWidth(2)
  doc.line(marginX, y, pageW - marginX, y)
  y += 16

  // Patient info section (like other templates)
  const leftX = marginX
  const rightX = pageW * 0.55
  const lineGap = 14
  const labelW = 120

  const drawKV = (label: string, value: string, x: number, yy: number) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label, x, yy)
    doc.setFont('helvetica', 'normal')
    doc.text(value || '-', x + labelW, yy)
  }

  const mrn = String(input.patient.mrn || '-')
  const name = String(input.patient.fullName || '-')
  const age = String(input.patient.age || '-')
  const gender = String(input.patient.gender || '-')
  const reportingTime = fmtDateTime(input.reportingTime)
  const sampleTime = fmtDateTime(input.sampleTime || input.createdAt)
  const consultant = String(input.referringConsultant || '-')
  const phoneText = String(input.patient.phone || '').trim()
  const addr = String(input.patient.address || '').trim()

  drawKV('Patient Name:', name, leftX, y)
  drawKV('MR No:', mrn, rightX, y)
  y += lineGap

  drawKV('Age:', age, leftX, y)
  drawKV('Gender:', gender, rightX, y)
  y += lineGap

  drawKV('Lab No:', String(input.tokenNo || '-'), leftX, y)
  drawKV('Reporting Time:', reportingTime, rightX, y)
  y += lineGap

  drawKV('Reg. & Sample Time:', sampleTime, leftX, y)
  drawKV('Referring Consultant:', consultant, rightX, y)
  y += lineGap

  drawKV('Contact:', phoneText || '-', leftX, y)
  y += lineGap

  drawKV('Address:', addr || '-', leftX, y)
  y += lineGap + 4

  // Test profile label if present
  if ((input.profileLabel||'').trim()) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(180, 40, 40)
    doc.text(String(input.profileLabel).trim().toUpperCase() + ' Report', marginX, y)
    y += 16
  }

  // Table
  const { head, body, idxPrev, idxFlag } = pickColumns(input.rows)
  const tableStartY = y

  autoTable(doc, {
    startY: tableStartY,
    head,
    body,
    styles: { 
      font: 'helvetica', 
      fontSize: 9, 
      cellPadding: 4,
      lineWidth: 0.3,
      lineColor: [150, 150, 150]
    },
    headStyles: { 
      fillColor: [240, 240, 240], 
      textColor: [0, 0, 0], 
      fontStyle: 'bold',
      lineWidth: 0.5,
      lineColor: [100, 100, 100]
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: marginX, right: marginX, bottom: 200 },
    didParseCell: (hookData: any) => {
      if (hookData.section !== 'body') return
      if (hookData.column.index === idxPrev || hookData.column.index === idxFlag) {
        hookData.cell.styles.fontStyle = 'bold'
      }
      if (hookData.column.index === idxFlag) {
        const v = String(hookData.cell.raw || '').toLowerCase()
        if (v.includes('high') || v.includes('critical')) hookData.cell.styles.textColor = [180, 40, 40]
        else if (v.includes('low')) hookData.cell.styles.textColor = [180, 83, 9]
        else if (v.includes('normal')) hookData.cell.styles.textColor = [21, 128, 61]
      }
    },
  })

  // Clinical Interpretation
  const interpLines = interpretationToBulletLines(String(input.interpretation || ''))
  if (interpLines.length) {
    const yStart = (((doc as any).lastAutoTable?.finalY) || tableStartY) + 14
    autoTable(doc, {
      startY: yStart,
      body: [
        [{ content: 'Clinical Interpretation', styles: { fontStyle: 'bold', textColor: [180, 40, 40] } }],
        ...interpLines.map(l => ([{ content: `• ${l}` }]))
      ],
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 0, textColor: [0, 0, 0] },
      margin: { left: marginX, right: marginX, bottom: 200 },
    })
  }

  // Footer
  const footerY = pageH - 140

  // Red line at approver section
  doc.setDrawColor(180, 40, 40)
  doc.setLineWidth(1)
  doc.line(marginX, footerY + 20, pageW - marginX, footerY + 20)

  // Electronically verified note (BELOW the red line)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text('System generated report. Verified by laboratory consultant. Not valid for any court of law.', pageW/2, footerY + 32, { align: 'center' })

  // Consultants at bottom - 4 columns
  if (consultantsList.length) {
    const cols = Math.min(consultantsList.length, 4)
    const colW = (pageW - marginX * 2) / cols
    const startY = footerY + 48

    consultantsList.forEach((c, i) => {
      const x = marginX + i * colW + 5
      let yy = startY
      
      if ((c.name||'').trim()) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(15, 23, 42)
        const nameLines = doc.splitTextToSize(String(c.name), colW - 10)
        doc.text(nameLines, x, yy)
        yy += (nameLines.length * 10)
      }
      
      if ((c.degrees||'').trim()) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(80, 80, 80)
        const degLines = doc.splitTextToSize(String(c.degrees), colW - 10)
        doc.text(degLines, x, yy)
        yy += (degLines.length * 9)
      }
      
      if ((c.title||'').trim()) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(120, 120, 120)
        const titleLines = doc.splitTextToSize(String(c.title), colW - 10)
        doc.text(titleLines, x, yy)
        yy += (titleLines.length * 9)
      }
    })
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(30, 41, 59)
  const footerLines = String(reportFooter || '').split('\n').map(s=>s.trim()).filter(Boolean)
  let fy = pageH - 46
  footerLines.slice(0,3).forEach(line => {
    doc.text(line, marginX, fy)
    fy += 12
  })

  // Approved by signature (optional)
  if (approverSigPng) {
    try {
      doc.addImage(approverSigPng, 'PNG' as any, pageW - marginX - 140, pageH - 88, 110, 40, undefined, 'FAST')
    } catch {}
  }

  return doc
}

export async function previewLabReportPdfSkmch(input: LabReportInput){
  const doc = await buildSkmchDoc(input)
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

export async function downloadLabReportPdfSkmch(input: LabReportInput){
  const doc = await buildSkmchDoc(input)
  const fileName = `lab-report-${(input.patient.mrn || '').replace(/\s+/g,'') || input.tokenNo}.pdf`
  doc.save(fileName)
}
