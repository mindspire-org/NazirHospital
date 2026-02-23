import { labApi } from '../../api'

export type LabReportRow = { test: string; normal?: string; unit?: string; value?: string; prevValue?: string; flag?: 'normal'|'abnormal'|'critical'; comment?: string }

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

const POPPINS_REGULAR_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf'
const POPPINS_BOLD_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-SemiBold.ttf'

let poppinsRegularB64: string | null = null
let poppinsBoldB64: string | null = null

function fmtDateTime(iso?: string){
  if (!iso) return '-'
  if (/^\d{1,2}:\d{2}$/.test(String(iso))) return String(iso)
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return String(iso)
    return d.toLocaleDateString() + ', ' + d.toLocaleTimeString()
  } catch { return String(iso) }
}

async function fetchBase64(url: string): Promise<string> {
  const resp = await fetch(url)
  const buf = await resp.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

async function ensurePoppins(doc: any){
  try {
    if (!poppinsRegularB64) poppinsRegularB64 = await fetchBase64(POPPINS_REGULAR_URL)
    if (!poppinsBoldB64) poppinsBoldB64 = await fetchBase64(POPPINS_BOLD_URL)
  } catch {
    return
  }
  try {
    doc.addFileToVFS('Poppins-Regular.ttf', poppinsRegularB64)
    doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal')
    doc.addFileToVFS('Poppins-SemiBold.ttf', poppinsBoldB64)
    doc.addFont('Poppins-SemiBold.ttf', 'Poppins', 'bold')
  } catch {}
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
          resolve(canvas.toDataURL('image/png') || src)
        } catch { resolve(src) }
      }
      img.onerror = () => resolve(src)
      img.src = src
    })
  } catch { return src }
}

