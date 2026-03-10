import { labApi } from '../../api'

export type LabReportRow = { test: string; normal?: string; unit?: string; value?: string; prevValue?: string; flag?: 'normal'|'abnormal'|'critical'; comment?: string }

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

async function makeHorizontalGradient(width: number, height: number, stops?: Array<{ offset: number; color: string }>): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(4, Math.round(width))
  canvas.height = Math.max(4, Math.round(height))
  const ctx = canvas.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, canvas.width, 0)
  const def = stops && stops.length ? stops : [
    { offset: 0, color: '#06b6d4' },
    { offset: 0.5, color: '#22d3ee' },
    { offset: 1, color: '#0ea5e9' },
  ]
  def.forEach(s => g.addColorStop(Math.min(1, Math.max(0, s.offset)), s.color))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

async function makeBarcodeDataUrl(text: string): Promise<string> {
  const value = String(text || '').trim()
  if (!value) return ''
  try {
    const canvas = document.createElement('canvas')
    const mod: any = await import('jsbarcode')
    const JsBarcode: any = (mod && typeof mod === 'function') ? mod : mod?.default
    if (typeof JsBarcode !== 'function') return ''
    JsBarcode(canvas, value, {
      format: 'CODE128',
      displayValue: false,
      height: 48,
      margin: 0,
    })
    return canvas.toDataURL('image/png')
  } catch {
    return ''
  }
}

function fmtDateTime(iso?: string){
  if (!iso) return '-'
  if (/^\d{1,2}:\d{2}$/.test(String(iso))) return String(iso)
  try { const d = new Date(iso); if (isNaN(d.getTime())) return String(iso); return d.toLocaleDateString()+', '+d.toLocaleTimeString() } catch { return String(iso) }
}

