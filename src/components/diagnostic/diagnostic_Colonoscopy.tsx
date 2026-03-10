import React from 'react';
import type { ReportRendererProps } from './registry';
import { diagnosticApi } from '../../utils/api';

const Colonoscopy: React.FC<ReportRendererProps> = ({ value: _value, onChange }) => {
  const [indications, setIndications] = React.useState('');
  const [consent, setConsent] = React.useState('');
  const [procedure, setProcedure] = React.useState('');
  const [premed, setPremed] = React.useState('');
  const [rectalExam, setRectalExam] = React.useState('');
  const [findings, setFindings] = React.useState('');
  const [impression, setImpression] = React.useState('');
  const [recommendations, setRecommendations] = React.useState('');
  const [referredBy, setReferredBy] = React.useState('');
  const [ready, setReady] = React.useState(false)

  const prefillRef = React.useRef(false)
  const initialRef = React.useRef<Record<string,string>>({})
  React.useEffect(() => {
    if (prefillRef.current) return;
    const txt = String(_value || '').trim();
    if (!txt) return;
    const labels = ['Referred By','Indications','Consent','Procedure','Pre-Medication','Rectal Exam','Findings','Impression','Recommendations'];
    const set = new Set(labels);
    const sections: Record<string,string> = {};
    let cur = '';
    let buf: string[] = [];
    function push(){ if (cur){ sections[cur] = (buf.join('\n')).trim(); buf = [] } }
    for (const raw of txt.split(/\r?\n/)){
      const line = raw.trim();
      if (set.has(line)){
        if (!cur){ buf = [] } else { push() }
        cur = line; continue
      }
      // skip title line like 'COLONOSCOPY'
      if (!cur && ['colonoscopy','colonoscopy report'].includes(line.toLowerCase())) continue
      buf.push(raw)
    }
    push()
    initialRef.current = sections
    setReferredBy(sections['Referred By'] || '')
    setIndications(sections['Indications'] || '')
    setConsent(sections['Consent'] || '')
    setProcedure(sections['Procedure'] || '')
    setPremed(sections['Pre-Medication'] || '')
    setRectalExam(sections['Rectal Exam'] || '')
    setFindings(sections['Findings'] || '')
    setImpression(sections['Impression'] || '')
    setRecommendations(sections['Recommendations'] || '')
    prefillRef.current = true
    setReady(true)
  }, [_value])

  const build = React.useCallback(() => {
    const lines: string[] = [];
    lines.push('COLONOSCOPY');
    lines.push('');
    const refBy = (referredBy || initialRef.current['Referred By'] || '').trim();
    if (refBy) { lines.push('Referred By'); lines.push(refBy); lines.push(''); }
    lines.push('Indications');
    lines.push(indications || initialRef.current['Indications'] || '');
    lines.push('');
    lines.push('Consent');
    lines.push(consent || initialRef.current['Consent'] || '');
    lines.push('');
    lines.push('Procedure');
    lines.push(procedure || initialRef.current['Procedure'] || '');
    lines.push('');
    lines.push('Pre-Medication');
    lines.push(premed || initialRef.current['Pre-Medication'] || '');
    lines.push('');
    lines.push('Rectal Exam');
    lines.push(rectalExam || initialRef.current['Rectal Exam'] || '');
    lines.push('');
    lines.push('Findings');
    lines.push(findings || initialRef.current['Findings'] || '');
    lines.push('');
    lines.push('Impression');
    lines.push(impression || initialRef.current['Impression'] || '');
    lines.push('');
    lines.push('Recommendations');
    lines.push(recommendations || initialRef.current['Recommendations'] || '');
    return lines.join('\n');
  }, [indications, consent, procedure, premed, rectalExam, findings, impression, recommendations, referredBy]);

  React.useEffect(() => { if (!ready) return; onChange(build()); }, [build, onChange, ready]);

  return (
    <div className="grid gap-4">
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Referred By</div>
        <input className="border rounded px-2 h-9" value={referredBy} onChange={e=>setReferredBy(e.target.value)} />
      </div>
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Indications</div>
        <textarea className="border rounded px-2 py-2 min-h-[72px]" value={indications} onChange={e=>setIndications(e.target.value)} />
      </div>
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Consent</div>
        <textarea className="border rounded px-2 py-2 min-h-[72px]" value={consent} onChange={e=>setConsent(e.target.value)} />
      </div>
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Procedure</div>
        <textarea className="border rounded px-2 py-2 min-h-[72px]" value={procedure} onChange={e=>setProcedure(e.target.value)} />
      </div>
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Pre-Medication</div>
        <textarea className="border rounded px-2 py-2 min-h-[72px]" value={premed} onChange={e=>setPremed(e.target.value)} />
      </div>
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Rectal Exam</div>
        <input className="border rounded px-2 h-9" value={rectalExam} onChange={e=>setRectalExam(e.target.value)} />
      </div>
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Findings</div>
        <textarea placeholder="Write findings. Use new line for separation." className="border rounded px-2 py-2 min-h-[140px]" value={findings} onChange={e=>setFindings(e.target.value)} />
      </div>
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Impression</div>
        <textarea className="border rounded px-2 py-2 min-h-[72px]" value={impression} onChange={e=>setImpression(e.target.value)} />
      </div>
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Recommendations</div>
        <textarea className="border rounded px-2 py-2 min-h-[72px]" value={recommendations} onChange={e=>setRecommendations(e.target.value)} />
      </div>
    </div>
  );
};

