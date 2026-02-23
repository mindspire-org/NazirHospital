import { labApi } from '../../api'

export type LabReportRow = { test: string; normal?: string; unit?: string; value?: string; prevValue?: string; flag?: 'normal'|'abnormal'|'critical'; comment?: string }

async function makeQrPng(text: string, size = 128): Promise<string> {
  try {
    const mod: any = await import('qrcode')
    const toDataURL: any = (mod && typeof mod.toDataURL === 'function') ? mod.toDataURL : (mod?.default?.toDataURL)
    if (typeof toDataURL === 'function'){
      const dataUrl = await toDataURL(String(text || ''), { errorCorrectionLevel: 'M', margin: 0, width: size })
      return String(dataUrl || '')
    }
  } catch {}
  return ''
}

export type LabReportInput = {
  tokenNo: string
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

function fmtDateTime(iso?: string){
  if (!iso) return '-'
  if (/^\d{1,2}:\d{2}$/.test(String(iso))) return String(iso)
  try { const d = new Date(iso); if (isNaN(d.getTime())) return String(iso); return d.toLocaleDateString()+', '+d.toLocaleTimeString() } catch { return String(iso) }
}

function pickColumns(rows: LabReportRow[]) {
  const hasPrev = (rows||[]).some(r => (r.prevValue || '').trim().length > 0)
  const hasFlag = (rows||[]).some(r => (r.flag || '').length > 0)
  const hasComment = (rows||[]).some(r => (r.comment || '').trim().length > 0)
  const head = [
    ['Test','Normal Value','Unit', ...(hasPrev? ['Previous'] : []), 'Result', ...(hasFlag? ['Flag'] : []), ...(hasComment? ['Comment'] : [])]
  ]
  const body = (rows||[]).map(r => [
    r.test||'', r.normal||'', r.unit||'', ...(hasPrev? [r.prevValue||''] : []), r.value||'', ...(hasFlag? [r.flag||''] : []), ...(hasComment? [r.comment||''] : [])
  ])
  const idxPrev = hasPrev ? 3 : -1
  const idxFlag = hasFlag ? (hasPrev ? 5 : 4) : -1
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
  doc.setTextColor(255,255,255)
  const chipY = y + 20
  const chipH = 18
  const prevSizeA = doc.getFontSize()
  doc.setFontSize(9)
  const measureChip = (label: string, value: string) => {
    const labelW = doc.getTextWidth(label + ' ')
    const valW = doc.getTextWidth(value)
    const pad = 8
    return { w: labelW + valW + pad*2, labelW, pad }
  }
  const labVal = String(input.tokenNo || '-')
  const qrX = cardX + cardW - 62
  const qrY = y + 34
  const qrSize = 48
  const limitX = qrX - 8
  const labW = measureChip('Lab No: ', labVal).w
  const xLab = limitX - labW
  doc.setFontSize(prevSizeA)

  doc.setTextColor(255,255,255)
  doc.setFont('helvetica','bold')
  const leftBound = cardX + 10 + 64 + 16
  const rightBound = xLab - 6
  const centerX = (leftBound + rightBound) / 2
  const baseTitleSize = 18
  doc.setFontSize(baseTitleSize)
  const upper = String(labName).toUpperCase()
  const titleW = doc.getTextWidth(upper)
  const allowLeft = Math.max(1, centerX - leftBound)
  const allowRight = Math.max(1, rightBound - centerX)
  const allowedHalf = Math.min(allowLeft, allowRight)
  const allowedW = Math.max(1, allowedHalf * 2)
  const scale = Math.min(1, allowedW / Math.max(1, titleW))
  const finalTitleSize = Math.max(12, Math.min(18, baseTitleSize * scale))
  doc.setFontSize(finalTitleSize); doc.text(upper, centerX, y + 28, { align: 'center' })
  const depBase = 11
  doc.setFontSize(depBase)
  const depW = doc.getTextWidth(String(department))
  const depScale = Math.min(1, allowedW / Math.max(1, depW))
  doc.setFontSize(Math.max(9, Math.min(depBase, depBase * depScale)))
  doc.text(String(department), centerX, y + 44, { align: 'center' })
  const addrBase = 10
  doc.setFontSize(addrBase)
  const addrW = doc.getTextWidth(String(address))
  const addrScale = Math.min(1, allowedW / Math.max(1, addrW))
  doc.setFontSize(Math.max(8, Math.min(addrBase, addrBase * addrScale)))
  doc.text(String(address), centerX, y + 60, { align: 'center' })
  const contact = `Ph: ${phone || ''}${email? ' • '+email : ''}`
  const cBase = 9
  doc.setFontSize(cBase)
  const cW = doc.getTextWidth(contact)
  const cScale = Math.min(1, allowedW / Math.max(1, cW))
  doc.setFontSize(Math.max(8, Math.min(cBase, cBase * cScale)))
  doc.text(contact, centerX, y + 74, { align: 'center' })

  try {
    const qr = await makeQrPng(String(input.tokenNo || ''), 256)
    if (qr){
      doc.setFillColor(255,255,255); doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 6, 6, 'F')
      doc.addImage(qr, 'PNG' as any, qrX, qrY, qrSize, qrSize, undefined, 'FAST')
    }
  } catch {}
  const drawChip = (label: string, value: string, xx: number) => {
    const { w, labelW, pad } = measureChip(label, value)
    doc.setDrawColor(255,255,255); doc.setLineWidth(0.8)
    doc.setFillColor(255,255,255)
    doc.roundedRect(xx, chipY, w, chipH, 8, 8, 'FD')
    const prev = doc.getFontSize(); doc.setFontSize(9)
    doc.setTextColor(14,116,144)
    doc.text(label, xx + pad, chipY + 12)
    doc.setFont('helvetica','bold')
    doc.setTextColor(15)
    doc.text(value, xx + pad + labelW, chipY + 12)
    doc.setFont('helvetica','normal'); doc.setFontSize(prev)
    return w
  }
  drawChip('Lab No: ', labVal, xLab)

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
  drawKV('M.R. No :', String(input.patient.mrn || '-'), R, y); y += 14
  drawKV('Reg. & Sample Time :', String(fmtDateTime(input.createdAt)), L, y)
  drawKV('Reporting Time :', String(fmtDateTime(input.reportingTime || '-')), R, y); y += 14
  drawKV('Contact No :', String(input.patient.phone || '-'), L, y)
  drawKV('Referring Consultant :', String(input.referringConsultant || '-'), R, y); y += 14
  drawKV('Address :', String(input.patient.address || '-'), L, y); y += 8

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
    autoTable(doc, {
      startY: (((doc as any).lastAutoTable?.finalY) || (y + 12)) + 12,
      body: [
        [{ content: 'Clinical Interpretation:', styles: { fontStyle: 'bold' } }],
        [{ content: String(input.interpretation || '') }],
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
  if (logo){ try { const normalized = await ensurePngDataUrl(logo); doc.addImage(normalized, 'PNG' as any, cardX + 10, y + 10, 64, 64, undefined, 'FAST') } catch {} }
  doc.setTextColor(255,255,255)
  const chipY = y + 20
  const chipH = 18
  const prevSizeB = doc.getFontSize(); doc.setFontSize(9)
  const measureChip2 = (label: string, value: string) => {
    const labelW = doc.getTextWidth(label + ' ')
    const valW = doc.getTextWidth(value)
    const pad = 8
    return { w: labelW + valW + pad*2, labelW, pad }
  }
  const labVal2 = String(input.tokenNo || '-')
  const qrX2 = cardX + cardW - 62
  const qrY2 = y + 34
  const qrSize2 = 48
  const limitX2 = qrX2 - 8
  const labW2 = measureChip2('Lab No: ', labVal2).w
  const xLab2 = Math.max(cardX + cardW - 260, limitX2 - labW2)
  doc.setFontSize(prevSizeB)

  const leftBound2 = cardX + 10 + 64 + 16
  const rightBound2 = xLab2 - 6
  const centerX2 = (leftBound2 + rightBound2) / 2
  const baseTitleSize2 = 18
  doc.setFontSize(baseTitleSize2)
  const upper2 = String(labName).toUpperCase()
  const titleW2 = doc.getTextWidth(upper2)
  const allowLeft2 = Math.max(1, centerX2 - leftBound2)
  const allowRight2 = Math.max(1, rightBound2 - centerX2)
  const allowedHalf2 = Math.min(allowLeft2, allowRight2)
  const allowedW2 = Math.max(1, allowedHalf2 * 2)
  const scale2 = Math.min(1, allowedW2 / Math.max(1, titleW2))
  const finalTitleSize2 = Math.max(12, Math.min(18, baseTitleSize2 * scale2))
  doc.setFont('helvetica','bold')
  doc.setFontSize(finalTitleSize2); doc.text(upper2, centerX2, y + 28, { align: 'center' })
  const depBase2 = 11
  doc.setFontSize(depBase2)
  const depW2 = doc.getTextWidth(String(department))
  const depScale2 = Math.min(1, allowedW2 / Math.max(1, depW2))
  doc.setFontSize(Math.max(9, Math.min(depBase2, depBase2 * depScale2)))
  doc.text(String(department), centerX2, y + 44, { align: 'center' })
  const addrBase2 = 10
  doc.setFontSize(addrBase2)
  const addrW2 = doc.getTextWidth(String(address))
  const addrScale2 = Math.min(1, allowedW2 / Math.max(1, addrW2))
  doc.setFontSize(Math.max(8, Math.min(addrBase2, addrBase2 * addrScale2)))
  doc.text(String(address), centerX2, y + 60, { align: 'center' })
  const contact2 = `Ph: ${phone || ''}${email? ' • '+email : ''}`
  const cBase2 = 9
  doc.setFontSize(cBase2)
  const cW2 = doc.getTextWidth(contact2)
  const cScale2 = Math.min(1, allowedW2 / Math.max(1, cW2))
  doc.setFontSize(Math.max(8, Math.min(cBase2, cBase2 * cScale2)))
  doc.text(contact2, centerX2, y + 74, { align: 'center' })

  try {
    const qr2 = await makeQrPng(String(input.tokenNo || ''), 256)
    if (qr2){
      doc.setFillColor(255,255,255); doc.roundedRect(qrX2 - 4, qrY2 - 4, qrSize2 + 8, qrSize2 + 8, 6, 6, 'F')
      doc.addImage(qr2, 'PNG' as any, qrX2, qrY2, qrSize2, qrSize2, undefined, 'FAST')
    }
  } catch {}
  const drawChip2 = (label: string, value: string, xx: number) => {
    const { w, labelW, pad } = measureChip2(label, value)
    doc.setDrawColor(255,255,255); doc.setLineWidth(0.8)
    doc.setFillColor(255,255,255)
    doc.roundedRect(xx, chipY, w, chipH, 8, 8, 'FD')
    const prev = doc.getFontSize(); doc.setFontSize(9)
    doc.setTextColor(14,116,144)
    doc.text(label, xx + pad, chipY + 12)
    doc.setFont('helvetica','bold')
    doc.setTextColor(15)
    doc.text(value, xx + pad + labelW, chipY + 12)
    doc.setFont('helvetica','normal'); doc.setFontSize(prev)
    return w
  }
  drawChip2('Lab No: ', labVal2, xLab2)

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
  drawKV('M.R. No :', String(input.patient.mrn || '-'), R, y); y += 14
  drawKV('Reg. & Sample Time :', String(fmtDateTime(input.createdAt)), L, y)
  drawKV('Reporting Time :', String(fmtDateTime(input.reportingTime || '-')), R, y); y += 14
  drawKV('Contact No :', String(input.patient.phone || '-'), L, y)
  drawKV('Referring Consultant :', String(input.referringConsultant || '-'), R, y); y += 14
  drawKV('Address :', String(input.patient.address || '-'), L, y); y += 8

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
    autoTable(doc, {
      startY: (((doc as any).lastAutoTable?.finalY) || (y + 12)) + 12,
      body: [
        [{ content: 'Clinical Interpretation:', styles: { fontStyle: 'bold' } }],
        [{ content: String(input.interpretation || '') }],
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