async function make3DIllustrationPng(w = 520, h = 180): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(8, Math.round(w))
  canvas.height = Math.max(8, Math.round(h))
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const drawSphere = (x: number, y: number, r: number, c1: string, c2: string, alpha = 1) => {
    ctx.save()
    ctx.globalAlpha = alpha
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r)
    g.addColorStop(0, c1)
    g.addColorStop(1, c2)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = alpha * 0.18
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.ellipse(x + r * 0.15, y + r * 0.55, r * 0.9, r * 0.35, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = alpha
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.ellipse(x - r * 0.25, y - r * 0.25, r * 0.35, r * 0.2, -0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  drawSphere(canvas.width * 0.72, canvas.height * 0.55, canvas.height * 0.26, 'rgba(56,189,248,0.95)', 'rgba(14,116,144,0.95)', 0.22)
  drawSphere(canvas.width * 0.84, canvas.height * 0.38, canvas.height * 0.18, 'rgba(34,211,238,0.85)', 'rgba(30,64,175,0.85)', 0.18)
  drawSphere(canvas.width * 0.62, canvas.height * 0.38, canvas.height * 0.16, 'rgba(99,102,241,0.75)', 'rgba(15,23,42,0.75)', 0.14)

  ctx.globalAlpha = 0.1
  ctx.strokeStyle = '#0ea5e9'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(canvas.width * 0.52, canvas.height * 0.68)
  ctx.bezierCurveTo(canvas.width * 0.62, canvas.height * 0.52, canvas.width * 0.72, canvas.height * 0.76, canvas.width * 0.9, canvas.height * 0.6)
  ctx.stroke()

  return canvas.toDataURL('image/png')
}

function pickColumns(rows: LabReportRow[]) {
  const hasPrev = (rows||[]).some(r => (r.prevValue || '').trim().length > 0)
  const hasFlag = (rows||[]).some(r => (r.flag || '').length > 0)
  const hasComment = (rows||[]).some(r => (r.comment || '').trim().length > 0)
  const head = [
    ['Test','Reference Range','Unit', ...(hasPrev? ['Previous'] : []), 'Result', ...(hasFlag? ['Flag'] : []), ...(hasComment? ['Comment'] : [])]
  ]
  const body = (rows||[]).map(r => [
    r.test||'', r.normal||'', r.unit||'', ...(hasPrev? [r.prevValue||''] : []), r.value||'', ...(hasFlag? [r.flag||''] : []), ...(hasComment? [r.comment||''] : [])
  ])
  const idxPrev = hasPrev ? 3 : -1
  const idxFlag = hasFlag ? (hasPrev ? 5 : 4) : -1
  const idxResult = hasPrev ? 4 : 3
  return { head, body, idxPrev, idxFlag, idxResult }
}

async function buildModernDoc(input: LabReportInput){
  const s: any = await labApi.getSettings().catch(()=>({}))
  const labName = s?.labName || 'Laboratory'
  const address = s?.address || '-'
  const phone = s?.phone || ''
  const email = s?.email || ''
  const department = s?.department || 'Department of Pathology'
  const logo = s?.logoDataUrl || ''
  const reportFooter = s?.reportFooter || ''
  const primaryConsultant = { name: s?.consultantName || '', degrees: s?.consultantDegrees || '', title: s?.consultantTitle || '' }
  const extraConsultants: Array<{ name?: string; degrees?: string; title?: string }> = Array.isArray(s?.consultants) ? s.consultants : []
  const consultantsList = [primaryConsultant, ...extraConsultants]
    .filter(c => (c?.name||'').trim() || (c?.degrees||'').trim() || (c?.title||'').trim())
    .slice(0,3)

  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default as any
  const doc = new jsPDF('p','pt','a4')
  await ensurePoppins(doc)

  const usePoppins = (() => {
    try {
      const list = doc.getFontList ? doc.getFontList() : null
      return !!(list && (list as any).Poppins)
    } catch { return false }
  })()

  const fontName = usePoppins ? 'Poppins' : 'helvetica'
  doc.setFont(fontName, 'normal')

  const pageW = 595
  const pageH = 842
  const marginX = 36

  const bandH = 102
  try {
    const ill = await make3DIllustrationPng(520, 180)
    doc.addImage(ill, 'PNG' as any, marginX, 18, pageW - marginX*2, 62, undefined, 'FAST')
  } catch {}

  doc.setFillColor(7, 89, 133)
  doc.roundedRect(marginX, 18, pageW - marginX*2, bandH, 16, 16, 'F')

  doc.setFillColor(255,255,255)
  doc.roundedRect(marginX + 14, 32, 70, 70, 14, 14, 'F')
  if (logo) {
    try {
      const normalized = await ensurePngDataUrl(logo)
      doc.addImage(normalized, 'PNG' as any, marginX + 18, 36, 62, 62, undefined, 'FAST')
    } catch {}
  }

  doc.setTextColor(255,255,255)
  doc.setFont(fontName, 'bold')
  doc.setFontSize(18)
  doc.text(String(labName).toUpperCase(), marginX + 98, 58)
  doc.setFont(fontName, 'normal')
  doc.setFontSize(10)
  doc.setTextColor(226,232,240)
  doc.text(String(department), marginX + 98, 74)
  doc.setTextColor(241,245,249)
  doc.setFontSize(9)
  const contact = [address, phone?`Ph: ${phone}`:'', email?`Email: ${email}`:''].filter(Boolean).join('  •  ')
  doc.text(contact, marginX + 98, 90)

  doc.setTextColor(255,255,255)
  doc.setFont(fontName, 'bold')
  doc.setFontSize(12)
  doc.text('LABORATORY REPORT', pageW - marginX - 14, 56, { align: 'right' })
  doc.setFont(fontName, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(226,232,240)
  doc.text(`Sample No: ${String(input.tokenNo || '-')}`, pageW - marginX - 14, 74, { align: 'right' })
  if ((input.profileLabel||'').trim()) {
    doc.text(String(input.profileLabel).trim(), pageW - marginX - 14, 90, { align: 'right' })
  }

  const cardY = 18 + bandH + 14
  doc.setDrawColor(226,232,240)
  doc.setFillColor(255,255,255)
  doc.roundedRect(marginX, cardY, pageW - marginX*2, 108, 12, 12, 'FD')

  const labelColor = [71,85,105]
  const valueColor = [15,23,42]

  const drawKV = (label: string, value: string, x: number, y: number) => {
    doc.setFont(fontName, 'bold')
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2])
    doc.setFontSize(9)
    doc.text(label, x, y)
    doc.setFont(fontName, 'normal')
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2])
    doc.setFontSize(10)
    doc.text(value, x, y + 14)
  }

  const col1 = marginX + 14
  const col2 = marginX + (pageW - marginX*2) / 3 + 6
  const col3 = marginX + (pageW - marginX*2) * 2 / 3 + 0

  drawKV('Patient Name', String(input.patient.fullName || '-'), col1, cardY + 22)
  drawKV('MR No', String(input.patient.mrn || '-'), col2, cardY + 22)
  drawKV('Age / Gender', `${String(input.patient.age || '-')} / ${String(input.patient.gender || '-')}`, col3, cardY + 22)

  drawKV('Reg. & Sample Time', String(fmtDateTime(input.createdAt)), col1, cardY + 64)
  drawKV('Reporting Time', String(fmtDateTime(input.reportingTime || '-')), col2, cardY + 64)
  drawKV('Referring Consultant', String(input.referringConsultant || '-'), col3, cardY + 64)

  doc.setFont(fontName, 'bold')
  doc.setTextColor(labelColor[0], labelColor[1], labelColor[2])
  doc.setFontSize(9)
  doc.text('Address / Contact', col1, cardY + 104)
  doc.setFont(fontName, 'normal')
  doc.setTextColor(valueColor[0], valueColor[1], valueColor[2])
  doc.setFontSize(10)
  doc.text(`${String(input.patient.address || '-')}${input.patient.phone ? `  •  ${String(input.patient.phone)}` : ''}`, col1, cardY + 118)

  const yStart = cardY + 128

  const { head, body, idxPrev, idxFlag, idxResult } = pickColumns(input.rows)
  autoTable(doc, {
    startY: yStart,
    head,
    body,
    theme: 'grid',
    styles: { font: fontName, fontSize: 9, cellPadding: 5, lineWidth: 0.3, lineColor: [203,213,225] },
    headStyles: { fillColor: [7, 89, 133], textColor: [255,255,255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248,250,252] },
    margin: { left: marginX, right: marginX, bottom: 120 },
    didParseCell: (hookData: any) => {
      if (hookData.section !== 'body') return
      if (hookData.column.index === idxPrev || hookData.column.index === idxFlag) {
        hookData.cell.styles.fontStyle = 'bold'
      }
      if (hookData.column.index === idxFlag) {
        const v = String(hookData.cell.raw || '').toLowerCase()
        if (v.includes('critical')) hookData.cell.styles.textColor = [190,18,60]
        else if (v.includes('abnormal')) hookData.cell.styles.textColor = [180,83,9]
        else if (v.includes('normal')) hookData.cell.styles.textColor = [21,128,61]
      }
      if (hookData.column.index === idxResult) {
        const row = input.rows?.[hookData.row.index]
        const f = String(row?.flag || '')
        if (f === 'critical') hookData.cell.styles.textColor = [190,18,60]
        else if (f === 'abnormal') hookData.cell.styles.textColor = [180,83,9]
        else if (f === 'normal') hookData.cell.styles.textColor = [21,128,61]
      }
    },
  })

  const lastY = (((doc as any).lastAutoTable?.finalY) || yStart) + 14
  if ((input.interpretation || '').trim()) {
    autoTable(doc, {
      startY: lastY,
      body: [
        [{ content: 'Clinical Interpretation', styles: { fontStyle: 'bold', textColor: [15,23,42] } }],
        [{ content: String(input.interpretation || '') }],
      ],
      theme: 'plain',
      styles: { font: fontName, fontSize: 10, cellPadding: 0, textColor: [15,23,42] },
      margin: { left: marginX, right: marginX, bottom: 120 },
    })
  }

  const pages = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    ;(doc as any).setPage(i)
    const baseY = pageH - 78
    doc.setDrawColor(226,232,240)
    doc.line(marginX, baseY - 10, pageW - marginX, baseY - 10)
    doc.setFont(fontName, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(71,85,105)
    doc.text('System generated report. Verified by laboratory consultant. Not valid for any court of law.', pageW/2, baseY, { align: 'center' })
    if (String(reportFooter || '').trim()) {
      doc.text(String(reportFooter), pageW/2, baseY + 12, { align: 'center' })
    }

    if (consultantsList.length) {
      const cols = consultantsList.length
      const colW = (pageW - marginX*2) / cols
      consultantsList.forEach((c, idx) => {
        const x = marginX + idx * colW + 2
        let y = baseY + 32
        doc.setFont(fontName, 'bold'); doc.setFontSize(10); doc.setTextColor(15,23,42)
        if ((c.name||'').trim()) { doc.text(String(c.name), x, y); y += 12 }
        doc.setFont(fontName, 'normal'); doc.setFontSize(9); doc.setTextColor(71,85,105)
        if ((c.degrees||'').trim()) { doc.text(String(c.degrees), x, y); y += 10 }
        doc.setFont(fontName, 'bold'); doc.setFontSize(9); doc.setTextColor(15,23,42)
        if ((c.title||'').trim()) { doc.text(String(c.title), x, y) }
      })
    }

    if ((input.printedBy || '').trim()) {
      doc.setFont(fontName, 'normal')
      doc.setFontSize(9)
      doc.setTextColor(71,85,105)
      doc.text(`Printed by: ${String(input.printedBy)}`, pageW - marginX, baseY + 32, { align: 'right' })
    }

    doc.setFont(fontName, 'normal')
    doc.setFontSize(9)
    doc.setTextColor(71,85,105)
    doc.text(`Page ${i} / ${pages}`, pageW - marginX, pageH - 18, { align: 'right' })
  }

  return doc
}

export async function previewLabReportPdfModern(input: LabReportInput){
  const doc = await buildModernDoc(input)
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

export async function downloadLabReportPdfModern(input: LabReportInput){
  const doc = await buildModernDoc(input)
  const fileName = `lab-report-${(input.patient.mrn || '').replace(/\s+/g,'') || input.tokenNo}.pdf`
  doc.save(fileName)
}
