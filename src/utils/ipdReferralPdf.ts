import jsPDF from 'jspdf'

export type IpdReferralPdfData = {
  settings?: { name?: string; address?: string; phone?: string; logoDataUrl?: string }
  patient?: { name?: string; mrn?: string; gender?: string; fatherName?: string; age?: string; phone?: string; address?: string; cnic?: string }
  referral?: {
    date?: string
    time?: string
    reason?: string
    provisionalDiagnosis?: string
    vitals?: { bp?: string; pulse?: string; temperature?: string; rr?: string }
    referredTo?: { department?: string; doctor?: string }
    condition?: { stability?: string; consciousness?: string }
    remarks?: string
    signStamp?: string
    referredBy?: string
  }
}

async function rasterizeLogo(logo?: string): Promise<string | undefined> {
  if (!logo) return undefined
  try {
    let src = logo
    if (!src.startsWith('data:')) {
      try {
        const u = src.startsWith('http') ? src : `${location.origin}${src.startsWith('/') ? '' : '/'}${src}`
        const resp = await fetch(u)
        const blob = await resp.blob()
        src = await new Promise<string>(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result||'')); fr.readAsDataURL(blob) })
      } catch {}
    }
    return await new Promise<string>((resolve) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const S = 96
          canvas.width = S; canvas.height = S
          const ctx = canvas.getContext('2d')
          if (ctx) { ctx.clearRect(0,0,S,S); ctx.drawImage(img, 0, 0, S, S) }
          resolve(canvas.toDataURL('image/jpeg', 0.7))
        } catch { resolve(src) }
      }
      img.onerror = () => resolve(src)
      img.src = src
    })
  } catch { return undefined }
}

