import React from 'react';
// Using native textarea/input elements to avoid external UI dependencies
import type { ReportRendererProps } from './registry';
import { diagnosticApi } from '../../utils/api';

const EchoCheckbox: React.FC<{ label: string; checked: boolean; onChange: (v: boolean)=>void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 text-sm">
    <input type="checkbox" className="accent-purple-600" checked={checked} onChange={e=>onChange(e.target.checked)} />
    <span>{label}</span>
  </label>
);

const Echocardiography: React.FC<ReportRendererProps> = ({ value, onChange }) => {
  type Row = { label: string; normal: string; result: string };
  const [rows, setRows] = React.useState<Row[]>([
    { label: 'AORTIC ROOT', normal: '', result: '' },
    { label: 'AORTIC ANNULUS', normal: '', result: '' },
    { label: 'LA', normal: '19-39mm', result: '' },
    { label: 'LA/Aortic Ratio', normal: '', result: '' },
    { label: 'RV', normal: '7-25mm', result: '' },
    { label: '2D MV Area', normal: '', result: '' },
    { label: 'LVISD', normal: '', result: '' },
    { label: 'LVPWD', normal: '', result: '' },
    { label: 'LVIDD', normal: '', result: '' },
    { label: 'LVIDS', normal: '', result: '' },
    { label: 'EF', normal: '', result: '' },
    { label: 'FS', normal: '', result: '' },
  ]);
  const [doppler, setDoppler] = React.useState({ mitral: '', tricuspid: '', aortic: '', pulmonary: '' });
  const [cfm, setCfm] = React.useState('');
  const defaults = [
    'Levocardia',
    'AV-VA concordance',
    'Situs solitus',
    'All cardiac chambers are normal.',
    'All valves are normal.',
    'Intact IAS and IVS.',
    'No PDA.',
    'No other congenital heart disease.',
    'No clot/vegetation seen.',
  ];
  const [checks, setChecks] = React.useState<boolean[]>(defaults.map(()=>true));
  const [conclusion, setConclusion] = React.useState('Normal study. Ref to paeds cardiologist for detailed ECHO.');

  const prefillRef = React.useRef(false)
  React.useEffect(() => {
    if (prefillRef.current) return
    try {
      const parsed = JSON.parse(value||'')
      if (parsed && typeof parsed === 'object'){
        if (Array.isArray(parsed.rows)) setRows(parsed.rows)
        if (parsed.doppler && typeof parsed.doppler === 'object') setDoppler(parsed.doppler)
        if (typeof parsed.cfm === 'string') setCfm(parsed.cfm)
        if (Array.isArray(parsed.report)){
          const arr = defaults.map(lbl => (parsed.report as string[]).includes(lbl))
          setChecks(arr)
        }
        if (typeof parsed.conclusion === 'string') setConclusion(parsed.conclusion)
        prefillRef.current = true
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  React.useEffect(() => {
    const payload = {
      rows,
      doppler,
      cfm,
      report: defaults.filter((_, idx)=> !!checks[idx]),
      conclusion,
    }
    onChange(JSON.stringify(payload))
  }, [rows, doppler, cfm, checks, conclusion, onChange]);

  return (
    <div className="grid gap-4">
      <div className="bg-white rounded border">
        <div className="px-3 py-2 font-medium border-b flex items-center gap-2">
          <span>B/M Mode Dimensions</span>
          <button type="button" className="ml-auto px-2 h-8 text-xs rounded border hover:bg-gray-50" onClick={()=>setRows(prev=>[...prev, {label:'',normal:'',result:''}])}>Add Parameter</button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-2 w-[40%]">Parameter</th>
                <th className="p-2 w-[30%]">Normal</th>
                <th className="p-2 w-[30%]">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2"><input className="w-full border rounded px-2 h-8" value={r.label} onChange={e=>{ const v=e.target.value; setRows(prev=>{ const n=[...prev]; n[i] = { ...n[i], label:v }; return n; }); }} /></td>
                  <td className="p-2"><input className="w-full border rounded px-2 h-8" value={r.normal} onChange={e=>{ const v=e.target.value; setRows(prev=>{ const n=[...prev]; n[i] = { ...n[i], normal:v }; return n; }); }} /></td>
                  <td className="p-2"><input className="w-full border rounded px-2 h-8" value={r.result} onChange={e=>{ const v=e.target.value; setRows(prev=>{ const n=[...prev]; n[i] = { ...n[i], result:v }; return n; }); }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded border">
        <div className="px-3 py-2 font-medium border-b">Doppler</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
          {(['mitral','tricuspid','aortic','pulmonary'] as const).map(k => (
            <div key={k}>
              <label className="block text-sm text-gray-600 mb-1 capitalize">{k}</label>
              <input className="w-full border rounded px-2 h-8" value={(doppler as any)[k]||''} onChange={e=>setDoppler(prev=>({ ...prev, [k]: e.target.value }))} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Color Flow Mapping</label>
        <textarea className="w-full border rounded px-2 py-2 min-h-[88px]" value={cfm} onChange={e=>setCfm(e.target.value)} placeholder="Describe color flow mapping" />
      </div>

      <div className="bg-white rounded border p-3">
        <div className="text-sm font-medium mb-2">Report</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {defaults.map((lbl, i) => (
            <EchoCheckbox key={i} label={lbl} checked={checks[i]} onChange={(v)=>setChecks(prev=>{ const n=[...prev]; n[i]=v; return n; })} />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Conclusion</label>
        <textarea className="w-full border rounded px-2 py-2 min-h-[88px]" value={conclusion} onChange={e=>setConclusion(e.target.value)} />
      </div>
    </div>
  );
};

export default Echocardiography;

export function buildEchocardiographyBodyHtml(value: string){
  function esc(s: any){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') }
  let data: any = {}
  try { data = JSON.parse(String(value||'{}')) } catch {}
  const rows: Array<{ label: string; normal: string; result: string }> = Array.isArray(data?.rows) ? data.rows : []
  const leftRows = rows.slice(0, Math.ceil(rows.length/2))
  const rightRows = rows.slice(Math.ceil(rows.length/2))
  const dop = (data?.doppler && typeof data.doppler === 'object') ? data.doppler : {}
  const dopplerLines: string[] = []
  if (dop?.mitral) dopplerLines.push(`Mitral: ${dop.mitral}`)
  if (dop?.tricuspid) dopplerLines.push(`Tricuspid: ${dop.tricuspid}`)
  if (dop?.aortic) dopplerLines.push(`Aortic: ${dop.aortic}`)
  if (dop?.pulmonary) dopplerLines.push(`Pulmonary: ${dop.pulmonary}`)
  const cfm = String(data?.cfm||'')
  const report: string[] = Array.isArray(data?.report) ? data.report : []
  const conclusion = String(data?.conclusion||'')
  const maxLen = Math.max(leftRows.length, rightRows.length)
  let body = ''
  body += `<div class="echo-title">ECHOCARDIOGRAPHIC IMAGING REPORT</div>`
  body += `<table class="echo-table"><thead>`
  body += `<tr><th class="head" colspan="6">B/M MODE DIMENSIONS</th><th class="head">DOPPLER</th></tr>`
  body += `<tr><th class="cell head-sm">Parameter</th><th class="cell head-sm">Normal</th><th class="cell head-sm">Result</th>`
  body += `<th class="cell head-sm">Parameter</th><th class="cell head-sm">Normal</th><th class="cell head-sm">Result</th><th class="cell head-sm"></th></tr>`
  body += `</thead><tbody>`
  for (let i=0;i<Math.max(4, maxLen); i++){
    const a = leftRows[i]||{}
    const b = rightRows[i]||{}
    body += `<tr>`
    body += `<td class="cell">${esc(a?.label||'')}</td>`
    body += `<td class="cell">${esc(a?.normal||'')}</td>`
    body += `<td class="cell">${esc(a?.result||'')}</td>`
    body += `<td class="cell">${esc(b?.label||'')}</td>`
    body += `<td class="cell">${esc(b?.normal||'')}</td>`
    body += `<td class="cell">${esc(b?.result||'')}</td>`
    body += `<td class="cell">${esc(dopplerLines[i]||'')}</td>`
    body += `</tr>`
  }
  body += `</tbody></table>`
  body += `<table class="echo-cfm-table"><tr><td class="cell"><strong>COLOR FLOW MAPPING :-</strong> ${esc(cfm)}</td></tr></table>`
  const bullets = report.map(it=>`<li> ${esc(it||'')} </li>`).join('')
  body += `<div class="section"><div class="section-title">REPORT</div><ul class="bullets">${bullets}</ul></div>`
  body += `<div class="section"><div class="section-title">CONCLUSION</div><div class="section-text">${esc(conclusion)}</div></div>`
  return body
}

export async function printEchocardiographyReport(input: {
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
  const bodyHtml = buildEchocardiographyBodyHtml(input.value)

  const consultants = (()=>{
    const arr: Array<{ name?: string; degrees?: string; title?: string }> = []
    arr.push({ name: (s as any)?.consultantName, degrees: (s as any)?.consultantDegrees, title: (s as any)?.consultantTitle })
    const extra = Array.isArray((s as any)?.consultants) ? (s as any).consultants : []
    for (const c of extra) arr.push({ name: c?.name, degrees: c?.degrees, title: c?.title })
    const filtered = arr.filter(c => (c?.name || c?.degrees || c?.title))
    const out = filtered.slice(0,3)
    if (out.length === 1){ while (out.length < 3) out.push(out[0]) }
    return out
  })()

  const consultHtml = consultants.length ? `<div class="consult-grid">${consultants.map(c=>`<div class="consult"><div class="name">${esc(c.name||'')}</div><div class="deg">${esc(c.degrees||'')}</div><div class="title">${esc(c.title||'')}</div></div>`).join('')}</div>` : ''

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    @page { size: A4 portrait; margin: 12mm }
    body{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0f172a; }
    .wrap{ padding: 0 4mm; min-height: 100vh; display:flex; flex-direction:column; }
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
    /* Echo specific */
    .echo-title{font-size:18px;font-weight:800;text-align:center;margin-top:6px;text-transform:uppercase}
    .echo-table{width:100%;border-collapse:collapse;margin-top:8px;border:1.5px solid #0f172a}
    .echo-table .head{background:#f8fafc;border-bottom:2px solid #0f172a;padding:6px;font-weight:800;text-align:center}
    .echo-table .head-sm{background:#ffffff;border-bottom:1px solid #0f172a;padding:6px;text-align:left}
    .echo-table .cell{border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;padding:6px}
    .echo-table tr > .cell:last-child{border-right:0}
    .echo-cfm-table{width:100%;border-collapse:collapse;border:1.5px solid #0f172a;border-top:0;margin-top:0;margin-bottom:8px}
    .echo-cfm-table .cell{padding:6px}
    .section{margin-top:8px}
    .section-title{font-weight:800;margin:6px 0 4px 0;text-transform:uppercase}
    .bullets{margin:0 0 4px 18px;padding:0}
    .bullets li{margin:2px 0;}
    .section-text{white-space:pre-wrap}
    .footnote{margin-top:18px;text-align:center;color:#475569}
    .foot-hr{border-bottom:1px solid #334155;margin:10px 0}
    .spacer{flex:1}
    .footer-block{ page-break-inside: avoid; break-inside: avoid }
    .consult-grid{display:flex;justify-content:space-between;gap:18px;margin-top:6px;page-break-inside:avoid;break-inside:avoid;flex-wrap:nowrap}
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