export default Colonoscopy;

export async function printColonoscopyReport(input: {
  tokenNo?: string
  createdAt?: string
  reportedAt?: string
  patient: { fullName: string; phone?: string; mrn?: string; age?: string; gender?: string; address?: string }
  value: string
  referringConsultant?: string
}){
  const s: any = await diagnosticApi.getSettings().catch(()=>({}))
  const name = s?.diagnosticName || 'Diagnostic Center'
  const address = s?.address || '-'
  const phone = s?.phone || ''
  const email = s?.email || ''
  const department = s?.department || 'Department of Diagnostics'
  const logo = s?.logoDataUrl || ''
  const footer = s?.reportFooter || 'System Generated Report. No Signature Required.'

  const esc = (x: any)=> String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;')
  const fmt = (iso?: string)=>{ const d = iso? new Date(iso): new Date(); return d.toLocaleDateString()+" "+d.toLocaleTimeString() }
  const bodyHtml = (()=>{
    const labels = ['Referred By','Indications','Consent','Procedure','Pre-Medication','Rectal Exam','Findings','Impression','Recommendations']
    const set = new Set(labels)
    const sections: Record<string,string> = {}
    let cur = ''
    let buf: string[] = []
    function push(){ if (cur){ sections[cur] = (buf.join('\n')).trim(); buf = [] } }
    for (const raw of String(input.value||'').split(/\r?\n/)){
      const line = raw.trim()
      if (set.has(line)){
        if (!cur){ buf = [] } else { push() }
        cur = line; continue
      }
      buf.push(raw)
    }
    push()
    let html = `<div class=\"title-mid\">COLONOSCOPY REPORT</div><div class=\"box\">`
    for (const key of labels){
      const val = (sections as any)[key]
      html += `<div class=\"sec\"><div class=\"sec-title\">${esc(key)}</div><div class=\"sec-text\">${esc(val||'')}</div></div>`
    }
    html += `</div>`
    return html
  })()

  const consultants = ((()=>{
    const arr: Array<{ name?: string; degrees?: string; title?: string }> = []
    arr.push({ name: (s as any)?.consultantName, degrees: (s as any)?.consultantDegrees, title: (s as any)?.consultantTitle })
    const extra = Array.isArray((s as any)?.consultants) ? (s as any).consultants : []
    for (const c of extra) arr.push({ name: c?.name, degrees: c?.degrees, title: c?.title })
    const filtered = arr.filter(c => (c?.name || c?.degrees || c?.title))
    const out = filtered.slice(0,3)
    if (out.length === 1){ while (out.length < 3) out.push(out[0]) }
    return out
  })())
  const consultHtml = consultants.length ? `<div class=\"consult-grid\">${consultants.map(c=>`<div class=\\\"consult\\\"><div class=\\\"name\\\">${esc(c.name||'')}</div><div class=\\\"deg\\\">${esc(c.degrees||'')}</div><div class=\\\"title\\\">${esc(c.title||'')}</div></div>`).join('')}</div>` : ''

  const html = `<!doctype html><html><head><meta charset=\"utf-8\"/>
  <style>
    @page { size: A4 portrait; margin: 12mm }
    body{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0f172a; }
    .wrap{ padding: 0 4mm; min-height: 100vh; display:flex; flex-direction:column }
    .hdr{display:grid;grid-template-columns:96px 1fr 96px;align-items:center}
    .hdr .title{font-size:28px;font-weight:800;text-align:center}
    .hdr .muted{color:#64748b;font-size:12px;text-align:center}
    .dept{font-style:italic;text-align:center;margin:8px 0 4px 0}
    .hr{border-bottom:2px solid #0f172a;margin:6px 0}
    .box{border:1px solid #e2e8f0;border-radius:10px;padding:6px;margin:8px 0}
    .kv{display:grid;grid-template-columns: 130px minmax(0,1fr) 130px minmax(0,1fr) 130px minmax(0,1fr);gap:4px 10px;font-size:12px;align-items:start}
    .kv > div{line-height:1.2}
    .kv > div:nth-child(2n){word-break:break-word}
    .title-mid{font-size:18px;font-weight:800;text-align:center;margin-top:4px}
    .sec{margin-top:6px}
    .sec-title{font-size:16px;font-weight:800;margin:6px 0 2px 0}
    .sec-text{white-space:pre-wrap}
    .content{white-space:pre-wrap;font-size:14px;line-height:1.5}
    .footnote{margin-top:18px;text-align:center;color:#475569}
    .foot-hr{border-bottom:1px solid #334155;margin:10px 0}
    .spacer{flex:1}
    .consult-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 18px;margin-top:6px}
    .consult .name{font-weight:800;text-transform:uppercase}
    .consult .deg{font-size:12px}
    .consult .title{font-weight:800}
    @media print { .wrap{ min-height: calc(100vh - 36mm) } }
    .footer-block{ page-break-inside: avoid; break-inside: avoid }
  </style></head><body>
    <div class=\"wrap\">
      <div class=\"hdr\">
        <div>${logo? `<img src=\"${esc(logo)}\" alt=\"logo\" style=\"height:70px;width:auto;object-fit:contain\"/>` : ''}</div>
        <div>
          <div class=\"title\">${esc(name)}</div>
          <div class=\"muted\">${esc(address)}</div>
          <div class=\"muted\">Ph: ${esc(phone)} ${email? ' • '+esc(email): ''}</div>
        </div>
        <div></div>
      </div>
      <div class=\"dept\">${esc(department)}</div>
      <div class=\"hr\"></div>
      <div class=\"box\">
        <div class=\"kv\">
          <div>Medical Record No :</div><div>${esc(input.patient.mrn || '-')}</div>
          <div>Sample No / Lab No :</div><div>${esc(input.tokenNo || '-')}</div>
          <div>Patient Name :</div><div>${esc(input.patient.fullName)}</div>
          <div>Age / Gender :</div><div>${esc(input.patient.age || '')} / ${esc(input.patient.gender || '')}</div>
          <div>Reg. & Sample Time :</div><div>${fmt(input.createdAt)}</div>
          <div>Reporting Time :</div><div>${fmt(input.reportedAt || new Date().toISOString())}</div>
          <div>Contact No :</div><div>${esc(input.patient.phone || '-')}</div>
          <div>Referring Consultant :</div><div>${esc(input.referringConsultant || '-')}</div>
          <div>Address :</div><div>${esc(input.patient.address || '-')}</div>
        </div>
      </div>
      ${bodyHtml}
      <div class="spacer"></div>
      <div class="footer-block">
        <div class="footnote">${esc(footer)}</div>
        <div class="foot-hr"></div>
        ${consultHtml}
      </div>
    </div>
  </body></html>`
  // Prefer Electron in-app preview if available
  try{
    const api = (window as any).electronAPI
    if (api && typeof api.printPreviewHtml === 'function'){
      await api.printPreviewHtml(html, {})
      return
    }
  }catch{}
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0';
  iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; iframe.style.visibility = 'hidden'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) return
  doc.open(); doc.write(html); doc.close()
  iframe.onload = () => {
    try { iframe.contentWindow?.focus(); iframe.contentWindow?.print() } catch {}
    setTimeout(()=>{ try { iframe.remove() } catch {} }, 8000)
  }
}