export async function buildIpdReferralPdf(data: IpdReferralPdfData){
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const pageWidth = pdf.internal.pageSize.getWidth()
  let y = 14

  // Header (logo left, hospital info centered)
  const logo = await rasterizeLogo(data.settings?.logoDataUrl)
  if (logo) { try { pdf.addImage(logo, 'JPEG', 14, 8, 18, 18) } catch {} }
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15)
  pdf.text(String(data.settings?.name || 'Hospital'), pageWidth/2, 14, { align: 'center' })
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
  if (data.settings?.address) pdf.text(String(data.settings.address), pageWidth/2, 19, { align: 'center' })
  if (data.settings?.phone) pdf.text(`Mobile #: ${data.settings.phone}`, pageWidth/2, 24, { align: 'center' })
  y = 30
  pdf.setLineWidth(0.2)
  pdf.setDrawColor(60); pdf.line(14, y, pageWidth-14, y); y += 6

  // Title
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13)
  pdf.text('Refer to IPD', 14, y)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10)
  if (data.referral?.referredBy) pdf.text(`Referred by: ${data.referral.referredBy}`, pageWidth-14, y, { align: 'right' })
  y += 6

  // Patient block
  const addKV = (k: string, v: any, x: number) => {
    const txt = v!=null && String(v).trim() ? String(v) : '-'
    pdf.setFont('helvetica','bold'); pdf.text(k, x, y)
    pdf.setFont('helvetica','normal'); pdf.text(txt, x + 28, y)
  }
  pdf.setFont('helvetica','bold'); pdf.setFontSize(10); pdf.text('Patient', 14, y); y += 4
  const patientBoxTop = y - 3
  addKV('Name:', data.patient?.name, 18)
  addKV('MRN:', data.patient?.mrn, pageWidth/2)
  y += 6
  addKV('Age:', data.patient?.age, 18)
  addKV('Gender:', data.patient?.gender, pageWidth/2)
  y += 6
  addKV('Father/Husband:', data.patient?.fatherName, 18)
  addKV('CNIC:', data.patient?.cnic, pageWidth/2)
  y += 6
  addKV('Phone:', data.patient?.phone, 18)
  y += 6
  pdf.setFont('helvetica','bold'); pdf.text('Address:', 18, y)
  pdf.setFont('helvetica','normal')
  const addrLines = pdf.splitTextToSize(String(data.patient?.address || '-'), pageWidth - 60)
  pdf.text(addrLines, 18 + 28, y)
  y += Math.max(6, addrLines.length * 5) + 6
  // Draw patient box after measuring content to ensure the border encloses all lines
  pdf.setDrawColor(180); pdf.rect(14, patientBoxTop, pageWidth - 28, (y - patientBoxTop))
  y += 6 // gap after patient box

  // Referral details
  pdf.setFont('helvetica','bold'); pdf.text('Referral Details', 14, y); y += 6
  const refBoxTop = y - 3
  addKV('Date:', data.referral?.date, 18)
  addKV('Time:', data.referral?.time, pageWidth/2)
  y += 6
  pdf.setFont('helvetica','bold'); pdf.text('Reason of Referral:', 18, y)
  pdf.setFont('helvetica','normal')
  const reasonLines = pdf.splitTextToSize(String(data.referral?.reason || '-'), pageWidth - 60)
  pdf.text(reasonLines, 18 + 40, y)
  y += Math.max(6, reasonLines.length * 5)
  pdf.setFont('helvetica','bold'); pdf.text('Provisional Diagnosis:', 18, y + 6)
  pdf.setFont('helvetica','normal')
  const diagLines = pdf.splitTextToSize(String(data.referral?.provisionalDiagnosis || '-'), pageWidth - 60)
  pdf.text(diagLines, 18 + 48, y + 6)
  y += Math.max(12, diagLines.length * 5 + 8)
  pdf.setDrawColor(180); pdf.rect(14, refBoxTop, pageWidth - 28, (y - refBoxTop))

  // Vitals & Referred To / Condition (two columns)
  const colW = (pageWidth - 28 - 6) / 2
  const leftX = 14, rightX = 14 + colW + 6

  // Vitals
  pdf.setFont('helvetica','bold');
  pdf.setFillColor(248, 249, 251); pdf.rect(leftX, y-4, colW, 6, 'F')
  pdf.setTextColor(0,0,0); pdf.text('Vitals', leftX + 2, y)
  pdf.setDrawColor(180); pdf.rect(leftX, y+2, colW, 26)
  pdf.setFont('helvetica','normal');
  const v = data.referral?.vitals || {}
  pdf.text(`BP: ${v.bp || '-'}`, leftX + 4, y + 8)
  pdf.text(`Pulse: ${v.pulse || '-'}`, leftX + colW/2, y + 8)
  pdf.text(`Temp: ${v.temperature || '-'}`, leftX + 4, y + 16)
  pdf.text(`RR: ${v.rr || '-'}`, leftX + colW/2, y + 16)

  // Referred To & Condition
  pdf.setFont('helvetica','bold'); pdf.setFillColor(248, 249, 251); pdf.rect(rightX, y-4, colW, 6, 'F')
  pdf.setTextColor(0,0,0); pdf.text('Referred To', rightX + 2, y)
  pdf.setDrawColor(180); pdf.rect(rightX, y+2, colW, 26)
  pdf.setFont('helvetica','normal');
  pdf.text(`Department: ${data.referral?.referredTo?.department || '-'}`, rightX + 4, y + 8)
  pdf.text(`Doctor: ${data.referral?.referredTo?.doctor || '-'}`, rightX + 4, y + 16)
  y += 32

  pdf.setFont('helvetica','bold'); pdf.setFillColor(248, 249, 251); pdf.rect(leftX, y-4, colW, 6, 'F')
  pdf.setTextColor(0,0,0); pdf.text('Condition', leftX + 2, y)
  pdf.setDrawColor(180); pdf.rect(leftX, y+2, colW, 18)
  pdf.setFont('helvetica','normal');
  pdf.text(`Stability: ${data.referral?.condition?.stability || '-'}`, leftX + 4, y + 8)
  pdf.text(`Consciousness: ${data.referral?.condition?.consciousness || '-'}`, leftX + 4, y + 14)

  // Remarks
  pdf.setFont('helvetica','bold'); pdf.setFillColor(248, 249, 251); pdf.rect(rightX, y-4, colW, 6, 'F')
  pdf.setTextColor(0,0,0); pdf.text('Remarks', rightX + 2, y)
  pdf.setDrawColor(180); pdf.rect(rightX, y+2, colW, 22)
  pdf.setFont('helvetica','normal');
  const rem = pdf.splitTextToSize(String(data.referral?.remarks || '-'), colW - 8)
  pdf.text(rem, rightX + 4, y + 8)
  y += 30

  // Sign & Stamp
  pdf.setFont('helvetica','bold'); pdf.setFillColor(248, 249, 251); pdf.rect(leftX, y-4, pageWidth-28, 6, 'F')
  pdf.setTextColor(0,0,0); pdf.text('Doctor Sign & Stamp', leftX + 2, y)
  pdf.setDrawColor(180); pdf.rect(leftX, y+2, pageWidth-28, 24)
  pdf.setFont('helvetica','normal')
  const signTxt = String(data.referral?.signStamp || '')
  if (signTxt) pdf.text(pdf.splitTextToSize(signTxt, pageWidth-36), leftX + 4, y + 10)

  return pdf
}

