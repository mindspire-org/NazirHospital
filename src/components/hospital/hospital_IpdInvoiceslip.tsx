import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { hospitalApi } from '../../utils/api';

// Types
type LineItem = { sr: number; description: string; rate: number; qty: number; amount: number; _id?: string };

type Invoice = {
  refNo?: string;
  mrn?: string;
  patientName?: string;
  employeeName?: string;
  relationWithPatient?: string;
  bps?: string;
  designation?: string;
  employeeNo?: string;
  procedure?: string;
  dateOfAdmission?: string;
  dateOfDischarge?: string;
  daysOccupied?: number;
  lineItems: LineItem[];
  totalAmount: number;
  discount: number;
  totalPayable: number;
  currency?: string;
};

export default function InvoicePage(_props: { patientId?: string; embedded?: boolean }){
  const { id: routeId = '' } = useParams(); // encounter id via route
  const id = routeId; // use encounter id from route
  const readOnly = false;
  const [, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inv, setInv] = useState<Invoice>({ lineItems: [], totalAmount: 0, discount: 0, totalPayable: 0, currency: 'PKR' });
  const [patient, setPatient] = useState<{ name?: string; mrn?: string; admitDate?: string; exitDate?: string; phone?: string; address?: string }|null>(null);
  const [hSettings, setHSettings] = useState<any>(null);
  const [dischargeTime, setDischargeTime] = useState<string>('');

  // Load encounter patient + IPD billing items
  useEffect(()=>{ if(!id) return; (async()=>{
    try {
      setLoading(true);
      const e: any = await hospitalApi.getIPDAdmissionById(id).catch(()=>null as any);
      const enc = e?.encounter;
      if (enc) {
        setPatient({ name: enc.patientId?.fullName, mrn: enc.patientId?.mrn, admitDate: enc.startAt, exitDate: enc.endAt, phone: enc.patientId?.phoneNormalized, address: enc.patientId?.address });
        if (enc.endAt){
          const dt = new Date(enc.endAt);
          const hh = String(dt.getHours()).padStart(2,'0');
          const mm = String(dt.getMinutes()).padStart(2,'0');
          setDischargeTime(`${hh}:${mm}`);
        }
      }
      const res: any = await hospitalApi.listIpdBillingItems(id).catch(()=>({ items: [] }));
      const items: LineItem[] = (res.items||[]).map((r:any, idx:number)=> ({ sr: idx+1, description: r.description||'', rate: Number(r.unitPrice||0), qty: Number(r.qty||1)||1, amount: Number(r.amount||0), _id: String(r._id||'') }));
      const discountItem = items.find(it=> /^discount$/i.test(it.description));
      const discount = discountItem ? Math.abs(Number(discountItem.amount||0)) : 0;
      setInv(s=> fillRows({ ...s, lineItems: items, discount }));
    } finally {
      setLoading(false);
    }
  })(); }, [id]);

  useEffect(()=>{ (async()=>{
    try {
      const s: any = await hospitalApi.getSettings().catch(()=>null as any);
      const merged = {
        hospitalName: s?.name || localStorage.getItem('hospitalName') || '',
        hospitalLogo: s?.logoDataUrl || localStorage.getItem('hospitalLogo') || '',
        hospitalAddress: s?.address || localStorage.getItem('hospitalAddress') || '',
        hospitalPhone: s?.phone || localStorage.getItem('hospitalPhone') || '',
        hospitalEmail: s?.email || localStorage.getItem('hospitalEmail') || '',
      };
      setHSettings(merged);
    } catch {}
  })(); }, []);

  // When patient loads, prefill invoice fields if empty
  useEffect(()=>{
    if (!patient) return;
    setInv(v=>{
      const next = { ...v } as Invoice;
      if (!next.mrn && patient.mrn) next.mrn = patient.mrn;
      if (!next.patientName && patient.name) next.patientName = patient.name;
      if (!next.dateOfAdmission && patient.admitDate) next.dateOfAdmission = patient.admitDate as any;
      if (!next.dateOfDischarge && patient.exitDate) next.dateOfDischarge = patient.exitDate as any;
      // derive days occupied if dates present and field empty
      const d1 = next.dateOfAdmission ? new Date(next.dateOfAdmission) : null;
      const d2 = next.dateOfDischarge ? new Date(next.dateOfDischarge) : null;
      if (next.daysOccupied == null && d1 && d2 && !isNaN(d1 as any) && !isNaN(d2 as any)){
        const days = Math.max(0, Math.ceil((d2.getTime() - d1.getTime())/(1000*60*60*24)));
        next.daysOccupied = days;
      }
      return next;
    });
  }, [patient]);

  // Recalculate days occupied when admission/discharge dates change
  useEffect(()=>{
    const d1 = inv.dateOfAdmission ? new Date(inv.dateOfAdmission) : null;
    const d2 = inv.dateOfDischarge ? new Date(inv.dateOfDischarge) : null;
    if (!d1 || !d2 || isNaN(d1 as any) || isNaN(d2 as any)) return;
    const days = Math.max(0, Math.ceil((d2.getTime() - d1.getTime())/(1000*60*60*24)));
    if (inv.daysOccupied !== days){
      setInv(v=>({ ...v, daysOccupied: days }));
    }
  }, [inv.dateOfAdmission, inv.dateOfDischarge]);

  const totals = useMemo(()=>{
    const totalAmount = (inv.lineItems||[]).reduce((s, r)=> s + Number(r.amount||0), 0);
    const discount = Number(inv.discount||0);
    const totalPayable = Math.max(0, totalAmount - discount);
    return { totalAmount, discount, totalPayable };
  }, [inv.lineItems, inv.discount]);

  useEffect(()=>{
    setInv(v=>({ ...v, totalAmount: totals.totalAmount, totalPayable: totals.totalPayable }));
  }, [totals.totalAmount, totals.totalPayable]);

  function fillRows(data: Invoice): Invoice{
    const rows = [...(data.lineItems||[])];
    return { ...data, lineItems: rows };
  }

  function setRow(i: number, patch: Partial<LineItem>){
    setInv(v=>{
      const items = [...v.lineItems];
      const old = items[i];
      const next = { ...old, ...patch } as LineItem;
      // auto compute amount when rate changes (qty is implicitly 1)
      const rate = Number(next.rate||0);
      if (patch.rate != null) next.amount = rate;
      items[i] = next;
      return { ...v, lineItems: items };
    });
  }

  async function save(){
    if (!id) return;
    setSaving(true);
    try {
      // Update encounter discharge date/time if provided
      if (inv.dateOfDischarge){
        try {
          const dt = new Date(inv.dateOfDischarge as any)
          if (dischargeTime){
            const [hh,mm] = dischargeTime.split(':')
            dt.setHours(Number(hh)||0, Number(mm)||0, 0, 0)
          }
          const iso = dt.toISOString()
          await hospitalApi.dischargeIPD(id, { endAt: iso })
        } catch {}
      }
      const rows = inv.lineItems;
      // Sync Discount as dedicated line
      const discountRow = rows.find(r=> /^discount$/i.test(r.description));
      const desired = Math.abs(Number(inv.discount||0));
      if (desired > 0){
        const amt = -desired;
        if (discountRow && (discountRow as any)._id){
          await hospitalApi.updateIpdBillingItem(String((discountRow as any)._id), { description: 'Discount', qty: 1, unitPrice: amt, amount: amt });
        } else {
          await hospitalApi.createIpdBillingItem(id, { type: 'service', description: 'Discount', qty: 1, unitPrice: amt, amount: amt });
        }
      } else if (discountRow && (discountRow as any)._id){
        await hospitalApi.deleteIpdBillingItem(String((discountRow as any)._id));
      }
      // Upsert other rows
      for (const r of rows){
        if (/^discount$/i.test(r.description)) continue;
        const qty = 1, unitPrice = Number(r.rate||0);
        const amount = Number(r.amount!=null? r.amount : unitPrice);
        if (r._id){
          await hospitalApi.updateIpdBillingItem(String(r._id), { description: r.description, qty, unitPrice, amount });
        } else if (r.description || amount){
          await hospitalApi.createIpdBillingItem(id, { type: 'service', description: r.description, qty, unitPrice, amount });
        }
      }
      // Reload
      const res: any = await hospitalApi.listIpdBillingItems(id).catch(()=>({ items: [] }));
      const items: LineItem[] = (res.items||[]).map((r:any, idx:number)=> ({ sr: idx+1, description: r.description||'', rate: Number(r.unitPrice||0), qty: Number(r.qty||1)||1, amount: Number(r.amount||0), _id: String(r._id||'') }));
      const discountItem = items.find(it=> /^discount$/i.test(it.description));
      const discount = discountItem ? Math.abs(Number(discountItem.amount||0)) : 0;
      setInv(s=> fillRows({ ...s, lineItems: items, discount }));
    } finally {
      setSaving(false);
    }
  }

  function printView(){
    if (!hSettings) { alert('Loading hospital details. Please try Print again in a moment.'); return; }
    const w = window.open('', '_blank');
    if (!w) return;
    // Always render a full sheet with 10 lines even if empty
    const rows = (inv.lineItems || []).filter(r => (r.description && r.description.trim()) || Number(r.rate||0) || Number(r.amount||0));
    const currency = inv.currency || 'PKR';
    const admitDT = inv.dateOfAdmission || patient?.admitDate || '';
    let dischargeDT = inv.dateOfDischarge || patient?.exitDate || '';
    if (inv.dateOfDischarge && dischargeTime){
      try {
        const base = new Date(inv.dateOfDischarge as any);
        const [hh,mm] = dischargeTime.split(':');
        base.setHours(Number(hh)||0, Number(mm)||0, 0, 0);
        dischargeDT = base.toISOString();
      } catch {}
    }
    const style = `
      <style>
        @page { size: A4; margin: 12mm; }
        *{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body{font-family:system-ui,Segoe UI,Arial,sans-serif;padding:18px;color:#111}
        .brand{display:flex;align-items:center;gap:12px}
        .brand .title{font-weight:700;font-size:18px;letter-spacing:.3px}
        .brand .addr{font-size:11px;color:#334}
        .brand{display:flex;gap:10px;align-items:center;justify-content:center;text-align:center;padding-bottom:8px;margin-bottom:10px;border-bottom:1px solid #bae6fd}
        .brand .logo{width:40px;height:40px;border:1px solid #bae6fd;border-radius:8px;display:grid;place-items:center}
        .brand .logoimg{width:56px;height:56px;object-fit:contain;border:1px solid #bae6fd;border-radius:8px;background:#fff;margin-right:8px}
        /* solid blue text to match screen reliably in print */
        .brand .title1{font-weight:900;text-transform:uppercase;letter-spacing:.3px;font-size:24px;line-height:1.1;color:#1d4ed8}
        .brand .title2{font-weight:900;text-transform:uppercase;font-size:18px;line-height:1.1;color:#1d4ed8;margin-top:4px}
        .brand .addr{color:#475569;font-size:12px;margin-top:2px}
        .box{border:2px solid #111;padding:10px}
        .title{text-align:center;font-weight:700;font-size:18px;margin-bottom:6px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #111;padding:4px 6px;font-size:12px}
        th{background:#f5f5f5;font-weight:700}
        .totals td{font-weight:700}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;margin-bottom:6px}
        .label{color:#111;width:160px;display:inline-block;font-weight:700}
        .value{font-weight:400}
      </style>`;
    const hs = hSettings || {};
    const name = hs.hospitalName || 'Hospital';
    const addr = hs.hospitalAddress || '';
    const phone = hs.hospitalPhone || '';
    const email = hs.hospitalEmail || '';
    const logo = hs.hospitalLogo || '';
    const logoSrc = logo ? String(logo) : '';
    const logoImg = logoSrc ? `<img class="logoimg" src="${logoSrc}" alt="Logo" onerror="this.style.display='none'" />` : '';
    const brand = `
      <div class="brand">
        ${logoImg}
        <div>
          <div class="title1">${escapeHtml(name)}</div>
          ${addr? `<div class="addr">${escapeHtml(addr)}</div>`:''}
          ${phone? `<div class="addr">Tel: ${escapeHtml(phone)}</div>`:''}
          ${email? `<div class="addr">E-mail: ${escapeHtml(email)}</div>`:''}
        </div>
      </div>`;
    const header = `
      <div class="grid">
        <div><span class="label">MR #</span> <span class="value">${inv.mrn||patient?.mrn||''}</span></div>
        <div><span class="label">Pt. Name</span> <span class="value">${inv.patientName||patient?.name||''}</span></div>
        <div><span class="label">Date Of Admission</span> <span class="value">${fmtDate(admitDT)}</span></div>
        <div><span class="label">Time Of Admission</span> <span class="value">${fmtTime(admitDT)}</span></div>
        <div><span class="label">Phone</span> <span class="value">${patient?.phone||''}</span></div>
        <div><span class="label">Address</span> <span class="value">${escapeHtml(patient?.address||'')}</span></div>
        <div><span class="label">Date Of Discharge</span> <span class="value">${fmtDate(dischargeDT)}</span></div>
        <div><span class="label">Time Of Discharge</span> <span class="value">${fmtTime(dischargeDT)}</span></div>
      </div>`;
    const bodyRows = rows.map((r,i)=>`<tr>
      <td>${r.sr || (i+1)}</td>
      <td>${escapeHtml(r.description)}</td>
      <td>${fmtNum(r.rate)}</td>
      <td>${fmtNum(r.amount)}</td>
    </tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8">${style}</head><body>
      ${brand}
      <div class="box">
        ${header}
        <table>
          <thead>
            <tr><th>SR#</th><th>Billing Detail</th><th>Rate</th><th>Amount</th></tr>
          </thead>
          <tbody>${bodyRows}</tbody>
          <tfoot>
            <tr class="totals"><td colspan="3">Total Amount</td><td>${currency} ${fmtNum(totals.totalAmount)}</td></tr>
            <tr class="totals"><td colspan="3">Discount</td><td>${currency} ${fmtNum(inv.discount||0)}</td></tr>
            <tr class="totals"><td colspan="3">Total Amount Payable</td><td>${currency} ${fmtNum(totals.totalPayable)}</td></tr>
          </tfoot>
        </table>
      </div>
    </body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  function fmtNum(n: any){
    const v = Number(n||0);
    return v.toLocaleString();
  }
  function fmtDate(d?: string){
    if (!d) return '';
    const dd = new Date(d);
    return isNaN(dd as any) ? '' : dd.toLocaleDateString();
  }
  function fmtTime(d?: string){
    if (!d) return '';
    const dd = new Date(d);
    return isNaN(dd as any) ? '' : dd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function escapeHtml(s: any){
    return String(s||'').replace(/[&<>"]+/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' } as any)[c]);
  }

  return (
    <div className="bg-white/90 border border-sky-100/70 rounded-xl p-3 md:p-4 shadow-sm">
      <div className="flex items-center justify-center text-center border-b border-sky-100 pb-2">
        {hSettings?.hospitalLogo ? (
          <img className="w-14 h-14 object-contain border border-sky-200 rounded-md mr-2" src={hSettings.hospitalLogo} onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.display='none'; }} alt="Logo" />
        ) : null}
        <div>
          <div className="font-extrabold text-sky-700 text-xl uppercase">{hSettings?.hospitalName || 'Hospital'}</div>
          {hSettings?.hospitalAddress ? (<div className="text-xs text-slate-600">{hSettings.hospitalAddress}</div>) : null}
          {hSettings?.hospitalPhone ? (<div className="text-xs text-slate-600">Tel: {hSettings.hospitalPhone}</div>) : null}
          {hSettings?.hospitalEmail ? (<div className="text-xs text-slate-600">E-mail: {hSettings.hospitalEmail}</div>) : null}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <h2 className="font-semibold text-lg tracking-tight flex items-center gap-2">
          <span className="inline-block w-1.5 h-5 rounded bg-gradient-to-b from-cyan-500 to-emerald-400" />
          Invoice
        </h2>
        <div className="text-xs text-slate-600 flex items-center gap-2">
          <span className="hidden md:inline px-2 py-0.5 rounded-full border border-sky-200 bg-sky-50 text-sky-700">{inv.currency || 'PKR'}</span>
          <span>Patient: {patient?.name||'—'} · MRN: {patient?.mrn||'—'}{patient?.phone? ` · Ph: ${patient?.phone}`:''}</span>
        </div>
      </div>

      {/* Header fields removed for simplified invoice slip */}

      {/* Line items */}
      <div className="mt-4">
        <div className="text-sm font-semibold mb-1 flex items-center gap-2"><span className="inline-block w-1.5 h-4 rounded bg-sky-400" />Billing Details</div>
        <div className="overflow-auto border border-sky-100 rounded-lg">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-sky-50/60">
              <tr className="text-left text-slate-600">
                <th className="py-1 px-2 w-14">SR#</th>
                <th className="px-2">Billing Detail</th>
                <th className="px-2 w-28">Rate</th>
                <th className="px-2 w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {inv.lineItems.map((r, idx)=> (
                <tr key={idx} className="border-t border-sky-100">
                  <td className="py-1 px-2 text-xs text-slate-600">{idx+1}</td>
                  <td className="px-2"><input value={r.description} onChange={e=>setRow(idx,{ description: e.target.value })} disabled={readOnly} className="w-full border border-sky-200 rounded px-2 py-1 disabled:bg-slate-50" placeholder="e.g., G-Ward Charges" /></td>
                  <td className="px-2"><input type="number" value={r.rate} onChange={e=>setRow(idx,{ rate: Number(e.target.value||0) })} disabled={readOnly} className="w-full border border-sky-200 rounded px-2 py-1 text-right disabled:bg-slate-50" /></td>
                  <td className="px-2"><input type="number" value={r.amount} onChange={e=>setRow(idx,{ amount: Number(e.target.value||0) })} disabled={readOnly} className="w-full border border-sky-200 rounded px-2 py-1 text-right disabled:bg-slate-50" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!readOnly && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <button onClick={()=> setInv(v=>({ ...v, lineItems: [...v.lineItems, { sr: v.lineItems.length+1, description: '', rate: 0, qty: 1, amount: 0 }] }))} className="text-xs px-2 py-1 rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50">Add Row</button>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="mt-4 grid md:grid-cols-2 gap-3">
        <div className="space-y-2 text-sm">
          <label className="block">
            <span className="block text-xs text-slate-700 font-semibold">Date Of Discharge</span>
            <input type="date" value={inv.dateOfDischarge? String(inv.dateOfDischarge).slice(0,10): ''} onChange={e=> setInv(v=> ({ ...v, dateOfDischarge: e.target.value }))} className="border border-sky-200 rounded px-2 py-1" />
          </label>
          <label className="block">
            <span className="block text-xs text-slate-700 font-semibold">Time Of Discharge</span>
            <input type="time" value={dischargeTime} onChange={e=> setDischargeTime(e.target.value)} className="border border-sky-200 rounded px-2 py-1" />
          </label>
        </div>
        <div className="space-y-2 text-sm bg-sky-50/40 border border-sky-100 rounded-lg p-2.5">
          <div className="flex items-center justify-between"><div className="font-medium">Total Amount</div><div className="font-mono">{(inv.currency||'PKR')} {totals.totalAmount.toLocaleString()}</div></div>
          <div className="flex items-center justify-between"><div>Discount</div><div className="flex items-center gap-2"><input type="number" value={inv.discount||0} onChange={e=> setInv(v=>({ ...v, discount: Number(e.target.value||0) }))} disabled={readOnly} className="w-32 border border-sky-200 rounded px-2 py-1 text-right disabled:bg-slate-50" /><span className="font-mono">{(inv.currency||'PKR')} {(inv.discount||0).toLocaleString()}</span></div></div>
          <div className="flex items-center justify-between"><div className="font-semibold">Total Amount Payable</div><div className="font-mono font-semibold">{(inv.currency||'PKR')} {totals.totalPayable.toLocaleString()}</div></div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button onClick={save} disabled={saving} className="text-xs px-3 py-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">{saving? 'Saving...' : 'Save'}</button>
        <button onClick={printView} className="text-xs px-3 py-2 rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50">Print</button>
      </div>
    </div>
  );
}

// (header field helper functions removed)
