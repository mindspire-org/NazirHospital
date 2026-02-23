import { labApi } from './api'

export type ReportRow = { test: string; normal?: string; unit?: string; value?: string; prevValue?: string; flag?: 'normal'|'abnormal'|'critical'; comment?: string }

export async function downloadLabReportPdf(input: {
  tokenNo: string
  createdAt: string
  sampleTime?: string
  reportingTime?: string
  patient: { fullName: string; phone?: string; mrn?: string; age?: string; gender?: string; address?: string }
  rows: ReportRow[]
  interpretation?: string
  printedBy?: string
  referringConsultant?: string
  profileLabel?: string
}){
  const s: any = await labApi.getSettings().catch(()=>({}))
  // Dispatch to selected template if configured
  try {
    if ((s?.reportTemplate || 'classic') === 'modern'){
      const mod = await import('./labReport/templates/modern')
      return mod.downloadLabReportPdfModern(input)
    }
    if ((s?.reportTemplate || 'classic') === 'tealGradient'){
      const mod = await import('./labReport/templates/tealHeader')
      return mod.downloadLabReportPdfGradient(input)
    }
  } catch {}
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
  let y = 40

  // Header (logo + lab info centered)
  if (logo) {
    try {
      const normalized = await ensurePngDataUrl(logo)
      // raise logo slightly more so it aligns visually with centered title
      doc.addImage(normalized, 'PNG' as any, 40, y - 32, 70, 70, undefined, 'FAST')
    } catch {}
  }
  doc.setFontSize(16)
  doc.text(String(labName), 297.5, y, { align: 'center' }); y += 16
  doc.setFontSize(10)
  doc.text(String(address), 297.5, y, { align: 'center' }); y += 12
  doc.text(`Ph: ${phone || ''}${email? ' • '+email : ''}`, 297.5, y, { align: 'center' }); y += 16
  doc.setDrawColor(15); doc.line(40, y, 555, y); y += 10
  doc.setFontSize(11)
  doc.text(String(department), 297.5, y, { align: 'center' }); y += 16

  // Key values
  doc.setFontSize(10)
  const L = 40, R = 300
  const dt = (iso?: string)=> fmtDateTime(iso)
  const drawKV = (label: string, value: string, x: number, yy: number) => {
    doc.setFont('helvetica','bold');
    doc.text(label, x, yy)
    const w = doc.getTextWidth(label + ' ')
    doc.setFont('helvetica','normal');
    doc.text(value, x + w, yy)
  }
  drawKV('Medical Record No :', String(input.patient.mrn || '-'), L, y)
  drawKV('Sample No / Lab No :', String(input.tokenNo), R, y); y += 14
  drawKV('Patient Name :', String(input.patient.fullName), L, y)
  drawKV('Age / Gender :', `${input.patient.age || ''} / ${input.patient.gender || ''}`, R, y); y += 14
  drawKV('Reg. & Sample Time :', String(dt(input.createdAt)), L, y)
  drawKV('Reporting Time :', String(input.reportingTime || '-'), R, y); y += 14
  drawKV('Contact No :', String(input.patient.phone || '-'), L, y)
  drawKV('Referring Consultant :', String(input.referringConsultant || '-'), R, y); y += 14
  drawKV('Address :', String(input.patient.address || '-'), L, y); y += 8

  // Table
  const hasPrev = (input.rows||[]).some(r => (r.prevValue || '').trim().length > 0)
  const hasFlag = (input.rows||[]).some(r => (r.flag || '').length > 0)
  const hasComment = (input.rows||[]).some(r => (r.comment || '').trim().length > 0)
  const head = [
    ['Test','Normal Value','Unit', ...(hasPrev? ['Previous'] : []), 'Result', ...(hasFlag? ['Flag'] : []), ...(hasComment? ['Comment'] : [])]
  ]
  const body = (input.rows||[]).map(r => [
    r.test||'', r.normal||'', r.unit||'', ...(hasPrev? [r.prevValue||''] : []), r.value||'', ...(hasFlag? [r.flag||''] : []), ...(hasComment? [r.comment||''] : [])
  ])
  const drawFooter = () => {
    const pageHeight = (doc.internal.pageSize as any).getHeight ? (doc.internal.pageSize as any).getHeight() : (doc.internal.pageSize as any).height
    let baseY = pageHeight - 90
    // Footnote line
    doc.setFontSize(10)
    doc.text('System Generated Report, No Signature Required. Approved By Consultant. Not Valid For Any Court Of Law.', 297.5, baseY, { align: 'center' })
    doc.setDrawColor(51,65,85); doc.line(40, baseY + 8, 555, baseY + 8)
    // Consultants row
    if (consultantsList.length){
      const cols = consultantsList.length
      const colW = (555 - 40) / cols
      consultantsList.forEach((c, i) => {
        const x = 40 + i * colW + 4
        let yy = baseY + 26
        doc.setFontSize(11)
        if ((c.name||'').trim()) { doc.text(String(c.name), x, yy); yy += 12 }
        doc.setFontSize(10)
        if ((c.degrees||'').trim()) { doc.text(String(c.degrees), x, yy); yy += 12 }
        if ((c.title||'').trim()) { doc.setFont('helvetica', 'bold'); doc.text(String(c.title), x, yy); doc.setFont('helvetica', 'normal'); }
      })
    }
  }

  const columnStyles: Record<number, any> = {}
  const idxPrev = hasPrev ? 3 : -1
  const idxFlag = hasFlag ? (hasPrev ? 5 : 4) : -1
  if (idxPrev >= 0) columnStyles[idxPrev] = { fontStyle: 'bold' }
  if (idxFlag >= 0) columnStyles[idxFlag] = { fontStyle: 'bold' }

  autoTable(doc, {
    startY: y + 12,
    head,
    body,
    styles: { fontSize: 9, cellPadding: 4, lineWidth: 0.5 },
    headStyles: { fillColor: [248,250,252], textColor: [15,23,42], halign: 'left', fontStyle: 'bold' },
    tableLineColor: [15,23,42],
    tableLineWidth: 0.5,
    theme: 'grid',
    columnStyles,
    didParseCell: (hookData: any) => {
      if (hookData.section === 'body' && (hookData.column.index === idxPrev || hookData.column.index === idxFlag)) {
        hookData.cell.styles.fontStyle = 'bold'
      }
    },
    margin: { bottom: 120 },
  })

  const hasInterpretation = (input.interpretation || '').trim().length > 0
  if (hasInterpretation) {
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

  const pageCount1 = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount1; i++) { (doc as any).setPage(i); drawFooter() }

  const fileName = `lab-report-${(input.patient.mrn || '').replace(/\s+/g,'') || input.tokenNo}.pdf`
  doc.save(fileName)
}

