import { labApi } from './api'

export type LabSlipOrderInput = {
  tokenNo: string
  createdAt?: string
  patient: { fullName: string; mrn?: string; phone?: string; age?: string; gender?: string }
  tests: Array<{ name: string; price: number }>
  subtotal: number
  discount: number
  net: number
  printedBy?: string
  fbr?: { status?: string; qrCode?: string; fbrInvoiceNo?: string; mode?: string; error?: string }
}

function esc(s: string){
  return (s||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;')
}

export async function printLabTokenSlip(order: LabSlipOrderInput){
  const settings = await labApi.getSettings().catch(()=>({})) as any
  if ((settings?.slipTemplate || 'thermal') === 'a4Bill'){
    await printLabTokenSlipA4(order, settings)
    return
  }
  const labName = settings?.labName || 'Laboratory'
  const address = settings?.address || ''
  const phone = settings?.phone || ''
  const email = settings?.email || ''
  const footer = settings?.reportFooter || 'Powered by Hospital MIS'
  const logo = settings?.logoDataUrl || ''
  const nowIso = order.createdAt || new Date().toISOString()
  const dt = new Date(nowIso)
  const dateStr = dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString()

  const fbrStatus = String(order?.fbr?.status || '').toUpperCase().trim()
  const isFbrSuccess = fbrStatus === 'SUCCESS' && Boolean(order?.fbr?.qrCode)
  const isFbrDisabled = !order?.fbr || !fbrStatus
  const fbrHtml = isFbrDisabled ? '' : `
    <div class="section-title">FBR</div>
    <div style="text-align:center;margin-top:6px">
      ${isFbrSuccess && order?.fbr?.qrCode ? `<img src="${esc(order.fbr.qrCode)}" alt="FBR QR" style="height:96px;width:96px;object-fit:contain"/>` : `<div style="font-weight:700;color:#e11d48">FBR FAILED</div>`}
    </div>
    <div style="margin-top:6px;font-size:11px;color:#334155">
      <div>FBR No: ${esc(order?.fbr?.fbrInvoiceNo || '—')}</div>
      <div>Mode: ${esc(order?.fbr?.mode || '—')}</div>
      <div>Error: ${esc(order?.fbr?.error || '—')}</div>
    </div>
  `

  const rowsHtml = order.tests.map((t, i)=> `<tr>
    <td style="padding:6px 8px;border-bottom:1px dashed #cbd5e1">${i+1}</td>
    <td style="padding:6px 8px;border-bottom:1px dashed #cbd5e1">${esc(t.name)}</td>
    <td style="padding:6px 8px;border-bottom:1px dashed #cbd5e1;text-align:right">${t.price.toFixed(2)}</td>
  </tr>`).join('')
  // Build overlay modal inside the app
  const overlayId = 'lab-slip-overlay'
  const old = document.getElementById(overlayId)
  if (old) old.remove()
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
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
    .slip-card{width:384px;max-width:100%;background:#fff;border-radius:12px;box-shadow:0 10px 25px rgba(2,6,23,0.2);overflow:hidden}
    .toolbar{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #e2e8f0;background:#f8fafc}
    .toolbar-title{font-weight:700;color:#0f172a}
    .btn{border:1px solid #cbd5e1;border-radius:8px;padding:6px 10px;font-size:12px;color:#334155;background:#fff}
    .container{padding:16px 20px;font-family:'Poppins',ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#0f172a}
    .title{font-size:22px;font-weight:800;text-align:center;margin:8px 0}
    .muted{color:#64748b;font-size:12px;text-align:center}
    .section-title{font-weight:700;text-align:center;margin:10px 0; text-decoration:underline}
    .kv{display:grid;grid-template-columns:120px 1fr;gap:6px 8px;font-size:14px;margin:8px 0}
    .token{border:2px solid #0f172a;border-radius:4px;font-size:24px;font-weight:700;text-align:center;padding:10px;margin:10px 0}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
    th{background:#f8fafc;color:#475569;font-weight:600}
    th,td{padding:6px 8px}
    .frow{display:flex;justify-content:space-between;margin-top:8px;font-size:14px}
    .total{font-weight:700}
    .footer{margin-top:12px;text-align:center;color:#64748b;font-size:12px}
    /* Print only the slip and use thermal width */
    @media print{
      @page{ size: 58mm auto; margin:0 }
      html, body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; color:#000 !important }
      body *{ visibility:hidden !important }
      /* Print ONLY the slip element to avoid blank first page */
      #lab-slip-printable, #lab-slip-printable *{ visibility:visible !important }
      /* Collapse the overlay container so it doesn't reserve a full-page height */
      #lab-slip-overlay{ position: static !important; width:auto !important; height:0 !important; padding:0 !important; margin:0 !important }
      /* Place the slip at the very top to remove any leading blank */
      #lab-slip-printable{ position:absolute !important; left:0; right:0; top:0; margin:0 auto !important; width:384px !important; box-shadow:none !important }
      .toolbar{ display:none !important }
      /* Force crisp black text for all content in the slip */
      #lab-slip-printable .container, #lab-slip-printable .container * { color:#000 !important }
      #lab-slip-printable .muted { color:#000 !important }
      #lab-slip-printable .footer { color:#000 !important }
      #lab-slip-printable table th{ background:transparent !important; color:#000 !important; border-bottom:1px dashed #000 !important }
      #lab-slip-printable table td{ border-bottom:1px dashed #000 !important }
    }
  </style>
  <div class="slip-card print-area" id="lab-slip-printable">
    <div class="toolbar">
      <div class="toolbar-title">Lab Slip Preview</div>
      <div>
        <button class="btn" id="lab-slip-print">Print (Ctrl+P)</button>
        <button class="btn" id="lab-slip-close" style="margin-left:8px">Close (Ctrl+D)</button>
      </div>
    </div>
    <div class="container">
      <div style="text-align:center;margin-top:8px">
        ${logo? `<img src="${esc(logo)}" alt="logo" style="height:64px;width:auto;object-fit:contain;display:block;margin:0 auto 6px"/>` : ''}
        <div class="title">${esc(labName)}</div>
        <div class="muted">${esc(address)}</div>
        <div class="muted">Mobile #: ${esc(phone)} ${email? ' • Email: '+esc(email):''}</div>
      </div>
      <div class="section-title">Lab Investigation Token</div>
      <div class="kv">
        <div>User:</div><div>${esc(order.printedBy || '—')}</div>
        <div>Date/Time:</div><div>${esc(dateStr)}</div>
        <div>Patient Name:</div><div>${esc(order.patient.fullName)}</div>
        <div>MR #:</div><div>${esc(order.patient.mrn||'-')}</div>
        <div>Mobile #:</div><div>${esc(order.patient.phone||'-')}</div>
        <div>Age:</div><div>${esc(order.patient.age||'-')}</div>
        <div>Sex:</div><div>${esc(order.patient.gender||'-')}</div>
      </div>
      <div class="token">${esc(order.tokenNo)}</div>
      <table>
        <thead><tr><th style="text-align:left">Sr</th><th style="text-align:left">Test Name</th><th style="text-align:right">Charges</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="frow"><div>Total Amount:</div><div>${order.subtotal.toFixed(2)}</div></div>
      <div class="frow"><div>Discount:</div><div>${order.discount.toFixed(2)}</div></div>
      <div class="frow total"><div>Payable Amount:</div><div>${order.net.toFixed(2)}</div></div>
      <div style="margin-top:10px">${fbrHtml}</div>
      <div class="footer">${esc(footer || 'Powered by Hospital MIS')}</div>
    </div>
  </div>`

  overlay.innerHTML = html
  document.body.appendChild(overlay)
  const onClose = ()=> { try { document.removeEventListener('keydown', onKey); overlay.remove() } catch {} }
  const onPrint = ()=> {
    // Always open the OS print dialog (match Pharmacy behavior)
    try { window.print() } catch {}
  }
  const onKey = (e: KeyboardEvent)=> {
    if ((e.ctrlKey||e.metaKey) && (e.key==='d' || e.key==='D')) { e.preventDefault(); onClose() }
    if ((e.ctrlKey||e.metaKey) && (e.key==='p' || e.key==='P')) { /* allow print */ }
    if (e.key === 'Escape') onClose()
  }
  document.getElementById('lab-slip-close')?.addEventListener('click', onClose)
  document.getElementById('lab-slip-print')?.addEventListener('click', onPrint)
  document.addEventListener('keydown', onKey)
}

async function printLabTokenSlipA4(order: LabSlipOrderInput, settings: any){
  const labName = settings?.labName || 'Laboratory'
  const address = settings?.address || ''
  const phone = settings?.phone || ''
  const email = settings?.email || ''
  const footer = settings?.reportFooter || ''
  const logo = settings?.logoDataUrl || ''
  const dtObj = (()=>{ try{ return order.createdAt? new Date(order.createdAt) : new Date() }catch{ return new Date() } })()
  const dt = dtObj.toLocaleDateString()+', '+dtObj.toLocaleTimeString()
  const dtDate = dtObj.toLocaleDateString()
  const dtTime = dtObj.toLocaleTimeString().slice(0,5)
  const qr = await makeQrPng(order.tokenNo).catch(()=> '')
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default as any
  const doc = new jsPDF('p','pt','a4')
  doc.setFont('helvetica','normal')
  let y = 40
  const rightBound = 555
  const logoTop = 44, logoSize = 64, logoLeft = 40
  const qrTop = 44, qrSize = 64, qrLeft = rightBound - qrSize
  let logoNorm = ''
  if (logo){
    try { logoNorm = await ensurePngDataUrl(logo); doc.addImage(logoNorm, 'PNG' as any, logoLeft, logoTop - 10, logoSize, logoSize, undefined, 'FAST') } catch {}
  }
  if (qr){ try { doc.addImage(qr, 'PNG' as any, qrLeft, qrTop, qrSize, qrSize, undefined, 'FAST') } catch {} }
  // Center the title block vertically between the logo and QR blocks
  const midY = Math.max(logoTop, qrTop) + Math.max(logoSize, qrSize) / 2
  y = Math.max(y, midY)
  doc.setFontSize(18)
  doc.text(String(labName), 297.5, y, { align: 'center' }); y += 18
  doc.setFontSize(10)
  doc.text(String(address), 297.5, y, { align: 'center' }); y += 12
  doc.text(`Ph: ${phone || ''}${email? ' • '+email : ''}`, 297.5, y, { align: 'center' }); y += 14
  // Ensure header underline is below the tallest of the logo/QR and header text
  const headerBottom = Math.max(y, logoTop + logoSize, qrTop + qrSize)
  doc.setDrawColor(15); doc.line(40, headerBottom, rightBound, headerBottom); y = headerBottom + 16
  doc.setFontSize(13)
  if (logoNorm){ try { doc.addImage(logoNorm, 'PNG' as any, 40, y - 12, 18, 18, undefined, 'FAST') } catch {} }
  const billX = logoNorm ? 40 + 22 : 40
  doc.setFont('helvetica','bold'); doc.text('Patient Bill', billX, y)
  doc.setFont('helvetica','normal'); doc.setFontSize(11)
  doc.text(`Collection Date & Time: ${dt}`, 555, y, { align: 'right' }); y += 10
  doc.setDrawColor(15); doc.line(40, y, 555, y); y += 10
  const drawKV = (label: string, value: string, x: number, yy: number) => {
    doc.setFont('helvetica','bold'); doc.text(label, x, yy)
    const w = doc.getTextWidth(label + ' ')
    doc.setFont('helvetica','normal'); doc.text(value, x + w, yy)
  }
  const L = 40, R = 300
  doc.setFontSize(10)
  drawKV('Token No :', String(order.tokenNo), L, y)
  drawKV('Date/Time :', String(dt), R, y); y += 14
  drawKV('Patient Name :', String(order.patient.fullName||'-'), L, y)
  drawKV('MR # :', String((order.patient as any).mrn||'-'), R, y); y += 14
  drawKV('Mobile # :', String(order.patient.phone||'-'), R, y); y += 14
  drawKV('Age / Sex :', `${order.patient.age||''} / ${order.patient.gender||''}`, L, y); y += 6
  const head = [['Sr.','Test Name','Reporting Date & Time','Rate']]
  const body = order.tests.map((t, i)=> [String(i+1), String(t.name||''), `${dtDate} - ${dtTime}`, (Number(t.price||0)).toFixed(2)])
  autoTable(doc, {
    startY: y + 12,
    head,
    body,
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [255,255,255], textColor: [15,23,42], halign: 'left', fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 30 }, 2: { cellWidth: 180 }, 3: { halign: 'right', cellWidth: 80 } },
    theme: 'grid',
    tableLineColor: [15,23,42],
    tableLineWidth: 0.5,
    margin: { left: 40, right: 40 },
  })
  let yy = (((doc as any).lastAutoTable?.finalY) || (y + 12)) + 12
  const rightKv = (label: string, val: string, yyy: number, bold = false)=>{
    if (bold) doc.setFont('helvetica','bold'); else doc.setFont('helvetica','normal')
    const text = `${label}  ${val}`
    const w = doc.getTextWidth(text)
    doc.text(text, 555 - w, yyy)
    doc.setFont('helvetica','normal')
  }
  rightKv('Total :', (order.subtotal||0).toFixed(2), yy); yy += 14
  rightKv('Less :', (order.discount||0).toFixed(2), yy); yy += 14
  rightKv('To Be Paid :', (order.net||0).toFixed(2), yy, true); yy += 14
  rightKv('Paid :', `Rs: ${(order.net||0).toFixed(2)}`, yy); yy += 18
  doc.setFontSize(10)
  doc.setFont('helvetica','bold'); doc.text('Payment Received By Credit Card:', 40, yy); yy += 14
  doc.setFont('helvetica','normal'); doc.text('Remarks :', 40, yy); yy += 12
  doc.text(`1  Phlebotomist Name :  ${String(order.printedBy||'-')}`, 40, yy); yy += 12
  doc.text('2  Witness Name :  SELF', 40, yy); yy += 16
  doc.setFont('helvetica','bold'); doc.text('Thank U For Coming!', 297.5, yy, { align: 'center' }); doc.setFont('helvetica','normal'); yy += 14
  doc.text(`Registered By : ${String(order.printedBy||'-')}`, 555, yy, { align: 'right' }); yy += 12
  if ((footer||'').trim()) { doc.text(String(footer), 297.5, yy, { align: 'center' }); yy += 12 }
  // Collection Center (same page)
  doc.setFont('helvetica','bold');
  const ccHeaderY = yy
  doc.text('Collection Center', 40, ccHeaderY)
  doc.setFont('helvetica','normal')
  const ccQrSize = 96
  const ccQrX = rightBound - ccQrSize
  // Caption centered above the QR
  doc.text('Scan for Whatsapp Invoice/Reports', ccQrX + ccQrSize/2, ccHeaderY, { align: 'center' })
  const ccTop = ccHeaderY + 12
  const ccQrY = ccTop
  if (qr){ try { doc.addImage(qr, 'PNG' as any, ccQrX, ccQrY, ccQrSize, ccQrSize, undefined, 'FAST') } catch {} }
  const ccTextRight = rightBound - ccQrSize - 12
  const drawCCWrap = (label: string, val: string, x: number, y0: number)=>{
    doc.setFont('helvetica','bold')
    doc.text(label, x, y0)
    const w = doc.getTextWidth(label + ' ')
    doc.setFont('helvetica','normal')
    const maxW = Math.max(10, ccTextRight - (x + w))
    const lines = (doc as any).splitTextToSize(String(val||''), maxW)
    doc.text(lines, x + w, y0)
    const extra = Array.isArray(lines) ? (lines.length - 1) * 12 : 0
    return y0 + extra
  }
  // Two-column grid on the left; wrapped to avoid QR overlap
  let ccY = ccTop
  ccY = drawCCWrap('Center Name :', String(labName), 40, ccY)
  ccY = drawCCWrap('Phone Number :', String(phone||'-'), 300, ccY); ccY += 14
  ccY = drawCCWrap('Contact Person :', '—', 40, ccY)
  ccY = drawCCWrap('Email :', String(email||'-'), 300, ccY); ccY += 14
  ccY = drawCCWrap('Address :', String(address||'-'), 40, ccY); ccY += 18
  // Push baseline below the QR bottom to avoid overlap with disclaimer
  const ccBottom = Math.max(ccY, ccQrY + ccQrSize)
  yy = ccBottom + 12
  const disclaimer = 'I HAVE READ AND UNDERSTAND THIS CORRESPONDING TEXT AND HAVE ASSUMED ALL RISK(S) INVOLVED IN PARTICIPATING IN THIS TESTING. I RELEASE AND HOLD HARMLESS THE LAB AND ANY AUTHORIZING PHYSICIAN, INCLUDING THEIR EMPLOYEES, AGENTS AND CONTRACTORS, FROM ANY LIABILITY, CLAIM, INJURY, DAMAGES, ATTORNEYS\' FEES OR HARM OF ANY NATURE THAT MIGHT RESULT FROM THE TESTING, MONETARY OR OTHERWISE, INCLUDING THOSE INVOLVING MY PHYSICAL OR MENTAL HEALTH, MEDICAL TESTING PROCEDURES, ERRORS IN TEST RESULTS. IN ADDITION, I HEREBY CERTIFY THAT ALL INFORMATION LISTED ON THIS FORM IS TRUE.'
  const split = (doc as any).splitTextToSize(disclaimer, 515)
  doc.text(split, 40, yy); yy += 14 + (Array.isArray(split)? split.length * 12 : 12)
  doc.setFont('helvetica','normal')
  const footerLine = `${phone||''}    ${email||''}    1 of 1    ${address||''}`
  doc.text(footerLine, 297.5, Math.min(820, yy), { align: 'center' })
  // Preview via Electron or browser
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

async function makeQrPng(data: string): Promise<string> {
  try {
    const QR = await import('qrcode') as any
    return await QR.toDataURL(String(data||''), { errorCorrectionLevel: 'M', margin: 0, width: 256 })
  } catch { return '' }
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
