import React from 'react';
import { diagnosticApi } from '../../utils/api';

interface Props {
  value: string;
  onChange: (text: string) => void;
}

const UpperGIEndoscopy: React.FC<Props> = ({ value: _value, onChange }) => {
  const [indications, setIndications] = React.useState('');
  const [consent, setConsent] = React.useState('');
  const [procedure, setProcedure] = React.useState('');
  const [premed, setPremed] = React.useState('');
  const [findings, setFindings] = React.useState('');
  type KvRow = { label: string; value: string };
  const defaultFindingRows: KvRow[] = [
    { label: '', value: '' },
    { label: '', value: '' },
  ];
  const [findingRows, setFindingRows] = React.useState<KvRow[]>(defaultFindingRows);
  const [impression, setImpression] = React.useState('');
  const [recommendations, setRecommendations] = React.useState('');
  const [referredBy, setReferredBy] = React.useState('');
  const [ready, setReady] = React.useState(false)
  const initialRef = React.useRef<Record<string,string>>({})

  // Prefill from existing value (Edit flow)
  const prefillRef = React.useRef(false)
  React.useEffect(() => {
    if (prefillRef.current) return;
    const txt = String(_value || '').trim();
    if (!txt) return;
    const labels = ['Referred By','Indications','Consent','Procedure','Pre-Medication','Findings','Impression','Recommendations']
    const set = new Set(labels)
    const sections: Record<string,string> = {}
    let cur = ''
    let buf: string[] = []
    function push(){ if (cur){ sections[cur] = (buf.join('\n')).trim(); buf = [] } }
    for (const raw of txt.split(/\r?\n/)){
      const line = raw.trim()
      if (set.has(line)){ push(); cur = line; continue }
      buf.push(raw)
    }
    push()
    if (sections['Referred By']!=null) setReferredBy(sections['Referred By'])
    if (sections['Indications']!=null) setIndications(sections['Indications'])
    if (sections['Consent']!=null) setConsent(sections['Consent'])
    if (sections['Procedure']!=null) setProcedure(sections['Procedure'])
    if (sections['Pre-Medication']!=null) setPremed(sections['Pre-Medication'])
    if (sections['Impression']!=null) setImpression(sections['Impression'])
    if (sections['Recommendations']!=null) setRecommendations(sections['Recommendations'])
    if (sections['Findings']){
      const lines = sections['Findings'].split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
      const rows: KvRow[] = []
      for (const line of lines){
        const idx = line.indexOf(':')
        if (idx>0){ rows.push({ label: line.slice(0, idx).trim(), value: line.slice(idx+1).trim() }) }
        else { rows.push({ label: '', value: line }) }
      }
      if (rows.length) setFindingRows(rows)
      setFindings(sections['Findings'])
    }
    prefillRef.current = true
  }, [_value])

  const build = React.useCallback(() => {
    const out: string[] = [];
    const get = (label: string, cur: string) => (cur?.trim() || initialRef.current[label] || '').trim()
    const pushIf = (label: string, cur: string) => {
      const v = get(label, cur)
      if (v) out.push(`${label}\n${v}`)
    }
    pushIf('Indications', indications);
    pushIf('Consent', consent);
    pushIf('Procedure', procedure);
    pushIf('Pre-Medication', premed);
    pushIf('Findings', findings);
    pushIf('Impression', impression);
    pushIf('Recommendations', recommendations);
    pushIf('Referred By', referredBy);
    return out.join('\n\n');
  }, [indications, consent, procedure, premed, findings, impression, recommendations, referredBy]);

  // Recompute findings text from dynamic rows (preserve per-line layout)
  React.useEffect(() => {
    const out: string[] = [];
    for (const r of findingRows) {
      const Ls = String(r.label || '').split(/\r?\n/).map(s=>s.trim());
      const Vs = String(r.value || '').split(/\r?\n/).map(s=>s.trim());
      const n = Math.max(Ls.length, Vs.length);
      for (let i = 0; i < n; i++) {
        const lbl = (Ls[i] || '').replace(/:+/g, '').trim();
        const val = (Vs[i] || '').trim();
        if (!lbl && !val) continue;
        out.push(lbl ? `${lbl}: ${val}` : val);
      }
    }
    setFindings(out.join('\n'));
  }, [findingRows]);

  React.useEffect(() => {
    if (!ready) return;
    onChange(build());
  }, [build, onChange, ready]);

  return (
    <div className="grid gap-3">
      <div>
        <label className="block text-sm font-medium mb-1">Referred By</label>
        <textarea className="w-full rounded border px-2 py-2 min-h-[60px]" value={referredBy} onChange={e=>setReferredBy(e.target.value)} placeholder="Doctor/Facility name" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Indications</label>
        <textarea className="w-full rounded border px-2 py-2 min-h-[88px]" value={indications} onChange={e=>setIndications(e.target.value)} placeholder="One item per line. Example: UPPER GI BLEED" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Consent</label>
        <textarea className="w-full rounded border px-2 py-2 min-h-[88px]" value={consent} onChange={e=>setConsent(e.target.value)} placeholder="Benefits/risks discussed; consent obtained" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Procedure</label>
        <textarea className="w-full rounded border px-2 py-2 min-h-[88px]" value={procedure} onChange={e=>setProcedure(e.target.value)} placeholder="Describe scope advancement and areas examined" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Pre-Medication</label>
        <textarea className="w-full rounded border px-2 py-2 min-h-[88px]" value={premed} onChange={e=>setPremed(e.target.value)} placeholder="e.g., Xylocaine Solution 4% ..." />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium">Findings</label>
          <button type="button" className="rounded border px-2 py-1 text-xs" onClick={()=>setFindingRows(rows=>[...rows,{ label: '', value: '' }])}>Add Row</button>
        </div>
        <div className="grid gap-2">
          {findingRows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-[260px_1fr_auto] gap-2 items-start">
              <textarea className="w-full rounded border px-2 py-2" value={row.label} onChange={e=>{
                const v = e.target.value; setFindingRows(r=>r.map((it,i)=> i===idx ? ({...it,label:v}) : it));
              }} placeholder="Label (e.g., 1. Esophagus)" />
              <textarea className="w-full rounded border px-2 py-2" value={row.value} onChange={e=>{
                const v = e.target.value; setFindingRows(r=>r.map((it,i)=> i===idx ? ({...it,value:v}) : it));
              }} placeholder="Details" />
              <button type="button" className="text-xs px-2 py-1" onClick={()=>setFindingRows(r=>r.filter((_,i)=>i!==idx))}>Remove</button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Impression</label>
        <textarea className="w-full rounded border px-2 py-2 min-h-[88px]" value={impression} onChange={e=>setImpression(e.target.value)} placeholder="Summary impression" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Recommendations</label>
        <textarea className="w-full rounded border px-2 py-2 min-h-[88px]" value={recommendations} onChange={e=>setRecommendations(e.target.value)} placeholder="One item per line. e.g., High dose PPI; Follow biopsy report; ..." />
      </div>
    </div>
  );
};

export default UpperGIEndoscopy;

export async function printUpperGIEndoscopyReport(input: {
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

  const esc = (x: any)=> String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
  const fmt = (iso?: string)=>{ const d = iso? new Date(iso): new Date(); return d.toLocaleDateString()+" "+d.toLocaleTimeString() }
  const bodyHtml = (()=>{
    const labels = ['Referred By','Indications','Consent','Procedure','Pre-Medication','Findings','Impression','Recommendations']
    const set = new Set(labels)
    const sections: Record<string,string> = {}
    let cur = ''
    let buf: string[] = []
    function push(){ if (cur){ sections[cur] = (buf.join('\n')).trim(); buf = [] } }
    for (const raw of String(input.value||'').split(/\r?\n/)){
      const line = raw.trim()
      if (set.has(line)){ push(); cur = line; continue }
      buf.push(raw)
    }
    push()
    let html = `<div class="title-mid">UPPER GI ENDOSCOPY REPORT</div><div class="box">`
    for (const key of labels){
      const val = (sections as any)[key]
      if (!val) continue
      const bold = (key==='Recommendations' || key==='Referred By') ? ' bold' : ''
      html += `<div class="sec"><div class="sec-title">${esc(key)}</div><div class="sec-text${bold}">${esc(val)}</div></div>`
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
  const consultHtml = consultants.length ? `<div class="consult-grid">${consultants.map(c=>`<div class=\"consult\"><div class=\"name\">${esc(c.name||'')}</div><div class=\"deg\">${esc(c.degrees||'')}</div><div class=\"title\">${esc(c.title||'')}</div></div>`).join('')}</div>` : ''

  const html = `<!doctype html><html><head><meta charset=\"utf-8\"/>
  <style>
    @page { size: A4 portrait; margin: 12mm }
    body{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0f172a; }
    .wrap{ padding: 0 4mm; min-height: 100vh; display:flex; flex-direction:column }
    @media print { .wrap{ min-height: calc(100vh - 36mm) } }
    .hdr{display:grid;grid-template-columns:96px 1fr 96px;align-items:center}
    .hdr .title{font-size:30px;font-weight:800;text-align:center}
    .hdr .muted{color:#64748b;font-size:12px;text-align:center}
    .dept{font-style:italic;text-align:center;margin:8px 0 4px 0}
    .hr{border-bottom:2px solid #0f172a;margin:6px 0}
    .box{border:1px solid #e2e8f0;border-radius:10px;padding:6px;margin:8px 0}
    .kv{display:grid;grid-template-columns: 130px minmax(0,1fr) 130px minmax(0,1fr) 130px minmax(0,1fr);gap:4px 10px;font-size:12px;align-items:start}
    .kv > div{line-height:1.2}
    .kv > div:nth-child(2n){word-break:break-word}
    .title-mid{font-size:22px;font-weight:800;text-align:center;margin-top:4px}
    .content{white-space:pre-wrap;font-size:14px;line-height:1.5}
    .sec{margin-top:6px}
    .sec-title{font-size:16px;font-weight:800;margin:6px 0 2px 0}
    .sec-text{white-space:pre-wrap}
    .bold{font-weight:800}
    .footnote{margin-top:18px;text-align:center;color:#475569}
    .foot-hr{border-bottom:1px solid #334155;margin:10px 0}
    .spacer{flex:1}
    .footer-block{ page-break-inside: avoid; break-inside: avoid }
    .consult-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 18px;margin-top:6px}
    .consult .name{font-weight:800;text-transform:uppercase}
    .consult .deg{font-size:12px}
    .consult .title{font-weight:800}
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
      <div class=\"spacer\"></div>
      <div class=\"footer-block\">
        <div class=\"footnote\">${esc(footer)}</div>
        <div class=\"foot-hr\"></div>
        ${consultHtml}
      </div>
    </div>
  </body></html>`

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