function pickColumns(rows: LabReportRow[]) {
  // Filter out completely empty rows so they don't force columns to render
  const nonEmptyRows = (rows||[]).filter(r =>
    (r.value || '').trim().length > 0 ||
    (r.normal || '').trim().length > 0 ||
    (r.unit || '').trim().length > 0 ||
    (r.prevValue || '').trim().length > 0 ||
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

function drawFooter(doc: any, consultantsList: Array<{ name?: string; degrees?: string; title?: string }>, printedBy?: string){
  const pageHeight = (doc.internal.pageSize as any).getHeight ? (doc.internal.pageSize as any).getHeight() : (doc.internal.pageSize as any).height
  let baseY = pageHeight - 90
  doc.setFontSize(10)
  doc.setTextColor(51,65,85)
  doc.text('System Generated Report, No Signature Required. Approved By Consultant. Not Valid For Any Court Of Law.', 297.5, baseY, { align: 'center' })
  doc.setDrawColor(51,65,85); doc.line(40, baseY + 8, 555, baseY + 8)
  if (consultantsList.length){
    const cols = consultantsList.length
    const colW = (555 - 40) / cols
    consultantsList.forEach((c, i) => {
      const x = 40 + i * colW + 4
      let yy = baseY + 26
      doc.setFontSize(11)
      doc.setTextColor(15)
      if ((c.name||'').trim()) { doc.text(String(c.name), x, yy); yy += 12 }
      doc.setFontSize(10)
      if ((c.degrees||'').trim()) { doc.text(String(c.degrees), x, yy); yy += 12 }
      if ((c.title||'').trim()) { doc.setFont('helvetica', 'bold'); doc.text(String(c.title), x, yy); doc.setFont('helvetica', 'normal'); }
    })
  }
  if ((printedBy||'').trim()){
    doc.setFontSize(10)
    doc.setTextColor(71,85,105)
    doc.text(String('User: '+printedBy), 555, baseY + 26, { align: 'right' })
  }
}

export async function previewLabReportPdfGradient(input: LabReportInput){
  const s: any = await labApi.getSettings().catch(()=>({}))
  const labName = s?.labName || 'Laboratory'
  const address = s?.address || '-'
  const phone = s?.phone || ''
  const email = s?.email || ''
  const department = s?.department || 'Department of Pathology'
  const logo = s?.logoDataUrl || ''
  const primaryConsultant = { name: s?.consultantName || '', degrees: s?.consultantDegrees || '', title: s?.consultantTitle || '' }
  const extraConsultants: Array<{ name?: string; degrees?: string; title?: string }> = Array.isArray(s?.consultants) ? s.consultants : []
  const consultantsList = [primaryConsultant, ...extraConsultants]
    .filter(c => (c?.name||'').trim() || (c?.degrees||'').trim() || (c?.title||'').trim())
    .slice(0,3)

  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default as any
  const doc = new jsPDF('p','pt','a4')
  doc.setFont('helvetica','normal')

  // Gradient header card
  const cardX = 28, cardW = 595 - cardX*2
  let y = 34
  const gradH = 86
  try{
    const grad = await makeHorizontalGradient(cardW, gradH)
    doc.addImage(grad, 'PNG' as any, cardX, y, cardW, gradH, undefined, 'FAST')
  }catch{
    doc.setFillColor(14,165,233); doc.rect(cardX, y, cardW, gradH, 'F')
  }
  // Subtle rounded border to mimic card edges
  doc.setDrawColor(203,213,225); doc.setLineWidth(0.8); doc.roundedRect(cardX, y, cardW, gradH, 14, 14, 'S')
  // Logo left
  // White tile behind logo
  doc.setFillColor(255,255,255); doc.roundedRect(cardX + 10, y + 10, 64, 64, 8, 8, 'F')
  if (logo){ try { const normalized = await ensurePngDataUrl(logo); doc.addImage(normalized, 'PNG' as any, cardX + 14, y + 14, 56, 56, undefined, 'FAST') } catch {} }
  const leftX = cardX + 10 + 64 + 16
  doc.setTextColor(255,255,255)
  doc.setFont('helvetica','bold')
  doc.setFontSize(18)
  doc.text(String(labName).toUpperCase(), leftX, y + 28)
  doc.setFontSize(11)
  doc.text(String(department), leftX, y + 44)
  doc.setFontSize(10)
  doc.text(String(address), leftX, y + 60)
  const contact = `Ph: ${phone || ''}${email? ' • '+email : ''}`
  doc.setFontSize(9)
  doc.text(contact, leftX, y + 74)

  if ((input.barcode || '').trim()) {
    try {
      const b = String(input.barcode || '').trim()
      const png = await makeBarcodeDataUrl(b)
      if (png) {
        const bw = 190
        const bh = 26
        const bx = cardX + cardW - bw - 24
        const by = y + 38
        doc.setFillColor(255,255,255)
        doc.roundedRect(bx - 4, by - 4, bw + 8, bh + 22, 6, 6, 'F')
        doc.addImage(png, 'PNG' as any, bx, by, bw, bh, undefined, 'FAST')
        doc.setFont('helvetica','bold')
        doc.setFontSize(8)
        doc.setTextColor(15)
        doc.text(b, bx + bw / 2, by + bh + 14, { align: 'center' })
      }
    } catch {}
  }

  // Optional profile/test pill on the top-right
  if ((input.profileLabel||'').trim()){
    const pill = String(input.profileLabel).trim()
    const padX = 10
    const pillW = doc.getTextWidth(pill) + padX*2
    const px = cardX + cardW - pillW - 14
    const py = y + 10
    doc.setFillColor(16,185,129)
    doc.setDrawColor(16,185,129)
    doc.roundedRect(px, py, pillW, 20, 10, 10, 'FD')
    doc.setTextColor(255,255,255)
    doc.setFont('helvetica','bold')
    doc.setFontSize(10)
    doc.text(pill.toUpperCase(), px + padX, py + 14)
    doc.setFont('helvetica','normal')
    doc.setTextColor(255,255,255)
  }

  y += gradH + 12

  // Patient meta box
  doc.setDrawColor(226,232,240)
  doc.roundedRect(40, y, 515, 72, 6, 6)
  y += 16
  doc.setTextColor(15)
  doc.setFontSize(10)
  const L = 52, R = 300
  const drawKV = (label: string, value: string, x: number, yy: number) => {
    doc.setFont('helvetica','bold'); doc.text(label, x, yy)
    const w = doc.getTextWidth(label + ' ')
    doc.setFont('helvetica','normal'); doc.text(value, x + w, yy)
  }
  drawKV('Patient Name :', String(input.patient.fullName), L, y)
  drawKV('Lab No :', String(input.tokenNo || '-'), R, y); y += 14
  drawKV('Reg. & Sample Time :', String(fmtDateTime(input.createdAt)), L, y)
  drawKV('M.R. No :', String(input.patient.mrn || '-'), R, y); y += 14
  drawKV('Contact No :', String(input.patient.phone || '-'), L, y)
  drawKV('Reporting Time :', String(fmtDateTime(input.reportingTime || '-')), R, y); y += 14
  drawKV('Address :', String(input.patient.address || '-'), L, y); y += 8
  drawKV('Referring Consultant :', String(input.referringConsultant || '-'), R, y - 8)

  // Results table
  const { head, body, idxPrev, idxFlag } = pickColumns(input.rows)
  autoTable(doc, {
    startY: y + 12,
    head,
    body,
    styles: { fontSize: 9, cellPadding: 4, lineWidth: 0.5 },
    headStyles: { fillColor: [248,250,252], textColor: [15,23,42], halign: 'left', fontStyle: 'bold' },
    tableLineColor: [15,23,42],
    tableLineWidth: 0.5,
    theme: 'grid',
    columnStyles: { ...(idxPrev>=0? { [idxPrev]: { fontStyle: 'bold' } } : {}), ...(idxFlag>=0? { [idxFlag]: { fontStyle: 'bold' } } : {}) },
    margin: { bottom: 120 },
  })

  if ((input.interpretation||'').trim()){
    const bullets = String(input.interpretation || '')
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => `• ${s}`)
      .join('\n')
    autoTable(doc, {
      startY: (((doc as any).lastAutoTable?.finalY) || (y + 12)) + 12,
      body: [
        [{ content: 'Clinical Interpretation:', styles: { fontStyle: 'bold' } }],
        [{ content: bullets || String(input.interpretation || '') }],
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 0, halign: 'left' },
      margin: { left: 40, right: 40, bottom: 120 },
    })
  }

  const pages = (doc as any).internal.getNumberOfPages()
  for (let i=1;i<=pages;i++){ (doc as any).setPage(i); drawFooter(doc, consultantsList, input.printedBy) }

  // Prefer Electron preview
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

export async function downloadLabReportPdfGradient(input: LabReportInput){
  const s: any = await labApi.getSettings().catch(()=>({}))
  const labName = s?.labName || 'Laboratory'
  const address = s?.address || '-'
  const phone = s?.phone || ''
  const email = s?.email || ''
  const department = s?.department || 'Department of Pathology'
  const logo = s?.logoDataUrl || ''
  const primaryConsultant = { name: s?.consultantName || '', degrees: s?.consultantDegrees || '', title: s?.consultantTitle || '' }
  const extraConsultants: Array<{ name?: string; degrees?: string; title?: string }> = Array.isArray(s?.consultants) ? s.consultants : []
  const consultantsList = [primaryConsultant, ...extraConsultants]
    .filter(c => (c?.name||'').trim() || (c?.degrees||'').trim() || (c?.title||'').trim())
    .slice(0,3)

  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default as any
  const doc = new jsPDF('p','pt','a4')
  doc.setFont('helvetica','normal')

  // Gradient header card
  const cardX = 28, cardW = 595 - cardX*2
  let y = 34
  const gradH = 86
  try{
    const grad = await makeHorizontalGradient(cardW, gradH)
    doc.addImage(grad, 'PNG' as any, cardX, y, cardW, gradH, undefined, 'FAST')
  }catch{
    doc.setFillColor(14,165,233); doc.rect(cardX, y, cardW, gradH, 'F')
  }
  doc.setDrawColor(203,213,225); doc.setLineWidth(0.8); doc.roundedRect(cardX, y, cardW, gradH, 14, 14, 'S')
  doc.setFillColor(255,255,255); doc.roundedRect(cardX + 10, y + 10, 64, 64, 8, 8, 'F')
  if (logo){ try { const normalized = await ensurePngDataUrl(logo); doc.addImage(normalized, 'PNG' as any, cardX + 14, y + 14, 56, 56, undefined, 'FAST') } catch {} }
  const leftX2 = cardX + 10 + 64 + 16
  doc.setTextColor(255,255,255)
  doc.setFont('helvetica','bold')
  doc.setFontSize(18)
  doc.text(String(labName).toUpperCase(), leftX2, y + 28)
  doc.setFontSize(11)
  doc.text(String(department), leftX2, y + 44)
  doc.setFontSize(10)
  doc.text(String(address), leftX2, y + 60)
  const contact2 = `Ph: ${phone || ''}${email? ' • '+email : ''}`
  doc.setFontSize(9)
  doc.text(contact2, leftX2, y + 74)

  if ((input.barcode || '').trim()) {
    try {
      const b = String(input.barcode || '').trim()
      const png = await makeBarcodeDataUrl(b)
      if (png) {
        const bw = 190
        const bh = 26
        const bx = cardX + cardW - bw - 24
        const by = y + 38
        doc.setFillColor(255,255,255)
        doc.roundedRect(bx - 4, by - 4, bw + 8, bh + 22, 6, 6, 'F')
        doc.addImage(png, 'PNG' as any, bx, by, bw, bh, undefined, 'FAST')
        doc.setFont('helvetica','bold')
        doc.setFontSize(8)
        doc.setTextColor(15)
        doc.text(b, bx + bw / 2, by + bh + 14, { align: 'center' })
      }
    } catch {}
  }

  y += gradH + 12
  doc.setDrawColor(226,232,240)
  doc.roundedRect(40, y, 515, 72, 6, 6)
  y += 16
  doc.setTextColor(15)
  doc.setFontSize(10)
  const L = 52, R = 300
  const drawKV = (label: string, value: string, x: number, yy: number) => {
    doc.setFont('helvetica','bold'); doc.text(label, x, yy)
    const w = doc.getTextWidth(label + ' ')
    doc.setFont('helvetica','normal'); doc.text(value, x + w, yy)
  }
  drawKV('Patient Name :', String(input.patient.fullName), L, y)
  drawKV('Lab No :', String(input.tokenNo || '-'), R, y); y += 14
  drawKV('Reg. & Sample Time :', String(fmtDateTime(input.createdAt)), L, y)
  drawKV('M.R. No :', String(input.patient.mrn || '-'), R, y); y += 14
  drawKV('Contact No :', String(input.patient.phone || '-'), L, y)
  drawKV('Reporting Time :', String(fmtDateTime(input.reportingTime || '-')), R, y); y += 14
  drawKV('Address :', String(input.patient.address || '-'), L, y); y += 8
  drawKV('Referring Consultant :', String(input.referringConsultant || '-'), R, y - 8)

  const { head, body, idxPrev, idxFlag } = pickColumns(input.rows)
  autoTable(doc, {
    startY: y + 12,
    head,
    body,
    styles: { fontSize: 9, cellPadding: 4, lineWidth: 0.5 },
    headStyles: { fillColor: [248,250,252], textColor: [15,23,42], halign: 'left', fontStyle: 'bold' },
    tableLineColor: [15,23,42],
    tableLineWidth: 0.5,
    theme: 'grid',
    columnStyles: { ...(idxPrev>=0? { [idxPrev]: { fontStyle: 'bold' } } : {}), ...(idxFlag>=0? { [idxFlag]: { fontStyle: 'bold' } } : {}) },
    margin: { bottom: 120 },
  })
  if ((input.interpretation||'').trim()){
    const bullets2 = String(input.interpretation || '')
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => `• ${s}`)
      .join('\n')
    autoTable(doc, {
      startY: (((doc as any).lastAutoTable?.finalY) || (y + 12)) + 12,
      body: [
        [{ content: 'Clinical Interpretation:', styles: { fontStyle: 'bold' } }],
        [{ content: bullets2 || String(input.interpretation || '') }],
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 0, halign: 'left' },
      margin: { left: 40, right: 40, bottom: 120 },
    })
  }

  const pages = (doc as any).internal.getNumberOfPages()
  for (let i=1;i<=pages;i++){ (doc as any).setPage(i); drawFooter(doc, consultantsList, input.printedBy) }

  const fileName = `lab-report-${(input.patient.mrn || '').replace(/\s+/g,'') || input.tokenNo}.pdf`
  doc.save(fileName)
}