export async function previewLabReportPdf(input: {
  tokenNo: string
  createdAt: string
  sampleTime?: string
  reportingTime?: string
  patient: { fullName: string; phone?: string; mrn?: string; age?: string; gender?: string; address?: string }
  rows: ReportRow[]
  interpretation?: string
  printedBy?: string
  referringConsultant?: string
  profileLabel?: string
}){
  const s: any = await labApi.getSettings().catch(()=>({}))
  // Dispatch to selected template if configured
  try {
    if ((s?.reportTemplate || 'classic') === 'modern'){
      const mod = await import('./labReport/templates/modern')
      return mod.previewLabReportPdfModern(input)
    }
    if ((s?.reportTemplate || 'classic') === 'tealGradient'){
      const mod = await import('./labReport/templates/tealHeader')
      return mod.previewLabReportPdfGradient(input)
    }
  } catch {}
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
  let y = 40

  if (logo) {
    try {
      const normalized = await ensurePngDataUrl(logo)
      doc.addImage(normalized, 'PNG' as any, 40, y - 32, 70, 70, undefined, 'FAST')
    } catch {}
  }
  doc.setFontSize(16)
  doc.text(String(labName), 297.5, y, { align: 'center' }); y += 16
  doc.setFontSize(10)
  doc.text(String(address), 297.5, y, { align: 'center' }); y += 12
  doc.text(`Ph: ${phone || ''}${email? ' • '+email : ''}`, 297.5, y, { align: 'center' }); y += 16
  doc.setDrawColor(15); doc.line(40, y, 555, y); y += 10
  doc.setFontSize(11)
  doc.text(String(department), 297.5, y, { align: 'center' }); y += 16

  // Key values
  doc.setFontSize(10)
  const L = 40, R = 300
  const dt = (iso?: string)=> fmtDateTime(iso)
  const drawKV = (label: string, value: string, x: number, yy: number) => {
    doc.setFont('helvetica','bold');
    doc.text(label, x, yy)
    const w = doc.getTextWidth(label + ' ')
    doc.setFont('helvetica','normal');
    doc.text(value, x + w, yy)
  }
  drawKV('Medical Record No :', String(input.patient.mrn || '-'), L, y)
  drawKV('Sample No / Lab No :', String(input.tokenNo), R, y); y += 14
  drawKV('Patient Name :', String(input.patient.fullName), L, y)
  drawKV('Age / Gender :', `${input.patient.age || ''} / ${input.patient.gender || ''}`, R, y); y += 14
  drawKV('Reg. & Sample Time :', String(dt(input.createdAt)), L, y)
  drawKV('Reporting Time :', String(input.reportingTime || '-'), R, y); y += 14
  drawKV('Contact No :', String(input.patient.phone || '-'), L, y)
  drawKV('Referring Consultant :', String(input.referringConsultant || '-'), R, y); y += 14
  drawKV('Address :', String(input.patient.address || '-'), L, y); y += 8

  const hasPrev = (input.rows||[]).some(r => (r.prevValue || '').trim().length > 0)
  const hasFlag = (input.rows||[]).some(r => (r.flag || '').length > 0)
  const hasComment = (input.rows||[]).some(r => (r.comment || '').trim().length > 0)
  const head = [
    ['Test','Normal Value','Unit', ...(hasPrev? ['Previous'] : []), 'Result', ...(hasFlag? ['Flag'] : []), ...(hasComment? ['Comment'] : [])]
  ]
  const body = (input.rows||[]).map(r => [
    r.test||'', r.normal||'', r.unit||'', ...(hasPrev? [r.prevValue||''] : []), r.value||'', ...(hasFlag? [r.flag||''] : []), ...(hasComment? [r.comment||''] : [])
  ])

  const drawFooter = () => {
    const pageHeight = (doc.internal.pageSize as any).getHeight ? (doc.internal.pageSize as any).getHeight() : (doc.internal.pageSize as any).height
    let baseY = pageHeight - 90
    doc.setFontSize(10)
    doc.text('System Generated Report, No Signature Required. Approved By Consultant. Not Valid For Any Court Of Law.', 297.5, baseY, { align: 'center' })
    doc.setDrawColor(51,65,85); doc.line(40, baseY + 8, 555, baseY + 8)
    if (consultantsList.length){
      const cols = consultantsList.length
      const colW = (555 - 40) / cols
      consultantsList.forEach((c, i) => {
        const x = 40 + i * colW + 4
        let yy = baseY + 26
        doc.setFontSize(11)
        if ((c.name||'').trim()) { doc.text(String(c.name), x, yy); yy += 12 }
        doc.setFontSize(10)
        if ((c.degrees||'').trim()) { doc.text(String(c.degrees), x, yy); yy += 12 }
        if ((c.title||'').trim()) { doc.setFont('helvetica', 'bold'); doc.text(String(c.title), x, yy); doc.setFont('helvetica', 'normal'); }
      })
    }
  }

  const columnStyles: Record<number, any> = {}
  const idxPrev = hasPrev ? 3 : -1
  const idxFlag = hasFlag ? (hasPrev ? 5 : 4) : -1
  if (idxPrev >= 0) columnStyles[idxPrev] = { fontStyle: 'bold' }
  if (idxFlag >= 0) columnStyles[idxFlag] = { fontStyle: 'bold' }

  autoTable(doc, {
    startY: y + 12,
    head,
    body,
    styles: { fontSize: 9, cellPadding: 4, lineWidth: 0.5 },
    headStyles: { fillColor: [248,250,252], textColor: [15,23,42], halign: 'left', fontStyle: 'bold' },
    tableLineColor: [15,23,42],
    tableLineWidth: 0.5,
    theme: 'grid',
    columnStyles,
    didParseCell: (hookData: any) => {
      if (hookData.section === 'body' && (hookData.column.index === idxPrev || hookData.column.index === idxFlag)) {
        hookData.cell.styles.fontStyle = 'bold'
      }
    },
    margin: { bottom: 120 },
  })

  const hasInterpretation2 = (input.interpretation || '').trim().length > 0
  if (hasInterpretation2) {
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

  const pageCount2 = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount2; i++) { (doc as any).setPage(i); drawFooter() }

  // Prefer Electron in-app preview when available
  try{
    const api = (window as any).electronAPI
    if (api && typeof api.printPreviewPdf === 'function'){
      const dataUrl = doc.output('datauristring') as string // data:application/pdf;base64,...
      await api.printPreviewPdf(dataUrl)
      return
    }
  }catch{}

  // Browser fallback: open print dialog using hidden iframe
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
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch {}
    // Cleanup a bit later to allow print dialog to initialize
    setTimeout(()=>{ try { URL.revokeObjectURL(url); iframe.remove() } catch {} }, 10000)
  }
  iframe.src = url
  document.body.appendChild(iframe)
}

