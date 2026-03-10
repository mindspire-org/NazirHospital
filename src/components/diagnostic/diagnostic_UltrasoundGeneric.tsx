import React from 'react';
import { diagnosticApi } from '../../utils/api';

interface Props {
  value: string;
  onChange: (text: string) => void;
}

const UltrasoundGeneric: React.FC<Props> = ({ value: _value, onChange }) => {
  const [clinical, setClinical] = React.useState('');
  const [comparison, setComparison] = React.useState('');
  const [technique, setTechnique] = React.useState('');
  const [findings, setFindings] = React.useState('');
  type KvRow = { label: string; value: string };
  const [findingRows, setFindingRows] = React.useState<KvRow[]>([
    { label: '', value: '' },
    { label: '', value: '' },
  ]);
  const [impression, setImpression] = React.useState('');
  const [images, setImages] = React.useState<string[]>([]);
  const [ready, setReady] = React.useState(false)

  const initialRef = React.useRef<Record<string,string>>({})
  const build = React.useCallback(() => {
    const get = (label: string, cur: string) => (cur?.trim() || initialRef.current[label] || '').trim()
    const parts = [
      `Clinical Information\n${get('Clinical Information', clinical)}`,
      `Comparison\n${get('Comparison', comparison)}`,
      `Technique\n${get('Technique', technique)}`,
      `Findings\n${get('Findings', findings)}`,
      `Impression\n${get('Impression', impression)}`,
    ];
    const imgs = images && images.length ? images : (initialRef.current['Images'] ? initialRef.current['Images'].split(/\r?\n/).filter(Boolean) : [])
    if (imgs.length) {
      parts.push(`Images\n${imgs.join('\n')}`);
    }
    return parts.join('\n\n').trim();
  }, [clinical, comparison, technique, findings, impression, images]);

  React.useEffect(() => {
    if (!ready) return;
    onChange(build());
  }, [build, onChange, ready]);

  // Prefill from existing value (Edit flow)
  const prefillRef = React.useRef(false)
  React.useEffect(() => {
    if (prefillRef.current) return;
    const txt = String(_value || '').trim();
    if (!txt) { setReady(true); return; }
    const labels = ['Clinical Information','Comparison','Technique','Findings','Impression','Images']
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
    initialRef.current = sections
    if (sections['Clinical Information']!=null) setClinical(sections['Clinical Information'])
    if (sections['Comparison']!=null) setComparison(sections['Comparison'])
    if (sections['Technique']!=null) setTechnique(sections['Technique'])
    if (sections['Impression']!=null) setImpression(sections['Impression'])
    if (sections['Images']){
      const imgs = sections['Images'].split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
      if (imgs.length) setImages(imgs)
    }
    // Map Findings lines back to dynamic rows (best-effort)
    if (sections['Findings']){
      const lines = sections['Findings'].split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
      const rows: KvRow[] = []
      for (const line of lines){
        const idx = line.indexOf(':')
        if (idx>0){ rows.push({ label: line.slice(0, idx).trim(), value: line.slice(idx+1).trim() }) }
        else { rows.push({ label: '', value: line }) }
      }
      if (rows.length) setFindingRows(rows)
    }
    prefillRef.current = true
    setReady(true)
  }, [_value])

  // Recompute Findings from dynamic rows (two-column layout)
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

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const files = Array.from(input?.files || []);
    if (!files.length) return;
    const reads = files.map(f => new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result||''));
      fr.onerror = (err) => rej(err);
      fr.readAsDataURL(f);
    }));
    const urls = await Promise.all(reads);
    setImages(prev => [...prev, ...urls]);
    try { if (input) input.value = ''; } catch {}
  };

  return (
    <div className="grid gap-3">
      <div>
        <label className="block text-sm font-medium mb-1">Clinical Information</label>
        <textarea className="w-full rounded border px-2 py-2 min-h-[88px]" value={clinical} onChange={e=>setClinical(e.target.value)} placeholder="Enter clinical notes" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Comparison</label>
        <textarea className="w-full rounded border px-2 py-2 min-h-[88px]" value={comparison} onChange={e=>setComparison(e.target.value)} placeholder="Previous studies or NONE" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Technique</label>
        <textarea className="w-full rounded border px-2 py-2 min-h-[88px]" value={technique} onChange={e=>setTechnique(e.target.value)} placeholder="Describe technique" />
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
              }} placeholder="Label (e.g., Liver)" />
              <textarea className="w-full rounded border px-2 py-2" value={row.value} onChange={e=>{
                const v = e.target.value; setFindingRows(r=>r.map((it,i)=> i===idx ? ({...it,value:v}) : it));
              }} placeholder="Details (e.g., Mildly enlarged, homogeneous echotexture)" />
              <button type="button" className="text-xs px-2 py-1" onClick={()=>setFindingRows(r=>r.filter((_,i)=>i!==idx))}>Remove</button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Impression</label>
        <textarea className="w-full rounded border px-2 py-2 min-h-[88px]" value={impression} onChange={e=>setImpression(e.target.value)} placeholder="Final impression" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Images</label>
        <input type="file" accept="image/*" multiple onChange={onFiles} />
        {images.length>0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            {images.map((src, idx) => (
              <div key={idx} className="relative border rounded overflow-hidden">
                <img src={src} alt={`img-${idx}`} className="w-full h-24 object-cover" />
                <button type="button" className="absolute top-1 right-1 bg-white/80 text-xs px-1 rounded" onClick={()=>setImages(imgs=>imgs.filter((_,i)=>i!==idx))}>x</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UltrasoundGeneric;

export async function printUltrasoundReport(input: {
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
    const labels = ['Clinical Information','Comparison','Technique','Findings','Impression','Images']
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
    let html = `<div class="title-mid">ULTRASOUND REPORT</div><div class="box">`
    for (const key of labels){
      const val = (sections as any)[key]
      if (key==='Images' && !val) continue
      if (!(key in sections) && key!=='Clinical Information' && key!=='Comparison' && key!=='Technique' && key!=='Findings' && key!=='Impression') continue
      html += `<div class="sec"><div class="sec-title">${esc(key)}</div><div class="sec-text">${esc(val||'')}</div></div>`
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

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    @page { size: A4 portrait; margin: 12mm }
    body{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0f172a; }
    .wrap{ padding: 0 4mm; min-height: 100vh; display:flex; flex-direction:column }
    @media print { .wrap{ min-height: calc(100vh - 36mm) } }
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
    .footer-block{ page-break-inside: avoid; break-inside: avoid }
    .consult-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 18px;margin-top:6px}
    .consult .name{font-weight:800;text-transform:uppercase}
    .consult .deg{font-size:12px}
    .consult .title{font-weight:800}
  </style></head><body>
    <div class="wrap">
      <div class="hdr">
        <div>${logo? `<img src="${esc(logo)}" alt="logo" style="height:70px;width:auto;object-fit:contain"/>` : ''}</div>
        <div>
          <div class="title">${esc(name)}</div>
          <div class="muted">${esc(address)}</div>
          <div class="muted">Ph: ${esc(phone)} ${email? ' • '+esc(email): ''}</div>
        </div>
        <div></div>
      </div>
      <div class="dept">${esc(department)}</div>
      <div class="hr"></div>
      <div class="box">
        <div class="kv">
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
