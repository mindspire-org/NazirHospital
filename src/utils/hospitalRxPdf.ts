import type { PrescriptionPdfData } from './prescriptionPdf'

type RxPdfExtras = {
  tokenNo?: string
  investigations?: Array<{ label: string; checked?: boolean }>
}

export async function previewHospitalRxPdf(data: PrescriptionPdfData & RxPdfExtras){
  const { jsPDF } = await import('jspdf')

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  const blue = { r: 37, g: 99, b: 235 } // #2563eb
  const slate = { r: 15, g: 23, b: 42 }
  const softBlue = { r: 240, g: 249, b: 255 }
  const softRed = { r: 255, g: 241, b: 242 }
  const red = { r: 185, g: 28, b: 28 }

  const settings = data.settings || {}
  const patient = data.patient || {}
  const doctor = data.doctor || {}
  const dt = data.createdAt ? new Date(data.createdAt as any) : new Date()

  const marginX = 10
  let y = 10

  // Header
  // Draw logo ABOVE the hospital name to avoid overlap with centered text
  const logo = String((settings as any).logoDataUrl || '')
  if (logo) {
    try {
      const normalized = await ensurePngDataUrl(logo)
      pdf.addImage(normalized, 'PNG' as any, W / 2 - 5, y, 10, 10, undefined, 'FAST')
      y += 11
    } catch {}
  }

  pdf.setTextColor(blue.r, blue.g, blue.b)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text(String(settings.name || 'Hospital'), W / 2, y + 6, { align: 'center' })
  pdf.setFontSize(10)
  pdf.text('Medical Prescription', W / 2, y + 11, { align: 'center' })

  y += 18
  pdf.setDrawColor(blue.r, blue.g, blue.b)
  pdf.setLineWidth(0.6)
  pdf.line(marginX, y, W - marginX, y)
  y += 6

  // Patient + Meta two columns
  pdf.setTextColor(slate.r, slate.g, slate.b)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  const leftX = marginX
  const rightX = W / 2 + 4
  const rowH = 4.5
  const kv = (label: string, value: string, x: number, yy: number) => {
    pdf.setFont('helvetica', 'bold')
    pdf.text(label, x, yy)
    pdf.setFont('helvetica', 'normal')
    pdf.text(value || '-', x + 22, yy)
  }

  const startY = y
  kv('Patient Name:', String(patient.name || '-'), leftX, y); y += rowH
  kv('Age:', String(patient.age || '-'), leftX, y); y += rowH
  kv('Gender:', String(patient.gender || '-'), leftX, y); y += rowH
  kv('Phone:', String(patient.phone || '-'), leftX, y); y += rowH
  kv('Address:', String(patient.address || '-'), leftX, y); y += rowH

  let y2 = startY
  kv('MR Number:', String(patient.mrn || '-'), rightX, y2); y2 += rowH
  kv('Token #:', String((data as any).tokenNo || '-'), rightX, y2); y2 += rowH
  kv('Date:', String(dt.toLocaleDateString()), rightX, y2); y2 += rowH
  kv('Doctor:', String(doctor.name ? `Dr. ${doctor.name}` : '-'), rightX, y2); y2 += rowH
  kv('Department:', String((doctor as any).departmentName || '-'), rightX, y2); y2 += rowH

  y = Math.max(y, y2) + 6

  // Body layout
  const leftColW = 40
  const gap = 6
  const rightColX = marginX + leftColW + gap
  const rightColW = W - marginX - rightColX

  // Vitals box
  pdf.setDrawColor(blue.r, blue.g, blue.b)
  pdf.setLineWidth(0.4)
  roundedRect(pdf, marginX, y, leftColW, 24, 2)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(blue.r, blue.g, blue.b)
  pdf.text('VITAL SIGNS', marginX + 2, y + 5)
  pdf.setTextColor(slate.r, slate.g, slate.b)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  const v = (data as any).vitals || {}
  const vitY0 = y + 9
  pdf.text(`BP: ${fmtBp(v)}`, marginX + 2, vitY0)
  pdf.text(`Pulse: ${fmt(v.pulse)}`, marginX + 2, vitY0 + 4)
  pdf.text(`Temp: ${fmt(v.temperatureC)}`, marginX + 2, vitY0 + 8)
  pdf.text(`Wt: ${fmt(v.weightKg)}`, marginX + 2, vitY0 + 12)

  // Investigation box
  const invY = y + 28
  const invH = 54
  roundedRect(pdf, marginX, invY, leftColW, invH, 2)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(blue.r, blue.g, blue.b)
  pdf.text('INVESTIGATION', marginX + 2, invY + 5)
  pdf.setTextColor(slate.r, slate.g, slate.b)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  const list = (data as any).investigations as any[] | undefined
  const invList = Array.isArray(list) && list.length ? list : [
    { label: 'HB%' }, { label: 'CBC' }, { label: 'Blood Group' }, { label: 'Blood Sugar' },
    { label: 'Anti HCV' }, { label: 'HBsAg' }, { label: 'PT/APTT' }, { label: 'U/S T/F T/S' },
    { label: 'Urine' }, { label: 'Complete' },
  ]
  let iy = invY + 10
  for (const it of invList.slice(0, 10)) {
    drawCheckbox(pdf, marginX + 2, iy - 2.5, !!it.checked)
    pdf.text(String(it.label || ''), marginX + 7, iy)
    iy += 4.5
  }

  // Rx big box
  const rxY = y
  const rxH = 170
  pdf.setDrawColor(blue.r, blue.g, blue.b)
  pdf.setLineWidth(0.7)
  roundedRect(pdf, rightColX, rxY, rightColW, rxH, 3)
  pdf.setTextColor(blue.r, blue.g, blue.b)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.text('R', rightColX + 6, rxY + 12)

  // Rx text
  pdf.setFontSize(9)
  pdf.setTextColor(slate.r, slate.g, slate.b)
  pdf.setFont('helvetica', 'normal')
  const meds = (data.items || [])
    .map((m: any, i: number) => {
      const name = String(m?.name || '').trim()
      if (!name) return ''
      const parts = [m?.frequency, m?.dose, m?.duration, m?.instruction].filter((x: any) => String(x || '').trim())
      return `${i + 1}. ${name}${parts.length ? ' - ' + parts.join(' - ') : ''}`
    })
    .filter(Boolean)
    .join('\n')
  const rawRx = String(meds || '')
  const maxW = rightColW - 12
  const lines = (pdf as any).splitTextToSize(rawRx || ' ', maxW)
  pdf.text(lines, rightColX + 6, rxY + 20)

  // Signature
  const signY = rxY + rxH + 10
  pdf.setDrawColor(slate.r, slate.g, slate.b)
  pdf.setLineWidth(0.2)
  pdf.line(marginX, signY, marginX + 55, signY)
  pdf.setFontSize(8)
  pdf.text('Doctor Signature', marginX, signY + 4)
  pdf.setFont('helvetica', 'bold')
  pdf.text(String(doctor.name ? `Dr. ${doctor.name}` : ''), marginX, signY + 8)

  // Not valid bar
  const nvY = H - 28
  pdf.setFillColor(softRed.r, softRed.g, softRed.b)
  pdf.setDrawColor(254, 202, 202)
  pdf.roundedRect(marginX, nvY, W - 2 * marginX, 8, 1.5, 1.5, 'FD')
  pdf.setTextColor(red.r, red.g, red.b)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('⚠ NOT VALID FOR COURT ⚠', W / 2, nvY + 5.5, { align: 'center' })

  // Contact box
  const cbY = H - 18
  pdf.setFillColor(softBlue.r, softBlue.g, softBlue.b)
  pdf.setDrawColor(186, 230, 253)
  pdf.roundedRect(marginX, cbY, W - 2 * marginX, 12, 2.5, 2.5, 'FD')
  pdf.setTextColor(slate.r, slate.g, slate.b)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.text(`Phone: ${String(settings.phone || '+92-xxx-xxxxxx')}`, W / 2, cbY + 5, { align: 'center' })
  pdf.text(`Address: ${String(settings.address || 'Hospital Address, City, Country')}`, W / 2, cbY + 9.5, { align: 'center' })

  // Preview via Electron or browser
  try {
    const api = (window as any).electronAPI
    if (api && typeof api.printPreviewPdf === 'function') {
      const dataUrl = pdf.output('datauristring') as string
      await api.printPreviewPdf(dataUrl)
      return
    }
  } catch {}

  const blob = pdf.output('blob') as Blob
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

function fmt(v: any){
  const s = String(v ?? '').trim()
  return s ? s : '— —'
}

function fmtBp(v: any){
  const sys = v?.bloodPressureSys
  const dia = v?.bloodPressureDia
  if (sys != null && dia != null) return `${sys}/${dia}`
  return '— —'
}

function roundedRect(pdf: any, x: number, y: number, w: number, h: number, r: number){
  try { pdf.roundedRect(x, y, w, h, r, r) } catch { pdf.rect(x, y, w, h) }
}

function drawCheckbox(pdf: any, x: number, y: number, on: boolean){
  pdf.setDrawColor(148, 163, 184)
  pdf.setLineWidth(0.2)
  pdf.rect(x, y, 3, 3)
  if (on) {
    pdf.setFillColor(37, 99, 235)
    pdf.rect(x + 0.3, y + 0.3, 2.4, 2.4, 'F')
  }
}

async function ensurePngDataUrl(src: string): Promise<string> {
  try {
    if (/^data:image\/(png|jpeg|jpg)/i.test(src)) return src
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