function esc(s: string){
  return (s||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;')
}

function fmtDateTime(iso?: string){
  if (!iso) return '-'
  // Handle time-only strings like '14:25'
  if (/^\d{1,2}:\d{2}$/.test(String(iso))) return String(iso)
  try { const d = new Date(iso); if (isNaN(d.getTime())) return String(iso); return d.toLocaleDateString()+', '+d.toLocaleTimeString() } catch { return String(iso) }
}

// Ensure the logo is a PNG data URL (jsPDF reliably supports PNG/JPEG; SVG/WEBP may fail)
async function ensurePngDataUrl(src: string): Promise<string> {
  try {
    if (/^data:image\/png/i.test(src)) return src
    // Draw into canvas and re-encode as PNG
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

export async function printLabReport(input: {
  tokenNo: string
  createdAt: string
  sampleTime?: string
  reportingTime?: string
  patient: { fullName: string; phone?: string; mrn?: string; age?: string; gender?: string; address?: string }
  rows: ReportRow[]
  interpretation?: string
  printedBy?: string
  referringConsultant?: string
}){
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

  const hasComment = (input.rows||[]).some(r => (r.comment || '').trim().length > 0)
  const hasPrev = (input.rows||[]).some(r => (r.prevValue || '').trim().length > 0)
  const hasFlag = (input.rows||[]).some(r => (r.flag || '').length > 0)
  const hasInterpretation = (input.interpretation || '').trim().length > 0
  const rowsHtml = (input.rows||[]).map(r => `
    <tr>
      <td style="padding:8px;background:#f8fafc;border-bottom:1px solid #e2e8f0">${esc(r.test||'')}</td>
      <td style="padding:8px;background:#f8fafc;border-bottom:1px solid #e2e8f0">${esc(r.normal||'')}</td>
      <td style="padding:8px;background:#f8fafc;border-bottom:1px solid #e2e8f0">${esc(r.unit||'')}</td>
      ${hasPrev ? `<td style=\"padding:8px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:700\">${esc(r.prevValue||'')}</td>` : ''}
      <td style="padding:8px;background:#f8fafc;border-bottom:1px solid #e2e8f0">${esc(r.value||'')}</td>
      ${hasFlag ? `<td style=\"padding:8px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:700\">${esc(r.flag||'')}</td>` : ''}
      ${hasComment ? `<td style=\"padding:8px;background:#f8fafc;border-bottom:1px solid #e2e8f0\">${esc(r.comment||'')}</td>` : ''}
    </tr>
  `).join('')

  const overlayId = 'lab-report-overlay'
  const old = document.getElementById(overlayId); if (old) old.remove()
  const overlay = document.createElement('div')
  overlay.id = overlayId
  overlay.style.position = 'fixed'
  overlay.style.inset = '0'
  overlay.style.background = 'rgba(15,23,42,0.5)'
  overlay.style.zIndex = '9999'
  overlay.style.display = 'flex'
  overlay.style.alignItems = 'center'
  overlay.style.justifyContent = 'center'
  overlay.style.padding = '16px'

  const html = `
  <style>
    .card{width:794px;max-width:100%;background:#fff;border-radius:12px;box-shadow:0 10px 25px rgba(2,6,23,0.2);overflow:hidden}
    .toolbar{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #e2e8f0;background:#f8fafc}
    .toolbar-title{font-weight:700;color:#0f172a}
    .btn{border:1px solid #cbd5e1;border-radius:8px;padding:6px 10px;font-size:12px;color:#334155;background:#fff}
    .wrap{padding:16px 20px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#0f172a}
    .hdr{display:grid;grid-template-columns:96px 1fr 96px;align-items:center}
    .hdr .title{font-size:28px;font-weight:800;text-align:center}
    .hdr .muted{color:#64748b;font-size:12px;text-align:center}
    .dept{font-style:italic;text-align:center;margin:8px 0 4px 0}
    .hr{border-bottom:2px solid #0f172a;margin:6px 0}
    .box{border:1px solid #e2e8f0;border-radius:10px;padding:6px;margin:8px 0}
    .kv{display:grid;grid-template-columns: 130px minmax(0,1fr) 130px minmax(0,1fr) 130px minmax(0,1fr);gap:4px 10px;font-size:12px;align-items:start}
    .kv > div{line-height:1.2}
    .kv > div:nth-child(2n){word-break:break-word}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th{padding:10px;background:#fff;border-bottom:2px solid #0f172a;text-align:left}
    td{padding:8px}
    .interp{margin-top:12px;font-size:14px}
    .footnote{margin-top:24px;text-align:center;color:#475569}
    .foot-hr{border-bottom:1px solid #334155;margin:10px 0}
    .sign{display:flex;justify-content:space-between;align-items:flex-start}
    .sign .cols{display:grid;gap:12px}
    .sign .left{font-size:14px}
    .sign .name{font-weight:800}
    .sign .title{font-weight:700}
    /* prevent awkward page breaks */
    .box, table, .hdr, .dept, .hr, .sign, .interp { break-inside: avoid }
    @media print{
      @page { size: A4 portrait; margin: 12mm }
      body *{ visibility:hidden !important }
      #${overlayId}, #${overlayId} *{ visibility:visible !important }
      #${overlayId}{ position:static !important; background:transparent !important; padding:0 !important }
      .toolbar{ display:none !important }
      .card{ box-shadow:none !important; width:auto !important }
    }
  </style>
  <div class="card">
    <div class="toolbar">
      <div class="toolbar-title">Report Preview</div>
      <div>
        <button class="btn" id="lab-report-print">Print (Ctrl+P)</button>
        <button class="btn" id="lab-report-close" style="margin-left:8px">Close (Ctrl+D)</button>
      </div>
    </div>
    <div class="wrap">
      <div class="hdr">
        <div>${logo? `<img src="${esc(logo)}" alt="logo" style="height:70px;width:auto;object-fit:contain"/>` : ''}</div>
        <div>
          <div class="title">${esc(labName)}</div>
          <div class="muted">${esc(address)}</div>
          <div class="muted">Ph: ${esc(phone)} ${email? ' • '+esc(email): ''}</div>
        </div>
        <div></div>
      </div>
      <div class="dept">${esc(department || 'Department of Pathology')}</div>
      <div class="hr"></div>
      <div class="box">
        <div class="kv">
          <div>Medical Record No :</div><div>${esc(input.patient.mrn || '-')}</div>
          <div>Sample No / Lab No :</div><div>${esc(input.tokenNo)}</div>
          <div>Patient Name :</div><div>${esc(input.patient.fullName)}</div>
          <div>Age / Gender :</div><div>${esc(input.patient.age || '')} / ${esc(input.patient.gender || '')}</div>
          <div>Reg. & Sample Time :</div><div>${fmtDateTime(input.createdAt)}</div>
          <div>Reporting Time :</div><div>${fmtDateTime(input.reportingTime || new Date().toISOString())}</div>
          <div>Contact No :</div><div>${esc(input.patient.phone || '-')}</div>
          <div>Referring Consultant :</div><div>${esc(input.referringConsultant || '-')}</div>
          <div>Address :</div><div>${esc(input.patient.address || '-')}</div>
        </div>
      </div>
      <table>
        <thead><tr><th>Test</th><th>Normal Value</th><th>Unit</th>${hasPrev?'<th>Previous</th>':''}<th>Result</th>${hasFlag?'<th>Flag</th>':''}${hasComment?'<th>Comment</th>':''}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      ${hasInterpretation ? `<div class=\"interp\"><strong>Clinical Interpretation:</strong><br/>${esc(input.interpretation || '')}</div>` : ''}
      <div class="footnote">System Generated Report, No Signature Required. Approved By Consultant. Not Valid For Any Court Of Law.</div>
      <div class="foot-hr"></div>
      <div class="sign">
        <div class="cols" style="grid-template-columns: repeat(${consultantsList.length || 1}, 1fr)">
          ${consultantsList.map(c=>`
            <div class="left">
              ${c.name? `<div class="name">${esc(c.name)}</div>`:''}
              ${c.degrees? `<div>${esc(c.degrees)}</div>`:''}
              ${c.title? `<div class="title">${esc(c.title)}</div>`:''}
            </div>
          `).join('')}
        </div>
        <div class="right" style="font-size:12px;color:#334155;margin-left:12px">${input.printedBy? 'User: '+esc(input.printedBy) : ''}</div>
      </div>
    </div>
  </div>`

  overlay.innerHTML = html
  document.body.appendChild(overlay)
  const onClose = ()=> { try { document.removeEventListener('keydown', onKey); overlay.remove() } catch {} }
  const onPrint = ()=> {
    try{
      const api = (window as any).electronAPI
      if (api && typeof api.printPreviewCurrent === 'function') { api.printPreviewCurrent({}); return }
    }catch{}
    try { window.print() } catch {}
  }
  const onKey = (e: KeyboardEvent)=> {
    if ((e.ctrlKey||e.metaKey) && (e.key==='d' || e.key==='D')) { e.preventDefault(); onClose() }
    if ((e.ctrlKey||e.metaKey) && (e.key==='p' || e.key==='P')) { /* allow print */ }
    if (e.key === 'Escape') onClose()
  }
  document.getElementById('lab-report-close')?.addEventListener('click', onClose)
  document.getElementById('lab-report-print')?.addEventListener('click', onPrint)
  document.addEventListener('keydown', onKey)
}