export async function previewIpdReferralPdf(data: IpdReferralPdfData){
  const pdf = await buildIpdReferralPdf(data)
  const blob = (pdf as any).output('blob') as Blob
  const url = URL.createObjectURL(blob)

  const overlay = document.createElement('div')
  overlay.style.position = 'fixed'
  overlay.style.inset = '0'
  overlay.style.zIndex = '9999'
  overlay.style.background = 'rgba(0,0,0,0.5)'
  overlay.className = 'no-print'

  const panel = document.createElement('div')
  panel.style.position = 'absolute'
  panel.style.left = '50%'
  panel.style.top = '50%'
  panel.style.transform = 'translate(-50%, -50%)'
  panel.style.width = 'min(1000px, 95vw)'
  panel.style.height = 'min(90vh, 900px)'
  panel.style.background = '#ffffff'
  panel.style.borderRadius = '12px'
  panel.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)'
  panel.style.display = 'flex'
  panel.style.flexDirection = 'column'

  const header = document.createElement('div')
  header.style.display = 'flex'
  header.style.alignItems = 'center'
  header.style.justifyContent = 'space-between'
  header.style.padding = '8px 12px'
  header.style.borderBottom = '1px solid #e5e7eb'
  const title = document.createElement('div')
  title.textContent = 'IPD Referral Preview'
  title.style.fontWeight = '600'
  title.style.color = '#0f172a'
  header.appendChild(title)
  const actions = document.createElement('div')
  actions.style.display = 'flex'
  actions.style.gap = '8px'
  const btnPrint = document.createElement('button')
  btnPrint.textContent = 'Print'
  btnPrint.style.padding = '6px 10px'
  btnPrint.style.borderRadius = '6px'
  btnPrint.style.background = '#1f2937'
  btnPrint.style.color = '#fff'
  btnPrint.style.border = '1px solid #1f2937'
  const btnClose = document.createElement('button')
  btnClose.textContent = 'Close'
  btnClose.style.padding = '6px 10px'
  btnClose.style.borderRadius = '6px'
  btnClose.style.border = '1px solid #cbd5e1'
  btnClose.style.background = '#fff'
  btnClose.style.color = '#0f172a'
  actions.appendChild(btnPrint)
  actions.appendChild(btnClose)
  header.appendChild(actions)

  const frame = document.createElement('iframe')
  frame.src = url
  frame.style.flex = '1'
  frame.style.width = '100%'
  frame.style.height = '100%'
  frame.style.border = '0'

  function cleanup(){
    try { URL.revokeObjectURL(url) } catch {}
    try { document.removeEventListener('keydown', onKey) } catch {}
    try { overlay.remove() } catch {}
  }
  function onKey(e: KeyboardEvent){
    if (e.key === 'Escape') { e.preventDefault(); cleanup() }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); cleanup() }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); try { frame.contentWindow?.focus(); frame.contentWindow?.print() } catch {} }
  }
  btnClose.onclick = () => cleanup()
  btnPrint.onclick = () => { try { frame.contentWindow?.focus(); frame.contentWindow?.print() } catch {} }
  document.addEventListener('keydown', onKey)

  panel.appendChild(header)
  panel.appendChild(frame)
  overlay.appendChild(panel)
  document.body.appendChild(overlay)
}
