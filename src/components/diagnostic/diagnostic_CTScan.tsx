import React from 'react';
import type { ReportRendererProps } from './registry';
import { diagnosticApi } from '../../utils/api';

const CTScan: React.FC<ReportRendererProps> = ({ value: _value, onChange }) => {
  const [part, setPart] = React.useState('');
  const [technique, setTechnique] = React.useState('');
  const [findings, setFindings] = React.useState('');
  const [impression, setImpression] = React.useState('');
  const [suggested, setSuggested] = React.useState('');
  const [images, setImages] = React.useState<string[]>([]);
  const [imageUrl, setImageUrl] = React.useState('');
  const [ready, setReady] = React.useState(false)

  const prefillRef = React.useRef(false)
  const initialRef = React.useRef<Record<string,string>>({})
  React.useEffect(() => {
    if (prefillRef.current) return;
    const txt = String(_value || '').trim();
    if (!txt) { setReady(true); return; }
    const labels = ['Part','Technique','Findings','Impression','Suggested','Images'];
    const set = new Set(labels);
    const sections: Record<string,string> = {};
    let cur = '';
    let buf: string[] = [];
    function push(){ if (cur){ sections[cur] = (buf.join('\n')).trim(); buf = [] } }
    for (const raw of txt.split(/\r?\n/)){
      const line = raw.trim();
      if (!cur && ['ct scan','ct scan report'].includes(line.toLowerCase())) continue;
      if (set.has(line)){ if (!cur){ buf = [] } else { push() } cur = line; continue }
      buf.push(raw)
    }
    push()
    initialRef.current = sections
    if (sections['Part']!=null) setPart(sections['Part'])
    if (sections['Technique']!=null) setTechnique(sections['Technique'])
    if (sections['Findings']!=null) setFindings(sections['Findings'])
    if (sections['Impression']!=null) setImpression(sections['Impression'])
    if (sections['Suggested']!=null) setSuggested(sections['Suggested'])
    if (sections['Images']){
      const imgs = sections['Images'].split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
      if (imgs.length) setImages(imgs)
    }
    prefillRef.current = true
    setReady(true)
  }, [_value])

  const build = React.useCallback(() => {
    const lines: string[] = [];
    lines.push('CT SCAN');
    lines.push('');
    lines.push('Part');
    lines.push(part || initialRef.current['Part'] || '');
    lines.push('');
    lines.push('Technique');
    lines.push(technique || initialRef.current['Technique'] || '');
    lines.push('');
    lines.push('Findings');
    lines.push(findings || initialRef.current['Findings'] || '');
    lines.push('');
    lines.push('Impression');
    lines.push(impression || initialRef.current['Impression'] || '');
    lines.push('');
    lines.push('Suggested');
    lines.push(suggested || initialRef.current['Suggested'] || '');
    const imgs = images && images.length ? images : (initialRef.current['Images'] ? initialRef.current['Images'].split(/\r?\n/).filter(Boolean) : [])
    if (imgs.length) {
      lines.push('');
      lines.push('Images');
      imgs.forEach(u => lines.push(u));
    }
    return lines.join('\n');
  }, [part, technique, findings, impression, suggested, images]);

  React.useEffect(() => { if (!ready) return; onChange(build()); }, [build, onChange, ready]);

  const onFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const reads = Array.from(files).map(f =>
      new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ''));
        r.onerror = () => reject(new Error('read error'));
        r.readAsDataURL(f);
      })
    );
    const urls = await Promise.all(reads);
    setImages(prev => [...prev, ...urls]);
  };

  return (
    <div className="grid gap-4">
      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Part</div>
        <input className="border rounded px-2 h-9" value={part} onChange={e=>setPart(e.target.value)} />
      </div>

      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Technique</div>
        <textarea className="border rounded px-2 py-2 min-h-[88px]" value={technique} onChange={e=>setTechnique(e.target.value)} />
      </div>

      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Findings</div>
        <textarea placeholder="Use one finding per line" className="border rounded px-2 py-2 min-h-[140px]" value={findings} onChange={e=>setFindings(e.target.value)} />
      </div>

      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Impression</div>
        <textarea className="border rounded px-2 py-2 min-h-[88px]" value={impression} onChange={e=>setImpression(e.target.value)} />
      </div>

      <div className="bg-white rounded border p-3 grid gap-2">
        <div className="text-sm font-medium">Suggested</div>
        <textarea className="border rounded px-2 py-2 min-h-[88px]" value={suggested} onChange={e=>setSuggested(e.target.value)} />
      </div>

      <div className="bg-white rounded border p-3 grid gap-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">Images</div>
          <input type="file" accept="image/*" multiple onChange={e=>onFiles(e.target.files)} />
          <div className="ml-auto flex items-center gap-2">
            <input className="border rounded px-2 h-9 w-64" placeholder="Paste image URL" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} />
            <button type="button" className="px-2 h-9 text-xs rounded border" onClick={()=>{ if (!imageUrl.trim()) return; setImages(prev=>[...prev, imageUrl.trim()]); setImageUrl(''); }}>Add URL</button>
          </div>
        </div>
        {images.length>0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {images.map((src, idx)=>(
              <div key={idx} className="relative border rounded overflow-hidden">
                <img src={src} alt="ct" className="w-full h-32 object-cover" />
                <button type="button" className="absolute top-1 right-1 bg-white/80 border rounded text-xs px-1" onClick={()=>setImages(prev=>prev.filter((_,i)=>i!==idx))}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CTScan;

export async function printCTScanReport(input: {
  tokenNo?: string
  createdAt?: string
  reportedAt?: string
  patient: { fullName: string; phone?: string; mrn?: string; age?: string; gender?: string; address?: string }
  value: string
  images?: string[]
  referringConsultant?: string
}){
  const s: any = await diagnosticApi.getSettings().catch(()=>({}))
  const name = s?.diagnosticName || 'Diagnostic Center'
  const address = s?.address || '-'
  const phone = s?.phone || ''
  const email = s?.email || ''
  const department = s?.department || 'Department of Diagnostics'
  const logo = s?.logoDataUrl || ''
  const footer = s?.reportFooter || ''

  const esc = (x: any)=> String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
  const fmt = (iso?: string)=>{ const d = iso? new Date(iso): new Date(); return d.toLocaleDateString()+" "+d.toLocaleTimeString() }

  const rawBase = (import.meta as any).env?.VITE_API_URL as string | undefined
  const apiBase = rawBase
    ? (/^https?:/i.test(rawBase) ? rawBase : `http://127.0.0.1:4000${rawBase}`)
    : 'http://127.0.0.1:4000/api'
  const backendBase = String(apiBase || '').replace(/\/api\/?$/i, '')
  const normalizeSrc = (u: string) => {
    const v = String(u || '').trim()
    if (!v) return ''
    if (/^(data:|blob:)/i.test(v)) return v
    if (/^https?:/i.test(v)) return v
    if (v.startsWith('/')) return `${backendBase}${v}`
    return `${backendBase}/${v}`
  }
  const safeSrc = (u: string) => normalizeSrc(u).replace(/"/g, '&quot;')
  const bodyHtml = ((): string => {
    const labels = ['Part','Technique','Findings','Impression','Suggested','Images']
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
    const imgs = Array.isArray((input as any).images) ? (input as any).images.map((x: any)=>String(x||'')).filter(Boolean) : []
    const fallbackImgs = sections['Images'] ? sections['Images'].split(/\r?\n/).map(s=>s.trim()).filter(Boolean) : []
    const showImgs = imgs.length ? imgs : fallbackImgs

    let html = `<div class="title-mid">CT SCAN REPORT</div><div class="box">`
    for (const key of labels){
      const val = (sections as any)[key]
      if (key==='Images'){
        if (!showImgs.length) continue
        html += `<div class="sec"><div class="sec-title">Images</div><div class="img-grid">${showImgs.map((u: string)=>`<div class=\"img-item\"><img src=\"${safeSrc(u)}\" alt=\"img\"/></div>`).join('')}</div></div>`
        continue
      }
      if (!(key in sections) && key!=='Part' && key!=='Technique' && key!=='Findings' && key!=='Impression' && key!=='Suggested') continue
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
  const consultHtml = consultants.length ? `<div class="consult-grid">${consultants.map(c=>`<div class=\"consult\"><div class=\"name\">${esc(c.name||'')}</div><div class=\"deg\">${esc(c.degrees||'')}</div><div class=\"title\">${esc(c.title||'')}</div></div>`).join('')}</div>` : ''

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
    .box{border:0;border-radius:0;padding:0;margin:8px 0}
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
